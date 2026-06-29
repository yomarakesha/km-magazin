# Sets the admin password (and a fresh session secret) in backend\.env.
# The site uses a single admin password — this is how you "create"/change it.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\create-admin.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "backend\.env"

Write-Host "KM admin setup" -ForegroundColor Green

# --- Prompt for password (twice) ---
$p1 = Read-Host "New admin password" -AsSecureString
$p2 = Read-Host "Repeat password" -AsSecureString
$plain1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1))
$plain2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2))

if ([string]::IsNullOrWhiteSpace($plain1)) { Write-Host "Password cannot be empty." -ForegroundColor Red; exit 1 }
if ($plain1 -ne $plain2) { Write-Host "Passwords do not match." -ForegroundColor Red; exit 1 }

# --- Generate a random session secret ---
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

# --- Read existing .env (preserve other keys) ---
$map = [ordered]@{}
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') { $map[$Matches[1].Trim()] = $Matches[2] }
  }
}

# --- Apply values with sensible defaults ---
$map["ADMIN_PASSWORD"] = $plain1
$map["SECRET_KEY"]     = $secret
if (-not $map.Contains("FRONTEND_ORIGIN")) { $map["FRONTEND_ORIGIN"] = "http://localhost:3000" }
if (-not $map.Contains("PUBLIC_URL"))      { $map["PUBLIC_URL"]      = "http://localhost:8000" }
if (-not $map.Contains("COOKIE_SECURE"))   { $map["COOKIE_SECURE"]   = "false" }

# --- Write back (UTF-8 without BOM so python-dotenv reads the first key) ---
$lines = $map.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($envFile, ($lines -join "`n") + "`n", $utf8NoBom)

Write-Host ""
Write-Host "Saved to backend\.env" -ForegroundColor Green
Write-Host "Admin password updated. Restart the backend to apply." -ForegroundColor Yellow
