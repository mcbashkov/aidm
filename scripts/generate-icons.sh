#!/usr/bin/env bash
# Regenerasi SELURUH turunan brand dari satu sumber (public/brand/logo-master.png)
# memakai ImageMagick. Hasilnya sudah di-commit; jalankan hanya bila logo
# berubah:  pnpm icons
#
# "SELURUH" itu penting, dan baru benar sejak 2026-09-08. Logo splash
# (public/logo-idm.png) dulu berdiri sendiri di luar skrip ini — dan ternyata
# artwork-nya memang BERBEDA dari logo-master (RMSE 20,8%, jauh di atas derau
# resampling ~0,5%). Aset yang tidak ikut diregenerasi adalah aset yang
# diam-diam mempertahankan brand lama setelah pergantian, dan yang paling
# mungkin terlewat justru yang paling besar terlihat: layar pembuka.
#
# ── SUMBER SELALU DIPANGKAS DULU (2026-09-09) ───────────────────────────────
#
# Setiap keluaran disusun dari sumber yang sudah di-`-trim`, lalu dipusatkan
# pada kanvas berukuran pasti. Alasannya ditemukan saat pergantian logo:
# padding di dalam berkas sumber TIDAK BOLEH menentukan besar ikon.
#
# Logo lama mengisi 89% kanvasnya; logo baru hanya 58% (1200x1282 di dalam
# 2048x2048). Tanpa pemangkasan, `-resize 512x512` menurunkan setiap ikon
# sekitar sepertiga — app/icon 89%→58%, apple-icon 76%→49%, maskable 62%→41% —
# dan penyusutan itu akan terlihat seperti keputusan desain padahal ia semata
# akibat ruang kosong di berkas yang dikirim. Kelas kegagalan yang sama dengan
# regresi senyap mana pun: hasilnya berubah, tidak ada yang menyatakannya.
#
# Angka ISI di bawah karena itu bukan angka baru. Ia diukur dari ikon yang
# SEDANG terpasang, supaya satu-satunya hal yang berubah saat logo diganti
# adalah artwork-nya — bukan geometrinya.
#
# Sumber boleh tidak persegi (yang sekarang 1200x1282, sedikit potret).
# `-resize NxN` memuat gambar DI DALAM kotak NxN dengan rasio terjaga, jadi
# sisi terpanjang yang menyentuh target dan tidak ada yang gepeng.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/brand/logo-master.png"
ICO="$ROOT/public/icons"
APP="$ROOT/app"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick 'convert' tidak ditemukan. Install dulu (mis. sudo apt-get install imagemagick)." >&2
  exit 1
fi

mkdir -p "$ICO" "$APP"

# Satu kali pangkas, dipakai seluruh keluaran di bawah.
MARK="$TMP/mark.png"
convert "$SRC" -trim +repage -background none -alpha on "$MARK"
echo "→ sumber dipangkas ke konten: $(identify -format '%wx%h' "$MARK") (dari $(identify -format '%wx%h' "$SRC"))"

# Susun lambang di tengah kanvas berukuran pasti.
#   $1 ukuran kanvas · $2 ukuran lambang · $3 latar · $4 tujuan
susun() {
  convert -size "$1x$1" "xc:$3" \
    \( "$MARK" -resize "$2x$2" \) -gravity center -composite \
    -alpha "$( [ "$3" = "none" ] && echo on || echo off )" "$4"
}

echo "→ manifest 'any' (transparan, isi 89%)"
susun 512 456 none "$ICO/icon-512.png"
susun 192 171 none "$ICO/icon-192.png"

# Maskable WAJIB opak — Android memotongnya dengan masker (lingkaran/squircle)
# dan alpha di baliknya menjadi lubang, bukan latar. Warnanya HITAM MURNI,
# bukan ivory dan bukan --ink #1B1B1B: iOS mengisi alpha apple-touch-icon
# dengan #000000, jadi hitam murni-lah satu-satunya nilai yang membuat ikon di
# Android dan iOS benar-benar terlihat sama.
#
# Isi 62% menyamai maskable yang sedang terpasang — bukan 70% nominal yang
# tertulis di versi lama skrip ini. Keduanya berbeda karena artwork lama
# membawa ~10% ruang kosong sendiri di dalam komposit 70% itu. Memakai 70%
# terhadap lambang yang sudah dipangkas justru MEMBESARKAN ikon melewati apa
# yang pernah diuji terhadap masker, dan mendekatkannya ke tepi potong.
echo "→ manifest 'maskable' (bg hitam #000000, isi 62% — zona aman terjaga)"
susun 512 317 '#000000' "$ICO/maskable-512.png"
convert "$ICO/maskable-512.png" -resize 192x192 "$ICO/maskable-192.png"

echo "→ Next app conventions (favicon, icon, apple-icon) — TRANSPARAN"
# Ketiganya dirender di atas kanvas KOSONG, bukan ivory. Ikon yang membawa
# latarnya sendiri terlihat seperti stiker tertempel di tab gelap dan di layar
# utama bertema gelap; alpha membiarkan sistem operasi yang memutuskan latarnya.
susun 512 456 none "$APP/icon.png"
susun 180 137 none "$APP/apple-icon.png"

# Favicon DIPANGKAS PENUH tanpa margin sama sekali — bukan 89% seperti yang
# lain. Pada 16px, setiap piksel margin ditukar langsung dengan ketebalan
# garis, dan garis di lambang ini sudah di bawah satu piksel. Diuji
# berdampingan pada 16/32/48: pangkas penuh menang di ketiganya.
convert "$MARK" -resize 256x256 -background none -gravity center \
  -extent 256x256 -alpha on "$TMP/favicon-src.png"
convert "$TMP/favicon-src.png" -background none -alpha on \
  -define icon:auto-resize=16,32,48 "$APP/favicon.ico"

echo "→ logo splash (public/logo-idm.png) — TRANSPARAN, isi 86%"
# Layar pembuka merender lambang ini pada 820px di atas latar hitam. Transparan,
# bukan berlatar: splash punya latarnya sendiri, dan lambang yang membawa latar
# sendiri akan tampak seperti kotak tertempel di atasnya.
susun 820 705 none "$ROOT/public/logo-idm.png"

echo "→ logo modal Privy (public/brand/idmtokenlogo.png) — TRANSPARAN"
# Dipakai Privy pada modal ekspor wallet. Slotnya lebar (dulu diisi kunci
# horizontal 1729x381), tapi lambang baru berbentuk persegi — keputusan PO
# 2026-09-08: pakai lambangnya, Privy melebarkan slot dan hasilnya tetap rapi.
susun 512 456 none "$ROOT/public/brand/idmtokenlogo.png"

echo "Selesai. Ikon ada di public/icons + app/, logo splash & Privy di public/."
