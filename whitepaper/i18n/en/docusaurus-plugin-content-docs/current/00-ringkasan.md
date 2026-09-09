---
sidebar_position: 1
slug: /
id: ringkasan
title: "Executive summary"
description: "Standalone summary of IDM Reborn — the token, the four pillars, and an honest status for each."
---

import AllocationTable from '@site/src/components/AllocationTable';
import OnChainStat from '@site/src/components/OnChainStat';
import StatusBadge from '@site/src/components/StatusBadge';

# Executive summary

**IDM Reborn** is an ecosystem token on BNB Chain backing four products, one of
which is already running with real users.

This document is written to be read sceptically. Every figure in it has a source
you can check yourself — on-chain, in a contract, or in the published data
files. Whatever does not exist yet is stated as not existing.

## What is already running

| Pillar | Status | Summary |
|---|---|---|
| **AIDM** — bookkeeping for micro-businesses | <StatusBadge pillar="aidm" locale="en" /> | Production app at `ai.idmtoken.com` |
| **SkemGuard** — token security scanner | <StatusBadge pillar="skemguard" locale="en" /> | Six networks |
| **IDM Film** — film production | <StatusBadge pillar="film" locale="en" /> | Two titles released in national cinemas |
| **IDM Chain** — layer 2 on BNB Chain | <StatusBadge pillar="idmchain" locale="en" /> | No technical specification yet |
| Smart contracts | <StatusBadge pillar="contracts" locale="en" /> | Seven contracts, all on **testnet** |

## The token

Two tokens, two networks, two deliberately separated roles:

- **IDM Reborn** (BNB Chain) — the ecosystem's value token. Supply
  <OnChainStat metric="idmRebornSupply" /> fixed, with no mint function.
- **IDMX** (opBNB) — in-app activity reward points. Supply
  <OnChainStat metric="idmxSupply" />.

IDMX converts to IDM Reborn through a gate that burns the IDMX. The swap pool
holds <OnChainStat metric="swapClaimPool" suffix=" IDM" />, locked inside the
contract.

<AllocationTable locale="en" />

## What you should know before reading further

- **Every contract is still on testnet.** None is on mainnet as of publication.
- **No third-party audit yet.** What exists is an internal pre-audit with eight
  findings, most still open. Details in Compliance & risk.
- **Privileged roles remain centralised.** A single address holds most contract
  authority, and the treasury is a single wallet. We make no decentralisation
  claim.
- **The token is not traded**, so no price exists. No rupiah value can be
  promised for any reward.

Those four sentences are not a disclaimer buried at the end. They are here
because a reader who knows them first can judge the rest accurately.
