---
title: Connect the wallet CLI to the LEZ testnet
doc_type: procedure
product: lez
topics: lez
steps_layout: flat
authors: moudyellaz, kashepavadan
owner: logos
doc_version: 1
slug: connect-wallet-cli-to-lez-testnet
---

# Connect the wallet CLI to the LEZ testnet

#### Try the wallet CLI against the live LEZ testnet instead of a local sequencer.

This procedure explains how to install the wallet CLI from the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone/) and point it at the [LEZ](https://docs.logos.co/get-started/glossary#lez) testnet sequencer. It is intended for developers who have previously run the wallet against a local sequencer and want to test against testnet v0.2 instead.

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
   mv ~/.lee/wallet ~/.lee/wallet.old 2>/dev/null || true
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
