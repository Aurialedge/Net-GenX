"""
Train the conversation-risk model (learned 5-layer fusion for chat histories).

    python train_conversation.py              # 10,000 conversations, train + evaluate + save
    python train_conversation.py --n 20000    # more data
    python train_conversation.py --no-save

Data: conversation_data.generate_conversations (synthetic, labelled LOW/MEDIUM/HIGH).
RAG: the knowledge base (rag.build_default) is built first from its own corpus seed (rag.KB_SEED,
never a training seed) and saved to models/rag_kb.joblib; every training row gets RAG features
retrieved under a random similarity cap (rag.training_caps) so the classifier sees the
retrieval quality of real chats, not the verbatim twins a synthetic corpus always has.
Evaluation: an 80/20 stratified split of the synthetic data (optimistic - same generator),
then the numbers that matter: data/eval_conversations.json (hand-written, never generated or
trained on) and ../test_chats (repo sample exports), both run through the full live pipeline
by ml_service/tests and the eval script.
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

import numpy as np
import joblib
import sklearn
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score

os.environ.setdefault("NETGENX_ENABLE_GEMINI", "0")
from model import detector                                     # noqa: E402  Level-1 risk model
from conversation_data import generate_conversations          # noqa: E402
import rag                                                    # noqa: E402
from conversation_model import (build_turns_batch, conversation_context, featurize,  # noqa: E402
                                FEATURE_NAMES, GE1_COLS, MODEL_PATH, TIER_SCORE, OrdinalMonotoneClassifier,
                                BaggedConversationModel)

HERE = os.path.dirname(os.path.abspath(__file__))
METRICS_PATH = os.path.join(HERE, "models", "conversation_metrics.json")
VERSION = "5.0.0"
BAG_SEEDS = (7, 17, 27, 37, 47, 57, 67)
TIERS = ("low", "medium", "high")


def to_roles(conv):
    me = conv["me"].lower()
    return [{"text": m["text"], "ts": m["ts"], "role": "user" if me and m["sender"].lower() == me else "contact"}
            for m in conv["messages"]]


def _tier_from_score(s, g):
    base = [0.85, 0.12, 0.03] if s < 40 else [0.15, 0.70, 0.15] if s < 80 else [0.03, 0.15, 0.82]
    p = np.clip(np.array(base) + g.normal(0, 0.05, 3), 0.001, None)
    return p / p.sum()


def noisy_turns(turns, g):
    """Copy of a conversation with simulated Level-1 errors: jitter on every message, and 12% of
    messages replaced by a random score/category (8%; 12% blurred the LOW/MEDIUM boundary).
    Rule-based evidence notes are left intact."""
    out = []
    for t in turns:
        if t["role"] != "contact":
            out.append(t)
            continue
        l1 = dict(t["l1"])
        if g.random() < 0.08:
            s = float(g.uniform(0, 95))
            l1["proba"] = g.dirichlet(np.where(np.arange(6) == g.integers(6), 5.0, 0.5))
        else:
            s = float(np.clip(l1["score"] + g.normal(0, 6), 0, 100))
        l1["score"], l1["tier_p"] = s, _tier_from_score(s, g)
        out.append({**t, "l1": l1})
    return out


def build_matrix(convs, kb, noisy_copies=1, seed=11):
    t0 = time.time()
    turn_lists = build_turns_batch(detector, [to_roles(c) for c in convs])
    print(f"[CONV] layer signals for {len(convs)} conversations in {time.time() - t0:.0f}s")
    g = np.random.default_rng(seed)
    # one independent similarity cap per copy, so the clean and noisy rows see different retrieval quality
    rag_rows = [kb.analyze_batch(turn_lists, caps=rag.training_caps(len(turn_lists), g)) for _ in range(1 + noisy_copies)]
    print(f"[CONV] RAG retrieval for {len(convs)} conversations x {1 + noisy_copies} in {time.time() - t0:.0f}s")
    X, keep, group = [], [], []
    for i, turns in enumerate(turn_lists):
        zt, syn = conversation_context(turns)
        for k in range(1 + noisy_copies):
            f = featurize(turns if k == 0 else noisy_turns(turns, g), zt, syn, rag_rows[k][i]["features"])
            if f is not None:
                X.append(f)
                keep.append(i)
                group.append(i)
    print(f"[CONV] {len(X)} feature rows ({noisy_copies} noisy copy per conversation) in {time.time() - t0:.0f}s")
    return np.vstack(X), keep, np.array(group)


def make_model():
    # ordinal (>=MEDIUM, HIGH) boosters with monotone constraints on risk evidence; shallow,
    # heavily-leafed trees because the synthetic data is clean and boundaries must stay smooth
    return OrdinalMonotoneClassifier(learning_rate=0.05, max_iter=300, max_leaf_nodes=15, min_samples_leaf=60,
                                     l2_regularization=3.0, class_weight="balanced", random_state=0)


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=10000)
    ap.add_argument("--no-save", action="store_true")
    ap.add_argument("--bag", type=int, default=5, help="number of independently trained members to average")
    args = ap.parse_args()

    t0 = time.time()
    kb = rag.build_default()
    if not args.no_save:
        kb.save()
        print(f"[RAG] saved {rag.KB_PATH} ({os.path.getsize(rag.KB_PATH) / 1e6:.1f} MB)")
    convs = generate_conversations(n=args.n)
    print(f"[CONV] generated {len(convs)} conversations, {sum(len(c['messages']) for c in convs)} messages")
    X, keep, group = build_matrix(convs, kb)
    y = np.array([convs[i]["tier"] for i in keep])
    scen = np.array([convs[i]["scenario"] for i in keep])

    # split by conversation so a clean row and its noisy copy never straddle train/test
    conv_ids = np.unique(group)
    tr_ids, te_ids = train_test_split(conv_ids, test_size=0.2, stratify=[convs[i]["scenario"] for i in conv_ids], random_state=1)
    tr, te = np.isin(group, tr_ids), np.isin(group, te_ids)
    Xtr, Xte, ytr, yte, ste = X[tr], X[te], y[tr], y[te], scen[te]
    clf = make_model().fit(Xtr, ytr)
    p = clf.predict_proba(Xte)
    pred = p.argmax(1)
    score = p @ np.array(TIER_SCORE)
    band = np.where(score >= 80, 2, np.where(score >= 40, 1, 0))
    split = {
        "n_test": int(len(yte)),
        "tier_accuracy": round(float(accuracy_score(yte, pred)), 4),
        "tier_macro_f1": round(float(f1_score(yte, pred, average="macro")), 4),
        "band_accuracy_from_score": round(float((band == yte).mean()), 4),
        "confusion(rows=true low/med/high)": confusion_matrix(yte, band, labels=[0, 1, 2]).tolist(),
        "per_scenario_band_accuracy": {s: round(float((band[ste == s] == yte[ste == s]).mean()), 3) for s in sorted(set(ste))},
    }
    print("[CONV] held-out synthetic split:", {k: v for k, v in split.items() if k != "per_scenario_band_accuracy"})
    for s, a in split["per_scenario_band_accuracy"].items():
        if a < 0.95:
            print(f"        weaker scenario: {s} {a}")

    # bagging: every member gets its own independently generated corpus (seed), then predictions are averaged
    members, n_msgs = [make_model().fit(X, y)], sum(len(c["messages"]) for c in convs)
    for k, seed in enumerate(BAG_SEEDS[1:args.bag], start=2):
        cs = generate_conversations(n=args.n, seed=seed)
        Xk, keep_k, _ = build_matrix(cs, kb, seed=seed + 1)
        members.append(make_model().fit(Xk, np.array([cs[i]["tier"] for i in keep_k])))
        n_msgs += sum(len(c["messages"]) for c in cs)
        print(f"[CONV] bag member {k}/{args.bag} trained (corpus seed {seed})")
    final = BaggedConversationModel(members)
    metrics = {"version": VERSION, "trained_at": datetime.now(timezone.utc).isoformat(), "sklearn_version": sklearn.__version__,
               "n_train": int(len(conv_ids)) * len(members), "bag_members": len(members), "per_member_conversations": int(len(conv_ids)),
               "n_feature_rows": int(len(y)) * len(members), "n_messages": int(n_msgs),
               "noise_augmentation": "1 noisy copy per conversation: score jitter sd 6, 8% messages randomised",
               "tier_counts": {TIERS[k]: int((y == k).sum()) for k in range(3)},
               "algorithm": f"ConvoSentinel-style RAG (message / context-snippet / conversation k-NN over a labelled knowledge base) "
                            f"+ bagged ordinal monotone-constrained HistGradientBoosting: P(>=MEDIUM) on the {len(GE1_COLS)} Level-1 / shield "
                            f"layer 1/3/4/5 features, P(HIGH) on those plus the {len(rag.RAG_FEATURES)} RAG features",
               "rag_knowledge_base": {**kb.stats(), "corpus_seed": rag.KB_SEED, "corpus_size": rag.KB_SIZE},
               "features": FEATURE_NAMES, "synthetic_holdout": split, "training_seconds": round(time.time() - t0, 1)}
    if not args.no_save:
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump({"model": final, "features": FEATURE_NAMES, "version": VERSION, "sklearn_version": sklearn.__version__,
                     "n_train": metrics["n_train"], "trained_at": metrics["trained_at"]}, MODEL_PATH + ".tmp")
        os.replace(MODEL_PATH + ".tmp", MODEL_PATH)
        with open(METRICS_PATH, "w", encoding="utf-8") as fh:
            json.dump(metrics, fh, indent=2)
        print(f"[CONV] saved {MODEL_PATH} ({os.path.getsize(MODEL_PATH) / 1e6:.1f} MB) and {METRICS_PATH}")
    print(f"[CONV] done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
