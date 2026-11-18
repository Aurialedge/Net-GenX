"""
Layer 2 - Threat Graph Clustering.

GenAI bot farms run one persona script against many personnel, from many
throw-away accounts, re-using the same lure domains, phone numbers, handles and
near-identical (paraphrased) text. Individually each message can look harmless;
on a graph they light up as a campaign.

Graph: nodes are messages, senders and indicators (domain, phone, email,
handle, file, wallet/UPI). Edges: message->sender, message->indicator, and
message<->message when their text shingles are near-duplicates. Connected
components (union-find) are campaign clusters. The graph persists to
state/threat_graph.json and is seeded with IOCs from the training dataset.
"""
import hashlib
import re
import time
import zlib

from preprocessor import normalize, URL_RE, PHONE_RE, EMAIL_RE, DROPPER_RE, TRUSTED_DOMAIN_RE
from .common import JsonStore, layer_result

MAX_MESSAGES = 5000
SIM_THRESHOLD = 0.55
# \b on both sides of the platform name: without it "signals" read as "ig" + handle "nals"
HANDLE_RE = re.compile(r"\b(?:insta(?:gram)?|telegram|snap(?:chat)?|tg|ig)\b\s*[:@-]?\s*@?([a-z0-9_.]{3,30})|(?<![\w.])@([a-z0-9_.]{3,30})\b", re.IGNORECASE)
WALLET_RE = re.compile(r"\b(?:0x[a-f0-9]{40}|bc1[a-z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b|\b[\w.-]+@(?:ok\w+|ybl|paytm|upi|apl|ibl|axl)\b", re.IGNORECASE)


def _cid(root):
    return "TC-" + hashlib.sha1(root.encode()).hexdigest()[:10].upper()


def extract_indicators(text, sender=None):
    t = normalize(text)
    ind = set()
    for m in URL_RE.finditer(t):
        u = m.group(0).lower()
        host = re.sub(r"^(?:https?://)?(?:www\.)?", "", u).split("/")[0].strip(".,;:)")
        if host and not TRUSTED_DOMAIN_RE.search("." + host):
            ind.add("domain:" + host)
    for m in PHONE_RE.finditer(t):
        ind.add("phone:" + re.sub(r"\D", "", m.group(0))[-10:])
    for m in WALLET_RE.finditer(t):
        ind.add("wallet:" + m.group(0).lower())
    for m in EMAIL_RE.finditer(t):
        e = m.group(0).lower()
        if "wallet:" + e not in ind:
            ind.add("email:" + e)
    for m in HANDLE_RE.finditer(t):
        h = (m.group(1) or m.group(2) or "").lower().strip(".")
        if h and "email:" not in h:
            ind.add("handle:" + h)
    for m in DROPPER_RE.finditer(t):
        start = t.rfind(" ", 0, m.start()) + 1
        ind.add("file:" + t[start:m.end()].lower())
    if sender:
        ind.add("sender:" + str(sender).strip().lower())
    return sorted(ind)


def shingles(text, k=4):
    # keep letters of every script (\w, plus Devanagari matras which re does not count as \w).
    # Stripping to [a-z0-9] turned every Hindi/Tamil/Bengali message into " ", so all of them
    # shared one shingle and were "near-duplicates" of each other.
    t = re.sub(r"[^\w ऀ-ॿ]|_", "", normalize(text).lower())
    t = re.sub(r"\s+", " ", t).strip()
    words = t.split()
    if len(words) < k:
        return {zlib.crc32(t.encode())} if t else set()
    return {zlib.crc32(" ".join(words[i:i + k]).encode()) for i in range(len(words) - k + 1)}


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


