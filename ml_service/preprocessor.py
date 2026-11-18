"""
NetGenX text preprocessing & feature engineering.

Two responsibilities:
  1. ``normalize`` - adversarial-robust text normalisation. Attackers (and GenAI
     bots told to evade filters) obfuscate with homoglyphs, zero-width chars,
     l33t-speak, defanged URLs (hxxp://evil[.]xyz) and spacing tricks. We undo
     those so the classifier sees the canonical text.
  2. ``extract_features`` - a fixed-order numeric indicator vector that is fed to
     the classifier alongside the TF-IDF features (see ``INDICATOR_NAMES``).

``process_dataset`` (the original xlsx -> cleaned CSV pipeline) is kept.
"""
import os
import re
import json
import unicodedata

import pandas as pd

# Threat category taxonomy mapping
THREAT_CATEGORY_MAP = {
    'benign': 0,
    'honey_trapping': 1,
    'military_spear_phishing': 2,
    'malicious_dropper': 3,
    'blackmail_coercion': 4,
    'opsec_reconnaissance': 5
}
REVERSE_THREAT_MAP = {v: k for k, v in THREAT_CATEGORY_MAP.items()}

CHANNEL_MAP = {'messaging': 0, 'email': 1, 'sms': 2, 'social_media': 3}
DOMAIN_MAP = {
    'Administrative': 0,
    'Base/Station': 1,
    'Operational Unit': 2,
    'Logistics/Canteen': 3,
    'Personal Family Comms': 4
}

# ---------------------------------------------------------------------------
# Normalisation tables
# ---------------------------------------------------------------------------
_ZERO_WIDTH = re.compile(r'[​-‏‪-‮⁠-⁤﻿­]')

# Cyrillic / Greek look-alikes commonly used to dodge keyword filters
_HOMOGLYPHS = str.maketrans({
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i',
    'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ɡ': 'g', 'һ': 'h', 'ӏ': 'l', 'А': 'A', 'В': 'B',
    'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T',
    'Х': 'X', 'α': 'a', 'ο': 'o', 'ρ': 'p', 'ν': 'v', 'τ': 't', 'ι': 'i', 'κ': 'k',
})

_SPACED_LETTERS = re.compile(r'(?<![\w])(?:[A-Za-z] {1,3}){3,}[A-Za-z](?![\w])')

_LEET = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's'}
# Only de-leet tokens that mix letters and leet digits (keeps "1100 hrs", "50,000")
_LEET_TOKEN = re.compile(r'\b(?=[a-z0-9@$]*[a-z])(?=[a-z0-9@$]*[013457@$])[a-z0-9@$]{3,}\b', re.IGNORECASE)

# Defanged indicators: hxxp://, [.], (.), {dot}, [:]
_DEFANG = [
    (re.compile(r'\bhxxp(s?)', re.IGNORECASE), r'http\1'),
    (re.compile(r'\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)|\{dot\}', re.IGNORECASE), '.'),
    (re.compile(r'\[:\]'), ':'),
]

URL_RE = re.compile(
    r'(?:https?://|www\.)\S+'
    r'|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:xyz|top|info|online|cc|work|click|link|site|live|icu|buzz|tk|ml|ga|cf|gq|ru|cn|in|com|net|org|io|me|app)\b(?:/\S*)?',
    re.IGNORECASE)
TRUSTED_DOMAIN_RE = re.compile(r'\.(?:gov\.in|nic\.in|mil\.in)\b|\bindianarmy\.nic\.in\b', re.IGNORECASE)
SUSPICIOUS_TLD_RE = re.compile(r'\.(?:xyz|top|info|online|cc|work|click|link|site|live|icu|buzz|tk|ml|ga|cf|gq|ru|cn)\b', re.IGNORECASE)
DROPPER_RE = re.compile(r'\.(?:apk|exe|scr|docm|xlsm|pptm|bat|cmd|vbs|ps1|jar|msi|hta|lnk|iso)\b|\.(?:pdf|doc|jpg|png)\.(?:exe|scr|apk|bat|js)\b', re.IGNORECASE)
PHONE_RE = re.compile(r'(?:\+91[-\s]?)?\b[6-9]\d{9}\b|\b\d{3}[-\s]\d{3}[-\s]\d{4}\b')
EMAIL_RE = re.compile(r'\b[\w.+-]+@[\w-]+\.[\w.-]+\b')
MONEY_RE = re.compile(r'(?:rs\.?|inr|₹)\s?\d[\d,]*|\b\d+\s?(?:lakh|crore|k)\b|\$\s?\d+', re.IGNORECASE)

