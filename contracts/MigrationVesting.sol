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

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

/**
 * MigrationVesting — melepas alokasi migrasi holder IDM v1 sesuai jadwal §0.1.
 *
 * KENAPA KONTRAK INI ADA. `SwapClaim` melepas token PENUH saat klaim, dan
 * jadwal migrasi tidak bisa dijalankan dengan itu: pemegang saldo besar hanya
 * boleh menerima 20% di TGE, sisanya matang linear selama enam bulan.
 *
 * ── SATU RUMUS, BUKAN DUA JALUR ─────────────────────────────────────────────
 *
 * Ambang 250.000 IDM TIDAK ADA di kontrak ini, dan itu disengaja. Ia
 * dievaluasi SEKALI saat daftar alokasi disusun, lalu hasilnya dibekukan ke
 * dalam daun merkle sebagai `bagianTge` — jumlah yang terbuka di TGE.
 *
 *   · saldo kecil  → bagianTge == total  → matang penuh sejak detik pertama
 *   · saldo besar  → bagianTge == 20%    → sisanya linear enam bulan
 *
 * Keduanya kemudian dilayani rumus yang SAMA PERSIS. Tidak ada percabangan,
 * tidak ada dua jalur kode yang bisa menyimpang. Sebuah `if` yang membedakan
 * kelas pemegang di dalam `klaim()` adalah tempat bug paling mahal bisa
 * bersembunyi — ia hanya salah untuk sebagian orang, dan sebagian orang itu
 * tidak pernah menjadi orang yang mengujinya.
 *
 * Konsekuensi yang layak disebut: jadwal setiap alamat bisa diperiksa siapa
 * pun dari daunnya sendiri, tanpa perlu memercayai bahwa kontrak menerapkan
 * ambang dengan benar. Yang tidak bisa diperiksa tidak bisa dipercaya.
 *
 * ── `t0` DARI TGE, BUKAN DARI TANGGAL KLAIM ─────────────────────────────────
 *
 * Kematangan dihitung dari `t0` (waktu TGE) yang sama untuk semua orang. Bila
 * dihitung dari tanggal klaim masing-masing, pemegang yang mengklaim terlambat
 * justru selesai vesting paling akhir — keterlambatan membaca pengumuman
 * berubah menjadi hukuman. Karena itu mengklaim lebih lambat TIDAK PERNAH
 * merugikan: yang sudah matang tetap matang dan menunggu.
 *
 * ── YANG SENGAJA TIDAK ADA ──────────────────────────────────────────────────
 *
 * Tidak ada `pause`. Tidak ada fungsi yang bisa menurunkan alokasi. Tidak ada
 * cara bagi `owner` menyentuh token yang menopang alokasi belum diklaim —
 * `sweep` hanya bisa mengeluarkan KELEBIHAN di atas kewajiban, dan penjaga itu
 * dihitung dari `totalAlokasi` yang immutable. Ini kewajiban terhadap pemegang
 * lama; kewajiban tidak boleh punya tombol batal.
 *
 * ── DI LUAR LINGKUP ─────────────────────────────────────────────────────────
 *
 * TODO: **kolam keterlambatan (±13,3 juta IDM) TIDAK ditangani kontrak ini.**
 * Mekanismenya pro-rata dan BELUM DITENTUKAN (§0.1). Ia sengaja tidak dikarang
 * di sini — kolam yang aturannya ditebak lebih buruk daripada kolam yang belum
 * ada, karena yang pertama terlihat resmi.
 */
