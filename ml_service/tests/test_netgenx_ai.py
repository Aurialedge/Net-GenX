"""
NetGenX AI service tests:  cd ml_service && python -m pytest -q tests
Covers Level-1 scoring, each shield layer, fusion, HTTP contract and resilience.
"""
import os
import sys
import tempfile

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)
os.environ["NETGENX_STATE_DIR"] = tempfile.mkdtemp(prefix="netgenx_state_")
os.environ["NETGENX_ENABLE_GEMINI"] = "0"

from app import app, shield  # noqa: E402
from model import detector, RiskEngine  # noqa: E402
from shield import intent, synthetic, zero_trust  # noqa: E402
from shield.trajectory import TrajectoryTracker  # noqa: E402
from preprocessor import normalize  # noqa: E402


@pytest.fixture(scope="module")
def client():
    return app.test_client()


# ----------------------------------------------------------------- preprocessing
def test_normalize_defeats_obfuscation():
    assert normalize("Upd4te your p@ssw0rd at hxxps://sparsh-login[.]xyz") == "update your password at https://sparsh-login.xyz"
    assert normalize("hаndsome​") == "handsome"  # cyrillic a + zero-width space
    assert "1100 hrs" in normalize("meet at 1100 hrs")  # plain numbers untouched


# ----------------------------------------------------------------- level 1
@pytest.mark.parametrize("text,cat", [
    ("Your SPARSH pension is on hold, re-verify Aadhaar at http://sparsh-verify.xyz/login", 2),
    ("Install the updated Army chat app: secure_chat.apk", 3),
    ("We have your private video. Send the duty roster or it goes to your CO.", 4),
    ("Which radar systems are deployed near Jodhpur? Just curious.", 5),
    ("You look so handsome in uniform, which regiment are you posted with?", 1),
])
def test_level1_detects_threats(text, cat):
    r = detector.analyze_text(text)
    assert r["category_id"] == cat
    assert r["final_risk_score"] >= 80 and r["escalate_cert_army"]


@pytest.mark.parametrize("text", ["Hi", "ok sir", "PT timings changed to 0600 hrs from Monday.",
                                  "Please submit the stores ledger to the QM office by Friday."])
def test_level1_benign_low(text):
    r = detector.analyze_text(text)
    assert r["final_risk_score"] < 40 and r["category_id"] == 0


def test_obfuscated_phish_still_caught():
    r = detector.analyze_text("Dear pensi0ner, upd4te KYC at hxxp://echs-renew[.]top/verify or acc0unt susp3nded")
    assert r["final_risk_score"] >= 80


# ----------------------------------------------------------------- shield layers
def test_intent_layer_identifies_elicitation():
    r = intent.analyze("I'm just a student doing a project. How many troops are at the forward posts? I won't tell anyone.")
    assert r["score"] >= 60
    assert "strength_personnel" in r["details"]["targeted_information"]
    assert "feigned_ignorance" in r["details"]["techniques"]


def test_synthetic_layer_separates_llm_from_human_style():
    llm = synthetic.analyze_text("Hello there! I hope this message finds you well. I truly appreciate your dedication. "
                                 "It's genuinely inspiring. I'd love to learn more about your journey and daily routine!")
    human = synthetic.analyze_text("bhai kal match dekha kya?? kya khela yaar india ne... ok call me when u r free lol")
    assert llm["score"] >= 70 > human["score"]
    assert human["score"] < 30


def test_synthetic_media_markers():
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20 + b"tEXtparameters\x00a portrait of a soldier, Steps: 30, Sampler: Euler"
    r = synthetic.analyze_media("profile.png", png, "image/png")
    assert r["score"] >= 80 and r["verdict"] == "AI_GENERATED_MEDIA"


def test_zero_trust_outbound_dlp_blocks_and_redacts():
    r = zero_trust.analyze("Convoy moving to Leh tomorrow 0500 hrs, we are at 34.1526, 77.5771 with 300 troops",
                           direction="outbound", channel="messaging")
    assert r["details"]["policy_decision"] == "BLOCK"
    assert "[REDACTED:GPS_COORDINATES]" in r["details"]["redacted_message"]
    ok = zero_trust.analyze("Reaching home by dinner, see you", direction="outbound", channel="messaging")
    assert ok["details"]["policy_decision"] == "ALLOW"


