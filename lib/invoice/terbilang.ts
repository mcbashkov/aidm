/** Angka → kata bahasa Indonesia untuk kuitansi ("dua juta lima ratus ribu rupiah"). Murni. */
const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function kurangDariSeribu(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} belas`;
  if (n < 100) return `${SATUAN[Math.floor(n / 10)]} puluh${n % 10 ? ` ${SATUAN[n % 10]}` : ""}`;
  const ratus = Math.floor(n / 100);
  const sisa = n % 100;
  return `${ratus === 1 ? "seratus" : `${SATUAN[ratus]} ratus`}${sisa ? ` ${kurangDariSeribu(sisa)}` : ""}`;
}

export function terbilang(n: number): string {
  const angka = Math.floor(Math.abs(n));
  if (angka === 0) return "nol";
  const bagian: [number, string][] = [
    [1_000_000_000_000, "triliun"],
    [1_000_000_000, "miliar"],
    [1_000_000, "juta"],
    [1_000, "ribu"],
  ];
  let sisa = angka;
  const kata: string[] = [];
  for (const [nilai, nama] of bagian) {
    const q = Math.floor(sisa / nilai);
    if (q > 0) {
      kata.push(q === 1 && nama === "ribu" ? "seribu" : `${kurangDariSeribu(q)} ${nama}`);
      sisa %= nilai;
    }
  }
  if (sisa > 0) kata.push(kurangDariSeribu(sisa));
  return kata.join(" ").replace(/\s+/g, " ").trim();
}

export function terbilangRupiah(n: number): string {
  const t = terbilang(n);
  return `${t.charAt(0).toUpperCase()}${t.slice(1)} rupiah`;
}
