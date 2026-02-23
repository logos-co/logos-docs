# Start a Logos Blockchain Node Using the CLI

Applies to: https://github.com/logos-blockchain/logos-blockchain @ <!-- TODO: tag or commit SHA -->
Runtime target: Logos testnet v0.1
Last checked: <!-- TODO: YYYY-MM-DD -->
Status: Stub
Owner: @davidrusu
Tracking: https://github.com/logos-co/logos-docs/issues/171

## Outcome + value

- **Outcome (end goal):** A running Logos Blockchain node participating in consensus and proposing blocks.
- **Why it matters:** Participating in consensus is the primary method for securing and decentralizing the network.

## Audience

- Node operators who wish to run the node on a server or Raspberry Pi.

## Known gaps / Blockers

- 

## Prerequisites

- OS: macOS, Linux x86_64, Raspberry Pi OS, Windows
- Dependencies: glibc version 2.39
- Accounts/keys: Credentials to access faucet (if required).
- Network/chain: <!-- TODO: chain ID, network name, endpoints -->
- Other: <!-- TODO -->

## Hardware Requirements

- Target devices: Raspberry Pi 5 with [Raspberry Pi OS](https://www.raspberrypi.com/software/) installed, or modern Linux server.
- Minimum: 64 GB storage. See also the minimum hardware requirements listed [here](https://www.notion.so/nomos-tech/Hardware-Requirements-1fd261aa09df81a4a52be19e90b60891).
- Recommended: <!-- TODO: CPU, RAM, storage, network -->
- Storage profile: <!-- TODO: expected disk growth / SSD required? -->

## Configuration

- Env vars:
  - LOGOS_BLOCKCHAIN_CIRCUITS=../ - Location of LB circuits folder.

- Flags:
  - <!-- TODO: flag - purpose -->

- Config file keys:
  - <!-- TODO: key=example - purpose -->

- Default endpoints/ports:
  - API server: localhost:8080 
  - Swarm: 0.0.0.0:3000
  - Blend listening address: /ip4/0.0.0.0/udp/3400/quic-v1
  - Testing address: 0.0.0.0:8081


## Steps (Happy Path)

<!-- TODO: Copy/paste sequence from an empty machine to "it works" (include exact commands). -->

### 1. Download the Node Binary and Circuits

To begin, navigate to the [Logos Blockchain Node releases page](https://github.com/logos-blockchain/logos-blockchain/releases/) and download the latest node binary and circuits archive for your device's architecture. The node file has a name beginning with `logos-blockchain-node-`, and the circuits file has a name beginning with `logos-blockchain-circuits-`.

Instructions for downloading the node binary and circuits on a Raspberry Pi with `wget` are shown below.

```sh
# download circuits
wget https://github.com/logos-blockchain/logos-blockchain/releases/download/{version}/logos-blockchain-circuits-v{circuits-version}-linux-aarch64.tar.gz

# download node binary
wget https://github.com/logos-blockchain/logos-blockchain/releases/download/{version}/logos-blockchain-node-linux-aarch64-{version}.tar.gz
```

Then, extract the `tar.gz` files as shown below.

```sh
tar -xf logos-blockchain-circuits-v{circuits-version}-linux-aarch64.tar.gz
tar -xf logos-blockchain-node-linux-aarch64-{version}.tar.gz

# Install circuits
mv logos-blockchain-circuits-v{circuits-version}-linux-aarch64 ./logos-blockchain-circuits
```

If you don't want to move the circuits to `~/.logos-blockchain-circuits`, you need to set the `LOGOS_BLOCKCHAIN_CIRCUITS` environment variable to the location of the extracted circuits folder.

```sh
export LOGOS_BLOCKCHAIN_CIRCUITS=./logos-blockchain-circuits
```

### 2. Run the Node

Before running the node, you need to generate a unique user configuration for your node in the `user_config.yaml`. This can be done by running the following command:

```sh
./logos-blockchain-node init \
    -p {peer1} \
    -p {peer2}
```

The bootstrap peers used for this command can be found in the [Logos Blockchain Node release notes](https://github.com/logos-blockchain/logos-blockchain/releases/).

You can change the API port of your node by changing the `api_port` field in `user_config.yaml`. By default, it is set to `8080`.

Once you are satisfied with your settings, run the node with this command:

```sh
./logos-blockchain-node user_config.yaml
```

### 3. Request Tokens From Faucet

In another terminal window, find the keys associated with your node by running the following command.

```sh
grep -A4 known_keys user_config.yaml
```

The result should look something like this:

```sh
known_keys:
    57364103d3ff29c35d2073cba0526ef729b8e08490bddfc6b74128b6613fe923: ...
    de3233cec107e6589f83d4f3094caa65c633b5b33601211353779dc01972ca14: ...
voucher_master_key_id: de3233cec107e6589f83d4f3094caa65c633b5b33601211353779dc01972ca14
```

Choose any of the keys in `known_keys` and navigate to the [public faucet](https://devnet.blockchain.logos.co/node/0/faucet). Enter your chosen key into the box labelled "Destination Public Key" and press "Request Funds".

To verify that your funds were received, run the following command:

```sh
curl http://localhost:8080/wallet/{your-chosen-key}/balance
```

> It may take up to a minute for the transaction to go through and for the funds to appear in your wallet.

### 4. Participate in consensus

Once funded, your node will automatically participate in the consensus lottery and start producing blocks. The UTXO you received from the faucet needs to age before it becomes eligible, which takes approximately 2 hours.

## Expected Outputs

### Step 2 - Run the Node

A file called `user_config.yaml` should be generated. Once the node is run, you should expect to see logs being printed to your terminal window.

### Step 3 - Request Tokens From Faucet

The known_keys in your `user_config.yaml` file should look something like this:

```sh
known_keys:
    57364103d3ff29c35d2073cba0526ef729b8e08490bddfc6b74128b6613fe923: ...
    de3233cec107e6589f83d4f3094caa65c633b5b33601211353779dc01972ca14: ...
voucher_master_key_id: de3233cec107e6589f83d4f3094caa65c633b5b33601211353779dc01972ca14
```

If you successfully received funds from the faucet, querying the balance should result in something like this:

```sh
{
  "tip": "5d16d4bd3712dc5869fc624e59774552b4fb0c974a6efa516563b3778bac9258",
  "balance": 5,
  "address": "57364103d3ff29c35d2073cba0526ef729b8e08490bddfc6b74128b6613fe923"
}
```

### Step 4- Participate in Consensus: <!-- TODO: no way to observe block production yet -->

## Verify

### Check That the Blockchain Height is Increasing

```sh
curl localhost:8080/cryptarchia/info
```

Example response:

```json
{"lib":"3d0c...4e6d","tip":"f44d...e2f5","slot":70899,"height":120,"mode":"Bootstrapping"}
```

You should see the `height` increasing at an average rate of 1 block every 10 seconds. The timing is probabilistic, so expect some variance.

### Check That Your Node is Connected to Peers:

```sh
curl localhost:8080/network/info
```

Example response:

```json
{"listen_addresses":["/ip4/127.0.0.1/udp/3001/quic-v1"],"peer_id":"12D3...fuS2","n_peers":16,"n_connections":19,"n_pending_connections":0}
```

Verify that `n_peers` is greater than 0.

## Troubleshooting (top 3-5)

- Symptom: Balance not updating after requesting funds from the faucet.
  Cause: Only one faucet transaction can be included per block. During high demand, your transaction may be dropped.
  Fix/workaround: Retry the request from the faucet.

## Limits (for Testnet v0.1)

- Not supported: Dynamic wallet key management. To add new keys, you must manually edit the config file and restart the node.
- Known issues/sharp edges: No key generation tooling exists yet outside of the init command.

## References (links)

- Node repo: https://github.com/logos-blockchain/logos-blockchain
- Internal devnet launch notes: https://nomos-tech.notion.site/Internal-Devnet-Launch-February-2026-2fe261aa09df8025ad94e380933b4cf9
- Docs inventory spreadsheet: https://docs.google.com/spreadsheets/d/1V94fhGxwTGbyLy2u8OcZmJQIzIctIGUHHfqyyY01V3E/edit?usp=sharing