def test_zero_trust_trusts_official_domain_more():
    req = "Please confirm your unit location for the welfare survey."
    unknown = zero_trust.analyze(req, sender="someone@gmail.com", channel="email")
    official = zero_trust.analyze(req, sender="welfare@indianarmy.nic.in", channel="email")
    assert unknown["score"] > official["score"]


def test_zero_trust_flags_lookalike_domain():
    r = zero_trust.analyze("Login at https://sparsh-pension-gov.online/verify to continue")
    assert r["score"] >= 80 and r["details"]["policy_decision"] == "BLOCK"


def test_threat_graph_links_campaign_across_senders():
    tmpl = "Hi dear, I'm Riya from Pune, admire soldiers so much. Add me on telegram @riya_love_22 and tell me where you are posted"
    for i in range(4):
        r = shield.graph.analyze(tmpl.replace("Pune", ["Pune", "Delhi", "Agra", "Goa"][i]), sender=f"bot{i}",
                                 recipient=f"jawan{i}", level1_score=88)
    assert r["details"]["distinct_senders"] >= 3
    assert r["score"] >= 70
    assert any("coordinated_campaign" in s or "template_reuse" in s for s in r["signals"])


def test_trajectory_detects_grooming_progression():
    t = TrajectoryTracker()
    sid = "test-grooming"
    t.reset(sid)
    for stage, risk in [(0, 5), (1, 20), (1, 30), (2, 45), (3, 70), (3, 85)]:
        r = t.record_and_analyze(sid, "where is your unit posted?" if stage == 3 else "hi", stage=stage, risk=risk)
    assert r["verdict"] == "GROOMING_TRAJECTORY" and r["score"] >= 70


# ----------------------------------------------------------------- fusion / HTTP
def test_predict_contract_backwards_compatible(client):
    r = client.post("/predict", data={"message": "Hi, how are you?"}).get_json()
    for key in ("final_prediction", "final_risk_score", "final_confidence", "threat_level", "mitigation_steps",
                "escalate_cert_army", "analysis_engine"):
        assert key in r
    assert r["final_risk_score"] < 40
    assert len(r["counter_intel"]["layers"]) == 5


def test_humanised_bot_conversation_escalates(client):
    convo = [
        {"role": "contact", "text": "Hello! I hope you're having a wonderful day. I came across your profile and felt compelled to reach out."},
        {"role": "user", "text": "hi, who is this"},
        {"role": "contact", "text": "I'm Ananya, a writer from Pune. I truly admire the dedication of people who serve. It's genuinely inspiring!"},
        {"role": "contact", "text": "I really value the trust we've built. Let's keep our chats between us, okay? Could we move to Telegram?"},
        {"role": "contact", "text": "Out of curiosity, which unit are you part of and where is it based? I'd love to picture your world."},
        {"role": "user", "text": "sorry I can't share that"},
        {"role": "contact", "text": "I completely understand! Just roughly, which sector and what does your duty schedule look like this week?"},
    ]
    r = client.post("/shield/conversation", json={"messages": convo, "channel": "social_media"}).get_json()
    ci = r["counter_intel"]
    assert ci["layers"][4]["verdict"] == "GROOMING_TRAJECTORY"
    assert ci["humanised_ai_bot_suspected"]
    assert r["fused"]["escalate_cert_army"]


def test_benign_conversation_stays_clear(client):
    convo = [{"role": "contact", "text": "Hey, did you reach home safely?"},
             {"role": "user", "text": "yes, just now"},
             {"role": "contact", "text": "Good. Mummy is asking if you will come for Diwali."},
             {"role": "contact", "text": "Also the kids want to go to the movie on Sunday."}]
    r = client.post("/shield/conversation", json={"messages": convo}).get_json()
    assert r["fused"]["final_risk_score"] < 40


def test_disguised_executable_upload(client):
    import io
    data = {"file": (io.BytesIO(b"MZ\x90\x00" + b"\x00" * 200), "Posting_List.pdf")}
    r = client.post("/predict", data=data, content_type="multipart/form-data").get_json()
    assert r["final_risk_score"] >= 90
    assert "extension_content_mismatch" in r["file_findings"]


