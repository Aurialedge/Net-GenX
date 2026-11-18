"""
NetGenX Level-1 AI Risk Engine.

Primary path: the two trained heads in models/risk_model.joblib (train.py):
  * category head - LogReg + calibrated LinearSVC ensemble -> WHAT the threat is;
  * severity head - LOW/MEDIUM/HIGH LogReg -> HOW dangerous; the risk score is the
    expected severity over its probabilities.
Hard evidence (payload extensions, disguised executables, look-alike credential
portals, extortion patterns) then sets floors (risk_rules.py).

Resilience chain (the service must always answer):
    saved model  ->  retrain in-process from the dataset  ->  lexicon heuristics
Gemini is an *optional* second opinion for low-confidence cases only, behind a
short timeout and a circuit breaker, so an offline box never stalls.
"""
import json
import os
import re
import threading
import time

import numpy as np

from preprocessor import normalize, indicator_vector, INDICATOR_NAMES
from risk_rules import evidence_adjust_with_notes

TIERS = ("LOW", "MEDIUM", "HIGH")
TIER_SCORE = (5.0, 62.0, 95.0)  # must match train.TIER_SCORE

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(HERE, "models", "risk_model.joblib")
METRICS_PATH = os.path.join(HERE, "models", "metrics.json")

ESCALATION_THRESHOLD = int(os.environ.get("ESCALATION_THRESHOLD", 80))
MAX_TEXT_CHARS = 20000

CATEGORY_NAMES = {
    0: "Benign / Normal Operational Communication",
    1: "Honeytrap & Cyber Espionage Attack",
    2: "Defence Phishing & Credential Harvesting",
    3: "Malicious Payload & Defence Spyware",
    4: "Blackmail, Extortion & Coercion",
    5: "OPSEC Espionage & Reconnaissance",
}

MITIGATIONS = {
    0: [
        "Routine communication. Standard operational security protocols apply.",
        "Ensure sensitive military data is not transmitted over unclassified channels.",
        "Maintain periodic password hygiene on defence portals.",
    ],
    1: [
        "IMMEDIATELY SEVER COMMUNICATION with the suspect contact. Do not reply or block without archiving.",
        "DO NOT SHARE any pictures in uniform, unit deployment details, weapon systems, or station rosters.",
        "IMMEDIATELY ISOLATE the device from defence intranets and Wi-Fi networks.",
        "PRESERVE the full chat history, profile links and phone numbers as evidence before blocking.",
        "REPORT TO MILITARY INTELLIGENCE (MI) Liaison Officer at your station headquarters immediately.",
    ],
    2: [
        "DO NOT CLICK any links, open attachments, or submit Aadhaar/PAN/OTP details.",
        "DO NOT use unverified third-party portals for SPARSH, ECHS, or defence pension services.",
        "Verify all administrative notices solely through official .gov.in or .mil.in websites.",
        "Change credentials immediately for any military or banking accounts potentially exposed.",
        "Report fake URLs to CERT-Army and National Cyber Crime Reporting Portal (NCRP).",
    ],
    3: [
        "DO NOT INSTALL or execute any APKs, executables (.exe), or macro-enabled documents.",
        "Disconnect the infected device from mobile network, Wi-Fi, and Bluetooth immediately.",
        "Perform a full forensic scan using authorized military anti-malware tools.",
        "Hand over the physical device to Station Cyber Security Cell for dynamic sandbox analysis.",
        "Change all master passwords from a separate, uncompromised defence workstation.",
    ],
    4: [
        "DO NOT SUCCUMB to coercion, blackmail, or demands for military documents.",
        "Preserve complete unedited chat histories, phone numbers, and digital evidence.",
        "Disconnect device and report immediately to Station Counter-Intelligence & Provost Marshal.",
        "Do not negotiate or make any financial transfers to the extortionist.",
    ],
    5: [
        "REFUSE DISCLOSURE of equipment, movement, radar locations, weapon systems, or troop strength.",
        "Flag unauthorized inquiry to Military Intelligence (MI) and Station Cyber Cell immediately.",
        "Verify credentials of any alleged defence researcher or defense journalist.",
        "Log caller/sender details for cryptographic tracking on the NetGenX Incident Ledger.",
    ],
}

