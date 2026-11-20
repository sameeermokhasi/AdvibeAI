@echo off
title Advibe AI OS Launcher
echo ============================================================
echo   Starting Advibe AI OS Services
echo ============================================================

echo [1/2] Launching Backend Server on http://127.0.0.1:8000 ...
start "Advibe Backend (Port 8000)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

%SystemRoot%\System32\ping.exe 127.0.0.1 -n 3 >nul

echo [2/2] Launching Frontend Server ...
start "Advibe Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo ============================================================
echo   Both services launched successfully!
echo   Frontend: http://localhost:3000
echo   Backend:  http://127.0.0.1:8000/docs
echo ============================================================