def test_bad_requests_return_json_errors(client):
    assert client.post("/predict", data={}).status_code == 400
    assert client.post("/shield/conversation", json={"messages": "nope"}).status_code == 400
    r = client.get("/does-not-exist")
    assert r.status_code == 404 and r.get_json()["status"] is False


# ----------------------------------------------------------------- resilience
def test_corrupt_model_file_self_heals(tmp_path):
    bad = tmp_path / "risk_model.joblib"
    bad.write_bytes(b"this is not a model")
    eng = RiskEngine(model_path=str(bad))
    assert "self-healed" in eng.engine_name
    assert eng.analyze_text("Install hamraaz_update.apk now")["final_risk_score"] >= 80


def test_runtime_inference_failure_falls_back(monkeypatch):
    class Broken:
        def predict_proba(self, _):
            raise RuntimeError("boom")
    eng = RiskEngine.__new__(RiskEngine)
    eng.__dict__.update(detector.__dict__)
    eng.pipeline = Broken()
    monkeypatch.setattr(eng, "load", lambda: None)
    r = eng.analyze_text("Your intimate video will leak unless you pay 1 lakh tonight")
    assert r["status"] and "degraded" in r["analysis_engine"].lower() and r["final_risk_score"] >= 50


def test_shield_layer_crash_is_isolated(client, monkeypatch):
    def explode(*a, **k):
        raise ValueError("layer failure")
    monkeypatch.setattr(synthetic, "analyze_text", explode)
    r = client.post("/predict", data={"message": "Which regiment are you in, handsome?"}).get_json()
    assert r["final_risk_score"] >= 80
    assert "Synthetic Artifact Detection" in r["counter_intel"]["degraded_layers"]


def test_corrupt_state_file_recovers(tmp_path, monkeypatch):
    import shield.common as common
    monkeypatch.setattr(common, "STATE_DIR", str(tmp_path))
    (tmp_path / "trajectories.json").write_text("{not json")
    t = TrajectoryTracker()
    assert t.store.data == {"sessions": {}}
    assert any(p.name.startswith("trajectories.json.corrupt") for p in tmp_path.iterdir())


# ----------------------------------------------------------------- v4 graded risk
@pytest.mark.parametrize("text", [
    "Hey there! You seem like a genuinely nice person. Can we be friends?",
    "Lucky winner alert! Your SIM has won the monthly bumper draw, contact 9812345670.",
    "Return my money this week or there will be trouble.",
])
def test_suspicious_but_mild_gets_mitigation_not_escalation(client, text):
    r = client.post("/predict", data={"message": text}).get_json()
    assert 40 <= r["final_risk_score"] < 80 and not r["escalate_cert_army"]
    assert r["category_id"] != 0 and r["mitigation_steps"]


@pytest.mark.parametrize("text", [
    "Cyber cell advisory: lookalike ECHS websites are doing the rounds. Never share your OTP, PIN or password with anyone.",
    "Please change your unit LAN password before Friday. Use the intranet self-service page or visit the signals office.",
    "Happy birthday! Have a great year ahead.",
])
def test_security_advisories_and_wishes_stay_low(client, text):
    r = client.post("/predict", data={"message": text}).get_json()
    assert r["final_risk_score"] < 40 and r["category_id"] == 0


def test_fused_score_is_bounded_and_reports_severity(client):
    r = client.post("/predict", data={"message": "Bhai tumhari unit kaunse sector mein hai? Radar kahan laga hai?"}).get_json()
    assert 0 <= r["final_risk_score"] <= 100
    assert set(r["severity_probabilities"]) == {"LOW", "MEDIUM", "HIGH"}


def test_handle_extraction_ignores_words_containing_ig():
    from shield.threat_graph import extract_indicators
    assert extract_indicators("contact the signals JCO") == []
    assert "handle:priya.rao" in extract_indicators("add me on insta @priya.rao")


def test_request_for_otp_is_high_even_in_official_wording(client):
    r = client.post("/predict", data={"message": "Sir, Adjutant here from new number. CO wants all officers' leave "
                                                 "address and mobile OTP for the new e-leave system. Pls send fast."}).get_json()
    assert r["escalate_cert_army"] and r["category_id"] == 2


