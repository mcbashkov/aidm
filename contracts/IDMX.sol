// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * IDMX — token reward in-app AIDM di opBNB (PRD §8.1).
 *
 * ERC-20 minimal, tanpa dependensi eksternal (alasan sama seperti
 * ReportAttestation: seluruh kode yang diaudit ada di satu berkas, dan hasil
 * kompilasi tidak bergeser karena versi library).
 *
 * Pasokan 10 triliun dicetak SELURUHNYA saat deploy ke treasury — tidak ada
 * fungsi `mint` sama sekali. Ini keputusan sadar: kontrak reward mendistribusi
 * dari saldo yang sudah ada, sehingga tidak ada satu pun jalur kode yang bisa
 * menambah pasokan setelah deploy, apa pun yang terjadi pada kunci treasury.
 *
 * IDMX BUKAN Token IDM Reborn (§8.1) — IDM Reborn hidup di BSC dengan pasokan
 * 1 miliar. Keduanya sengaja terpisah.
 */
contract IDMX {
    string public constant name = "IDMX";
    string public constant symbol = "IDMX";
    uint8 public constant decimals = 18;

    uint256 public immutable totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

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
}
