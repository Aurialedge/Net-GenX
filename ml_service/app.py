"""
NetGenX AI service - Level-1 risk engine + Level-2 5-layer Counter-Intelligence Shield.

Endpoints
  GET  /health                 liveness + model / shield status
  POST /predict                (backwards compatible) message or file -> fused risk report
  POST /shield/analyze         full 5-layer analysis of one message (JSON)
  POST /shield/conversation    stateless analysis of a whole transcript
  POST /shield/outbound        zero-trust DLP check of a reply before it is sent
  GET  /shield/clusters        threat-graph campaign clusters
  DELETE /shield/session/<id>  forget a conversation's trajectory
  GET  /model/metrics          training / held-out evaluation report
  POST /model/reload           reload (or self-heal retrain) the model - localhost or ADMIN_TOKEN
  GET  /threat_intel           advisories
"""
import os
import re
import sys
import time
import traceback

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from model import detector, CATEGORY_NAMES, threat_level, ESCALATION_THRESHOLD, MITIGATIONS
from shield import CounterIntelShield
from transcript import parse_transcript, to_conversation

MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", 50))
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")
STARTED = time.time()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
CORS(app, resources={r"/*": {"origins": "*"}})


def _seed_rows():
    """Known-malicious IOCs from the training dataset seed the threat graph."""
    try:
        import pandas as pd
        df = pd.read_csv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cleaned_defense_threat_dataset.csv"))
        df = df.drop_duplicates("raw_text")
        return [(str(t), 90 if int(l) > 0 else 5) for t, l in zip(df["raw_text"], df["label"])]
    except Exception as e:
        print(f"[AI-ENGINE] threat-graph seed skipped: {e}")
        return []


try:
    shield = CounterIntelShield(detector, seed_rows=_seed_rows())
except Exception as e:  # Level-1 keeps working even if the shield cannot start
    print(f"[AI-ENGINE] Counter-Intelligence Shield unavailable: {e}")
    shield = None


# --------------------------------------------------------------------------- helpers
def _payload():
    """Accept JSON, multipart/form or raw text bodies."""
    data = {}
    if request.is_json:
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            data = {}
    else:
        data = {k: v for k, v in request.form.items()}
        if not data and not request.files:
            raw = request.get_data(as_text=True) or ""
            if raw.startswith("message="):
                from urllib.parse import parse_qs
                data = {k: v[0] for k, v in parse_qs(raw).items()}
            elif raw.strip():
                data = {"message": raw}
    text = data.get("message") or data.get("text") or data.get("prompt") or ""
    if not isinstance(text, str):
        text = str(text)
    data["message"] = text
    return data


def _ctx(data):
    def _s(key):
        v = data.get(key)
        return str(v)[:256] if v not in (None, "") else None
    direction = (_s("direction") or "inbound").lower()
    return {
        "sender": _s("sender"), "recipient": _s("recipient"), "channel": _s("channel"),
        "session_id": _s("session_id"), "direction": direction if direction in ("inbound", "outbound") else "inbound",
        "timestamp": data.get("timestamp"), "sender_domain": _s("sender_domain"),
        "verified_contact": str(data.get("verified_contact", "")).lower() in ("1", "true", "yes"),
    }


_CONTEXT_LAYERS = ("Threat Graph Clustering", "Multi-Turn Trajectory")


def _context_score(ci):
    """Highest score among shield layers that see beyond the single message."""
    best = 0.0
    for layer in ci.get("layers") or []:
        if layer.get("status") != "ok" or layer.get("confidence", 0) < 0.5:
            continue
        if layer.get("name") in _CONTEXT_LAYERS or (layer.get("details") or {}).get("lookalike_domains"):
            best = max(best, float(layer.get("score", 0)))
    return best


