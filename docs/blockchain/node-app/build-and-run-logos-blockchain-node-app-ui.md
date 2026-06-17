---
title: Build and run the Logos Blockchain UI App
doc_type: procedure
product: blockchain
topics: blockchain
steps_layout: sectioned
authors: davidrusu, cheny0
owner: logos
doc_version: 1
slug: build-and-run-logos-blockchain-node-app-ui
---

# Build and run the Logos Blockchain UI App

#### Run a node that participates in consensus via a standalone application.

The Logos Blockchain is the blockchain module of the Logos technology stack, providing a privacy-preserving and censorship-resistant framework for decentralized network states. You can run a Logos Blockchain node [using the CLI](./run-a-logos-blockchain-node-on-public-testnet-from-cli.md) or a standalone application.

{% hint style="info" %}

For testnet v0.1, you must manually edit the config file and restart the node to add new keys.

{% endhint %}

Before you start, make sure you have the following:

- A supported OS: Linux x86_64 or macOS
- [Nix](https://github.com/NixOS/nix-installer) installed with flakes enabled.

## What to expect

By the end of this tutorial:

- You will have a Logos Blockchain node running and connected to peers.
- Your wallet will hold testnet funds requested from the faucet.
- Your node will be eligible to participate in the consensus lottery after the UTXO ages for approximately two hours.

## Step 1: Run the Logos Blockchain app

1. Clone the repository:

    ```sh
    git clone https://github.com/logos-blockchain/logos-blockchain-ui.git
    cd logos-blockchain-ui
    ```

1. Build the standalone app:

    ```sh
    nix build
    ```

    - If flakes are not enabled globally, run `nix build --extra-experimental-features 'nix-command flakes' '.#app'` instead.

1. Run the app:

    ```sh
    ./result/bin/logos-blockchain-ui-app
    ```

## Step 2: Generate and load a node config

1. In the app, click **Generate Config**.

1. In the [Logos Blockchain release notes](https://github.com/logos-blockchain/logos-blockchain/releases), search for "testnet bootstrap peers" and copy the initial trusted peer set.

1. In the app, paste the peer set information in the **Initial peers** and click **Generate Config** on the bottom.

1. Click **Load Config** and select the generated config file. 

1. Click **Start Node**. A green indicator shows the node is running, and the wallet appears with a balance of `0`.

## Step 3: Request testnet funds from the faucet

1. From the wallet section of the UI, copy one of your keys.

1. Go to the [devnet faucet](https://devnet.blockchain.logos.co/node/0/faucet), paste your key, and click **Request Funds**.

    {% hint style="info" %}
    
    The transaction can take up to a minute to confirm and appear in your wallet.

    {% endhint %}

## Step 4: Verify the node is healthy

1. Check that the blockchain height is increasing:

    ```sh
    curl localhost:8080/cryptarchia/info
    ```

    Example response:

    ```json
    {"lib":"3d0c...4e6d","tip":"f44d...e2f5","slot":70899,"height":120,"mode":"Bootstrapping"}
    ```

    Expect `height` to increase at an average rate of one block every 10 seconds. The timing is probabilistic, so some variance is normal.

1. Check that the node is connected to peers:

    ```sh
    curl localhost:8080/network/info
    ```

    Example response:

    ```json
    {"listen_addresses":["/ip4/127.0.0.1/udp/3001/quic-v1"],"peer_id":"12D3...fuS2","n_peers":16,"n_connections":19,"n_pending_connections":0}
    ```

    Confirm that `n_peers` is greater than `0`.

Once the node is funded and the UTXO has aged for approximately two hours, the node automatically participates in the consensus lottery and starts producing blocks.

## Troubleshooting starting a node

### The wallet balance does not update after a faucet request

Only one faucet transaction can be included per block, so transactions may be dropped during periods of high demand. Retry the request from the faucet.

### `nix build` is taking a long time to build

This is expected behaviour. The build could take over an hour in some cases.
