---
title: Transfer native LEZ tokens between public and private states
doc_type: procedure
product: lez
topics: lez
steps_layout: sectioned
authors: moudyellaz, kashepavadan
owner: logos
doc_version: 1
slug: transfer-native-lez-tokens-between-public-private-states
---

# Transfer native LEZ tokens between public and private states

#### Get started with private transfers to accounts you don't control, using a recipient-published keypair.

This procedure covers how to credit a [private account](/get-started/glossary#private-account) — regular or a [Program Derived Address](/get-started/glossary#program-derived-address) ([PDA](/get-started/glossary#pda)) — that you do not control, using only the recipient's published keypair and the sender's chosen identifier. It is intended for wallet users on testnet v0.2 who need to make private payments without interactive setup or per-sender [account](/get-started/glossary#account) registration. For example, a recipient can publish one keypair and receive from many independent senders, each into a separate account.

Before you start, make sure you have the following:

- Linux or macOS — macOS requires full Xcode with the Metal toolchain for the Risc0 guest build, not just command-line tools
- Rust toolchain, `cargo`
- A local clone of the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone) and [wallet](../get-started/connect-wallet-cli-to-lez-testnet.md) set up and funded

## What to expect

- You can credit a recipient's private account using only their published [NPK](/get-started/glossary#npk) and [VPK](/get-started/glossary#vpk), with no interactive setup required.
- You can receive tokens into up to 2^128 distinct accounts from the same keypair by varying the identifier, so one published key serves many independent senders.
- You can discover and spend incoming funds with `wallet account sync-private` after the sender's transaction is confirmed.

## Step 1: Publish a reusable keypair as the recipient

The recipient generates a reusable keypair (NPK and VPK) and shares it with senders.

1. Generate and publish a reusable keypair:

   ```sh
   wallet account new private-accounts-key
   ```

   - This prints the `chain_index`, NPK, and VPK. No account is bound to the keypair yet.

1. Export the keys to share with senders:

   ```sh
   wallet account show-keys --account-id <recipient-account-or-label>
   ```

   - This prints NPK (hex) then VPK (hex). Save the output to a file to use with `--to-keys` later.

## Step 2: Send funds to the recipient's private account

The sender credits the recipient's account at a chosen identifier. The circuit initialises the account, emits its commitment and a deterministic nullifier, and encrypts the post-state to the recipient via ephemeral ECDH against the recipient VPK.

{% hint style="warning" %}
Two senders who independently pick the same identifier for the same NPK target the same account. The second transfer fails at the commitment/nullifier layer. Use high-entropy identifiers to avoid collisions.
{% endhint %}

1. Send funds to the recipient's private account using their published keys:

   ```sh
   wallet auth-transfer send \
     --from <sender-account-or-label> \
     --to-npk <recipient-npk-hex> \
     --to-vpk <recipient-vpk-hex> \
     --to-identifier <u128> \
     --amount 100
   ```

   - Pass `--to-keys <file>` instead of `--to-npk`/`--to-vpk` if you saved the keys to a file in Step 1.

## Step 3: Discover and spend the incoming funds as the recipient

The recipient scans for incoming transfers, decrypting the `PrivateAccountKind` header to reconstruct the account ID, then spends from the discovered account.

1. Scan and decrypt incoming funds:

   ```sh
   wallet account sync-private
   ```

   - The wallet decrypts the ciphertext header for each incoming transfer and reconstructs `AccountId = SHA256(prefix || npk || identifier)` for accounts where the VPK matches.
   - Each incoming transfer appears as a separate account (`PrivateOwned` or `PrivatePdaOwned`), distinguished by identifier.

1. Spend from the discovered account:

   ```sh
   wallet auth-transfer send \
     --from <recipient-account> \
     --to-npk <next-npk> \
     --to-vpk <next-vpk> \
     --to-identifier <u128> \
     --amount 50
   ```

   - The recipient account must have been discovered by `sync-private` in the previous step before it can be used as a `--from` source.

## Troubleshooting private foreign transfers

### Why does the recipient not see the funds after `sync-private`?

The wallet reconstructs the account ID from the decrypted `PrivateAccountKind` header using the exact NPK, VPK, and identifier the sender used. Confirm that the sender used the NPK and VPK published by the recipient in Step 1 and the agreed-upon identifier, then re-run `wallet account sync-private`.

### Why does the second transfer to the same (NPK, identifier) fail?

Two transfers to the same `(npk, identifier)` pair resolve to the same `AccountId` and collide at the commitment/nullifier layer (`check_commitments_are_new` / `check_nullifiers_are_valid` in `lee/state_machine/src/state.rs`). Each sender must use a unique identifier for a given recipient NPK.

### Why does spending multiple incoming transfers become expensive?

There is no automatic balance consolidation. N transfers to the same keypair produce N separate accounts, and spending all of them requires N inputs, so proof and transaction cost grows linearly with N. Plan identifier allocation to minimize the number of accounts that need to be spent together.
