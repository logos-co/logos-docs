---
title: Run a decentralised LEZ sequencer
doc_type: procedure
product: lez
topics: lez, sequencer, staking
steps_layout: sectioned
authors: schouhy, kashepavadan
owner: logos
doc_version: 1
slug: run-decentralised-lez-sequencer
sidebar_position: 1
---

# Run a decentralised LEZ sequencer

#### Stake a Bedrock key into the LEZ sequencer committee and produce blocks on your round-robin turn.

:::tip[Version]
This document is accurate for **Testnet v0.3.2**.
:::

The [LEZ](../../get-started/glossary.md#lez) sequencer (`sequencer_service`) orders mempool transactions into blocks and inscribes them on the zone's [channel](../../get-started/glossary.md#channel) on [Bedrock](../../get-started/glossary.md#bedrock). On v0.3, a committee of sequencers takes turns doing this. Anyone who meets the minimum stake can join the committee: the committee follows the stake recorded on chain, so no existing operator has to add you by hand.

This procedure shows how to build the sequencer from the [`v0.3.2`](https://github.com/logos-blockchain/logos-execution-zone/releases/tag/v0.3.2) release, prepare a node home, stake its Bedrock key, and confirm the node produces blocks on its turn. It's for operators who want to run a committee member on the public testnet, or try the flow on a local network first.

The stake is what makes misbehaviour costly. A member that inscribes an invalid or misplaced block is slashed, and slashing burns the key's whole stake. Being offline isn't slashed.

:::info[Prerequisites]

- A supported OS:
  - Linux
  - macOS

  The service setup in [Step 7](#step-7-run-the-node-as-a-service) is for Linux with systemd only.
- Disk space for the node's database, which grows with the chain. No GPU is needed.
- The [Rust toolchain](https://www.rust-lang.org/tools/install). `rustup` installs the pinned 1.98.1 on the first build.
- The [RISC Zero toolchain](https://dev.risczero.com/api/zkvm/install), installed with `rzup install`. The repository uses risc0 3.0.5.
- [`just`](https://github.com/casey/just), Python 3, and the build dependencies listed in the repository [`README.md`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.2/README.md).
- For the public testnet:
  - A [Logos Blockchain node](../../blockchain/get-started/run-blockchain-node-from-cli.md) on the testnet, running Logos Blockchain [`0.3.4`](https://github.com/logos-blockchain/logos-blockchain/releases/tag/0.3.4). When you follow that page, install module version `0.3.4` instead of `0.3.2`. Release 0.3.4 includes the zone-sdk fix that LEZ v0.3.2 depends on, and upgrades a 0.3.2 node config automatically.
  - A funded key in that node's wallet, such as the `PoWClaim` key funded by [mining](../../blockchain/get-started/run-blockchain-node-from-cli.md#step-4-mine-tokens-to-fund-your-node). It pays for the node's inscriptions and for the channel-config transactions it drafts.
  - A [public account](../../get-started/glossary.md#public-account) holding at least the network's minimum stake, in an [LEZ CLI wallet](../get-started/run-lez-wallet-via-cli.md) pointed at the testnet RPC. Stake transactions are fee-exempt, so the stake amount is all it needs.
- For a local network: [Docker](https://docs.docker.com/get-docker/), to run Bedrock.
:::

## What to expect

- You can run a sequencer that the committee accredits and that publishes LEZ blocks on its round-robin turn.
- You can check accreditation by finding your node's Bedrock key in the channel's `accredited_keys`.
- You can leave the committee cleanly and get your stake back once the exit delay has passed.

## Step 1: Build the sequencer from the release tag

Run every command in this procedure from the repository root.

1. Clone the repository and check out the release:

   ```bash
   git clone https://github.com/logos-blockchain/logos-execution-zone.git
   cd logos-execution-zone
   git checkout v0.3.2
   ```

1. Build the wallet and the sequencer, including the `submit_stake` tool:

   ```bash
   cargo build --release -p wallet -p sequencer_service --features sequencer_service/submit_stake
   ```

   - This builds `sequencer_service`, `bedrock_pubkey`, `submit_stake`, and `wallet` into `target/release`.

1. Put the binaries on your `PATH`. Repeat this in every new terminal you open during the procedure:

   ```bash
   export PATH="$PWD/target/release:$PATH"
   ```

## Step 2: Choose the network to join

Join the public testnet, or start a local network to try the flow first. You only need one of the options below. Each one sets the shell variables that the rest of the procedure uses, so run the later steps in the same terminal.

### Option A—Join the public testnet

:::warning
The joining sequencer config for the public testnet isn't published with the v0.3.2 release yet. Every node on a channel has to agree on its genesis and `channel_params`, so don't substitute the debug config. Ask the LEZ team on the [Logos Discord](https://discord.gg/logosnetwork) for the current config before you continue.
:::

1. Set the variables for the testnet. Replace `<your-bedrock-node>` with your Bedrock node's API address, and `<joining-config>` with the path to the testnet joining config:

   ```bash
   NODE_HOME=~/.logos-execution-zone/sequencer
   SEQUENCER_RPC=https://testnet.lez.logos.co
   NODE_URL=http://<your-bedrock-node>
   CHANNEL_ID=0101010101010101010101010101010101010101010101010101010101010101
   CONFIG=<joining-config>
   NODE_RPC=http://127.0.0.1:3040
   ```

   - `NODE_HOME` is a new directory that [Step 3](#step-3-prepare-the-node-home) creates. It holds the node's staked key, so it must not exist yet.
   - `SEQUENCER_RPC` is any committee member's RPC. The node's own wallet talks to it.
   - The channel ID for each release is listed on [Testnet endpoints](../../get-started/testnet-endpoints.md).

1. Set `FUNDING_KEY` to the public part of the funded key in your Bedrock node's wallet:

   ```bash
   FUNDING_KEY=<bedrock-wallet-public-key>
   ```

### Option B—Start a local network

You need four terminals for this option. Run [Step 1](#step-1-build-the-sequencer-from-the-release-tag)'s `export PATH` in each one.

1. **In terminal 1**, clear the previous local run and start Bedrock. It stays in the foreground:

   ```bash
   just clean
   just run-bedrock
   ```

1. **In terminal 2**, start the first sequencer, which creates the channel:

   ```bash
   just run-sequencer
   ```

   Wait for the first `Publishing block` line before continuing.

   **Expected result:**

   ```text
   Channel does not exist yet; starting it as channel creator
   Publishing block 2 on pin <msg id>
   ```

1. **In terminal 3**, import the accounts that the local genesis funds:

   ```bash
   just wallet-import-test-accounts
   ```

   **Expected result:** the output lists `Public/CbgR6tj5kWx5oziiFptM7jMvrQeYY3Mzaao6ciuhSr2r` and `Public/2RHZhw9h534Zr3eq2RGhQete2Hh667foECzXPmSkGni2`.

1. Still in terminal 3, check that the joining node's home doesn't exist yet. `just clean` doesn't remove it:

   ```bash
   ls ~/.logos-execution-zone/sequencer
   ```

   **Expected result:** `No such file or directory`. If the directory is left over from a previous local run, remove it. If it belongs to another node, such as a testnet one, keep it and use a different path for `NODE_HOME` in the next action.

1. Set the variables for the local network. Run the rest of the procedure in terminal 3, except where a step says otherwise:

   ```bash
   NODE_HOME=~/.logos-execution-zone/sequencer
   SEQUENCER_RPC=http://127.0.0.1:3040
   NODE_URL=http://localhost:18080
   CHANNEL_ID=0101010101010101010101010101010101010101010101010101010101010101
   CONFIG=lez/sequencer/service/configs/debug/sequencer_config.json
   NODE_RPC=http://127.0.0.1:3041
   ```

   - The debug config's `funding_key` already matches the local Bedrock node's wallet, so you don't set `FUNDING_KEY`.

## Step 3: Prepare the node home

`just setup-sequencer` creates the node home. It submits nothing, so it doesn't need funds.

1. Create the node home:

   ```bash
   just setup-sequencer "$NODE_HOME" --sequencer "$SEQUENCER_RPC" --node-url "$NODE_URL" --config "$CONFIG"
   ```

   **Expected result:** the command ends with `<NODE_HOME> is ready.` and prints the funding account and the Bedrock key. The home contains:

   | File | Contents |
   |:---|:---|
   | `sequencer_config.json` | A copy of `$CONFIG`, with `home` and `node_url` set for this node. |
   | `wallet/` | The node's own wallet, pointed at `$SEQUENCER_RPC`. |
   | `wallet-seed` | That wallet's password and recovery phrase, in plain text. |
   | `bedrock_signing_key` | The Bedrock key that the stake accredits. |
   | `stake-funding-account` | A new account in the node's wallet that the stake is paid from. |

   :::danger
   `bedrock_signing_key` is the staked identity. If you lose it, you lose the seat. Back it up, restrict its permissions, and never run two nodes with the same key: two nodes inscribing for one key produce misplaced blocks, which are slashed.

   The node's wallet holds the key that's needed to unstake, and `wallet-seed` holds its password and recovery phrase in the clear. Anyone who can read the home controls the stake, so restrict its permissions and back it up.
   :::

1. (Public testnet only) Set the config's `funding_key` to your Bedrock wallet key:

   ```bash
   python3 -c 'import json, sys; p = sys.argv[1]; c = json.load(open(p)); c["bedrock_config"]["funding_key"] = sys.argv[2]; json.dump(c, open(p, "w"), indent=4)' \
       "$NODE_HOME/sequencer_config.json" "$FUNDING_KEY"
   ```

1. Read the funding account and the Bedrock public key into variables for the next steps:

   ```bash
   FUNDING=$(cat "$NODE_HOME/stake-funding-account")
   SEQUENCER_KEY=$(bedrock_pubkey "$NODE_HOME/sequencer_config.json" --home "$NODE_HOME")
   ```

## Step 4: Start the node and let it catch up

The node follows the chain as soon as it starts, and starts producing once the committee accredits its key. Start it in its own terminal, terminal 4 on a local network, and set `NODE_HOME` and `PATH` there too.

1. Start the node. On the public testnet:

   ```bash
   RUST_LOG=info sequencer_service "$NODE_HOME/sequencer_config.json" \
       --home "$NODE_HOME" --listen-address 127.0.0.1
   ```

   On a local network, the first sequencer already holds ports 3040 and 9000:

   ```bash
   RUST_LOG=info sequencer_service "$NODE_HOME/sequencer_config.json" \
       --home "$NODE_HOME" --port 3041 --metrics-address 127.0.0.1:9001
   ```

   - The sequencer RPC has no caller authentication. `--listen-address 127.0.0.1` keeps it on the local machine; only bind it to a public address if a firewall protects the port.

   **Expected result:**

   ```text
   Channel already exists; joining as a non channel creator
   ```

   If the log says `Channel does not exist yet; starting it as channel creator` instead, stop the node; see [Troubleshooting](#the-node-starts-its-own-channel).

1. Back in your working terminal, compare your node's last block ID with a committee member's. Repeat until they match:

   ```bash
   for rpc in "$NODE_RPC" "$SEQUENCER_RPC"; do
     curl -s -X POST -H 'Content-Type: application/json' \
       --data '{"jsonrpc":"2.0","method":"getLastBlockId","params":[],"id":1}' "$rpc"
     echo
   done
   ```

## Step 5: Stake the node's key

1. Look up the channel's minimum stake:

   ```bash
   just committee-watch --sequencer "$SEQUENCER_RPC" --node "$NODE_URL" --channel "$CHANNEL_ID"
   ```

   **Expected result:** the first line starts with `minimum stake <n>`. The local debug config sets it to `149`.

1. Set the amount to stake. It must be at least the minimum:

   ```bash
   MIN=<minimum-stake>
   ```

1. Fund the node's funding account from your funded account. Replace `<funded-account>` with your account ID:

   ```bash
   wallet auth-transfer send --from Public/<funded-account> --to "Public/$FUNDING" --amount "$MIN"
   ```

   On a local network, send from a genesis account through the debug wallet instead:

   ```bash
   just run-wallet auth-transfer send --from Public/CbgR6tj5kWx5oziiFptM7jMvrQeYY3Mzaao6ciuhSr2r \
       --to "Public/$FUNDING" --amount "$MIN"
   ```

   **Expected result:** `Transaction is included in block <n>`.

1. Create the ownership account in the node's wallet. It holds the stake and receives the producer rewards. Save its ID in the home, because you need it to unstake:

   ```bash
   OWNERSHIP=$(LEE_WALLET_HOME_DIR="$NODE_HOME/wallet" wallet account new public \
       | sed -n 's|.*account_id Public/\([^ ]*\).*|\1|p')
   echo "$OWNERSHIP" > "$NODE_HOME/stake-ownership-account"
   ```

1. Submit the stake:

   ```bash
   submit_stake --wallet "$NODE_HOME/wallet" stake \
       --funding-account "$FUNDING" \
       --ownership-account "$OWNERSHIP" \
       --sequencer-key "$SEQUENCER_KEY" \
       --amount "$MIN"
   ```

   **Expected result:** `Submitted transaction <tx hash>`.

## Step 6: Confirm the key is accredited

The committee only changes on finalised state, and the change needs a member's turn plus co-signatures from two thirds of the members, so accreditation can take several minutes.

1. Check the channel until your key appears in `accredited_keys`:

   ```bash
   curl -s "$NODE_URL/channel/$CHANNEL_ID"
   ```

   **Expected result:** `{"accredited_keys":["<SEQUENCER_KEY>", ...], ...}`, with the value of `$SEQUENCER_KEY` in the list.

1. Watch the node's log. From now on, it produces blocks on its turn:

   ```text
   [2026-09-29T21:19:40Z INFO  sequencer_core] Publishing block 30 on pin 8312aa4a2a10ca38cb1db8c55fb3306f4f8fab1...
   ```

   - A turn can take up to one full rotation of the committee to come round.

## Step 7: Run the node as a service

On the public testnet, run the node under systemd so that it survives reboots. The node shuts down cleanly on `SIGTERM`. Skip this step on a local network.

1. Stop the foreground node from [Step 4](#step-4-start-the-node-and-let-it-catch-up) with `Ctrl-C`.

1. Write the service unit:

   ```bash
   sudo tee /etc/systemd/system/lez-sequencer.service >/dev/null <<EOF
   [Unit]
   Description=LEZ sequencer
   Wants=network-online.target
   After=network-online.target

   [Service]
   User=$USER
   Environment=RUST_LOG=info
   ExecStart=$PWD/target/release/sequencer_service $(realpath "$NODE_HOME")/sequencer_config.json --home $(realpath "$NODE_HOME") --listen-address 127.0.0.1
   Restart=on-failure
   TimeoutStopSec=60

   [Install]
   WantedBy=multi-user.target
   EOF
   ```

1. Enable and start the service, then follow its log:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now lez-sequencer
   journalctl -u lez-sequencer -f
   ```

1. Confirm the node is producing blocks:

   ```bash
   journalctl -u lez-sequencer | grep "Publishing block"
   ```

   **Expected result:** one `Publishing block <n> on pin <msg id>` line for each block your node produced on its turn.

## Step 8: Leave the committee

Stopping the process doesn't remove the node from the committee. Request the unstake first, and stop the node only once the key has left `accredited_keys`.

1. Request the unstake. Replace `<destination-account>` with the account that receives the stake:

   ```bash
   submit_stake --wallet "$NODE_HOME/wallet" unstake-request \
       --ownership-account "$(cat "$NODE_HOME/stake-ownership-account")" \
       --amount "$MIN" --destination <destination-account>
   ```

   **Expected result:** `Submitted transaction <tx hash>`.

1. Check the channel until your key is no longer in `accredited_keys`:

   ```bash
   curl -s "$NODE_URL/channel/$CHANNEL_ID"
   ```

   - The request is only valid for 16 blocks. If the key is still listed a few minutes later, submit the request again.

1. Stop the node. On the public testnet:

   ```bash
   sudo systemctl disable --now lez-sequencer
   ```

   On a local network, press `Ctrl-C` in terminal 4.

   **Expected result:** after `exit_delay` blocks (100 by default), a sequencer includes the `FinalizeUnstake` transaction and the destination account receives the stake.

## Troubleshooting

### The key never appears in `accredited_keys`

Either the stake reverted, or the committee can't land the change yet.

- The stake reverts if it's below `minimum_sequencer_stake`, if the funding account isn't funded, or if the ownership account already backs another key.
- The committee follows finalised state and needs a member's turn plus two thirds of the members' co-signatures, so offline members, or another change in flight, hold it back.

Check the funding account's balance:

```bash
LEE_WALLET_HOME_DIR="$NODE_HOME/wallet" wallet account get --account-id "Public/$FUNDING"
```

If the funds are still there, the stake reverted: stake again with at least the minimum. Otherwise, wait. `just committee-watch` shows the stake entry and the live committee side by side while the change settles.

### The node starts its own channel

The log shows `Channel does not exist yet; starting it as channel creator`. The `channel_id` in the node's config is wrong or, on a local network, the node started before the first sequencer created the channel.

Stop the node, correct `channel_id` in `$NODE_HOME/sequencer_config.json` or wait for the first sequencer's first block, and delete the node's `rocksdb-<channel id>` directory in `$NODE_HOME`.

### The node can't pay Bedrock fees

The log shows `Failed to fund channel transaction`. The config's `funding_key` isn't a key in the Bedrock node's wallet, or that key holds no funds. Set `funding_key` to a funded key from that node's wallet, as in [Step 3](#step-3-prepare-the-node-home), and restart the node.

### Known constraints

- **Reachability:** members share mempool transactions and co-sign committee changes over gossip. A node that no member can connect to still produces on its turn, because its blocks go through Bedrock, but it only includes transactions sent to its own RPC, and it counts as offline for committee changes.
- **Downtime:** being offline isn't slashed and doesn't remove the node from the committee. A missed turn passes to the next member after `posting_timeout` idle slots, and the node earns no rewards for it. Slashing covers only invalid or misplaced blocks.
- **Clock:** turns follow Bedrock slots, not the local clock, but block timestamps come from the producing node's system clock and nothing checks them. Keep the clock synced with NTP.
- **Distribution:** v0.3.2 ships no prebuilt binaries or published Docker images for this flow. Build from source.
