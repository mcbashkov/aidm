---
sidebar_position: 1
slug: /produk/aidm
id: aidm
title: "AIDM — bookkeeping for micro-businesses"
description: "AIDM in detail: the product, the on-chain components, and what is measurable today."
---

import StatusBadge from '@site/src/components/StatusBadge';
import OnChainStat from '@site/src/components/OnChainStat';

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
