@echo off
setlocal enabledelayedexpansion
:: Title must NOT start with "NetGenX" - :stop_services closes windows by that prefix
title Launcher - NetGenX Defence Cyber Shield

:: ====================================================================
::  NetGenX one-command launcher
::    start.bat          install missing deps, (re)start every service
::    start.bat stop     stop every service
:: ====================================================================

:: Always run from the project root
cd /d "%~dp0"

set "PORTS=5000 8000 8545 9000 5173"

if /i "%~1"=="stop" (
    call :stop_services
    echo All NetGenX services stopped.
    exit /b 0
)

echo ====================================================================
echo   NETGENX: AI-Enabled Cyber Incident Web Portal for Defence
echo   Full Stack Multi-Service Launcher
echo ====================================================================
echo.

:: ---------------------------------------------------------------
:: 1. Prerequisites
:: ---------------------------------------------------------------
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python was not found in PATH. Install Python 3.10+.
    pause
    exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found in PATH. Install Node.js v18+.
    pause
    exit /b 1
)
echo [*] Python and Node.js detected.

:: ---------------------------------------------------------------
:: 2. Dependencies (installed only when missing)
:: ---------------------------------------------------------------
python -c "import flask, flask_cors, sklearn, pandas, joblib, requests" >nul 2>nul
if errorlevel 1 (
    echo [*] Installing AI engine Python dependencies...
    python -m pip install -r "%~dp0ml_service\requirements.txt"
)

for %%d in (frontend ipfs block) do (
    if not exist "%~dp0%%d\node_modules\" (
        echo [*] Installing npm packages for %%d...
        pushd "%~dp0%%d"
        call npm install
        popd
    )
)

if not exist "%~dp0ipfs\.env" (
    echo [WARN] ipfs\.env not found - MongoDB Atlas, Gemini and Twilio features
    echo        will be disabled; users are stored in ipfs\data\*.json instead.
)

:: ---------------------------------------------------------------
:: 3. Clear any previous run so the ports are free
:: ---------------------------------------------------------------
call :stop_services
echo.

:: ---------------------------------------------------------------
:: 4. Start services
:: ---------------------------------------------------------------
echo [1/5] AI Engine + Counter-Intelligence Shield (port 5000)...
start "NetGenX AI Engine (Port 5000)" cmd /k "cd /d "%~dp0ml_service" && python app.py"

echo [2/5] Local Ethereum chain - Hardhat (port 8545)...
start "NetGenX Hardhat Chain (Port 8545)" cmd /k "cd /d "%~dp0block" && npx hardhat node"
call :wait_port 8545 60
if errorlevel 1 (
    echo [WARN] Chain did not start - ledger will use local fallback storage.
) else (
    echo       Chain is up - deploying CIDStorage contract...
    pushd "%~dp0block"
    call npx hardhat run scripts/deploy.js --network localhost
    if errorlevel 1 echo [WARN] Contract deploy failed - ledger will use local fallback storage.
    popd
)

echo [3/5] Blockchain Ledger API (port 9000)...
start "NetGenX Blockchain Ledger (Port 9000)" cmd /k "cd /d "%~dp0block" && node server.js"

echo [4/5] IPFS Storage ^& Security Gateway (port 8000)...
start "NetGenX IPFS Gateway (Port 8000)" cmd /k "cd /d "%~dp0ipfs" && node server.js"

echo [5/5] React Frontend Portal (port 5173)...
start "NetGenX Frontend UI (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: ---------------------------------------------------------------
:: 5. Wait for every service, then open the portal
:: ---------------------------------------------------------------
echo.
echo [*] Waiting for services to come online...
set "FAILED="
for %%p in (%PORTS%) do (
    call :wait_port %%p 90
    if errorlevel 1 (
        echo       port %%p  ... NOT RESPONDING
        set "FAILED=!FAILED! %%p"
    ) else (
        echo       port %%p  ... online
    )
)

echo.
echo ====================================================================
if defined FAILED (
    echo   [WARN] Not running on port^(s^):!FAILED! - check that service's window.
) else (
    echo   All NetGenX services are online.
)
echo ====================================================================
echo   - Web Portal UI:     http://localhost:5173
echo   - AI Threat Engine:  http://localhost:5000/health
echo   - IPFS Core Gateway: http://localhost:8000/
echo   - Blockchain Ledger: http://localhost:9000/
echo   - Ethereum RPC:      http://127.0.0.1:8545
echo ====================================================================
echo   DEMO CREDENTIALS
echo   Personnel / Veteran:  officer@army.mil / Password123
echo   CERT-Army Official:   ARMY-CERT-01 (defense) / DefShield@2025
echo                         2FA OTP: 123456
echo ====================================================================
echo   Stop everything with:  start.bat stop
echo ====================================================================

start "" http://localhost:5173
exit /b 0


:: ===================================================================
:: Subroutines
:: ===================================================================

:: Kill whatever is listening on the NetGenX ports
:stop_services
:: Close the service console windows opened by a previous run (cmd.exe only)
taskkill /F /T /FI "IMAGENAME eq cmd.exe" /FI "WINDOWTITLE eq NetGenX*" >nul 2>&1
for %%p in (%PORTS%) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":%%p .*LISTENING"') do (
        echo [*] Stopping process on port %%p ^(PID %%a^)...
        taskkill /F /T /PID %%a >nul 2>&1
    )
)
exit /b 0

:: wait_port <port> <max-seconds>  -> errorlevel 0 when listening, 1 on timeout
:wait_port
set /a _waited=0
:wait_port_loop
netstat -ano | findstr /r /c:":%~1 .*LISTENING" >nul 2>nul
if not errorlevel 1 exit /b 0
set /a _waited+=1
if !_waited! GEQ %~2 exit /b 1
ping -n 2 127.0.0.1 >nul
goto wait_port_loop
