"""Score a labelled conversation set through the full /shield/conversation pipeline.

    python evaluate_conversations.py data/eval_conversations_60_final.json --verbose
    python evaluate_conversations.py data/eval_conversations_100.json dev      # seeded 50/50 split

Each item: {id, me, expect: low|medium|high, category: 0-5, note, transcript}.
Reports band accuracy, category accuracy, escalation decisions and a confusion table.
Uses an isolated shield state dir (live campaign memory is never touched) and no Gemini.
"""
import collections
import json
import os
import random
import sys
import tempfile

os.environ["NETGENX_STATE_DIR"] = tempfile.mkdtemp(prefix="netgenx_eval100_")
os.environ["NETGENX_ENABLE_GEMINI"] = "0"
sys.path.insert(0, os.getcwd())
sys.stdout.reconfigure(encoding="utf-8")
from app import app  # noqa: E402

CATS = ["benign", "honeytrap", "phishing", "malware", "blackmail", "opsec"]
args = [a for a in sys.argv[1:] if not a.startswith("--")]
path = args[0] if args and args[0].endswith(".json") else "data/eval_conversations_100.json"
data = json.load(open(path, encoding="utf-8"))

# fixed, stratified 50/50 split by expected band (seeded; decided before any results are seen)
rng = random.Random(2026)
split = {}
for band in ("low", "medium", "high"):
    ids = sorted(d["id"] for d in data if d["expect"] == band)
    rng.shuffle(ids)
    for i, cid in enumerate(ids):
        split[cid] = "dev" if i % 2 == 0 else "heldout"

rest = [a for a in args if not a.endswith(".json")]
which = rest[0] if rest else "all"
verbose = "--verbose" in sys.argv
c = app.test_client()
band_of = lambda s: "high" if s >= 80 else "medium" if s >= 40 else "low"
rows = []
for d in data:
    if which != "all" and split[d["id"]] != which:
        continue
    r = c.post("/shield/conversation", json={"transcript": d["transcript"], "me": d["me"]}).get_json()
    if not r or not r.get("status"):
        rows.append({**d, "score": None, "got": "ERROR", "cat": None, "split": split[d["id"]], "err": (r or {}).get("error")})
        continue
    f = r["fused"]
    rows.append({**d, "score": f["final_risk_score"], "got": band_of(f["final_risk_score"]), "cat": f["category_id"],
                 "split": split[d["id"]], "tp": r["counter_intel"].get("conversation_model", {}).get("tier_probabilities")})

n = len(rows)
band_ok = [r for r in rows if r["got"] == r["expect"]]
cat_ok = [r for r in rows if r["cat"] == r["category"]]
both_ok = [r for r in rows if r["got"] == r["expect"] and r["cat"] == r["category"]]
esc_ok = [r for r in rows if (r["got"] == "high") == (r["expect"] == "high")]
print(f"== {which.upper()}  n={n}")
print(f"band accuracy       {len(band_ok)}/{n} = {len(band_ok)/n:.0%}")
print(f"category accuracy   {len(cat_ok)}/{n} = {len(cat_ok)/n:.0%}")
print(f"band AND category   {len(both_ok)}/{n} = {len(both_ok)/n:.0%}")
print(f"escalation decision {len(esc_ok)}/{n} = {len(esc_ok)/n:.0%}   (high vs not-high)")
conf = collections.Counter((r["expect"], r["got"]) for r in rows)
print("band confusion (rows = expected):")
for e in ("low", "medium", "high"):
    print(f"   {e:7}", "  ".join(f"{g}:{conf[(e, g)]:2}" for g in ("low", "medium", "high", "ERROR")))
missed = [r for r in rows if r["expect"] == "high" and r["got"] != "high"]
false_esc = [r for r in rows if r["expect"] != "high" and r["got"] == "high"]
print(f"missed escalations: {len(missed)}   false escalations: {len(false_esc)}")
if verbose:
    for r in rows:
        if r["got"] != r["expect"] or r["cat"] != r["category"]:
            print(f"  {'BAND' if r['got'] != r['expect'] else 'CAT '} {r['id']} want {r['expect']:6}/{CATS[r['category']]:9} "
                  f"got {r['got']:6}/{CATS[r['cat']] if r['cat'] is not None else '-':9} {r['score']}  | {r['note'][:70]}")
