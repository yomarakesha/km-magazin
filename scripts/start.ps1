# Starts the KM site: FastAPI backend (:8000) + Next.js frontend (:3000).
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\start.ps1
#         (or right-click → Run with PowerShell)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$py = Join-Path $backend ".venv\Scripts\python.exe"

Write-Host "KM site launcher" -ForegroundColor Green

# --- Backend deps ---
if (-not (Test-Path $py)) {
  Write-Host "Creating Python venv..." -ForegroundColor Cyan
  py -m venv (Join-Path $backend ".venv")
  & $py -m pip install --upgrade pip -q
  & $py -m pip install -r (Join-Path $backend "requirements.txt")
}

# --- Backend env ---
if (-not (Test-Path (Join-Path $backend ".env"))) {
  Write-Host "backend\.env missing. Run scripts\create-admin.ps1 first." -ForegroundColor Yellow
}

# --- Seed if DB absent ---
if (-not (Test-Path (Join-Path $backend "data\km.db"))) {
  Write-Host "Seeding database..." -ForegroundColor Cyan
  Push-Location $root
  npm run dump:seed
  Pop-Location
  Push-Location $backend
  & $py -m app.seed
  Pop-Location
}

# --- Frontend deps ---
if (-not (Test-Path (Join-Path $root "node_modules"))) {
  Write-Host "Installing npm packages..." -ForegroundColor Cyan
  Push-Location $root
  npm install
  Pop-Location
}

# --- Launch both in separate windows ---
Write-Host "Starting backend  → http://localhost:8000" -ForegroundColor Green
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$backend'; & '$py' -m uvicorn app.main:app --reload --port 8000"
)

Write-Host "Starting frontend → http://localhost:3000" -ForegroundColor Green
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$root'; npm run dev"
)

Write-Host ""
Write-Host "Site:  http://localhost:3000" -ForegroundColor Green
Write-Host "Admin: http://localhost:3000/admin" -ForegroundColor Green
Write-Host "Two windows opened. Close them to stop the servers." -ForegroundColor DarkGray
