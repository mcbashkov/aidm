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

interface IIDMX {
    function burnFrom(address from, uint256 value) external;
}

/**
 * SwapInitiator — the ONLY exit door for IDMX, deployed on opBNB.
 *
 * Burning IDMX here is the first leg of a cross-chain claim: an off-chain
 * relayer observes `SwapRequested`, signs a voucher for the same nonce, and
 * the user redeems that voucher on BNB Smart Chain for IDM Reborn.
 *
 * The one invariant everything in this file serves: A BURN CAN NEVER BE
 * REFUSED REDEMPTION. Burning is irreversible, so every possible rejection —
 * minimum amount, weekly cap, lifetime cap, circuit breaker, pause — happens
 * HERE, BEFORE the burn. Once `SwapRequested` is emitted, the burn has
 * happened and the corresponding voucher must always be redeemable on the
 * other side.
 *
 * The transaction is sent by the USER's wallet (the relayer only keeps users
 * topped up with dust gas; it never submits on their behalf), so on-chain
 * activity reflects real users.
 *
 * All week boundaries follow Western Indonesia Time (UTC+7), the timezone of
 * the application's users.
 */
contract SwapInitiator {
    IIDMX public immutable idmx;

    address public owner;
    address public pendingOwner;
    bool public paused;

    /// Below this the swap is refused outright. A floor keeps dust swaps from
    /// wasting relayer work and BSC-side claim gas on amounts worth less than
    /// the fee they would pay.
    uint256 public constant MIN_SWAP = 500e18;

    /// Per-wallet allowance per UTC+7 week.
    uint256 public weeklyCap;

    /// Global weekly circuit-breaker threshold: at 70% an alert event fires
    /// for monitoring, at 100% the contract pauses itself. A runaway pattern
    /// (exploited backend, farmed rewards) is capped at roughly one week of
    /// expected volume instead of draining the BSC pool.
    uint256 public globalThreshold;

    /// Lifetime ceiling on the total IDMX ever burned here, denominated in
    /// IDMX. Set to the remaining BSC pool converted at the current rate, so
    /// a burn can never be accepted that the pool could not honour — the
    /// on-chain backstop for the invariant above. Owner-settable because it
    /// must be re-tightened whenever the BSC-side rate changes; the runbook
    /// is: tighten this FIRST, then improve the rate.
    uint256 public lifetimeCap;

    /// Total IDMX burned through this contract since deployment. Only grows.
    uint256 public totalBurned;

    /// Numbering for SwapRequested events; nonce N on this chain corresponds
    /// to exactly one voucher on BSC.
    uint256 public nonceCounter;

    uint256 private constant UTC7_OFFSET = 7 hours;

    /// user => UTC+7 week => IDMX swapped that week
    mapping(address => mapping(uint256 => uint256)) public usedThisWeek;
    /// UTC+7 week => aggregate IDMX swapped by everyone that week
    mapping(uint256 => uint256) public weeklyTotal;

    event SwapRequested(
        address indexed user,
        uint256 idmxAmount,
        uint256 indexed nonce,
        uint256 timestamp
    );
    /// Weekly total crossed 70% of the threshold — monitoring should page.
    event BreakerAlert(uint256 week, uint256 totalAfter, uint256 threshold);
    /// Weekly total reached the threshold — the contract paused itself.
    event BreakerTripped(uint256 week, uint256 totalAfter, uint256 threshold);
    event WeeklyCapChanged(uint256 cap);
    event GlobalThresholdChanged(uint256 threshold);
    event LifetimeCapChanged(uint256 cap);
    event PausedSet(bool paused);
    event OwnershipTransferStarted(address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotPendingOwner();
    error ContractPaused();
    error ZeroAddress();
    error BelowMinimum();
    error WeeklyCapExceeded();
    error LifetimeCapExceeded();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        address idmx_,
        uint256 weeklyCap_,
        uint256 globalThreshold_,
        uint256 lifetimeCap_
    ) {
        if (idmx_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        idmx = IIDMX(idmx_);
        weeklyCap = weeklyCap_;
        globalThreshold = globalThreshold_;
        lifetimeCap = lifetimeCap_;
        emit WeeklyCapChanged(weeklyCap_);
        emit GlobalThresholdChanged(globalThreshold_);
        emit LifetimeCapChanged(lifetimeCap_);
    }

    /* ── Administration ──────────────────────────────────────────────────── */

    /// When RAISING: first raise maxIdmxPerVoucher on the BSC claim side,
    /// THEN this. The reverse order opens a window in which a single burn
    /// larger than the claim side's per-voucher cap is accepted here but its
    /// voucher is refused there — an unredeemable burn, the one thing this
    /// system must never produce.
    function setWeeklyCap(uint256 cap) external onlyOwner {
        weeklyCap = cap;
        emit WeeklyCapChanged(cap);
    }

    function setGlobalThreshold(uint256 threshold) external onlyOwner {
        globalThreshold = threshold;
        emit GlobalThresholdChanged(threshold);
    }

    /// Re-tightened whenever the BSC-side rate is about to improve:
    /// newCap = totalBurned + remainingPoolIdm * newRate - unclaimedBurnedIdmx,
    /// where unclaimedBurnedIdmx is the IDMX already burned whose nonce is not
    /// yet consumed on the claim side. The subtraction matters: vouchers pay
    /// at the rate current at CLAIM time, so burns pending at the ratchet
    /// will draw MORE from the pool than they did when admitted — capacity
    /// must be reserved for them at the NEW rate, not treated as settled.
    /// Tighten here FIRST, then change the rate — the other order opens a
    /// window in which burns can be accepted that the pool cannot honour.
    function setLifetimeCap(uint256 cap) external onlyOwner {
        lifetimeCap = cap;
        emit LifetimeCapChanged(cap);
    }

    /// Also the manual un-pause after the circuit breaker has tripped.
    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
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

    /* ── Views ───────────────────────────────────────────────────────────── */

    /// Week index in UTC+7. Derived on-chain so the boundary never depends on
    /// any server's clock, and consistent with the UTC+7 day index used by
    /// the rewards contract on this same chain.
    function weekUtc7(uint256 timestamp) public pure returns (uint256) {
        return (timestamp + UTC7_OFFSET) / 7 days;
    }

    /// Remaining weekly allowance for a wallet, for the UI.
    function remainingWeeklyAllowance(address user) external view returns (uint256) {
        uint256 used = usedThisWeek[user][weekUtc7(block.timestamp)];
        return used >= weeklyCap ? 0 : weeklyCap - used;
    }

    /* ── Swapping ────────────────────────────────────────────────────────── */

    /**
     * Burns `idmxAmount` of the caller's IDMX and emits `SwapRequested`,
     * which entitles the caller to a signed voucher redeemable for IDM Reborn
     * on BNB Smart Chain. Requires a prior `approve` on the IDMX contract.
     *
     * Every rejection lives above the burn — see the contract-level comment.
     */
    function swap(uint256 idmxAmount) external {
        if (paused) revert ContractPaused();
        if (idmxAmount < MIN_SWAP) revert BelowMinimum();

        uint256 week = weekUtc7(block.timestamp);
        uint256 used = usedThisWeek[msg.sender][week];
        if (used + idmxAmount > weeklyCap) revert WeeklyCapExceeded();

        // Lifetime backstop: refuse (BEFORE the burn, so the invariant holds)
        // any burn the BSC pool could not honour at the current rate.
        uint256 newTotalBurned = totalBurned + idmxAmount;
        if (newTotalBurned > lifetimeCap) revert LifetimeCapExceeded();

        uint256 newWeeklyTotal = weeklyTotal[week] + idmxAmount;

        // Effects before interaction.
        usedThisWeek[msg.sender][week] = used + idmxAmount;
        weeklyTotal[week] = newWeeklyTotal;
        totalBurned = newTotalBurned;
        uint256 nonce = ++nonceCounter;

        // The transaction that crosses the threshold is allowed THROUGH: its
        // burn and SwapRequested complete, `paused` is stored, and it is the
        // NEXT transaction that hits the ContractPaused check above.
        // Reverting here instead would undo the very pause being set. The
        // overshoot is bounded by one weeklyCap, which is acceptable. Edge
        // case: if burnFrom below reverts (insufficient allowance), the trip
        // is rolled back with it — benign, the next over-threshold
        // transaction trips it again.
        if (newWeeklyTotal >= globalThreshold) {
            paused = true;
            emit BreakerTripped(week, newWeeklyTotal, globalThreshold);
        } else if (newWeeklyTotal * 10 >= globalThreshold * 7) {
            emit BreakerAlert(week, newWeeklyTotal, globalThreshold);
        }

        idmx.burnFrom(msg.sender, idmxAmount);
        emit SwapRequested(msg.sender, idmxAmount, nonce, block.timestamp);
    }
}
