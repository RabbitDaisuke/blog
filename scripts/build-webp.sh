#!/usr/bin/env bash
set -euo pipefail

assets_dir="${1:-public}"

if command -v magick >/dev/null 2>&1; then
  imagemagick=magick
elif command -v convert >/dev/null 2>&1; then
  imagemagick=convert
else
  echo "ImageMagick is required (magick or convert)." >&2
  exit 1
fi

export imagemagick

find "$assets_dir" -type f -name '*.png' -print0 |
  xargs -0 -r -P 4 -I{} bash -c '
    input="$1"
    output="${input%.png}.webp"
    "$imagemagick" "$input" \
      -define webp:lossless=true \
      -define webp:method=6 \
      "$output"
  ' _ '{}'
