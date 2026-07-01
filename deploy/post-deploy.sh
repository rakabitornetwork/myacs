#!/bin/bash
# Jalankan di VPS setelah rsync/git pull
set -euo pipefail

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

echo "==> MyACS post-deploy di $APP_ROOT"

if [ ! -f .env ]; then
  if [ -f .env.production.dual ]; then
    echo "==> .env tidak ada — salin dari .env.production.dual"
    cp .env.production.dual .env
    echo "    PENTING: edit .env (SESSION_SECRET, dll) sebelum production!"
  else
    echo "ERROR: file .env tidak ditemukan"
    exit 1
  fi
fi

export NODE_ENV=production

echo "==> Validasi environment..."
node scripts/check-env.js || true

echo "==> Install dependencies..."
if [ ! -d node_modules/express ]; then
  echo "    node_modules tidak lengkap — install ulang..."
  npm ci
  npm run build
else
  npm ci --omit=dev
fi

echo "==> Pastikan folder upload ada..."
mkdir -p uploads/firmware uploads/cpe logs

if [ -d public/build ] && [ -f public/build/manifest.json ]; then
  echo "==> Build assets OK"
else
  echo "==> Build assets tidak ada — jalankan 'npm run build' di mesin CI/lokal"
fi

echo "==> Reload PM2..."
if pm2 describe myacs >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --env production
else
  pm2 start ecosystem.config.cjs --env production
fi

pm2 save

echo "==> Health check..."
sleep 2
HEALTH_PORT="${PORT:-3001}"
curl -sf "http://127.0.0.1:${HEALTH_PORT}/health" | head -c 500 || echo "(health endpoint belum merespons — cek PORT di .env)"

echo ""
echo "==> Deploy selesai"
