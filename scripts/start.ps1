# KM Site - zapusk (Windows)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\start.ps1
#        (ili pravoj knopkoj - Zapustit s PowerShell)
#
# Script:
#   1. Sozdaet backend\.env s sluchajnymi klyuchami (esli net)
#   2. Sozdaet Python venv i stavit zavisimosti
#   3. Stavit npm pakety
#   4. Zapolnyaet BD demo-dannymi (esli net km.db)
#   5. Zapuskaet backend :8000 i frontend :3000

$ErrorActionPreference = "Stop"
$root    = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$venv    = Join-Path $backend ".venv"
$py      = Join-Path $venv "Scripts\python.exe"
$envFile = Join-Path $backend ".env"
$db      = Join-Path $backend "data\km.db"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  KM Site - zapusk"                       -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# ── 1. backend/.env ───────────────────────────────────────────────────────────
if (-not (Test-Path $envFile)) {
    Write-Host "[1/5] Sozdaem backend\.env..." -ForegroundColor Cyan

    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()

    $pwBytes = New-Object byte[] 12
    $rng.GetBytes($pwBytes)
    $adminPwd = [Convert]::ToBase64String($pwBytes)
    $adminPwd = $adminPwd -replace '[+/=]', ''
    if ($adminPwd.Length -gt 16) { $adminPwd = $adminPwd.Substring(0, 16) }

    $skBytes = New-Object byte[] 48
    $rng.GetBytes($skBytes)
    $secretKey = [Convert]::ToBase64String($skBytes)

    $lines = @(
        "ADMIN_PASSWORD=$adminPwd",
        "SECRET_KEY=$secretKey",
        "FRONTEND_ORIGIN=http://localhost:3000",
        "PUBLIC_URL=http://localhost:8000",
        "COOKIE_SECURE=false",
        "REVALIDATE_SECRET="
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($envFile, $lines, $utf8NoBom)

    Write-Host ""
    Write-Host "  *** PAROL ADMINISTRATORA: $adminPwd ***" -ForegroundColor Yellow
    Write-Host "  Login: admin / $adminPwd" -ForegroundColor Yellow
    Write-Host "  (sohranyon v backend\.env)" -ForegroundColor DarkGray
    Write-Host ""
} else {
    Write-Host "[1/5] backend\.env uzhe est - propuskaem" -ForegroundColor DarkGray
    $existingPwd = Get-Content $envFile | Where-Object { $_ -match '^ADMIN_PASSWORD=' }
    if ($existingPwd) {
        $existingPwd = $existingPwd -replace '^ADMIN_PASSWORD=', ''
        Write-Host "  Tekushij parol admin: $existingPwd" -ForegroundColor DarkGray
    }
}

# ── 2. Python venv + zavisimosti ─────────────────────────────────────────────
if (-not (Test-Path $py)) {
    Write-Host "[2/5] Sozdaem Python venv..." -ForegroundColor Cyan

    $pyCmd = $null
    foreach ($candidate in @("py", "python3", "python")) {
        try {
            $ver = & $candidate --version 2>&1
            if ($ver -match "Python 3") {
                $pyCmd = $candidate
                break
            }
        } catch {}
    }
    if (-not $pyCmd) {
        Write-Host "Python 3 ne najden. Skachaite s https://python.org/downloads/" -ForegroundColor Red
        pause
        exit 1
    }

    & $pyCmd -m venv $venv
    & $py -m pip install --upgrade pip -q
    & $py -m pip install -r (Join-Path $backend "requirements.txt")
    Write-Host "[2/5] Python zavisimosti ustanovleny." -ForegroundColor Green
} else {
    Write-Host "[2/5] Python venv uzhe est - proveryaem zavisimosti..." -ForegroundColor DarkGray
    & $py -m pip install -q -r (Join-Path $backend "requirements.txt")
}

# ── 3. npm zavisimosti ────────────────────────────────────────────────────────
if (-not (Test-Path (Join-Path $root "node_modules"))) {
    Write-Host "[3/5] Ustanavlivaem npm pakety..." -ForegroundColor Cyan
    Push-Location $root
    npm install
    Pop-Location
    Write-Host "[3/5] npm pakety ustanovleny." -ForegroundColor Green
} else {
    Write-Host "[3/5] node_modules uzhe est - propuskaem" -ForegroundColor DarkGray
}

# ── 4. Seed demo-dannyh ───────────────────────────────────────────────────────
if (-not (Test-Path $db)) {
    Write-Host "[4/5] Zapolnyaem BD demo-dannymi..." -ForegroundColor Cyan
    $dataDir = Join-Path $backend "data"
    if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
    Push-Location $backend
    & $py -m app.seed_demo
    Pop-Location
    Write-Host "[4/5] BD sozdana s demo-dannymi." -ForegroundColor Green
} else {
    Write-Host "[4/5] BD uzhe sushchestvuet - propuskaem seed" -ForegroundColor DarkGray
}

# ── 5. Zapusk serverov ────────────────────────────────────────────────────────
Write-Host "[5/5] Zapuskaem servery..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Write-Host 'Backend :8000' -ForegroundColor Green; Set-Location '$backend'; & '$py' -m uvicorn app.main:app --reload --port 8000"
)

Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Write-Host 'Frontend :3000' -ForegroundColor Green; Set-Location '$root'; npm run dev"
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Sajt:   http://localhost:3000"          -ForegroundColor Green
Write-Host "  Admin:  http://localhost:3000/admin"    -ForegroundColor Green
Write-Host "  API:    http://localhost:8000/docs"     -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Otkryty dva okna. Zakrojte ih chtoby ostanovit servery." -ForegroundColor DarkGray
Write-Host ""
