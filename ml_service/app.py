import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from model import detector

app = Flask(__name__)
# Enable CORS for frontend and other origins
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "NetGenX AI Cyber Threat Analysis Engine",
        "model": "TF-IDF + Defence Neural Heuristics",
        "version": "2.4.0",
        "port": 5000
    }), 200

@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        # 1. Check for uploaded files (file, audio, video, image)
        uploaded_file = None
        for key in ["file", "audio", "video", "image", "document"]:
            if key in request.files and request.files[key].filename:
                uploaded_file = request.files[key]
                break

        if uploaded_file:
            filename = uploaded_file.filename
            content_bytes = uploaded_file.read()
            mime_type = uploaded_file.content_type or ""
            print(f"[AI-ENGINE] Analyzing file: {filename} ({len(content_bytes)} bytes, MIME: {mime_type})")
            result = detector.analyze_file(filename, content_bytes, mime_type)
            return jsonify(result), 200

        # 2. Check for form data or JSON message
        text_message = ""
        if request.is_json:
            json_data = request.get_json(silent=True) or {}
            text_message = json_data.get("message") or json_data.get("text") or json_data.get("prompt") or ""
        elif request.form:
            text_message = request.form.get("message") or request.form.get("text") or ""
        else:
            raw_body = request.get_data(as_text=True)
            if raw_body and "message=" in raw_body:
                import urllib.parse
                parsed = urllib.parse.parse_qs(raw_body)
                text_message = parsed.get("message", [""])[0]
            elif raw_body:
                text_message = raw_body

        if text_message:
            print(f"[AI-ENGINE] Analyzing text transmission: {text_message[:80]}...")
            result = detector.analyze_text(text_message)
            return jsonify(result), 200

        # Default fallback if nothing sent
        return jsonify(detector.analyze_text("Operational activity check")), 200

    except Exception as e:
        print(f"[AI-ENGINE ERROR] {str(e)}")
        return jsonify({
            "status": False,
            "error": str(e),
            "final_prediction": "Analysis Error",
            "final_risk_score": 50,
            "final_confidence": 50.0,
            "threat_level": "MEDIUM",
            "mitigation_steps": ["Retry threat scan or upload raw evidence directly to CERT-Army."]
        }), 500

@app.route("/threat_intel", methods=["GET"])
def threat_intel():
    return jsonify({
        "status": True,
        "advisories": [
            {
                "id": "CERT-ARMY-ADV-2025-081",
                "title": "Advisory on Fake SPARSH Portal Spoofing Defence Pensioners",
                "severity": "CRITICAL",
                "target": "Veterans & Defence Pensioners",
                "action": "Block unofficial SMS shortcodes and verify only on sparsh.defencepension.gov.in"
            },
            {
                "id": "CERT-ARMY-ADV-2025-082",
                "title": "Trojanized Military Messaging APKs on External WhatsApp Groups",
                "severity": "CRITICAL",
                "target": "Serving Military Personnel",
                "action": "Immediately uninstall non-official APKs and report device to Station Signals Officer"
            },
            {
                "id": "CERT-ARMY-ADV-2025-083",
                "title": "Honeytrap and Social Engineering Baiting near Northern & Western Sectors",
                "severity": "HIGH",
                "target": "Forward Deployed Units",
                "action": "Enforce strict social media guidelines. Do not share geolocations or duty photos."
            }
        ]
    }), 200

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    port = int(os.environ.get("PORT", 5000))
    print("==================================================")
    print("NetGenX AI Cyber Threat Analysis Engine Active")
    print(f"Listening on http://127.0.0.1:{port}")
    print("==================================================")
    app.run(host="0.0.0.0", port=port, debug=False)
