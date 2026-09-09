---
sidebar_position: 9
slug: /kepatuhan
id: kepatuhan
title: "Compliance & risk"
description: "Personal data protection, security findings, and risk factors."
---

import StatusBadge from '@site/src/components/StatusBadge';

# Compliance & risk

## Personal data protection

AIDM stores users' financial data, which demands clear handling.

- **The right to erasure is fully implemented.** Deleting an account genuinely
  deletes transaction records, reports, the business profile, the wallet, and
  the login identity.
- **What cannot be deleted is disclosed to the user**, not hidden: the
  fingerprint of an already-sealed report remains on the blockchain, and payment
  records are retained in anonymised form for bookkeeping obligations. Both are
  stated in the app before deletion is confirmed.
- **Raw input is purged automatically** after a set retention period.
- Legal documents — terms, privacy policy, refund policy — are readable without
  an account.

## Security findings

An **internal** pre-audit produced eight findings. None came from automated
analysis; all came from mapping authority. The code is clean — the risk surface
is operational.

| Severity | Summary |
|---|---|
| Critical | The contract owner can move the entire swap pool |
| High | Signing-key exposure on two separate paths |
| High | The contract owner can withdraw the entire reward pool |
| High | **Most privileged roles are held by a single address** |
| Medium | Burns have no on-chain recovery path |

One medium finding concerning cap-period accounting has been fixed and
retested. The rest **remain open**, and resolving them is a precondition for
mainnet deployment.

**The migration vesting contract has not been analysed at all** — it was written
after the pre-audit concluded. The finding count will grow.

## Risk factors

Stated directly rather than softened.

1. **Every contract is still on testnet.** <StatusBadge pillar="contracts" locale="en" />
   Mainnet behaviour has never been exercised with real value.
2. **There is no third-party audit.**
3. **Authority is centralised.** A single address holds most privileged roles,
   and the treasury is a single wallet. Compromise of that key has broad impact.
4. **The token is not traded.** There is no price, no liquidity, and no
   guarantee either will materialise.
5. **Third-party dependencies** — wallet provider, network providers, language
   model provider, and payment gateway. Disruption to any of them affects the
   service.
6. **Crypto-asset regulation in Indonesia sits with the financial services
   authority** and may change. Regulatory change may affect the plans written
   here.
7. **One migration allocation has no recipient address**, so the allocation list
   is not final.
8. **This document is a draft.** All figures, addresses, and schedules may
   change before mainnet deployment.

## Disclaimer

This document is informational. It is not an offer, a solicitation to buy, or
financial, legal, or tax advice. Holding the token confers no right to revenue,
profit, or any distribution from the company. Readers considering involvement
should form their own assessment and seek professional advice appropriate to
their jurisdiction.
