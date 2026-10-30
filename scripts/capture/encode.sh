#!/usr/bin/env bash
# raw/<lang>/<shot>.mov → public/media/app/<lang>/<shot>.{mp4,webm,jpg}
set -euo pipefail
cd "$(dirname "$0")"
OUT="${OUT:-../../public/media/app}"
tail -n +2 shots.tsv | while IFS=$'\t' read -r shot start length; do
  for lang in en pt; do
    in="raw/$lang/$shot.mov"; [ -f "$in" ] || { echo "skip $lang/$shot (no raw)"; continue; }
    mkdir -p "$OUT/$lang"
    vf="scale=720:-2:flags=lanczos,fps=30"
    ffmpeg -nostdin -loglevel error -y -ss "$start" -t "$length" -i "$in" -an -vf "$vf" \
      -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 28 -preset slow -movflags +faststart "$OUT/$lang/$shot.mp4"
    ffmpeg -nostdin -loglevel error -y -ss "$start" -t "$length" -i "$in" -an -vf "$vf" \
      -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 "$OUT/$lang/$shot.webm"
    ffmpeg -nostdin -loglevel error -y -ss "$(echo "$start + 0.5" | bc)" -i "$in" -frames:v 1 -vf "scale=720:-2" -q:v 3 "$OUT/$lang/$shot.jpg"
    size=$(du -k "$OUT/$lang/$shot.mp4" | cut -f1)
    [ "$size" -le 1536 ] && echo "✓ $lang/$shot ${size}KB" || echo "⚠ $lang/$shot ${size}KB > 1.5MB — raise crf or shorten"
  done
done
