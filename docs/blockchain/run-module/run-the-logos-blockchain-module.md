---
title: Run the Logos Blockchain module
doc_type: procedure
product: blockchain
topics: blockchain
steps_layout: sectioned
authors: bacv, kashepavadan
owner: logos
doc_version: 1
slug: run-the-logos-blockchain-module
---

# Run the Logos Blockchain module

#### Get started with the Logos Blockchain module using the `logoscore` CLI.

This procedure explains how to download, install, and run the Logos Blockchain module using the Logos Core CLI runtime ([`logoscore`](https://github.com/logos-co/logos-logoscore-cli)) and the Logos package manager ([`lgpm`](https://github.com/logos-co/logos-package-manager)). It applies to node operators who want to connect to a Logos blockchain environment, such as devnet, from the command line. By the end, your node will be loaded with the blockchain module, configured with peers and deployment settings, and running.

You need:

- OS: Linux (x86_64 or aarch64) or macOS (aarch64).
- RAM: 4 GB minimum, 8 GB recommended.

## What to expect

- You can install the Logos Blockchain module and load it into a running `logoscore` daemon.
- You can generate a user configuration and download deployment settings for an environment such as devnet.
- You can start the blockchain module and check whether your node is bootstrapping or online.

## Step 1: Install `logoscore` and `lgpm`

1. Build `logoscore` and `lgpm`:

   ```bash
   nix build 'github:logos-co/logos-logoscore-cli/tutorial-v3' --out-link ./logos

   nix build 'github:logos-co/logos-package-manager/tutorial-v3#cli' --out-link ./lgpm
   ```

## Step 2: Install the blockchain module

Download the module release for your platform, then install it with `lgpm`.

1. Download the Logos Blockchain module release for your platform from the [releases page](https://github.com/logos-blockchain/logos-blockchain-module/releases) (use `darwin` for macOS).

   ```bash
   # macOS
   curl -L -O https://github.com/logos-blockchain/logos-blockchain-module/releases/download/v0.0.1/logos-module-aarch64-darwin.lgx
   ```

1. Install the downloaded module using `lgpm`, pointing it to your modules directory.

   ```bash
   # Create the modules folder if you don't have it already
   mkdir -p modules

   # macOS
   ./lgpm/bin/lgpm --modules-dir ./modules install --file logos-module-aarch64-darwin.lgx
   ```

## Step 3: Load the module into logoscore

Start `logoscore` in daemon mode and load the blockchain module.

1. Start `logoscore` in daemon mode, using the same modules directory as `lgpm`.

   ```bash
   ./logos/bin/logoscore -m ./modules -D &
   ```

1. Load the blockchain module into the running daemon.

   ```bash
   ./logos/bin/logoscore load-module liblogos_blockchain_module
   ```

## Step 4: Configure and start your node

Generate a user configuration, fetch deployment settings, and start the module.

1. Generate a new user configuration file with your initial peer list.

   ```bash
   ./logos/bin/logoscore call liblogos_blockchain_module generate_user_config '{
     "initial_peers": [
       "/ip4/65.108.203.235/udp/3000/quic-v1/p2p/12D3KooWNbZTQ86TZ9MrZ2wm6iUFFj25AFTzFLUD7i6XkZHoUzU8",
       "/ip4/65.108.203.235/udp/3001/quic-v1/p2p/12D3KooWNhXaH4XTX6Pp66NDQZxZpXYQzeruwwraMvTxojz1QXPJ",
       "/ip4/65.108.203.235/udp/3002/quic-v1/p2p/12D3KooWNTLPg5uYPKgZCDvzyaWNwZNcwVKmfS2bNv52E9L9P7Hf",
       "/ip4/65.108.203.235/udp/3003/quic-v1/p2p/12D3KooWMULUG8RXC2esnfLcVzGHohf6KNPSswkCKa1mdpXz4tHH"
     ]
   }'
   ```

1. Download the deployment settings for the environment you want to connect to, such as devnet.

   ```bash
   curl -L -o deployment.yaml https://devnet.blockchain.logos.co/web/cfgsync/deployment-settings
   ```

1. Start the blockchain module using your user and deployment configuration files.

   ```bash
   ./logos/bin/logoscore call liblogos_blockchain_module start user_config.yaml deployment.yaml
   ```

1. Check whether the chain is still bootstrapping or already online.

   ```bash
   ./logos/bin/logoscore call liblogos_blockchain_module get_cryptarchia_info
   ```
