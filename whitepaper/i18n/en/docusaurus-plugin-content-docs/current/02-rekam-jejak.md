---
sidebar_position: 3
slug: /rekam-jejak
id: rekam-jejak
title: "Track record & migration"
description: "The v1 token, the decision to halt trading, and the migration scheme to IDM Reborn."
---

import OnChainStat from '@site/src/components/OnChainStat';
import Receipt from '@site/src/components/Receipt';

# Track record & migration

## The first-generation token

First-generation IDM stopped trading by agreement between the team and holders,
as a transition into the "Reborn" phase. That was a deliberate decision, not an
abandoned project — and the difference is checkable: most of the old supply is
permanently locked at a burn address.

<Receipt
  claim="v1 tokens permanently locked at 0x…dEaD"
  evidence="Read directly from the v1 token contract on BNB Chain"
  url="https://bscscan.com/token/0x14B13E06f75E1F0Fd51ca2E699589Ef398E10F4C"
  date="see the date attached to the figure below" />

Locked balance: <OnChainStat metric="deadBalance" decimals={2} suffix=" v1 IDM" />

That figure is read from the chain every time this site is built. It is not
typed.

## Migration to IDM Reborn

Holders who chose to continue receive an IDM Reborn allocation. The list is
verified and committed to a *merkle tree* — a structure that lets each person
prove their own entitlement without trusting the list we keep.

The migration allocation is split into three standalone parts:

| Part | State |
|---|---|
| Verified obligation | Committed to the merkle root; every address can prove its claim |
| Set aside pending verification | Recipient address unknown — **neither removed nor folded in** |
| Late-claim pool | Distribution mechanism **not yet decided** |

The figures for all three appear in Token architecture, taken from the same
data file used to build the tree.

### Why the set-aside portion is not simply folded in

Folding an address-less allocation into the late-claim pool would erase the
trace that it belongs to someone. Once that trace is gone, nobody goes looking
for it again. It stands as its own line until the address is known.

The consequence, stated plainly: **while that allocation has no address, the
existing merkle root is valid for testnet only.** The root cannot be changed
after the contract is deployed, so deploying it on mainnet now would make the
omission permanent.

## Migration release schedule

Two tiers, separated by a balance threshold, and **the tier is computed by the
contract** from the allocation amount — not stored in the list:

- Below the threshold → fully unlocked at TGE
- At or above → part unlocks at TGE, the remainder vests linearly over six
  months

Maturity is measured from **TGE**, not from the date someone claims. Measured
from the claim date, whoever read the announcement late would finish vesting
last — lateness would become a penalty. With a shared start time, claiming
later never costs anything: what has matured stays matured and waits.
