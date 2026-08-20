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
 * MissionRewards — pays out in-app mission rewards against signed vouchers.
 *
 * Flow: the backend evaluates a user's mission progress and, when a reward is
 * earned, SIGNS an EIP-712 voucher for it. The voucher is redeemed on-chain,
 * either by a treasury relayer (so the user pays no gas) or by the user
 * directly. The recipient is ALWAYS the `user` field inside the voucher,
 * regardless of who submits the transaction — the security of this contract
 * rests on the signature, not on the identity of the sender.
 *
 * Two guarantees are enforced HERE, in the contract, rather than in the
 * backend:
 *
 *   1. Voucher replay fails. Every voucher carries a `nonce`; a nonce that has
 *      been used is rejected permanently. Even a fully compromised backend
 *      cannot cause the same voucher to be paid twice.
 *   2. Payout caps are enforced on-chain. Per-day accumulation is tracked
 *      here, so a bug or a compromise in the backend cannot exceed it. This is
 *      precisely why checking the cap in the API alone would be insufficient.
 *
 * Caps are split into two independent buckets so that a low-frequency,
 * higher-value reward does not consume the allowance meant for everyday
 * rewards: bucket 0 is the daily allowance, bucket 1 is the monthly one.
 *
 * All day boundaries follow Western Indonesia Time (UTC+7), the timezone of
 * the application's users.
 */
contract MissionRewards {
    struct Voucher {
        address user;
        uint256 missionId; // hash of the mission code; opaque to this contract
        uint256 amount;
        uint256 nonce;
        uint64 deadline;
        uint8 bucket; // 0 = daily allowance, 1 = monthly allowance
    }

    /// Day index in UTC+7, computed as (timestamp + 7 hours) / 86400. Derived
    /// on-chain so that the day boundary never depends on the clock of
    /// whichever server happens to submit the transaction.
    uint256 private constant UTC7_OFFSET = 7 hours;

    bytes32 private constant VOUCHER_TYPEHASH = keccak256(
        "Voucher(address user,uint256 missionId,uint256 amount,uint256 nonce,uint64 deadline,uint8 bucket)"
    );

    IERC20 public immutable token;
    bytes32 public immutable domainSeparator;

    address public owner;
    address public pendingOwner;
    /// The only address whose signature makes a voucher valid.
    address public voucherSigner;
    bool public paused;

    /// Per-bucket cap, denominated in the token's smallest unit.
    uint256[2] public caps;

    /// user => nonce => already redeemed
    mapping(address => mapping(uint256 => bool)) public nonceUsed;
    /// user => bucket => UTC+7 day => amount already claimed that day
    mapping(address => mapping(uint8 => mapping(uint256 => uint256))) public claimedOnDay;

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
    error NonceAlreadyUsed();
    error VoucherExpired();
    error InvalidSignature();
    error UnknownBucket();
    error CapExceeded();
    error ZeroAmount();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        address token_,
        address voucherSigner_,
        uint256 dailyCap,
        uint256 monthlyCap
    ) {
        if (token_ == address(0) || voucherSigner_ == address(0)) {
            revert ZeroAddress();
        }
        owner = msg.sender;
        token = IERC20(token_);
        voucherSigner = voucherSigner_;
        caps[0] = dailyCap;
        caps[1] = monthlyCap;

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
        emit CapChanged(0, dailyCap);
        emit CapChanged(1, monthlyCap);
    }

    /* ── Administration ──────────────────────────────────────────────────── */

    function setVoucherSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        voucherSigner = signer;
        emit SignerChanged(signer);
    }

    function setCap(uint8 bucket, uint256 cap) external onlyOwner {
        if (bucket > 1) revert UnknownBucket();
        caps[bucket] = cap;
        emit CapChanged(bucket, cap);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    /// Withdraws remaining tokens back to the treasury, e.g. when migrating
    /// to a successor contract.
    function sweep(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (!token.transfer(to, amount)) revert TransferFailed();
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

    /* ── Claiming ────────────────────────────────────────────────────────── */

    function dayUtc7(uint256 timestamp) public pure returns (uint256) {
        return (timestamp + UTC7_OFFSET) / 1 days;
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

    /// Remaining allowance for a user in a given bucket, for the current
    /// UTC+7 day.
    function remainingAllowance(address user, uint8 bucket) external view returns (uint256) {
        if (bucket > 1) return 0;
        uint256 used = claimedOnDay[user][bucket][dayUtc7(block.timestamp)];
        return used >= caps[bucket] ? 0 : caps[bucket] - used;
    }

    /**
     * Redeems a voucher. Callable by anyone: security rests on the signature,
     * not on the identity of the sender. That is precisely what lets sponsored
     * mode (a treasury relayer submits) and self-service mode (the user pays
     * their own gas) travel the exact same code path.
     */
    function claim(Voucher calldata v, bytes calldata signature) external {
        if (paused) revert ContractPaused();
        if (v.amount == 0) revert ZeroAmount();
        if (v.bucket > 1) revert UnknownBucket();
        if (block.timestamp > v.deadline) revert VoucherExpired();
        if (nonceUsed[v.user][v.nonce]) revert NonceAlreadyUsed();
        if (_recoverSigner(hashVoucher(v), signature) != voucherSigner) {
            revert InvalidSignature();
        }

        uint256 day = dayUtc7(block.timestamp);
        uint256 used = claimedOnDay[v.user][v.bucket][day];
        if (used + v.amount > caps[v.bucket]) revert CapExceeded();

        // Effects before interaction: the nonce and the accumulator are
        // written first, so the token transfer below cannot be used to
        // re-enter this function before the state reflects the payout.
        nonceUsed[v.user][v.nonce] = true;
        claimedOnDay[v.user][v.bucket][day] = used + v.amount;

        // The nonce is already burned above, so a transfer that failed by
        // returning false (instead of reverting) would silently consume the
        // voucher without paying the user. Revert instead, which also
        // un-burns the nonce.
        if (!token.transfer(v.user, v.amount)) revert TransferFailed();
        emit Claimed(v.user, v.missionId, v.amount, v.nonce, v.bucket);
    }

    function _recoverSigner(bytes32 digest, bytes calldata sig)
        internal
        pure
        returns (address)
    {
        if (sig.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 vParam;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            vParam := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (vParam < 27) vParam += 27;
        // Reject signatures whose `s` lies in the upper half of the curve
        // order. Without this check a second, equally valid signature exists
        // for the same voucher (signature malleability).
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert InvalidSignature();
        }
        address recovered = ecrecover(digest, vParam, r, s);
        if (recovered == address(0)) revert InvalidSignature();
        return recovered;
    }
}
