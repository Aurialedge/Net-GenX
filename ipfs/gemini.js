import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// gemini-3.8-flash routinely takes >40s, so it never beat the old 3.5s timeout and every
// request silently fell back to the rule-based playbook. Flash-Lite answers in ~5-10s.
const GEMINI_MODEL = process.env.GEMINI_GUIDANCE_MODEL || "gemini-flash-lite-latest";
// Flash-Lite usually answers in 3-10s but spikes past 12s under load; the portal fetches
// guidance asynchronously, so a longer budget costs nothing and avoids needless fallbacks.
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 20000;
const GEMINI_ATTEMPTS = 2;

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

  if (p.includes("sparsh") || p.includes("pension") || p.includes("echs") || p.includes("pcda")) {
    return {
      "1": "DO NOT CLICK any links sent in the message or submit Aadhaar, PAN, or OTP details.",
      "2": "ACCESS ONLY OFFICIAL PORTALS: Log in to SPARSH exclusively via https://sparsh.defencepension.gov.in.",
      "3": "CHANGE PASSWORDS IMMEDIATELY for your defence pension credentials, email, and associated net banking.",
      "4": "BLOCK SENDER NUMBER and report the phishing SMS shortcode to your local bank defence nodal officer.",
      "5": "FILE A COUNTER-REPORT with Defence Pension Disbursing Officer (DPDO) and CERT-Army."
    };
  }

  if (p.includes("phishing") || p.includes("otp") || p.includes("upi") || p.includes("lottery") || p.includes("job")) {
    return {
      "1": "DO NOT click links, call numbers, pay any fee, or share OTP, PIN, CVV, Aadhaar or service number.",
      "2": "VERIFY the claim independently through the organisation's official website, app or a phone number you already know.",
      "3": "IF YOU ALREADY SHARED details or paid: call your bank to block the card/UPI and report at cybercrime.gov.in or helpline 1930 immediately.",
      "4": "BLOCK AND REPORT the sender as spam on the messaging platform.",
      "5": "INFORM your unit cyber cell if the message used defence branding or targeted service details."
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
    "5": "Report the incident at cybercrime.gov.in or helpline 1930, and inform CERT-Army through your unit cyber cell."
  };
}

/**
 * Build a mitigation prompt from a structured incident.
 * ctx: { message, category, riskScore, threatLevel, evidence, escalated }
 */
export function incidentPrompt(ctx = {}) {
  const escalated = ctx.escalated === true || ctx.escalated === "true";
  const lines = [
    `Threat category (from the NetGenX ML model): ${ctx.category || "unknown"}`,
    escalated
      ? `Risk score: ${ctx.riskScore ?? "?"}/100 (${ctx.threatLevel || "?"}). This case HAS BEEN ESCALATED to CERT-Army, who will investigate.`
        + ` Give the reporter the immediate steps to take NOW while CERT-Army responds, including what to do if they already replied, clicked, paid or installed something.`
      : `Risk score: ${ctx.riskScore ?? "?"}/100 (${ctx.threatLevel || "?"}) - BELOW the CERT-Army escalation threshold,`
        + ` so the service member must handle this themselves. Give practical steps for THIS message:`
        + ` what not to do, how to verify, how to secure accounts, and when to report to the unit cyber cell.`,
  ];
  if (ctx.evidence) lines.push(`Model evidence: ${String(ctx.evidence).slice(0, 400)}`);
  lines.push(`Reported message:\n"""${String(ctx.message || "").slice(0, 3000)}"""`);
  return lines.join("\n");
}

async function aires(prompt) {
  if (!prompt) return { steps: getRuleBasedSteps(""), source: "rules" };

  const prefixPrompt = `
You are a cybersecurity assistant specialized in Indian defence personnel protection. 
Analyze the reported incident and provide 4-5 concise, immediate mitigation steps.
Rules:
- Every step must fit THIS specific message and threat type; never give a generic incident-response checklist.
- Recommend disconnecting/isolating a device, forensic scans or factory resets ONLY if the message involves a
  file, app or link that may have been opened or installed.
- For fraud or OTP/payment scams include what to do if money or an OTP was already given (bank, 1930, cybercrime.gov.in).
- For honeytrap, extortion or OPSEC elicitation: do not engage or comply, preserve evidence, report to the unit / MI.
- Do not invent phone numbers, websites or organisations beyond: 1930, cybercrime.gov.in, the unit cyber cell, CERT-Army, MI.
Output must be strictly JSON format:
{ "steps": { "1": "step 1", "2": "step 2", "3": "step 3", "4": "step 4" } }
Do not include any markdown or text outside JSON.
`;

  const ai = getAiClient();
  if (ai) {
    for (let attempt = 1; attempt <= GEMINI_ATTEMPTS; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Google Gemini API request timeout")), GEMINI_TIMEOUT_MS)
        );
        const generatePromise = ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prefixPrompt + "\n" + prompt,
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);

        let output = response.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        output = output.replace(/```json|```/g, "").trim();

        const match = output.match(/\{[\s\S]*\}/);
        if (match) output = match[0];

        const jsonOutput = JSON.parse(output);
        if (jsonOutput && jsonOutput.steps && Object.keys(jsonOutput.steps).length > 0) {
          console.log(`✅ [GEMINI AI] Live response synthesized by ${GEMINI_MODEL} (Attempt ${attempt})`);
          return { steps: jsonOutput.steps, source: "gemini", model: GEMINI_MODEL };
        }
      } catch (err) {
        console.warn(`[GEMINI API] attempt ${attempt} failed:`, err.message.slice(0, 120));
        // transient (timeout / 429 / 503) failures usually clear quickly: retry once, then fall back
        if (attempt < GEMINI_ATTEMPTS) await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  console.log("ℹ️ [DEFENCE RULE ENGINE] Deploying tactical rule-based mitigation protocols.");
  return { steps: getRuleBasedSteps(prompt), source: "rules" };
}

export default aires;
