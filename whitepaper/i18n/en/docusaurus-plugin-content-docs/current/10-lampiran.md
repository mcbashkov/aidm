---
sidebar_position: 11
slug: /lampiran
id: lampiran
title: "Appendix"
description: "Contract addresses, data sources, and glossary."
---

import OnChainStat from '@site/src/components/OnChainStat';

# Appendix

## Contract addresses

> ⚠️ **Every contract below is on TESTNET.** Mainnet addresses will replace this
> section after deployment, and this document's version will be raised with
> them.

| Contract | Network | Role |
|---|---|---|
| `IDMX` | opBNB testnet | Activity reward token |
| `MissionRewards` | opBNB testnet | Pays rewards against signed vouchers |
| `ReportAttestation` | opBNB testnet | Seals report fingerprints |
| `SwapInitiator` | opBNB testnet | Burns IDMX, issues swap requests |
| `IDMReborn` | BNB Chain testnet | Ecosystem value token |
| `SwapClaim` | BNB Chain testnet | Redeems vouchers, releases IDM from the pool |
| `MigrationVesting` | BNB Chain testnet | Releases migration allocations on schedule |

Full addresses, constructor arguments, and compiler settings for each contract
are published in the project repository. The six core contracts and the
migration vesting contract have verified source on the block explorer.

## On-chain figures

All figures below are read directly from the chains when this site is built,
each carrying its read date.

| Metric | Value |
|---|---|
| IDM Reborn supply | <OnChainStat metric="idmRebornSupply" /> |
| IDMX supply | <OnChainStat metric="idmxSupply" /> |
| v1 tokens locked at the burn address | <OnChainStat metric="deadBalance" decimals={2} /> |
| Swap pool | <OnChainStat metric="swapClaimPool" /> |
| Activity reward pool | <OnChainStat metric="missionRewardsPool" /> |
| Reports sealed | <OnChainStat metric="sealedReports" /> |

If a figure carries a "needs refresh" marker, the last read failed and the value
shown comes from cache. We prefer showing an older figure that is honest about
its age over failing the page.

## Data sources

| File | Contents |
|---|---|
| `data/tokenomics.json` | Allocation, unlock schedule, treasury |
| `data/onchain.cache.json` | Last successful chain read |
| `data/status.json` | Status of each pillar |
| `data/migration-allocations.csv` | Verified migration allocation list |

## Glossary

| Term | Meaning |
|---|---|
| **TGE** | The moment tokens are first issued and can begin circulating |
| **Swap pool** | The IDM reserve locked in a contract for IDMX conversion |
| **Merkle tree** | A structure letting someone prove their entitlement without revealing the whole list |
| **Merkle root** | A single-value summary of the whole list; immutable once deployed |
| **Vesting** | Gradual release of tokens on a schedule |
| **Cliff** | The period before gradual release begins |
| **Report seal** | Writing a report's fingerprint on-chain; the contents stay private |
| **Embedded wallet** | A wallet created automatically by the app, with no recovery phrase |
| **Burn** | Destruction of tokens; supply falls and the change is visible on the explorer |
| **Testnet** | A test network. Tokens on it have no economic value |
