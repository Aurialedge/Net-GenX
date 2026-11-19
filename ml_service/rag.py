"""
Retrieval-augmented conversation analysis - a ConvoSentinel-style pipeline for chat histories.

ConvoSentinel (social-engineering detection in multi-turn chats) works in three stages:
  1. message-level detector: flag the messages that request sensitive information (SI);
  2. RAG module: for each flagged message, retrieve similar *labelled* conversation snippets
     from a knowledge base and judge the message's intent in the light of those known cases;
  3. conversation-level detector: combine the message-level judgements into one verdict.

NetGenX keeps that structure and replaces the LLM judge with learned, offline components:
  1. flagging   - Level-1 risk model + Layer-1 intent (information request, grooming stage >= 2,
                  hard-evidence notes, Level-1 risk >= 40)            (conversation_model.build_turns_batch)
  2. RAG        - KnowledgeBase below: TF-IDF (word 1-2 + char 3-5) -> 128-d LSA embeddings,
                  cosine k-NN over three indices
                    * message  : the message alone            -> P(message is an SI request / exploit)
                    * context  : message + 2 preceding turns  -> P(the exchange belongs to a HIGH chat)
                    * conversation : the contact's whole side -> LOW / MEDIUM / HIGH and threat-type vote
                  Votes are similarity-weighted and shrunk towards the prior when nothing in the
                  knowledge base is close, so an unfamiliar chat yields "unsure", not a guess.
  3. decision   - the monotone ordinal HistGradientBoosting conversation model takes the 54
                  shield/Level-1 features plus the RAG features (FEATURE_NAMES) and outputs
                  LOW / MEDIUM / HIGH; the retrieved cases are returned as the explanation.

Knowledge base: an independently generated, message-labelled synthetic corpus (its seed is
never used to train the classifier), the curated Level-1 threat dataset, and analyst-confirmed
cases added at runtime (POST /rag/cases) - the RAG memory grows without retraining.
"""
import json
import os
import threading
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
KB_PATH = os.path.join(HERE, "models", "rag_kb.joblib")
KB_SEED, KB_SIZE = 1001, 4000          # never one of train_conversation.BAG_SEEDS
TOP_K = 10
SIM_FLOOR = 0.35                       # below this cosine similarity a neighbour carries no weight
SHRINK = 1.0                           # pseudo-count of the prior in every vote
CONTEXT_TURNS = 2

# message-level labels for the generator's phrase pools: 2 = SI request / exploit, 1 = pretext, 0 = benign
MALICIOUS_KINDS = {"elicit", "elicit_soft", "persist", "exploit_black", "exploit_docs", "exploit_honey", "exploit_mal",
                   "exploit_money", "exploit_otp", "task_pay", "demand", "consequence", "leverage"}
PRETEXT_KINDS = {"open", "rapport", "trust", "imp_open", "imp_setup", "journo", "invest", "task", "offer", "research",
                 "app_offer", "spam", "pressure", "debt"}

def training_caps(n, rng):
    """Per-conversation similarity caps that reproduce the retrieval quality of real chats
    (hand-written chats: top-1 message similarity ~0.56 / 0.72 / 0.94 at the 10th/50th/90th pct)."""
    caps = rng.uniform(0.5, 0.95, n)
    caps[rng.random(n) < 0.15] = 1.01  # sometimes a real chat does contain a known script verbatim
    return caps


RAG_FEATURES = ["rag_msg_mal_max", "rag_msg_mal_mean", "rag_msg_mal_n", "rag_msg_sim_max", "rag_flag_mal_max",
                "rag_ctx_high_max", "rag_ctx_high_mean", "rag_conv_low", "rag_conv_high", "rag_conv_sim"]
TIERS = ("LOW", "MEDIUM", "HIGH")


def kind_label(kind):
    return 2 if kind in MALICIOUS_KINDS else 1 if kind in PRETEXT_KINDS else 0


