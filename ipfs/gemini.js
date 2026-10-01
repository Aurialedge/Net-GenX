import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function getAiClient() {
  const key = process.env.GEMINI_KEY;
  if (!key) return null;
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (e) {
    console.warn("Could not initialize GoogleGenAI client:", e.message);
    return null;
  }
}

function getRuleBasedSteps(prompt) {
  const p = (prompt || "").toLowerCase();

  if (p.includes("honeytrap") || p.includes("espionage") || p.includes("regiment") || p.includes("bunker")) {
    return {
      "1": "IMMEDIATELY SEVER ALL CONTACT with the suspect individual across WhatsApp, Instagram, and Telegram.",
      "2": "DO NOT SHARE any details regarding unit name, location, equipment, duty rosters, or personal photographs.",
      "3": "IMMEDIATELY ISOLATE your phone and personal devices from military Wi-Fi and defence intranet systems.",
      "4": "PRESERVE CHAT EVIDENCE: The evidence CID and timestamp are permanently recorded on the NetGenX Blockchain.",
      "5": "REPORT IMMEDIATELY to your Station Security Officer (SSO) and unit Military Intelligence (MI) Liaison."
    };
  }

  if (p.includes("sparsh") || p.includes("pension") || p.includes("phishing") || p.includes("echs")) {
    return {
      "1": "DO NOT CLICK any links sent in the message or submit Aadhaar, PAN, or OTP details.",
      "2": "ACCESS ONLY OFFICIAL PORTALS: Log in to SPARSH exclusively via https://sparsh.defencepension.gov.in.",
      "3": "CHANGE PASSWORDS IMMEDIATELY for your defence pension credentials, email, and associated net banking.",
      "4": "BLOCK SENDER NUMBER and report the phishing SMS shortcode to your local bank defence nodal officer.",
      "5": "FILE A COUNTER-REPORT with Defence Pension Disbursing Officer (DPDO) and CERT-Army."
    };
  }

  if (p.includes("apk") || p.includes("malware") || p.includes("payload") || p.includes("hamraaz")) {
    return {
      "1": "DO NOT INSTALL or execute the APK file or enable macros on attached documents.",
      "2": "TURN OFF Wi-Fi, Mobile Data, and Bluetooth to prevent command-and-control (C2) beaconing.",
      "3": "SUBMIT THE FILE HASH to Station Cyber Security Cell for dynamic sandbox analysis.",
      "4": "RESET YOUR DEVICE to factory settings if already installed, after backing up uninfected data.",
      "5": "NOTIFY ALL PEERS in your regimental WhatsApp groups to avoid downloading the malicious package."
    };
  }

  return {
    "1": "Verify sender identity independently through official military directory or telephone exchange.",
    "2": "Do not disclose operational deployments, timings, or credentials over unclassified channels.",
    "3": "Keep the evidence CID logged on the NetGenX Blockchain for investigation reference.",
    "4": "Monitor your registered defence accounts and mobile number for unauthorized activity.",
    "5": "Contact CERT-Army Incident Command (1930 / cert-army@nic.in) for further advisory."
  };
}

async function aires(prompt) {
  if (!prompt) return { steps: getRuleBasedSteps("") };

  const prefixPrompt = `
You are a cybersecurity assistant specialized in Indian defence personnel protection. 
Analyze the reported incident and provide 4-5 concise, immediate mitigation steps.
Output must be strictly JSON format:
{ "steps": { "1": "step 1", "2": "step 2", "3": "step 3", "4": "step 4" } }
Do not include any markdown or text outside JSON.
`;

  const ai = getAiClient();
  if (ai) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Google Gemini API request timeout")), 3500)
        );
        const generatePromise = ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [{ type: "text", text: prefixPrompt + "\n" + prompt }],
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);

        let output = response.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        output = output.replace(/```json|```/g, "").trim();

        const match = output.match(/\{[\s\S]*\}/);
        if (match) output = match[0];

        const jsonOutput = JSON.parse(output);
        if (jsonOutput && jsonOutput.steps && Object.keys(jsonOutput.steps).length > 0) {
          console.log(`✅ [GEMINI AI] Live response synthesized by Google Gemini 3.8 Flash (Attempt ${attempt})`);
          return jsonOutput;
        }
      } catch (err) {
        console.warn(`[GEMINI API] Notice:`, err.message.slice(0, 100));
        // If Google server is overloaded (503), timeout, or rate-limited, immediately deploy defence playbook
        break;
      }
    }
  }

  console.log("ℹ️ [DEFENCE RULE ENGINE] Deploying tactical rule-based mitigation protocols.");
  return { steps: getRuleBasedSteps(prompt) };
}

export default aires;