def _fuse(level1, ci):
    """Final report = Level-1 risk, raised by the shield when it sees what L1 cannot."""
    out = dict(level1)
    out["level1"] = {k: level1[k] for k in ("category_id", "final_prediction", "final_risk_score", "final_confidence",
                                            "threat_level", "analysis_engine") if k in level1}
    if not ci:
        out["counter_intel"] = None
        return out
    out["counter_intel"] = ci
    l1 = level1["final_risk_score"]
    c = ci["counter_intel_score"]
    # The trained Level-1 model owns single-message risk. The shield may push a case
    # past the CERT-Army threshold only with evidence a single message cannot show
    # (campaign links, conversation trajectory, look-alike sender domains); its
    # keyword layers merely corroborate within the model's band.
    final = max(l1, round(_context_score(ci)))
    if l1 >= 40 and c >= 40:
        bump = min(100, round(l1 + 10 * c / 100))
        final = max(final, bump if l1 >= ESCALATION_THRESHOLD else min(bump, ESCALATION_THRESHOLD - 1))
    out["final_risk_score"] = int(final)
    out["threat_level"] = threat_level(final)
    out["escalate_cert_army"] = final >= ESCALATION_THRESHOLD
    if final > l1 + 10 and level1.get("category_id", 0) == 0 and final >= 40:
        label = "Humanised AI Bot" if ci.get("humanised_ai_bot_suspected") else "Social Engineering"
        intent = (ci.get("primary_intent") or "elicitation").replace("_", " ").title()
        out["final_prediction"] = f"Counter-Intelligence Alert: {label} ({intent})"
        out["threat_type"] = "Counter-Intelligence Alert"
        out["mitigation_steps"] = ci["recommended_actions"] + MITIGATIONS[5][:2]
    elif ci.get("recommended_actions"):
        out["mitigation_steps"] = list(dict.fromkeys(ci["recommended_actions"] + list(level1["mitigation_steps"])))
    out["analysis_engine"] = f"{level1['analysis_engine']} + 5-Layer Counter-Intel Shield"
    out["details"] = level1["details"] + f" Counter-Intel Shield verdict: {ci['verdict']} ({ci['counter_intel_score']}%)."
    return out


def _run_shield(fn, *a, **kw):
    if shield is None:
        return None
    try:
        return fn(*a, **kw)
    except Exception as e:
        print(f"[AI-ENGINE] shield error: {e}\n{traceback.format_exc(limit=4)}")
        return None


# --------------------------------------------------------------------------- routes
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "NetGenX AI Cyber Threat Analysis Engine",
        "model": detector.engine_name,
        "model_version": detector.model_info.get("version"),
        "level1_degraded": "degraded" in detector.engine_name.lower(),
        "counter_intel_shield": "online" if shield else "offline",
        "shield_graph": bool(shield and shield.graph),
        "shield_trajectory": bool(shield and shield.tracker),
        "escalation_threshold": ESCALATION_THRESHOLD,
        "version": "3.0.0",
        "uptime_s": int(time.time() - STARTED),
        "port": int(os.environ.get("PORT", 5000)),
    }), 200


@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    data = _payload()
    ctx = _ctx(data)

    uploaded = next((request.files[k] for k in ("file", "audio", "video", "image", "document")
                     if k in request.files and request.files[k].filename), None)
    if uploaded:
        content = uploaded.read()
        mime = uploaded.content_type or ""
        print(f"[AI-ENGINE] Analyzing file: {uploaded.filename} ({len(content)} bytes, {mime})")
        level1 = detector.analyze_file(uploaded.filename, content, mime)
        media = _run_shield(shield.analyze_media, uploaded.filename, content, mime) if shield else None
        ci = None
        if data["message"].strip() or level1.get("text_extracted_chars"):
            ci = _run_shield(shield.analyze_message, data["message"] or uploaded.filename, level1=level1, **ctx)
        result = _fuse(level1, ci)
        if media:
            result["synthetic_media"] = media
            if media["score"] >= 80:
                result["final_risk_score"] = max(result["final_risk_score"], 60)
                result["threat_level"] = threat_level(result["final_risk_score"])
                result["mitigation_steps"] = ["Media carries AI-generation markers: treat as a synthetic artifact, "
                                              "not proof of identity. Preserve for forensic analysis."] + result["mitigation_steps"]
        return jsonify(result), 200

    text = data["message"]
    if not text.strip():
        return jsonify({"status": False, "error": "Provide 'message' text or a file upload."}), 400
    print(f"[AI-ENGINE] Analyzing text transmission: {text[:80]!r}")
    level1 = detector.analyze_text(text)
    if shield is not None and _pasted_chat(text):
        # a pasted conversation: judge it as a conversation; the whole-text verdict is kept as a
        # floor only when it alone is an escalation (e.g. a multi-line phishing SMS)
        payload, code = _conversation_report({"transcript": text, "me": ""})
        if code == 200:
            out = payload["fused"]
            out["counter_intel"] = payload["counter_intel"]
            out["analysed_as_conversation"] = True
            if level1["final_risk_score"] >= ESCALATION_THRESHOLD and level1["final_risk_score"] > out["final_risk_score"]:
                out.update({k: level1[k] for k in ("final_risk_score", "threat_level", "category_id", "final_prediction",
                                                   "threat_type", "mitigation_steps", "escalate_cert_army")})
            return jsonify(out), 200
    ci = _run_shield(shield.analyze_message, text, level1=level1, **ctx) if shield else None
    return jsonify(_fuse(level1, ci)), 200


