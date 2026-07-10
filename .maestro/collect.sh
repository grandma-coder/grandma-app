#!/usr/bin/env bash
# Collect Maestro screenshots into docs/v2-screenshots/ by their name prefix.
# Maestro writes takeScreenshot output to the CWD (or ~/.maestro). We match the
# NN-area- prefix in each filename to the right subfolder.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/grandma-v2-screenshots"
# Maestro saves screenshots to the directory where `maestro test` was run.
SRC="${1:-$ROOT}"

shopt -s nullglob
moved=0
for f in "$SRC"/*.png; do
  base="$(basename "$f")"
  case "$base" in
    01-auth*)            sub="01-auth" ;;
    02-onboarding-cycle*)    sub="02-onboarding/cycle" ;;
    02-onboarding-pregnancy*) sub="02-onboarding/pregnancy" ;;
    02-onboarding-kids*)     sub="02-onboarding/kids" ;;
    02-onboarding*)      sub="02-onboarding" ;;
    03-cycle-home*)      sub="03-cycle/home" ;;
    03-cycle-calendar*)  sub="03-cycle/calendar" ;;
    03-cycle-analytics*) sub="03-cycle/analytics" ;;
    04-pregnancy-home*)      sub="04-pregnancy/home" ;;
    04-pregnancy-calendar*)  sub="04-pregnancy/calendar" ;;
    04-pregnancy-analytics*) sub="04-pregnancy/analytics" ;;
    04-pregnancy*)       sub="04-pregnancy" ;;
    05-kids-home*)       sub="05-kids/home" ;;
    05-kids-calendar*)   sub="05-kids/calendar" ;;
    05-kids-analytics*)  sub="05-kids/analytics" ;;
    06-caregiver*)       sub="06-caregiver" ;;
    07-menu*)            sub="07-shared/menu" ;;
    07-settings*)        sub="07-shared/settings" ;;
    07-profile*)         sub="07-shared/profile" ;;
    07-notifications*)   sub="07-shared/notifications" ;;
    07-chat*)            sub="07-shared/chat" ;;
    07-connections*)     sub="07-shared/connections" ;;
    07-utility*)         sub="07-shared/utility" ;;
    00-*)                sub="." ;;
    *)                   sub="_unsorted" ;;
  esac
  mkdir -p "$DEST/$sub"
  mv "$f" "$DEST/$sub/$base"
  moved=$((moved+1))
done
echo "Moved $moved screenshots into $DEST"
find "$DEST" -name '*.png' | wc -l | xargs echo "Total PNGs now:"
