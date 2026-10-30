#!/bin/bash
# JSONSheet deploy — build locally, upload, atomic symlink switch, nginx reload.
# Usage: bash deploy/deploy.sh   (run from repo root: E:\AI_van_hanh)
set -euo pipefail

VPS_HOST="aivh"
APP_DIR="apps/jsonsheet"
REMOTE_BASE="/var/www/jsonsheet"
NGINX_CONF_LOCAL="deploy/nginx-jsonsheet.conf"
TS="$(date +%Y%m%d-%H%M%S)"

echo "==> [1/5] Test + build"
cd "$APP_DIR"
export NEXT_PUBLIC_GA_ID="G-ZTXGE1VT4Y"
npm test
npm run build
cd - >/dev/null

echo "==> [2/5] Upload out -> releases/$TS"
ssh "$VPS_HOST" "mkdir -p $REMOTE_BASE/releases/$TS"
tar -C "$APP_DIR/out" -cf - . | ssh "$VPS_HOST" "tar -xf - -C $REMOTE_BASE/releases/$TS"

echo "==> [3/5] Switch symlink"
ssh "$VPS_HOST" "ln -sfn $REMOTE_BASE/releases/$TS $REMOTE_BASE/current"

echo "==> [4/5] Nginx config (only if changed)"
scp -q "$NGINX_CONF_LOCAL" "$VPS_HOST:/etc/nginx/sites-available/jsonsheet"
ssh "$VPS_HOST" "ln -sfn /etc/nginx/sites-available/jsonsheet /etc/nginx/sites-enabled/jsonsheet; nginx -t"

echo "==> [5/5] Reload nginx"
ssh "$VPS_HOST" "systemctl reload nginx"

echo "==> [6/6] IndexNow ping (Bing, Yandex, …)"
bash deploy/indexnow.sh

echo "==> Verify: https://jsonsheet.com"
curl -sI --max-time 15 https://jsonsheet.com | head -3
echo "Deployed release $TS ✔"
