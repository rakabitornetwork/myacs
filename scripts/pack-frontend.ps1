# Zip public/build untuk upload ke VPS (tanpa npm di server)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $root "public\build"
$outDir = Join-Path $root "dist"
$zipPath = Join-Path $outDir "frontend-build.zip"

if (-not (Test-Path (Join-Path $buildDir "manifest.json"))) {
  Write-Host "ERROR: public/build belum ada. Jalankan: npm run build" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Compress-Archive -Path "$buildDir\*" -DestinationPath $zipPath -Force
Write-Host "OK: $zipPath"
Write-Host "Upload ke VPS, extract ke ~/public_html/public/build/"
