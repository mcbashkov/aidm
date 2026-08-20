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
 * IDMX — in-app reward token of the AIDM application, deployed on opBNB.
 *
 * Minimal ERC-20 with no external dependencies. This is deliberate: every line
 * subject to audit lives in this single file, and the compiled output does not
 * shift because of a library version bump.
 *
 * The total supply is fixed ONCE at deployment and minted in full to the
 * treasury address. There is no `mint` function anywhere in this contract, so
 * after deployment the supply can only ever DECREASE through burning — never
 * increase, regardless of what happens to the treasury key. Reward
 * distribution draws from an existing balance, never from fresh issuance.
 *
 * IDMX is NOT the IDM Reborn token. IDM Reborn is a separate ERC-20 deployed on
 * BNB Smart Chain; the two are intentionally distinct assets on distinct
 * networks. IDMX is earned in-app and can be burned to claim IDM Reborn.
 */
contract IDMX {
    string public constant name = "IDMX";
    string public constant symbol = "IDMX";
    uint8 public constant decimals = 18;

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

    constructor(address treasury, uint256 supply) {
        if (treasury == address(0)) revert ZeroAddress();
        totalSupply = supply;
        balanceOf[treasury] = supply;
        emit Transfer(address(0), treasury, supply);
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

    /// Burns on behalf of `from`, consuming the caller's allowance. Used by
    /// the swap contract to burn a user's IDMX as the first leg of a
    /// cross-chain claim.
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
