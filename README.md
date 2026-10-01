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

To start all 4 microservices simultaneously on Windows:
```cmd
start_all.bat
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

## 🧪 Automated Integration Tests

Run the full end-to-end integration test suite verifying all 12 system pipelines:
```cmd
node test_integration.js
```
