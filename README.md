# NetGenX: AI-Enabled Cyber Incident Web Portal for Defence 🛡️

An exclusive, sovereign Cyber Safety Portal built for the **Indian Armed Forces ecosystem** — Serving Personnel, Military Families, Veterans, and **CERT-Army**.

---

## 💡 The Problem Solved
Defence cyber incident reports frequently suffer from delayed response times because they are **"buried in NCRP's civilian load."** These delays leave defence personnel vulnerable to targeted cyber threats like **Honeytrapping, SPARSH Pension Phishing, and Trojanized Military APKs**.

**NetGenX** delivers:
- **Instant AI Threat Categorization** in under `<2 seconds`.
- **Tamper-Proof Decentralized Evidence Preservation** via **IPFS + Ethereum Blockchain**.
- **Automated Escalation** to CERT-Army Incident Command for high-severity threats (`Score >= 80%`).
- **Interactive AI Mitigation Terminal** providing actionable step-by-step counter-protocols.

---

## 🚀 Quick Start (1-Click Run)

To install missing dependencies and start all services on Windows:
```cmd
start.bat
```

To stop all services:
```cmd
start.bat stop
```

Or start individual services:
1. **AI/ML Threat Engine** (Port 5000):
   ```cmd
   cd ml_service && python app.py
   ```
2. **IPFS & Security Gateway** (Port 8000):
   ```cmd
   cd ipfs && node server.js
   ```
3. **Blockchain Immutable Ledger** (Port 9000):
   ```cmd
   cd block && node server.js
   ```
4. **React Frontend** (Port 5173):
   ```cmd
   cd frontend && npm run dev
   ```

---

## 🌐 Port Mapping & Endpoints

| Service | Port | Endpoint URL | Description |
|---|---|---|---|
| **Frontend UI** | `5173` | [http://localhost:5173](http://localhost:5173) | React 19 + TailwindCSS Web Portal |
| **AI Threat Engine** | `5000` | [http://localhost:5000/health](http://localhost:5000/health) | Scikit-Learn TF-IDF + Defence Heuristics |
| **IPFS Gateway** | `8000` | [http://localhost:8000/](http://localhost:8000/) | Content Identifier (CID) Storage & Auth |
| **Blockchain API** | `9000` | [http://localhost:9000/getcids](http://localhost:9000/getcids) | Ethereum Smart Contract / Immutable Ledger |

---

## 🔑 Demo Credentials (Pre-Seeded)

### 1. Defence Personnel / Veteran Account:
- **Email:** `officer@army.mil`
- **Password:** `Password123`
- *(Or use the 1-Click "Quick Fill" button on the login screen)*

### 2. CERT-Army / DCA Official Command:
- **Official ID:** `ARMY-CERT-01`
- **Department:** `defense`
- **Password:** `DefShield@2025`
- **Two-Factor Code (2FA):** `123456` or the dispatched SMS code
- *(Or use the 1-Click "Quick Fill" button on the official login screen)*

---

## 🧠 Phase 2: Chat-History Analysis (RAG + HistGradientBoosting)

Chat histories follow a ConvoSentinel-style three-stage pipeline (`ml_service/rag.py`). Retrieval adds context, and a gradient-boosted model makes the risk decision.

1. **Message-level detector.** The Level-1 risk model and the intent layer flag each message from the other person that looks like a request for sensitive information (SI).
2. **RAG module.** Each message, its context snippet (with the two previous turns) and the whole conversation are matched against a labelled knowledge base of known cases. Matching uses TF-IDF and 128-d LSA embeddings with cosine k-NN. The knowledge base is an independent, message-labelled synthetic corpus plus the curated threat dataset. Votes are weighted by similarity and shrunk towards the prior when nothing similar exists.
3. **Conversation-level decision.** A bagged, monotone-constrained, ordinal `HistGradientBoostingClassifier` decides LOW / MEDIUM / HIGH. P(≥MEDIUM) uses the 54 Level-1 and shield features. P(HIGH), the CERT-Army escalation decision, also uses the 10 RAG features. The retrieved cases are returned as the explanation (`counter_intel.rag`) and shown as "Similar Known Cases".

Retraining: `cd ml_service && python train_conversation.py`. This builds `models/rag_kb.joblib` and `models/conversation_model.joblib`. Training rows get RAG features under a random similarity cap, so the model learns the retrieval quality of real chats rather than the verbatim twins in a synthetic corpus.

Analysts can add confirmed cases to the RAG memory without retraining: `POST /rag/cases` (localhost or `X-Admin-Token`) with `{transcript, me, tier, category}`. `GET /rag/stats` reports the knowledge-base size.

| 160 hand-written conversations (never trained on) | before RAG | with RAG |
|---|---|---|
| Band accuracy (LOW / MEDIUM / HIGH) | 131 / 160 | 135 / 160 |
| Escalation decision correct | 144 / 160 | 147 / 160 |
| False escalations | 11 | 7 |
| Missed escalations | 5 | 6 |

---

## 🧪 Automated Integration Tests

Run the full end-to-end integration test suite verifying all 12 system pipelines:
```cmd
node test_integration.js
```
