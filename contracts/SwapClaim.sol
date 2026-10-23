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

interface IIDM {
    function transfer(address to, uint256 value) external returns (bool);
    function burn(uint256 value) external;
    function balanceOf(address who) external view returns (uint256);
}

/**
 * SwapClaim — holds the IDM Reborn swap pool on BNB Smart Chain and pays it
 * out against signed vouchers.
 *
 * Flow: the user burns IDMX through SwapInitiator on opBNB; an off-chain
 * relayer observes the burn and signs an EIP-712 voucher carrying the burned
 * amount and the burn's nonce; the user redeems the voucher here. By the time
 * a voucher exists, THE BURN HAS ALREADY HAPPENED and cannot be undone — so
 * this contract's failure modes must never silently consume a voucher without
 * paying it. Every path either pays in full or reverts whole.
 *
 * The claim transaction is sent by the user, who pays their own BSC gas —
 * deliberate, and not to be worked around with a relayer-submit path here.
 *
 * Two guarantees are enforced HERE, in the contract, rather than in the
 * relayer:
 *
 *   1. Voucher replay fails. Nonces mirror SwapInitiator's global burn
 *      numbering — one burn, one claim, forever. Even a fully compromised
 *      relayer cannot pay the same burn twice.
 *   2. The rate can only ever IMPROVE for users. `setRate` refuses any value
 *      that is not strictly lower (fewer IDMX per IDM), making a stealth
 *      devaluation impossible by code, not by policy.
 *
 * A flat fee of 1 IDM per claim is burned — really burned, reducing
 * totalSupply — never collected by anyone.
 */
