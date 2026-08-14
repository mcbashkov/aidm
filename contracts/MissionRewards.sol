// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

/**
 * MissionRewards — klaim reward misi lewat voucher bertanda tangan (PRD §7.6).
 *
 * Alur: server menghitung progres misi lalu MENANDATANGANI voucher (EIP-712).
 * Voucher ditebus on-chain — oleh relayer treasury (gasless bagi user) maupun
 * oleh user sendiri. Yang menerima IDMX SELALU `user` di dalam voucher, siapa
 * pun pengirim transaksinya.
 *
 * Dua jaminan yang diminta AC §7.6 ditegakkan DI KONTRAK, bukan di server:
 *
 *   1. **Replay voucher gagal.** Tiap voucher punya `nonce`; nonce yang sudah
 *      terpakai ditolak permanen. Server yang bocor pun tidak bisa membayar
 *      voucher yang sama dua kali.
 *   2. **Cap harian ditegakkan kontrak.** Akumulasi per hari WIB dijaga di
 *      sini. Bug atau kompromi di server tidak bisa menembusnya — inilah
 *      alasan cap tidak cukup dicek di API saja.
 *
 * Cap dipisah dua ember (§7.6 "misi bulanan di luar cap harian, cap
 * tersendiri"): ember 0 = harian, ember 1 = bulanan.
 */
contract MissionRewards {
    struct Voucher {
        address user;
        uint256 missionId; // hash kode misi — kontrak tidak perlu tahu artinya
        uint256 amount;
        uint256 nonce;
        uint64 deadline;
        uint8 bucket; // 0 = cap harian · 1 = cap bulanan
    }

    /// Hari WIB = (timestamp + 7 jam) / 86400. Dihitung on-chain supaya
    /// pergantian hari tidak bergantung pada jam server yang mengirim.
    uint256 private constant OFFSET_WIB = 7 hours;

    bytes32 private constant VOUCHER_TYPEHASH = keccak256(
        "Voucher(address user,uint256 missionId,uint256 amount,uint256 nonce,uint64 deadline,uint8 bucket)"
    );

    IERC20 public immutable token;
    bytes32 public immutable domainSeparator;

    address public owner;
    address public pendingOwner;
    /// Alamat yang tanda tangannya diakui sebagai voucher sah.
    address public voucherSigner;
    bool public paused;

    /// Batas per ember, dalam satuan token terkecil (wei IDMX).
    uint256[2] public caps;

    /// user => nonce => sudah terpakai
    mapping(address => mapping(uint256 => bool)) public nonceTerpakai;
    /// user => ember => hari WIB => sudah diklaim hari itu
    mapping(address => mapping(uint8 => mapping(uint256 => uint256))) public terklaim;

    event Claimed(
        address indexed user,
        uint256 indexed missionId,
        uint256 amount,
        uint256 nonce,
        uint8 bucket
    );
    event SignerChanged(address indexed signer);
    event CapChanged(uint8 indexed bucket, uint256 cap);
    event PausedSet(bool paused);
    event OwnershipTransferStarted(address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotPendingOwner();
    error ContractPaused();
    error ZeroAddress();
    error NonceTerpakai();
    error VoucherKedaluwarsa();
    error TandaTanganTidakSah();
    error EmberTidakDikenal();
    error MelebihiCap();
    error JumlahNol();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        address token_,
        address voucherSigner_,
        uint256 capHarian,
        uint256 capBulanan
    ) {
        if (token_ == address(0) || voucherSigner_ == address(0)) {
            revert ZeroAddress();
        }
        owner = msg.sender;
        token = IERC20(token_);
        voucherSigner = voucherSigner_;
        caps[0] = capHarian;
        caps[1] = capBulanan;

        domainSeparator = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("AIDM MissionRewards"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );

        emit SignerChanged(voucherSigner_);
        emit CapChanged(0, capHarian);
        emit CapChanged(1, capBulanan);
    }

    /* ── Administrasi ────────────────────────────────────────────────────── */

    function setVoucherSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        voucherSigner = signer;
        emit SignerChanged(signer);
    }

    function setCap(uint8 bucket, uint256 cap) external onlyOwner {
        if (bucket > 1) revert EmberTidakDikenal();
        caps[bucket] = cap;
        emit CapChanged(bucket, cap);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    /// Tarik sisa IDMX kembali ke treasury (mis. saat migrasi kontrak).
    function sweep(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        token.transfer(to, amount);
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

    /* ── Klaim ───────────────────────────────────────────────────────────── */

    function hariWib(uint256 timestamp) public pure returns (uint256) {
        return (timestamp + OFFSET_WIB) / 1 days;
    }

    function hashVoucher(Voucher calldata v) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator,
                keccak256(
                    abi.encode(
                        VOUCHER_TYPEHASH,
                        v.user,
                        v.missionId,
                        v.amount,
                        v.nonce,
                        v.deadline,
                        v.bucket
                    )
                )
            )
        );
    }

    /// Sisa jatah user pada ember tertentu untuk hari WIB berjalan.
    function sisaJatah(address user, uint8 bucket) external view returns (uint256) {
        if (bucket > 1) return 0;
        uint256 dipakai = terklaim[user][bucket][hariWib(block.timestamp)];
        return dipakai >= caps[bucket] ? 0 : caps[bucket] - dipakai;
    }

    /**
     * Tebus voucher. Boleh dipanggil siapa pun — keamanannya bersandar pada
     * tanda tangan, bukan pada identitas pengirim. Itulah yang membuat mode
     * gasless (relayer treasury mengirim) dan mode mandiri (user membayar gas
     * sendiri) memakai jalur kode yang sama persis.
     */
    function claim(Voucher calldata v, bytes calldata signature) external {
        if (paused) revert ContractPaused();
        if (v.amount == 0) revert JumlahNol();
        if (v.bucket > 1) revert EmberTidakDikenal();
        if (block.timestamp > v.deadline) revert VoucherKedaluwarsa();
        if (nonceTerpakai[v.user][v.nonce]) revert NonceTerpakai();
        if (_pulihkan(hashVoucher(v), signature) != voucherSigner) {
            revert TandaTanganTidakSah();
        }

        uint256 hari = hariWib(block.timestamp);
        uint256 dipakai = terklaim[v.user][v.bucket][hari];
        if (dipakai + v.amount > caps[v.bucket]) revert MelebihiCap();

        // Efek sebelum interaksi: nonce & akumulasi ditandai lebih dulu supaya
        // transfer token tidak bisa dipakai untuk masuk kembali.
        nonceTerpakai[v.user][v.nonce] = true;
        terklaim[v.user][v.bucket][hari] = dipakai + v.amount;

        token.transfer(v.user, v.amount);
        emit Claimed(v.user, v.missionId, v.amount, v.nonce, v.bucket);
    }

    function _pulihkan(bytes32 digest, bytes calldata sig)
        internal
        pure
        returns (address)
    {
        if (sig.length != 65) revert TandaTanganTidakSah();
        bytes32 r;
        bytes32 s;
        uint8 vParam;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            vParam := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (vParam < 27) vParam += 27;
        // Tolak s bagian atas kurva: mencegah tanda tangan kembar (malleability)
        // yang menghasilkan digest sah kedua untuk voucher yang sama.
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert TandaTanganTidakSah();
        }
        address pemulih = ecrecover(digest, vParam, r, s);
        if (pemulih == address(0)) revert TandaTanganTidakSah();
        return pemulih;
    }
}
