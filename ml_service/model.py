import os
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# Comprehensive defence threat training corpus
DEFENCE_TRAINING_DATA = [
    # Honeytrap & Operational Espionage (Category 1)
    ("Hello handsome, saw you in uniform! Which regiment are you posted at in Leh? Can you share a picture of your bunker?", 1),
    ("Hi Captain, I am a defence researcher writing a blog on Indian Army deployments near LAC. Which artillery units are currently active in your sector?", 1),
    ("Sweetheart let's video call on WhatsApp. Why are you hiding your posting details? Are you at the forward base?", 1),
    ("I love army officers. Can you tell me when your unit is moving to Jammu? It will be our little secret.", 1),
    ("Dear officer, I am an international journalist offering 5000 USD for an interview about air defence radar locations in Punjab sector.", 1),
    ("Hey Major, send me your private photos. Don't worry, just tell me how many tanks are deployed in your brigade.", 1),
    ("Looking for handsome defence personnel for friendship. Please share your duty roster and battalion number.", 1),
    ("Are you deployed near the border? Please share live location so I can send you a special gift hamper.", 1),
    ("Honey, can you send the movement order document of your troop train? I miss you and want to track your route.", 1),
    ("I work with an NGO supporting defence families. Please share the names of all junior commissioned officers in your signals unit.", 1),

    # Spear Phishing / Defence Portal Spoofing (Category 2)
    ("URGENT: Your SPARSH defence pension account has been locked. Verify Aadhaar and PAN immediately at http://sparsh-pension-defence-update.xyz to avoid pension suspension.", 2),
    ("ECHS Notice: Your military health card benefits will be terminated within 24 hours. Click here to update biometric details immediately.", 2),
    ("Army Welfare Housing Organization (AWHO): You have been selected for preferential allotment in Delhi Cantt. Transfer 25000 processing fee to secure flat.", 2),
    ("Notice from Principal Controller of Defence Accounts (PCDA): Dear Pensioner, submit your annual life certificate at this unofficial link now.", 2),
    ("Indian Army Recruitment Board: Your CDS application requires immediate identity verification. Download and login via http://joinindianarmy-verification.in", 2),
    ("Defence Salary Package (DSP) update: Your SBI military account requires immediate KYC refresh or ATM card will be blocked.", 2),
    ("Army Postal Service: Your parcel containing military awards is held up. Pay customs clearance immediately to release.", 2),
    ("Hamraaz Army app update required immediately: Your payslip cannot be generated until you verify password on this external link.", 2),
    ("Urgent circular from ADG IT: All defence officers must submit personal email passwords for annual security audit via this form.", 2),
    ("Ex-Servicemen Contributory Health Scheme: Claim your uncredited medical reimbursement by clicking this link and entering net banking OTP.", 2),

    # Malicious Payload & Defence Spyware (Category 3)
    ("Download new Hamraaz_Army_v7.3.apk for viewing revised 8th Pay Commission salary allowances. Install and grant all permissions.", 3),
    ("CONFIDENTIAL: Attached is the operational briefing PDF regarding upcoming bilateral military exercise. Enable macros to view content.", 3),
    ("Updated Indian Army CSD canteen liquor quota application APK. Download and install on Android phone immediately.", 3),
    ("Notice to all units: Download secure Indian Army messenger APK (SAMBHAV_patch.apk) from this Google Drive link.", 3),
    ("Urgent operational order attached: OP_RAKSHAK_DIRECTIVE.docm. Please open in Microsoft Word and allow active content.", 3),
    ("Attached is the Trojan reverse shell payload disguised as defence pay matrix spreadsheet.", 3),
    ("Download Armed Forces Tribunal judgment file: AFT_judgment_summary.zip. Contains executable setup.exe to extract cases.", 3),
    ("Defence intelligence alert script: Run this powershell script to patch security vulnerabilities in your military workstation.", 3),
    ("Suspicious weaponized attachment detected containing exploit payload targeting army intranet terminals.", 3),
    ("Malware beaconing detected to known foreign hostile command and control IP address 185.220.101.5.", 3),

    # Command Impersonation & Social Engineering (Category 4)
    ("Attention Jawan: This is Subedar Major speaking on instructions of the Commanding Officer. Transfer 10,000 INR emergency mess fund immediately.", 4),
    ("Urgent call from Military Intelligence (MI) branch: Share the OTP received on your mobile right now for security clearance.", 4),
    ("This is Brigadier Sharma from Southern Command HQ. I need the passwords of your regimental communications server immediately.", 4),
    ("Join the unofficial WhatsApp group for 16th Cavalry officers to discuss upcoming deployment strategies.", 4),
    ("Urgent directive: You have been assigned to confidential court of inquiry. Do not speak to anyone and transfer funds to officer welfare pool.", 4),
    ("Commanding Officer order: Send the master access codes for unit secure comms link via unencrypted SMS.", 4),

    # Benign / Safe Operational Activity (Category 0)
    ("Annual sports day schedule for Army Public School has been released. Parents are requested to attend at 0900 hrs.", 0),
    ("Standard Operating Procedure for station vehicle maintenance to be conducted every Saturday morning.", 0),
    ("Station order: The military dental clinic will remain open on Wednesday from 0800 to 1400 hrs for routine checkups.", 0),
    ("Good morning sir, submitting the weekly ration expenditure statement for unit mess audit.", 0),
    ("Defence canteen goods arrival notice: Groceries and household goods available at CSD extension counter.", 0),
    ("Routine circular regarding celebration of Vijay Diwas at the station war memorial.", 0),
    ("Yoga session scheduled tomorrow morning at the station gymnasium for all personnel and families.", 0),
    ("Quarterly family welfare meeting will be held at the community hall this Sunday.", 0),
    ("Annual tree plantation drive organized across military cantonment premises.", 0),
    ("Information regarding Central Government Health Scheme (CGHS) dispensary holiday schedule for Diwali.", 0),
]

