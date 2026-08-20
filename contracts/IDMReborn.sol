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
 * IDM Reborn — the IDM token reborn on BNB Smart Chain.
 *
 * A pure, minimal ERC-20 with no external dependencies: every line subject to
 * audit lives in this single file, and the compiled output does not shift
 * because of a library version bump.
 *
 * This contract deliberately has NO owner and NO privileged function of any
 * kind — no mint, no pause, no blacklist, no fee switch, no upgrade hook.
 * There is nothing to renounce because the power never existed, and that is
 * verifiable from this source alone. The entire supply of 1,000,000,000
 * tokens is minted once, in the constructor, to the treasury address, and can
 * only ever DECREASE afterwards through burning.
 *
 * There is intentionally no transfer tax in either direction: the token is a
 * standard ERC-20 so that exchanges, aggregators, and routers can integrate
 * it without special-casing.
 *
 * IDM Reborn is NOT IDMX. IDMX is a separate in-app reward token on opBNB;
 * the two are intentionally distinct assets on distinct networks. IDMX earned
 * in-app can be burned to claim IDM Reborn through the swap contracts.
 */
contract IDMReborn {
    string public constant name = "IDM Reborn";
    string public constant symbol = "IDM";
    uint8 public constant decimals = 18;

    /// Hard-coded on purpose: there is no legitimate reason to deploy this
    /// token with any other supply, so the constructor takes none.
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000e18;

    // Plain storage rather than `immutable`, because burning decreases it.
    // With no mint function, this value can only move in one direction: down.
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Burned(address indexed from, uint256 value);

    error InsufficientBalance();
    error InsufficientAllowance();
    error ZeroAddress();

    /// Mints the full supply to `treasury`. This is the ONLY mint that will
    /// ever happen. A wrong treasury address here strands the supply
    /// permanently — there is no owner function to recover it — so the
    /// deployer must verify the address before sending this transaction.
    constructor(address treasury) {
        if (treasury == address(0)) revert ZeroAddress();
        totalSupply = INITIAL_SUPPLY;
        balanceOf[treasury] = INITIAL_SUPPLY;
        emit Transfer(address(0), treasury, INITIAL_SUPPLY);
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
        uint256 allowed = allowance[from][msg.sender];
        // type(uint256).max means an unlimited approval and is not decremented
        // on each transfer. This is the conventional pattern and saves gas for
        // contracts that pull from the same allowance repeatedly.
        if (allowed != type(uint256).max) {
            if (allowed < value) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = allowed - value;
            }
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 balance = balanceOf[from];
        if (balance < value) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = balance - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    /* ── Burning ─────────────────────────────────────────────────────────── */
    // A real burn: `totalSupply` is reduced, and emitting `Transfer(from, 0x0)`
    // is what makes block explorers report the burn and lower the token's
    // reported Total Supply. Sending tokens to a dead address such as 0xdead
    // would merely park them at an unspendable address while leaving the supply
    // figure untouched, which is not the intended behaviour here.

    function burn(uint256 value) external {
        _burn(msg.sender, value);
    }

    /// Burns on behalf of `from`, consuming the caller's allowance. Kept for
    /// parity with common ERC-20 burn extensions so integrating contracts and
    /// tooling can rely on it; nothing in this system depends on it today.
    function burnFrom(address from, uint256 value) external {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < value) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = allowed - value;
            }
        }
        _burn(from, value);
    }

    function _burn(address from, uint256 value) internal {
        uint256 balance = balanceOf[from];
        if (balance < value) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = balance - value;
            totalSupply -= value;
        }
        emit Transfer(from, address(0), value);
        emit Burned(from, value);
    }
}