@pytest.mark.parametrize("text", [
    "Your OTP for the IRCTC login is 556201. Do not share it with anyone.",
    "HDFC Bank: Rs 4,500 debited from a/c XX7781 on 02-12 towards UPI/zomato. If not done by you, call customer care.",
    "Pin the notice on the board and send me a photo.",
])
def test_transactional_and_otp_delivery_messages_stay_low(client, text):
    r = client.post("/predict", data={"message": text}).get_json()
    assert r["final_risk_score"] < 40


# ----------------------------------------------------------------- panel robustness
@pytest.mark.parametrize("text", [
    "test", "asdf qwer zxcv", "!!!! ???", "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Is this message safe?", "What is phishing and how can I protect myself?",
    "CERT-In has warned about a new Android malware targeting defence personnel through fake apps.",
    "Our team won the inter-battalion football final yesterday!",
    "कल शाम को हम सब मंदिर चलेंगे, तैयार रहना।", "நாளை காலை கூட்டம் பத்து மணிக்கு நடைபெறும்.", "আজ রাতে খাবার কী হবে?",
])
def test_neutral_offtopic_and_multilingual_inputs_stay_low(client, text):
    r = client.post("/predict", data={"message": text}).get_json()
    assert r["final_risk_score"] < 40, (text, r["final_risk_score"])


@pytest.mark.parametrize("text", [
    "S E N D  Y O U R  O T P  N O W",
    "Y O U R  P A S S W O R D  P L E A S E",
    "आपका पेंशन खाता बंद हो जाएगा। तुरंत अपना OTP भेजें।",
    "आपकी यूनिट अभी कहाँ तैनात है? कितने जवान हैं?",
])
def test_obfuscated_and_devanagari_threats_escalate(client, text):
    r = client.post("/predict", data={"message": text}).get_json()
    assert r["escalate_cert_army"], (text, r["final_risk_score"])


def test_unsupported_script_is_reported_not_guessed(client):
    r = client.post("/predict", data={"message": "இந்த செய்தியை படிக்கவும்"}).get_json()
    assert r["language_supported"] is False and r["final_risk_score"] < 40
    assert "not supported" in r["details"]


def test_non_latin_messages_are_not_near_duplicates_of_each_other():
    from shield.threat_graph import shingles, jaccard
    assert jaccard(shingles("நாளை காலை கூட்டம்"), shingles("आपकी यूनिट अभी कहाँ तैनात है")) == 0.0


# ----------------------------------------------------------------- chat history (multi-turn)
WA_GROOMING = """12/11/26, 9:02\u202fpm - Messages and calls are end-to-end encrypted. Tap to learn more.
01/12/26, 8:00 pm - Ananya: Hey! We have some mutual friends, thought I'd say hi
01/12/26, 8:05 pm - Arjun: Hi
01/12/26, 8:06 pm - Ananya: What do you do for a living?
01/12/26, 8:10 pm - Arjun: I'm in the army
02/12/26, 9:00 pm - Ananya: That's amazing. Which city are you posted in nowadays?
02/12/26, 9:04 pm - Arjun: Can't say much
03/12/26, 9:15 pm - Ananya: Haha ok. Do you live inside the cantonment?
03/12/26, 9:16 pm - Ananya: <Media omitted>
04/12/26, 9:30 pm - Ananya: Is it far from the border where you are?
05/12/26, 9:45 pm - Ananya: How long will you stay at this posting? Are you moving soon?
06/12/26, 10:00 pm - Ananya: What's the routine like at your camp,
what time do you guys go out?"""

WA_FAMILY = """[05/12/26, 7:15:02\u202fPM] Mummy: Beta khana kha liya?
[05/12/26, 7:20:45\u202fPM] Rahul: Haan mummy, mess mein kha liya
[05/12/26, 7:21:10\u202fPM] Mummy: Diwali pe ghar aa rahe ho na? Papa pooch rahe the
[05/12/26, 7:26:01\u202fPM] Mummy: \u200eimage omitted
[05/12/26, 7:30:12\u202fPM] Rahul: Bahut achhe hai
[05/12/26, 7:31:00\u202fPM] Mummy: Theek hai, apna dhyan rakhna. Good night"""