class ThreatGraph:
    def __init__(self, seed_rows=None):
        self.store = JsonStore("threat_graph.json", {"messages": [], "known_bad": {}})
        self._parent = {}
        self._shingles = []
        self._rebuild()
        if seed_rows and not self.store.data.get("seeded"):
            self.seed(seed_rows)

    # ---- union-find ------------------------------------------------------
    def _find(self, x):
        self._parent.setdefault(x, x)
        while self._parent[x] != x:
            self._parent[x] = self._parent[self._parent[x]]
            x = self._parent[x]
        return x

    def _union(self, a, b):
        ra, rb = self._find(a), self._find(b)
        if ra != rb:
            self._parent[ra] = rb

    def _rebuild(self):
        self._parent = {}
        msgs = self.store.data.setdefault("messages", [])
        self._shingles = [set(m.get("sh", [])) for m in msgs]
        for m in msgs:
            for i in m["ind"]:
                self._union("msg:" + m["id"], i)
        for i in range(len(msgs)):  # near-duplicate links (bounded by MAX_MESSAGES)
            for j in msgs[i].get("sim", []):
                self._union("msg:" + msgs[i]["id"], "msg:" + j)

    def seed(self, rows):
        """rows: iterable of (text, risk_score). Known-malicious IOCs from training data."""
        with self.store.lock:
            bad = self.store.data.setdefault("known_bad", {})
            for text, risk in rows:
                if risk >= 70:
                    for i in extract_indicators(text):
                        bad[i] = max(bad.get(i, 0), int(risk))
            self.store.data["seeded"] = True
            self.store.save(force=True)

    # ---- main ------------------------------------------------------------
    def analyze(self, text, sender=None, recipient=None, level1_score=0.0, record=True, **_):
        with self.store.lock:
            msgs = self.store.data["messages"]
            known_bad = self.store.data.get("known_bad", {})
            ind = extract_indicators(text, sender)
            sh = shingles(text)
            mid = hashlib.sha1(f"{text}|{sender}|{time.time()}".encode()).hexdigest()[:16]

            sims = []
            for idx, other in enumerate(msgs):
                s = jaccard(sh, self._shingles[idx])
                if s >= SIM_THRESHOLD:
                    sims.append((other["id"], round(s, 2), other.get("sender")))
            if record:
                msgs.append({"id": mid, "ts": int(time.time()), "sender": (str(sender).lower() if sender else None),
                             "recipient": (str(recipient).lower() if recipient else None), "ind": ind,
                             "sh": sorted(sh), "sim": [s[0] for s in sims], "risk": round(float(level1_score), 1)})
                self._shingles.append(sh)
                for i in ind:
                    self._union("msg:" + mid, i)
                for s in sims:
                    self._union("msg:" + mid, "msg:" + s[0])
                if len(msgs) > MAX_MESSAGES:  # evict oldest 10% in one go, then rebuild
                    del msgs[: len(msgs) - int(MAX_MESSAGES * 0.9)]
                    self._rebuild()
                self.store.save()
                root = self._find("msg:" + mid)
            else:
                root = None
                for i in ind:
                    if i in self._parent:
                        root = self._find(i)
                        break

            cluster = [m for m in msgs if root and self._find("msg:" + m["id"]) == root] if root else []
            senders = {m["sender"] for m in cluster if m.get("sender")}
            recipients = {m["recipient"] for m in cluster if m.get("recipient")}
            prior = [m for m in cluster if m["id"] != mid]
            prior_max = max((m["risk"] for m in prior), default=0.0)
            bad_hits = {i: known_bad[i] for i in ind if i in known_bad}
            template_reuse = {s[2] for s in sims if s[2] and s[2] != (str(sender).lower() if sender else None)}

        signals, ev = [], []
        if bad_hits:
            signals.append(f"known_malicious_indicator:{','.join(bad_hits)}")
            ev.append(max(bad_hits.values()))
        if prior and prior_max >= 70:
            signals.append(f"linked_to_high_risk_cluster(max_prior_risk={prior_max})")
            ev.append(prior_max * 0.95)
        if len(senders) >= 3:
            signals.append(f"coordinated_campaign:{len(senders)}_senders_share_infrastructure")
            ev.append(70 + min(25, 5 * (len(senders) - 3)))
        if len(template_reuse) >= 1:
            signals.append(f"bot_template_reuse_across_{len(template_reuse)}_other_sender(s)")
            ev.append(60 + min(30, 10 * len(template_reuse)))
        if len(recipients) >= 3:
            signals.append(f"mass_targeting:{len(recipients)}_personnel_contacted")
            ev.append(65 + min(25, 5 * (len(recipients) - 3)))
        score = max(ev) if ev else (15 if len(cluster) > 1 else 0)

        return layer_result(
            2, "Threat Graph Clustering", score, signals,
            {"cluster_id": _cid(root) if root else None, "cluster_size": len(cluster),
             "distinct_senders": len(senders), "distinct_targets": len(recipients),
             "indicators": ind, "near_duplicates": len(sims), "known_bad_hits": bad_hits},
            confidence=0.85 if ev else 0.5)

    def clusters(self, min_size=2, limit=50):
        with self.store.lock:
            groups = {}
            for m in self.store.data["messages"]:
                groups.setdefault(self._find("msg:" + m["id"]), []).append(m)
            out = []
            for root, ms in groups.items():
                if len(ms) < min_size:
                    continue
                inds = sorted({i for m in ms for i in m["ind"] if not i.startswith("sender:")})
                out.append({"cluster_id": _cid(root), "size": len(ms),
                            "senders": sorted({m["sender"] for m in ms if m.get("sender")}),
                            "targets": len({m["recipient"] for m in ms if m.get("recipient")}),
                            "max_risk": max(m["risk"] for m in ms), "shared_indicators": inds[:25],
                            "first_seen": min(m["ts"] for m in ms), "last_seen": max(m["ts"] for m in ms)})
            return sorted(out, key=lambda c: (-c["max_risk"], -c["size"]))[:limit]
