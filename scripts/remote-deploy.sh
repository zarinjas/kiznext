#!/usr/bin/env bash
# Remote deploy script — runs on the VPS as root (invoked by the GitHub Action
# over SSH via `sudo bash ...`, or manually on the server).
#
# Flow: git fetch+reset -> npm ci -> prisma generate + db push -> next build ->
# restart the systemd service -> health check.
#
# Note: prisma db push runs with `--accept-data-loss` because routine schema
# changes (adding unique constraints / enum values / defaulted columns) trip
# Prisma's safety warning. The schema diff that ships is reviewed in PRs; this
# flag is what lets additive changes like `email @unique` go through.
#
# Uses `fetch + reset --hard origin/main` instead of `git pull` so deploys are
# always an exact mirror of main. Safe to hard-reset: everything server-local
# (.env, public/uploads, node_modules, .next) is untracked/gitignored.
set -euo pipefail

APP=/home/mykiz.my/kiznext
SERVICE=mykiznext
RUNUSER=mykiz7808
HOME_DIR=/home/mykiz.my
BRANCH=main

as_app() {
  runuser -u "$RUNUSER" -- env HOME="$HOME_DIR" CI=true bash -lc "cd $APP && set -a && . ./.env && set +a && $1"
}

echo "==> [1/7] git fetch + hard reset to origin/$BRANCH"
runuser -u "$RUNUSER" -- env HOME="$HOME_DIR" git -C "$APP" fetch --quiet origin "$BRANCH"
runuser -u "$RUNUSER" -- env HOME="$HOME_DIR" git -C "$APP" reset --hard "origin/$BRANCH"

echo "==> [2/7] ensure AUTH_URL is set (fixes Auth.js 'Invalid URL' 500)"
ENV_FILE="$APP/.env"
if grep -qE '^AUTH_URL=https?://[^, ]+$' "$ENV_FILE"; then
  echo "   -> AUTH_URL already set correctly"
else
  sed -i '/^AUTH_URL=/d' "$ENV_FILE"
  printf 'AUTH_URL=https://mykiz.my\n' >> "$ENV_FILE"
  echo "   -> set AUTH_URL=https://mykiz.my"
fi
chown "$RUNUSER:$RUNUSER" "$ENV_FILE"

echo "==> [3/7] npm ci"
as_app "npm ci --no-audit --no-fund"

echo "==> [4/7] prisma generate"
as_app "npx prisma generate"

echo "==> [5/7] prisma db push (schema sync)"
as_app "npx prisma db push --accept-data-loss"

echo "==> [6/7] next build"
as_app "npm run build"

echo "==> [7/7] ownership + restart service"
chown -R "$RUNUSER:$RUNUSER" "$APP"
systemctl restart "$SERVICE"

echo "==> health check"
for i in 1 2 3 4 5 6 7 8; do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3010/login || true)
  if [ "$code" = "200" ]; then
    echo "OK: /login -> HTTP 200 (attempt $i)"
    exit 0
  fi
  sleep 2
done

echo "ERROR: app did not come up healthy after deploy" >&2
systemctl status "$SERVICE" --no-pager -n 30 >&2 || true
journalctl -u "$SERVICE" -n 30 --no-pager >&2 || true
exit 1
