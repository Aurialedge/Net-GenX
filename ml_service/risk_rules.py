"""
Hard-evidence rules applied on top of the ML risk score.

Shared by the live engine (model.py) and the trainer (train.py) so that the
held-out evaluation measures exactly what production does. Rules only ever
*raise* a score: they encode evidence the probabilistic model must not
under-rate (a payload extension is dangerous however friendly the wording).
"""
import re

from preprocessor import (indicator_vector, LEXICON_RE, URL_RE, SUSPICIOUS_TLD_RE,
                          TRUSTED_DOMAIN_RE, DROPPER_RE)

# Asking the reader to hand over a one-time code / PIN / CVV / password. No legitimate
# sender does this, however official the wording ("Adjutant here, CO wants your OTP").
_SECRET_LAT = (r"(?:otp|one[- ]time (?:password|code)|(?-i:PIN)|mpin|(?:upi|atm|card) pin|pin (?:number|code)|cvv|"
               r"passcode|password|verification code|the code (?:you|that) (?:receive|got|came))")
_ASK_LAT = (r"(?:send|share|tell|give|forward|provide|reply with|need|want|wants|require|chahiye|"
            r"bhej\w*|bata\w*|de do|dedo|whatsapp (?:me|karo))")
# Devanagari: Python's re does not count matras as \w, so \b is unreliable inside Hindi
# words. These are matched as plain stems (bhej-, bata-, OTP, password, PIN, share).
_SECRET_DEV = r"(?:ओटीपी|पासवर्ड|पिन)"
_ASK_DEV = r"(?:भेज|बता|दे दो|दें|शेयर)"
_SECRET = rf"(?:\b{_SECRET_LAT}\b|{_SECRET_DEV})"
_ASK = rf"(?:\b{_ASK_LAT}\b|{_ASK_DEV})"
_SECRET_ASK_RE = re.compile(rf"{_ASK}[^?!\n]{{0,60}}?{_SECRET}|{_SECRET}[^?!\n]{{0,60}}?{_ASK}"
                            rf"|{_SECRET}\s*(?:please|pls|plz)\b", re.I)  # "your password please"
_NEGATION_RE = re.compile(
    r"\b(?:never|not|don'?t|do not|mat|nahi|na karein|no one|anyone)\b"
    r"|मत|नहीं|कभी|किसी को|(?<!\S)न(?!\S)|(?<!\S)ना(?!\S)", re.I)


def asks_for_secret(t):
    """True when the text asks for an OTP/PIN/CVV/password, ignoring 'never share your OTP' advice."""
    for m in _SECRET_ASK_RE.finditer(t):
        # negation may precede ("never share your OTP") or follow ("OTP shayar na karein")
        window = t[max(0, m.start() - 25):m.end() + 15]
        if not _NEGATION_RE.search(window):
            return True
    return False


_ENABLE_MACRO_RE = re.compile(r"\benable\W{0,3}(?:content|macros?|editing)\b|\bmacros? (?:are|is) (?:needed|required)\b", re.I)
# "install it and allow everything / ignore the warning" - malware delivery without a file name
_INSTALL_RE = re.compile(r"\b(?:install|download|sideload)\w*\b|\binstall karo\b", re.I)
_BYPASS_RE = re.compile(r"\ballow (?:everything|all|all permissions|unknown sources|from unknown)\b|\bunknown sources\b"
                        r"|\bignore (?:that|the|this|it|any)?\s*(?:warning|alert|message|popup)?\b.{0,40}\b(?:harmful|unsafe|warning|virus|play protect)\b"
                        r"|\b(?:disable|turn off) (?:play protect|antivirus|security)\b|\ballow (?:it|this) when it asks\b", re.I)

# Paying a stranger is only flagged with a scam marker: "send 2000 to my account" from family is fine,
# "deposit 10,000 to the merchant account to unlock VIP tasks" is not.
_PAY_RE = re.compile(r"\b(?:deposit|transfer|pay|send|scan|invest)\w*\b", re.I)
_FEE_SCAM_RE = re.compile(
    r"\b(?:merchant account|vip (?:task|level|member)\w*|(?:prepaid|recharge|merchant) tasks?|registration fee|processing fee"
    r"|activation fee|unlock (?:fee|charges?)|gate ?pass\b|courier (?:fee|charges?)|token amount|release (?:fee|charges?)"
    r"|(?:transport|delivery|shipping) charges?\b[^.?!\n]{0,30}\bfirst"
    r"|withdraw\w*\b[^.?!\n]{0,40}\b(?:after|once|same day)|guaranteed returns?|\d+% (?:returns?|profit))", re.I)

_DEMAND_RE = re.compile(r"\b(?:send|share|pay|transfer|give|cooperate|or (?:we|you|else|your)|otherwise|unless)\b", re.I)
_LEVERAGE_RE = re.compile(r"\b(?:video|photos?|pics?|chats?|records|recordings?|history|recorded|screenshots?|folder|affair)\b", re.I)


