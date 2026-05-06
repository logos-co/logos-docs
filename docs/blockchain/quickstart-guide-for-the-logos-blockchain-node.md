---
title:
doc_type: procedure
product: blockchain
topics: blockchain
steps_layout: sectioned
authors: kashepavadan, davidrusu
owner: logos
doc_version: 1
slug: run-a-logos-blockchain-node-on-public-devnet-from-cli
---

# Run a Logos Blockchain node on the public devnet from the CLI

#### Start a node and verify runtime and consensus signals.

This procedure covers installing the Logos Blockchain node, connecting to the public devnet, and verifying it is running. The Logos Blockchain is the blockchain module of the Logos technology stack, providing a privacy-preserving and censorship-resistant framework for decentralized applications. This procedure is for node operators setting up a node for the first time.

There is currently no dynamic wallet key management. To add new keys you must manually edit `user_config.yaml` and restart the node. If the node is restarted while bootstrapping, it does not save sync progress and restarts from the beginning.

**Before you start**, ensure you have:

- Linux x86_64, or a Raspberry Pi 5 with [Raspberry Pi OS](https://www.raspberrypi.com/software/) installed
- glibc version 2.39 or later (Linux only)
- At least 64 GB of storage

## What to expect

- You can install the node binary and ZK circuits, generate a configuration, and join the public devnet.
- You can verify that your node is syncing and connected to peers using the local API.
- You can receive test tokens from the faucet and automatically participate in the consensus lottery once your stake matures.

## Step 1: Install the node binary and ZK circuits

The node requires zero-knowledge circuit files for cryptographic operations. Download the node binary and circuits archive from the [Logos Blockchain Node releases page](https://github.com/logos-blockchain/logos-blockchain/releases/latest), then install both before running the node.

> [!NOTE]
>
> The wallet used here is the node's internal key store, not a general-purpose user wallet. It holds the staking keys that give your node the right to participate in the consensus lottery.

1. Download the latest node binary and circuits archive for your device's architecture.

    - The node filename begins with `logos-blockchain-node-`.
    - The circuits filename begins with `logos-blockchain-circuits-`.

    For example, to download release 0.1.2 on Linux x86_64 with `wget`:

    ```sh
    wget https://github.com/logos-blockchain/logos-blockchain/releases/download/0.1.3-rc.1/logos-blockchain-circuits-v0.4.2-linux-x86_64.tar.gz
    wget https://github.com/logos-blockchain/logos-blockchain/releases/download/0.1.2/logos-blockchain-node-linux-x86_64-0.1.2.tar.gz
    ```

    On a Raspberry Pi (aarch64):

    ```sh
    wget https://github.com/logos-blockchain/logos-blockchain/releases/download/0.1.2/logos-blockchain-circuits-v0.4.2-linux-aarch64.tar.gz
    wget https://github.com/logos-blockchain/logos-blockchain/releases/download/0.1.2/logos-blockchain-node-linux-aarch64-0.1.2.tar.gz
    ```

1. Extract the downloaded archives:

    ```sh
    tar -xf logos-blockchain-circuits-*.tar.gz
    tar -xf logos-blockchain-node-*.tar.gz
    ```

1. Move the extracted circuits folder to `~/.logos-blockchain-circuits`, the default location the node searches:

    ```sh
    mv logos-blockchain-circuits-*/ ~/.logos-blockchain-circuits
    ```

    - To store circuits elsewhere, move them to your preferred path and set `export LOGOS_BLOCKCHAIN_CIRCUITS=/path/to/your/circuits`.

## Step 2: Configure and start the node

The init subcommand generates a user configuration - covering per-node settings such as keys, ports, and peer addresses - with fresh cryptographic keys and auto-detected public IP. 

> [!NOTE]
>
> Make sure to use the current bootstrap peer addresses in the [Logos Blockchain Node release notes](https://github.com/logos-blockchain/logos-blockchain/releases/) for your selected release.

1. Generate your `user_config.yaml` by running `init` with the bootstrap peer addresses. For example, for release 0.1.2:

    ```sh
    ./logos-blockchain-node init \
    -p /ip4/65.108.203.235/udp/3000/quic-v1/p2p/12D3KooWD5Fb4oxFTfUshdevQ6CT6x4CZ77d1QUvNM2K64dzh9kN \
    -p /ip4/65.108.203.235/udp/3001/quic-v1/p2p/12D3KooW9ttYQxksJUEwAq3HQd1sbzFS6VQTne8juapNCpnzx38M \
    -p /ip4/65.108.203.235/udp/3002/quic-v1/p2p/12D3KooWDShdi17Py9iUFLph8w5jjfvc5iZM3f2s2x1Z8bBkKcrU \
    -p /ip4/65.108.203.235/udp/3003/quic-v1/p2p/12D3KooWSqrYkptmyAW5uPiDtVUNFPi79v5jyPQkBPqQr3HNpTcA
    ```

    - To change the API port, set `api.backend.listen_address` in `user_config.yaml` before starting. The default is `8080`.

1. Start the node:

    ```sh
    ./logos-blockchain-node user_config.yaml
    ```

## Step 3: Verify that your node is running and connected to peers

Wait for your node to finish syncing and reach `Online` mode before requesting tokens. Pipe any `curl` command through `jq .` to format JSON output.

1. Check the consensus state:

    ```sh
    curl -s http://localhost:8080/cryptarchia/info | jq .
    ```

    Example response:

    ```json
    {
      "lib": "3d0c...4e6d",
      "tip": "f44d...e2f5",
      "slot": 70899,
      "height": 120,
      "mode": "Bootstrapping"
    }
    ```

    - `mode` starts as `Bootstrapping` while syncing and transitions to `Online` once caught up.
    - Confirm `slot` and `height` are increasing. `height` counts confirmed blocks; `slot` counts elapsed time intervals, with a new block expected roughly every 10 seconds.

1. Check peer connectivity:

    ```sh
    curl -s http://localhost:8080/network/info | jq .
    ```

    Example response:

    ```json
    {
      "listen_addresses": ["/ip4/127.0.0.1/udp/3001/quic-v1"],
      "peer_id": "12D3...fuS2",
      "n_peers": 16,
      "n_connections": 19,
      "n_pending_connections": 0
    }
    ```

    - Confirm `n_peers` is greater than `0`.

1. After 30–60 seconds, run the `cryptarchia/info` command again and confirm `slot` and `height` have increased.

1. Wait until `mode` transitions to `Online` before continuing. Bootstrapping may take 12 to 24 hours.

## Step 4: Request tokens from the faucet

A faucet distributes free tokens on test networks so you can experiment without financial risk. Navigate to the [public faucet site](https://devnet.blockchain.logos.co/web/faucet/) after your node reaches `Online` mode.

1. Find the keys associated with your node:

    ```sh
    grep -A3 known_keys user_config.yaml
    ```

    Example output:

    ```
    known_keys:
        57364103d3ff29c35d2073cba0526ef729b8e08490bddfc6b74128b6613fe923: ...
        de3233cec107e6589f83d4f3094caa65c633b5b33601211353779dc01972ca14: ...
    voucher_master_key_id: de3233cec107e6589f83d4f3094caa65c633b5b33601211353779dc01972ca14
    ```

1. Choose any key from `known_keys`, enter it in **Destination Public Key (Hex)** on the faucet site, and press **Request Funds**.

    ![Image of the faucet UI after requesting funds with a public key](./quickstart-guide-for-the-logos-blockchain-node/image1.png)

1. Wait 1 to 2 minutes, then check your balance. Replace `<your-chosen-key>` with the key you used:

    ```sh
    curl -s http://localhost:8080/wallet/<your-chosen-key>/balance | jq .
    ```

    Example response:

    ```json
    {
      "tip": "5d16d4bd3712dc5869fc624e59774552b4fb0c974a6efa516563b3778bac9258",
      "balance": 1000,
      "address": "57364103d3ff29c35d2073cba0526ef729b8e08490bddfc6b74128b6613fe923"
    }
    ```

    - Only one faucet transaction can be included per block. During high demand, your transaction may be dropped; retry the request and wait 1 to 2 minutes before checking again.

## Step 5: Participate in the consensus mechanism

Once the faucet UTXO has aged, your node automatically enters the consensus lottery and may begin proposing blocks. You can monitor your node's chain state at the [Logos devnet dashboard](https://devnet.blockchain.logos.co/web/).

1. Wait approximately 3.5 hours after receiving tokens for your UTXO to become eligible.

1. Confirm participation by checking that `mode` remains `Online` and `height` continues to increase.

    - Block proposal is probabilistic. Your node will not propose on every slot; participation depends on your stake relative to total active stake in the network.

## Troubleshooting the Logos Blockchain node

### The devnet explorer shows an error when I click on a transaction?

The [devnet explorer](https://devnet.blockchain.logos.co/web/) does not support clicking on individual transactions. Searching by address is also not supported. Transaction hashes returned by the faucet may appear truncated and may not be immediately findable.

### My wallet balance is not updating after requesting tokens?

Only one faucet transaction can be included per block. During high demand, your transaction may be dropped. Retry the request and wait 1 to 2 minutes before checking your balance again.