@app.route("/shield/analyze", methods=["POST"])
def shield_analyze():
    data = _payload()
    if not data["message"].strip():
        return jsonify({"status": False, "error": "'message' is required"}), 400
    if shield is None:
        return jsonify({"status": False, "error": "Counter-Intelligence Shield offline"}), 503
    level1 = detector.analyze_text(data["message"])
    ci = shield.analyze_message(data["message"], level1=level1, **_ctx(data))
    return jsonify({"status": True, "level1": level1, "counter_intel": ci, "fused": _fuse(level1, ci)}), 200


@app.route("/shield/conversation", methods=["POST"])
def shield_conversation():
    payload, code = _conversation_report(request.get_json(silent=True) or {})
    return jsonify(payload), code


def _conversation_report(data):
    """Full 5-layer + learned-model analysis of a chat. Returns (payload, http_status)."""
    msgs = data.get("messages")
    if not msgs and isinstance(data.get("transcript"), str):
        # raw chat export + the reporter's own name -> {text, role} turns
        parsed = parse_transcript(data["transcript"])
        msgs = to_conversation(parsed["messages"], data.get("me"))
        if not data.get("sender"):  # the most active other participant is the suspected contact
            others = [s["name"] for s in parsed["senders"] if s["name"].lower() != str(data.get("me", "")).lower()]
            data["sender"] = others[0] if others and others[0] != "Unknown" else None
    if not isinstance(msgs, list) or not msgs:
        return {"status": False, "error": "'messages' must be a non-empty list of {text, role}"}, 400
    if len(msgs) > 200:
        return {"status": False, "error": "max 200 messages per transcript"}, 413
    msgs = [m if isinstance(m, dict) else {"text": str(m)} for m in msgs]
    if shield is None:
        return {"status": False, "error": "Counter-Intelligence Shield offline"}, 503
    res = shield.analyze_conversation(msgs, channel=data.get("channel"), sender=data.get("sender"),
                                      sender_domain=data.get("sender_domain"),
                                      verified_contact=bool(data.get("verified_contact")))
    if res.get("status") is False:
        return res, 400
    level1 = res.pop("level1_peak")
    fused = _fuse(level1, res)
    cm = res.get("conversation_model")
    if cm:
        # Learned 5-layer fusion decides the conversation; hard evidence in any single message
        # and a confident campaign-graph link can still raise it, never lower it.
        graph = next((l for l in res.get("layers", []) if l.get("layer") == 2 and l.get("status") == "ok"
                      and l.get("confidence", 0) >= 0.5), None)
        final = round(max(cm["score"], cm["evidence_floor"], graph["score"] if graph else 0))
        fused["final_risk_score"] = int(final)
        fused["threat_level"] = threat_level(final)
        fused["escalate_cert_army"] = final >= ESCALATION_THRESHOLD
        if final < 40:
            fused.update(category_id=0, final_prediction=CATEGORY_NAMES[0], threat_type="Benign / Normal Operational Communication",
                         mitigation_steps=MITIGATIONS[0])
        fused["analysis_engine"] = f"Learned conversation model v{cm['version']} ({cm['trained_on']} conversations) + 5-Layer Counter-Intel Shield"
        fused["details"] = (f"Conversation risk {final}/100 from the trained 5-layer fusion model "
                            f"(LOW {cm['tier_probabilities']['LOW']:.0%} / MEDIUM {cm['tier_probabilities']['MEDIUM']:.0%} / "
                            f"HIGH {cm['tier_probabilities']['HIGH']:.0%}). Most dangerous message: "
                            f"{level1['final_prediction']} ({level1['final_risk_score']}). "
                            f"Counter-Intel Shield verdict: {res['verdict']} ({res['counter_intel_score']}%).")
    return {"status": True, "counter_intel": res, "fused": fused}, 200


_EMAIL_HEADER = re.compile(r"^\s*(?:subject|from|to|cc|date)\s*:", re.I | re.M)


def _pasted_chat(text):
    """True when free text is really a multi-message chat (the single-message model is the wrong tool)."""
    if _EMAIL_HEADER.search(text) or any(len(ln) > 400 for ln in text.splitlines()):
        return False
    try:
        return len(parse_transcript(text)["messages"]) >= 4
    except Exception:
        return False


@app.route("/shield/transcript/parse", methods=["POST"])
def shield_transcript_parse():
    """Parse an uploaded / pasted chat export so the UI can ask which participant is the reporter."""
    raw = None
    up = request.files.get("file")
    if up and up.filename:
        content = up.read()
        if len(content) > 5 * 1024 * 1024:
            return jsonify({"status": False, "error": "chat export larger than 5 MB"}), 413
        raw = content.decode("utf-8-sig", errors="replace")
    else:
        data = request.get_json(silent=True) or {}
        raw = data.get("transcript") or request.form.get("transcript")
    if not raw or not raw.strip():
        return jsonify({"status": False, "error": "Provide a chat export file or 'transcript' text."}), 400
    parsed = parse_transcript(raw)
    if not parsed["messages"]:
        return jsonify({"status": False, "error": "No messages found in this chat export."}), 400
    return jsonify({"status": True, **parsed}), 200


