@echo off
setlocal
cd /d "%~dp0"

:: Add TripoSR to Python path so "from tsr.system import TSR" works
set PYTHONPATH=%~dp0TripoSR;%PYTHONPATH%

echo.
echo  ScanAR Backend
echo  Mode: %SCAN_MODE%
echo  URL:  http://localhost:8000
echo  Docs: http://localhost:8000/docs
echo.

:: Install TripoSR if not present
if not exist "TripoSR" (
    echo [setup] Cloning TripoSR...
    git clone https://github.com/SUDO-AI-3D/TripoSR.git
    echo [setup] Installing TripoSR...
    pip install -e TripoSR/
)

:: Start FastAPI server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
