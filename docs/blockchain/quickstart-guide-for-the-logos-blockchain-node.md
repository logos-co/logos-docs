# Quickstart guide for the Logos Blockchain node

#### Start a node from the CLI and verify runtime and consensus signals.

> [!IMPORTANT]
>
> This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. We are actively working to complete and verify this content.

The Logos Blockchain is the blockchain module of the Logos technology stack, providing a privacy-preserving and censorship-resistant framework for decentralized network states. Its architecture has two layers: Bedrock, a base layer that provides consensus and data availability, and Zones, lightweight blockchains built on top where applications run. Bedrock uses [Cryptarchia](https://press.logos.co/article/why-proposer-anonymity), Logos Blockchain's Private Proof of Stake (PPoS) consensus protocol, which keeps block proposer identity and stake private by running the leadership election locally on each node using zero-knowledge proofs.

A node composes several services: Cryptarchia for consensus, [libp2p](https://libp2p.io/) for peer-to-peer communication with peer discovery handled by Kademlia (a distributed hash table protocol built into libp2p), [Blend](https://press.logos.co/article/why-proposer-anonymity) for privacy-preserving message mixing, a UTXO-based ledger with zero-knowledge proofs, and a wallet for key management. The node connects to peers using multiaddr addresses, a self-describing format that encodes network layers into a single path (for example, `/ip4/<ip>/udp/<port>/quic-v1/p2p/<peer-id>`).

In this quickstart you install the Logos Blockchain node, connect to the public devnet, and verify it is running.

> [!NOTE]
>
> The wallet described here is the node's internal key store, not a general-purpose user wallet. It holds the staking keys that give your node the right to participate in the consensus lottery.

## Prerequisites

**Software:**

- OS: Linux x86_64, Raspberry Pi OS (Raspberry Pi 5)
- On Linux, dependencies: glibc version 2.39 or later

**Minimum hardware:**

- Raspberry Pi 5 with [Raspberry Pi OS](https://www.raspberrypi.com/software/) installed, or modern Linux.
- Minimum: 64 GB storage. See also the minimum hardware requirements listed [here](https://www.notion.so/nomos-tech/Hardware-Requirements-1fd261aa09df81a4a52be19e90b60891).

## Step 1: Download and install the node binary and set up ZK circuits

The node requires zero-knowledge circuit files for cryptographic operations. Zero-knowledge proofs let the ledger validate transactions without revealing the underlying data: the prover demonstrates correctness and the verifier checks the proof without seeing the transaction details. You must install these circuit binaries before running the node.

1. Download the latest node binary and circuits archive for your device's architecture from the [Logos Blockchain Node releases page](https://github.com/logos-blockchain/logos-blockchain/releases/).

    > [!TIP]
    >
    > The node file has a name beginning with `logos-blockchain-node-`, and the circuits file has a name beginning with `logos-blockchain-circuits-`.

    For example, to download the current release (0.1.2) on Linux x86_64 with `wget`:

    ```sh
    # download ZK circuits
    wget https://github.com/logos-blockchain/logos-blockchain/releases/download/0.1.2/logos-blockchain-circuits-v0.4.1-linux-x86_64.tar.gz

    # download node binary
    wget https://github.com/logos-blockchain/logos-blockchain/releases/download/0.1.2/logos-blockchain-node-linux-x86_64-0.1.2.tar.gz
    ```

    On a Raspberry Pi (aarch64):

    ```sh
    # download ZK circuits
    wget https://github.com/logos-blockchain/logos-blockchain/releases/download/0.1.2/logos-blockchain-circuits-v0.4.1-linux-aarch64.tar.gz

    # download node binary
    wget https://github.com/logos-blockchain/logos-blockchain/releases/download/0.1.2/logos-blockchain-node-linux-aarch64-0.1.2.tar.gz
    ```

    > [!TIP]
    >
    > Check the [releases page](https://github.com/logos-blockchain/logos-blockchain/releases/) for a newer version before downloading.

1. Extract the `tar.gz` files:

    ```sh
    tar -xf logos-blockchain-circuits-*.tar.gz
    tar -xf logos-blockchain-node-*.tar.gz
    ```

1. Install the ZK circuits.

    By default, the node looks for circuit files in `~/.logos-blockchain-circuits`. Rename and move the extracted folder to that location:

    ```sh
    mv logos-blockchain-circuits-*/ ~/.logos-blockchain-circuits
    ```

    If you want to store the circuits in a different location, move them there instead and set the `LOGOS_BLOCKCHAIN_CIRCUITS` environment variable to that path:

    ```sh
    export LOGOS_BLOCKCHAIN_CIRCUITS=/path/to/your/circuits
    ```

## Step 2: Run the Logos Blockchain node

The node separates configuration into two layers. The deployment configuration holds network-wide parameters such as consensus settings and genesis state (the built-in "devnet" deployment is the default). The user configuration holds per-node settings such as cryptographic keys, ports, and peer addresses. The `init` subcommand generates a user config with fresh cryptographic keys, auto-detects your public IP via the libp2p Identify protocol, and writes the result to the `user_config.yaml` file.

Bootstrap nodes are the initial contact points for joining the network. Once your node connects to them, it uses Kademlia to discover additional peers and no longer depends on the bootstrap nodes.

1. Before running the node, you need to generate a unique user configuration for your node in the `user_config.yaml`. This can be done by running the following command:

    ```sh
    ./logos-blockchain-node init \
        -p {peer1} \
        -p {peer2}
    ```

    The bootstrap peers used for this command can be found in the [Logos Blockchain Node release notes](https://github.com/logos-blockchain/logos-blockchain/releases/). For example, the 0.1.2 release uses:

    ```sh
    ./logos-blockchain-node init \
        -p /ip4/65.109.51.37/udp/3000/quic-v1/p2p/12D3KooWL7a8LBbLRYnabptHPFBCmAs49Y7cVMqvzuSdd43tAJk8 \
        -p /ip4/65.109.51.37/udp/3001/quic-v1/p2p/12D3KooWPLeAcachoUm68NXGD7tmNziZkVeMmeBS5NofyukuMRJh \
        -p /ip4/65.109.51.37/udp/3002/quic-v1/p2p/12D3KooWKFNe4gS5DcCcRUVGdMjZp3fUWu6q6gG5R846Ui1pccHD \
        -p /ip4/65.109.51.37/udp/3003/quic-v1/p2p/12D3KooWAnriLgXyQnGTYz1zPWPkQL3rthTKYLzuAP7MMnbgsxzR
    ```

    > [!NOTE]
    >
    > You can change the API port of your node by changing the `api_port` field in `user_config.yaml`. By default, it is set to `8080`.

1. Once you are satisfied with your settings, run the node with this command:

    ```sh
    ./logos-blockchain-node user_config.yaml
    ```

There is currently no dynamic wallet key management. To add new keys you must manually edit the `user_config.yaml` file and restart the node.

## Step 3: Verify that your node is running and connected to peers

Before requesting tokens, wait for your node to finish syncing. The node must be fully synced (mode `Online`, not `Bootstrapping`) before wallet balances are visible.

> [!TIP]
>
> Pipe any `curl` command through `jq .` to format the JSON output, for example: `curl -s http://localhost:8080/cryptarchia/info | jq .`

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

    Observe the following fields in the response:

    - `mode` indicates the node's current state. It starts in `Bootstrapping` while syncing and transitions to `Online` once caught up.
    - Confirm `slot` and `height` values are increasing. `height` counts confirmed blocks while `slot` counts elapsed time intervals.
    - You should see the `height` increasing at an average rate of 1 block every 10 seconds. The timing is probabilistic, so expect some variance.

1. Check peer connectivity and confirm `n_peers` is greater than 0:

    ```sh
    curl -s http://localhost:8080/network/info | jq .
    ```

    Example response:

   ```json
   {
     "listen_addresses": [
       "/ip4/127.0.0.1/udp/3001/quic-v1"
     ],
     "peer_id": "12D3...fuS2",
     "n_peers": 16,
     "n_connections": 19,
     "n_pending_connections": 0
   }
   ```

1. After 30–60 seconds, run the `cryptarchia/info` command again and confirm that `slot` and `height` have increased compared to the previous output.

1. Wait until `mode` transitions from `Bootstrapping` to `Online` before continuing to the next step. Bootstrapping may take 12 to 24 hours.

## Step 4: Request tokens from the faucet

A faucet distributes free tokens on test networks to experiment without financial risk. The devnet faucet is a separate service that transfers tokens to a specified ZK public key through the node's wallet API.

1. In another terminal window, find the keys associated with your node by running the following command:

    ```sh
    grep -A3 known_keys user_config.yaml
    ```

    The result should look something similar to this:

    ```
    known_keys:
        57364103d3ff29c35d2073cba0526ef729b8e08490bddfc6b74128b6613fe923: ...
        de3233cec107e6589f83d4f3094caa65c633b5b33601211353779dc01972ca14: ...
    voucher_master_key_id: de3233cec107e6589f83d4f3094caa65c633b5b33601211353779dc01972ca14
    ```

1. Choose any of the keys in `known_keys` and navigate to the [public faucet site](https://devnet.blockchain.logos.co/web/faucet/). Enter your chosen key in **Destination Public Key (Hex)** and press **Request Funds**.

    ![Image of the faucet UI after requesting funds with a public key](./quickstart-guide-for-the-logos-blockchain-node/image1.png)

1. Wait 1 to 2 minutes, then verify that your funds were received by querying the balance of your wallet. Replace `<your-chosen-key>` with the key you used in the previous step:

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

    > [!NOTE]
    >
    > If you don't see your balance updated, consider that only one faucet transaction can be included per block. During high demand, your transaction may be dropped. Retry the request and wait 1 to 2 minutes before checking your balance again.

## Step 5: Participate in the consensus mechanism

Once the faucet UTXO has aged (approximately 3.5 hours, or two epochs on the current devnet), your node automatically enters the consensus lottery and may begin proposing blocks. No further action is required.

You can compare your node's chain state against the devnet fleet at the [Logos devnet dashboard](https://devnet.blockchain.logos.co/web/).

> [!NOTE]
>
> Block proposal is probabilistic. Your node will not propose a block on every slot - participation depends on your stake relative to the total active stake in the network.


## Known limitations

- The [devnet explorer](https://devnet.blockchain.logos.co/web/) shows an error when clicking on a transaction. Searching by address is not supported.
- Transaction hashes returned by the faucet may appear truncated, and the transaction may not be immediately findable in the explorer.
- If the node is restarted while bootstrapping, it does not save sync progress and will restart from the beginning.
