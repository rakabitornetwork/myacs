# Buat paket deploy untuk upload manual ke VPS (WinSCP / FileZilla)
# Usage: .\scripts\package-release.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $Root 'dist'
$ZipPath = Join-Path $Dist 'myacs-release.zip'
$Stage = Join-Path $Dist 'stage'

Push-Location $Root

Write-Host '>> npm ci && npm run build' -ForegroundColor Cyan
npm ci
npm run build

if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Path $Stage | Out-Null

$exclude = @('node_modules', 'dist', '.git', 'uploads', 'logs', '.env')
Get-ChildItem $Root | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item $_.FullName -Destination (Join-Path $Stage $_.Name) -Recurse -Force
}

New-Item -ItemType Directory -Path (Join-Path $Stage 'uploads/firmware') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Stage 'uploads/cpe') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Stage 'logs') -Force | Out-Null

Write-Host '>> npm ci --omit=dev di paket' -ForegroundColor Cyan
Push-Location $Stage
npm ci --omit=dev
Pop-Location

if (-not (Test-Path $Dist)) { New-Item -ItemType Directory -Path $Dist | Out-Null }
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }

Write-Host '>> compress...' -ForegroundColor Cyan
Compress-Archive -Path (Join-Path $Stage '*') -DestinationPath $ZipPath -Force
Remove-Item -Recurse -Force $Stage

$sizeMb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
Write-Host ">> Selesai: $ZipPath ($sizeMb MB)" -ForegroundColor Green
Write-Host '   1. Upload zip ke VPS'
Write-Host '   2. unzip -d /var/www/myacs'
Write-Host '   3. cp .env.production.dual .env && nano .env'
Write-Host '   4. bash deploy/post-deploy.sh'
Write-Host '   5. setup Apache: deploy/apache/myacs.conf (lihat deploy/PORTS.md)'

Pop-Location
