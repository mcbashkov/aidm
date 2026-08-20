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
 * ReportAttestation — anchors a fingerprint of a user's financial report
 * on-chain.
 *
 * This contract stores NO financial data whatsoever: only a 32-byte hash and a
 * timestamp. That constraint is enforced by the parameter types themselves —
 * no function accepts a string, an amount, or any business metadata, so there
 * is no code path through which private figures could reach a public,
 * permanent ledger.
 *
 * What the hash proves is INTEGRITY and EXISTENCE AT A POINT IN TIME: that a
 * given report has not changed since it was sealed. It does NOT prove the
 * figures are correct. A user can seal invented numbers, and this contract
 * would faithfully anchor them. Any wording that presents a seal as an audit
 * or as a creditworthiness assessment misrepresents what this code does.
 *
 * No external dependencies (no OpenZeppelin), so every line under audit lives
 * in this single file and the compiled output does not shift with a library
 * version bump. Two-step ownable and pausable are written out directly.
 *
 * Production ownership: after deployment, ownership is transferred to a
 * timelocked multisig. That is deployment configuration, not code.
 */
contract ReportAttestation {
    struct Seal {
        bytes32 reportHash;
        uint64 sealedAt;
    }

    address public owner;
    address public pendingOwner;
    /// The gas-sponsoring treasury: the only address permitted to seal on
    /// behalf of another user.
    address public relayer;
    bool public paused;

    /// user => periodKey (e.g. keccak256("2026-08")) => the LATEST seal.
    /// Re-sealing a period overwrites this entry, while the full history
    /// remains permanently readable from the `Sealed` events. Keeping that
    /// history visible is intentional: a corrected report that was re-sealed
    /// is more credible than one with no trace of revision.
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

    /* ── Administration ──────────────────────────────────────────────────── */

    function setRelayer(address relayer_) external onlyOwner {
        if (relayer_ == address(0)) revert ZeroAddress();
        relayer = relayer_;
        emit RelayerChanged(relayer_);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    /// Two-step by design: mistyping the new owner address is not immediately
    /// fatal, because ownership only moves once the target address ACCEPTS.
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

    /* ── Sealing ─────────────────────────────────────────────────────────── */

    /// Seals on behalf of the caller, who pays their own gas. Kept available
    /// so a user is never dependent on the relayer to anchor their report.
    function attest(bytes32 periodKey, bytes32 reportHash)
        external
        whenNotPaused
    {
        _attest(msg.sender, periodKey, reportHash);
    }

    /// Sponsored path: the treasury relayer submits and pays gas on behalf of
    /// a user. The USER's address is recorded as the subject of the seal, not
    /// the relayer's — who paid for the transaction is irrelevant to who the
    /// seal belongs to.
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
        uint64 nowTs = uint64(block.timestamp);
        seals[user][periodKey] = Seal(reportHash, nowTs);
        emit Sealed(user, periodKey, reportHash, nowTs);
    }

    /* ── Third-party verification ────────────────────────────────────────── */

    /// A third party recomputes the hash from the canonical data printed in
    /// the report and matches it here. `ok == true` means the report has not
    /// changed since it was sealed.
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
