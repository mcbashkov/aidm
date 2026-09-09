---
sidebar_position: 7
slug: /teknologi
id: teknologi
title: "Technology"
description: "BSC and opBNB, embedded wallets, hash-only sealing, and security."
---

import OnChainStat from '@site/src/components/OnChainStat';

# Technology

## Wallets without an entry barrier

The principle: **having an account means having a wallet.** An embedded wallet
is created automatically at sign-up, with no recovery phrase for the user to
write down, and gas for opBNB activity is sponsored by the app.

Users can export their wallet key at any time. As long as they keep that key,
the wallet remains theirs even after the account is deleted from the app.

Wallet creation runs on the **server**, on a path every session must pass
through. That sounds like an implementation detail, but it is an architectural
decision paid for the hard way: a product invariant riding on a display
component collapses silently when that component is replaced by someone who did
not know an invariant lived there.

## Report sealing — fingerprint only

A report is reduced to a canonical form (sorted keys, integer amounts, a fixed
timezone) and hashed. **Only the hash is written on-chain.**

Financial data never touches the blockchain. What is public is only the
fingerprint — enough to prove the report existed and was unchanged on that date,
not enough to learn its contents.

The property that gives it meaning is permanence, and that cuts both ways: the
hash remains even after a user deletes their account. We tell users that inside
the app as a consequence rather than hiding it — something that can be deleted
later can never prove anything.

Reports sealed so far: <OnChainStat metric="sealedReports" />.

## Language processing

User sentences are turned into structured entries by a language model, with a
rule-based fallback parser if the model fails or is slow. A deterministic gate
runs before the model is called: a sentence with no trace of money in it never
reaches the model.

Monetary figures are never invented. A sentence describing a transaction with no
amount produces a pending entry, not a guessed number.

## Security enforced by contract

The following four guarantees live inside the contracts, not on a server:

1. **Double redemption is impossible** — a single-use nonce per voucher
2. **Caps are enforced on-chain** — a failing or compromised server cannot
   exceed them
3. **The rate can only move in the user's favour**
4. **Migration allocations cannot be reduced** — the merkle root is immutable
   after deployment, and there is no pause or withdrawal function that can
   touch unclaimed allocations

The fourth point has a consequence worth stating: because the merkle root is
immutable, the allocation list **must be final before the contract is deployed
to mainnet**. This contract cannot be "filled in later". That is not a
limitation but the intended property — an allocation the contract owner can
change is not an obligation, only a promise.