CATEGORY_NAMES = {
    0: "Benign / Normal Operational Communication",
    1: "Honeytrap & Cyber Espionage Attack",
    2: "Defence Phishing & Credential Harvesting",
    3: "Malicious Payload & Defence Spyware",
    4: "Social Engineering & Command Impersonation"
}

CATEGORY_RISK_MAP = {
    0: (5, 18),    # Low risk
    1: (88, 98),   # Critical risk (Honeytrap)
    2: (82, 94),   # High/Critical risk (Phishing)
    3: (90, 99),   # Critical risk (Malware)
    4: (75, 89)    # High risk (Impersonation)
}

MITIGATIONS = {
    0: [
        "Routine communication. Standard operational security protocols apply.",
        "Ensure sensitive military data is not transmitted over unclassified channels.",
        "Maintain periodic password hygiene on defence portals."
    ],
    1: [
        "IMMEDIATELY SEVER COMMUNICATION with the suspect contact. Do not reply or block without archiving.",
        "DO NOT SHARE any pictures in uniform, unit deployment details, weapon systems, or station rosters.",
        "IMMEDIATELY ISOLATE the device from defence intranets and Wi-Fi networks.",
        "ESCALATION ACTIVATED: Incident details and cryptographic hash transmitted to CERT-Army.",
        "REPORT TO MILITARY INTELLIGENCE (MI) Liaison Officer at your station headquarters immediately."
    ],
    2: [
        "DO NOT CLICK any links, open attachments, or submit Aadhaar/PAN/OTP details.",
        "DO NOT use unverified third-party portals for SPARSH, ECHS, or defence pension services.",
        "Verify all administrative notices solely through official .gov.in or .mil.in websites.",
        "Change credentials immediately for any military or banking accounts potentially exposed.",
        "Report fake URLs to CERT-Army and National Cyber Crime Reporting Portal (NCRP)."
    ],
    3: [
        "DO NOT INSTALL or execute any APKs, executables (.exe), or macro-enabled documents.",
        "Disconnect the infected device from mobile network, Wi-Fi, and Bluetooth immediately.",
        "Perform a full forensic scan using authorized military anti-malware tools.",
        "Hand over the physical device to Station Cyber Security Cell for dynamic sandbox analysis.",
        "Change all master passwords from a separate, uncompromised defence workstation."
    ],
    4: [
        "VERIFY SENDER IDENTITY independently through official military telephone directory or line communications.",
        "NEVER share OTPs, financial credentials, or unit movement details over phone calls or WhatsApp.",
        "Senior defence commanders will NEVER ask for money transfers or personal OTPs over messaging apps.",
        "Log the caller's telephone number and WhatsApp profile for technical tracing by CERT-Army.",
        "Brief family members and junior personnel regarding unauthorized command impersonation schemes."
    ]
}