# Lexicons (canonical, post-normalisation). Kept here so model and shield share them.
LEXICONS = {
    'opsec': r'\b(?:deploy\w*|brigade|corps|artillery|radar\w*|brahmos|regiment|battalion|bunker|ammunition|troops?|lac|loc|border|patrol\w*|convoy\w*|silo|strike corps|cantonment|cantt|air defence|air defense|missile\w*|warhead|frequenc\w*|mobili[sz]\w*|forward posts?|formation|sector|weapon\w*|equipment|night.vision|thermal|drdo|nuclear|unit location|post location|grid reference|coordinates)\b',
    'coercion': r'\b(?:court.?martial\w*|intimate|leak\w*|blackmail\w*|cooperate|archived|browsing (?:records|history)|private (?:video|photos?)|expos\w+|consequences|ruin|or else|otherwise|we have your|will be sent to|goes to your|everyone (?:in|at) your)\b',
    'romance': r'\b(?:handsome|dashing|sweetheart|babe|baby|darling|love|lonely|miss you|attractive|my hero|cute|beautiful|crush|romantic|admire|so different from other)\b',
    'veiled_threat': r'\b(?:it would be (?:a )?(?:shame|unfortunate|sad|bad|terrible) if|would hate (?:for|to see)|(?:or|otherwise|else|unless)\b.{0,50}\b(?:will|gets?|get to|goes?|see|sees|know|find out|receive|go public|be (?:sent|shared|posted|leaked))|go(?:es)? public|make (?:all )?(?:this|it) go away|i (?:saved|kept|recorded|have) (?:every|all|your)\w*|we know about your|do what i say|(?:transfer|pay|send)\b.{0,30}\b(?:by|before) (?:tomorrow|tonight|monday|\d))\b',
    'urgency': r'\b(?:immediately|urgent\w*|within \d+ (?:hours|hrs|minutes)|mandatory|suspend\w*|deactivat\w*|locked|terminated|action required|final notice|on hold|tonight|right now|asap|last chance|expire\w*)\b',
    'credential': r'\b(?:otp|password|passcode|pin|kyc|aadhaar|aadhar|pan|service number|army id|login|log in|sign in|bank account|account number|cvv|card details|credentials|verify|verification|re-verification|update your)\b',
    'admin_lure': r'\b(?:sparsh|echs|pcda|pension\w*|salary|arrears|csd|canteen card|awho|hamraaz|da arrears|posting list|leave rules|cash reward|you have won|prize|lottery|refund)\b',
    'malware': r'\b(?:apk|install\w*|download\w*|enable (?:macros?|content|editing)|macros?|powershell|script|patch|update (?:manually|the app)|sideload\w*|unknown sources|run (?:this|the))\b',
    'media_request': r'\b(?:selfie|photo\w*|pics?|picture\w*|video call|show me|live location|screenshot\w*|camera)\b',
    'personal_probe': r'\b(?:where (?:are|is) (?:you|your)|which (?:unit|regiment|battalion|base|station|post)|what time|daily routine|typical (?:day|week)|your schedule|posted (?:at|in)|going next|moving to|how many)\b',
    'authority': r'\b(?:official\w*|headquarters|hq|commanding officer|signals branch|military secretary|ministry|directorate|cert.?army|adjutant|by order)\b',
}
LEXICON_RE = {k: re.compile(v, re.IGNORECASE) for k, v in LEXICONS.items()}

INDICATOR_NAMES = [
    'log_char_len', 'n_urls', 'suspicious_url', 'trusted_domain', 'dropper_ext',
    'has_phone', 'has_email', 'has_money', 'question_marks', 'exclaims',
    'lx_opsec', 'lx_coercion', 'lx_veiled_threat', 'lx_romance', 'lx_urgency', 'lx_credential',
    'lx_admin_lure', 'lx_malware', 'lx_media_request', 'lx_personal_probe', 'lx_authority',
]


