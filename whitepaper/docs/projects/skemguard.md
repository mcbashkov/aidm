---
sidebar_position: 2
slug: /projects/skemguard
id: skemguard
title: "SkemGuard — token security scanner"
description: "SkemGuard in detail: the product, real measurements, the deployer reputation layer, and the honest token-utility tension."
---

import StatusBadge from '@site/src/components/StatusBadge';

# SkemGuard <StatusBadge pillar="skemguard" />

## The product in one sentence

SkemGuard scans crypto token safety in real time: the user pastes a contract
address and, within seconds, receives a 0–100 score, a risk category, and a
plain-language explanation.

The problem is concrete. A retail buyer has no practical way to check whether a
token can be sold again, whether its creator can still mint new supply or freeze
wallets, and whether liquidity is locked — *before* their money goes in. That
information exists on-chain, but it is scattered and technical.

## Positioning

The simplicity of the lightest scanners, with the detection depth and
sell-simulation of the heavier ones — plus one differentiator neither has:
**neutrality that is stated and checkable.**

## Measured, not asserted

This is not a prototype. It is live, calls real data providers, and returns real
results.

| | |
|---|---|
| Networks supported | **6** — Solana, Ethereum, BSC, Polygon, Base, Robinhood |
| Median latency | **495 ms** |
| 95th-percentile latency | **825 ms** (internal target: under 5 s) |
| Rate limit | 15 requests per minute per IP |
| Production dependencies | **3** |

Results anyone can reproduce by pasting the same addresses: BONK on Solana
scores safe with high confidence; SHIB on Ethereum scores safe but flags
unlocked LP; USDC on Base is detected automatically.

**Not yet done, and stated openly in the repository:** score-weight calibration,
AI summaries, and the installable app packaging.

## What the scanner actually checks

The engine draws on three independent sources — a security data provider, direct
RPC reads, and a sell simulation — and records the status of each
(`ok`, `timeout`, `error`, `skipped`). That status is published with the result,
because a check that silently did not run is worse than a check that failed
loudly.

Findings are emitted as typed flags at four severities. On EVM chains these
include sell and buy tax bands, mint still enabled, active owner privileges,
ownership not renounced, liquidity unlocked or only partially locked,
unverified contract source, and upgradeable contracts. On Solana they include
active mint authority, active freeze authority, transfer hooks or pausability,
mutable metadata, and thin or unlocked liquidity. Shared across both: suspected
honeypot, low liquidity, and extreme concentration among top holders.

## Two rules that shape every verdict

**Critical override.** Three findings force the worst verdict and cap the score
outright: a confirmed honeypot, an extreme sell tax, and an active unlimited
mint. No combination of good signals can outweigh them, because each of the
three means the buyer may be unable to get their money back out.

**A confirmed honeypot is distinguished from a suspected one.** A static flag
from a data provider is *suspected*; only a sell simulation that actually ran
produces *confirmed*, and only *confirmed* triggers the override. The
distinction matters because a static flag can be wrong, and wrongly branding a
legitimate token is a harm in the other direction.

**Unverified sellability caps the verdict.** If the sell simulation fails or
times out, the result can never rise above a warning — regardless of how clean
everything else looks. The system refuses to say "safe" about something it could
not test.

## Confidence is reported, not hidden

Every result carries a confidence level alongside the score. A scanner that
reports a number without saying how sure it is invites the reader to treat a
guess as a measurement.

## No smart contracts — by design

SkemGuard has **no smart contract of its own**, and that is not a gap to be
covered up.

SkemGuard reads chains; it does not write to them. It calls RPC endpoints and
security APIs, then judges. Adding a contract merely to sound "on-chain" would
enlarge the attack surface without adding usefulness.

The general principle is worth stating: **not every part of an ecosystem needs a
contract. What needs a contract is whatever moves value.**

## The deployer reputation layer

A token score answers *"is this token safe?"*. The reputation layer answers the
more decisive question: **"who made it, and what is their track record?"**

Its strategic value is simple to state — this is the one part of SkemGuard that
cannot be replicated by subscribing to an API. The data only grows from
accumulated scans of its own. The longer it runs, the harder it is to match.

Three constraints bind its design:

- **State facts, do not pass verdicts on people.** *"This wallet has deployed
  four tokens; on three of them liquidity was withdrawn within 30 days"* — not
  *"this deployer is a scammer"*. The user draws the conclusion.
- **Reputation never decides a verdict**, at most it is a bounded modifier. A new
  developer deserves a fair start.
- **Addresses are never linked to real-world identity.** It assesses the
  behaviour of an address, not of a person — which also keeps the system away
  from personal-data regulation.

Its position is **an intelligence source, not an enforcement tool.**

**Status:** the recording mechanism is built and verified end to end, including
a field noting *where* the deployer address was obtained — on some chains the
address available is often not the original creator. It is **not yet switched on
in production** because a credential remains unset. That is urgent and stated
plainly: this data only grows through accumulation, and every day without
recording is permanently lost.

## Token utility: currently zero — a design tension, not an oversight

This is the most consequential thing to understand about SkemGuard.

Its published methodology states there are no exceptions for any token —
including our own ecosystem token — no allowlist, and no paid slot to improve a
result.

That makes the most common token utilities for a product like this — pay to
scan, stake for better results, allowlisting — **collide directly with the
product's own differentiator.** A security scanner whose results money can
influence has no reason to be trusted, and trust is the only thing it sells.

Three routes that do not damage neutrality:

1. **Token for derived data, not for verdicts.** Scan results stay free and
   identical for everyone; what is paid for is access to the reputation layer —
   API, exports, history. This sells accumulated work, not influence over
   outcomes.
2. **Token for quota, not for quality.** Higher rate limits for holders. Changes
   no figure a user sees. Safe in principle, small in value.
3. **No token at all.** SkemGuard positioned as a trust asset and an entry point
   into the ecosystem rather than a demand engine.

Route 1 is the direction under consideration, with route 3 as the starting
position until the reputation layer matures. **Until that decision is made, this
document claims no IDM utility in SkemGuard** — writing *"IDM is used in
SkemGuard"* without naming the form would be a claim that collapses on first
inspection.
