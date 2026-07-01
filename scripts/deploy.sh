#!/bin/bash
# Deploy MyACS ke VPS via rsync + PM2
# Usage: ./scripts/deploy.sh user@192.168.22.253 [/var/www/myacs]
set -euo pipefail

SSH_TARGET="${1:?Usage: $0 user@host [/remote/path]}"
REMOTE_PATH="${2:-/var/www/myacs}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

echo ">> npm ci && npm run build"
npm ci
npm run build

echo ">> rsync ke ${SSH_TARGET}:${REMOTE_PATH}"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .env \
  --exclude uploads \
  --exclude logs \
  ./ "${SSH_TARGET}:${REMOTE_PATH}/"

echo ">> post-deploy di VPS"
ssh "$SSH_TARGET" "cd $REMOTE_PATH && bash deploy/post-deploy.sh"

echo "Deploy selesai."
