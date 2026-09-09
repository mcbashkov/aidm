---
sidebar_position: 8
slug: /roadmap
id: roadmap
title: "Roadmap"
description: "Three layers: achieved, committed, and conditional."
---

import StatusBadge from '@site/src/components/StatusBadge';

# Roadmap

Split into three layers deliberately. A roadmap that mixes achievements with
hopes leaves the reader unable to tell them apart — and a reader who cannot tell
them apart will treat everything as hope.

## Layer 1 — Achieved

You can verify the following today.

- AIDM running in production with real users <StatusBadge pillar="aidm" locale="en" />
- SkemGuard running across six networks <StatusBadge pillar="skemguard" locale="en" />
- Two films released in national cinemas <StatusBadge pillar="film" locale="en" />
- Seven contracts deployed on testnet with verified source on the block
  explorer <StatusBadge pillar="contracts" locale="en" />
- The end-to-end flow proven: record → report → on-chain seal → reward paid to
  the user's wallet
- The migration allocation list compiled and committed to a merkle root

## Layer 2 — Committed

This is what will be done, in a fixed order.

1. **Complete the migration allocation list.** One allocation still has no
   recipient address; until that is resolved, the merkle root is testnet-only.
2. **Third-party audit.** An internal pre-audit is not a substitute, and this
   document will not present it as one.
3. **Resolve the role-concentration finding** before mainnet deployment.
4. **Mainnet deployment** — only after the three points above are complete.
5. **Publish whitepaper v1.0** together with its PDF fingerprint recorded
   on-chain.

## Layer 3 — Conditional

These happen **only** if their conditions are met. We do not promise them.

- **IDM Chain (L2).** Testnet first. Mainnet only if usage metrics are met — and
  the metrics are announced before they are pursued, not after. Until there is a
  convincing answer to "why a dedicated chain", our position is: not needed yet.
- **Token utility in SkemGuard.** Only in a form that does not compromise the
  neutrality of scan results. If no such form is worth having, then none.
- **Exchange listing.** Not promised, and not scheduled in this document.

## What is deliberately absent from this roadmap

There is no price target, no market-capitalisation target, and no listing date.
None of the three is within the issuer's control, and including them would
create an expectation that cannot be met.
