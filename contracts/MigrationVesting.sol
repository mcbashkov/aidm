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
 * MigrationVesting — releases IDM Reborn allocations to verified holders of the
 * previous token generation, on a fixed schedule.
 *
 * WHY THIS CONTRACT EXISTS. The swap contract releases tokens in full on claim,
 * and the migration schedule cannot be expressed that way: holders above a
 * balance threshold receive only 20% at TGE, with the remainder maturing
 * linearly over six months. Holders below the threshold receive everything at
 * once.
 *
 * ── THE TIER IS DERIVED HERE, NOT SUPPLIED ──────────────────────────────────
 *
 * A merkle leaf commits to two values only: the recipient and the amount. The
 * tier is then computed on-chain from that amount against `TGE_THRESHOLD`.
 *
 *   · below threshold → the whole allocation unlocks at TGE
 *   · at or above     → 20% at TGE, remainder linear over six months
 *
 * Keeping the tier out of the leaf is what makes the rule verifiable rather
 * than merely stated. Whoever compiles the allocation list cannot misclassify
 * anyone — not by mistake and not on purpose — because the classification is
 * not theirs to make. Anyone can read the threshold in this contract and
 * recompute every holder's schedule from the amount alone.
 *
 * It also keeps the list minimal: a leaf that carries a derived value invites
 * the derived value and its source to disagree, and nothing on-chain would
 * notice if they did.
 *
 * ── MATURITY MEASURED FROM TGE, NOT FROM THE CLAIM DATE ─────────────────────
 *
 * Vesting is computed from `t0`, a single timestamp shared by everyone. Were it
 * measured from each holder's own claim date, whoever claimed late would finish
 * vesting last — being slow to read an announcement would become a penalty.
 * With a shared `t0`, claiming later never costs anything: what has matured
 * stays matured and waits.
 *
 * ── WHAT IS DELIBERATELY ABSENT ─────────────────────────────────────────────
 *
 * No pause. No function that can reduce an allocation. No way for the owner to
 * touch tokens backing unclaimed allocations — `sweep` can only remove the
 * SURPLUS above outstanding obligations, and that guard is computed from an
 * immutable total. This is a debt owed to earlier holders, and a debt must not
 * come with a cancel button.
 *
 * ── OUT OF SCOPE ────────────────────────────────────────────────────────────
 *
 * TODO: the late-claim pool is NOT handled here. Its distribution rule is
 * pro-rata in principle but has not been decided, and it is deliberately not
 * invented in code: a pool whose rules were guessed is worse than a pool that
 * does not exist yet, because the first one looks official.
 */
