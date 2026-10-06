---
title: Run an LEZ wallet via the CLI
doc_type: procedure
product: lez
topics: lez
steps_layout: flat
authors: moudyellaz, kashepavadan
owner: logos
doc_version: 1
slug: run-lez-wallet-via-cli
sidebar_position: 2
---

# Run an LEZ wallet via the CLI

#### Try the wallet CLI against the live LEZ testnet.

:::tip[Version]
This document is accurate for **Testnet v0.3.0**.
:::

This procedure explains how to install the wallet CLI from the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone/) and point it at the public [LEZ](../../get-started/glossary.md#lez) testnet sequencer.

:::info[Prerequisites]

- **Rust and `cargo`**—install with [`rustup`](https://rustup.rs).
   - The wallet pins its toolchain via `rust-toolchain.toml`, so the correct version is selected automatically.
- **System build dependencies** for compiling the wallet from source:

   ```bash
  # Ubuntu / Debian
  sudo apt update
  sudo apt install git curl build-essential clang libclang-dev pkg-config libssl-dev libpcsclite-dev

  # Fedora
  sudo dnf install git curl gcc glibc-devel clang clang-devel pkgconf-pkg-config openssl-devel llvm-libs pcsc-lite-devel
  
  # macOS
  xcode-select --install
  brew install pkg-config openssl
  ```
:::

## What to expect

- You can run wallet commands against the live LEZ testnet sequencer.
- Your wallet is configured to target `https://testnet.lez.logos.co` as the sequencer address.

## Install the wallet and connect it to the testnet

1. In the LEZ repository, check out the correct release tag:

   ```sh
   git clone https://github.com/logos-blockchain/logos-execution-zone.git
   cd logos-execution-zone
   git checkout v0.3.0
   ```

   - The tag must match the programs the testnet runs.

1. Rename the existing wallet directory (if you have one) to avoid conflicts:

   ```sh
   mv ~/.lee/wallet ~/.lee/wallet.old 2>/dev/null || true
   ```

1. Install the wallet CLI:

   ```sh
   cargo install --path lez/wallet --force
   ```

1. Point the wallet at the testnet:

   ```sh
   wallet change-network testnet
   ```

## Verify the connection

1. Run the health check command:

   ```sh
   wallet check-health
   ```

   A successful connection returns:

   ```sh
   ✅All looks good!
   ```

## Complete a minimal wallet flow

In this flow, you create and initialise an [account](../../get-started/glossary.md#account), claim testnet funds, send a transfer, and confirm resulting balances.

In this task, wallet account and transfer commands interact with the `authenticated-transfer` [program](../../get-started/glossary.md#program), and sequencer processing determines the resulting account state. Public and [private account](../../get-started/glossary.md#private-account) paths share command patterns, while private paths can include local proof generation.

### Create and initialise the sender public account

1. Create a sender [public account](../../get-started/glossary.md#public-account) and record the `account_id` value:

   ```bash
   wallet account new public
   ```

1. Using the sender public `account_id` from the previous step, check the sender status:

   ```bash
   wallet account get --account-id <sender_public_account_id>
   ```

   Example:

   ```bash
   wallet account get --account-id Public/14TYHiuzKiNR1ydETpr9mJMkjY6jf1hQFZ11d3X8Tc7N
   ```

   You should see `Balance 0, nonce 0` in the output. New accounts start empty and unowned, and you don't need to initialise them: the `authenticated-transfer` program can credit native tokens to any account.

### Fund the sender account

1. Send native tokens to the sender account in one of these ways:

   - Bridge tokens from the Logos Blockchain with a [channel deposit](../../blockchain/node-app/bridge-assets-from-logos-blockchain-to-zone-using-app.md). In **Metadata**, paste the sender account ID without its `Public/` prefix.
   - Have another testnet user transfer native tokens to the sender account ID.

1. Check the sender account balance:

   ```bash
   wallet account get --account-id <sender_public_account_id>
   ```

   In the output, the number after `Balance` should be greater than `0`.

### Create and fund the recipient public account

1. Create a recipient public account and record the `account_id` value:

   ```bash
   wallet account new public
   ```

1. Send 37 tokens from sender to recipient:

   ```bash
   wallet auth-transfer send \
       --from <sender_public_account_id> \
       --to <recipient_public_account_id> \
       --amount 37
   ```

   Example:

   ```bash
   wallet auth-transfer send \
       --from Public/14TYHiuzKiNR1ydETpr9mJMkjY6jf1hQFZ11d3X8Tc7N \
       --to Public/74zHyMW81mtfcd6VMaLnpnAna8k2V4AN2Ygyy9LcEAQQ \
       --amount 37
   ```

1. Check sender and recipient balances:

   ```bash
   # Sender account
   wallet account get --account-id <sender_public_account_id>
   ```

The sender's `Balance` should be `37` lower than before the transfer.

   ```bash
   # Recipient account
   wallet account get --account-id <recipient_public_account_id>
   ```

This should show `Balance 37`.

## Next steps

- [Transfer native tokens on the Logos Execution Zone](../transfer-tokens/transfer-native-tokens-on-the-logos-execution-zone.md)
- [Create and transfer custom tokens on the Logos Execution Zone](../transfer-tokens/create-and-transfer-custom-tokens-on-the-logos-execution-zone.md)
