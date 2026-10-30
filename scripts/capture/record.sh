#!/usr/bin/env bash
# Records each shot flow in each language: scripts/capture/raw/<lang>/<shot>.mov
# Usage: record.sh [shot ...]   (default: all shots)
# Compatible with macOS /bin/bash 3.2 (no associative arrays).
set -uo pipefail
cd "$(dirname "$0")"
export PATH="$PATH:$HOME/.maestro/bin"
SHOTS=(onboarding-picker home-pre home-preg home-kids home-meno talk insights-pre calendar-meno)
[ $# -gt 0 ] && SHOTS=("$@")
question() {
  case "$1" in
    en) echo "Rio woke up 4 times last night. Is this a regression?" ;;
    pt) echo "O Rio acordou 4 vezes esta noite. É regressão?" ;;
  esac
}
failed=()

bash ./prepare.sh || exit 1
for lang in pt en; do
  maestro test "flows/lang-$lang.yaml" || { echo "✗ could not switch language to $lang"; exit 1; }
  mkdir -p "raw/$lang"
  for shot in "${SHOTS[@]}"; do
    out="raw/$lang/$shot.mov"
    rm -f "$out"
    xcrun simctl io booted recordVideo --codec h264 --force "$out" >/dev/null 2>&1 &
    rec=$!
    sleep 1.5
    if maestro test -e QUESTION="$(question "$lang")" "flows/shot-$shot.yaml"; then
      echo "✓ $lang/$shot"
    else
      failed+=("$lang/$shot")
    fi
    sleep 0.8
    kill -INT "$rec" 2>/dev/null; wait "$rec" 2>/dev/null
  done
done
xcrun simctl status_bar booted clear
if [ ${#failed[@]} -gt 0 ]; then echo "✗ Failed shots: ${failed[*]}"; exit 1; fi
echo "✓ All shots recorded."