def _tag(role):
    return "[me]" if role == "user" else "[them]"


def snippet(turns, i, k=CONTEXT_TURNS):
    """The message at turns[i] with its k preceding turns, role-tagged (ConvoSentinel's snippet)."""
    ctx = turns[max(0, i - k):i]
    return " ".join(f"{_tag(t['role'])} {t['text']}" for t in ctx) + f" >> {turns[i]['text']}"


def conversation_text(turns, limit=4000):
    return " ".join(t["text"] for t in turns if t["role"] == "contact")[:limit]


def flagged(t):
    """Stage 1: does this contact message look like an SI request (or carry hard evidence)?"""
    it = t["intent"].get("details", {})
    return bool(it.get("is_information_request") or t["stage"] >= 2 or t["l1"]["score"] >= 40 or t["l1"]["notes"])


def _vote(sims, labels, n_classes, prior):
    """Similarity-weighted class distribution of the neighbours, shrunk towards the prior.

    sims, labels: (n, k). Neighbours with label < 0 (unlabelled for this vote) are ignored."""
    w = np.clip((sims - SIM_FLOOR) / (1 - SIM_FLOOR), 0, 1) ** 2 * (labels >= 0)
    out = np.tile(SHRINK * prior, (len(sims), 1))
    for c in range(n_classes):
        out[:, c] += (w * (labels == c)).sum(1)
    return out / out.sum(1, keepdims=True)


