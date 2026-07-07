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

The [Logos Blockchain](https://docs.logos.co/get-started/glossary#logos-blockchain) is the blockchain [module](https://docs.logos.co/get-started/glossary#module) of the Logos technology stack, providing a privacy-preserving and censorship-resistant framework for decentralised network states. You can run a Logos Blockchain node [using the CLI](../) or a standalone application.

{% hint style="info" %}
For testnet v0.1, you must manually edit the config file and restart the node to add new keys.
{% endhint %}

Before you start, make sure you have the following:

- A supported OS: Linux x86\_64 or macOS
-   **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

    ```bash
    mkdir -p ~/.config/nix
    echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
    ```

## What to expect

By the end of this tutorial:

- You will have a Logos Blockchain node running and connected to peers.
- Your wallet will hold testnet funds requested from the faucet.
- Your node will be eligible to participate in the consensus lottery after the UTXO ages for approximately two hours.

## Step 1: Run the Logos Blockchain app

1.  Clone the repository:

    ```sh
    git clone https://github.com/logos-blockchain/logos-blockchain-ui.git
    cd logos-blockchain-ui
    ```
2.  Build and run the standalone app:

    ```sh
    nix run
    ```

    <div data-gb-custom-block data-tag="hint" data-style="info" class="hint hint-info"><p>On a cold Nix cache, the first run compiles the blockchain UI from source (Qt/C++ and Rust dependencies). This can take 20–60 minutes. Subsequent runs are instant from cache.</p></div>

## Step 2: Generate and load a node config

1. In the app, click **Generate Config**.

    ![Initial screen](../.gitbook/assets/build-and-run-logos-blockchain-node-app-ui/01-config-setup.png)
2. In the [Logos Blockchain release notes](https://github.com/logos-blockchain/logos-blockchain/releases), search for "testnet bootstrap peers" and copy the initial trusted peer set.
3. In the app, paste the peer set information in the **Initial peers** and click **Generate Config** on the bottom.
4. Click **Load Config** and select the generated config file.
5.  Click **Start Node**. A green indicator shows the node is running, and the wallet appears with a balance of `0`.

    ![Running node](../.gitbook/assets/build-and-run-logos-blockchain-node-app-ui/03-node-running.png)

## Step 3: Request testnet funds from the faucet

1. From the wallet section of the UI, copy one of your keys.
2.  Go to the [testnet faucet](https://testnet.blockchain.logos.co/web/faucet/), paste your key, and click **Request Funds**.

    <div data-gb-custom-block data-tag="hint" data-style="info" class="hint hint-info"><p>The transaction can take up to a minute to confirm and appear in your wallet.</p></div>

## Step 4: Verify the node is healthy

1.  Check that the blockchain height is increasing:

    ```sh
    curl localhost:8080/cryptarchia/info
    ```

    Example response:

    ```json
    {"lib":"3d0c...4e6d","tip":"f44d...e2f5","slot":70899,"height":120,"mode":"Bootstrapping"}
    ```

    Expect `height` to increase at an average rate of one block every 10 seconds. The timing is probabilistic, so some variance is normal.
2.  Check that the node is connected to peers:

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
