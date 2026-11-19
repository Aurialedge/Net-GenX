"""
NetGenX 5-Layer Counter-Intelligence Shield - orchestration & fusion.

    L1 Intent & Elicitation       what is the counterpart trying to obtain, and how
    L2 Threat Graph Clustering    is this part of a wider campaign / bot farm
    L3 Synthetic Artifact         is the text / media machine-generated
    L4 Zero-Trust OPSEC Perimeter does the requested / disclosed data exceed earned trust
    L5 Multi-Turn Trajectory      is the conversation following a grooming kill chain

Every layer runs in isolation: an exception in one layer marks it "degraded"
and the remaining layers still produce a verdict (fail-safe, not fail-open:
if *every* layer fails we return a cautious MEDIUM rather than CLEAR).
"""
import traceback

import numpy as np

from . import intent as L1
from . import synthetic as L3
from . import zero_trust as L4
from .common import layer_result, noisy_or
from .threat_graph import ThreatGraph
from .trajectory import TrajectoryTracker, turn_stage

LAYER_WEIGHTS = {1: 0.85, 2: 0.8, 4: 0.85, 5: 0.95}

ACTIONS = {
    "intent": "Do not answer: the counterpart is eliciting {targets}. Reply only via official channels, if at all.",
    "graph": "Contact is linked to threat cluster {cluster} ({size} messages). Block shared indicators and report the cluster to CERT-Army.",
    "synthetic": "Treat this persona as a possible AI-driven bot: demand live verification through an official, out-of-band channel.",
    "synthetic_media": "Media carries AI-generation markers - do not trust it as evidence of identity; preserve it for forensic analysis.",
    "zt_block": "Zero-Trust policy: BLOCK - {reason}.",
    "zt_verify": "Zero-Trust policy: verify the requester's identity out-of-band before any response.",
    "dlp": "Outbound message withheld: it contains {items}. Send the redacted version or use the secure military network.",
    "trajectory": "Conversation shows a grooming progression ({path}). Disengage, preserve the full chat and report to the Unit Security Officer / MI.",
}


def _safe(layer_no, name, fn, *a, **kw):
    try:
        return fn(*a, **kw)
    except Exception as e:
        print(f"[SHIELD] layer {layer_no} ({name}) failed: {e}\n{traceback.format_exc(limit=3)}")
        return layer_result(layer_no, name, 0, [f"layer_error:{type(e).__name__}"], {"error": str(e)},
                            verdict="DEGRADED", confidence=0.0, status="degraded")


RAG_CATEGORY_WEIGHT = 0.5  # chosen on the dev half of data/eval_conversations_100.json


def _conversation_category(contact, rag_vote=None):
    """Threat type of the whole chat: category probabilities weighted by each message's risk,
    blended with the threat types of the most similar known conversations (RAG)."""
    w = np.zeros(6)
    for t in contact:
        w += (t["l1"]["score"] / 100.0) ** 2 * np.asarray(t["l1"]["proba"])
    w = w[1:] / max(1e-9, w[1:].sum())
    if rag_vote is not None:
        v = np.asarray(rag_vote, dtype=float)[1:]
        w = w + RAG_CATEGORY_WEIGHT * v / max(1e-9, v.sum())
    return int(np.argmax(w) + 1)


def _evidence_category(contact, conv_rules):
    """Category of the strongest hard-evidence rule, if any fired."""
    best = (0.0, None)
    for cat, floor, _ in conv_rules:
        best = max(best, (float(floor), cat), key=lambda x: x[0])
    for t in contact:
        if t["l1"]["notes"] and t["l1"]["score"] > best[0]:
            best = (t["l1"]["score"], t["l1"]["category_id"])
    return best[1]


