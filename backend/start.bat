@echo off
setlocal
cd /d "%~dp0\.."
echo.
echo  ARView GPU backend
echo  Backend : http://localhost:8050
echo  Docs    : http://localhost:8050/docs
echo.
docker compose up --build backend
