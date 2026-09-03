#!/usr/bin/env bash
# Remote deploy script — runs on the VPS as root (invoked by the GitHub Action
# over SSH via `sudo bash ...`, or manually on the server).
#
# Flow: git fetch+reset -> npm ci -> prisma generate + db push -> next build ->
# restart the systemd service -> health check.
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

echo "==> [1/6] git fetch + hard reset to origin/$BRANCH"
runuser -u "$RUNUSER" -- env HOME="$HOME_DIR" git -C "$APP" fetch --quiet origin "$BRANCH"
runuser -u "$RUNUSER" -- env HOME="$HOME_DIR" git -C "$APP" reset --hard "origin/$BRANCH"

echo "==> [2/6] npm ci"
as_app "npm ci --no-audit --no-fund"

echo "==> [3/6] prisma generate"
as_app "npx prisma generate"

echo "==> [4/6] prisma db push (schema sync, non-destructive)"
as_app "npx prisma db push"

echo "==> [5/6] next build"
as_app "npm run build"

echo "==> [6/6] ownership + restart service"
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
