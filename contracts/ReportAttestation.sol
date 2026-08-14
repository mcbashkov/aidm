// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * ReportAttestation — segel laporan keuangan AIDM (PRD §7.5 / §9.4).
 *
 * Minimal dan bisa diaudit. Kontrak ini TIDAK menyimpan data keuangan apa pun:
 * hanya hash 32-byte + stempel waktu. Ketentuan §9.4 "hanya bytes32 yang
 * masuk" ditegakkan oleh tipe parameter itu sendiri — tidak ada parameter
 * string, nominal, atau metadata usaha di satu pun fungsi.
 *
 * Hash membuktikan INTEGRITAS + KEBERADAAN laporan pada suatu waktu, BUKAN
 * kebenaran angkanya (§7.5 kejujuran teknis).
 *
 * Tanpa dependensi eksternal (tidak ada OpenZeppelin) — supaya seluruh kode
 * yang diaudit ada di satu berkas ini, dan hasil kompilasi tidak bergeser
 * karena versi library. Ownable dua langkah + pausable ditulis langsung.
 *
 * Kepemilikan produksi (§9.4): setelah deploy, transferOwnership ke multisig
 * ber-timelock. Itu konfigurasi deploy, bukan kode.
 */
contract ReportAttestation {
    struct Seal {
        bytes32 reportHash;
        uint64 sealedAt;
    }

    address public owner;
    address public pendingOwner;
    /// Treasury yang mensponsori gas — satu-satunya alamat yang boleh
    /// menyegel atas nama user (§7.5 "gas disponsori").
    address public relayer;
    bool public paused;

    /// user => periodKey (keccak256("2026-08")) => segel TERAKHIR.
    /// Segel ulang menimpa nilai ini; seluruh riwayat tetap abadi di event
    /// `Sealed` (§9.4 — riwayat justru menambah kredibilitas).
    mapping(address => mapping(bytes32 => Seal)) public seals;

    event Sealed(
        address indexed user,
        bytes32 indexed periodKey,
        bytes32 reportHash,
        uint64 sealedAt
    );
    event RelayerChanged(address indexed relayer);
    event PausedSet(bool paused);
    event OwnershipTransferStarted(address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotRelayer();
    error NotPendingOwner();
    error ContractPaused();
    error ZeroHash();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    constructor(address relayer_) {
        if (relayer_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        relayer = relayer_;
        emit RelayerChanged(relayer_);
    }

    /* ── Administrasi ────────────────────────────────────────────────────── */

    function setRelayer(address relayer_) external onlyOwner {
        if (relayer_ == address(0)) revert ZeroAddress();
        relayer = relayer_;
        emit RelayerChanged(relayer_);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    /// Dua langkah: salah tulis alamat owner baru tidak langsung fatal —
    /// kepemilikan baru pindah setelah alamat tujuan MENERIMA.
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

    /* ── Segel (§9.4) ────────────────────────────────────────────────────── */

    /// Menyegel atas nama diri sendiri — jalur user membayar gas sendiri
    /// (dipakai bila kelak user ingin lepas dari relayer).
    function attest(bytes32 periodKey, bytes32 reportHash)
        external
        whenNotPaused
    {
        _attest(msg.sender, periodKey, reportHash);
    }

    /// Jalur gasless (§9.4 "sponsored"): relayer treasury mengirim atas nama
    /// user; ALAMAT USER yang tercatat sebagai subjek segel, bukan relayer.
    function attestFor(address user, bytes32 periodKey, bytes32 reportHash)
        external
        whenNotPaused
    {
        if (msg.sender != relayer) revert NotRelayer();
        if (user == address(0)) revert ZeroAddress();
        _attest(user, periodKey, reportHash);
    }

    function _attest(address user, bytes32 periodKey, bytes32 reportHash)
        internal
    {
        if (reportHash == bytes32(0)) revert ZeroHash();
        uint64 kini = uint64(block.timestamp);
        seals[user][periodKey] = Seal(reportHash, kini);
        emit Sealed(user, periodKey, reportHash, kini);
    }

    /* ── Verifikasi pihak ketiga (§9.4) ──────────────────────────────────── */

    /// Bank menghitung ulang hash dari data kanonik di laporan, lalu
    /// mencocokkan ke sini. `ok` true = laporan tidak berubah sejak disegel.
    function verify(address user, bytes32 periodKey, bytes32 reportHash)
        external
        view
        returns (bool ok, uint64 sealedAt)
    {
        Seal memory s = seals[user][periodKey];
        return (
            s.reportHash != bytes32(0) && s.reportHash == reportHash,
            s.sealedAt
        );
    }
}