EXECUTABLE_EXT = (".apk", ".exe", ".scr", ".bat", ".cmd", ".vbs", ".ps1", ".msi", ".jar", ".hta", ".lnk", ".js")
MACRO_EXT = (".docm", ".xlsm", ".pptm")
TEXT_EXT = (".txt", ".csv", ".log", ".json", ".eml", ".md", ".html", ".htm", ".xml")
MEDIA_EXT = (".jpg", ".jpeg", ".png", ".webp", ".heic", ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus",
             ".mp4", ".mkv", ".mov", ".avi", ".webm")


def threat_level(score):
    return "CRITICAL" if score >= 85 else "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW"


class _HeuristicModel:
    """Last-resort classifier used only if no ML model can be loaded or trained."""
    classes_ = np.arange(6)

    def predict_proba(self, texts):
        out = []
        for t in texts:
            v = dict(zip(INDICATOR_NAMES, indicator_vector(t)))
            logits = np.array([
                1.5,
                1.2 * v["lx_romance"] + 0.8 * v["lx_media_request"] + 0.6 * v["lx_personal_probe"],
                1.0 * v["suspicious_url"] + 0.8 * v["lx_credential"] + 0.8 * v["lx_admin_lure"],
                2.5 * v["dropper_ext"] + 0.9 * v["lx_malware"],
                1.6 * v["lx_coercion"],
                1.0 * v["lx_opsec"] + 0.6 * v["lx_personal_probe"],
            ])
            e = np.exp(logits - logits.max())
            out.append(e / e.sum())
        return np.asarray(out)


class _HeuristicTier:
    """Severity fallback: splits the heuristic threat mass evenly over MEDIUM/HIGH."""

    def predict_proba(self, texts):
        p0 = _HeuristicModel().predict_proba(texts)[:, 0]
        return np.stack([p0, (1 - p0) / 2, (1 - p0) / 2], axis=1)


def script_supported(t, min_share=0.5):
    """True if most letters are Latin or Devanagari (the scripts the model was trained on)."""
    import unicodedata
    letters = [ch for ch in t if unicodedata.category(ch).startswith(("L", "M"))]
    if not letters:
        return True  # digits / punctuation / emoji only: the model handles these
    known = sum(ord(ch) < 0x0250 or 0x0900 <= ord(ch) <= 0x097F for ch in letters)
    return known / len(letters) >= min_share


def risk_from_tier_proba(p):
    return float(sum(pi * s for pi, s in zip(p, TIER_SCORE)))