contract SwapClaim {
    struct SwapVoucher {
        address user;
        /// IDMX burned on opBNB. The payout is derived from this at the rate
        /// current at claim time, so a rate improvement between burn and
        /// claim benefits the user.
        uint256 idmxBurned;
        /// SwapInitiator's nonce for that burn; one burn = one claim.
        uint256 nonce;
        uint64 deadline;
    }

    bytes32 private constant VOUCHER_TYPEHASH = keccak256(
        "SwapVoucher(address user,uint256 idmxBurned,uint256 nonce,uint64 deadline)"
    );

    IIDM public immutable idm;
    bytes32 public immutable domainSeparator;

    address public owner;
    address public pendingOwner;
    /// The only address whose signature makes a voucher valid.
    address public swapSigner;
    bool public paused;

    /// How many IDMX buy one IDM. Starts at 50; can only ratchet DOWN.
    uint256 public rateIdmxPerIdm;

    /// Flat per-claim fee, 100% burned.
    uint256 public constant FEE_IDM = 1e18;

    /// Backstop against an anomalous voucher (e.g. a compromised signer key),
    /// denominated in IDMX — NOT in IDM — for two reasons: a single voucher
    /// can never legitimately exceed one wallet's weekly cap on the burn
    /// side, and IDMX units do not shift when the rate ratchets down. A cap
    /// in IDM would break the moment the rate improved (the same burned IDMX
    /// suddenly pays out more IDM) and would start refusing honest vouchers —
    /// vouchers whose burns already happened.
    uint256 public maxIdmxPerVoucher;

    /// nonce => already redeemed. Global rather than per-user, because the
    /// nonce comes from SwapInitiator's single global counter.
    mapping(uint256 => bool) public nonceUsed;

    /// Claim-side circuit breaker (audit F-07). Weekly aggregate of IDMX
    /// redeemed here, in IDMX units for the same reason as maxIdmxPerVoucher.
    /// At 70% an alert event fires; at 100% the contract pauses itself. It
    /// bounds the damage of a leaked swapSigner to roughly one week of
    /// expected volume instead of the whole pool, independent of the burn side.
    uint256 public claimThreshold;
    uint256 private constant UTC7_OFFSET = 7 hours;
    /// UTC+7 week => aggregate IDMX redeemed that week.
    mapping(uint256 => uint256) public claimedThisWeek;

    event SwapClaimed(
        address indexed user,
        uint256 idmxBurned,
        uint256 netIdm,
        uint256 indexed nonce
    );
    event RateChanged(uint256 rate);
    event SignerChanged(address indexed signer);
    event MaxIdmxPerVoucherChanged(uint256 max);
    event PausedSet(bool paused);
    event ClaimThresholdChanged(uint256 threshold);
    /// Weekly redeemed total crossed 70% of the threshold — monitoring should page.
    event BreakerAlert(uint256 week, uint256 totalAfter, uint256 threshold);
    /// Weekly redeemed total reached the threshold — the contract paused itself.
    event BreakerTripped(uint256 week, uint256 totalAfter, uint256 threshold);
    event OwnershipTransferStarted(address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotPendingOwner();
    error ContractPaused();
    error ZeroAddress();
    error NonceAlreadyUsed();
    error VoucherExpired();
    error InvalidSignature();
    error RatchetViolation();
    error VoucherOutOfRange();
    error AmountTooSmall();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        address idm_,
        address swapSigner_,
        uint256 maxIdmxPerVoucher_,
        uint256 claimThreshold_
    ) {
        if (idm_ == address(0) || swapSigner_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        idm = IIDM(idm_);
        swapSigner = swapSigner_;
        rateIdmxPerIdm = 50;
        maxIdmxPerVoucher = maxIdmxPerVoucher_;
        claimThreshold = claimThreshold_;

        domainSeparator = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("AIDM SwapClaim"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );

        emit SignerChanged(swapSigner_);
        emit RateChanged(50);
        emit MaxIdmxPerVoucherChanged(maxIdmxPerVoucher_);
        emit ClaimThresholdChanged(claimThreshold_);
    }

    /* ── Administration ──────────────────────────────────────────────────── */

    /// One-way ratchet, enforced by code: the rate may only get BETTER for
    /// users (fewer IDMX per IDM). Raising it back is impossible — not
    /// policy, arithmetic. Zero is refused because the rate is a divisor.
    function setRate(uint256 newRate) external onlyOwner {
        if (newRate == 0 || newRate >= rateIdmxPerIdm) revert RatchetViolation();
        rateIdmxPerIdm = newRate;
        emit RateChanged(newRate);
    }

    function setSwapSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        swapSigner = signer;
        emit SignerChanged(signer);
    }

    /// Mirrors the burn side's weekly wallet cap. When raising both, raise
    /// THIS one first, then the burn side's weeklyCap — the reverse order
    /// opens a window in which a burn is accepted on opBNB whose voucher
    /// this check would refuse: an unredeemable burn.
    function setMaxIdmxPerVoucher(uint256 max) external onlyOwner {
        maxIdmxPerVoucher = max;
        emit MaxIdmxPerVoucherChanged(max);
    }

    /// Keep at or above the burn side's globalThreshold, or honest vouchers
    /// (burns already done) could be held back longer than the burn side
    /// would have allowed them to accumulate. Also the manual un-pause path
    /// is `setPaused(false)` after the breaker has tripped.
    function setClaimThreshold(uint256 threshold) external onlyOwner {
        claimThreshold = threshold;
        emit ClaimThresholdChanged(threshold);
    }

    /// Also the manual un-pause after the circuit breaker has tripped.
    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    /// Withdraws pool tokens, e.g. when migrating to a successor contract.
    function sweep(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (!idm.transfer(to, amount)) revert TransferFailed();
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

    /// Week index in UTC+7, derived on-chain (same boundary as SwapInitiator).
    function weekUtc7(uint256 timestamp) public pure returns (uint256) {
        return (timestamp + UTC7_OFFSET) / 7 days;
    }

    /* ── Claiming ────────────────────────────────────────────────────────── */

    function hashVoucher(SwapVoucher calldata v) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator,
                keccak256(
                    abi.encode(VOUCHER_TYPEHASH, v.user, v.idmxBurned, v.nonce, v.deadline)
                )
            )
        );
    }

    /**
     * Redeems a voucher: pays `idmxBurned / rate − 1` IDM to the voucher's
     * user and burns the 1 IDM fee. Callable by anyone — the payout goes to
     * `v.user` regardless of the sender, so security rests on the signature.
     */
    function claim(SwapVoucher calldata v, bytes calldata signature) external {
        if (paused) revert ContractPaused();
        if (block.timestamp > v.deadline) revert VoucherExpired();
        if (nonceUsed[v.nonce]) revert NonceAlreadyUsed();
        if (_recoverSigner(hashVoucher(v), signature) != swapSigner) {
            revert InvalidSignature();
        }

        // Checked in IDMX units — rate-independent, see maxIdmxPerVoucher.
        if (v.idmxBurned > maxIdmxPerVoucher) revert VoucherOutOfRange();

        // Rate at CLAIM time, not burn time: a ratchet between the two only
        // ever pays the user more.
        uint256 gross = v.idmxBurned / rateIdmxPerIdm;
        // Unreachable through the honest path (the burn side enforces a
        // minimum of 500 IDMX = 10 IDM gross), kept as defence in depth so a
        // malformed voucher cannot underflow into a giant payout.
        if (gross <= FEE_IDM) revert AmountTooSmall();
        uint256 net = gross - FEE_IDM;

        // Effects before interactions: the nonce is consumed first, so the
        // token calls below cannot re-enter this function before the state
        // reflects the payout.
        nonceUsed[v.nonce] = true;

        // Circuit breaker. The claim that crosses the threshold is allowed
        // THROUGH and paid in full — its burn already happened on opBNB, and
        // reverting here would undo the very pause being set. The NEXT claim
        // hits the ContractPaused check above. Overshoot is bounded by
        // maxIdmxPerVoucher. Vouchers refused while paused are not lost: the
        // nonce stays unused and the relayer renews expiring vouchers.
        uint256 week = weekUtc7(block.timestamp);
        uint256 totalAfter = claimedThisWeek[week] + v.idmxBurned;
        claimedThisWeek[week] = totalAfter;
        if (totalAfter >= claimThreshold) {
            paused = true;
            emit BreakerTripped(week, totalAfter, claimThreshold);
        } else if (totalAfter * 10 >= claimThreshold * 7) {
            emit BreakerAlert(week, totalAfter, claimThreshold);
        }

        // The fee burn really reduces IDM totalSupply; it is never collected.
        idm.burn(FEE_IDM);
        // The nonce is already consumed above, and the IDMX behind this
        // voucher is already burned on opBNB. A transfer that failed by
        // returning false instead of reverting would consume the voucher
        // without paying — a one-way loss of user funds. Revert instead,
        // which also un-consumes the nonce.
        if (!idm.transfer(v.user, net)) revert TransferFailed();
        emit SwapClaimed(v.user, v.idmxBurned, net, v.nonce);
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
