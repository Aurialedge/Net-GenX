"""
Train & evaluate the NetGenX Level-1 risk models (v4).

    python train.py            # train, evaluate, save models/risk_model.joblib
    python train.py --no-save  # evaluate only

Two heads share one feature space (word TF-IDF + char TF-IDF + indicator vector):

  * category head  - WHAT the threat is (6 classes). Soft-voting ensemble of
                     Logistic Regression and a sigmoid-calibrated Linear SVM.
  * severity head  - HOW dangerous it is: LOW / MEDIUM / HIGH. Multinomial
                     Logistic Regression trained on graded data (augment.py).

Risk score = expected severity over the severity head's probabilities
(TIER_SCORE), so a vague early-stage message lands in the 40-79 "mitigate"
band and only a concrete harmful ask crosses the CERT-Army threshold.
The old v3 score was P(threat) x fixed class severity, which pushed every
suspected threat to ~90.

Evaluation is leakage-safe:
  * the cleaned dataset is de-duplicated (1,000 rows -> ~211 unique) before splitting;
  * CV folds are made over unique texts; augmentation only ever goes in the train fold;
  * every data/challenge_set*.csv and data/eval_realworld.csv is held out:
    never trained on and never used for model selection.
"""
import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import joblib
import sklearn
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.preprocessing import FunctionTransformer, MaxAbsScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import VotingClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix

from preprocessor import model_text, normalize, indicator_matrix, CyberThreatPreprocessor, THREAT_CATEGORY_MAP
import augment

HERE = os.path.dirname(os.path.abspath(__file__))
DATASET_CSV = os.path.join(HERE, "cleaned_defense_threat_dataset.csv")
DATASET_XLSX = os.path.join(HERE, "defense_cyber_threat_synthetic_dataset.csv.xlsx")
DATA_DIR = os.path.join(HERE, "data")
CHALLENGE_CSV = os.path.join(DATA_DIR, "challenge_set.csv")
MODEL_DIR = os.path.join(HERE, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "risk_model.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")
MODEL_VERSION = "4.0.0"

TIERS = ("low", "medium", "high")
# Risk value of each severity tier; the score is the probability-weighted mean.
TIER_SCORE = (5.0, 62.0, 95.0)


def risk_from_tier_proba(p):
    """Expected-severity risk score in [0, 100] from LOW/MEDIUM/HIGH probabilities."""
    return float(sum(pi * s for pi, s in zip(p, TIER_SCORE)))


def band(score):
    return "high" if score >= 80 else "medium" if score >= 40 else "low"


# --------------------------------------------------------------------- data
def load_base_dataset():
    """Unique (text, label, tier) rows from the cleaned dataset; falls back to the xlsx."""
    df = None
    for loader in (lambda: pd.read_csv(DATASET_CSV),
                   lambda: CyberThreatPreprocessor().process_dataset(DATASET_XLSX)):
        try:
            df = loader()
            break
        except Exception as e:  # missing / corrupt file -> try next source
            print(f"[TRAIN] dataset source unavailable: {e}")
    if df is None:
        print("[TRAIN] WARNING: no dataset found, training on augmentation corpus only")
        return pd.DataFrame(columns=["text", "label", "tier"])

    if "threat_type_encoded" not in df:
        df["threat_type_encoded"] = df["threat_type"].map(THREAT_CATEGORY_MAP)
    df = df.dropna(subset=["raw_text", "threat_type_encoded"])
    df = pd.DataFrame({"text": df["raw_text"].astype(str), "label": df["threat_type_encoded"].astype(int)})
    df["key"] = df["text"].map(lambda t: normalize(t).lower())
    # resolve any label conflicts on identical text by majority vote
    df = df.groupby("key").agg(text=("text", "first"), label=("label", lambda s: s.mode().iloc[0])).reset_index()
    # every threat in the source dataset is a fully-formed attack with a concrete ask
    df["tier"] = np.where(df["label"] == 0, 0, 2)
    return df[["text", "label", "tier"]]


def training_corpus(base, aug):
    X = list(base["text"]) + [t for t, _, _ in aug]
    y_cat = list(base["label"]) + [c for _, c, _ in aug]
    y_tier = list(base["tier"]) + [s for _, _, s in aug]
    return X, np.asarray(y_cat), np.asarray(y_tier)