class KnowledgeBase:
    """Labelled snippets / conversations, a fitted embedder, and three cosine k-NN indices."""

    def __init__(self, embedder, proj, entries, emb):
        self.embedder = embedder
        self.proj = np.asarray(proj, dtype=np.float32)   # LSA projection (n_terms, dims), stored float16
        self.entries = entries        # {"msg"|"ctx"|"conv": dict of numpy arrays + "text"/"source" lists}
        self.emb = {k: np.asarray(v, dtype=np.float32) for k, v in emb.items()}  # unit vectors (stored float16)
        self._prior()
        self._lock = threading.Lock()
        self.runtime_cases = 0

    # ------------------------------------------------------------------ build / persist
    @classmethod
    def build(cls, conversations, dataset_rows=(), dims=128, verbose=True):
        """conversations: generator output ({messages[{sender,text,kind}], me, tier, category, scenario})."""
        from sklearn.decomposition import TruncatedSVD
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.pipeline import FeatureUnion
        t0 = time.time()
        idx = {k: {"text": [], "label": [], "tier": [], "cat": [], "source": []} for k in ("msg", "ctx", "conv")}

        def add(index, text, label, tier, cat, source):
            d = idx[index]
            d["text"].append(text), d["label"].append(label), d["tier"].append(tier), d["cat"].append(cat), d["source"].append(source)

        for c in conversations:
            me = (c.get("me") or "").lower()
            turns = [{"role": "user" if me and m["sender"].lower() == me else "contact", "text": m["text"], "kind": m.get("kind")}
                     for m in c["messages"]]
            src = f"synthetic:{c['scenario']}"
            for i, t in enumerate(turns):
                if t["role"] != "contact":
                    continue
                add("msg", t["text"], kind_label(t["kind"]), c["tier"], c["category"], src)
                add("ctx", snippet(turns, i), kind_label(t["kind"]), c["tier"], c["category"], src)
            add("conv", conversation_text(turns), -1, c["tier"], c["category"], src)
        for text, threat, cat in dataset_rows:  # single curated messages: message index only
            add("msg", text, 2 if threat else 0, 2 if threat else 0, cat, "curated:threat_dataset")

        for d in idx.values():  # the same labelled text once (phrase pools repeat), keeps distinct label contexts
            seen, keep = set(), []
            for j, key in enumerate(zip(d["text"], d["label"], d["tier"], d["cat"])):
                if key not in seen:
                    seen.add(key)
                    keep.append(j)
            for f in d:
                d[f] = [d[f][j] for j in keep]
        embedder = FeatureUnion([
            ("w", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=20000, sublinear_tf=True)),
            ("c", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=3, max_features=40000, sublinear_tf=True)),
        ])
        fit_texts = idx["msg"]["text"] + idx["conv"]["text"]
        X = embedder.fit_transform(fit_texts)
        for _, v in embedder.transformer_list:  # pruned-vocabulary record: not needed to transform, ~40 MB pickled
            v.stop_words_ = None
        svd = TruncatedSVD(n_components=dims, random_state=0).fit(X)
        kb = cls.__new__(cls)
        kb.embedder, kb.proj = embedder, svd.components_.T.astype(np.float16).astype(np.float32)
        kb.entries = {k: {"text": [s[:300] for s in d["text"]], "source": d["source"],
                          **{f: np.array(d[f], dtype=np.int8) for f in ("label", "tier", "cat")}} for k, d in idx.items()}
        kb.emb = {k: kb.embed(d["text"]).astype(np.float16) for k, d in idx.items()}
        kb._prior()
        kb._lock, kb.runtime_cases = threading.Lock(), 0
        if verbose:
            print(f"[RAG] knowledge base: {len(idx['msg']['text'])} messages, {len(idx['ctx']['text'])} context snippets, "
                  f"{len(idx['conv']['text'])} conversations, {dims}-d LSA ({svd.explained_variance_ratio_.sum():.0%} variance) "
                  f"in {time.time() - t0:.0f}s")
        return kb

    def save(self, path=KB_PATH):
        import joblib
        import sklearn
        joblib.dump({"embedder": self.embedder, "proj": self.proj.astype(np.float16), "entries": self.entries,
                     "emb": {k: v.astype(np.float16) for k, v in self.emb.items()},
                     "sklearn_version": sklearn.__version__, "built_at": time.time()}, path + ".tmp", compress=3)
        os.replace(path + ".tmp", path)

    @classmethod
    def load(cls, path=KB_PATH):
        import joblib
        import sklearn
        b = joblib.load(path)
        if b.get("sklearn_version") != sklearn.__version__:
            raise RuntimeError("RAG knowledge base built with another scikit-learn; rebuild with train_conversation.py")
        return cls(b["embedder"], b["proj"], b["entries"], b["emb"])

    def _prior(self):
        m, c = self.entries["msg"]["label"], self.entries["conv"]["tier"]
        self.msg_prior = np.bincount(m[m >= 0], minlength=3) / max(1, (m >= 0).sum())
        self.tier_prior = np.bincount(c[c >= 0], minlength=3) / max(1, (c >= 0).sum())
        cats = self.entries["conv"]["cat"]
        self.cat_prior = np.bincount(cats[cats >= 0], minlength=6) / max(1, (cats >= 0).sum())

    # ------------------------------------------------------------------ retrieval
    def embed(self, texts):
        if not len(texts):
            return np.zeros((0, self.proj.shape[1]), dtype=np.float32)
        Z = np.asarray(self.embedder.transform(list(texts)) @ self.proj, dtype=np.float32)
        Z /= np.linalg.norm(Z, axis=1, keepdims=True) + 1e-8
        return Z

    def search(self, index, Q, k=TOP_K, chunk=4096, cap=None):
        """Top-k cosine neighbours: (sims (n,k), ids (n,k)).

        cap: optional per-query maximum similarity. Training uses it to hide the near-identical
        synthetic twins a real chat never has, so the classifier learns realistic retrieval quality."""
        E = self.emb[index]
        k = min(k, len(E))
        S, I = np.zeros((len(Q), k), np.float32), np.zeros((len(Q), k), np.int64)
        for a in range(0, len(Q), chunk):
            sim = Q[a:a + chunk] @ E.T
            if cap is not None:
                sim[sim > cap[a:a + chunk, None]] = -1.0
            top = np.argpartition(-sim, k - 1, axis=1)[:, :k]
            ts = np.take_along_axis(sim, top, 1)
            order = np.argsort(-ts, axis=1)
            I[a:a + chunk], S[a:a + chunk] = np.take_along_axis(top, order, 1), np.take_along_axis(ts, order, 1)
        return S, I

    def analyze_batch(self, turn_lists, explain=False, caps=None):
        """Stages 1-2 for many conversations (turns from conversation_model.build_turns_batch).

        caps: optional per-conversation similarity cap (training only, see search).
        Returns one dict per conversation: {"features": np.array(len(RAG_FEATURES)), ...evidence if explain}."""
        q_msg, q_ctx, owner, q_conv = [], [], [], []
        for ci, turns in enumerate(turn_lists):
            for i, t in enumerate(turns):
                if t["role"] == "contact":
                    q_msg.append(t["text"]), q_ctx.append(snippet(turns, i)), owner.append((ci, i))
            q_conv.append(conversation_text(turns))
        cm = cv = None
        if caps is not None:
            caps = np.asarray(caps, dtype=np.float32)
            cm, cv = caps[[ci for ci, _ in owner]], caps
        Sm, Im = self.search("msg", self.embed(q_msg), cap=cm)
        Sc, Ic = self.search("ctx", self.embed(q_ctx), cap=cm)
        Sv, Iv = self.search("conv", self.embed(q_conv), cap=cv)
        p_msg = _vote(Sm, self.entries["msg"]["label"][Im], 3, self.msg_prior)          # message: benign/pretext/SI
        p_ctx = _vote(Sc, self.entries["ctx"]["tier"][Ic], 3, self.tier_prior)          # snippet: chat tier
        p_conv = _vote(Sv, self.entries["conv"]["tier"][Iv], 3, self.tier_prior)        # conversation: tier
        cat_v = _vote(Sv, self.entries["conv"]["cat"][Iv], 6, self.cat_prior)

        per_conv = [[] for _ in turn_lists]
        for row, (ci, i) in enumerate(owner):
            per_conv[ci].append((row, i))
        out = []
        for ci, rows in enumerate(per_conv):
            turns = turn_lists[ci]
            if not rows:
                out.append({"features": np.zeros(len(RAG_FEATURES)), "tier_vote": p_conv[ci], "category_vote": cat_v[ci]})
                continue
            r = np.array([row for row, _ in rows])
            mal, hi = p_msg[r, 2], p_ctx[r, 2]
            flags = np.array([flagged(turns[i]) for _, i in rows])
            f = np.array([mal.max(), mal.mean(), min(5, int((mal >= 0.5).sum())), float(Sm[r, 0].max()),
                          float(mal[flags].max()) if flags.any() else 0.0,
                          hi.max(), hi.mean(), p_conv[ci, 0], p_conv[ci, 2], float(Sv[ci, 0])])
            res = {"features": f, "tier_vote": p_conv[ci], "category_vote": cat_v[ci]}
            if explain:
                res["evidence"] = self._explain(turns, rows, flags, p_msg, p_ctx, Sm, Im, Sc, Ic, ci, p_conv, Sv, Iv)
            out.append(res)
        return out

    def _case(self, index, j, sim):
        e = self.entries[index]
        return {"text": e["text"][j], "similarity": round(float(sim), 3), "source": e["source"][j],
                "conversation_tier": TIERS[e["tier"][j]] if e["tier"][j] >= 0 else None,
                **({"message_label": ["benign", "pretext", "si_request"][e["label"][j]]} if index != "conv" and e["label"][j] >= 0 else {})}

    def _explain(self, turns, rows, flags, p_msg, p_ctx, Sm, Im, Sc, Ic, ci, p_conv, Sv, Iv):
        msgs = []
        for (row, i), fl in zip(rows, flags):
            if not fl:
                continue
            msgs.append({"turn": i, "text": turns[i]["text"][:200],
                         "p_si_request": round(float(p_msg[row, 2]), 3), "p_high_risk_context": round(float(p_ctx[row, 2]), 3),
                         "similar_messages": [self._case("msg", j, s) for j, s in zip(Im[row, :3], Sm[row, :3]) if s >= SIM_FLOOR],
                         "similar_exchanges": [self._case("ctx", j, s) for j, s in zip(Ic[row, :2], Sc[row, :2]) if s >= SIM_FLOOR]})
        msgs.sort(key=lambda m: -m["p_si_request"])
        return {"flagged_messages": msgs[:6], "n_flagged": len(msgs), "n_contact_messages": len(rows),
                "conversation_vote": {k: round(float(v), 3) for k, v in zip(TIERS, p_conv[ci])},
                "similar_conversations": [self._case("conv", j, s) for j, s in zip(Iv[ci, :3], Sv[ci, :3]) if s >= SIM_FLOOR]}

    # ------------------------------------------------------------------ runtime memory
    def add_case(self, turns, tier, category, source="analyst"):
        """Add an analyst-confirmed conversation ([{role, text}]) to the knowledge base, no retraining."""
        contact = [i for i, t in enumerate(turns) if t["role"] == "contact"]
        if not contact:
            raise ValueError("case has no contact messages")
        ctx = [snippet(turns, i) for i in contact]
        conv = [conversation_text(turns)]
        with self._lock:
            for index, texts, label in (("msg", [turns[i]["text"] for i in contact], -1), ("ctx", ctx, -1), ("conv", conv, -1)):
                e = self.entries[index]
                n = len(texts)
                e["text"] = list(e["text"]) + [s[:300] for s in texts]
                e["source"] = list(e["source"]) + [source] * n
                e["label"] = np.concatenate([e["label"], np.full(n, label, np.int8)])
                e["tier"] = np.concatenate([e["tier"], np.full(n, tier, np.int8)])
                e["cat"] = np.concatenate([e["cat"], np.full(n, category, np.int8)])
                self.emb[index] = np.vstack([self.emb[index], self.embed(texts)])
            self._prior()
            self.runtime_cases += 1
        return len(contact)

    def stats(self):
        return {"messages": len(self.entries["msg"]["text"]), "context_snippets": len(self.entries["ctx"]["text"]),
                "conversations": len(self.entries["conv"]["text"]), "runtime_cases": self.runtime_cases,
                "embedding_dims": int(self.proj.shape[1]), "top_k": TOP_K, "similarity_floor": SIM_FLOOR}


