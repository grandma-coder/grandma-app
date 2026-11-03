#!/usr/bin/env bash
# shots.tsv: shot, back (seconds before the end of the raw video where the clip starts), length.
# raw/<lang>/<theme>/<shot>.mov → public/media/app/<lang>/<shot>.{mp4,webm,jpg} (light)
#                                  and public/media/app/<lang>/<shot>-dark.{mp4,webm,jpg} (dark)
set -euo pipefail
cd "$(dirname "$0")"
OUT="${OUT:-../../public/media/app}"
tail -n +2 shots.tsv | while IFS=$'\t' read -r shot back length; do
  for lang in en pt; do
   for theme in light dark; do
    in="raw/$lang/$theme/$shot.mov"; [ -f "$in" ] || { echo "skip $lang/$theme/$shot (no raw)"; continue; }
    name="$shot"; [ "$theme" = dark ] && name="$shot-dark"
    # Clips are cut relative to the END of the recording (flows end deterministically; the
    # idle lead-in from maestro start-up varies): start = duration - back.
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
    start=$(echo "d=$dur-$back; if (d<0) 0 else d" | bc -l | xargs printf "%.2f")
    mkdir -p "$OUT/$lang"
    # simctl recordVideo is variable-frame-rate (no frames while the screen is static), so pad
    # the tail by cloning the last frame, then trim [start, start+length] and resample to 30 fps.
    cut="tpad=stop_mode=clone:stop_duration=30,trim=start=$start:duration=$length,setpts=PTS-STARTPTS,fps=30,scale=720:-2:flags=lanczos"
    ffmpeg -nostdin -loglevel error -y -i "$in" -an -vf "$cut" -t "$length" \
      -c:v libx264 -profile:v high -pix_fmt yuv420p -crf "${CRF:-28}" -preset slow -movflags +faststart "$OUT/$lang/$name.mp4"
    ffmpeg -nostdin -loglevel error -y -i "$in" -an -vf "$cut" -t "$length" \
      -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 "$OUT/$lang/$name.webm"
    pstart=$(echo "$start + 0.5" | bc -l | xargs printf "%.2f")
    ffmpeg -nostdin -loglevel error -y -i "$in" -vf "tpad=stop_mode=clone:stop_duration=30,trim=start=$pstart,setpts=PTS-STARTPTS,scale=720:-2" -frames:v 1 -q:v 3 "$OUT/$lang/$name.jpg"
    size=$(du -k "$OUT/$lang/$name.mp4" | cut -f1)
    [ "$size" -le 1536 ] && echo "✓ $lang/$name ${size}KB" || echo "⚠ $lang/$name ${size}KB > 1.5MB — raise crf or shorten"
   done
  done
done
