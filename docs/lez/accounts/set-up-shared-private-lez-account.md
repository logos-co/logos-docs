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
---

# Set up a shared private LEZ account

#### Get started with group-owned private accounts where every member independently derives the same keys.

This procedure covers how to create a shared [private account](https://docs.logos.co/get-started/glossary#private-account) (regular or [PDA](https://docs.logos.co/get-started/glossary#pda)) on the [LEZ](https://docs.logos.co/get-started/glossary#lez) that is jointly controlled by multiple members. From one 32-byte [Group Master Secret](https://docs.logos.co/get-started/glossary#group-master-secret) ([GMS](https://docs.logos.co/get-started/glossary#gms)), every member independently derives the same [account](https://docs.logos.co/get-started/glossary#account) keys ([NSK](https://docs.logos.co/get-started/glossary#nsk), [VSK](https://docs.logos.co/get-started/glossary#vsk), [NPK](https://docs.logos.co/get-started/glossary#npk), [VPK](https://docs.logos.co/get-started/glossary#vpk)), so any member can view and spend the shared balance without an interactive key exchange at spend time. It is intended for developers on testnet v0.2 who need multi-party custody of a private balance or a private PDA.

This feature is 1-of-n at the key layer: any GMS holder can derive every key and spend the account. Threshold gating must be implemented at the [program](https://docs.logos.co/get-started/glossary#program) layer. View-only membership is not supported — any GMS holder gets both viewing and spending capability.

Before you start, make sure you have the following:

- Linux or macOS — macOS requires full Xcode with the Metal toolchain for the Risc0 guest build, not just command-line tools
- Rust toolchain and `cargo`
- `justfile` recipes from the [logos-execution-zone](https://github.com/logos-blockchain/logos-execution-zone) repository
- A local clone of the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone) and [wallet](../get-started/connect-wallet-cli-to-lez-testnet.md) set up and funded

## What to expect

- You can create a shared private account from a single GMS so that every invited member independently derives the same NPK, VPK, NSK, and VSK without an interactive key exchange at spend time.
- You can admit new members by sealing the GMS to their sealing public key and having them unseal it locally, with no shared secrets transmitted in the clear.
- You can create a group-owned PDA family where each PDA is distinguished by an identifier derived from the same group keys.

## Step 1: Generate a sealing key pair for each member

Each member who will join a group needs a one-time sealing key pair before the owner can invite them. The sealing key uses ML-KEM-768 and is kept separate from account [viewing keys](https://docs.logos.co/get-started/glossary#viewing-keys).

1. Each joining member generates their sealing key pair:

   ```sh
   wallet group new-sealing-key
   ```

   - This prints the sealing public key. Each member shares the public key with the group owner.
   - Run this once per wallet. The secret key is stored locally and never shared.

## Step 2: Create the group and the shared account

The group owner creates a local group with a fresh random GMS, then derives a shared account from it. Any account derived from the same group will have identical keys for every member who holds the GMS.

1. Create the group with a fresh random GMS:

   ```sh
   wallet group new test-group
   ```

   - The group is registered locally and visible in `wallet group list` (alias `ls`).

1. Create a shared regular private account derived from the group:

   ```sh
   wallet account new private-gms test-group --label shared-acc
   ```

   - For a group-owned PDA instead of a regular private account, pass the PDA flags:

     ```sh
     wallet account new private-gms test-group --pda \
       --seed <32-byte-hex> --program-id <program-id-hex> --identifier 0
     ```

     `--identifier` diversifies one PDA from another within the same `(program_id, seed)` family; it defaults to a random value if omitted.

## Step 3: Invite a new member by sealing the GMS

The owner seals the GMS to each new member's sealing public key using ML-KEM-768. The sealed GMS is safe to transmit over any channel.

1. Seal the group's GMS for the new member using their sealing public key:

   ```sh
   wallet group invite test-group --key <joining-member-sealing-pubkey-hex>
   ```

   - Share this hex string with the new member over any channel. Repeat this step for each additional member.

## Step 4: Join the group and derive the shared account

The new member unseals the GMS using their local sealing secret key and derives their instance of the shared account. The derived keys are identical to those held by every other member.

1. Unseal the GMS and store it under a local group name:

   ```sh
   wallet group join my-copy --sealed <sealed-gms-hex-from-owner>
   ```

   - The GMS is now stored locally under `my-copy`. Both the owner and this member now hold the same GMS.

1. Derive the shared account from the joined group:

   ```sh
   wallet account new private-gms my-copy
   ```

   - This produces the same NPK, VPK, NSK, and VSK as the owner's account derived in Step 2.
