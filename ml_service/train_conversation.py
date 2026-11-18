"""
Train the conversation-risk model (learned 5-layer fusion for chat histories).

    python train_conversation.py              # 10,000 conversations, train + evaluate + save
    python train_conversation.py --n 20000    # more data
    python train_conversation.py --no-save

Data: conversation_data.generate_conversations (synthetic, labelled LOW/MEDIUM/HIGH).
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
from conversation_model import (build_turns_batch, conversation_context, featurize,  # noqa: E402
                                FEATURE_NAMES, MODEL_PATH, TIER_SCORE, OrdinalMonotoneClassifier)

HERE = os.path.dirname(os.path.abspath(__file__))
METRICS_PATH = os.path.join(HERE, "models", "conversation_metrics.json")
VERSION = "2.0.0"
TIERS = ("low", "medium", "high")


def to_roles(conv):
    me = conv["me"].lower()
    return [{"text": m["text"], "ts": m["ts"], "role": "user" if me and m["sender"].lower() == me else "contact"}
            for m in conv["messages"]]


def build_matrix(convs):
    t0 = time.time()
    turn_lists = build_turns_batch(detector, [to_roles(c) for c in convs])
    print(f"[CONV] layer signals for {len(convs)} conversations in {time.time() - t0:.0f}s")
    X, keep = [], []
    for i, turns in enumerate(turn_lists):
        zt, syn = conversation_context(turns)
        f = featurize(turns, zt, syn)
        if f is not None:
            X.append(f)
            keep.append(i)
    print(f"[CONV] features built in {time.time() - t0:.0f}s")
    return np.vstack(X), keep


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
    args = ap.parse_args()

    t0 = time.time()
    convs = generate_conversations(n=args.n)
    print(f"[CONV] generated {len(convs)} conversations, {sum(len(c['messages']) for c in convs)} messages")
    X, keep = build_matrix(convs)
    y = np.array([convs[i]["tier"] for i in keep])
    scen = np.array([convs[i]["scenario"] for i in keep])

    Xtr, Xte, ytr, yte, str_, ste = train_test_split(X, y, scen, test_size=0.2, stratify=scen, random_state=1)
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

    final = make_model().fit(X, y)  # refit on everything
    metrics = {"version": VERSION, "trained_at": datetime.now(timezone.utc).isoformat(), "sklearn_version": sklearn.__version__,
               "n_train": int(len(y)), "n_messages": int(sum(len(convs[i]["messages"]) for i in keep)),
               "tier_counts": {TIERS[k]: int((y == k).sum()) for k in range(3)},
               "algorithm": f"ordinal monotone-constrained HistGradientBoosting (P>=MEDIUM, P(HIGH)) on {len(FEATURE_NAMES)} features from the Level-1 model and shield layers 1/3/4/5",
               "features": FEATURE_NAMES, "synthetic_holdout": split, "training_seconds": round(time.time() - t0, 1)}
    if not args.no_save:
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump({"model": final, "features": FEATURE_NAMES, "version": VERSION, "sklearn_version": sklearn.__version__,
                     "n_train": int(len(y)), "trained_at": metrics["trained_at"]}, MODEL_PATH + ".tmp")
        os.replace(MODEL_PATH + ".tmp", MODEL_PATH)
        with open(METRICS_PATH, "w", encoding="utf-8") as fh:
            json.dump(metrics, fh, indent=2)
        print(f"[CONV] saved {MODEL_PATH} ({os.path.getsize(MODEL_PATH) / 1e6:.1f} MB) and {METRICS_PATH}")
    print(f"[CONV] done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
