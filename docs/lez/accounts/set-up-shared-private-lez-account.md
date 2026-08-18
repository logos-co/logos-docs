---
title: Set up a shared private account
doc_type: procedure
product: lez
topics: lez
steps_layout: sectioned
authors: moudyellaz, kashepavadan
owner: logos
doc_version: 1
slug: set-up-shared-private-lez-account
sidebar_position: 1
---

# Set up a shared private LEZ account

#### Get started with group-owned private accounts where every member independently derives the same keys.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

This procedure covers how to create a shared [private account](../../get-started/glossary.md#private-account) (regular or [PDA](../../get-started/glossary.md#pda)) on the [LEZ](../../get-started/glossary.md#lez) that is jointly controlled by multiple members. From one 32-byte [Group Master Secret](../../get-started/glossary.md#group-master-secret) ([GMS](../../get-started/glossary.md#gms)), every member independently derives the same [account](../../get-started/glossary.md#account) keys ([NSK](../../get-started/glossary.md#nsk), [VSK](../../get-started/glossary.md#vsk), [NPK](../../get-started/glossary.md#npk), [VPK](../../get-started/glossary.md#vpk)), so any member can view and spend the shared balance without an interactive key exchange at spend time. It is intended for developers on testnet v0.2 who need multi-party custody of a private balance or a private PDA.

This feature is 1-of-n at the key layer: any GMS holder can derive every key and spend the account. Threshold gating must be implemented at the [program](../../get-started/glossary.md#program) layer. View-only membership is not supported — any GMS holder gets both viewing and spending capability.

:::info[Prerequisites]

- A supported OS:
   - Linux x86_64 or aarch64
   - macOS arm64 or x86_64 (requires full Xcode with the Metal toolchain for the Risc0 guest build)
- A local clone of the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone).
- An [LEZ CLI wallet](../get-started/run-lez-wallet-via-cli.md) set up and funded.
:::

## What to expect

- You can create a shared private account from a single GMS so that every invited member independently derives the same NPK, VPK, NSK, and VSK without an interactive key exchange at spend time. (Members must agree on the same PDA `--seed`, `--program-id`, and `--identifier` values; see Step 4.)
- You can admit new members by sealing the GMS to their sealing public key and having them unseal it locally, with no shared secrets transmitted in the clear.
- You can create a group-owned PDA family where each PDA is distinguished by an identifier derived from the same group keys.

## Step 1: Generate a sealing key pair for each member

Each member who will join a group needs a one-time [sealing key](../../get-started/glossary.md#sealing-keys) pair before the owner can invite them. The sealing key uses ML-KEM-768 and is kept separate from account [viewing keys](../../get-started/glossary.md#viewing-keys).

1. Each joining member generates their sealing key pair:

   ```sh
   wallet group new-sealing-key
   ```

   - This prints the sealing public key. Each member shares the public key with the group owner.
   - Run this once per wallet. The secret key is stored locally and never shared.

## Step 2: Create the group and the shared account

The group owner creates a local group with a fresh random GMS, then derives a shared account from it. Accounts derived from the same group with the same PDA parameters (`--seed`, `--program-id`, `--identifier`) have identical keys for every member who holds the GMS.

1. Create the group with a fresh random GMS:

   ```sh
   wallet group new test-group
   ```

   - The group is registered locally and visible in `wallet group list` (alias `ls`).

1. Create the shared account derived from the group. Use the PDA form and record the `--seed`, `--program-id`, and `--identifier` values — the other members need exactly these values in Step 4 to derive the same account:

   ```sh
   wallet account new private-gms test-group --pda \
     --seed <32-byte-hex> --program-id <program-id-hex> --identifier 0 --label shared-acc
   ```

   `--identifier` diversifies one PDA from another within the same `(program_id, seed)` family; it defaults to a random value if omitted, so set it explicitly for a shared account.

   - The plain form creates a regular private account owned by this wallet alone:

     ```sh
     wallet account new private-gms test-group --label shared-acc
     ```

     It derives with a fresh random identifier on every invocation, so other members running the same command land on different accounts. Use it only when you do not need the account to be reproducible by other GMS holders.

## Step 3: Invite a new member by sealing the GMS

The owner seals the GMS to each new member's sealing public key using ML-KEM-768. The sealed GMS is safe to transmit over any channel.

1. Seal the group's GMS for the new member using their sealing public key:

   ```sh
   wallet group invite test-group --key <joining-member-sealing-pubkey-hex>
   ```

   - Share this hex string with the new member over any channel. Repeat this step for each additional member.

## Step 4: Join the group and derive the shared account

The new member unseals the GMS using their local sealing secret key and derives their instance of the shared account. With the same PDA parameters the owner used, the derived keys are identical to those held by every other member.

1. Unseal the GMS and store it under a local group name:

   ```sh
   wallet group join my-copy --sealed <sealed-gms-hex-from-owner>
   ```

   - The GMS is now stored locally under `my-copy`. Both the owner and this member now hold the same GMS.

1. Derive the shared account from the joined group.

   :::warning
   For regular (non-PDA) shared accounts, each `wallet account new private-gms` invocation diversifies the derived keys with a random identifier, so running the plain command in two wallets produces two different accounts even from the same GMS. To land on the same account as the other members, use the PDA form with an agreed `--seed`, `--program-id`, and `--identifier` — with identical values, every GMS holder derives identical keys.
   :::

   ```sh
   wallet account new private-gms my-copy --pda \
     --seed <32-byte-hex> --program-id <program-id-hex> --identifier 0
   ```

   - With the same `--seed`, `--program-id`, and `--identifier` values as the owner used, this produces the same account ID, NPK, VPK, NSK, and VSK as the owner's account derived in Step 2.
