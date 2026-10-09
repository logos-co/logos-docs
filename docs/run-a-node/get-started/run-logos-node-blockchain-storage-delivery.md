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

This procedure covers installing and running a single [Logos node](../../get-started/glossary.md#logos-node) via one `logosctl` session. `logosctl` starts and controls the node and manages the `blockchain_module`, `storage_module`, and `delivery_module` from within that session. It is intended for node operators who want to join the testnet and contribute to the Logos network. The steps assume a Linux host.

:::note
Individual module package versions are pinned independently and do not necessarily match the testnet version number.
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
- A stable, low-latency connection (10 Mbps+ recommended) to handle multiple concurrent connections (recommended). This is beneficial for effective message blending and timing obfuscation.
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

1. Refresh the official module catalogue:

   ```sh
   logosctl catalog refresh
   ```

1. Install the pinned module packages. The root hashes ensure you select the published package identity that exactly matches the pinned version:

   ```sh
   logosctl package install blockchain_module \
   --version 0.3.1 \
   --root-hash cfe0b7893b7fa46736b27203bf6ffb177f18601c09a899f47665a6c17bd9c6d0 \
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
   blockchain_module 0.3.1
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
The blockchain module `0.3.1` release starts a new blockchain with a new genesis.

Blockchain nodes must start with an empty blockchain state directory. Balances and Blend declarations from the previous blockchain do not carry over.
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
   `user_config.yaml` contains node-local wallet and key-management configuration. Keep it private, restrict file permissions, and do not publish it. Generate a fresh file for each node.
   :::

   - `generate_user_config` writes `user_config.yaml` to the Logos node's working directory (`/var/lib/logos-node/user_config.yaml` with this guide's layout).
   - Important fields in `user_config.yaml` include:

   | Field | Purpose | Guidance |
   |-------|---------|----------|
   | `network.backend.initial_peers` | Bootstrap peers | Use the current network document |
   | `network.backend.swarm.port` | Public UDP P2P port | Keep aligned with firewall/NAT, normally `3000` |
   | `api.backend.listen_address` | Local API bind | Keep private, normally `127.0.0.1:8080`. Edit the file if you want to change the port |
   | `state.base_folder` | State directory | Use a persistent local path |
   | logger filters | Log verbosity | Use `INFO` for unattended operation |

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

   :::warning
   Do not call `pow_status` before the node is `Online`. In blockchain module `0.3.0` the call never returns, and every later `logosctl call blockchain_module` command fails with `RPC call failed` until you restart the daemon with `logosctl daemon stop`.
   :::

1. To participate in consensus, your node needs funds. Fund it by mining, as described in the next section.

### Fund the node by mining

The generated `user_config.yaml` includes a `pow` section that deals with automatically claiming mining rewards to the node's `PoWClaim` key. Find this public key at `pow.auto_claim.targets[].public_key` in `/var/lib/logos-node/user_config.yaml`.
Keep the generated value; `<your PoWClaim key>` below is only a placeholder.

1. Leave the `pow` section as generated. If desired, you can optionally limit the number of mining threads by editing `pow.mining.max_threads`, which uses one thread per CPU core by default (with the `null` value). Edit `pow.mining.max_threads` in `/var/lib/logos-node/user_config.yaml`:

   ```yaml
   pow:
     mining:
       max_threads: 2
       max_tickets_per_block: 4
     auto_claim:
       targets:
       - public_key: <your PoWClaim key>
         threshold: 18446744073709551615
       tick:
         unit: seconds
         value: 10
   ```

   - Leave the rest of the `pow` section as generated. `auto_claim.targets` is already filled with your node's `PoWClaim` key.
   - Restart the blockchain module for the change to take effect.

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

### Optional: Join the Blend Network

With a running [Logos Blockchain](../../get-started/glossary.md#logos-blockchain) node, it is possible - but not necessary - to participate in the [Blend Network](../../get-started/glossary.md#blend-network).

1. Fund both the `BlendZk` and `SdpFunding` keys from your `keystore.yaml` by mining, then claim the rewards into each key, as described in [Join the Blend Network as a core node](../../blockchain/blend/join-the-blend-network-as-a-core-node.md).

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
   Make sure to open `<YOUR_BLEND_PORT>/udp` on the public host firewall before running the following command. `<YOUR_BLEND_PORT>` can be found in `user_config.yaml` under `blend.core.backend.listening_address`. Configure the firewall and NAT forwarding before joining and verify the local listener and public reachability after activation.
   :::

   ```sh
   logosctl call blockchain_module blend_join_as_core_node \
      "/ip4/<YOUR_IP>/udp/<YOUR_BLEND_PORT>/quic-v1" \
      "<BLEND_ZK_NOTE_ID>"
   ```

   - `<YOUR_IP>`: Must be your external IP address
   - `<YOUR_BLEND_PORT>`: Your configured Blend port from the `user_config.yaml` file (`blend.core.backend.listening_address`). Note that if you do port-mapping, the external mapped port must be used.
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

   Expected modules in the output: `blockchain_module`, `capability_module`, `delivery_module`, `package_downloader`, `package_manager`, `storage_module`.

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

   - Confirm that the local UDP port from `blend.core.backend.listening_address` is present. If the public Blend port differs, also confirm that NAT forwards `<YOUR_BLEND_PORT>/udp` to this local port.

1. Check the delivery module bound ports:

   ```sh
   logosctl call delivery_module getNodeInfo MyBoundPorts
   ```

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
