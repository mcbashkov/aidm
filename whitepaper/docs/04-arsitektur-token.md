---
sidebar_position: 5
slug: /arsitektur-token
id: arsitektur-token
title: "Token architecture"
description: "IDM Reborn, IDMX, contract properties, allocation, and unlock schedule."
---

import AllocationTable from '@site/src/components/AllocationTable';
import UnlockCurve from '@site/src/components/UnlockCurve';
import OnChainStat from '@site/src/components/OnChainStat';

# Token architecture

## Two tokens, two roles

| | IDM Reborn | IDMX |
|---|---|---|
| Network | BNB Chain | opBNB |
| Supply | <OnChainStat metric="idmRebornSupply" /> | <OnChainStat metric="idmxSupply" /> |
| Role | Ecosystem value token | Activity reward points |
| Mint function | None | None |

**Why two, not one.** IDMX is issued continuously as a reward for daily
activity. If it were also the value token, every recorded transaction would
directly inflate holders. Separating them keeps daily activity cheap and
plentiful, while conversion into value passes through a gate with a rate, caps,
and a burn.

**Why two networks.** opBNB was chosen for activity because its gas is cheap
enough for the app to sponsor — a micro-business must not be asked to buy
crypto merely to record a sale. BNB Chain was chosen for the value token
because that is where liquidity lives.

A third stream deliberately uses **no token at all**: AIDM Premium
subscriptions are paid in ordinary money. The product economy must not hold the
token economy hostage, or the reverse.

## IDM Reborn contract properties

- Fixed supply, **no mint function**
- **No buy/sell tax** — a plain ERC-20. This is a listing-compatibility
  decision, not merely friendliness: exchanges reject taxed tokens because they
  break order-book accounting
- A flat transfer fee that is **burned in full**

## Allocation

<AllocationTable />

The migration allocation is split into three separate lines, and the three sum
**exactly** to their parent allocation — checked automatically every time this
site is built. A discrepancy of even a fraction means some tokens have no home.

## Unlock schedule

<UnlockCurve months={24} />

The curve is computed from each allocation's vesting schedule plus the
six-month migration emission. It is not drawn by hand: if the schedule changes,
the curve changes with it.

The dashed line marks circulating supply at TGE.

## IDMX → IDM Reborn swap

A single contract cannot touch two networks, so the swap takes the form of a
signed bridge:

1. The user accumulates IDMX from in-app activity (opBNB)
2. The IDMX is **genuinely burned** — supply decreases, visible on the explorer
3. A relayer signs a voucher after waiting for enough confirmations to survive
   a chain reorganisation
4. The voucher is redeemed on BNB Chain; IDM is released from the pool

Three properties a reader can verify independently:

- **A true burn.** Swapped IDMX leaves the supply. A pool "burned" by moving it
  to a dead address is a weaker claim.
- **A one-way rate.** The rate-setting function rejects any value that worsens
  the user's position. Raising generosity is always possible; lowering it
  destroys trust permanently — so that possibility is closed by code, not by a
  promise.
- **Double redemption is impossible.** Each voucher carries a single-use nonce.
  Even a fully compromised server cannot have one voucher paid twice; the
  contract refuses it.

Swap pool: <OnChainStat metric="swapClaimPool" suffix=" IDM" />, and the
activity reward pool: <OnChainStat metric="missionRewardsPool" suffix=" IDMX" />.

## Layered caps

Limits sit at several levels at once: a swap minimum, a per-wallet weekly cap, a
per-wallet daily reward cap, a monthly cap for higher-value rewards, and a
**global daily cap** across all users combined.

The global cap is not a defence against identity abuse, and must not be read as
one: a contract cannot tell a thousand addresses held by a thousand people from
a thousand held by one — that is a question about identity, and identity lives
off-chain. What it does is **bound the blast radius** if a signing key leaks:
the loss stops at one day rather than the whole pool.

The cost is acknowledged: anyone who exhausts the global cap delays everyone
else's rewards until the next day. At present scale, that trade is favourable.