class RiskEngine:
    def __init__(self, model_path=MODEL_PATH):
        self.model_path = model_path
        self.lock = threading.RLock()
        self.pipeline = None
        self.tier_pipeline = None
        self.engine_name = "uninitialised"
        self.model_info = {}
        self._gemini_open_until = 0.0
        self.gemini_key = self._resolve_gemini_key()
        self.gemini_enabled = os.environ.get("NETGENX_ENABLE_GEMINI", "1") != "0"
        self.gemini_model = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
        self.load()

    # ------------------------------------------------------------------ loading
    def load(self):
        with self.lock:
            for attempt in (self._load_saved, self._train_in_process):
                try:
                    pipe, tier, info = attempt()
                    pipe.predict_proba(["health check transmission"])  # smoke test
                    tier.predict_proba(["health check transmission"])
                    self.pipeline, self.tier_pipeline, self.model_info = pipe, tier, info
                    self.engine_name = info.get("engine", "Local ML")
                    print(f"[AI-ENGINE] Level-1 model ready: {self.engine_name} v{info.get('version')}")
                    return True
                except Exception as e:
                    print(f"[AI-ENGINE] model source failed ({attempt.__name__}): {e}")
            self.pipeline, self.tier_pipeline = _HeuristicModel(), _HeuristicTier()
            self.engine_name = "Lexicon Heuristics (degraded)"
            self.model_info = {"version": "fallback", "engine": self.engine_name}
            print("[AI-ENGINE] WARNING: running on heuristic fallback")
            return False

    ENGINE_LABEL = "TF-IDF + LogReg/SVM ensemble + severity model"

    def _load_saved(self):
        import joblib
        import sklearn
        bundle = joblib.load(self.model_path)
        if bundle.get("sklearn_version") != sklearn.__version__:
            raise RuntimeError(f"model built with sklearn {bundle.get('sklearn_version')}, runtime is {sklearn.__version__}")
        if "tier_pipeline" not in bundle:
            raise RuntimeError(f"model v{bundle.get('version')} has no severity head (pre-v4); retraining")
        return bundle["pipeline"], bundle["tier_pipeline"], {
            "version": bundle.get("version"), "trained_at": bundle.get("trained_at"),
            "engine": f"{self.ENGINE_LABEL} (trained)"}

    def _train_in_process(self):
        import train  # retrain from the dataset; slow-ish (~30s) but self-healing
        import augment
        pipe, tier = train.fit_models(train.load_base_dataset(), augment.generate_graded(), 10.0, 10.0)
        try:
            import joblib
            import sklearn
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            joblib.dump({"pipeline": pipe, "tier_pipeline": tier, "version": train.MODEL_VERSION,
                         "sklearn_version": sklearn.__version__, "tier_score": TIER_SCORE,
                         "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S")}, self.model_path + ".tmp")
            os.replace(self.model_path + ".tmp", self.model_path)
        except Exception as e:
            print(f"[AI-ENGINE] could not persist retrained model: {e}")
        return pipe, tier, {"version": train.MODEL_VERSION, "engine": f"{self.ENGINE_LABEL} (self-healed)"}

    def metrics(self):
        try:
            with open(METRICS_PATH, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    # ------------------------------------------------------------------ gemini
    def _resolve_gemini_key(self):
        key = os.environ.get("GEMINI_KEY")
        env_file = os.path.join(HERE, "..", "ipfs", ".env")
        if not key and os.path.exists(env_file):
            try:
                with open(env_file, encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("GEMINI_KEY="):
                            key = line.split("=", 1)[1].strip().strip('"')
            except Exception:
                pass
        return key or None

    def _gemini_second_opinion(self, text):
        if not (self.gemini_key and self.gemini_enabled) or time.time() < self._gemini_open_until:
            return None
        try:
            import requests
            prompt = (
                "You are a military counter-intelligence analyst. Classify the message into exactly one category id: "
                + json.dumps(CATEGORY_NAMES)
                + '. Respond as JSON {"category_id": int, "risk_score": int 0-100, "reasoning": str}.\nMessage: """'
                + text[:4000] + '"""')
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent"
            resp = requests.post(url, params={"key": self.gemini_key}, timeout=4, json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.0, "responseMimeType": "application/json"}})
            resp.raise_for_status()
            data = json.loads(resp.json()["candidates"][0]["content"]["parts"][0]["text"])
            cat = int(data["category_id"])
            if cat not in CATEGORY_NAMES:
                raise ValueError("bad category")
            return {"category_id": cat, "risk_score": max(0, min(100, int(data["risk_score"]))),
                    "reasoning": str(data.get("reasoning", ""))[:500]}
        except Exception as e:
            self._gemini_open_until = time.time() + 300  # circuit breaker: back off 5 min
            print(f"[AI-ENGINE] Gemini second opinion unavailable ({type(e).__name__}); breaker open for 5 min")
            return None

    # ------------------------------------------------------------------ scoring
    def analyze_text(self, text):
        raw = (text or "")[:MAX_TEXT_CHARS]
        t = normalize(raw)
        if not t:
            return self._build(0, np.eye(6)[0], 2.0, "Empty input provided.", [])
        if not script_supported(t):
            # The model has only seen Latin and Devanagari text; on other scripts its output is
            # noise. Score from language-independent hard evidence only and say so plainly.
            cat, score, notes = evidence_adjust_with_notes(t, 0, 10.0)
            notes.append("language/script not supported by the AI model, so only links, attachments and "
                         "credential requests were checked; submit an English or Hindi translation for full analysis")
            out = self._build(cat, np.full(6, 1 / 6), score, t, notes, self.engine_name + " (script not supported)")
            out["language_supported"] = False
            return out
        with self.lock:
            pipe, tier = self.pipeline, self.tier_pipeline
        try:
            proba = pipe.predict_proba([t])[0]
            tier_p = tier.predict_proba([t])[0]
            engine = self.engine_name
        except Exception as e:  # model corrupted at runtime -> heuristic for this call, reload in background
            print(f"[AI-ENGINE] inference failed: {e}; using heuristic fallback")
            proba = _HeuristicModel().predict_proba([t])[0]
            tier_p = _HeuristicTier().predict_proba([t])[0]
            engine = "Lexicon Heuristics (degraded)"
            threading.Thread(target=self.load, daemon=True).start()

        score = risk_from_tier_proba(tier_p)
        cat = int(np.argmax(proba))
        if score >= 40 and cat == 0:  # severity head says risky: name the most likely threat
            cat = int(np.argmax(proba[1:]) + 1)
        cat, score, notes = evidence_adjust_with_notes(t, cat, score)

        reasoning = None
        if max(tier_p) < 0.55 and 30 <= score <= 85:  # genuinely ambiguous -> optional LLM second opinion
            g = self._gemini_second_opinion(t)
            if g:
                score = 0.5 * score + 0.5 * g["risk_score"]
                cat = g["category_id"] if g["risk_score"] >= 40 or cat == 0 else cat
                reasoning = g["reasoning"]
                engine += " + Gemini second opinion"
        if score < 40:
            cat = 0
        out = self._build(cat, proba, score, t, notes, engine, reasoning)
        out["severity_probabilities"] = {k: round(float(p), 4) for k, p in zip(TIERS, tier_p)}
        return out

    def analyze_batch(self, texts):
        """Vectorised Level-1 scoring for many messages (conversation analysis / training).

        Same model, consistency rules and evidence floors as analyze_text, minus the optional
        Gemini second opinion. Returns dicts: score, category_id, proba (6), tier_p (3), notes.
        """
        norm = [normalize((t or "")[:MAX_TEXT_CHARS]) for t in texts]
        out = [None] * len(norm)
        idx = [i for i, t in enumerate(norm) if t and script_supported(t)]
        if idx:
            with self.lock:
                pipe, tier = self.pipeline, self.tier_pipeline
            batch = [norm[i] for i in idx]
            try:
                P, T = pipe.predict_proba(batch), tier.predict_proba(batch)
            except Exception:
                P, T = _HeuristicModel().predict_proba(batch), _HeuristicTier().predict_proba(batch)
            for j, i in enumerate(idx):
                proba, tier_p = P[j], T[j]
                score = risk_from_tier_proba(tier_p)
                cat = int(np.argmax(proba))
                if score >= 40 and cat == 0:
                    cat = int(np.argmax(proba[1:]) + 1)
                cat, score, notes = evidence_adjust_with_notes(norm[i], cat, score)
                out[i] = {"score": float(score), "category_id": 0 if score < 40 else cat,
                          "proba": proba, "tier_p": tier_p, "notes": notes}
        for i, t in enumerate(norm):
            if out[i] is None:  # empty or unsupported script: evidence rules only
                cat, score, notes = evidence_adjust_with_notes(t, 0, 2.0 if not t else 10.0)
                out[i] = {"score": float(score), "category_id": cat, "proba": np.full(6, 1 / 6),
                          "tier_p": np.array([1.0, 0.0, 0.0]), "notes": notes}
        return out

    def _build(self, cat, proba, score, raw, notes, engine=None, reasoning=None):
        score = int(round(max(0.0, min(100.0, score))))
        title = CATEGORY_NAMES[cat]
        conf = float(proba[cat]) if cat < len(proba) else float(max(proba))
        details = f"Level-1 risk engine: {title} (model confidence {conf * 100:.1f}%)."
        if notes:
            details += " Hard evidence: " + "; ".join(notes) + "."
        if reasoning:
            details += f" LLM analyst: {reasoning}"
        return {
            "status": True,
            "category_id": cat,
            "final_prediction": title,
            "final_confidence": round(conf * 100, 1),
            "final_risk_score": score,
            "threat_type": title.split("&")[0].strip(),
            "threat_level": threat_level(score),
            "details": details,
            "mitigation_steps": MITIGATIONS[cat] if score >= 40 or cat == 0 else MITIGATIONS[0],
            "escalate_cert_army": score >= ESCALATION_THRESHOLD,
            "escalation_threshold": ESCALATION_THRESHOLD,
            "class_probabilities": {CATEGORY_NAMES[i].split(" ")[0].strip("/,"): round(float(p), 4) for i, p in enumerate(proba)},
            "analysis_engine": engine or self.engine_name,
        }

    # ------------------------------------------------------------------ files
    @staticmethod
    def sniff_file(filename, content):
        """Magic-byte inspection: catches executables disguised with harmless extensions."""
        name = (filename or "").lower()
        head = content[:8]
        findings = []
        if head[:2] == b"MZ":
            findings.append(("windows_executable", 3, 97))
        elif head[:4] == b"\x7fELF":
            findings.append(("linux_executable", 3, 95))
        elif head[:4] == b"PK\x03\x04":
            window = content[:200000]
            if b"AndroidManifest.xml" in window or b"classes.dex" in window:
                findings.append(("android_apk_package", 3, 96))
            elif b"vbaProject.bin" in window:
                findings.append(("office_document_with_vba_macros", 3, 92))
        elif head[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" and (b"VBA" in content[:500000] or b"Macros" in content[:500000]):
            findings.append(("legacy_office_with_macros", 3, 90))
        elif head[:4] == b"%PDF":
            window = content[:2_000_000]
            if any(k in window for k in (b"/JavaScript", b"/JS ", b"/Launch", b"/EmbeddedFile")):
                findings.append(("pdf_with_active_content", 3, 85))
        if name.endswith(EXECUTABLE_EXT):
            findings.append(("executable_extension", 3, 95))
        elif name.endswith(MACRO_EXT):
            findings.append(("macro_enabled_document", 3, 92))
        if re.search(r"\.(?:pdf|docx?|jpe?g|png|txt)\.(?:exe|scr|apk|bat|js|vbs)$", name):
            findings.append(("double_extension_masquerade", 3, 98))
        if findings and findings[0][0].endswith(("executable", "apk_package")) and not name.endswith(EXECUTABLE_EXT):
            findings.append(("extension_content_mismatch", 3, 98))
        return findings

    def extract_text(self, filename, content, mime_type=""):
        name = (filename or "").lower()
        if name.endswith(TEXT_EXT) or mime_type.startswith("text"):
            return content[:MAX_TEXT_CHARS * 4].decode("utf-8", errors="ignore")
        if name.endswith(MEDIA_EXT) or mime_type.startswith(("image", "audio", "video")):
            return ""  # no OCR / ASR on this box; provenance handled by shield layer 3
        # generic binary (pdf/docx...): pull printable runs as a best-effort text sample
        runs = re.findall(rb"[\x20-\x7e]{6,}", content[:2_000_000])
        return b" ".join(runs)[:MAX_TEXT_CHARS].decode("ascii", errors="ignore")

    def analyze_file(self, filename, content, mime_type=""):
        findings = self.sniff_file(filename, content)
        text = self.extract_text(filename, content, mime_type)
        base = self.analyze_text(text) if text.strip() else self._build(
            0, np.eye(6)[0], 10.0, filename, ["media content not transcribed; metadata/provenance checked by Counter-Intel layer 3"])
        if findings:
            top = max(findings, key=lambda f: f[2])
            if top[2] > base["final_risk_score"]:
                base = self._build(3, np.eye(6)[3] * 0.97 + 0.005, top[2], filename,
                                   [f"{f[0]}" for f in findings])
        base["file_findings"] = [f[0] for f in findings]
        base["file_name"] = filename
        base["text_extracted_chars"] = len(text)
        return base


detector = RiskEngine()
