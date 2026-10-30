#!/usr/bin/env bash
# Records each shot flow in each theme x language: scripts/capture/raw/<lang>/<theme>/<shot>.mov
# Usage: [THEMES="light dark"] [LANGS="pt en"] record.sh [shot ...]   (default: all shots, all passes)
# Compatible with macOS /bin/bash 3.2 (no associative arrays).
set -uo pipefail
cd "$(dirname "$0")"
export PATH="$PATH:$HOME/.maestro/bin"
SHOTS=(onboarding-picker home-pre home-preg home-kids home-meno talk insights-pre calendar-meno)
[ $# -gt 0 ] && SHOTS=("$@")
question() {
  case "$1" in
    en) echo "Kenji woke up 4 times last night. Is this a regression?" ;;
    pt) echo "O Kenji acordou 4 vezes esta noite. É regressão?" ;;
  esac
}
question_re() {  # regex-escaped question for Maestro text selectors
  case "$1" in
    en) echo "Kenji woke up 4 times last night\\. Is this a regression\\?" ;;
    pt) echo "O Kenji acordou 4 vezes esta noite\\. É regressão\\?" ;;
  esac
}
prep_mode() {  # app mode each shot needs; switched BEFORE recording so the Dev Panel never appears on video
  case "$1" in
    home-pre|insights-pre) echo pre ;;
    home-preg) echo preg ;;
    home-kids|talk) echo kids ;;
    home-meno|calendar-meno) echo meno ;;
    *) echo "" ;;
  esac
}
rec=""
cleanup() {
  if [ -n "${rec:-}" ]; then kill -INT "$rec" 2>/dev/null; wait "$rec" 2>/dev/null; rec=""; fi
  return 0
}
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
trap cleanup EXIT
failed=()

bash ./prepare.sh || exit 1
for theme in ${THEMES:-light dark}; do
  maestro test "flows/_$theme.yaml" || { echo "✗ could not switch app to $theme mode"; exit 1; }
  for lang in ${LANGS:-pt en}; do
    maestro test "flows/lang-$lang.yaml" || { echo "✗ could not switch language to $lang"; exit 1; }
    mkdir -p "raw/$lang/$theme"
    for shot in "${SHOTS[@]}"; do
      out="raw/$lang/$theme/$shot.mov"
      mode="$(prep_mode "$shot")"
      if [ -n "$mode" ]; then
        maestro test "flows/mode-$mode.yaml" >/dev/null 2>&1 || { failed+=("$lang/$theme/$shot (mode switch)"); continue; }
      fi
      rm -f "$out"
      xcrun simctl io booted recordVideo --codec h264 --force "$out" 2>"raw/$lang/$theme/$shot.rec.log" &
      rec=$!
      sleep 1.5
      if maestro test -e QUESTION="$(question "$lang")" -e QUESTION_RE="$(question_re "$lang")" "flows/shot-$shot.yaml"; then
        echo "✓ $lang/$theme/$shot"
      else
        failed+=("$lang/$theme/$shot")
      fi
      sleep 0.8
      kill -INT "$rec" 2>/dev/null; wait "$rec" 2>/dev/null
      rec=""
      [ -s "$out" ] || failed+=("$lang/$theme/$shot (no video)")
    done
  done
done
# leave the app in English, light mode, home
maestro test flows/lang-en.yaml >/dev/null 2>&1; maestro test flows/_light.yaml >/dev/null 2>&1
xcrun simctl status_bar booted clear
if [ ${#failed[@]} -gt 0 ]; then echo "✗ Failed shots: ${failed[*]}"; exit 1; fi
echo "✓ All shots recorded."