class CaseStore:
    """Analyst-confirmed cases persisted in the shield state dir and replayed into the KB at startup."""

    def __init__(self, state_dir):
        self.path = os.path.join(state_dir, "rag_cases.json")

    def load(self):
        try:
            with open(self.path, encoding="utf-8") as fh:
                return json.load(fh)
        except (FileNotFoundError, ValueError):
            return []

    def append(self, case):
        cases = self.load() + [case]
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path + ".tmp", "w", encoding="utf-8") as fh:
            json.dump(cases, fh, ensure_ascii=False)
        os.replace(self.path + ".tmp", self.path)
        return len(cases)


def build_default(n=KB_SIZE, seed=KB_SEED):
    """Knowledge base from an independent synthetic corpus + the curated threat dataset."""
    from conversation_data import generate_conversations
    convs = generate_conversations(n=n, seed=seed)
    rows = []
    try:
        import pandas as pd
        df = pd.read_csv(os.path.join(HERE, "cleaned_defense_threat_dataset.csv")).drop_duplicates("raw_text")
        rows = [(str(t), int(l) > 0, -1) for t, l in zip(df["raw_text"], df["label"])]
    except Exception as e:
        print(f"[RAG] curated dataset skipped: {e}")
    return KnowledgeBase.build(convs, rows)
