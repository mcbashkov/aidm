---
sidebar_position: 4
slug: /ekosistem
id: ekosistem
title: "The four pillars"
description: "AIDM, SkemGuard, IDM Film, and IDM Chain — with an honest status for each."
---

import StatusBadge from '@site/src/components/StatusBadge';
import OnChainStat from '@site/src/components/OnChainStat';

# The four pillars

Four pillars at very different stages of maturity. Presenting them as equals
would mislead, so each carries its own status.

## AIDM <StatusBadge pillar="aidm" locale="en" />

A conversational bookkeeping app for micro-businesses. Users record in ordinary
sentences or by voice; the system turns that into structured entries and builds
reports that can be printed and sealed.

This is the pillar with the largest blockchain component — automatic wallets,
on-chain activity rewards, and report seals all live here. Reports sealed so
far: <OnChainStat metric="sealedReports" />.

## SkemGuard <StatusBadge pillar="skemguard" locale="en" />

A token security scanner covering six networks. Users paste a contract address
and get a risk assessment before buying.

**IDM token utility in SkemGuard is currently zero, and that is a design
decision rather than an oversight.** Its methodology page states there are no
exceptions for any token — including our own ecosystem token — no allowlist,
and no paid slot to improve a result.

The consequence deserves to be said plainly: the most common token utilities
for a product like this — pay to scan, stake for better results, allowlisting —
**collide directly with the product's own differentiator.** A security scanner
whose results money can influence has no reason to be trusted, and trust is the
only thing it sells.

The direction under consideration, and not yet decided: token utility for
**derived data** rather than for verdicts — scan results stay free and
identical for everyone, while what is paid for is access to the deployer
reputation layer (API, exports, history). That sells accumulated work, not
influence over outcomes.

Until that decision is made, this document claims no IDM utility in SkemGuard.

## IDM Film <StatusBadge pillar="film" locale="en" />

Film production, with two titles released in national cinemas. The token
issuer, PT IDM Film Sejahtera, is the same legal entity.

**There is no scheme funding films through the token**, and for now that is
deliberate. The safe and still meaningful utility is the token as **access** —
tickets, premieres, behind-the-scenes material. Any scheme linking token
ownership to film revenue is territory that requires legal advice first, and it
will not be sketched casually in this document.

## IDM Chain <StatusBadge pillar="idmchain" locale="en" />

A layer 2 on BNB Chain. **There is no technical specification, no contract, and
no architecture research** — only a plan.

We decline to name an architecture before the research exists. Terms such as
*optimistic rollup*, *zk*, and *sidechain* carry very different security, cost,
and withdrawal-time consequences; picking one because it sounds convincing is a
fast way to lose a technical reader.

The question that must be answered first, and is not yet answered: **why a
dedicated chain, when AIDM already runs well on opBNB?** Until there is an
answer backed by real cost figures, our position is *not needed yet*.

The commitment: testnet first; mainnet only if usage metrics are met, with the
metrics announced before they are pursued — not after.
