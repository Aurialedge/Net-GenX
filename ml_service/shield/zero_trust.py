"""
Layer 4 - Zero-Trust OPSEC Perimeter.

"Never trust, always verify": every counterpart starts UNTRUSTED regardless of
how human, friendly or official it sounds. We then compare

    sensitivity of the information requested (inbound) or disclosed (outbound)
        vs
    the trust that the channel + verified identity actually earns.

Outbound mode works as a DLP gate: it detects coordinates / grid refs, service
numbers, Aadhaar / PAN, OTPs, unit names, movement timings, etc., blocks the
reply when the recipient is not trusted enough and returns a redacted version.
Inbound mode also flags look-alike / impersonated official domains.
"""
import re

from preprocessor import normalize, URL_RE, TRUSTED_DOMAIN_RE, SUSPICIOUS_TLD_RE
from .common import layer_result, rx
from .intent import TARGETS

# Sensitivity tiers: 0 PUBLIC, 1 RESTRICTED, 2 CONFIDENTIAL, 3 SECRET
TIER_NAMES = ["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "SECRET"]
TARGET_TIER = {
    "imagery": 1, "location": 2, "unit_identity": 1, "movement_schedule": 2, "credentials_financial": 3,
    "equipment_weapons": 3, "strength_personnel": 3, "communications": 3, "documents": 3,
}
# Trust levels: 0 UNKNOWN, 1 KNOWN_PERSONAL, 2 VERIFIED_OFFICIAL, 3 SECURE_MIL_NETWORK
TRUST_NAMES = ["UNVERIFIED", "KNOWN_CONTACT", "VERIFIED_OFFICIAL", "SECURE_MILITARY_NETWORK"]
CHANNEL_TRUST_CAP = {"social_media": 0, "messaging": 1, "sms": 1, "email": 2, "intranet": 3, "official": 3}

DLP_PATTERNS = {
    "gps_coordinates": (re.compile(r"\b-?\d{1,2}\.\d{3,}\s*[,;]\s*-?\d{1,3}\.\d{3,}\b|\b\d{1,2}°\s?\d{1,2}'\s?\d{0,2}(?:\.\d+)?\"?\s?[NS]\b", re.I), 3),
    "mgrs_grid_reference": (re.compile(r"\b\d{1,2}[C-HJ-NP-X]\s?[A-HJ-NP-Z]{2}\s?\d{4,10}\b|\bgrid (?:ref\w*)?\s*\d{4,8}\b", re.I), 3),
    "service_number": (re.compile(r"\b(?:IC|JC|SS|SL|MS|RC)-?\d{4,6}[A-Z]?\b|\b\d{7,8}[A-Z]\b"), 2),
    "aadhaar": (re.compile(r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b"), 3),
    "pan": (re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"), 3),
    "otp_or_pin": (re.compile(r"\b(?:otp|pin|code|password|passcode)\s*(?:is|:|-)?\s*[A-Za-z0-9@#$]{4,12}\b", re.I), 3),
    "unit_designation": (re.compile(r"\b\d{1,3}\s?(?:st|nd|rd|th)?\s?(?:bn|battalion|regiment|regt|rifles|brigade|bde|div|division|corps|sqn|squadron|field regiment|fd regt|armd|mech inf|rajput|raj rif|sikh(?: li)?|gorkha|gurkha|gr|jat|dogra|garhwal(?: rif)?|kumaon|maratha(?: li)?|madras|grenadiers|para(?: sf)?|naga|assam|bihar|mahar|jak (?:rif|li)|ladakh scouts|guards|sikh regt)\b", re.I), 2),
    "movement_timing": (re.compile(r"\b(?:moving|move|convoy|deploy\w*|leaving|rotation|patrol)\b.{0,40}\b(?:\d{3,4}\s?hrs|\d{1,2}\s?(?:am|pm)|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\b", re.I), 3),
    "troop_strength": (re.compile(r"\b\d{2,5}\s?(?:troops|men|soldiers|personnel|tanks|guns|vehicles)\b", re.I), 3),
    "weapon_system_detail": (re.compile(r"\b(?:brahmos|akash|pinaka|bofors|k9 vajra|dhanush|arjun|t-?90|s-?400|igla|spike|heron)\b", re.I), 2),
}

LOOKALIKE_BRANDS = ["sparsh", "echs", "pcda", "csd", "awho", "agif", "dsop", "hamraaz", "indianarmy", "army", "defence",
                    "defense", "mod", "desw", "cghs", "kavach", "nic", "gov"]


def _sender_trust(sender, sender_domain, channel, verified):
    trust = 0
    domain = (sender_domain or "").lower()
    if not domain and sender and "@" in str(sender):
        domain = str(sender).split("@", 1)[1].lower()
    if domain and TRUSTED_DOMAIN_RE.search("." + domain):
        trust = 2
    elif verified:
        trust = 1
    cap = CHANNEL_TRUST_CAP.get((channel or "").lower(), 1)
    return min(trust, cap) if trust else 0, domain


def _lookalike_domains(text):
    hits = []
    for m in URL_RE.finditer(text):
        host = re.sub(r"^(?:https?://)?(?:www\.)?", "", m.group(0).lower()).split("/")[0]
        if TRUSTED_DOMAIN_RE.search("." + host):
            continue
        brand = next((b for b in LOOKALIKE_BRANDS if b in host), None)
        if brand or SUSPICIOUS_TLD_RE.search(host):
            hits.append({"domain": host, "impersonates": brand, "suspicious_tld": bool(SUSPICIOUS_TLD_RE.search(host))})
    return hits


def scan_dlp(text):
    t = normalize(text)
    found = {}
    for name, (pat, tier) in DLP_PATTERNS.items():
        ms = [m.group(0) for m in pat.finditer(t)]
        if ms:
            found[name] = {"tier": TIER_NAMES[tier], "count": len(ms), "_tier": tier, "_matches": ms}
    return found


def redact(text, found):
    out = normalize(text)
    for name, info in found.items():
        for m in sorted(set(info["_matches"]), key=len, reverse=True):
            out = out.replace(m, f"[REDACTED:{name.upper()}]")
    return out


def analyze(text, direction="inbound", sender=None, sender_domain=None, channel=None, verified_contact=False, **_):
    t = normalize(text)
    trust, domain = _sender_trust(sender, sender_domain, channel, verified_contact)
    signals, details = [], {"direction": direction, "counterpart_trust": TRUST_NAMES[trust],
                            "channel": channel or "unknown", "sender_domain": domain or None}

    if direction == "outbound":
        found = scan_dlp(t)
        tier = max((f["_tier"] for f in found.values()), default=0)
        details["sensitive_data_found"] = {k: {"tier": v["tier"], "count": v["count"]} for k, v in found.items()}
        details["max_sensitivity"] = TIER_NAMES[tier]
        gap = tier - trust
        if found and gap > 0:
            decision = "BLOCK"
            details["redacted_message"] = redact(t, found)
            signals += [f"dlp:{k}" for k in found] + [f"sensitivity_{TIER_NAMES[tier]}_exceeds_trust_{TRUST_NAMES[trust]}"]
        elif found:
            decision = "WARN"
            signals += [f"dlp:{k}" for k in found]
        else:
            decision = "ALLOW"
        score = {"BLOCK": 60 + 13 * gap, "WARN": 35, "ALLOW": 0}[decision]
    else:
        requested = {k for k, p in TARGETS.items() if p.search(t)}
        is_request = "?" in t or bool(re.search(r"\b(?:send|share|tell|show|provide|confirm|verify|enter|click|install|login)\b", t, re.I))
        tier = max((TARGET_TIER[k] for k in requested), default=0) if is_request else 0
        lookalikes = _lookalike_domains(t)
        details.update({"requested_information": sorted(requested), "requested_sensitivity": TIER_NAMES[tier],
                        "lookalike_domains": lookalikes})
        gap = tier - trust
        score = 0
        if gap > 0:
            score = {1: 25, 2: 55, 3: 80}[min(gap, 3)]
            signals.append(f"untrusted_{TRUST_NAMES[trust]}_counterpart_requests_{TIER_NAMES[tier]}_data")
        if lookalikes:
            score = max(score, 85 if any(l["impersonates"] for l in lookalikes) else 65)
            signals += [f"lookalike_domain:{l['domain']}" for l in lookalikes]
        if trust == 0 and re.search(r"\b(?:official (?:notice|order|circular|communication|message)|(?:this is|from) (?:the )?(?:hq|headquarters|signals branch|ministry|cert.?army|it cell)|by order of|on behalf of (?:the )?(?:army|ministry|command))\b", t, re.I):
            score = max(score, 55)
            signals.append("claims_official_authority_over_unverified_channel")
        decision = "BLOCK" if score >= 70 else "VERIFY_OUT_OF_BAND" if score >= 40 else "ALLOW"

    details["policy_decision"] = decision
    return layer_result(4, "Zero-Trust OPSEC Perimeter", score, signals, details, verdict=decision,
                        confidence=0.85 if signals else 0.6)
