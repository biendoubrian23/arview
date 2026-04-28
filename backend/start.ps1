# ARView backend launcher for Docker Desktop GPU.
# Usage from repo root or backend/: .\backend\start.ps1

$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repo

Write-Host ""
Write-Host " ARView GPU backend" -ForegroundColor Cyan
Write-Host " Backend : http://localhost:8050" -ForegroundColor Green
Write-Host " Docs    : http://localhost:8050/docs" -ForegroundColor Green
Write-Host ""

docker compose up --build backend
