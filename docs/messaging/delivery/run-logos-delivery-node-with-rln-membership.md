---
title: Run a Logos delivery node with an RLN membership on LEZ
doc_type: procedure
product: messaging
topics: [messaging, LEZ, RLN]
steps_layout: sectioned
authors: adklempner, kashepavadan
owner: logos
doc_version: 1
slug: run-logos-delivery-node-with-rln-membership
sidebar_position: 4
---

# Run a Logos delivery node with an RLN membership on LEZ

#### Start a Logos Delivery node on the DoS-protected logos.test network, register its RLN membership on the Logos Execution Zone, and send a rate-limited message.

:::tip[Version]
This document is accurate for **Testnet v0.3.0**.
:::

This procedure shows how to run a [Logos Delivery](../../get-started/glossary.md#logos-delivery) node on the `logos.test` network, which uses Rate-Limiting Nullifiers (RLN) to protect against denial-of-service attacks. Every node on `logos.test` needs an RLN membership, registered on a registry program on the [Logos Execution Zone](../../get-started/glossary.md#logos-execution-zone) (LEZ), and attaches a proof to each message it publishes. It is intended for node operators who want to join the DoS-protected network, and touches Logos Core, Logos Delivery, and LEZ in a single flow.

You use `logosctl` to host the `delivery_module` and the RLN [modules](../../get-started/glossary.md#module) (`liblogos_rln_module` and `liblogos_lez_rln_module`). The node creates its own wallet and payer account; once you fund that account with native LEZ tokens, the node registers its membership by itself and starts generating a proof for every send.

The flow takes 15 to 30 minutes once the payer account is funded. Funding by bridge deposit adds about an hour.

:::info[Prerequisites]

- A supported OS:
   - macOS (Apple Silicon)
   - Linux (x86-64 or aarch64)
- `curl`, `tar`, and `python3`
- Network access to `github.com` for the release and catalogue downloads, and to the testnet sequencer at `http://209.38.241.182:3240/`
- About 1 GB of free disk space. The `logosctl` release is about 100 MB and the modules about 300 MB.
- `250000000` units of native LEZ tokens for the node's payer account, from one of these sources:
   - A Logos Blockchain wallet you can [bridge assets](../../blockchain/zone-sdk/bridge-assets-between-blockchain-and-zone.md) from. Testnet has no faucet.
   - A LEZ account you already hold, with about `270000000` units so it can cover the transfer's fee reserve.

:::

## What to expect

- You can run a `delivery_module` node on `logos.test` with an active RLN membership registered on LEZ.
- You can fund the node's payer account and watch the node register its membership by itself.
- You can send a message that carries an RLN proof and confirm that it propagated and used up part of your epoch quota.

## Step 1: Download `logosctl`

Run every command in this procedure in one shell, from one working directory.

1. Create a working directory and change into it:

   ```bash
   mkdir -p ~/logos-cli && cd ~/logos-cli
   ```

1. Download `logosctl` 0.3.0 for your platform. Set `PLAT` to one of `aarch64-macos`, `x86_64-linux`, or `aarch64-linux`:

   ```bash
   PLAT=aarch64-macos
   curl -fsSL https://github.com/logos-co/logos-logoscore-cli/releases/download/0.3.0/logosctl-$PLAT.tar.gz | tar xz
   ```

1. Point `LOGOSCTL` at the binary:

   - On macOS, the archive holds a `bin/`, `lib/`, and `modules/` directory. Run the binary where it was unpacked, not through a symlink; it finds its libraries and bundled modules relative to its own path:

     ```bash
     LOGOSCTL=$PWD/logosctl-$PLAT/bin/logosctl
     ```

   - On Linux, the archive holds a single AppImage. Unpack it, which avoids needing FUSE, and use its `AppRun`:

     ```bash
     ./logosctl-*.AppImage --appimage-extract >/dev/null
     LOGOSCTL=$PWD/squashfs-root/AppRun
     ```

1. Check the version:

   ```bash
   $LOGOSCTL --version
   ```

   **Expected result:** `logosctl version 0.3.0`.

1. Set the session directory. Every `logosctl` command in this shell uses it to hold the daemon's state, its logs, and the installed modules:

   ```bash
   export LOGOSCTL_CONFIG_DIR=$PWD/session
   ```

## Step 2: Start the daemon with a wallet home

The node keeps its wallet, including its private key, in a wallet home directory. There is nothing to configure: the node finds the testnet sequencer by itself from the registry the `logos.test` preset names.

1. Create an empty wallet home:

   ```bash
   mkdir -p wallet-home
   ```

1. Start the daemon. It passes its environment to the modules, which is how the wallet finds its home:

   ```bash
   LEE_WALLET_HOME_DIR=$PWD/wallet-home \
   NSSA_WALLET_HOME_DIR=$PWD/wallet-home \
     $LOGOSCTL daemon start --detach
   ```

   **Expected result:** `Daemon started (pid N)` and the path of its log, `session/logs/daemon.log`. The command returns once the daemon is ready.

1. Check the daemon's status:

   ```bash
   $LOGOSCTL daemon status --json
   ```

   **Expected result:** `"daemon":{"status":"running",...}`, with `capability_module`, `package_manager`, and `package_downloader` loaded.

## Step 3: Install and load the modules

1. Install the [delivery module](../../get-started/glossary.md#delivery-module) and the RLN module from the official [catalogue](../../get-started/glossary.md#catalogue). `liblogos_rln_module` pulls in `liblogos_lez_rln_module`:

   ```bash
   $LOGOSCTL package install delivery_module liblogos_rln_module -y
   ```

1. List the installed packages:

   ```bash
   $LOGOSCTL package ls
   ```

   **Expected result:** `delivery_module` 0.3.0 or later, `liblogos_rln_module` 0.10.0 or later, and `liblogos_lez_rln_module` 4.2.1 or later, each with source `user`.

   - Older RLN modules don't know the testnet network, and older LEZ RLN modules reserve a fixed fee the testnet rejects.

1. Load the delivery module. This also loads the RLN modules, which are its optional dependencies:

   ```bash
   $LOGOSCTL module load delivery_module
   $LOGOSCTL module ls --loaded
   ```

   **Expected result:** `liblogos_lez_rln_module`, `liblogos_rln_module`, and `delivery_module` are loaded.

## Step 4: Create the delivery node

1. Capture the node's events in the background. The watcher only sees events emitted after it attaches, so start it first:

   ```bash
   $LOGOSCTL --json watch delivery_module >> events.jsonl 2>&1 &
   ```

1. Write the node config and create the node:

   ```bash
   cat > node.json <<'EOF'
   {"mode": "Core", "preset": "logos.test"}
   EOF
   $LOGOSCTL --json call delivery_module createNode @$PWD/node.json
   ```

   | Field | Purpose |
   |:------|:--------|
   | `mode` | `Core` runs a full relay node. |
   | `preset` | `logos.test` brings the network settings (cluster 2, 8 auto-shards, built-in entry nodes) and its RLN settings: the registry on the LEZ testnet, the RLN identifier, and the epoch size. |
   | `messagingOverrides` | Optional per-layer settings, for example `{"tcp-port": 30303}`. Keep extra keys inside it: a bare top-level key switches parsing to the legacy flat shape. |

   **Expected result:** `"success":true`. Creating the node also starts the RLN module on the registry that the preset names. The LEZ RLN module writes `wallet-home/wallet_config.json`, pointing at the testnet sequencer, and `wallet-home/network.json`. From here on, the node registers itself once its payer account is funded.

1. Poll the RLN state until it reports `"state":"Ready"`:

   ```bash
   $LOGOSCTL --json call delivery_module rlnState
   ```

   **Expected result:** the reply names the RLN scope the node uses:

   ```text
   "registryId":"logos:testnet:<64 hex>", "rlnIdentifier":"<64 hex>", "epochSizeSec":<N>
   ```

1. Keep both values for the RLN calls in later steps. Replace `<registryId>` and `<rlnIdentifier>` with the values from the reply. Write the identifier to a file so that `logosctl` can't mistake it for a number:

   ```bash
   REGISTRY=<registryId>
   printf '%s' '<rlnIdentifier>' > rln-id.arg
   ```

## Step 5: Fund the node's payer account

The node derives a payer account from its wallet. It needs `250000000` native units: the registry's price plus a fee reserve derived from the chain's base fee (`182800000` at the testnet's minimum fee). A registration spends about `75000000`; the rest stays in the payer account.

1. Poll the wallet status until `state` is `ready`:

   ```bash
   $LOGOSCTL --json call liblogos_lez_rln_module wallet_status
   ```

   **Expected result:** `{"status":"ok","result":{... "state":"ready", "network":"testnet", "payer":"<ACCOUNT>" ...}}`. While the wallet syncs, `state` is `pending`.

1. Convert the payer account ID to the `Public/<base58>` form that LEZ wallets and explorers use. Replace `<ACCOUNT>` with the 64-character hex value of `payer`, which is also the recipient a bridge deposit carries:

   ```bash
   ACCOUNT=<ACCOUNT>
   python3 -c '
   import sys
   A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
   h = sys.argv[1]
   n, s = int(h, 16), ""
   while n:
       n, r = divmod(n, 58)
       s = A[r] + s
   print("Public/" + "1" * ((len(h) - len(h.lstrip("0"))) // 2) + s)' $ACCOUNT
   ```

1. Send `250000000` native units to the payer account:

   - To bridge from the Logos Blockchain, follow [Bridge assets between the blockchain and a zone](../../blockchain/zone-sdk/bridge-assets-between-blockchain-and-zone.md). A deposit is credited on LEZ only once it is final on the blockchain, about an hour after you submit it.
   - To transfer from an existing LEZ account, send to the `Public/<base58>` address. A transfer carries a fee reserve of about `17000000` on top of the amount; all but the actual fee (about `100000`) is refunded to the sender.

1. Check the payer's balance. An empty argument file means the node's own payer:

   ```bash
   : > self.arg
   $LOGOSCTL --json call liblogos_lez_rln_module get_native_balance @$PWD/self.arg
   ```

   **Expected result:** `balance` is at or above the amount you sent.

## Step 6: Wait for the membership to register

The node registers itself on the LEZ registry, typically one to three minutes after the funding lands.

1. Poll the membership state until `state` is `active`:

   ```bash
   $LOGOSCTL --json call liblogos_rln_module get_membership_state $REGISTRY @$PWD/rln-id.arg
   ```

   - While registering, the reply shows `"state":"unknown"` and `"provisioning":{"step":"awaiting_funding"}` or `"step":"registering"`.

   **Expected result:** `"state":"active"` (or `"grace_period"`), with a `leaf_index` and a `membership_hash`. `"state":"failed"` means registration failed; see [Troubleshooting](#troubleshooting-rln-membership).

## Step 7: Start the node and send a message

The node only starts with an active membership.

1. Start the node and check that it reported `nodeStarted`:

   ```bash
   $LOGOSCTL --json call delivery_module start
   grep nodeStarted events.jsonl
   ```

1. Wait about 15 seconds for the node to join the [Relay](../../get-started/glossary.md#relay) mesh, then subscribe to a [content topic](../../get-started/glossary.md#content-topic):

   ```bash
   sleep 15
   TOPIC=/my-app/1/hello/proto
   $LOGOSCTL --json call delivery_module subscribe $TOPIC
   ```

1. Note the epoch quota before sending. The `str:` prefix passes the timestamp as a string:

   ```bash
   $LOGOSCTL --json call liblogos_rln_module get_epoch_quota $REGISTRY @$PWD/rln-id.arg str:$(date +%s)
   ```

   **Expected result:** `{"epoch_index":N,"rate_limit":N,"remaining":N}`.

1. Send a message:

   ```bash
   printf '%s' "hello from my node" > payload.arg
   $LOGOSCTL --json call delivery_module send $TOPIC @$PWD/payload.arg
   ```

   **Expected result:** `"success":true`, with a `requestId` as the value.

1. Check that the node generated a proof and the message propagated:

   ```bash
   grep -iE 'rlnGenerateProofRequest|messagePropagated|messageError' events.jsonl
   ```

   **Expected result:** within about 30 seconds, a proof-generation request for the send (`rlnGenerateProofRequest` or `dispatchRlnGenerateProofRequestEvent`), then:

   ```text
   {"event":"messagePropagated","data":{"arg0":"<requestId>","arg1":"<message hash>"}}
   ```

   - A `messageError` event with your `requestId` means the send failed; its data carries the reason.

1. Run the `get_epoch_quota` call again.

   **Expected result:** in the same `epoch_index`, `remaining` is lower than before the send.

1. Stop the daemon when you're finished:

   ```bash
   $LOGOSCTL daemon stop
   ```

   - The wallet, membership, and installed packages stay in `wallet-home/` and `session/`. To run the node again, start the daemon with the same environment as in [Step 2](#step-2-start-the-daemon-with-a-wallet-home), then `module load delivery_module`, start the event watcher, run `createNode` with the same `node.json`, and `start` once `rlnState` is `Ready`. The existing membership is picked up; nothing is registered or paid again.

## Troubleshooting RLN membership

### A string argument arrives as a number

`logosctl call` converts arguments that look numeric, which can catch a hex RLN identifier, a hash, or a payload. Write the value to a file with no trailing newline (`printf '%s'`) and pass it as `@/absolute/path`; the file's contents are passed verbatim as a string. A `str:<value>` prefix also forces a string.

### `createNode` fails with an unknown preset

Spell the preset exactly `logos.test`. `logostest` is rejected, not treated as an alias.

### `rlnState` stays `Disabled`

The installed `delivery_module` is older than 0.3.0, where `logos.test` has RLN turned off. Check the version with `$LOGOSCTL package ls` and upgrade with `$LOGOSCTL package install delivery_module -y`.

### `rlnState` reports `Failed`

The reply carries the reason. A common one is a hand-written `wallet_config.json`, or a `LEZ_RLN_SEQUENCER` variable, pointing at a sequencer that isn't the testnet one, so the registry can't be found on-chain. Start with an empty `wallet-home/` to let the module pick the sequencer.

### `wallet_status` stays `pending` with the network selected

The node can't reach the testnet sequencer. Check it from the same machine; this request should answer with a block number:

```bash
curl -sS -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"getLastBlockId","params":[],"id":1}' \
  http://209.38.241.182:3240/
```

### `wallet_status` stays `pending` with `no network selected`

Nothing has named a registry yet. Run `createNode` with the `logos.test` preset as in [Step 4](#step-4-create-the-delivery-node). If it persists, the installed RLN modules are too old; see [Step 3](#step-3-install-and-load-the-modules).

### The wallet never becomes ready, or opens in the wrong place

The wallet home variables were not set on the `daemon start` command; the modules only see the daemon's environment. Stop the daemon and start it again with them.

### Registry calls fail with `bound to network`

`wallet-home/` was used for another network before. A wallet home bound to one network refuses another. Use a fresh wallet home per network.

### `provisioning.step` stays at `awaiting_funding`

The node waits indefinitely for its payer balance. Check `get_native_balance` and complete the funding transfer.

### Registration fails with `Incorrect fee`

The payer holds less than the price plus the fee reserve (`182800000` at the minimum fee). Top it up to `250000000`.

### Registration never finishes and `daemon.log` contains `outside registry bounds`

The registry rejected the requested rate limit. The log line names the allowed range.

### `get_epoch_quota` returns `rate_limit: 0`

The node has no usable membership yet; the quota is not exhausted. Wait for `get_membership_state` to report `active`.

### `send` fails with `no_usable_membership`

Registration has not finished. Wait for `get_membership_state` to report `active`.

### Receivers drop the first message after registration

A newly published tree root takes up to one root window to reach other nodes. Later sends are unaffected.

### `daemon start` fails, or `daemon status` reports `not_running`

Read `session/daemon/startup.err` and `session/logs/daemon.log`.

### Every command fails with `no daemon`

The command isn't using the daemon's session. Check that `LOGOSCTL_CONFIG_DIR` and `TMPDIR` match the ones the daemon was started with; the daemon's local socket lives in `TMPDIR`. Don't run the daemon under a private `/tmp`, such as systemd's `PrivateTmp=yes`.

### `package install` does nothing and asks for confirmation

Without a terminal, `package install` refuses to proceed unless given `-y`.

### `package install` can't find `liblogos_rln_module`

The session's catalogue index is stale. Run `$LOGOSCTL catalog refresh`. `$LOGOSCTL catalog ls` lists the enabled catalogues; the official one, `logos-modules-official`, must be enabled.

### After a restart the membership reads `unknown` and sends fail

A module process from the previous daemon outlived `daemon stop` and still holds the node's ports and the RLN keystore. Stop the daemon, look for leftover processes started from the `logosctl` directory with `ps -ef | grep logosctl-`, end them, and start again.

### Known constraints

For Testnet v0.3, the RLN registry program is deployed to "LEZ classic", a separate zone from the usual LEZ testnet, running LEZ v0.2.5rc3. Its endpoints are:

| Service | Endpoint |
|:--------|:---------|
| Sequencer RPC | `http://209.38.241.182:3240/` |
| Explorer | `http://209.38.241.182:8288/` |
| Indexer RPC | `http://209.38.241.182:8979/` |