contract MigrationVesting {
    /// Enam bulan sejak TGE. Angka hari, bukan bulan kalender: vesting linear
    /// yang melompat di batas bulan menghasilkan tangga, bukan garis.
    uint64 public constant DURASI = 180 days;

    IERC20 public immutable token;
    /// Akar daftar alokasi terverifikasi. Daun:
    /// keccak256(bytes.concat(keccak256(abi.encode(akun, total, bagianTge))))
    bytes32 public immutable merkleRoot;
    /// Jumlah SELURUH alokasi di dalam pohon. Merkle root tidak menyingkapkan
    /// totalnya, jadi ia dipasang di sini agar penjaga `sweep` punya angka yang
    /// tidak bisa digeser siapa pun.
    uint256 public immutable totalAlokasi;

    address public owner;
    address public pendingOwner;

    /// Waktu TGE. Nol = belum disetel; sekali disetel tidak bisa diubah.
    uint64 public t0;

    /// akun => jumlah yang sudah ditarik
    mapping(address => uint256) public terklaim;
    uint256 public totalTerklaim;

    event T0Set(uint64 t0);
    event Klaim(address indexed akun, uint256 jumlah, uint256 kumulatif);
    event Sweep(address indexed ke, uint256 jumlah);
    event OwnershipTransferStarted(address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error ZeroAmount();
    error T0BelumDisetel();
    error T0SudahDisetel();
    error BuktiTidakSah();
    error TidakAdaYangMatang();
    error TransferFailed();
    error MelanggarKewajiban();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address token_, bytes32 merkleRoot_, uint256 totalAlokasi_) {
        if (token_ == address(0)) revert ZeroAddress();
        if (merkleRoot_ == bytes32(0)) revert BuktiTidakSah();
        if (totalAlokasi_ == 0) revert ZeroAmount();
        owner = msg.sender;
        token = IERC20(token_);
        merkleRoot = merkleRoot_;
        totalAlokasi = totalAlokasi_;
    }

    /* ── Administrasi ────────────────────────────────────────────────────── */

    /**
     * Menyetel waktu TGE. Boleh SEKALI saja.
     *
     * Sekali disetel, seluruh jadwal enam bulan terkunci dan tidak ada yang
     * bisa menggesernya — termasuk owner. Kalau `t0` bisa diubah, "vesting
     * selesai bulan Maret" bukan lagi pernyataan tentang kontrak melainkan
     * tentang niat orang yang memegang kuncinya.
     */
    function setT0(uint64 t) external onlyOwner {
        if (t0 != 0) revert T0SudahDisetel();
        if (t == 0) revert ZeroAmount();
        t0 = t;
        emit T0Set(t);
    }

    /**
     * Menarik KELEBIHAN token di atas kewajiban yang belum diklaim.
     *
     * Bukan "sweep" dalam arti biasa: ia secara struktural tidak bisa menyentuh
     * token yang menopang alokasi. Fungsi ini ada supaya kelebihan pendanaan
     * (salah transfer, sisa setelah semua klaim) tidak terkunci selamanya —
     * bukan supaya owner punya jalan keluar.
     */
    function sweep(address ke, uint256 jumlah) external onlyOwner {
        if (ke == address(0)) revert ZeroAddress();
        uint256 kewajiban = totalAlokasi - totalTerklaim;
        uint256 saldo = token.balanceOf(address(this));
        if (saldo < kewajiban || saldo - kewajiban < jumlah) {
            revert MelanggarKewajiban();
        }
        if (!token.transfer(ke, jumlah)) revert TransferFailed();
        emit Sweep(ke, jumlah);
    }

    function transferOwnership(address to) external onlyOwner {
        pendingOwner = to;
        emit OwnershipTransferStarted(to);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    /* ── Kematangan ──────────────────────────────────────────────────────── */

    /// Daun merkle untuk sebuah alokasi. Di-hash DUA KALI: daun satu-lapis bisa
    /// bertabrakan dengan simpul dalam pohon, dan tabrakan itu adalah bukti
    /// palsu yang sah secara matematis.
    function daun(address akun, uint256 total, uint256 bagianTge)
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            bytes.concat(keccak256(abi.encode(akun, total, bagianTge)))
        );
    }

    /// Jumlah yang sudah matang pada `waktu`. Nol sebelum TGE.
    function matang(uint256 total, uint256 bagianTge, uint64 waktu)
        public
        view
        returns (uint256)
    {
        uint64 mulai = t0;
        if (mulai == 0 || waktu < mulai) return 0;
        if (bagianTge >= total) return total;
        uint64 lewat = waktu - mulai;
        if (lewat >= DURASI) return total;
        uint256 linear = total - bagianTge;
        return bagianTge + (linear * lewat) / DURASI;
    }

    /// Sisa yang bisa ditarik sekarang oleh `akun`.
    function bisaDiklaim(address akun, uint256 total, uint256 bagianTge)
        external
        view
        returns (uint256)
    {
        uint256 m = matang(total, bagianTge, uint64(block.timestamp));
        uint256 sudah = terklaim[akun];
        return m > sudah ? m - sudah : 0;
    }

    /* ── Klaim ───────────────────────────────────────────────────────────── */

    /**
     * Menarik seluruh porsi yang sudah matang tetapi belum ditarik.
     *
     * Penerima SELALU `msg.sender`, dan buktinya terikat pada alamat itu —
     * tidak ada mode "klaim untuk orang lain" yang bisa disalahgunakan untuk
     * memaksa seseorang menerima token di waktu yang tidak ia pilih.
     */
    function klaim(uint256 total, uint256 bagianTge, bytes32[] calldata bukti)
        external
    {
        if (t0 == 0) revert T0BelumDisetel();
        if (!_sahkan(bukti, daun(msg.sender, total, bagianTge))) {
            revert BuktiTidakSah();
        }

        uint256 m = matang(total, bagianTge, uint64(block.timestamp));
        uint256 sudah = terklaim[msg.sender];
        if (m <= sudah) revert TidakAdaYangMatang();
        uint256 jumlah = m - sudah;

        // Efek sebelum interaksi.
        terklaim[msg.sender] = m;
        totalTerklaim += jumlah;

        if (!token.transfer(msg.sender, jumlah)) revert TransferFailed();
        emit Klaim(msg.sender, jumlah, m);
    }

    function _sahkan(bytes32[] calldata bukti, bytes32 d)
        internal
        view
        returns (bool)
    {
        bytes32 h = d;
        for (uint256 i = 0; i < bukti.length; ++i) {
            bytes32 p = bukti[i];
            h = h <= p
                ? keccak256(abi.encode(h, p))
                : keccak256(abi.encode(p, h));
        }
        return h == merkleRoot;
    }
}
