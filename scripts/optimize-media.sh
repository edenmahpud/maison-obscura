#!/usr/bin/env bash
# Aggressive media re-encode for Maison Obscura.
#
# Writes to public/assets-optimized/, mirroring the public/assets/ tree.
# Originals are never touched — nothing here writes back into public/assets/.
# Compare the two, and only then repoint the scene components.
#
#   ./scripts/optimize-media.sh          # everything
#   ./scripts/optimize-media.sh video    # videos only
#   ./scripts/optimize-media.sh images   # images only
#
# Requires ffmpeg (brew install ffmpeg).

set -uo pipefail

SRC="public/assets"
OUT="public/assets-optimized"
MODE="${1:-all}"

command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg not found — run: brew install ffmpeg"; exit 1; }

# Every <video> in this project renders muted, so audio is dead weight: -an.
# -movflags +faststart moves the moov atom to the front of the file, which is
# what lets a browser start playing before the whole file arrives. Without it a
# progressive download must complete before the first frame shows.
CRF=30           # 28 = higher quality/larger, 32 = smaller/softer
MAXW=1600        # cap width; source masters are far larger than they render
WEBP_Q=75

human () { du -m "$1" 2>/dev/null | cut -f1; }

do_video () {
  find "$SRC" -type f -iname '*.mp4' -print0 | while IFS= read -r -d '' f; do
    rel="${f#$SRC/}"
    dst="$OUT/${rel%.*}.mp4"
    mkdir -p "$(dirname "$dst")"
    printf '  %-46s ' "$rel"
    if ffmpeg -nostdin -v error -y -i "$f" \
        -vf "scale='min($MAXW,iw)':-2" \
        -c:v libx264 -crf "$CRF" -preset slow -pix_fmt yuv420p \
        -movflags +faststart -an "$dst" 2>/dev/null; then
      echo "$(human "$f") MB -> $(human "$dst") MB"
    else
      echo "FAILED"
    fi
  done
}

do_images () {
  find "$SRC" -type f \( -iname '*.png' -o -iname '*.jpg' \) -print0 | while IFS= read -r -d '' f; do
    rel="${f#$SRC/}"
    dst="$OUT/${rel%.*}.webp"
    mkdir -p "$(dirname "$dst")"
    printf '  %-46s ' "$rel"
    if ffmpeg -nostdin -v error -y -i "$f" \
        -c:v libwebp -quality "$WEBP_Q" -compression_level 6 "$dst" 2>/dev/null; then
      echo "$(human "$f") MB -> $(human "$dst") MB"
    else
      echo "FAILED"
    fi
  done
}

echo "source:      $SRC  ($(human "$SRC") MB)"
echo "destination: $OUT  (originals untouched)"
echo

case "$MODE" in
  video)  echo "VIDEO";  do_video ;;
  images) echo "IMAGES"; do_images ;;
  all)    echo "VIDEO";  do_video; echo; echo "IMAGES"; do_images ;;
  *) echo "usage: $0 [all|video|images]"; exit 1 ;;
esac

echo
echo "total: $SRC $(human "$SRC") MB  ->  $OUT $(human "$OUT") MB"
