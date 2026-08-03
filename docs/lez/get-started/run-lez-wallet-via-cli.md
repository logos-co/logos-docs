---
title: Connect the wallet CLI to the LEZ testnet
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

This procedure explains how to install the wallet CLI from the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone/) and point it at the [LEZ](../../get-started/glossary.md#lez) testnet sequencer. It is intended for developers who have previously run the wallet against a local sequencer and want to test against testnet v0.2 instead.

## What to expect

- You can run wallet commands against the live LEZ testnet sequencer.
- Your wallet is configured to target `https://testnet.lez.logos.co` as the sequencer address.

## Install the wallet and connect it to the testnet

1. In the LEZ repository, check out the correct release tag:

   ```sh
   git clone https://github.com/logos-blockchain/logos-execution-zone.git
   cd logos-execution-zone
   git checkout v0.2.0
   ```

1. Rename the existing wallet directory (if you have one) to avoid conflicts:

   ```sh
   mv ~/.nssa/wallet ~/.nssa/wallet.old 2>/dev/null || true
   ```

1. Install the wallet CLI:

   ```sh
   cargo install --path lez/wallet --force
   ```

1. Set the testnet sequencer address:

   ```sh
   wallet config set sequencer_addr https://testnet.lez.logos.co
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

In this flow, you create and initialise an account, claim testnet funds, send a transfer, and confirm resulting balances.

In this task, wallet account and transfer commands interact with the authenticated-transfer [program](../../get-started/glossary.md#program), and sequencer processing determines the resulting account state. Public and private account paths share command patterns, while private paths can include local proof generation.

### Create and initialise the sender public account

1. Create a sender [public account](../../get-started/glossary.md#public-account) and record the `account_id` value:

   ```bash
   cd ~/logos/src/logos-execution-zone
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

   You should see `Account is Uninitialized` in the output. New accounts start uninitialised, so no program owns them yet. A program can claim an uninitialised account (for example, the authenticated-transfer program or the [token program](../../get-started/glossary.md#token-program)). After a program claims an account, only that program can modify the account state. LEZ makes one exception for account credits, where any program can credit native tokens to any account. For account debits, LEZ requires the owning program.

1. Initialise the sender account, then check the updated state:

   :::info
Running `wallet auth-transfer init` initialises the sender account under the authenticated-transfer program, so the account can debit native tokens when you send transfers.
:::

   ```bash
   wallet auth-transfer init --account-id <sender_public_account_id>
   ```

   In the output, you should see `status: "Transaction submitted"`, and the transaction hash. If you change to the terminal session where the sequencer is running, you can see a message similar to this: `Validated transaction with hash <hash_id>, including it in block`.

1. Check the account updated state:

   ```bash
   wallet account get --account-id <sender_public_account_id>
   ```

   In the output you should see `Account owned by authenticated transfer program`, with `"balance":0`.

### Claim funds using the Piñata faucet

"[Piñata](../../get-started/glossary.md#piñata)" is the name of the LEZ-specific testnet faucet program that funds accounts with native tokens.

1. Fund the sender account via Piñata:

   ```bash
   # This may take a few seconds to complete
   wallet pinata claim --to <sender_public_account_id>
   ```

2. Check the sender account balance:

   ```bash
   wallet account get --account-id <sender_public_account_id>
   ```

   In the output you should see `Account owned by authenticated transfer program`, with a `"balance":150`.

### Create and fund the recipient public account

1. Create a recipient public account and record the `account_id` value. Complete this step in the same terminal session as the sender account commands to avoid exporting `NSSA_WALLET_HOME_DIR` again.

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

This should show a `"balance":113` (150 - 37 = 113).

   ```bash
   # Recipient account
   wallet account get --account-id <recipient_public_account_id>
   ```

This should show a `"balance":37`.

## Next steps

- [Transfer native tokens on the Logos Execution Zone](../transfer-tokens/transfer-native-tokens-on-the-logos-execution-zone.md)
- [Create and transfer custom tokens on the Logos Execution Zone](../transfer-tokens/create-and-transfer-custom-tokens-on-the-logos-execution-zone.md)
