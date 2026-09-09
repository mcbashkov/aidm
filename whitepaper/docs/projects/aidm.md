---
sidebar_position: 1
slug: /projects/aidm
id: aidm
title: "AIDM — bookkeeping for micro-businesses"
description: "AIDM in detail: the product, the on-chain components, and what is measurable today."
---

import StatusBadge from '@site/src/components/StatusBadge';
import OnChainStat from '@site/src/components/OnChainStat';
import MissionTable from '@site/src/components/MissionTable';

# AIDM <StatusBadge pillar="aidm" />

**The pillar carrying the largest share of the ecosystem's blockchain work.**
Every smart contract that moves value sits behind this product.

## The product in one paragraph

AIDM is a conversational bookkeeping application for Indonesian micro-business
owners. The user records income and spending in ordinary sentences or by voice
— *"sold three plates of fried rice, forty-five thousand, paid by QR"* — and an
AI agent turns that into structured entries. From those entries the app builds
financial reports that can be printed, exported, and sealed on-chain.

The design principle behind it: the user should feel they are simply keeping
notes, while the system quietly builds a business record that another party
could read.

## Why the conversational form matters

Bookkeeping apps are plentiful, and mostly unused. What keeps them unused is
their shape: forms with columns, categories, and accounting terms that demand
study before the first sale can be recorded.

Removing that barrier is not a cosmetic choice — it is the entire product
thesis. A record that is never made proves nothing.

## The four Web3 pillars inside AIDM

**1. Having an account means having a wallet.** An embedded wallet is created
automatically at sign-up, without a recovery phrase, and gas on opBNB is
sponsored by the app. A micro-business owner is never asked to buy crypto in
order to record a sale.

**2. Real activity earns IDMX.** Rewards are granted for behaviour the product
actually wants — recording both sides of cash flow, using voice, reading
reports, sealing the monthly report. Every reward is derived from source data,
never from a flag that could be set arbitrarily: deleting a transaction lowers
the progress again.

**3. Premium is paid in money, never in tokens.** This keeps app-store
compliance intact and stops product revenue from depending on token price.

**4. Reports are sealed on-chain — fingerprint only.** The report is reduced to
a canonical form and hashed; only the hash is written to opBNB. Financial data
never touches the chain.

## How rewards actually work

<MissionTable />

Three properties matter more than the amounts:

- **Every mission is derived from source data.** There is no flag a server can
  set. Deleting a transaction lowers the progress again.
- **One mission cannot be derived, and is handled honestly.** Reading a report
  leaves no trace in any table — it is an event, and an event must be recorded
  when it happens or it is lost. It is recorded as a single bit per week:
  *this user opened Reports*. No period viewed, no duration.
- **Caps are enforced on-chain**, in three layers: per wallet per day, per
  wallet per calendar month for higher-value rewards, and a global daily
  ceiling across all users.

## Subscription, and what it does not touch

Premium is a monthly subscription paid in ordinary money through a local
payment gateway, with a one-time trial per account. It unlocks research and
content-generation features with fair-use monthly quotas.

**Recording, reports, missions, and sealing stay free and outside the
subscription.** The paid tier must never sit between a user and their own
bookkeeping.

Payment is a single 30-day purchase rather than a recurring charge — the local
instruments most micro-businesses use cannot be billed automatically, and
forcing recurring payment would mean forcing a credit card on users who do not
have one.

## Engineering decisions that shaped the product

**Numbers are never displayed before they are known.** A screen that draws a
loading state as though it were a fact is not a cosmetic flaw in a bookkeeping
app; a wrong money figure shown for one second is still a wrong money figure.
Every data screen distinguishes *loading*, *failed*, and *empty* — and never
renders one as another.

**Transaction times are not shown at all.** AIDM never knows the hour something
happened, so it does not pretend to. Micro-business owners commonly record a
whole day in the evening; showing that timestamp would be as misleading as
inventing one. Dates only.

**Offline recording keeps working.** Entries are queued locally and synced
later. Reading money figures offline, however, fails visibly rather than
showing a stale zero.

## What is measurable today

| Metric | Value |
|---|---|
| Reward pool held by the contract | <OnChainStat metric="missionRewardsPool" suffix=" IDMX" /> |
| Reports sealed on-chain | <OnChainStat metric="sealedReports" /> |

The application has been live in production since August 2026 with real users
and real records. The user count is deliberately not published while the
product is in closed beta — a number that small is easier to misread than to
explain.

## Contracts behind this product

| Contract | Network | Role |
|---|---|---|
| `IDMX` | opBNB testnet | Activity reward token |
| `MissionRewards` | opBNB testnet | Pays rewards against signed vouchers |
| `ReportAttestation` | opBNB testnet | Seals report fingerprints |
| `SwapInitiator` | opBNB testnet | Burns IDMX, issues swap requests |

All four are on testnet. Their behaviour, caps, and guarantees are described in
[Token architecture](/arsitektur-token) and [Technology](/teknologi).

## What AIDM does not promise

AIDM helps until the report becomes a tidy, sealed file. Where that file goes is
its owner's business, and whether any institution accepts it is that
institution's authority. We promise no outcome beyond the tool itself.
