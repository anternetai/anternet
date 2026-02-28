#!/usr/bin/env bash
# optimize-video.sh — Compress a video for web and generate a poster thumbnail
#
# Usage: ./scripts/optimize-video.sh <input.mp4> <output-name> [width]
#
# Example:
#   ./scripts/optimize-video.sh ~/Downloads/raw-clip.mp4 driveway-cleaning 480
#
# Output (in public/videos/squeegee/):
#   driveway-cleaning.mp4         — compressed, faststart, no audio
#   driveway-cleaning-poster.jpg  — poster thumbnail from frame 30

set -euo pipefail

INPUT="$1"
NAME="$2"
WIDTH="${3:-480}"
OUTDIR="public/videos/squeegee"

if [ ! -f "$INPUT" ]; then
  echo "Error: Input file not found: $INPUT"
  exit 1
fi

if ! command -v ffmpeg &>/dev/null; then
  echo "Error: ffmpeg is not installed"
  exit 1
fi

mkdir -p "$OUTDIR"

echo "Compressing ${INPUT} → ${OUTDIR}/${NAME}.mp4 (${WIDTH}px wide)..."
ffmpeg -y -i "$INPUT" \
  -vf "scale=${WIDTH}:-2" \
  -c:v libx264 \
  -preset slow \
  -crf 28 \
  -movflags +faststart \
  -an \
  "${OUTDIR}/${NAME}.mp4"

echo "Generating poster → ${OUTDIR}/${NAME}-poster.jpg..."
ffmpeg -y -i "$INPUT" \
  -vf "select=eq(n\,30),scale=${WIDTH}:-2" \
  -frames:v 1 \
  -q:v 3 \
  "${OUTDIR}/${NAME}-poster.jpg"

ORIG_SIZE=$(du -h "$INPUT" | cut -f1)
NEW_SIZE=$(du -h "${OUTDIR}/${NAME}.mp4" | cut -f1)
POSTER_SIZE=$(du -h "${OUTDIR}/${NAME}-poster.jpg" | cut -f1)

echo ""
echo "Done!"
echo "  Original:  ${ORIG_SIZE}"
echo "  Optimized: ${NEW_SIZE}"
echo "  Poster:    ${POSTER_SIZE}"
echo ""
echo "Files:"
echo "  ${OUTDIR}/${NAME}.mp4"
echo "  ${OUTDIR}/${NAME}-poster.jpg"
