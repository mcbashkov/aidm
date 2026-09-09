---
sidebar_position: 6
slug: /model-ekonomi
id: model-ekonomi
title: "Economic model"
description: "Subscriptions, activity rewards, treasury, and the separation of money rails from token rails."
---

# Economic model

## Two rails kept deliberately apart

| Rail | Payment | Purpose |
|---|---|---|
| Product | Ordinary money (QRIS / transfer) | AIDM Premium subscription |
| Token | IDMX → IDM Reborn | Activity rewards, swapped via contract |

The separation is deliberate for two equally binding reasons: app-store
compliance, and keeping product revenue independent of token price — and the
reverse. A product whose revenue depends on its own token price will start
making product decisions for the price, and users notice that before anyone
else does.

## Activity rewards

IDMX is granted for behaviour the product actually wants — recording both sides
of cash flow, recording by voice, reading reports, sealing the monthly report.
Not merely "opening the app".

Every reward is **derived from source data**, never from a flag that could be
set arbitrarily. Deleting a transaction lowers the progress again.

Reward claims run through signed vouchers redeemed at the contract, with daily
and monthly per-wallet caps. Details in Token architecture.

## Treasury

The treasury is divided into operations, partnerships and grants, an emergency
reserve, and buyback. The share of each is in the same data file as the
allocation.

**The treasury is a single company-controlled wallet**, not a multi-party
wallet. Its address is published in the Appendix.

We state the consequence plainly rather than softening it: one key controls the
entire treasury. That strengthens — rather than weakens — the rule applied
throughout this document, that **we claim neither decentralisation nor secure
governance**. Readers assessing risk should weigh this alongside the
role-concentration finding in Compliance & risk.

## Buyback

Part of the treasury is allocated to buyback. Its role in this document is
stated as **orderly distribution and market depth** — not as a mechanism for
managing price.

That distinction is not linguistic delicacy. An issuer that positions itself as
a price manager takes a position it cannot defend before any regulator, and
creates an expectation it cannot meet.

## What is not promised

- Holding the token confers no right to revenue, profit, or any distribution
  from the company
- No rupiah value is promised for activity rewards — the token is not traded,
  so no price exists
- No promise of listing on any exchange
