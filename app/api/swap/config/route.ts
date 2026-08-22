import { NextResponse } from "next/server";
import {
  idmxAddress,
  isSwapConfigured,
  swapBurnChain,
  swapClaimChain,
  swapClaimAddress,
  swapInitiatorAddress,
} from "@/lib/swap/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/swap/config — chain & alamat kontrak untuk layar Tukar.
 *
 * Endpoint ini ADA karena satu jebakan yang sudah pernah menggigit repo ini:
 * `AIDM_REWARD_CHAIN` dan `AIDM_SWAP_CHAIN` TIDAK berawalan `NEXT_PUBLIC_`,
 * jadi di browser keduanya `undefined` dan `swapBurnChain()` diam-diam jatuh
 * ke `NEXT_PUBLIC_DEFAULT_CHAIN`. Saat ini nilai itu `opbnb` (mainnet 204)
 * sementara seluruh kontrak hidup di opBNB testnet (5611).
 *
 * Komponen klien yang menghitung chain-nya sendiri karena itu akan menyuruh
 * dompet pengguna pindah ke MAINNET lalu mengirim `swap()` ke alamat yang di
 * sana tidak berisi kontrak apa pun — pengguna membayar gas untuk transaksi
 * yang tidak membakar apa-apa dan tidak pernah menghasilkan voucher.
 *
 * Karena itu chain dirakit di SERVER dan klien hanya menerima nomornya.
 */
export async function GET() {
  if (!isSwapConfigured()) {
    return NextResponse.json(
      { configured: false, error: "Fitur Tukar belum dikonfigurasi." },
      { status: 501 },
    );
  }

  return NextResponse.json({
    configured: true,
    burnChainId: swapBurnChain().id,
    claimChainId: swapClaimChain().id,
    idmx: idmxAddress(),
    initiator: swapInitiatorAddress(),
    claim: swapClaimAddress(),
  });
}