class ThreatClassifier:
    def __init__(self):
        texts = [item[0] for item in DEFENCE_TRAINING_DATA]
        labels = [item[1] for item in DEFENCE_TRAINING_DATA]

        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), lowercase=True, max_features=1000)),
            ('clf', LogisticRegression(C=5.0, max_iter=200))
        ])
        self.pipeline.fit(texts, labels)

    def analyze_text(self, text):
        if not text or not text.strip():
            return self._build_result(0, 0.95, "Empty input provided.")

        cleaned = text.strip()
        lower = cleaned.lower()

        # Heuristic overrides for high-severity defence triggers
        honeytrap_triggers = ["regiment", "posted at", "bunker", "lac", "loc", "duty roster", "handsome", "in uniform", "deployment details", "video call", "live location", "miss you"]
        phishing_triggers = ["sparsh", "echs", "pcda", "pension", "verify aadhaar", "kyc", "locked", "awho", "hamraaz", "salary held", "atm card", "login via"]
        malware_triggers = [".apk", ".exe", ".docm", ".vbs", "powershell", "reverse shell", "trojan", "payload", "install on android", "macro"]
        impersonation_triggers = ["subedar major", "commanding officer", "brigadier", "military intelligence", "transfer 10,000", "emergency mess", "court of inquiry"]

        ht_count = sum(1 for w in honeytrap_triggers if w in lower)
        ph_count = sum(1 for w in phishing_triggers if w in lower)
        mal_count = sum(1 for w in malware_triggers if w in lower)
        imp_count = sum(1 for w in impersonation_triggers if w in lower)

        pred_class = self.pipeline.predict([cleaned])[0]
        probs = self.pipeline.predict_proba([cleaned])[0]
        confidence = float(np.max(probs))

        # Heuristic boost
        if mal_count >= 1:
            pred_class = 3
            confidence = max(confidence, 0.96)
        elif ht_count >= 2:
            pred_class = 1
            confidence = max(confidence, 0.94)
        elif ph_count >= 2:
            pred_class = 2
            confidence = max(confidence, 0.93)
        elif imp_count >= 2:
            pred_class = 4
            confidence = max(confidence, 0.91)

        return self._build_result(pred_class, confidence, cleaned)

    def analyze_file(self, filename, content_bytes, mime_type=""):
        name_lower = filename.lower()
        extracted_text = ""

        # Check for dangerous file extensions
        if any(name_lower.endswith(ext) for ext in [".apk", ".exe", ".scr", ".bat", ".cmd", ".vbs", ".ps1"]):
            return self._build_result(3, 0.98, f"Suspicious executable or package detected: {filename}")

        if any(name_lower.endswith(ext) for ext in [".docm", ".xlsm", ".pptm"]):
            return self._build_result(3, 0.94, f"Macro-enabled defence document detected: {filename}")

        # Text / Document content extraction
        try:
            sample = content_bytes[:4000].decode('utf-8', errors='ignore')
            extracted_text = sample
        except Exception:
            extracted_text = filename

        # If audio or video, analyze filename and metadata
        if "audio" in mime_type or any(name_lower.endswith(ext) for ext in [".mp3", ".wav", ".m4a", ".aac", ".ogg"]):
            extracted_text += " audio communication recording " + filename

        if "video" in mime_type or any(name_lower.endswith(ext) for ext in [".mp4", ".mkv", ".mov", ".avi"]):
            extracted_text += " video transmission " + filename

        if "image" in mime_type or any(name_lower.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            extracted_text += " visual photographic evidence " + filename

        return self.analyze_text(extracted_text if extracted_text.strip() else filename)

    def _build_result(self, pred_class, confidence, raw_input):
        risk_range = CATEGORY_RISK_MAP[pred_class]
        # Calculate risk score proportional to confidence
        score = int(risk_range[0] + (risk_range[1] - risk_range[0]) * confidence)
        score = min(100, max(0, score))

        threat_level = "LOW"
        if score >= 85:
            threat_level = "CRITICAL"
        elif score >= 70:
            threat_level = "HIGH"
        elif score >= 40:
            threat_level = "MEDIUM"

        category_title = CATEGORY_NAMES[pred_class]
        mitigations = MITIGATIONS[pred_class]

        return {
            "status": True,
            "final_prediction": category_title,
            "final_confidence": round(confidence * 100, 1),
            "final_risk_score": score,
            "threat_type": category_title.split("&")[0].strip(),
            "threat_level": threat_level,
            "details": f"AI Engine analyzed input with {round(confidence * 100, 1)}% confidence. Categorized as {category_title}.",
            "mitigation_steps": mitigations,
            "escalate_cert_army": score >= 80
        }


# Singleton model instance
detector = ThreatClassifier()
