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
    if (LEXICON_RE["coercion"].search(t) or LEXICON_RE["veiled_threat"].search(t)) \
            and _DEMAND_RE.search(t) and _LEVERAGE_RE.search(t):
        floors.append((4, 85, "leverage + demand (extortion pattern)"))
    return floors


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
