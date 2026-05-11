#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/home/cyb0rg/ptf-verseny-majus"
SERVICE="majusi.service"

cd "$APP_DIR"

echo "[deploy] Pulling latest code..."
git pull --ff-only

echo "[deploy] Installing deps..."
pnpm install --frozen-lockfile

echo "[deploy] Building..."
pnpm build

echo "[deploy] Restarting service..."
sudo systemctl restart "$SERVICE"

echo "[deploy] Done. Status:"
sudo systemctl --no-pager --full status "$SERVICE"
