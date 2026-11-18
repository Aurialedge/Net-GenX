"""
Layer 5 - Multi-Turn Trajectory Analysis.

A humanised AI bot is patient: turn 1 is "Hi, how are you?", turn 4 is
flattery, turn 9 is "which unit are you in?", turn 14 is the APK or the
blackmail. Every single message passes a per-message filter; the *trajectory*
is what betrays it.

Each conversation (session_id, or sender when absent) keeps a bounded turn
history. We map every contact turn onto the social-engineering kill chain

    0 CONTACT -> 1 RAPPORT -> 2 TRUST/ISOLATION -> 3 ELICITATION -> 4 EXPLOITATION

and score: furthest stage reached, how monotonically it advanced, the risk
slope across turns, topic drift from personal to military, persistence after
the user refuses, and machine-like reply cadence / 24x7 availability.
"""
import re
import statistics
import time

from .common import JsonStore, layer_result, rx

STAGES = ["CONTACT", "RAPPORT", "TRUST_ISOLATION", "ELICITATION", "EXPLOITATION"]
MAX_TURNS = 60
MAX_SESSIONS = 2000
REFUSAL_RE = rx(r"\b(?:can'?t (?:tell|share|say)|cannot (?:share|disclose)|not allowed|classified|i won'?t (?:share|send)|no,? sorry|not possible|why do you (?:want|need|ask))\b")
OPSEC_TOPIC_RE = rx(r"\b(?:unit|regiment|battalion|post|base|deploy\w*|border|convoy|weapon\w*|radar|missile\w*|troops?|patrol\w*|duty|roster|location|stationed|posted|frequenc\w+)\b")


def turn_stage(intent_layer, level1):
    d = intent_layer.get("details", {})
    intent = d.get("primary_intent", "benign_social")
    tech = set(d.get("techniques", {}))
    targets = set(d.get("targeted_information", {}))
    if intent in ("coercion", "payload_delivery", "credential_theft") or level1.get("category_id") in (2, 3, 4) and level1.get("score", 0) >= 70:
        return 4
    if targets and d.get("is_information_request"):
        return 3
    if tech & {"secrecy_request", "channel_shift", "sympathy_hook", "quid_pro_quo"}:
        return 2
    if tech & {"flattery", "rapport_building"} or level1.get("category_id") == 1:
        return 1
    return 0