@app.route("/shield/outbound", methods=["POST"])
def shield_outbound():
    data = _payload()
    if not data["message"].strip():
        return jsonify({"status": False, "error": "'message' is required"}), 400
    from shield import zero_trust
    res = zero_trust.analyze(data["message"], direction="outbound", sender=data.get("recipient"),
                             sender_domain=data.get("recipient_domain"), channel=data.get("channel"),
                             verified_contact=str(data.get("verified_contact", "")).lower() in ("1", "true", "yes"))
    return jsonify({"status": True, "decision": res["details"]["policy_decision"], "result": res}), 200


@app.route("/shield/clusters", methods=["GET"])
def shield_clusters():
    if shield is None:
        return jsonify({"status": False, "error": "Counter-Intelligence Shield offline"}), 503
    try:
        min_size = max(1, int(request.args.get("min_size", 2)))
    except ValueError:
        min_size = 2
    return jsonify({"status": True, "clusters": shield.clusters(min_size=min_size)}), 200


@app.route("/shield/session/<session_id>", methods=["DELETE"])
def shield_reset_session(session_id):
    if shield and shield.tracker:
        shield.tracker.reset(session_id)
    return jsonify({"status": True}), 200


@app.route("/model/metrics", methods=["GET"])
def model_metrics():
    m = detector.metrics()
    return (jsonify({"status": True, "engine": detector.engine_name, "metrics": m}), 200) if m else \
        (jsonify({"status": False, "error": "no metrics report; run python train.py"}), 404)


@app.route("/model/reload", methods=["POST"])
def model_reload():
    token = request.headers.get("X-Admin-Token")
    local = request.remote_addr in ("127.0.0.1", "::1")
    if not ((ADMIN_TOKEN and token == ADMIN_TOKEN) or (not ADMIN_TOKEN and local)):
        return jsonify({"status": False, "error": "forbidden"}), 403
    ok = detector.load()
    return jsonify({"status": ok, "engine": detector.engine_name, "version": detector.model_info.get("version")}), 200


@app.route("/threat_intel", methods=["GET"])
def threat_intel():
    return jsonify({
        "status": True,
        "advisories": [
            {"id": "CERT-ARMY-ADV-2025-081", "title": "Advisory on Fake SPARSH Portal Spoofing Defence Pensioners",
             "severity": "CRITICAL", "target": "Veterans & Defence Pensioners",
             "action": "Block unofficial SMS shortcodes and verify only on sparsh.defencepension.gov.in"},
            {"id": "CERT-ARMY-ADV-2025-082", "title": "Trojanized Military Messaging APKs on External WhatsApp Groups",
             "severity": "CRITICAL", "target": "Serving Military Personnel",
             "action": "Immediately uninstall non-official APKs and report device to Station Signals Officer"},
            {"id": "CERT-ARMY-ADV-2025-083", "title": "Honeytrap and Social Engineering Baiting near Northern & Western Sectors",
             "severity": "HIGH", "target": "Forward Deployed Units",
             "action": "Enforce strict social media guidelines. Do not share geolocations or duty photos."},
            {"id": "CERT-ARMY-ADV-2026-004", "title": "Humanised GenAI Chatbot Personas Conducting Long-Horizon Elicitation",
             "severity": "CRITICAL", "target": "All Ranks & Families",
             "action": "Treat warm, flawless, always-available online contacts as untrusted; never move conversations "
                       "to private apps; report any probing about unit, location or schedule."},
        ],
    }), 200


# --------------------------------------------------------------------------- errors
@app.errorhandler(HTTPException)
def http_error(e):
    return jsonify({"status": False, "error": e.description, "code": e.code}), e.code


@app.errorhandler(Exception)
def unhandled(e):
    print(f"[AI-ENGINE ERROR] {e}\n{traceback.format_exc(limit=6)}")
    # Fail safe, not fail open: an analysis error is reported as MEDIUM risk, never as benign
    return jsonify({
        "status": False, "error": "internal analysis error", "final_prediction": "Analysis Error",
        "final_risk_score": 50, "final_confidence": 0.0, "threat_level": "MEDIUM", "escalate_cert_army": False,
        "mitigation_steps": ["Automated analysis failed - retry, or submit the raw evidence directly to CERT-Army."],
    }), 500


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    port = int(os.environ.get("PORT", 5000))
    print("==================================================")
    print("NetGenX AI Engine: Level-1 Risk + 5-Layer Counter-Intel Shield")
    print(f"Listening on http://127.0.0.1:{port}")
    print("==================================================")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
