#!/usr/bin/env bash
# Regenerasi ikon PWA dari lambang brand (public/brand/logo-master.png) memakai ImageMagick.
# Ikon hasil sudah di-commit; jalankan hanya bila logo berubah:  pnpm icons
#
# Sumbernya sengaja LAMBANG BERLIAN saja, bukan kunci horizontal
# (idmtokenlogo.png). Ikon selalu dirender di kotak — kunci 4,5:1 akan menyusut
# jadi garis tipis yang tak terbaca di 192px, apalagi 16px favicon.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/brand/logo-master.png"
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

echo "→ Next app conventions (favicon, icon, apple-icon) — TRANSPARAN"
# Ketiganya dirender di atas kanvas KOSONG (xc:none), bukan ivory. Ikon yang
# membawa latarnya sendiri terlihat seperti stiker tertempel di tab gelap dan
# di layar utama bertema gelap; alpha membiarkan sistem operasi yang memutuskan
# latarnya. `-background none -alpha on` dipasang eksplisit karena ImageMagick
# meratakan alpha saat menulis ICO bila tidak diminta sebaliknya.
convert "$SRC" -resize 512x512 "$APP/icon.png"
convert -size 180x180 xc:none \( "$SRC" -resize 152x152 \) -gravity center \
  -composite -background none -alpha on "$APP/apple-icon.png"
# Favicon DIPANGKAS PENUH ke konten (-trim), bukan sekadar diperkecil.
# Lambangnya membawa ~5% ruang kosong sendiri; pada 16px ruang itu ditukar
# langsung dengan ketebalan garis, dan garis di lambang ini sudah di bawah satu
# piksel. Diuji berdampingan pada 16/32/48: pangkas penuh menang di ketiganya.
convert "$SRC" -trim +repage -resize 256x256 -background none -gravity center \
  -extent 256x256 -alpha on "/tmp/aidm_favicon_src.png"
convert "/tmp/aidm_favicon_src.png" -background none -alpha on \
  -define icon:auto-resize=16,32,48 "$APP/favicon.ico"

echo "Selesai. Ikon ada di public/icons + app/."
