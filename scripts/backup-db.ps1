# Snapshot the SQLite database with VACUUM INTO (safe against concurrent
# writers) and prune old snapshots. Schedule via Windows Task Scheduler, e.g.:
#   schtasks /create /tn "km-db-backup" /sc daily /st 03:00 /tr `
#     "powershell -ExecutionPolicy Bypass -File C:\...\km-site\scripts\backup-db.ps1"
param(
    [int]$RetentionDays = 14,
    [string]$DbPath = "",
    [string]$BackupDir = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot   # repo root (scripts/..)

if (-not $DbPath)    { $DbPath = Join-Path $root "backend\data\km.db" }
if (-not $BackupDir) { $BackupDir = Join-Path $root "backup" }

if (-not (Test-Path $DbPath)) { throw "Database not found: $DbPath" }
New-Item -ItemType Directory -Force $BackupDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$target = Join-Path $BackupDir "km-$stamp.db"

# VACUUM INTO via the backend venv's python: no sqlite3.exe dependency,
# produces a compacted, consistent snapshot even while uvicorn is running.
$python = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $python)) { $python = "python" }

& $python -c "import sqlite3, sys; con = sqlite3.connect(sys.argv[1]); con.execute('VACUUM INTO ?', (sys.argv[2],)); con.close()" $DbPath $target
if ($LASTEXITCODE -ne 0) { throw "VACUUM INTO failed (exit $LASTEXITCODE)" }

Write-Host "Backup written: $target"

# retention: drop snapshots older than N days
$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem $BackupDir -Filter "km-*.db" | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    Write-Host "Pruning old backup: $($_.Name)"
    Remove-Item $_.FullName -Force
}
