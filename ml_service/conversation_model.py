"""
Learned conversation-risk model: the trained fusion of the 5-layer shield for chat histories.

Each conversation is turned into a fixed feature vector built from the layer outputs:
  * Level-1 risk model, per contact message: risk scores, category and severity probabilities,
    hard-evidence rules (OTP/PIN request, payload, credential lure, extortion);
  * Layer 1 (intent): elicitation score, information requests, secrecy / channel-shift, flattery;
  * Layer 5 (trajectory) inputs: grooming stage per message, progression, refusals by the
    reporter and probing after them, drift towards military topics;
  * Layer 3 (synthetic style) and Layer 4 (zero-trust) on the contact's combined text.
  * RAG (rag.py, ConvoSentinel-style): flagged messages, their context snippets and the whole
    conversation are matched against a labelled knowledge base of known cases; the similarity-
    weighted votes are appended as RAG_FEATURES.
A gradient-boosted classifier (train_conversation.py, 10,000 synthetic conversations) maps that
vector to LOW / MEDIUM / HIGH; the conversation risk score is the expected severity.

The same build_turns / featurize code is used for training and for live analysis.
"""
import math
import os
import statistics

import numpy as np

from preprocessor import MONEY_RE, URL_RE
from rag import RAG_FEATURES
from risk_rules import conversation_evidence
from shield import intent as L1
from shield import synthetic as L3
from shield import zero_trust as L4
from shield.trajectory import REFUSAL_RE, OPSEC_TOPIC_RE, turn_stage

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(HERE, "models", "conversation_model.joblib")
TIER_SCORE = (5.0, 62.0, 95.0)

FEATURE_NAMES = (
    ["n_contact_log", "user_ratio",
     "r_max", "r_mean", "r_last", "r_top2", "r_frac40", "r_frac80", "r_n80", "r_slope", "r_argmax_pos", "r_early_max", "r_late_max"]
    + [f"cat_mean_{k}" for k in range(6)] + [f"cat_max_{k}" for k in range(1, 6)]
    + ["tier_mean_low", "tier_mean_med", "tier_mean_high", "tier_max_high"]
    + ["stage_max", "stage_last", "stage_mean", "stage_mono", "stage_distinct", "first_elicit_pos"]
    + ["intent_max", "intent_mean", "info_req_frac", "secrecy_n", "flattery_frac"]
    + ["ev_secret_ask", "ev_payload", "ev_cred_lure", "ev_extortion", "ev_fee_scam", "ev_conv_extortion"]
    + ["refusals", "probe_after_refusal", "probe_after_refusal_flag", "opsec_frac", "opsec_drift"]
    + ["zt_score", "syn_score", "money_flag", "url_flag"]
    + RAG_FEATURES
)


def build_turns_batch(engine, conversations):
    """conversations: list of lists of {text, role ('user'|'contact'), ts}. Returns list of turn lists.

    Level-1 scoring is batched across every contact message of every conversation.
    """
    flat = [(ci, mi) for ci, conv in enumerate(conversations) for mi, m in enumerate(conv) if m.get("role") != "user"]
    l1 = engine.analyze_batch([str(conversations[ci][mi].get("text") or "") for ci, mi in flat]) if flat else []
    l1_map = {key: res for key, res in zip(flat, l1)}
    out = []
    for ci, conv in enumerate(conversations):
        turns = []
        for mi, m in enumerate(conv):
            text = str(m.get("text") or "")
            if m.get("role") == "user":
                turns.append({"role": "user", "text": text, "ts": m.get("ts"), "refusal": bool(REFUSAL_RE.search(text))})
                continue
            lvl = l1_map[(ci, mi)]
            it = L1.analyze(text)
            stage = turn_stage(it, {"score": lvl["score"], "category_id": lvl["category_id"]})
            turns.append({"role": "contact", "text": text, "ts": m.get("ts"), "l1": lvl, "intent": it, "stage": stage,
                          "opsec": bool(OPSEC_TOPIC_RE.search(text))})
        out.append(turns)
    return out


def conversation_context(turns):
    """Layer 3 / Layer 4 scores on the contact's combined text."""
    joined = " ".join(t["text"] for t in turns if t["role"] == "contact")
    try:
        zt = float(L4.analyze(joined, direction="inbound")["score"])
    except Exception:
        zt = 0.0
    try:
        syn = float(L3.analyze_text(joined)["score"])
    except Exception:
        syn = 0.0
    return zt, syn


