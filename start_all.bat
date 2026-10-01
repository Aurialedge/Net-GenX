@echo off
title NetGenX Defence Cyber Shield Launcher
echo ====================================================================
echo  NETGENX: AI-Enabled Cyber Incident Web Portal for Defence 🛡️
echo  Launching Full Stack Services (ML + IPFS + Blockchain + Frontend)
echo ====================================================================

:: 1. Start AI/ML Microservice on Port 5000
echo [*] Starting AI/ML Threat Analysis Engine (Port 5000)...
start "NetGenX AI Engine (Port 5000)" cmd /k "cd ml_service && python app.py"

:: 2. Start IPFS & Security Backend on Port 8000
echo [*] Starting IPFS & Security Backend (Port 8000)...
start "NetGenX IPFS Gateway (Port 8000)" cmd /k "cd ipfs && node server.js"

:: 3. Start Blockchain Ledger Service on Port 9000
echo [*] Starting Blockchain Immutable Ledger Service (Port 9000)...
start "NetGenX Blockchain Ledger (Port 9000)" cmd /k "cd block && node server.js"

:: 4. Start React Frontend on Port 5173
echo [*] Starting React 19 Frontend (Port 5173)...
start "NetGenX Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo ====================================================================
echo  All 4 NetGenX Services Successfully Launched!
echo   - Frontend:   http://localhost:5173
echo   - AI Engine:  http://localhost:5000/health
echo   - IPFS Core:  http://localhost:8000/
echo   - Blockchain: http://localhost:9000/
echo ====================================================================
