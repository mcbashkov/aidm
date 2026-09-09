---
sidebar_position: 4
slug: /produk/idm-chain
id: idm-chain
title: "IDM Chain — the plan, and what does not exist yet"
description: "IDM Chain in detail: a plan without a specification, the question that must be answered first, and the commitments that bind it."
---

import StatusBadge from '@site/src/components/StatusBadge';

# IDM Chain <StatusBadge pillar="idmchain" />

A layer 2 on BNB Chain. This page is deliberately the shortest of the four,
because there is little to describe and we would rather say so than fill the
space.

## What exists

A plan, and a public commitment about how it will proceed.

## What does not exist

**No technical specification. No contract. No architecture research.**

We checked the repositories and documents before writing this sentence rather
than after.

## Why we do not name an architecture yet

*Optimistic rollup*, *zk*, and *sidechain* are not interchangeable labels. They
carry very different security assumptions, cost profiles, and withdrawal times.
Choosing one because it reads convincingly is the fastest way to lose a
technical reader, because that reader will ask a second question the document
cannot answer.

**"The architecture is undecided; the decision follows the technical
research"** is a weaker sentence to write and a stronger one to defend.

## The question that must be answered first

**Why a dedicated chain, when AIDM already runs well on opBNB?**

If a whitepaper cannot answer that convincingly, an L2 reads as an addition
made to sound ambitious — and a technical reader reaches that conclusion within
seconds. An L2 without a compelling reason is a well-known warning sign.

Three reasons that *could* compel it, if they hold:

- Gas costs at a certain transaction volume make opBNB uneconomic — which must
  be demonstrated with real per-transaction costs today and a projection, not
  asserted
- A need for control over transaction ordering, or over the privacy of
  micro-business data
- IDM as the gas token creating structural demand obtainable no other way

**If none of the three holds today, the strongest answer is: not needed yet, and
we will say so.** That is more convincing than an architecture invented to fill
a chapter.

## The commitments that bind this

- **Testnet first.**
- **Mainnet only if usage metrics are met** — and the metrics are announced
  before they are pursued, not after. A target published after the fact is not a
  target; it is a description.

## How to read this page

The absence of detail here is not an omission we intend to quietly repair. It is
the current state, stated at the same level of prominence as the pillars that
are further along. When the research exists, this page will change, and the
document version will change with it.
