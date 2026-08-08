#!/usr/bin/env bash
# ============================================================================
# AIDM — apply migrasi Supabase (supabase/migrations/*.sql) berurutan.
#
#   pnpm db:migrate            # apply yang belum pernah dijalankan
#   pnpm db:migrate --dry-run  # tampilkan rencana saja, tidak mengeksekusi
#
# Butuh SUPABASE_DB_URL di .env.local:
#   Supabase Dashboard → Project Settings → Database → Connection string → URI
#   (pakai koneksi "Session pooler" bila jaringan Anda IPv4-only)
#
# Butuh psql. Belum ada di mesin ini:
#   sudo apt install postgresql-client
# Alternatif tanpa install: buka SQL Editor di dashboard Supabase, lalu tempel
# isi tiap file 0001..0010 SESUAI URUTAN NOMOR (urutan penting — 0002 memakai
# extension dari 0001, 0008 memakai tabel dari 0002-0006).
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

# ── Muat .env.local tanpa mengeksekusinya sebagai skrip ────────────────────
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^[A-Z_][A-Z0-9_]*=' .env.local)
  set +a
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "✗ SUPABASE_DB_URL belum diisi di .env.local." >&2
  echo "  Ambil di: Project Settings → Database → Connection string → URI" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "✗ psql tidak ditemukan. Install dulu:" >&2
  echo "    sudo apt install postgresql-client" >&2
  echo "  Atau tempel manual lewat SQL Editor Supabase (lihat komentar skrip ini)." >&2
  exit 1
fi

PSQL=(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --quiet --no-psqlrc)

# ── Catatan migrasi yang sudah jalan (idempoten) ───────────────────────────
"${PSQL[@]}" -c "
  create table if not exists schema_migrations (
    version     text primary key,
    applied_at  timestamptz not null default now()
  );" >/dev/null

applied="$("${PSQL[@]}" -tAc "select version from schema_migrations;")"

pending=0
for file in supabase/migrations/*.sql; do
  version="$(basename "$file" .sql)"

  if grep -qxF "$version" <<<"$applied"; then
    echo "· $version — sudah pernah di-apply, dilewati"
    continue
  fi

  pending=$((pending + 1))

  if [[ $DRY_RUN -eq 1 ]]; then
    echo "→ $version — AKAN di-apply (dry run, tidak dieksekusi)"
    continue
  fi

  echo "→ $version — menjalankan…"
  # Satu transaksi per file: gagal di tengah = tidak ada yang tertinggal separuh.
  "${PSQL[@]}" --single-transaction \
    -f "$file" \
    -c "insert into schema_migrations (version) values ('$version');"
  echo "✓ $version"
done

if [[ $pending -eq 0 ]]; then
  echo "Semua migrasi sudah ter-apply. Tidak ada yang dikerjakan."
elif [[ $DRY_RUN -eq 1 ]]; then
  echo "Dry run selesai: $pending migrasi menunggu. Jalankan tanpa --dry-run untuk apply."
else
  echo "Selesai: $pending migrasi di-apply."
fi
