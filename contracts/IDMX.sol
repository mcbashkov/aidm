// SPDX-License-Identifier: MIT
/**
 *  ██╗██████╗ ███╗   ███╗    ██████╗ ███████╗██████╗  ██████╗ ██████╗ ███╗   ██╗
 *  ██║██╔══██╗████╗ ████║    ██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔══██╗████╗  ██║
 *  ██║██║  ██║██╔████╔██║    ██████╔╝█████╗  ██████╔╝██║   ██║██████╔╝██╔██╗ ██║
 *  ██║██║  ██║██║╚██╔╝██║    ██╔══██╗██╔══╝  ██╔══██╗██║   ██║██╔══██╗██║╚██╗██║
 *  ██║██████╔╝██║ ╚═╝ ██║    ██║  ██║███████╗██████╔╝╚██████╔╝██║  ██║██║ ╚████║
 *  ╚═╝╚═════╝ ╚═╝     ╚═╝    ╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝
 *
 *                                                                  by MC Basyar
 *
 *  ─────────────────────────────────────────────────────────────────────────────
 *  IDM Reborn — Official Channels
 *  ─────────────────────────────────────────────────────────────────────────────
 *  Website   : https://idmtoken.com/
 *  Telegram  : https://t.me/IDM_Token
 *
 *  Creator — MC Basyar
 *  Website   : https://mcbasyar.org
 *  Twitter/X : https://x.com/MCBasyar_IDM
 *  Instagram : https://www.instagram.com/mc_basyar
 *  ─────────────────────────────────────────────────────────────────────────────
 */
pragma solidity 0.8.26;

/**
 * IDMX — token reward in-app AIDM di opBNB (PRD §8.1).
 *
 * ERC-20 minimal, tanpa dependensi eksternal (alasan sama seperti
 * ReportAttestation: seluruh kode yang diaudit ada di satu berkas, dan hasil
 * kompilasi tidak bergeser karena versi library).
 *
 * Pasokan ditetapkan SEKALI saat deploy (50 miliar — lihat scripts/deploy-rewards.mjs)
 * dan dicetak SELURUHNYA ke treasury. Tidak ada fungsi `mint` sama sekali:
 * setelah deploy, pasokan hanya bisa BERKURANG lewat burn, tidak pernah
 * bertambah — apa pun yang terjadi pada kunci treasury. Kontrak reward
 * mendistribusi dari saldo yang sudah ada, bukan dari pencetakan baru.
 *
 * IDMX BUKAN Token IDM Reborn (§8.1) — IDM Reborn hidup di BSC dengan pasokan
 * 1 miliar. Keduanya sengaja terpisah.
 */
contract IDMX {
    string public constant name = "IDMX";
    string public constant symbol = "IDMX";
    uint8 public constant decimals = 18;

    // Storage biasa, BUKAN immutable: burn menurunkan nilainya. Tetap tanpa
    // fungsi mint, jadi arah perubahannya hanya satu — turun.
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Burned(address indexed from, uint256 value);

    error SaldoKurang();
    error IzinKurang();
    error AlamatNol();

    constructor(address treasury, uint256 pasokan) {
        if (treasury == address(0)) revert AlamatNol();
        totalSupply = pasokan;
        balanceOf[treasury] = pasokan;
        emit Transfer(address(0), treasury, pasokan);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value)
        external
        returns (bool)
    {
        uint256 izin = allowance[from][msg.sender];
        // type(uint256).max = izin tak terbatas, tidak dikurangi tiap transfer
        // (pola umum; menghemat gas untuk kontrak reward yang menarik berkali-kali).
        if (izin != type(uint256).max) {
            if (izin < value) revert IzinKurang();
            unchecked {
                allowance[from][msg.sender] = izin - value;
            }
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (to == address(0)) revert AlamatNol();
        uint256 saldo = balanceOf[from];
        if (saldo < value) revert SaldoKurang();
        unchecked {
            balanceOf[from] = saldo - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    /* ── Burn (§7.5 tukar IDMX → IDM) ────────────────────────────────────── */
    // Burn SEJATI: totalSupply berkurang dan `Transfer(from, 0x0)` membuat
    // opBNBScan menampilkannya sebagai pembakaran serta menurunkan Total Supply
    // di halaman token. Mengirim ke alamat 0xdead hanya "menyembunyikan" token
    // tanpa mengubah angka pasokan — itu bukan yang diminta di sini.

    function burn(uint256 value) external {
        _burn(msg.sender, value);
    }

    /// Untuk SwapInitiator: bakar atas izin (allowance) user.
    function burnFrom(address from, uint256 value) external {
        uint256 izin = allowance[from][msg.sender];
        if (izin != type(uint256).max) {
            if (izin < value) revert IzinKurang();
            unchecked {
                allowance[from][msg.sender] = izin - value;
            }
        }
        _burn(from, value);
    }

    function _burn(address from, uint256 value) internal {
        uint256 saldo = balanceOf[from];
        if (saldo < value) revert SaldoKurang();
        unchecked {
            balanceOf[from] = saldo - value;
            totalSupply -= value;
        }
        emit Transfer(from, address(0), value);
        emit Burned(from, value);
    }
}
