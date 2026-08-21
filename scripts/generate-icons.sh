#!/usr/bin/env bash
# Regenerasi ikon PWA dari lambang brand (public/brand/idmlogo.png) memakai ImageMagick.
# Ikon hasil sudah di-commit; jalankan hanya bila logo berubah:  pnpm icons
#
# Sumbernya sengaja LAMBANG BERLIAN saja, bukan kunci horizontal
# (idmtokenlogo.png). Ikon selalu dirender di kotak — kunci 4,5:1 akan menyusut
# jadi garis tipis yang tak terbaca di 192px, apalagi 16px favicon.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/brand/idmlogo.png"
ICO="$ROOT/public/icons"
APP="$ROOT/app"

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick 'convert' tidak ditemukan. Install dulu (mis. sudo apt-get install imagemagick)." >&2
  exit 1
fi

mkdir -p "$ICO" "$APP"

echo "→ manifest 'any' (transparan)"
convert "$SRC" -resize 512x512 "$ICO/icon-512.png"
convert "$SRC" -resize 192x192 "$ICO/icon-192.png"

echo "→ manifest 'maskable' (bg ivory hangat #FAF7F0, zona aman 70%)"
convert -size 512x512 xc:'#FAF7F0' \( "$SRC" -resize 360x360 \) -gravity center -composite "$ICO/maskable-512.png"
convert "$ICO/maskable-512.png" -resize 192x192 "$ICO/maskable-192.png"

echo "→ Next app conventions (favicon, icon, apple-icon)"
convert "$SRC" -resize 512x512 "$APP/icon.png"
convert -size 180x180 xc:'#FAF7F0' \( "$SRC" -resize 140x140 \) -gravity center -composite "$APP/apple-icon.png"
convert -size 256x256 xc:'#FAF7F0' \( "$SRC" -resize 200x200 \) -gravity center -composite "/tmp/aidm_favicon_src.png"
convert "/tmp/aidm_favicon_src.png" -define icon:auto-resize=16,32,48 "$APP/favicon.ico"

echo "Selesai. Ikon ada di public/icons + app/."
