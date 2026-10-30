---
title: Run a Logos node with blockchain, storage, and delivery
doc_type: procedure
product: core
topics: [node, core]
steps_layout: sectioned
authors:
owner: logos
doc_version: 1
slug: /run-a-node
sidebar_position: 1
---

# Run a Logos node with blockchain, storage, and delivery

#### Get started running a full Logos node with all three core modules on testnet v0.3.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

:::note
This document describes how to run Blockchain, Storage, and Delivery nodes together via the CLI. To run these nodes separately (for example, just a Blockchain node or just a Storage node), see their respective tutorial pages:

- [Run a Blockchain node from the CLI](../../blockchain/get-started/run-blockchain-node-from-cli.md)
- [Run a Delivery node from the CLI](../../messaging/delivery/run-delivery-node-from-cli.md)
- [Run a Storage node from the CLI](../../storage/get-started/run-storage-node-from-cli.md)
:::

This procedure covers installing and running a single [Logos node](../../get-started/glossary.md#logos-node) via one `logosctl` session. `logosctl` starts and controls the node and manages the `blockchain_module`, `storage_module`, and `delivery_module` from within that session. It is intended for node operators who want to join the testnet and contribute to the Logos network. The steps assume a Linux host.

:::note
Individual module [package](../../get-started/glossary.md#package) versions are pinned independently and do not necessarily match the testnet version number.
:::

The default paths used throughout this procedure are:

```text
/usr/local/bin/logosctl
/var/lib/logos-node/.logosctl
/var/lib/logos-node
```

:::info[Prerequisites]

- Linux host with a public IPv4 address.
- Ports `3000/udp`, `8090/udp`, `8091/tcp`, `9000/udp`, `30303/tcp`, and `30303/udp` open on the host firewall.
- Root or `sudo` access to install tools and create system users.

Make sure your hardware meets the following requirements for running a blockchain node:
- CPU: 2 Cores, 2Ghz. Modern multi-core processor. **Must have ADX instruction support (on x86_64)**, such as Intel Broadwell or later, or any AMD Zen. Generic CPU models such as `kvm64` and `qemu64` hide ADX and cause the blockchain module to crash with `signal 4`.
   - Check whether your CPU has ADX support by running:

   ```sh
   # Linux
   grep -o adx /proc/cpuinfo | head -1

   # macOS
   sysctl -a | grep -i adx
   ```
- Memory (RAM): Minimal (1 Gb).
- Storage:
   - For joining the testnet or a short-lived node: SSD with 1-2 GB free.
   - Expected for a long-lived mainnet node: SSD with 100+ GB free with ability to expand storage on demand.
- Network: Relatively reliable network connection. 1Mbps of free bandwidth.

To run a Blend node, make sure you have:
- A stable and accessible external IP.
- A stable, low-latency connection (10 Mbps+ recommended) to handle multiple concurrent connections (recommended). This is beneficial for effective message blending and random delays.
:::

## What to expect

- You can run a full Logos node with all three modules active and publicly reachable on the testnet.
- You can verify each [module](../../get-started/glossary.md#module) is healthy by querying the daemon and checking live port bindings.
- You can configure the node for unattended operation using the systemd service pattern described [here](#optional-run-the-node-unattended-with-systemd).

## Step 1: Install `logosctl`

Install the system dependencies and download the `logosctl` CLI.

1. Install `curl`, `jq`, `tar`, and FUSE support for AppImage binaries:

   ```sh
   apt-get update
   apt-get install -y curl jq tar fuse3
   ```

1. Download the release archive for `logosctl` version 0.3.2. For x86_64 Linux, download:

   ```sh
   curl -fL \
   -o logosctl-x86_64-linux.tar.gz \
   https://github.com/logos-co/logos-logoscore-cli/releases/download/0.3.2/logosctl-x86_64-linux.tar.gz
   ```

   Verify the archive against the SHA-256 digest for the pinned GitHub release asset, then extract it:

   ```sh
   sha256sum --check <<'EOF'
   294fbcc6409a8851b7471582bdad2dbfaf681b5d1c67dfffec38ada925dc6762  logosctl-x86_64-linux.tar.gz
   EOF
   
   tar -xzf logosctl-x86_64-linux.tar.gz
   ```

1. Verify the extracted AppImage:

   ```sh
   sha256sum --check <<'EOF'
   dc2a7e67c7326dada2b9302fb15f9df2cacbe6de3b9db50502ad7831608ffd56  logosctl-x86_64.AppImage
   EOF
   ```

1. Install the tool under `/usr/local/bin` as `logosctl`:

   ```sh
   install -m755 logosctl-x86_64.AppImage /usr/local/bin/logosctl
   ```

1. Verify the tool is accessible:

   ```sh
   logosctl --version
   ```

## Step 2: Prepare the host

Create a new user that will run the Logos node, as well as the `logosctl` session directory and module data directories.

1. Create the `logos` system user and data directories:

   ```sh
   useradd --system --home /var/lib/logos-node --create-home --shell /usr/sbin/nologin logos
   mkdir -p /var/lib/logos-node/.logosctl
   mkdir -p /var/lib/logos-node/blockchain-module-testnet
   mkdir -p /var/lib/logos-node/storage-module
   mkdir -p /var/lib/logos-node/delivery-module
   chown -R logos:logos /var/lib/logos-node
   chmod 700 /var/lib/logos-node/.logosctl
   ```

1. Open these on the host firewall:

   ```text
   3000/udp
   8090/udp
   8091/tcp
   9000/udp
   30303/tcp
   30303/udp
   ```

   If the node is behind NAT, forward these ports to the node using the listed protocols.

## Step 3: Install modules

Download and install the three module packages from the configured module [catalogue](../../get-started/glossary.md#catalogue).

1. As root, open a shell as the `logos` user. Setting `HOME` selects the default `/var/lib/logos-node/.logosctl` session:

   ```sh
   runuser -u logos -- env HOME=/var/lib/logos-node bash
   ```

1. Initialise the session with the default daemon configuration:

   ```sh
   printf '{}\n' | logosctl daemon config set -
   ```

1. Temporarily start the Logos node in detached mode so its bundled package-management modules are available:

   ```sh
   logosctl daemon start --detach
   logosctl daemon status
   ```

   - The detached command returns after the Logos node is ready to accept commands.

1. Refresh the official module catalogue. Run this even if the daemon was already running, because it does not see packages published after it last refreshed:

   ```sh
   logosctl catalog refresh
   ```

1. Install the pinned module packages. The root hashes ensure you select the published package identity that exactly matches the pinned version:

   ```sh
   logosctl package install blockchain_module \
   --version 0.3.4 \
   --root-hash 911a849083727457c25df4c29b2f2efd7c5b2906cd8f45eaa7f0cd89178aa08e \
   --yes
   logosctl package install storage_module \
   --version 3.0.2 \
   --root-hash 810c39c610c0f37cc6e48e5fb115df69f72de4df7c052cdb1e17f53b7897cc97 \
   --yes
   logosctl package install delivery_module \
   --version 0.3.2 \
   --root-hash 824ccb2cd21b54f196dd3d32659df7f67e6df4298b1ab8cab60b48f704e2feac \
   --yes
   ```

   :::note
   Installing a package does not load it into the running Logos node. Packages must be loaded separately.
   :::

1. Check the installed core packages:

   ```sh
   logosctl package ls --type core
   ```

   - The output must list:

   ```text
   blockchain_module 0.3.4
   delivery_module 0.3.2
   storage_module 3.0.2
   ```

1. Stop the Logos node after installation:

   ```sh
   logosctl daemon stop
   ```

   - In the next section, you will restart the node for normal operation.

## Step 4: Start the Logos node

Start the `logosctl` daemon before loading any modules. Make sure to run the node controls, module configuration, module calls, and health checks from the `logos` user shell created in the previous section. This keeps the Logos node and `logosctl` client on the same `/var/lib/logos-node/.logosctl` session and ensures generated files belong to `logos`.

:::tip
If the window was closed, reopen it with:

```sh
runuser -u logos -- env HOME=/var/lib/logos-node bash
```
:::

1. Set the Logos node working directory:

   ```sh
   cd /var/lib/logos-node
   ```

1. For a manual foreground run, start the Logos node with:

   ```sh
   logosctl daemon start
   ```

   - Keep this terminal open. Use another `logos` user shell for all module commands.

   :::tip
   For unattended operation, use a [systemd service](#optional-run-the-node-unattended-with-systemd) rather than a manually started daemon.
   :::

1. Verify the daemon is running:

   ```sh
   logosctl daemon status
   ```

## Step 5: Configure and start the blockchain module

Load the blockchain module, generate the node config, and start the module.

:::warning
The blockchain module `0.3.1` release started a new blockchain with a new genesis, and `0.3.2` and `0.3.4` continue on it.

If your node last ran a release earlier than `0.3.1`, start it with an empty blockchain state directory. Balances and Blend declarations from the previous blockchain do not carry over. A node upgrading from `0.3.1` or `0.3.2` keeps its state.
:::

:::info[Upgrading from `0.3.2`]
Keep your existing `user_config.yaml` and `keystore.yaml`. On its first start, the `0.3.4` module rewrites a `0.3.2` `user_config.yaml` in the new format, keeps a copy of the original next to it as `user_config.yaml.0.3.2.bak`, and removes settings that only repeat the defaults. To upgrade, install the `0.3.4` package as in [Step 3](#step-3-install-modules), restart the daemon, load the module, and run the `start` command below. Do not run `generate_user_config` again.
:::

1. Create the peer bootstrap file:

   ```sh
   cd /var/lib/logos-node/blockchain-module-testnet
   cat > peers.json <<EOF
   {
     "initial_peers": [
       "/ip4/65.109.51.37/udp/3000/quic-v1/p2p/12D3KooWFrouXfmrR4nsLMtE7wu15DoMJ6VtoUtHinREZCvbWHar",
       "/ip4/65.109.51.37/udp/3001/quic-v1/p2p/12D3KooWJRGau8M1rjT7R5e4YYsgdFhsMX35nRDtMwCDjxQkXAHz",
       "/ip4/65.109.51.37/udp/3002/quic-v1/p2p/12D3KooWQXJavMDTRscjauFSgVAB1VLB6Rzpy2uY5SU9Tk7927tb",
       "/ip4/65.109.51.37/udp/50001/quic-v1/p2p/12D3KooWSQc7CcGtvWDPF1yCbBthFnQjprfCVHmfmNDUrSmqQsU1"
     ]
   }
   EOF
   ```

1. Load the module and generate `user_config.yaml`:

   ```sh
   logosctl module load blockchain_module
   cd /var/lib/logos-node/blockchain-module-testnet
   logosctl call blockchain_module generate_user_config @peers.json
   chmod 600 /var/lib/logos-node/user_config.yaml /var/lib/logos-node/keystore.yaml
   ```

   :::info
   `keystore.yaml` holds the node's secret keys, and the node reads it together with `user_config.yaml`. Keep both files private, restrict file permissions, and do not publish them. Generate fresh files for each node.
   :::

   - `generate_user_config` writes `user_config.yaml` and `keystore.yaml` to the Logos node's working directory (`/var/lib/logos-node/` with this guide's layout).
   - The generated `user_config.yaml` lists only the bootstrap peers. Every other setting uses its default value, so it does not appear in the file. To change a setting, add it to `user_config.yaml` under its full path and restart the blockchain module. For example, to change the P2P port:

   ```yaml
   network:
     backend:
       swarm:
         port: 3000
   ```

   - Settings you may want to change are listed below. For every setting and its default, see [Appendix: Full blockchain node configuration](#appendix-full-blockchain-node-configuration).

   | Field | Purpose | Default and guidance |
   |-------|---------|----------|
   | `network.backend.initial_peers` | Bootstrap peers | Generated from `peers.json`. Use the current network document |
   | `network.backend.swarm.port` | Public UDP P2P port | `3000`. Keep aligned with firewall/NAT |
   | `api.backend.listen_address` | Local API bind | `127.0.0.1:8080`. Keep private |
   | `state.base_folder` | State directory | `./state`, relative to the Logos node's working directory (`/var/lib/logos-node/state` with this guide's layout). Use a persistent local path |
   | `tracing.level` | Log verbosity | `INFO`. Use `INFO` for unattended operation |
   | `tracing.metrics.open_metrics.enabled` | Node metrics | `true`. See [expose the node's metrics](./expose-logos-node-metrics-to-prometheus.md) |
   | `blend.core.backend.listening_address` | Blend listener | `/ip4/0.0.0.0/udp/3400/quic-v1`. Only used once the node [joins the Blend Network](#optional-join-the-blend-network) |

   - The node writes hourly log files named `logos-blockchain.log.<date-hour>` to its working directory. `logos-blockchain.log.latest` links to the current one. A node upgraded from `0.3.2` keeps the log file prefix it used before, which `tracing.logger.file.prefix` in `user_config.yaml` shows.

1. Start the blockchain module:

   ```sh
   logosctl call blockchain_module start /var/lib/logos-node/user_config.yaml ""
   ```

   - The second argument is intentionally an empty string; the blockchain module no longer requires a downloaded `deployment.yaml` file.

1. Verify the module is running:

   ```sh
   logosctl call blockchain_module get_cryptarchia_info | jq -r .result.value | jq .
   ```

   - Your node will take about an hour to finish [bootstrapping](../../get-started/glossary.md#bootstrapping) and enter the `Online` state.
   - If no bootstrap peer answers when the node starts, the node stops itself, and `result.error` reads `The node is no longer running, most likely because one of its services panicked`. The node log shows `Initial Block Download failed: AllPeersFailed`. Check that outbound UDP traffic is allowed and that `peers.json` lists the current bootstrap peers, then restart the module:

   ```sh
   logosctl call blockchain_module stop
   logosctl call blockchain_module start /var/lib/logos-node/user_config.yaml ""
   ```

   - After a restart, the node first replays the blocks it already stored. The `start` call, and every `logosctl call blockchain_module` command until the replay ends, can return `RPC call failed`. The node still starts. The replay takes longer the more blocks the node has stored, from seconds on a new node to 10 minutes or more on a node that has synced the testnet. The node log reports `found <N> stored blocks to replay during chain recovery` when it begins.

   :::warning
   Do not call `pow_status` or `pow_claimable_rewards` before the node is `Online`. While the node is bootstrapping these calls never return, and every later `logosctl call blockchain_module` command fails with `RPC call failed` until you restart the daemon with `logosctl daemon stop`.
   :::

1. To participate in consensus, your node needs funds. Fund it by mining, as described in the next section.

### Fund the node by mining

By default, the node automatically claims its mining rewards to its `PoWClaim` key. Find this public key at `public_keys.PoWClaim` in `/var/lib/logos-node/keystore.yaml`.

1. The `pow` settings do not appear in the generated `user_config.yaml`. Without a `pow` section, the node uses these defaults, where `<your PoWClaim key>` is the key from `keystore.yaml`:

   ```yaml
   pow:
     mining:
       max_threads: 1
       max_tickets_per_block: 1
     auto_claim:
       targets:
       - public_key: <your PoWClaim key>
         threshold: 2000000000
       tick:
         unit: seconds
         value: 10
   ```

   - `max_threads` sets how many CPU threads mine. To mine faster, add `pow.mining.max_threads` to `user_config.yaml` with a higher value, or set it to `null` to use one thread per CPU core.
   - `threshold` is the balance, in tokens, that auto-claim pays the target up to. Once a target reaches its threshold, auto-claim stops paying it, and once every target has, auto-claim and mining both stop.
   - If you add `pow.auto_claim.targets` to `user_config.yaml`, it replaces the default list, so include your `PoWClaim` key in it.
   - If you edit the `pow` section, restart the blockchain module for the change to take effect.

1. After your node reaches `Online` mode, start mining:

   ```sh
   logosctl call blockchain_module pow_start_mining
   ```

   - Mining is turned off by default and does not persist across restarts. Run `pow_start_mining` again after every restart.
   - Auto-claim starts automatically. You do not need to call `pow_start_auto_claim`.

1. Check the mining and auto-claim status:

   ```sh
   logosctl call blockchain_module pow_status | jq -r .result.value | jq .
   ```

   - `is_mining` is `true`, and the `balance` of the auto-claim target grows as auto-claim collects rewards.

### Claim leader rewards

Once your mined funds have aged into the leadership lottery, which can take up to two [epochs](../../get-started/glossary.md#epoch), your node takes part in consensus automatically. Each block it proposes mints a leader-reward voucher. Vouchers are not credited automatically; claim them to turn them into spendable balance.

Run these commands only while the node is `Online`. The chain-leader service is not available while the node is still `Bootstrapping`.

1. Check which vouchers are claimable:

   ```sh
   logosctl call blockchain_module wallet_get_claimable_vouchers | jq -r .result.value | jq .
   ```

   - `vouchers` lists the vouchers your wallet can claim now. It is empty until your node has proposed a block, and again once every voucher has been claimed.
   - `tip` is the block the vouchers were checked at.

1. Claim a voucher:

   ```sh
   logosctl call blockchain_module leader_claim
   ```

   - On success, the call returns `success: true` with the claim transaction hash in `value`.
   - Each call claims one voucher. To claim several, call `leader_claim` once per listed voucher, pausing a few seconds between calls.
   - If there is nothing to claim, `result.error` reads `No claimable voucher found`. A voucher becomes claimable only once it is provable against the current tip, so this can happen shortly after your node proposes a block. Retry later.
   - If the reply has `"status": "error"` and no `result` object, the call never reached the chain-leader service, either because it timed out or because the service is not running yet. Confirm the node is `Online` with `get_cryptarchia_info` rather than retrying the claim.

### Optional: Join the Blend Network

With a running [Logos Blockchain](../../get-started/glossary.md#logos-blockchain) node, it is possible - but not necessary - to participate in the [Blend Network](../../get-started/glossary.md#blend-network).

1. Fund both the `BlendZk` and `SdpFunding` keys from your `keystore.yaml` by mining into your `PoWClaim` key, then transferring funds from it to each key, as described in [Join the Blend Network as a core node](../../blockchain/blend/join-the-blend-network-as-a-core-node.md).

   :::info
   The public keys and [note](../../get-started/glossary.md#note) IDs below are examples. Use the corresponding values from your own `keystore.yaml` and wallet responses when running these commands.
   :::

   ```bash
   # keystore.yaml
   public_keys:
      ...
   BlendZk: 13cccf99f90fd78c2134891ce3c1afce0605753a7694b9d56678d63a8d471820
      ...
   SdpFunding: 91d381a87e05d46fc9bc95246273b6930290506f0589ad039444decd3c24940e
      ...
   ```

1. Wait until both keys have received funds. Check each balance with `wallet_get_notes`:

   ```bash
   logosctl call blockchain_module wallet_get_notes <ADDRESS> "" | jq -r .result.value | jq .notes
   ```

1. Join the Blend Network by locking one of the notes held by your `BlendZk` key.

   :::info
   Make sure to open `<YOUR_BLEND_PORT>/udp` on the public host firewall before running the following command. `<YOUR_BLEND_PORT>` is `3400` unless you set `blend.core.backend.listening_address` in `user_config.yaml`. Configure the firewall and NAT forwarding before joining and verify the local listener and public reachability after activation.
   :::

   ```sh
   logosctl call blockchain_module blend_join_as_core_node \
      "/ip4/<YOUR_IP>/udp/<YOUR_BLEND_PORT>/quic-v1" \
      "<BLEND_ZK_NOTE_ID>"
   ```

   - `<YOUR_IP>`: Must be your external IP address
   - `<YOUR_BLEND_PORT>`: Your Blend port, `3400` by default, or the port in `blend.core.backend.listening_address` if you set it in `user_config.yaml`. Note that if you do port-mapping, the external mapped port must be used.
   - `<BLEND_ZK_NOTE_ID>`: The note ID of one of the notes held by your `BlendZk` key, as queried above.
   - The Blend core listener starts only after the node's declaration becomes active.

1. Verify the declaration was accepted on chain by polling `/mantle/sdp/declarations`, looking for your declaration

   ```
   curl http://127.0.0.1:8080/mantle/sdp/declarations | jq . 
   # > {
   # >   "<DECLARATION_ID>": {
   # >     "service_type": "BN",
   # >     "provider_id": "35d60d973560b8344f83dc266a3fe89e35a3dcf9959c492d0a7a0b7a85c5d2ce",
   # >     "locked_note_id": "<BLEND_ZK_NOTE_ID>",
   # >     "locators": [
   # >       "/ip4/<YOUR_IP>/udp/<YOUR_BLEND_PORT>/quic-v1"
   # >     ],
   # >     "zk_id": "13cccf99f90fd78c2134891ce3c1afce0605753a7694b9d56678d63a8d471820",
   # >     "created": 1,
   # >     "active": 3,
   # >     "withdraw_at": null,
   # >     "nonce": 0
   # >   }
   # > }
   ```

   - The response is a JSON object keyed by declaration id (not a list). Find your entry by its `provider_id` (your BlendSigning key) or `zk_id` (your BlendZk key).
   - `service_type: BN` identifies it as a [Blend node](../../get-started/glossary.md#blend-node) declaration.
   - `created` is the epoch your declaration was included; it takes effect about two [epochs](../../get-started/glossary.md#epoch) later. `active` is the most recent epoch your node has re-attested activity for (via the periodic Active message), so it advances over time—equal to `created + 2` right after activation and higher on a long-running node.

## Step 6: Configure and start the storage module

In `logosctl` 0.3.2, the package downloader starts Storage automatically using its saved configuration, or defaults on first use.

1. Check that the [Storage module](../../get-started/glossary.md#storage-module) is running:

   ```bash
   logosctl call storage_module isRunning
   ```

   Repeat this check until `result` is `true` before downloading. Startup can take a few minutes.

1. Try downloading the book [Farewell to Westphalia](https://logos.co/book):

   ```sh
   logosctl call storage_module downloadToUrl zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ\
      "$(pwd)/farewell-to-westphalia.pdf" false 65536 false false
   ```
   
   After a while - a few seconds, depending on your internet connection - the file should appear on your disk.

1. Logos Storage supports private downloads over the [Logos mix network](../../storage/concepts/mix.md). They are slow, but prevent others from learning that you are downloading a file. Try it out:

   ```sh
   # remove file from disk
   rm ./farewell-to-westphalia.pdf
   # remove file from node
   logosctl call storage_module remove zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ
   # download again, this time using mix
   logosctl call storage_module downloadToUrl zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ\
      "$(pwd)/farewell-to-westphalia.pdf" false 65536 true false
   ```

   In contrast to direct downloads, downloads over mix can take a few minutes. You should see the file streaming to your disk, though, and eventually the download should complete. 

   :::tip
   - Use **absolute paths** when feeding file paths to Logos Storage via the module API. Relative paths resolve relative to the daemon's working directory, which might be different from what you expect.
   - On a freshly started node, the first calls can return `"error":"Failed to start download."` while the mix relays connect. Wait about 10 seconds and run `downloadToUrl` again.
   :::

## Step 7: Configure and start the delivery module

Create the kernel-only delivery config for a node operator and start the module. Replace `<public-ip>` with the node's public IPv4 address before running these commands.

1. Create the delivery config:

   ```sh
   cd /var/lib/logos-node/delivery-module
   cat > config.json <<EOF
   {
      "entryLayer": "kernel",
      "kernelConf": {
         "preset": "logos.test",
         "relay": true,
         "logLevel": "INFO",
         "tcpPort": 30303,
         "discv5UdpPort": 9000,
         "discv5Discovery": true,
         "nat": "extip:<public-ip>"
      }
   }
   EOF
   ```

   - `config.json` includes the following fields:

   | Field | Purpose |
   |-------|---------|
   | `entryLayer` | Delivery stack layer; use `kernel` for a node-operator service |
   | `kernelConf` | Kernel node configuration |
   | `kernelConf.preset` | Network preset |
   | `kernelConf.relay` | Enable the [Relay](../../get-started/glossary.md#relay) protocol |
   | `kernelConf.logLevel` | Log verbosity |
   | `kernelConf.tcpPort` | Public TCP P2P port; QUIC uses the same port number over UDP by default |
   | `kernelConf.discv5UdpPort` | Public UDP discovery port |
   | `kernelConf.discv5Discovery` | Enable discv5 discovery |
   | `kernelConf.nat` | Public IP advertisement mode |

   - The kernel-only entry layer intentionally omits the messaging client and reliable channel manager.
   - Calls to `send`, `subscribe`, and `channel*` are unavailable, while `getNodeInfo`, `storeQuery`, and metrics remain available.
   - Use fixed `tcpPort` and `discv5UdpPort`; do not leave public nodes on random ports.
   - Delivery `0.3.0` enables QUIC by default. Open and, if needed, forward both TCP and UDP on `tcpPort` (`30303` here), plus UDP on `discv5UdpPort` (`9000`).
   - The `logos.test` preset provides the delivery network bootstrap settings.

1. Load and start the [delivery module](../../get-started/glossary.md#delivery-module):

   ```sh
   cd /var/lib/logos-node/delivery-module
   logosctl module load delivery_module
   logosctl call delivery_module createNode @config.json
   logosctl call delivery_module start
   ```

1. Verify the delivery module is running:

   ```sh
   logosctl call delivery_module getAvailableNodeInfoIDs
   logosctl call delivery_module getNodeInfo Version
   logosctl call delivery_module getNodeInfo MyMultiaddresses
   ```

## Step 8: Verify the full node is healthy

Run health checks against the Logos node and all three loaded modules to confirm the node is fully operational.

1. Check the daemon and all loaded modules:

   ```sh
   logosctl daemon status --json | jq .
   logosctl module ls --loaded
   ```

   Expected modules in the output: `blockchain_module`, `capability_module`, `delivery_module`, `liblogos_lez_rln_module`, `liblogos_rln_module`, `libp2p_module`, `modules_state`, `package_downloader`, `package_manager`, `storage_module`.

1. Verify all ports are bound correctly:

   ```sh
   ss -lntup | egrep '(:3000|:8090|:8091|:9000|:30303|:8080)'
   ```

   Expected bindings:

   ```text
   0.0.0.0:3000/udp
   0.0.0.0:8090/udp
   0.0.0.0:8091/tcp
   0.0.0.0:9000/udp
   0.0.0.0:30303/tcp
   0.0.0.0:30303/udp
   127.0.0.1:8080/tcp
   ```

1. Check the blockchain module sync state:

   ```sh
   logosctl call blockchain_module get_cryptarchia_info | jq -r .result.value | jq .
   ```

1. (Optional) Check the configured Blend UDP listener:

   ```sh
   ss -lun
   ```

   - Confirm that the local Blend UDP port (`3400` unless you set `blend.core.backend.listening_address`) is present. If the public Blend port differs, also confirm that NAT forwards `<YOUR_BLEND_PORT>/udp` to this local port.

1. Check the delivery module bound ports:

   ```sh
   logosctl call delivery_module getNodeInfo MyBoundPorts
   ```

1. (Optional) To monitor the node continuously, [expose its metrics to Prometheus](./expose-logos-node-metrics-to-prometheus.md).

### Optional: Run the node unattended with systemd

Use a dedicated service for the Logos node process (started and controlled by `logosctl`) and a separate bootstrap script for module startup. Do not start modules from `ExecStartPost` in `logos-node.service`—slow or failing module starts may cause systemd to kill the daemon.

Create `/etc/systemd/system/logos-node.service`:

```ini
[Unit]
Description=Logos node managed by logosctl
After=network-online.target
Wants=network-online.target

[Service]
User=logos
Group=logos
WorkingDirectory=/var/lib/logos-node
Environment=HOME=/var/lib/logos-node
Environment=LOGOSCTL_CONFIG_DIR=/var/lib/logos-node/.logosctl
ExecStart=/usr/local/bin/logosctl daemon start
ExecStop=/usr/local/bin/logosctl daemon stop
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
```

The separate bootstrap script should wait for `logosctl daemon status`, load and start the blockchain module, load and start the storage module, and load and start the delivery module. It should tolerate already-loaded modules and slow module starts.

Recommended journald retention to cap disk usage:

```ini
[Journal]
SystemMaxUse=200M
SystemKeepFree=1G
MaxRetentionSec=7day
MaxFileSec=1day
```

Use the `INFO` log level for unattended operation; use `DEBUG` only for short troubleshooting windows.

## Appendix: Full blockchain node configuration

This is the complete configuration that a `user_config.yaml` from `generate_user_config` produces in `blockchain_module` `0.3.4`. It shows every default and the values the node reads from `keystore.yaml`. Use it to look up the full path and default value of a setting. Do not copy it into `user_config.yaml`; add only the settings you change.

- `<secret>` marks values the node reads from `keystore.yaml` and that are hidden here.
- `<LeaderFunding>`, `<PoWClaim>`, and the other names in angle brackets stand for the key IDs listed under `public_keys` in your `keystore.yaml`.
- `logosctl` cannot print this yet. It was rendered with the standalone node binary from the [`0.3.4` release](https://github.com/logos-blockchain/logos-blockchain/releases/tag/0.3.4), which loads a configuration the same way the module does:

  ```sh
  logos-blockchain-node /var/lib/logos-node/user_config.yaml --show-config
  ```

```yaml
network:
  backend:
    swarm:
      host: 0.0.0.0
      port: 3000
      node_key: <secret>
      gossipsub:
        history_length: 5
        history_gossip: 3
        mesh_n: 6
        mesh_n_low: 5
        mesh_n_high: 12
        retain_scores: 4
        gossip_lazy: 6
        gossip_factor: 0.25
        heartbeat_initial_delay: 5s
        heartbeat_interval: 1s
        fanout_ttl: 1m
        check_explicit_peers_ticks: 300
        duplicate_cache_time: 1day
        validate_messages: false
        allow_self_origin: false
        do_px: false
        prune_peers: 0
        prune_backoff: 1m
        unsubscribe_backoff: 10s
        backoff_slack: 1
        flood_publish: true
        graft_flood_threshold: 10s
        mesh_outbound_min: 2
        opportunistic_graft_ticks: 60
        opportunistic_graft_peers: 2
        gossip_retransimission: 3
        max_messages_per_rpc: null
        max_ihave_length: 5000
        max_ihave_messages: 10
        iwant_followup_time: 3s
        published_message_ids_cache_time: 10s
      kademlia:
        query_timeout: null
        replication_factor: null
        parallelism: null
        disjoint_query_paths: null
        max_packet_size: null
        kbucket_inserts: null
        cache_size: 1
        periodic_bootstrap_interval: null
      identify:
        agent_version: null
        interval: null
        push_listen_addr_updates: null
        cache_size: null
        hide_listen_addrs: true
      chain_sync:
        peer_response_timeout: 5s
        max_inbound_requests: 10
        inbound_download_stream_timeout: 2m
      nat:
        type: traversal
        autonat:
          max_candidates: null
          probe_interval: null
          retest_successful_external_addresses_interval: 1m
        mapping:
          timeout: 1s
          lease_duration: 2h
          max_retries: 3
          renewal_delay_fraction: 0.8
          retry_interval: 30s
        gateway_monitor:
          check_interval: 5m
    initial_peers:
    - /ip4/65.109.51.37/udp/3000/quic-v1/p2p/12D3KooWFrouXfmrR4nsLMtE7wu15DoMJ6VtoUtHinREZCvbWHar
    - /ip4/65.109.51.37/udp/3001/quic-v1/p2p/12D3KooWJRGau8M1rjT7R5e4YYsgdFhsMX35nRDtMwCDjxQkXAHz
    - /ip4/65.109.51.37/udp/3002/quic-v1/p2p/12D3KooWQXJavMDTRscjauFSgVAB1VLB6Rzpy2uY5SU9Tk7927tb
    - /ip4/65.109.51.37/udp/50001/quic-v1/p2p/12D3KooWSQc7CcGtvWDPF1yCbBthFnQjprfCVHmfmNDUrSmqQsU1
blend:
  non_ephemeral_signing_key_id: <BlendSigning>
  core:
    backend:
      listening_address: /ip4/0.0.0.0/udp/3400/quic-v1
      max_dial_attempts_per_peer: 3
      peering_degree_check_interval: 1m
    zk:
      secret_key_kms_id: <BlendZk>
  edge:
    backend:
      max_dial_attempts_per_peer_per_message: 1
      replication_factor: 1
  abstain_on_failure: false
cryptarchia:
  service:
    bootstrap:
      prolonged_bootstrap_period: 1h
      force_bootstrap: false
      offline_grace_period:
        grace_period: 20m
        state_recording_interval: 1m
    sync:
      block_provider:
        batch_size: 1000
  network:
    bootstrap:
      ibd:
        peers:
        - 12D3KooWFrouXfmrR4nsLMtE7wu15DoMJ6VtoUtHinREZCvbWHar
        - 12D3KooWQXJavMDTRscjauFSgVAB1VLB6Rzpy2uY5SU9Tk7927tb
        - 12D3KooWJRGau8M1rjT7R5e4YYsgdFhsMX35nRDtMwCDjxQkXAHz
        - 12D3KooWSQc7CcGtvWDPF1yCbBthFnQjprfCVHmfmNDUrSmqQsU1
        delay_before_new_download: 10s
        tips_fetch_max_attempts: 3
        tips_fetch_min_delay: 250ms
        tips_fetch_max_delay: 1s
        round_delay: 1s
    sync:
      orphan:
        max_orphan_cache_size: 1000
        max_rejected_cache_size: 1000
      tip_poll:
        enabled: true
        lag_threshold_blocks: 3
        max_peers_to_sample: 5
    network:
      max_connected_peers_to_try_download: 16
      max_discovered_peers_to_try_download: 16
    seen_items_subscription_channel_size: 64
  leader:
    wallet:
      max_tx_fee: 18446744073709551615
      funding_pk: <LeaderFunding>
time:
  backend:
    server: pool.ntp.org:123
    client:
      timeout: 5s
      listening_interface: 0.0.0.0
    update_interval: 15s
sdp:
  declaration: null
  wallet:
    max_tx_fee: 18446744073709551615
    funding_pk: <SdpFunding>
  active_message_tracker:
    status_check_interval_in_tip_changes: 3
api:
  backend:
    listen_address: 127.0.0.1:8080
    cors_origins: []
    timeout: 30s
    max_body_size: 10485760
    max_concurrent_requests: 500
storage:
  backend:
    folder_name: ./db
    read_only: false
    column_family: blocks
kms:
  keystore: keystore.yaml
  backend:
    keys: <secret>
mempool:
  tx_ttl: 9h
  seen_items_subscription_channel_size: 64
  pow_claim_grace_slots: 0
wallet:
  known_keys:
    <LeaderFunding>: <LeaderFunding>
    <BlendZk>: <BlendZk>
    <Stake>: <Stake>
    <VaucherMaster>: <VaucherMaster>
    <PoWClaim>: <PoWClaim>
    <SdpFunding>: <SdpFunding>
  voucher_master_key_id: <VaucherMaster>
  pending_note_expiry_blocks: 10
pow:
  mining:
    max_threads: 1
    max_tickets_per_block: 1
  auto_claim:
    targets:
    - public_key: <PoWClaim>
      threshold: 2000000000
    tick:
      unit: seconds
      value: 10
tracing:
  logger:
    file:
      directory: .
      prefix: null
      appender_type: !Rolling
        rotation: Hourly
        retention: !MaxFiles
          max_files: 10
        compression: None
    loki: null
    gelf: null
    otlp: null
    format: !Text Ansi
    stdout: true
    stderr: false
  tracing: None
  filter: !Env
    filters:
      opentelemetry: WARN
      rustls: WARN
      hyper_util: WARN
      libp2p_gossipsub: ERROR
      tonic: WARN
      hyper: WARN
      opentelemetry_sdk: WARN
      reqwest: WARN
      logos_blockchain: INFO
      h2: WARN
      '*': WARN
      tower: WARN
  metrics:
    otlp: null
    open_metrics:
      enabled: true
  console: None
  level: INFO
state:
  base_folder: ./state
```
