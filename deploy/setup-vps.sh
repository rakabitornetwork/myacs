#!/bin/bash
# Setup awal MyACS di VPS Ubuntu/Debian
# Jalankan sebagai root atau dengan sudo: bash deploy/setup-vps.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/myacs}"
APP_USER="${APP_USER:-www-data}"
DOMAIN="${DOMAIN:-myacs.teslatech.my.id}"

echo "==> MyACS VPS Setup"
echo "    APP_DIR=$APP_DIR"
echo "    DOMAIN=$DOMAIN"

if ! command -v node >/dev/null 2>&1; then
  echo "==> Install Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Install PM2..."
  npm install -g pm2
  pm2 startup systemd -u "${SUDO_USER:-root}" --hp "$(eval echo ~${SUDO_USER:-root})" || true
fi

if ! command -v mongod >/dev/null 2>&1; then
  echo "==> MongoDB tidak ditemukan."
  echo "    Install: https://www.mongodb.com/docs/manual/administration/install-on-linux/"
  echo "    Atau gunakan MongoDB Atlas dan set MONGODB_URI di .env"
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "==> Install Nginx..."
  apt-get update
  apt-get install -y nginx
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "==> Install Certbot..."
  apt-get install -y certbot python3-certbot-nginx
fi

echo "==> Buat direktori aplikasi..."
mkdir -p "$APP_DIR"/{uploads/firmware,uploads/cpe,logs}
chown -R "$APP_USER:$APP_USER" "$APP_DIR" 2>/dev/null || true

if [ -f deploy/nginx/myacs.conf ]; then
  echo "==> Install konfigurasi Nginx..."
  sed "s|/var/www/myacs|$APP_DIR|g" deploy/nginx/myacs.conf > /etc/nginx/sites-available/myacs
  ln -sf /etc/nginx/sites-available/myacs /etc/nginx/sites-enabled/myacs
  nginx -t
fi

echo ""
echo "==> Langkah manual berikutnya:"
echo "  1. Deploy kode ke $APP_DIR (rsync / git pull)"
echo "  2. cp .env.production.dual $APP_DIR/.env && nano $APP_DIR/.env"
echo "  3. cd $APP_DIR && npm ci --omit=dev"
echo "  4. certbot --nginx -d $DOMAIN"
echo "  5. pm2 start ecosystem.config.cjs --env production  # PORT 3001"
echo "  6. pm2 save"
echo ""
echo "  Apache (domain myacs.teslatech.my.id):"
echo "    cp deploy/apache/myacs.conf /etc/apache2/sites-available/"
echo "    a2enmod proxy proxy_http ssl && a2ensite myacs"
echo ""
echo "  Firewall:"
echo "    ufw allow 443/tcp    # MyACS HTTPS"
echo "    ufw allow 7547/tcp   # GenieACS CWMP (CPE lama)"
echo "    ufw allow 7557/tcp   # GenieACS NBI (opsional, restrict ke LAN)"
echo ""
echo "  CPE baru ACS URL: https://$DOMAIN/cwmp"