def featurize(turns, zt_score, syn_score, rag_features):
    c = [t for t in turns if t["role"] == "contact"]
    if not c:
        return None
    n = len(c)
    r = np.array([t["l1"]["score"] for t in c], dtype=float)
    P = np.vstack([t["l1"]["proba"] for t in c])
    TP = np.vstack([t["l1"]["tier_p"] for t in c])
    st = [t["stage"] for t in c]
    third = max(1, n // 3)
    slope = 0.0
    if n >= 2:
        xs = np.arange(n)
        slope = float(np.polyfit(xs, r, 1)[0])
    elicit_idx = next((i for i, s in enumerate(st) if s >= 3), None)
    notes = " ".join(" ".join(t["l1"]["notes"]) for t in c)
    det = [t["intent"].get("details", {}) for t in c]
    techs = [set(d.get("techniques", {})) for d in det]

    refusals, probes, refused = 0, 0, False
    for t in turns:
        if t["role"] == "user":
            if t.get("refusal"):
                refusals += 1
                refused = True
        elif refused and (t["stage"] >= 2 or t["l1"]["score"] >= 40 or t["opsec"]):
            probes += 1
    half = n // 2
    early_ops = sum(t["opsec"] for t in c[:half]) / max(1, half)
    late_ops = sum(t["opsec"] for t in c[half:]) / max(1, n - half)
    joined = " ".join(t["text"] for t in c)

    f = [math.log1p(n), sum(t["role"] == "user" for t in turns) / len(turns),
         r.max(), r.mean(), r[-1], float(np.sort(r)[-2:].mean()), (r >= 40).mean(), (r >= 80).mean(), min(5, int((r >= 80).sum())),
         max(-30.0, min(30.0, slope)) / 30, float(np.argmax(r)) / max(1, n - 1), r[:third].max(), r[-third:].max()]
    f += list(P.mean(0)) + list(P[:, 1:].max(0))
    f += list(TP.mean(0)) + [TP[:, 2].max()]
    f += [max(st), st[-1], statistics.mean(st), sum(b >= a for a, b in zip(st, st[1:])) / max(1, n - 1), len(set(st)),
          (elicit_idx / max(1, n - 1)) if elicit_idx is not None else 1.5]
    f += [max(t["intent"]["score"] for t in c), statistics.mean(t["intent"]["score"] for t in c),
          sum(bool(d.get("is_information_request")) for d in det) / n,
          sum(bool(x & {"secrecy_request", "channel_shift"}) for x in techs),
          sum(bool(x & {"flattery", "rapport_building"}) for x in techs) / n]
    conv_ev = conversation_evidence([t["text"] for t in c])
    f += [float("OTP/PIN" in notes), float("payload" in notes), float("credential lure" in notes), float("extortion" in notes),
          float("task-scam" in notes), float(bool(conv_ev))]
    f += [min(5, refusals), min(5, probes), float(probes > 0), sum(t["opsec"] for t in c) / n, late_ops - early_ops]
    # (reply-timing features were tried and dropped: synthetic timing carries no real signal and
    #  real chats' minute-level gaps sat outside the training range, destabilising predictions)
    f += [zt_score / 100, syn_score / 100,
          float(bool(MONEY_RE.search(joined) or "@ybl" in joined or "@ok" in joined or "@paytm" in joined)),
          float(bool(URL_RE.search(joined)))]
    f += list(rag_features)
    return np.array(f, dtype=float)


# Features along which risk may only go UP (+1) or DOWN (-1); 0 = unconstrained.
# Without these, trees trained on synthetic chats learned brittle rules such as
# "casual-looking chat, so ignore the probing after a refusal".
MONOTONE_UP = {"r_max", "r_top2", "r_frac40", "r_frac80", "r_n80", "r_late_max", "cat_max_1", "cat_max_2", "cat_max_3",
               "cat_max_4", "cat_max_5", "tier_mean_high", "tier_max_high", "stage_max", "intent_max", "info_req_frac",
               "secrecy_n", "ev_secret_ask", "ev_payload", "ev_cred_lure", "ev_extortion", "ev_fee_scam", "ev_conv_extortion",
               "probe_after_refusal",
               "probe_after_refusal_flag", "zt_score",
               "rag_msg_mal_max", "rag_msg_mal_n", "rag_flag_mal_max", "rag_ctx_high_max", "rag_conv_high"}
MONOTONE_DOWN = {"tier_mean_low", "cat_mean_0", "rag_conv_low"}


def monotone_constraints():
    return [1 if n in MONOTONE_UP else -1 if n in MONOTONE_DOWN else 0 for n in FEATURE_NAMES]


# The RAG features feed only the P(HIGH) head. On hand-written dev chats they separate HIGH from
# the rest as well as on synthetic data (message SI-request probability ~0.78 vs ~0.25), but they
# do not separate LOW from MEDIUM at all: real benign chats about leave / postings / OTPs sit
# close to known threat snippets. Letting the P(>=MEDIUM) head use them pushed benign family
# chats to MEDIUM on held-out data.
GE1_COLS = [i for i, n in enumerate(FEATURE_NAMES) if n not in RAG_FEATURES]


class OrdinalMonotoneClassifier:
    """LOW < MEDIUM < HIGH as two monotone-constrained binary boosters: P(>=MEDIUM), P(HIGH).

    (sklearn only supports monotonic constraints for binary targets, and the ordinal split
    also respects that HIGH implies at least MEDIUM.) P(>=MEDIUM) uses GE1_COLS; P(HIGH) uses all.
    """

    def __init__(self, **params):
        self.params = params

    def fit(self, X, y):
        from sklearn.ensemble import HistGradientBoostingClassifier
        cst = monotone_constraints()
        self.cols1 = list(GE1_COLS)
        self.ge1 = HistGradientBoostingClassifier(monotonic_cst=[cst[i] for i in self.cols1], **self.params).fit(
            X[:, self.cols1], (y >= 1).astype(int))
        self.ge2 = HistGradientBoostingClassifier(monotonic_cst=cst, **self.params).fit(X, (y >= 2).astype(int))
        return self

    def predict_proba(self, X):
        p1 = self.ge1.predict_proba(X[:, self.cols1])[:, 1]
        p2 = np.minimum(self.ge2.predict_proba(X)[:, 1], p1)
        return np.column_stack([1 - p1, p1 - p2, p2])

    def predict(self, X):
        return self.predict_proba(X).argmax(1)


class BaggedConversationModel:
    """Average of several ordinal models, each trained on an independently generated corpus.

    A single model's LOW/MEDIUM boundary moved between retrains with the particular random
    corpus; averaging independently trained members cancels that variance."""

    def __init__(self, members):
        self.members = list(members)

    def predict_proba(self, X):
        return np.mean([m.predict_proba(X) for m in self.members], axis=0)

    def predict(self, X):
        return self.predict_proba(X).argmax(1)


class ConversationModel:
    def __init__(self, path=MODEL_PATH):
        self.clf, self.info, self.kb = None, {}, None
        try:
            from rag import KnowledgeBase
            self.kb = KnowledgeBase.load()
        except Exception as e:
            print(f"[AI-ENGINE] RAG knowledge base unavailable ({e}); chat histories use rule-based fusion")
            return
        try:
            import joblib
            import sklearn
            b = joblib.load(path)
            if b.get("sklearn_version") != sklearn.__version__ or list(b.get("features", [])) != FEATURE_NAMES:
                raise RuntimeError("conversation model incompatible with this runtime; retrain with train_conversation.py")
            self.clf, self.info = b["model"], {k: v for k, v in b.items() if k not in ("model",)}
            print(f"[AI-ENGINE] conversation model ready v{b.get('version')} ({b.get('n_train')} training conversations, "
                  f"RAG knowledge base {self.kb.stats()['messages']} messages / {self.kb.stats()['conversations']} conversations)")
        except FileNotFoundError:
            print("[AI-ENGINE] no conversation model found; chat histories use rule-based fusion")
        except Exception as e:
            print(f"[AI-ENGINE] conversation model unavailable ({e}); chat histories use rule-based fusion")

    @property
    def ready(self):
        return self.clf is not None and self.kb is not None

    def predict(self, features):
        p = self.clf.predict_proba(features.reshape(1, -1))[0]
        score = float(sum(pi * s for pi, s in zip(p, TIER_SCORE)))
        return score, p