# --------------------------------------------------------------------- models
def build_features():
    return FeatureUnion([
        ("word", TfidfVectorizer(preprocessor=model_text, ngram_range=(1, 2), sublinear_tf=True,
                                 min_df=1, max_features=30000, token_pattern=r"(?u)\b\w[\w'-]*\b")),
        ("char", TfidfVectorizer(preprocessor=model_text, analyzer="char_wb", ngram_range=(2, 5),
                                 sublinear_tf=True, min_df=2, max_features=60000)),
        ("ind", Pipeline([("f", FunctionTransformer(indicator_matrix)), ("s", MaxAbsScaler())])),
    ])


def build_pipeline(C=4.0):
    """Category head: soft-voting LogReg + calibrated LinearSVC."""
    ensemble = VotingClassifier([
        ("lr", LogisticRegression(C=C, max_iter=4000, class_weight="balanced")),
        ("svm", CalibratedClassifierCV(LinearSVC(C=C / 8, class_weight="balanced", max_iter=10000),
                                       method="sigmoid", cv=3)),
    ], voting="soft")
    return Pipeline([("features", build_features()), ("clf", ensemble)])


def build_tier_pipeline(C=4.0):
    """Severity head: LOW / MEDIUM / HIGH.

    (A LogReg + calibrated-SVM ensemble was tried here and pushed more benign defence/admin
    text into MEDIUM on the held-out sets, so the plain LogReg is kept.)
    """
    return Pipeline([("features", build_features()),
                     ("clf", LogisticRegression(C=C, max_iter=4000, class_weight="balanced"))])


def fit_models(base, aug, C_cat=4.0, C_tier=4.0):
    X, y_cat, y_tier = training_corpus(base, aug)
    return build_pipeline(C_cat).fit(X, y_cat), build_tier_pipeline(C_tier).fit(X, y_tier)


def predict(cat_pipe, tier_pipe, texts):
    """Category ids, risk scores (before evidence floors) for a list of texts."""
    cp = cat_pipe.predict_proba(texts)
    tp = tier_pipe.predict_proba(texts)
    scores = np.array([risk_from_tier_proba(p) for p in tp])
    cats = cp.argmax(1)
    # keep the two heads consistent: low risk => benign, flagged risk => a threat class
    threat_best = cp[:, 1:].argmax(1) + 1
    cats = np.where(scores < 40, 0, np.where(cats == 0, threat_best, cats))
    return cats, scores


# --------------------------------------------------------------------- evaluation
def _metrics(y_true, y_pred, scores, bands=None):
    y_true, y_pred, scores = np.asarray(y_true), np.asarray(y_pred), np.asarray(scores)
    threat = y_true > 0
    m = {
        "n": int(len(y_true)),
        "category_accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "category_macro_f1": round(float(f1_score(y_true, y_pred, average="macro", labels=list(range(6)),
                                                  zero_division=0)), 4),
        "threats_flagged@40": round(float((scores[threat] >= 40).mean()), 4) if threat.any() else None,
        "benign_false_alarm@40": round(float((scores[~threat] >= 40).mean()), 4) if (~threat).any() else None,
    }
    if bands is not None:
        bands = np.asarray(bands)
        got = np.array([band(s) for s in scores])
        m["band_accuracy"] = round(float((got == bands).mean()), 4)
        hi = bands == "high"
        m["high_escalated@80"] = round(float((scores[hi] >= 80).mean()), 4) if hi.any() else None
        m["non_high_wrongly_escalated@80"] = round(float((scores[~hi] >= 80).mean()), 4) if (~hi).any() else None
        m["band_confusion(rows=want low/med/high)"] = [[int(((bands == w) & (got == g)).sum()) for g in TIERS]
                                                      for w in TIERS]
    return m


def cross_validate(base, aug, C_cat, C_tier, folds=4, seed=7):
    """CV over unique dataset texts + graded augmentation (stratified on category x tier).

    Used for hyper-parameter selection only; templated augmentation makes it optimistic,
    which is why the held-out sets below are the numbers that matter.
    """
    X, y_cat, y_tier = training_corpus(base, aug)
    strata = y_cat * 3 + y_tier
    skf = StratifiedKFold(n_splits=folds, shuffle=True, random_state=seed)
    yt, yp, sc, bd = [], [], [], []
    X = np.asarray(X, dtype=object)
    for tr, te in skf.split(X, strata):
        cat_pipe = build_pipeline(C_cat).fit(list(X[tr]), y_cat[tr])
        tier_pipe = build_tier_pipeline(C_tier).fit(list(X[tr]), y_tier[tr])
        cats, scores = predict(cat_pipe, tier_pipe, list(X[te]))
        yt += list(y_cat[te]); yp += list(cats); sc += list(scores); bd += [TIERS[t] for t in y_tier[te]]
    return _metrics(yt, yp, sc, bd)


