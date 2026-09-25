# KM Site - zapusk (Windows)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\start.ps1
#        (ili pravoj knopkoj - Zapustit s PowerShell)
#
# Script:
#   1. Sozdaet backend\.env s sluchajnymi klyuchami (esli net)
#   2. Sozdaet Python venv i stavit zavisimosti
#   3. Zapolnyaet BD demo-dannymi (esli net km.db)
#   4. Zapuskaet backend :8000

$ErrorActionPreference = "Stop"
$root    = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$venv    = Join-Path $backend ".venv"
$py      = Join-Path $venv "Scripts\python.exe"
$envFile = Join-Path $backend ".env"
$db      = Join-Path $backend "data\km.db"
$req     = Join-Path $backend "requirements.txt"
# Hash requirements.txt, chtoby venv, sobrannyj do dobavleniya paketa, dostroilsya
$reqStamp = Join-Path $venv ".requirements.sha"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  KM Site - zapusk"                       -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# ── 1. backend/.env ───────────────────────────────────────────────────────────
if (-not (Test-Path $envFile)) {
    Write-Host "[1/4] Sozdaem backend\.env..." -ForegroundColor Cyan

    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()

    # Otkrytyj parol po umolchaniyu - zadaj svoj v backend\.env pered prodakshnom.
    $adminPwd = "admin"

    $skBytes = New-Object byte[] 48
    $rng.GetBytes($skBytes)
    $secretKey = [Convert]::ToBase64String($skBytes)


    $lines = @(
        "ADMIN_PASSWORD=$adminPwd",
        "SECRET_KEY=$secretKey",
        "FRONTEND_ORIGIN=http://localhost:3000",
        "PUBLIC_URL=http://localhost:8000",
        "COOKIE_SECURE=false"
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($envFile, $lines, $utf8NoBom)


    Write-Host ""
    Write-Host "  *** PAROL ADMINISTRATORA: $adminPwd ***" -ForegroundColor Yellow
    Write-Host "  Login: admin / $adminPwd" -ForegroundColor Yellow
    Write-Host "  (sohranyon v backend\.env)" -ForegroundColor DarkGray
    Write-Host "  VNIMANIE: parol po umolchaniyu 'admin' - SMENITE v backend\.env pered publikatsiej!" -ForegroundColor Red
    Write-Host ""
} else {
    Write-Host "[1/4] backend\.env uzhe est - propuskaem" -ForegroundColor DarkGray
    $existingPwd = Get-Content $envFile | Where-Object { $_ -match '^ADMIN_PASSWORD=' }
    if ($existingPwd) {
        $existingPwd = $existingPwd -replace '^ADMIN_PASSWORD=', ''
        Write-Host "  Tekushij parol admin: $existingPwd" -ForegroundColor DarkGray
    }
}

# Proveryaem obyazatelnye klyuchi (zashchita ot chastichnogo .env)
$envText = Get-Content $envFile
foreach ($key in @("ADMIN_PASSWORD", "SECRET_KEY")) {
    if (-not ($envText | Where-Object { $_ -match "^$key=.+" })) {
        Write-Host "OSHIBKA: v backend\.env net $key (ili pustoj). Udalite .env i perezapustite." -ForegroundColor Red
        exit 1
    }
}

# ── 2. Python venv + zavisimosti ─────────────────────────────────────────────
if (-not (Test-Path $py)) {
    Write-Host "[2/4] Sozdaem Python venv..." -ForegroundColor Cyan

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
    & $py -m pip install -r $req
    # pip - native exe: oshibka ne brosaet isklyuchenie, proveryaem kod vyhoda.
    # Esli deps ne stali (net seti) - udalyaem nepolnyj venv, chtoby sleduyushij zapusk povtoril.
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Oshibka ustanovki Python-zavisimostej. Udalyayu nepolnyj venv." -ForegroundColor Red
        Remove-Item -Recurse -Force $venv -ErrorAction SilentlyContinue
        exit 1
    }
    (Get-FileHash $req -Algorithm SHA256).Hash | Set-Content $reqStamp -Encoding utf8
    Write-Host "[2/4] Python zavisimosti ustanovleny." -ForegroundColor Green
} elseif ((-not (Test-Path $reqStamp)) -or
          ((Get-Content $reqStamp -Raw).Trim() -ne (Get-FileHash $req -Algorithm SHA256).Hash)) {
    # venv sobran do togo, kak v requirements.txt dobavili paket - dostavlyaem
    Write-Host "[2/4] requirements.txt izmenilsya - dostavlyaem zavisimosti..." -ForegroundColor Cyan
    & $py -m pip install -r $req
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Oshibka ustanovki Python-zavisimostej. Venv ostavlen kak est." -ForegroundColor Red
        Write-Host "Proverte set i perezapustite." -ForegroundColor Red
        exit 1
    }
    (Get-FileHash $req -Algorithm SHA256).Hash | Set-Content $reqStamp -Encoding utf8
    Write-Host "[2/4] Python zavisimosti obnovleny." -ForegroundColor Green
} else {
    Write-Host "[2/4] Python venv aktualen - propuskaem" -ForegroundColor DarkGray
}

# ── 3. Seed demo-dannyh ───────────────────────────────────────────────────────
if (-not (Test-Path $db)) {
    Write-Host "[3/4] Zapolnyaem BD demo-dannymi..." -ForegroundColor Cyan
    $dataDir = Join-Path $backend "data"
    if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
    Push-Location $backend
    & $py -m app.seed_demo
    Pop-Location
    Write-Host "[3/4] BD sozdana s demo-dannymi." -ForegroundColor Green
} else {
    Write-Host "[3/4] BD uzhe sushchestvuet - propuskaem seed" -ForegroundColor DarkGray
}

# ── 4. Zapusk servera ────────────────────────────────────────────────────────
Write-Host "[4/4] Zapuskaem backend..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Write-Host 'Backend :8000' -ForegroundColor Green; Set-Location '$backend'; & '$py' -m uvicorn app.main:app --reload --port 8000"
)

# ── Smoke: zhdem zhivoj otvet, a ne prosto zapushchennyj process ─────────────
# Port mozhet slushatsya ranshe, chem prilozhenie gotovo otvechat - oprashivaem.
function Wait-For {
    param([string]$Url, [string]$Name, [int]$Tries = 60)
    for ($i = 0; $i -lt $Tries; $i++) {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null
            Write-Host "  OK   $Name otvechaet" -ForegroundColor Green
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    Write-Host "  SBOJ: $Name ne otvetil za $Tries sek ($Url)" -ForegroundColor Red
    return $false
}

Write-Host ""
Write-Host "Proveryaem, chto backend podnyalsya..." -ForegroundColor Cyan
$backendOk  = Wait-For -Url "http://localhost:8000/docs" -Name "backend"

if (-not $backendOk) {
    Write-Host ""
    Write-Host "Zapusk ne udalsya - smotrite oshibki v okne backend." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  API:    http://localhost:8000/docs"     -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend zapushchen v otdelnom okne. Zakrojte ego chtoby ostanovit server." -ForegroundColor DarkGray
Write-Host ""