def normalize(text) -> str:
    """Undo common obfuscation; returns readable (cased) canonical text."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    t = unicodedata.normalize('NFKC', text)
    t = _ZERO_WIDTH.sub('', t)
    t = t.translate(_HOMOGLYPHS)
    for pat, rep in _DEFANG:
        t = pat.sub(rep, t)
    # letter-spacing: "p a s s w o r d" -> "password", "S E N D  Y O U R  O T P" -> "SEND YOUR OTP"
    # (runs of 4+ single letters; a gap of 2+ spaces inside the run marks a word break)
    t = _SPACED_LETTERS.sub(lambda m: ' '.join(w.replace(' ', '') for w in re.split(r' {2,}', m.group(0))), t)
    t = _LEET_TOKEN.sub(lambda m: ''.join(_LEET.get(c, c) for c in m.group(0).lower())
                        if not URL_RE.fullmatch(m.group(0)) else m.group(0), t)
    t = re.sub(r'[\r\n\t]+', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def model_text(text) -> str:
    """Text fed to the TF-IDF vectorisers: normalised, lowercased, with entity tokens."""
    t = normalize(text).lower()
    t = DROPPER_RE.sub(' payloadext ', t)
    t = URL_RE.sub(lambda m: ' trustedurl ' if TRUSTED_DOMAIN_RE.search(m.group(0)) else ' urltoken ', t)
    t = EMAIL_RE.sub(' emailtoken ', t)
    t = PHONE_RE.sub(' phonetoken ', t)
    t = MONEY_RE.sub(' moneytoken ', t)
    return re.sub(r'\s+', ' ', t).strip()


def indicator_vector(text) -> list:
    """Numeric indicators in INDICATOR_NAMES order (all roughly in [0, 3])."""
    t = normalize(text)
    urls = URL_RE.findall(t)
    vec = [
        min(len(t), 2000) ** 0.5 / 15.0,
        min(len(urls), 3),
        int(any(SUSPICIOUS_TLD_RE.search(u) or not TRUSTED_DOMAIN_RE.search(u) for u in urls)),
        int(bool(TRUSTED_DOMAIN_RE.search(t))),
        int(bool(DROPPER_RE.search(t))),
        int(bool(PHONE_RE.search(t))),
        int(bool(EMAIL_RE.search(t))),
        int(bool(MONEY_RE.search(t))),
        min(t.count('?'), 3),
        min(t.count('!'), 3),
    ]
    for key in ['opsec', 'coercion', 'veiled_threat', 'romance', 'urgency', 'credential', 'admin_lure',
                'malware', 'media_request', 'personal_probe', 'authority']:
        vec.append(min(len(LEXICON_RE[key].findall(t)), 3))
    return vec


def indicator_matrix(texts):
    """Vectorised indicator features (module-level so sklearn pipelines can pickle it)."""
    import numpy as np
    return np.asarray([indicator_vector(t) for t in texts], dtype=float)


class CyberThreatPreprocessor:
    """Dataset-level preprocessing (xlsx -> cleaned CSV) plus per-message helpers."""

    def clean_text(self, text: str) -> str:
        return model_text(text)

    def extract_features(self, raw_text: str) -> dict:
        t = normalize(raw_text)
        return {
            'char_length': len(t),
            'word_count': len(t.split()),
            'has_url': int(bool(URL_RE.search(t))),
            'has_dropper_ext': int(bool(DROPPER_RE.search(t))),
            'has_opsec_terms': int(bool(LEXICON_RE['opsec'].search(t))),
            'has_coercion_terms': int(bool(LEXICON_RE['coercion'].search(t))),
            'has_honeytrap_terms': int(bool(LEXICON_RE['romance'].search(t))),
            'has_urgency_terms': int(bool(LEXICON_RE['urgency'].search(t))),
        }

    def process_dataset(self, input_file: str, output_csv: str = None) -> pd.DataFrame:
        print(f"[*] Loading raw dataset from: {input_file}")
        if input_file.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(input_file)
        else:
            df = pd.read_csv(input_file)

        df.columns = df.columns.str.strip()
        print(f"[*] Initial record count: {len(df)}")
        df = df.dropna(subset=['raw_text', 'threat_type']).copy()
        df['raw_text'] = df['raw_text'].astype(str).str.strip()
        df['threat_type'] = df['threat_type'].astype(str).str.strip()
        df = df[df['threat_type'].isin(THREAT_CATEGORY_MAP)].copy()

        df['cleaned_text'] = df['raw_text'].apply(self.clean_text)
        feat_df = pd.DataFrame(df['raw_text'].apply(self.extract_features).tolist(), index=df.index)
        for col in feat_df.columns:
            df[col] = feat_df[col]

        df['threat_type_encoded'] = df['threat_type'].map(THREAT_CATEGORY_MAP)
        if 'channel' in df:
            df['channel_encoded'] = df['channel'].map(CHANNEL_MAP).fillna(-1).astype(int)
        if 'defense_domain' in df:
            df['defense_domain_encoded'] = df['defense_domain'].map(DOMAIN_MAP).fillna(-1).astype(int)

        mitigation_lookup = {}
        if 'mitigation_first_aid' in df:
            for threat, group in df.groupby('threat_type'):
                mitigation_lookup[threat] = group['mitigation_first_aid'].iloc[0]

        taxonomy_file = os.path.join(os.path.dirname(os.path.abspath(input_file)), 'threat_taxonomy.json')
        with open(taxonomy_file, 'w', encoding='utf-8') as f:
            json.dump({'threat_categories': THREAT_CATEGORY_MAP, 'channels': CHANNEL_MAP,
                       'domains': DOMAIN_MAP, 'mitigations': mitigation_lookup}, f, indent=2)
        print(f"[+] Exported threat taxonomy to: {taxonomy_file}")

        if output_csv:
            df.to_csv(output_csv, index=False, encoding='utf-8')
            print(f"[+] Saved cleaned dataset to: {output_csv}")
        return df


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    out = CyberThreatPreprocessor().process_dataset(
        os.path.join(here, "defense_cyber_threat_synthetic_dataset.csv.xlsx"),
        os.path.join(here, "cleaned_defense_threat_dataset.csv"))
    print(f"Processed {len(out)} rows; class distribution: {out['threat_type'].value_counts().to_dict()}")