class TrajectoryTracker:
    def __init__(self):
        self.store = JsonStore("trajectories.json", {"sessions": {}})

    def reset(self, session_id):
        with self.store.lock:
            self.store.data["sessions"].pop(str(session_id), None)
            self.store.save(force=True)

    def record_and_analyze(self, session_id, text, role="contact", stage=0, risk=0.0, synthetic=None, ts=None, record=True):
        ts = float(ts) if ts else time.time()
        with self.store.lock:
            sessions = self.store.data["sessions"]
            turns = list(sessions.get(str(session_id), []))
            turn = {"ts": ts, "role": role, "stage": int(stage), "risk": round(float(risk), 1),
                    "opsec": bool(OPSEC_TOPIC_RE.search(text or "")), "refusal": bool(REFUSAL_RE.search(text or "")),
                    "syn": synthetic}
            turns.append(turn)
            turns = turns[-MAX_TURNS:]
            if record:
                sessions[str(session_id)] = turns
                if len(sessions) > MAX_SESSIONS:
                    for k in sorted(sessions, key=lambda k: sessions[k][-1]["ts"])[: len(sessions) - MAX_SESSIONS]:
                        sessions.pop(k, None)
                self.store.save()
        return self._score(turns)

    def analyze_transcript(self, turns):
        """Stateless: turns = [{"role","stage","risk","text","ts","syn"}...]."""
        prepared = [{"ts": t.get("ts") or i * 60.0, "role": t.get("role", "contact"), "stage": t["stage"],
                     "risk": t["risk"], "opsec": bool(OPSEC_TOPIC_RE.search(t.get("text", ""))),
                     "refusal": bool(REFUSAL_RE.search(t.get("text", ""))), "syn": t.get("syn")}
                    for i, t in enumerate(turns)]
        return self._score(prepared)

    def _score(self, turns):
        contact = [t for t in turns if t["role"] != "user"]
        n = len(contact)
        if n < 2:
            return layer_result(5, "Multi-Turn Trajectory", contact[0]["risk"] * 0.3 if contact else 0,
                                ["single_turn_no_trajectory_yet"],
                                {"turns_observed": n, "stage_reached": STAGES[contact[0]["stage"]] if contact else "CONTACT"},
                                verdict="INSUFFICIENT_HISTORY", confidence=0.2)

        stages = [t["stage"] for t in contact]
        risks = [t["risk"] for t in contact]
        max_stage = max(stages)
        # monotonic progression: share of steps that do not go backwards
        mono = sum(1 for a, b in zip(stages, stages[1:]) if b >= a) / (n - 1)
        # least-squares slope of risk per turn
        xs = list(range(n))
        mx, my = statistics.mean(xs), statistics.mean(risks)
        slope = sum((x - mx) * (y - my) for x, y in zip(xs, risks)) / max(1e-9, sum((x - mx) ** 2 for x in xs))
        half = n // 2
        early = sum(t["opsec"] for t in contact[:half]) / max(1, half)
        late = sum(t["opsec"] for t in contact[half:]) / max(1, n - half)
        drift = late - early
        # persistence: contact keeps probing after a user refusal
        persistence = 0
        refused = False
        for t in turns:
            if t["role"] == "user" and t["refusal"]:
                refused = True
            elif t["role"] != "user" and refused and t["stage"] >= 3:
                persistence += 1
        # cadence: bot-like regular reply latency / round-the-clock activity
        gaps = [b["ts"] - a["ts"] for a, b in zip(contact, contact[1:]) if b["ts"] > a["ts"]]
        cadence_cv = statistics.pstdev(gaps) / statistics.mean(gaps) if len(gaps) >= 4 and statistics.mean(gaps) > 0 else None
        hours = {time.localtime(t["ts"]).tm_hour for t in contact} if contact[0]["ts"] > 1e9 else set()
        syn = [t["syn"] for t in contact if t.get("syn") is not None]
        syn_mean = statistics.mean(syn) if syn else None

        path, peak = [], -1
        for s_ in stages:  # furthest stage reached so far, in order
            if s_ > peak:
                peak = s_
                path.append(STAGES[s_])
        signals, ev = [], []
        stage_ev = {0: 0, 1: 15, 2: 35, 3: 60, 4: 85}[max_stage]
        ev.append(stage_ev)
        if max_stage >= 2 and mono >= 0.7 and stages[-1] > stages[0]:
            signals.append(f"kill_chain_progression:{'->'.join(path)}")
            ev.append(stage_ev + 15)
        # a rising slope only counts if the conversation actually *reaches* suspicious territory:
        # benign chatter drifting from 6 to 39 is noise, not escalation
        late_peak = max(risks[-max(1, n // 3):])
        if slope > 4 and n >= 3 and late_peak >= 50:
            signals.append(f"escalating_risk(+{slope:.1f}/turn)")
            ev.append(min(95, 45 + 4 * slope))
        if drift >= 0.4:
            signals.append(f"topic_drift_personal_to_military({drift:.0%})")
            ev.append(55 + 30 * drift)
        if persistence:
            signals.append(f"persistent_probing_after_refusal x{persistence}")
            ev.append(80 + min(15, 5 * persistence))
        if cadence_cv is not None and cadence_cv < 0.25:
            signals.append(f"machine_regular_reply_cadence(cv={cadence_cv:.2f})")
            ev.append(55)
        if len(hours) >= 16:
            signals.append(f"active_{len(hours)}_distinct_hours(24x7_persona)")
            ev.append(50)
        if syn_mean is not None and syn_mean >= 60 and len(syn) >= 3:
            signals.append(f"consistently_synthetic_style(avg={syn_mean:.0f})")
            ev.append(min(90, syn_mean) if max_stage >= 2 else 40)
        score = max(ev)
        if len([e for e in ev if e >= 50]) >= 3:
            score = min(100, score + 8)  # corroborating signals

        verdict = ("GROOMING_TRAJECTORY" if max_stage >= 3 and score >= 60 else
                   "ESCALATING" if score >= 40 else "STABLE")
        return layer_result(
            5, "Multi-Turn Trajectory", score, signals,
            {"turns_observed": n, "stage_reached": STAGES[max_stage], "stage_sequence": [STAGES[s] for s in stages], "kill_chain_path": path,
             "monotonicity": round(mono, 2), "risk_slope_per_turn": round(slope, 2), "military_topic_drift": round(drift, 2),
             "probing_after_refusal": persistence, "reply_cadence_cv": round(cadence_cv, 3) if cadence_cv is not None else None,
             "mean_synthetic_score": round(syn_mean, 1) if syn_mean is not None else None},
            verdict=verdict, confidence=min(0.9, 0.35 + 0.08 * n))