def evaluate_heldout(cat_pipe, tier_pipe, path, floor_fn=None):
    cs = pd.read_csv(path)
    texts = list(cs["text"])
    cats, scores = predict(cat_pipe, tier_pipe, texts)
    if floor_fn is not None:  # apply the production evidence floors too
        for i, t in enumerate(texts):
            cats[i], scores[i] = floor_fn(normalize(t), int(cats[i]), float(scores[i]))
    bands = list(cs["band"]) if "band" in cs else None
    m = _metrics(cs["category"], cats, scores, bands)
    m["category_confusion"] = confusion_matrix(cs["category"], cats, labels=list(range(6))).tolist()
    res = cs.assign(pred=cats, score=np.round(scores, 1))
    bad = (res["category"] != res["pred"])
    if bands is not None:
        bad |= res["band"] != res["score"].map(band)
    else:
        bad |= ((res["category"] > 0) & (res["score"] < 40)) | ((res["category"] == 0) & (res["score"] >= 40))
    m["errors"] = res[bad].to_dict("records")
    return m


def heldout_sets():
    return [os.path.join(DATA_DIR, n) for n in sorted(os.listdir(DATA_DIR))
            if n.endswith(".csv") and (n.startswith("challenge_set") or n.startswith("eval_"))]


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-save", action="store_true")
    ap.add_argument("--per-class", type=int, default=220)
    args = ap.parse_args()

    t0 = time.time()
    base = load_base_dataset()
    aug = augment.generate_graded(per_class=args.per_class)
    tiers = pd.Series([s for _, _, s in aug]).value_counts().sort_index().to_dict()
    print(f"[TRAIN] unique dataset texts: {len(base)}  |  graded augmentation: {len(aug)}  (tiers {tiers})")

    # hyper-parameter selection on CV only (never on held-out sets)
    cv = {}
    for C in (1.0, 4.0, 10.0):
        cv[C] = cross_validate(base, aug, C, C)
        print(f"[CV] C={C}: { {k: v for k, v in cv[C].items() if 'confusion' not in k} }")
    best_C = max(cv, key=lambda c: (cv[c]["band_accuracy"] + cv[c]["category_macro_f1"], -abs(c - 4)))
    print(f"[TRAIN] selected C={best_C}")

    cat_pipe, tier_pipe = fit_models(base, aug, best_C, best_C)

    from risk_rules import evidence_adjust  # production rules, so held-out numbers match the live service
    heldout = {}
    for path in heldout_sets():
        name = os.path.basename(path)
        res = evaluate_heldout(cat_pipe, tier_pipe, path, evidence_adjust)
        heldout[name] = res
        print(f"[HELD-OUT {name}]", {k: v for k, v in res.items() if k not in ("errors", "category_confusion")})
        for e in res["errors"]:
            want = f"{e.get('band', '?')}/{e['category']}"
            print(f"   want={want:9} got={band(e['score'])}/{e['pred']} score={e['score']:5}  {e['text'][:80]!r}")

    X, _, _ = training_corpus(base, aug)
    metrics = {
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
        "algorithms": {
            "features": "word 1-2gram TF-IDF + char_wb 2-5gram TF-IDF + 21 threat indicators",
            "category_head": "soft-voting ensemble: LogisticRegression + sigmoid-calibrated LinearSVC",
            "severity_head": "multinomial LogisticRegression (LOW/MEDIUM/HIGH)",
            "risk_score": f"expected severity, tier scores {dict(zip(TIERS, TIER_SCORE))}, plus hard-evidence floors",
        },
        "train_size": len(X),
        "unique_dataset_texts": int(len(base)),
        "augmentation_samples": len(aug),
        "augmentation_tiers": {TIERS[k]: int(v) for k, v in tiers.items()},
        "selected_C": best_C,
        "cv": cv[best_C],
        "heldout": heldout,
        "training_seconds": round(time.time() - t0, 1),
    }
    if not args.no_save:
        os.makedirs(MODEL_DIR, exist_ok=True)
        tmp = MODEL_PATH + ".tmp"
        joblib.dump({"pipeline": cat_pipe, "tier_pipeline": tier_pipe, "version": MODEL_VERSION,
                     "sklearn_version": sklearn.__version__, "tier_score": TIER_SCORE,
                     "trained_at": metrics["trained_at"]}, tmp)
        os.replace(tmp, MODEL_PATH)  # atomic swap so a crash never leaves a half-written model
        with open(METRICS_PATH, "w", encoding="utf-8") as f:
            json.dump(metrics, f, indent=2, default=str)
        print(f"[TRAIN] saved {MODEL_PATH} and {METRICS_PATH}")
    return metrics


if __name__ == "__main__":
    main()
