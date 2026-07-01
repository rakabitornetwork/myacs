#!/bin/bash
# Diagnosa & pulihkan MyACS setelah 502 — jalankan di VPS sebagai user myacs
set -euo pipefail

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

echo "=== MyACS diagnose @ $APP_ROOT ==="
echo ""

echo "-- PM2 status --"
pm2 status myacs 2>/dev/null || pm2 status || true
echo ""

echo "-- PORT dari .env --"
if [ -f .env ]; then
  grep -E '^(PORT|APP_URL|NODE_ENV)=' .env || true
else
  echo "ERROR: .env tidak ada!"
fi
echo ""

echo "-- node_modules --"
if [ -d node_modules/express ]; then
  echo "express: OK"
else
  echo "express: MISSING — jalankan npm ci --omit=dev"
fi
echo ""

echo "-- public/build --"
if [ -f public/build/manifest.json ]; then
  echo "manifest.json: OK"
else
  echo "manifest.json: MISSING (UI perlu upload dari PC, bukan penyebab 502)"
fi
echo ""

echo "-- Health lokal --"
HEALTH_PORT="$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 || echo 3001)"
HEALTH_PORT="${HEALTH_PORT:-3001}"
curl -sf "http://127.0.0.1:${HEALTH_PORT}/health" && echo "" || echo "TIDAK MERESPONS di port ${HEALTH_PORT}"
echo ""

echo "-- PM2 error log (10 baris terakhir) --"
pm2 logs myacs --err --lines 10 --nostream 2>/dev/null || true
echo ""

if [ "${1:-}" = "--fix" ]; then
  echo "=== Memulihkan MyACS ==="
  export NODE_ENV=production
  mkdir -p logs uploads/firmware uploads/cpe
  npm ci --omit=dev
  pm2 delete myacs 2>/dev/null || true
  pm2 start ecosystem.config.cjs --env production
  pm2 save
  sleep 2
  curl -sf "http://127.0.0.1:${HEALTH_PORT}/health" && echo "" || echo "Masih gagal — kirim output pm2 logs ke admin"
  echo "=== Selesai ==="
else
  echo "Untuk auto-fix: bash scripts/vps-diagnose.sh --fix"
fi
