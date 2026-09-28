#!/usr/bin/env bash
#
# Upload the latest production iOS build to TestFlight.
#
# The App Store Connect credentials live in `mobile/.env.submit` (git-ignored)
# so they never reach eas.json or the repository. EAS reads
# EXPO_APPLE_APP_SPECIFIC_PASSWORD and EXPO_APPLE_ID from the environment.
#
# Usage:  npm run submit:ios
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.submit ]; then
  # `set -a` exports every variable assigned while sourcing.
  set -a
  # shellcheck disable=SC1091
  . ./.env.submit
  set +a
else
  echo "⚠️  .env.submit not found — EAS will prompt for your Apple ID and password."
fi

if [ -z "${EXPO_APPLE_ID:-}" ]; then
  echo "⚠️  EXPO_APPLE_ID is not set in .env.submit — EAS will prompt for it."
fi

exec npx eas-cli@latest submit --profile production --platform ios "$@"