def test_transcript_parser_handles_whatsapp_telegram_csv_and_plain():
    from transcript import parse_transcript
    p = parse_transcript(WA_GROOMING)
    assert p["format"] == "whatsapp" and [s["name"] for s in p["senders"]] == ["Ananya", "Arjun"]
    assert p["messages"][-1]["text"].endswith("what time do you guys go out?")  # multi-line message joined
    assert all(isinstance(m["ts"], float) for m in p["messages"])           # epoch seconds for layer 5
    assert not any("Media omitted" in m["text"] or "encrypted" in m["text"] for m in p["messages"])
    tg = parse_transcript('{"messages": [{"from": "HR", "date": "2026-12-01T10:00:00", "text": ["Hi ", {"text": "sir"}]}]}')
    assert tg["format"] == "json" and tg["messages"][0]["text"] == "Hi sir"
    assert parse_transcript("sender,message\nX,hello\nY,hi")["format"] == "csv"
    assert len(parse_transcript("Hi sir\nThis is the bank\nShare your CVV")["messages"]) == 3


def test_slow_grooming_chat_escalates_though_no_single_message_does(client):
    worst_single = max(client.post("/predict", data={"message": line.split(": ", 1)[1]}).get_json()["final_risk_score"]
                       for line in WA_GROOMING.splitlines()[1:] if " - Ananya: " in line)
    r = client.post("/shield/conversation", json={"transcript": WA_GROOMING, "me": "Arjun"}).get_json()
    traj = next(l for l in r["counter_intel"]["layers"] if l["layer"] == 5)
    assert worst_single < 80 and r["fused"]["escalate_cert_army"]
    assert traj["status"] == "ok" and traj["verdict"] == "GROOMING_TRAJECTORY"
    assert any("after_refusal" in s for s in traj["signals"])


def test_benign_family_chat_stays_low(client):
    r = client.post("/shield/conversation", json={"transcript": WA_FAMILY, "me": "Rahul"}).get_json()
    traj = next(l for l in r["counter_intel"]["layers"] if l["layer"] == 5)
    assert r["fused"]["final_risk_score"] < 40 and traj["status"] == "ok"


def test_transcript_parse_endpoint(client):
    import io
    r = client.post("/shield/transcript/parse", data={"file": (io.BytesIO(WA_FAMILY.encode()), "chat.txt")},
                    content_type="multipart/form-data").get_json()
    assert r["status"] and {s["name"] for s in r["senders"]} == {"Mummy", "Rahul"}
    assert client.post("/shield/transcript/parse", json={"transcript": "   "}).status_code == 400


# ----------------------------------------------------------------- sample chat histories (repo: test_chats/)
SAMPLE_CHATS = os.path.join(os.path.dirname(ROOT), "test_chats")


@pytest.mark.parametrize("fname, me, escalate", [
    ("01_honeytrap_whatsapp_android.txt", "Vikram Singh", True),
    ("02_slow_elicitation_whatsapp_android.txt", "Arjun", True),
    ("03_sextortion_whatsapp_iphone.txt", "Major Rathore", True),
    ("04_fake_recruiter_telegram.json", "Col (Retd) Mehta", True),
    ("05_otp_scam.csv", "Sub. Kumar", True),
    ("06_hinglish_opsec_whatsapp.txt", "Deepak", True),
    ("07_benign_family_whatsapp_iphone.txt", "Rahul", False),
    ("08_benign_unit_group_whatsapp.txt", "Nk Sharma", False),
])
def test_sample_chat_histories(client, fname, me, escalate):
    path = os.path.join(SAMPLE_CHATS, fname)
    if not os.path.exists(path):
        pytest.skip("test_chats/ not present")
    raw = open(path, encoding="utf-8").read()
    r = client.post("/shield/conversation", json={"transcript": raw, "me": me}).get_json()
    traj = next(l for l in r["counter_intel"]["layers"] if l["layer"] == 5)
    assert traj["status"] == "ok"
    assert r["fused"]["escalate_cert_army"] is escalate, (fname, r["fused"]["final_risk_score"])
    if not escalate:
        assert r["fused"]["final_risk_score"] < 40


def test_hinglish_refusal_then_probing_is_detected(client):
    raw = open(os.path.join(SAMPLE_CHATS, "06_hinglish_opsec_whatsapp.txt"), encoding="utf-8").read()
    r = client.post("/shield/conversation", json={"transcript": raw, "me": "Deepak"}).get_json()
    traj = next(l for l in r["counter_intel"]["layers"] if l["layer"] == 5)
    assert any("after_refusal" in s for s in traj["signals"])
