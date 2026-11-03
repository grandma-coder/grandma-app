#!/usr/bin/env bash
# Flow demos: one ~20 s walkthrough per behavior, in pt and en (light):
#   1 journey picker → 2 first onboarding steps (backed out, never saved) →
#   3 home with seeded data → 4 log one entry → 5 calendar overview.
# Each scene is recorded separately (raw/demo/<lang>/<mode>/<n>-<scene>.mov), then
# trimmed per demo.tsv and concatenated with hard cuts →
#   public/media/app/<lang>/demo-<mode>.{mp4,webm,jpg}
# Usage: [LANGS="pt en"] [MODES="pre preg kids meno"] [SCENES="2-profile ..."] demo.sh [record|encode|all]
#        (default: everything; SCENES only limits recording)
# Mode switches (Dev Panel shows the account e-mail) and onboarding exits run BEFORE /
# AFTER the recorder, never on video. Scene 4 writes one real log entry per run (approved).
# Compatible with macOS /bin/bash 3.2.
set -uo pipefail
cd "$(dirname "$0")"
export PATH="$PATH:$HOME/.maestro/bin"
export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-120000}"
LANGS="${LANGS:-pt en}"
MODES="${MODES:-pre preg kids meno}"
SCENES="${SCENES:-1-picker 2-profile 3-home 4-log 5-overview}"
OUT="${OUT:-../../public/media/app}"
what="${1:-all}"

rec=""
cleanup() {
  if [ -n "${rec:-}" ]; then kill -INT "$rec" 2>/dev/null; wait "$rec" 2>/dev/null; rec=""; fi
  return 0
}
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
trap cleanup EXIT
failed=()

record_scene() {  # lang mode scene — retries once when maestro's iOS driver fails to start
  local dir="raw/demo/$1/$2" out="raw/demo/$1/$2/$3.mov" try ok=0
  mkdir -p "$dir"
  for try in 1 2; do
    rm -f "$out"
    xcrun simctl io booted recordVideo --codec h264 --force "$out" 2>"$dir/$3.rec.log" &
    rec=$!
    sleep 1.5
    maestro test "flows/demo-$2-$3.yaml" >"$dir/$3.maestro.log" 2>&1 && ok=1
    sleep 0.8
    kill -INT "$rec" 2>/dev/null; wait "$rec" 2>/dev/null; rec=""
    [ "$ok" = 1 ] && break
    grep -q "driver not ready" "$dir/$3.maestro.log" || break
    echo "… $1/$2/$3: maestro driver did not start, retrying"
  done
  if [ "$ok" = 1 ]; then echo "✓ $1/$2/$3"; else failed+=("$1/$2/$3"); echo "✗ $1/$2/$3 (see $dir/$3.maestro.log)"; fi
  [ -s "$out" ] || failed+=("$1/$2/$3 (no video)")
}

do_record() {
  bash ./prepare.sh || exit 1
  maestro test flows/_light.yaml >/dev/null 2>&1 || { echo "✗ could not switch app to light mode"; exit 1; }
  for lang in $LANGS; do
    maestro test "flows/lang-$lang.yaml" >/dev/null 2>&1 || { echo "✗ could not switch language to $lang"; exit 1; }
    for mode in $MODES; do
      # Not recorded: Dev Panel → MODE, so the home in scene 3 is this behavior's.
      maestro test "flows/mode-$mode.yaml" >/dev/null 2>&1 || { failed+=("$lang/$mode (mode switch)"); continue; }
      for scene in $SCENES; do
        record_scene "$lang" "$mode" "$scene"
        # Not recorded: leave the onboarding without saving anything.
        if [ "$scene" = 2-profile ]; then
          maestro test flows/_demo-onb-close.yaml >/dev/null 2>&1 || failed+=("$lang/$mode (onboarding close)")
        fi
      done
      maestro test flows/_home.yaml >/dev/null 2>&1
    done
  done
  # leave the app in English, light mode, kids home
  maestro test flows/lang-en.yaml >/dev/null 2>&1; maestro test flows/mode-kids.yaml >/dev/null 2>&1
  xcrun simctl status_bar booted clear
}

# demo.tsv: mode, scene, back (seconds before the END of the raw scene where the cut
# starts — maestro's start-up lead-in varies, the flow ending does not), length (seconds
# of raw footage), speed (playback factor; 1 = real time, 2 = twice as fast).
do_encode() {
  for lang in $LANGS; do
    for mode in $MODES; do
      local inputs=() chain="" labels="" n=0 poster_t="" acc=0 ok=1
      while IFS=$'\t' read -r m scene back length speed; do
        [ "$m" = "$mode" ] || continue
        local in="raw/demo/$lang/$mode/$scene.mov"
        [ -f "$in" ] || { echo "skip $lang/$mode (no $scene raw)"; ok=0; break; }
        local dur start
        dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
        start=$(echo "d=$dur-$back; if (d<0) 0 else d" | bc -l | xargs printf "%.2f")
        inputs+=(-i "$in")
        # simctl recordVideo is VFR (no frames while static): clone the last frame and go
        # constant 30 fps BEFORE trimming (else static stretches collapse), then speed, 720 wide.
        chain="$chain[$n:v]tpad=stop_mode=clone:stop_duration=30,fps=30,trim=start=$start:duration=$length,setpts=(PTS-STARTPTS)/${speed:-1},fps=30,scale=720:-2:flags=lanczos,setsar=1[v$n];"
        labels="$labels[v$n]"
        # poster: start of scene 3 (top of the home with data, before it scrolls)
        [ "$scene" = 3-home ] && poster_t=$(echo "$acc + 0.3" | bc -l)
        acc=$(echo "$acc + $length / ${speed:-1}" | bc -l)
        n=$((n + 1))
      done < <(tail -n +2 demo.tsv)
      [ "$ok" = 1 ] && [ "$n" -gt 0 ] || continue
      mkdir -p "$OUT/$lang"
      local name="$OUT/$lang/demo-$mode" fc="${chain}${labels}concat=n=$n:v=1:a=0[out]"
      ffmpeg -nostdin -loglevel error -y "${inputs[@]}" -filter_complex "$fc" -map "[out]" -an \
        -c:v libx264 -profile:v high -pix_fmt yuv420p -crf "${CRF:-28}" -preset slow -movflags +faststart "$name.mp4"
      ffmpeg -nostdin -loglevel error -y -i "$name.mp4" -an -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 "$name.webm"
      ffmpeg -nostdin -loglevel error -y -ss "${poster_t:-1}" -i "$name.mp4" -frames:v 1 -q:v 3 "$name.jpg"
      local size secs
      size=$(du -k "$name.mp4" | cut -f1)
      secs=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$name.mp4" | xargs printf "%.1f")
      [ "$size" -le 3072 ] && echo "✓ $lang/demo-$mode ${secs}s ${size}KB" || echo "⚠ $lang/demo-$mode ${size}KB > 3 MB — raise CRF"
    done
  done
}

case "$what" in
  record) do_record ;;
  encode) do_encode ;;
  all) do_record; do_encode ;;
  *) echo "usage: demo.sh [record|encode|all]"; exit 2 ;;
esac
if [ ${#failed[@]} -gt 0 ]; then echo "✗ Failed: ${failed[*]}"; exit 1; fi
echo "✓ Done ($what)."
