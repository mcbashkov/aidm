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
 * Each bucket accumulates over ITS OWN period: bucket 0 resets every day,
 * bucket 1 every calendar month. Audit finding F-05 was that both accumulated
 * per day, which meant the "monthly" cap reset every night and a monthly
 * reward could be claimed daily — a ceiling that never held. The calendar
 * month is deliberate rather than a rolling 30 days: the backend's period key
 * is `YYYY-MM` in WIB, and a contract window that did not line up with it
 * would reject legitimate claims at the seam.
 *
 * On top of the per-user buckets there is a GLOBAL daily ceiling across all
 * users. It is not a Sybil defence and must not be mistaken for one — this
 * contract cannot tell a thousand addresses held by a thousand people from a
 * thousand held by one, because that is a question about identity and identity
 * lives in the backend. What the ceiling does is bound the blast radius: if
 * `voucherSigner` ever leaks, the loss is capped at one day's ceiling instead
 * of the entire pool. The accepted cost is a denial-of-service mode — someone
 * who exhausts the global ceiling denies everyone else their rewards until the
 * next day — which is the better of the two failures at this scale, and is
 * documented as a conscious trade rather than an oversight.
 *
 * All day and month boundaries follow Western Indonesia Time (UTC+7), the
 * timezone of the application's users.
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

    /**
     * Ceiling on everything paid out in one UTC+7 day, across all users and
     * both buckets.
     *
     * A value of zero blocks every claim. That is deliberate and is NOT a
     * "disabled" switch: a ceiling that silently stops protecting when
     * misconfigured is the failure mode that hides longest, whereas a ceiling
     * that stops all payouts is noticed within minutes and fixed. The
     * constructor therefore requires a non-zero value.
     */
    uint256 public dailyGlobalCap;

    /// user => nonce => already redeemed
    mapping(address => mapping(uint256 => bool)) public nonceUsed;
    /// user => bucket => period index (day for bucket 0, month for bucket 1)
    /// => amount already claimed in that period
    mapping(address => mapping(uint8 => mapping(uint256 => uint256))) public claimedInPeriod;
    /// UTC+7 day => amount paid out to everyone that day
    mapping(uint256 => uint256) public claimedGlobalOnDay;

    event Claimed(
        address indexed user,
        uint256 indexed missionId,
        uint256 amount,
        uint256 nonce,
        uint8 bucket
    );
    event SignerChanged(address indexed signer);
    event CapChanged(uint8 indexed bucket, uint256 cap);
    event DailyGlobalCapChanged(uint256 cap);
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
    error GlobalCapExceeded();
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
        uint256 monthlyCap,
        uint256 dailyGlobalCap_
    ) {
        if (token_ == address(0) || voucherSigner_ == address(0)) {
            revert ZeroAddress();
        }
        // Zero would brick every claim. Refusing it here means the mistake is
        // caught at deployment instead of by the first user to press Claim.
        if (dailyGlobalCap_ == 0) revert ZeroAmount();
        owner = msg.sender;
        token = IERC20(token_);
        voucherSigner = voucherSigner_;
        caps[0] = dailyCap;
        caps[1] = monthlyCap;
        dailyGlobalCap = dailyGlobalCap_;

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
        emit DailyGlobalCapChanged(dailyGlobalCap_);
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

    /**
     * Raises or lowers the global daily ceiling.
     *
     * GOVERNANCE — recorded here because it is a consequence accepted with
     * open eyes, not a side effect. This function adds a seventh privileged
     * capability to a contract that audit finding F-08 already flags for
     * concentrating six of them in a single address. It must therefore be
     * placed under the same multisig as `owner` from the moment that multisig
     * is designed, not migrated to it afterwards: a ceiling whose height one
     * hot key can change on its own bounds nothing against that key.
     */
    function setDailyGlobalCap(uint256 cap) external onlyOwner {
        if (cap == 0) revert ZeroAmount();
        dailyGlobalCap = cap;
        emit DailyGlobalCapChanged(cap);
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

    /**
     * Calendar month index in UTC+7, as `year * 12 + (month - 1)`.
     *
     * A rolling 30-day window would have been three lines shorter and wrong in
     * a way that only shows up at the seam: the backend keys monthly missions
     * by `YYYY-MM` in WIB, so a contract window drifting against the calendar
     * would start rejecting claims the backend considers perfectly valid, and
     * the user would see a refusal with no explanation behind it.
     *
     * This is the standard civil-from-days conversion (Howard Hinnant's), with
     * the era arithmetic kept unsigned because timestamps here are always
     * after 1970.
     */
    function monthUtc7(uint256 timestamp) public pure returns (uint256) {
        uint256 z = (timestamp + UTC7_OFFSET) / 1 days + 719468;
        uint256 era = z / 146097;
        uint256 doe = z - era * 146097;
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        uint256 y = yoe + era * 400;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        uint256 m = mp < 10 ? mp + 3 : mp - 9;
        if (m <= 2) y += 1;
        return y * 12 + (m - 1);
    }

    /// The period a bucket accumulates over: day for bucket 0, calendar month
    /// for bucket 1. Single source of truth — `claim()` and
    /// `remainingAllowance()` must never be able to disagree about which
    /// window a user is in, because that disagreement is invisible until
    /// someone is refused a reward the UI told them they had.
    function periodOf(uint8 bucket, uint256 timestamp) public pure returns (uint256) {
        return bucket == 0 ? dayUtc7(timestamp) : monthUtc7(timestamp);
    }

    /// Remaining global allowance for the current UTC+7 day, across all users.
    function remainingGlobalAllowance() external view returns (uint256) {
        uint256 used = claimedGlobalOnDay[dayUtc7(block.timestamp)];
        return used >= dailyGlobalCap ? 0 : dailyGlobalCap - used;
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
        uint256 used = claimedInPeriod[user][bucket][periodOf(bucket, block.timestamp)];
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

        // Bucket 0 accumulates per day, bucket 1 per calendar month (F-05).
        uint256 period = periodOf(v.bucket, block.timestamp);
        uint256 used = claimedInPeriod[v.user][v.bucket][period];
        if (used + v.amount > caps[v.bucket]) revert CapExceeded();

        // The global ceiling is checked AFTER the per-user cap so that a user
        // who is over their own allowance is told exactly that, rather than
        // being handed a system-wide error that describes someone else's
        // behaviour.
        uint256 day = dayUtc7(block.timestamp);
        uint256 usedGlobal = claimedGlobalOnDay[day];
        if (usedGlobal + v.amount > dailyGlobalCap) revert GlobalCapExceeded();

        // Effects before interaction: the nonce and both accumulators are
        // written first, so the token transfer below cannot be used to
        // re-enter this function before the state reflects the payout.
        nonceUsed[v.user][v.nonce] = true;
        claimedInPeriod[v.user][v.bucket][period] = used + v.amount;
        claimedGlobalOnDay[day] = usedGlobal + v.amount;

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
