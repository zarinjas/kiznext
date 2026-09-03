#!/usr/bin/env bash
# Deploy KIZ Super App to the live server (mykiz.my) in one command.
#
#   ./deploy.sh
#
# What it does:
#   1. Lint (aborts on errors)
#   2. Stage every change (git add -A; .env / uploads are gitignored)
#   3. Auto-commit with a generated message — no manual commit note needed
#   4. Push to main
#   5. GitHub Action picks it up and rebuilds fresh on the VPS (see
#      .github/workflows/deploy.yml + scripts/remote-deploy.sh)
set -euo pipefail
cd "$(dirname "$0")"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  echo "✋ Must be on 'main' to deploy (currently on '$BRANCH'). Aborting." >&2
  exit 1
fi

if ! git diff --quiet; then
  echo "==> Linting…"
  npm run lint
fi

echo "==> Staging changes…"
git add -A

# Nothing to commit and nothing to push?
if git diff --cached --quiet && [ "$(git rev-list --count origin/main..HEAD)" = "0" ]; then
  echo "Nothing new to deploy — working tree clean and main already pushed."
  exit 0
fi

if ! git diff --cached --quiet; then
  N="$(git diff --cached --name-only | wc -l | tr -d ' ')"
  TOP="$(git diff --cached --name-only | head -1)"
  echo "==> Committing $N file(s)…"
  git commit -m "deploy: auto snapshot — ${N} file(s) (${TOP})" >/dev/null
fi

echo "==> Pushing to origin/main…"
git push origin main

echo ""
echo "🚀 Pushed. GitHub Action is rebuilding the VPS now."
echo "   Watch it: gh run watch"