class CounterIntelShield:
    def __init__(self, level1_engine, seed_rows=None):
        self.level1 = level1_engine
        try:
            self.graph = ThreatGraph(seed_rows)
        except Exception as e:  # run without the graph rather than not at all
            print(f"[SHIELD] threat graph unavailable: {e}")
            self.graph = None
        try:
            self.tracker = TrajectoryTracker()
        except Exception as e:
            print(f"[SHIELD] trajectory store unavailable: {e}")
            self.tracker = None
        self._stateless_tracker = TrajectoryTracker.__new__(TrajectoryTracker)  # _score needs no store
        try:  # learned fusion for chat histories (train_conversation.py); rules are the fallback
            from conversation_model import ConversationModel
            self.conv_model = ConversationModel()
        except Exception as e:
            print(f"[SHIELD] conversation model unavailable: {e}")
            self.conv_model = None
        self.case_store = None
        if self.conv_model is not None and self.conv_model.kb is not None:  # replay analyst-confirmed RAG cases
            from rag import CaseStore
            from .common import STATE_DIR
            self.case_store = CaseStore(STATE_DIR)
            for case in self.case_store.load():
                try:
                    self.conv_model.kb.add_case(case["turns"], case["tier"], case["category"], case.get("source", "analyst"))
                except Exception as e:
                    print(f"[SHIELD] skipped stored RAG case: {e}")

    def add_rag_case(self, messages, tier, category, source="analyst"):
        """Add an analyst-confirmed conversation to the RAG knowledge base and persist it."""
        if self.case_store is None:
            raise RuntimeError("RAG knowledge base unavailable")
        turns = [{"role": "user" if m.get("role") == "user" else "contact", "text": str(m.get("text") or "")}
                 for m in messages if str(m.get("text") or "").strip()]
        n = self.conv_model.kb.add_case(turns, tier, category, source)
        self.case_store.append({"turns": turns, "tier": tier, "category": category, "source": source})
        return n

    # ------------------------------------------------------------------
    def analyze_message(self, text, *, sender=None, recipient=None, channel=None, session_id=None,
                        direction="inbound", role=None, timestamp=None, sender_domain=None,
                        verified_contact=False, level1=None, record=True):
        text = text or ""
        role = role or ("user" if direction == "outbound" else "contact")
        if level1 is None:
            level1 = self.level1.analyze_text(text)
        l1_view = {"score": level1.get("final_risk_score", 0), "category_id": level1.get("category_id", 0)}

        intent = _safe(1, "Intent & Elicitation", L1.analyze, text)
        if self.graph and direction == "inbound":
            graph = _safe(2, "Threat Graph Clustering", self.graph.analyze, text, sender=sender, recipient=recipient,
                          level1_score=l1_view["score"], record=record)
        else:
            graph = layer_result(2, "Threat Graph Clustering", 0,
                                 ["outbound_message_not_graphed" if direction == "outbound" else "graph_store_unavailable"],
                                 verdict="SKIPPED", confidence=0.0,
                                 status="ok" if direction == "outbound" else "degraded")
        synth = _safe(3, "Synthetic Artifact Detection", L3.analyze_text, text)
        zt = _safe(4, "Zero-Trust OPSEC Perimeter", L4.analyze, text, direction=direction, sender=sender,
                   sender_domain=sender_domain, channel=channel, verified_contact=verified_contact)
        stage = turn_stage(intent, l1_view) if role != "user" else 0
        conv_key = session_id or (f"sender:{sender}" if sender else None)
        if self.tracker and conv_key:
            traj = _safe(5, "Multi-Turn Trajectory", self.tracker.record_and_analyze, conv_key, text, role=role,
                         stage=stage, risk=max(l1_view["score"], intent["score"]),
                         synthetic=synth["score"] if synth["verdict"] != "INCONCLUSIVE" else None,
                         ts=timestamp, record=record)
        else:
            traj = layer_result(5, "Multi-Turn Trajectory", 0, ["no_session_id_or_sender_supplied"],
                                {"hint": "pass session_id (or sender) to enable multi-turn tracking"},
                                verdict="INSUFFICIENT_HISTORY", confidence=0.0)
        return self._fuse([intent, graph, synth, zt, traj], level1, direction)

    def analyze_conversation(self, messages, *, channel=None, sender=None, sender_domain=None, verified_contact=False):
        """Stateless analysis of a full transcript: [{text, role: contact|user, ts?}]"""
        from conversation_model import build_turns_batch, featurize
        from risk_rules import conversation_evidence, trajectory_evidence
        msgs = [{"text": str(m.get("text") or m.get("message") or ""), "role": m.get("role", "contact"), "ts": m.get("ts")}
                for m in messages]
        try:
            turns_full = build_turns_batch(self.level1, [msgs])[0]
        except Exception as e:
            return {"status": False, "error": f"could not score conversation: {e}"}
        contact = [t for t in turns_full if t["role"] == "contact"]
        if not contact:
            return {"status": False, "error": "conversation contains no contact messages"}

        turns, per_turn = [], []
        for t in turns_full:
            if t["role"] == "user":
                turns.append({"role": "user", "stage": 0, "risk": 0, "text": t["text"], "ts": t["ts"]})
                continue
            synth = _safe(3, "Synthetic Artifact Detection", L3.analyze_text, t["text"])
            risk = max(t["l1"]["score"], t["intent"]["score"])
            turns.append({"role": "contact", "stage": t["stage"], "risk": risk, "text": t["text"], "ts": t["ts"],
                          "syn": synth["score"] if synth["verdict"] != "INCONCLUSIVE" else None})
            per_turn.append({"text": t["text"][:160], "level1_risk": round(t["l1"]["score"]),
                             "level1_category": t["l1"]["category_id"], "intent": t["intent"]["details"].get("primary_intent"),
                             "stage": t["stage"], "synthetic": synth["score"]})
        peak = max(contact, key=lambda t: t["l1"]["score"])
        last = contact[-1]
        peak_level1 = self.level1.analyze_text(peak["text"])  # full report for the most dangerous message
        traj = _safe(5, "Multi-Turn Trajectory", self._stateless_tracker.analyze_transcript, turns)
        all_contact = " ".join(t["text"] for t in contact)
        # transcript-level stylometry is far more reliable than a single message
        synth = _safe(3, "Synthetic Artifact Detection", L3.analyze_text, all_contact)
        graph = _safe(2, "Threat Graph Clustering", self.graph.analyze, all_contact, sender=sender, record=False,
                      level1_score=peak["l1"]["score"]) if self.graph else layer_result(
            2, "Threat Graph Clustering", 0, ["graph_store_unavailable"], verdict="SKIPPED", status="degraded")
        zt = _safe(4, "Zero-Trust OPSEC Perimeter", L4.analyze, all_contact, direction="inbound", sender=sender,
                   sender_domain=sender_domain, channel=channel, verified_contact=verified_contact)
        fused = self._fuse([last["intent"], graph, synth, zt, traj], peak_level1, "inbound")
        fused["level1_peak"] = peak_level1
        fused["turns"] = per_turn

        if self.conv_model is not None and self.conv_model.ready:
            conv_rules = conversation_evidence([t["text"] for t in contact]) + trajectory_evidence(turns_full)
            try:
                # ConvoSentinel stages 1-2: flag SI requests, retrieve similar known cases for each
                retrieved = self.conv_model.kb.analyze_batch([turns_full], explain=True)[0]
                fused["rag"] = retrieved.get("evidence")
                score, tier_p = self.conv_model.predict(featurize(turns_full, zt["score"], synth["score"], retrieved["features"]))
                fused["conversation_model"] = {
                    "score": round(score, 1),
                    "tier_probabilities": {k: round(float(v), 4) for k, v in zip(("LOW", "MEDIUM", "HIGH"), tier_p)},
                    "evidence_floor": max([0.0] + [t["l1"]["score"] for t in contact if t["l1"]["notes"]]
                                          + [floor for _, floor, _ in conv_rules]),
                    "evidence_notes": sorted({n for t in contact for n in t["l1"]["notes"]} | {note for _, _, note in conv_rules}),
                    "evidence_category": _evidence_category(contact, conv_rules),
                    "conversation_category": _conversation_category(contact, retrieved["category_vote"]),
                    "version": self.conv_model.info.get("version"),
                    "trained_on": self.conv_model.info.get("n_train"),
                }
            except Exception as e:
                print(f"[SHIELD] conversation model failed: {e}; using rule-based fusion")
        return fused

    def analyze_media(self, filename, content, mime_type=""):
        return _safe(3, "Synthetic Artifact Detection", L3.analyze_media, filename, content, mime_type)

    def clusters(self, **kw):
        return self.graph.clusters(**kw) if self.graph else []

    # ------------------------------------------------------------------
    def _fuse(self, layers, level1, direction):
        by = {l["layer"]: l for l in layers}
        ok = [l for l in layers if l["status"] == "ok"]
        s = {k: (by[k]["score"] if by[k]["status"] == "ok" else 0.0) for k in by}
        l1_score = float(level1.get("final_risk_score", 0))

        # Synthetic style is an amplifier: an AI-polished *benign* email is fine,
        # an AI-polished elicitation attempt is the humanised-bot threat model.
        hostile_context = max(s[1], s[5], l1_score) / 100
        bot_likelihood = (s[3] / 100) * hostile_context
        # Below 25 a layer score is noise; above it, evidence grows linearly. This stops several
        # weak, unrelated signals from compounding into a false HIGH via noisy-OR.
        evidence = [LAYER_WEIGHTS[k] * max(0.0, (s[k] - 25) / 75) for k in LAYER_WEIGHTS] + [0.7 * bot_likelihood]
        ci = 100 * noisy_or(evidence)
        if not ok:
            ci = 50.0  # fail-safe: every layer degraded -> never report CLEAR

        humanised_bot = s[3] >= 55 and hostile_context >= 0.5
        verdict = ("HOSTILE" if ci >= 80 else "HIGH_RISK" if ci >= 60 else "SUSPICIOUS" if ci >= 40 else "CLEAR")

        actions = []
        d1 = by[1]["details"]
        if s[1] >= 40 and d1.get("targeted_information"):
            actions.append(ACTIONS["intent"].format(targets=", ".join(d1["targeted_information"])))
        if s[2] >= 50:
            actions.append(ACTIONS["graph"].format(cluster=by[2]["details"].get("cluster_id"),
                                                   size=by[2]["details"].get("cluster_size")))
        if humanised_bot:
            actions.append(ACTIONS["synthetic"])
        d4 = by[4]["details"]
        if direction == "outbound" and d4.get("policy_decision") == "BLOCK":
            actions.append(ACTIONS["dlp"].format(items=", ".join(d4.get("sensitive_data_found", {}))))
        elif d4.get("policy_decision") == "BLOCK":
            actions.append(ACTIONS["zt_block"].format(reason="; ".join(by[4]["signals"][:3])))
        elif d4.get("policy_decision") == "VERIFY_OUT_OF_BAND":
            actions.append(ACTIONS["zt_verify"])
        if by[5]["verdict"] == "GROOMING_TRAJECTORY":
            path = " -> ".join(by[5]["details"].get("kill_chain_path", []))
            actions.append(ACTIONS["trajectory"].format(path=path))

        return {
            "counter_intel_score": round(ci, 1),
            "verdict": verdict,
            "humanised_ai_bot_suspected": humanised_bot,
            "humanised_bot_likelihood": round(100 * bot_likelihood, 1),
            "primary_intent": d1.get("primary_intent"),
            "policy_decision": d4.get("policy_decision"),
            "redacted_message": d4.get("redacted_message"),
            "layers": layers,
            "degraded_layers": [l["name"] for l in layers if l["status"] != "ok"],
            "recommended_actions": actions,
        }