contract MigrationVesting {
    /// Six months after TGE, expressed in days rather than calendar months:
    /// linear vesting that steps at month boundaries produces a staircase, not
    /// a line.
    uint64 public constant VESTING_DURATION = 180 days;

    /// Allocations strictly below this receive everything at TGE; the rest
    /// receive 20% at TGE with the remainder vesting linearly.
    uint256 public constant TGE_THRESHOLD = 250_000 ether;
    /// Numerator/denominator of the TGE release for allocations at or above
    /// the threshold: 20%.
    uint256 private constant TGE_NUMERATOR = 1;
    uint256 private constant TGE_DENOMINATOR = 5;

    IERC20 public immutable token;
    /// Root of the verified allocation list. Leaf:
    /// keccak256(bytes.concat(keccak256(abi.encode(account, amount))))
    ///
    /// WARNING FOR ANY DEPLOYMENT BEYOND TESTNET. The root supplied at
    /// construction must commit to the COMPLETE allocation list. At the time
    /// of writing, one allocation worth 586,060.85 IDM has no known recipient
    /// address and is therefore absent from the list; a root built from that
    /// list is valid for testnet only. This field is immutable, so deploying
    /// with an incomplete root does not merely postpone the omission — it
    /// makes it permanent, and the holder it belongs to would have no path to
    /// their allocation ever.
    bytes32 public immutable merkleRoot;
    /// Sum of every allocation in the tree. A merkle root does not reveal the
    /// total it commits to, so it is fixed here to give the `sweep` guard a
    /// number nobody can move.
    uint256 public immutable totalAllocated;

    address public owner;
    address public pendingOwner;

    /// TGE timestamp. Zero means unset; once set it can never change.
    uint64 public t0;

    /// account => amount already withdrawn
    mapping(address => uint256) public claimed;
    uint256 public totalClaimed;

    event TgeSet(uint64 t0);
    event Claimed(address indexed account, uint256 amount, uint256 cumulative);
    event Swept(address indexed to, uint256 amount);
    event OwnershipTransferStarted(address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error ZeroAmount();
    error TgeNotSet();
    error TgeAlreadySet();
    error InvalidProof();
    error NothingVested();
    error TransferFailed();
    error ObligationBreach();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address token_, bytes32 merkleRoot_, uint256 totalAllocated_) {
        if (token_ == address(0)) revert ZeroAddress();
        if (merkleRoot_ == bytes32(0)) revert InvalidProof();
        if (totalAllocated_ == 0) revert ZeroAmount();
        owner = msg.sender;
        token = IERC20(token_);
        merkleRoot = merkleRoot_;
        totalAllocated = totalAllocated_;
    }

    /* ── Administration ──────────────────────────────────────────────────── */

    /**
     * Sets the TGE timestamp. Callable once, and once only.
     *
     * After it is set the entire six-month schedule is fixed and nobody can
     * move it, the owner included. If `t0` were mutable, "vesting completes in
     * March" would stop being a statement about this contract and become a
     * statement about the intentions of whoever holds the key.
     */
    function setT0(uint64 t) external onlyOwner {
        if (t0 != 0) revert TgeAlreadySet();
        if (t == 0) revert ZeroAmount();
        t0 = t;
        emit TgeSet(t);
    }

    /**
     * Withdraws only the SURPLUS held above outstanding obligations.
     *
     * This is not a sweep in the usual sense: it is structurally incapable of
     * touching tokens that back allocations. It exists so that accidental
     * overfunding — a mistaken transfer, or the dust left once everyone has
     * claimed — does not stay locked forever. It does not exist to give the
     * owner a way out.
     */
    function sweep(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 obligation = totalAllocated - totalClaimed;
        uint256 balance = token.balanceOf(address(this));
        if (balance < obligation || balance - obligation < amount) {
            revert ObligationBreach();
        }
        if (!token.transfer(to, amount)) revert TransferFailed();
        emit Swept(to, amount);
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

    /* ── Maturity ────────────────────────────────────────────────────────── */

    /// Merkle leaf for one allocation. Hashed TWICE: a single-hash leaf can
    /// collide with an internal node of the tree, and such a collision is a
    /// forged proof that verifies correctly.
    function leaf(address account, uint256 amount) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
    }

    /// Portion of `amount` that unlocks at TGE, derived from the threshold.
    /// Public so that any holder can check their own schedule without running
    /// a claim, and without trusting a list.
    function tgeAmountOf(uint256 amount) public pure returns (uint256) {
        if (amount < TGE_THRESHOLD) return amount;
        return (amount * TGE_NUMERATOR) / TGE_DENOMINATOR;
    }

    /// Amount vested at `timestamp`. Zero before TGE.
    function vestedAt(uint256 amount, uint64 timestamp)
        public
        view
        returns (uint256)
    {
        uint64 start = t0;
        if (start == 0 || timestamp < start) return 0;
        uint256 tgeAmount = tgeAmountOf(amount);
        if (tgeAmount >= amount) return amount;
        uint64 elapsed = timestamp - start;
        if (elapsed >= VESTING_DURATION) return amount;
        uint256 linear = amount - tgeAmount;
        return tgeAmount + (linear * elapsed) / VESTING_DURATION;
    }

    /// Amount `account` can withdraw right now.
    function claimable(address account, uint256 amount)
        external
        view
        returns (uint256)
    {
        uint256 vested = vestedAt(amount, uint64(block.timestamp));
        uint256 already = claimed[account];
        return vested > already ? vested - already : 0;
    }

    /* ── Claiming ────────────────────────────────────────────────────────── */

    /**
     * Withdraws everything that has matured but not yet been taken.
     *
     * The recipient is ALWAYS `msg.sender`, and the proof is bound to that
     * address — there is no "claim on behalf of" mode that could be used to
     * force tokens onto someone at a moment they did not choose.
     */
    function claim(uint256 amount, bytes32[] calldata proof) external {
        if (t0 == 0) revert TgeNotSet();
        if (!_verify(proof, leaf(msg.sender, amount))) revert InvalidProof();

        uint256 vested = vestedAt(amount, uint64(block.timestamp));
        uint256 already = claimed[msg.sender];
        if (vested <= already) revert NothingVested();
        uint256 amount = vested - already;

        // Effects before interaction.
        claimed[msg.sender] = vested;
        totalClaimed += amount;

        if (!token.transfer(msg.sender, amount)) revert TransferFailed();
        emit Claimed(msg.sender, amount, vested);
    }

    function _verify(bytes32[] calldata proof, bytes32 node)
        internal
        view
        returns (bool)
    {
        bytes32 h = node;
        for (uint256 i = 0; i < proof.length; ++i) {
            bytes32 p = proof[i];
            h = h <= p
                ? keccak256(abi.encode(h, p))
                : keccak256(abi.encode(p, h));
        }
        return h == merkleRoot;
    }
}
