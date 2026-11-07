#!/usr/bin/env bash
# Readies the booted iOS Simulator for capture: app installed, Metro reachable,
# clean status bar. Does not sign in — Igor does that once by hand (README).
set -euo pipefail
APP_ID="co.sauceroom.grandma"
APP_REPO="${APP_REPO:-/Users/igorcarvalhorodrigues/dev/grandma-app}"

booted=$(xcrun simctl list devices booted | grep -c Booted || true)
if [ "$booted" -eq 0 ]; then echo "✗ No booted simulator. Open Simulator.app (iPhone 16 Pro / 17 Pro) first."; exit 1; fi

if ! xcrun simctl get_app_container booted "$APP_ID" >/dev/null 2>&1; then
  echo "• Installing latest EAS simulator build of grandma…"
  (cd "$APP_REPO" && npm run eas:install:sim)
fi
xcrun simctl get_app_container booted "$APP_ID" >/dev/null || { echo "✗ $APP_ID still not installed. Run 'npm run eas:build:sim' in $APP_REPO."; exit 1; }

if ! curl -sf http://localhost:8081/status | grep -q running; then
  echo "✗ Metro is not running. In another terminal: cd $APP_REPO && npm start"; exit 1
fi

xcrun simctl status_bar booted override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl ui booted appearance light
which maestro >/dev/null || export PATH="$PATH:$HOME/.maestro/bin"
maestro --version >/dev/null
echo "✓ Ready. App installed, Metro up, status bar 9:41."
