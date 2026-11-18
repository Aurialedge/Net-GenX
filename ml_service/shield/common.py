"""Shared helpers for the Counter-Intelligence Shield layers."""
import json
import os
import re
import threading
import time

STATE_DIR = os.environ.get(
    "NETGENX_STATE_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "state"))


def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, float(x)))


def noisy_or(probs):
    """Combine independent evidence in [0,1]: any strong signal dominates."""
    out = 1.0
    for p in probs:
        out *= (1.0 - max(0.0, min(1.0, p)))
    return 1.0 - out


def layer_result(layer, name, score, signals=None, details=None, verdict=None, confidence=0.7, status="ok"):
    score = round(clamp(score), 1)
    if verdict is None:
        verdict = "THREAT" if score >= 70 else "SUSPICIOUS" if score >= 40 else "CLEAR"
    return {
        "layer": layer,
        "name": name,
        "score": score,
        "verdict": verdict,
        "confidence": round(clamp(confidence * 100) / 100, 2),
        "signals": signals or [],
        "details": details or {},
        "status": status,
    }


def count_matches(pattern, text):
    return len(pattern.findall(text))


def rx(*alternatives):
    return re.compile(r"(?:" + "|".join(alternatives) + r")", re.IGNORECASE)


class JsonStore:
    """Tiny thread-safe JSON persistence with atomic writes and corruption recovery."""

    def __init__(self, filename, default):
        self.path = os.path.join(STATE_DIR, filename)
        self.default = default
        self.lock = threading.RLock()
        self._last_save = 0.0
        self.data = self._load()

    def _load(self):
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return json.loads(json.dumps(self.default))
        except Exception as e:  # corrupt file: keep a copy for forensics, start fresh
            try:
                os.replace(self.path, f"{self.path}.corrupt-{int(time.time())}")
            except Exception:
                pass
            print(f"[SHIELD] state file {self.path} unreadable ({e}); reinitialised")
            return json.loads(json.dumps(self.default))

    def save(self, force=False):
        with self.lock:
            now = time.time()
            if not force and now - self._last_save < 1.0:
                return  # coalesce bursts of writes
            try:
                os.makedirs(STATE_DIR, exist_ok=True)
                tmp = self.path + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(self.data, f)
                os.replace(tmp, self.path)
                self._last_save = now
            except Exception as e:  # persistence is best-effort; analysis must not fail
                print(f"[SHIELD] could not persist {self.path}: {e}")