def evidence_floors(t):
    """List of (category_id, minimum_score, note) triggered by normalised text ``t``."""
    floors = []
    if DROPPER_RE.search(t):
        floors.append((3, 90, "executable/macro payload reference"))
    bad_urls = [u for u in URL_RE.findall(t) if not TRUSTED_DOMAIN_RE.search(u)]
    if bad_urls and (LEXICON_RE["credential"].search(t) or LEXICON_RE["admin_lure"].search(t)):
        floors.append((2, 82 if any(SUSPICIOUS_TLD_RE.search(u) for u in bad_urls) else 72,
                       "credential lure pointing to non-government domain"))
    if asks_for_secret(t):
        floors.append((2, 88, "request to hand over an OTP/PIN/CVV/password"))
    if _FEE_SCAM_RE.search(t) and _PAY_RE.search(t):
        floors.append((2, 85, "advance-fee / task-scam payment demand"))
    if _ENABLE_MACRO_RE.search(t):
        floors.append((3, 88, "instruction to enable macros / active content"))
    if _INSTALL_RE.search(t) and _BYPASS_RE.search(t):
        floors.append((3, 88, "instruction to install an app and bypass security warnings"))
    if (LEXICON_RE["coercion"].search(t) or LEXICON_RE["veiled_threat"].search(t)) \
            and _DEMAND_RE.search(t) and _LEVERAGE_RE.search(t):
        floors.append((4, 85, "leverage + demand (extortion pattern)"))
    return floors


def conversation_evidence(contact_texts):
    """Hard evidence that only shows up across several messages of one sender.

    Extortion is routinely split: "we have your chats and photos" ... "send the roster" ...
    "or these go to your unit group tonight". Returns [(category, min_score, note)].
    """
    texts = [str(t or "") for t in contact_texts]
    joined = " \n ".join(texts)
    out = []
    has_leverage = any(_CONV_LEVERAGE_RE.search(t) for t in texts)
    has_demand = bool(_CONV_DEMAND_RE.search(joined))
    has_consequence = bool(_CONV_CONSEQUENCE_RE.search(joined))
    if has_leverage and has_demand and has_consequence:
        out.append((4, 88, "leverage + demand + threat across messages (extortion)"))
    return out


_CONV_LEVERAGE_RE = re.compile(
    r"\b(?:we|i)\s+(?:have|got|saved|kept|recorded|still have)\b[^.?!\n]{0,60}\b(?:chats?|photos?|pics?|videos?|voice ?notes?|recordings?|screenshots?|messages)\b"
    r"|\brecorded\s+(?:our|your|the|everything)\b|\b(?:video|photos?|chats?|recording)\b[^.?!\n]{0,20}\b(?:mere|hamare|humare|hamaare|humaare|apne) paas\b", re.I)
_CONV_DEMAND_RE = re.compile(r"\b(?:send|pay|transfer|share|give|forward|bhej\w*|de do|dedo)\b", re.I)
_CONV_CONSEQUENCE_RE = re.compile(
    r"\b(?:go(?:es)? to|will be sent|be (?:sent|shared|posted)|unit group|your (?:co|wife|family|seniors|unit)|viral|upload|leak\w*"
    r"|or else|otherwise|warna|nahi to|you have till|till \d|before \d|by (?:tonight|tomorrow)|don'?t try to be smart)\b", re.I)


def _sensitive_ask(t):
    """A probe: elicitation stage, a high-risk message, or a fairly risky message about a military topic.
    Small talk after a refusal ("do you like cooking?") is not a probe."""
    s = t["l1"]["score"]
    return t.get("stage", 0) >= 3 or s >= 80 or (s >= 60 and t.get("opsec"))


def trajectory_evidence(turns):
    """Policy rules over the scored conversation (turns from conversation_model.build_turns_batch).

    * persistent probing: 2+ sensitive asks (see _sensitive_ask) AFTER the reporter refused;
    * repeated high-risk asks: 3+ separate contact messages scoring >= 80 that elicit, carry hard
      evidence, or touch military topics.
    Returns [(category, min_score, note)].
    """
    out, refused, probes, probe_cats = [], False, 0, []
    contact = [t for t in turns if t.get("role") == "contact"]
    for t in turns:
        if t.get("role") == "user":
            refused = refused or bool(t.get("refusal"))
        elif refused and _sensitive_ask(t):
            probes += 1
            probe_cats.append(t["l1"]["category_id"] or 5)
    if probes >= 2:
        cat = max(set(probe_cats), key=probe_cats.count)
        out.append((cat, 85, f"kept asking after the reporter refused ({probes} times)"))
    # romance alone ("miss you", "send a cute pic") scores high too: count only asks for something sensitive
    # policy: asking for operational details is HIGH - a friendly lead-in must not dilute two such asks
    strong_ops = [t for t in contact if t["l1"]["score"] >= 85 and t.get("opsec") and t.get("stage", 0) >= 3]
    if len(strong_ops) >= 2:
        out.append((5, 85, f"{len(strong_ops)} requests for operational details"))
    highs = [t for t in contact if t["l1"]["score"] >= 80 and (t["l1"]["notes"] or t.get("opsec"))]
    if len(highs) >= 3:
        cats = [t["l1"]["category_id"] or 5 for t in highs]
        out.append((max(set(cats), key=cats.count), 85, f"{len(highs)} separate high-risk requests"))
    return out


def evidence_adjust(t, cat, score):
    """Apply the short-chatter cap and evidence floors. Returns (category_id, score)."""
    cat, score, _ = evidence_adjust_with_notes(t, cat, score)
    return cat, score


def evidence_adjust_with_notes(t, cat, score):
    notes = []
    # very short, indicator-free chatter ("ok", "hi sir") carries little evidence
    if len(t.split()) <= 3 and sum(indicator_vector(t)[1:]) <= 1:
        score = min(score, 15.0)
    for fcat, fscore, note in evidence_floors(t):
        notes.append(note)
        if fscore > score:
            score, cat = float(fscore), fcat
    if score < 40:
        cat = 0
    return cat, score, notes
