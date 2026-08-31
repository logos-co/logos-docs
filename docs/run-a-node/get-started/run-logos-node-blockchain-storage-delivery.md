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

#### Get started running a full Logos node with all three core modules on testnet v0.2.1.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

This procedure covers installing and running a single [Logos node](../../get-started/glossary.md#logos-node) with `logoscore` hosting the `blockchain_module`, `storage_module`, and `delivery_module` from one shared modules directory. It is intended for node operators who want to join the testnet and contribute to the Logos network. The steps assume a Linux host.

The default paths used throughout this procedure are:

```text
/usr/local/bin/logoscore
/usr/local/bin/lgpd
/usr/local/bin/lgpm
/opt/logos-node/modules
/opt/logos-node/packages
/var/lib/logos-node
```

:::info[Prerequisites]

- Linux host with a public IPv4 address.
- Ports `3000/udp`, `8090/udp`, `8091/tcp`, `9000/udp`, and `30303/tcp` open on the host firewall.
- Root or `sudo` access to install tools and create system users.

Make sure your hardware meets the following requirements for running a blockchain node:
- CPU: 2 Cores, 2Ghz. Modern multi-core processor.
- Memory (RAM): Minimal (1 Gb).
- Storage: SSD with 100+ GB free with ability to expand storage on demand.
- Network: Relatively reliable network connection. 1Mbps of free bandwidth.

To run a Blend node, make sure you have:
- A stable and accessible external IP.
- A stable, low-latency connection (10 Mbps+ recommended) to handle multiple concurrent connections (recommended). This is beneficial for effective message blending and timing obfuscation.
:::

## What to expect

- You can run a full Logos node with all three modules active and publicly reachable on the testnet.
- You can verify each [module](../../get-started/glossary.md#module) is healthy by querying the daemon and checking live port bindings.
- You can configure the node for unattended operation using the systemd service pattern described in [here](#optional-run-the-node-unattended-with-systemd).

## Step 1: Install runtime tools

Install the system dependencies and download the three Logos CLI tools.

:::info
You can also install these tools by running:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-node-tools.sh | sh
   export PATH="$PWD/bin:$PATH"
   ```
:::

1. Install `curl`, `jq`, `wget`, and FUSE support for AppImage binaries:

   ```sh
   apt-get update
   apt-get install -y curl jq wget fuse3
   ```

1. Download the Linux release assets for `logoscore`, `lgpd`, and `lgpm`:

   | Tool | Repository |
   |------|------------|
   | `logoscore` | `https://github.com/logos-co/logos-logoscore-cli` |
   | `lgpd` | `https://github.com/logos-co/logos-package-downloader` |
   | `lgpm` | `https://github.com/logos-co/logos-package-manager` |

   For x86_64 Linux, download the pinned testnet tool versions:

   ```sh
   wget https://github.com/logos-co/logos-logoscore-cli/releases/download/0.2.2/logoscore-x86_64-linux.tar.gz
   wget https://github.com/logos-co/logos-package-downloader/releases/download/0.2.1/lgpd-x86_64-linux.tar.gz
   wget https://github.com/logos-co/logos-package-manager/releases/download/0.2.1/lgpm-x86_64-linux.tar.gz
   ```

1. Verify the runtime-tool archives against the SHA-256 digests recorded for the pinned GitHub release assets:

   ```sh
   sha256sum --check <<'EOF'
   6f216f4b807520194dd0e4d1a3d69bd2bc83f38781a5e7b2c1abf66e40143b33  logoscore-x86_64-linux.tar.gz
   2581f5bb6618623b9eb27b8bba37d39647b33c56d2f5bf15b41d0da286d45aee  lgpd-x86_64-linux.tar.gz
   41c897a6da6db0ecabe03c0098b9bd0652ea8cd2eaf091e2d646a65b71260780  lgpm-x86_64-linux.tar.gz
   EOF
   ```

1. Install the tools under `/usr/local/bin`:

   ```sh
   tar -xzf logoscore-x86_64-linux.tar.gz
   install -m755 logoscore-x86_64.AppImage /usr/local/bin/logoscore
   tar -xzf lgpd-x86_64-linux.tar.gz
   install -m755 lgpd-x86_64.AppImage /usr/local/bin/lgpd
   tar -xzf lgpm-x86_64-linux.tar.gz
   install -m755 lgpm-x86_64.AppImage /usr/local/bin/lgpm
   ```

1. Verify all three tools are accessible:

   ```sh
   logoscore --version
   lgpd --version
   lgpm --version
   ```

## Step 2: Prepare the host

Create the runtime user and the directory layout the node uses at runtime.

1. Create the `logos` system user and data directories:

   ```sh
   useradd --system --home /var/lib/logos-node --create-home --shell /usr/sbin/nologin logos
   mkdir -p /opt/logos-node/modules /opt/logos-node/packages
   mkdir -p /var/lib/logos-node/blockchain-module-testnet
   mkdir -p /var/lib/logos-node/storage-module
   mkdir -p /var/lib/logos-node/delivery-module
   chown -R logos:logos /var/lib/logos-node
   ```

1. Open these on the host firewall:

   ```text
   3000/udp
   8090/udp
   8091/tcp
   9000/udp
   30303/tcp
   ```

## Step 3: Install modules

Download and install the three module packages from the configured module [catalogue](../../get-started/glossary.md#catalogue).

:::info
`lgpd download` fetches the version published in the catalogue. It does not automatically pull the newest commit from module repositories. Ensure the intended versions are published in the catalogue before running these commands.
:::

1. Download the module packages. The root hash selects the exact published package identity for the pinned version:

   ```sh
   lgpd download blockchain_module --version 0.2.3 --output /opt/logos-node/packages
   lgpd download storage_module --version 2.1.2 --root-hash c9ad6299dd62be478dc89a589cb88ab5876bee11812ed3bcaf97ecadcac0b34e --output /opt/logos-node/packages
   lgpd download delivery_module --version 0.2.0 --root-hash eb47c06575a6113f34a6d71e5e0b72d6d2db2ec7510b8be0ab9633b8385edd57 --output /opt/logos-node/packages
   ```

1. Install all three packages into the shared modules directory:

   ```sh
   lgpm --modules-dir /opt/logos-node/modules install --file /opt/logos-node/packages/blockchain_module-0.2.3.lgx
   lgpm --modules-dir /opt/logos-node/modules install --file /opt/logos-node/packages/storage_module-2.1.0.lgx
   lgpm --modules-dir /opt/logos-node/modules install --file /opt/logos-node/packages/delivery_module-0.2.0.lgx
   ```

1. Verify the installed versions:

   ```sh
   jq -r '.name + " " + .version' /opt/logos-node/modules/*/manifest.json
   ```

   - The output must include:
   
   ```text
   blockchain_module 0.2.3
   delivery_module 0.2.0
   storage_module 2.1.0
   ```

## Step 4: Start Logos Core

Start the `logoscore` daemon with the shared modules directory before loading any modules.

1. As root, open a shell as the `logos` runtime user:

   ```sh
   runuser -u logos -- env HOME=/var/lib/logos-node bash
   ```

   - Run the daemon, module configuration, module calls, and health checks from this shell. This keeps the daemon and CLI client on the same `/var/lib/logos-node/.logoscore` state and ensures generated files belong to `logos`.

1. Start `logoscore` in the foreground for a first manual run:

   ```sh
   cd /var/lib/logos-node
   logoscore -D -m /opt/logos-node/modules
   ```

   - Keep this terminal open. Use a second terminal for all module commands.

1. Verify the daemon is running:

   ```sh
   logoscore status
   ```

## Step 5: Configure and start the blockchain module

Load the blockchain module, generate the node config, and start the module.

:::info
`user_config.yaml` contains node-local wallet and key-management configuration. Keep it private, restrict file permissions, and do not publish it. Generate a fresh file for each node.
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
   logoscore load-module blockchain_module
   cd /var/lib/logos-node/blockchain-module-testnet
   logoscore call blockchain_module generate_user_config "$(cat peers.json)"
   chmod 600 /var/lib/logos-node/user_config.yaml /var/lib/logos-node/keystore.yaml
   ```

   - `generate_user_config` writes `user_config.yaml` to the `logoscore` daemon working directory (`/var/lib/logos-node/user_config.yaml` with this guide's layout).
   - Important fields in `user_config.yaml` include:

   | Field | Purpose | Guidance |
   |-------|---------|----------|
   | `network.initial_peers` | Bootstrap peers | Use the current network document |
   | `network.port` | Public UDP P2P port | Keep aligned with firewall/NAT, normally `3000` |
   | `api.listen_address` | Local API bind | Keep private, normally `127.0.0.1:8080` |
   | `state.base_folder` | State directory | Use a persistent local path |
   | logger filters | Log verbosity | Use `INFO` for unattended operation |

1. Start the blockchain module:

   ```sh
   logoscore call blockchain_module start /var/lib/logos-node/user_config.yaml ""
   ```

   - The second argument is intentionally an empty string; the blockchain module no longer requires a downloaded `deployment.yaml` file.

1. Verify the module is running:

   ```sh
   logoscore call blockchain_module get_cryptarchia_info | jq -r .result.value | jq .
   ```

   - Your node will take about an hour to finish [bootstrapping](../../get-started/glossary.md#bootstrapping) and be in the `Online` state.

1. To participate in consensus, you must request tokens from the [public faucet site](https://testnet.blockchain.logos.co/web/faucet/) after your node reaches `Online` mode. First, find the keys associated with your node:

    ```sh
    grep -A3 known_keys user_config.yaml
    ```

1.  Choose any key from `known_keys`, enter it in **Destination Public Key (Hex)** on the faucet site, and press **Request Funds**.

1.  Wait 1 to 2 minutes, then check your balance. Replace `<your-chosen-key>` with the key you used:

    ```sh
    curl -s http://localhost:8080/wallet/<your-chosen-key>/balance | jq .
    ```

### Optional: Join the Blend Network

With a running [Logos Blockchain](../../get-started/glossary.md#logos-blockchain) node, it is possible - but not necessary - to participate in the [Blend Network](../../get-started/glossary.md#blend-network).

1. Request funds to both the `BlendZk` and `SdpFunding` keys from your `keystore.yaml` from the [testnet faucet](https://testnet.blockchain.logos.co/web/faucet/)

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

1. Wait until both keys have received funds. Check each balance with wallet_get_notes. You may need to repeat the faucet requests since only one drip is allowed per block:

   ```bash
   logoscore call blockchain_module wallet_get_notes <ADDRESS> "" | jq -r .result.value | jq .notes
   ```

1. Join the Blend Network by locking one of the notes held by your `BlendZk` key.

:::info
Make sure to open `<YOUR_BLEND_PORT>/udp` on the public host firewall before running the following command. `<YOUR_BLEND_PORT>` can be found in `user_config.yaml` under `blend.core.backend.listening_address`. Configure the firewall and NAT forwarding before joining and verify the local listener and public reachability after activation.
:::

   ```sh
   logoscore call blockchain_module blend_join_as_core_node \
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

Create the storage config and start the module.

1. Create the storage config:

   ```sh
   cd /var/lib/logos-node/storage-module
   mkdir -p storage-data
   cat > config.json <<EOF
   {
     "data-dir": "./storage-data",
     "log-level": "INFO",
     "listen-port": 8091,
     "disc-port": 8090,
     "network": "logos.test"
   }
   EOF
   ```

   - `config.json` includes the following fields:

   | Field | Purpose |
   |-------|---------|
   | `data-dir` | Storage repository path |
   | `log-level` | Log verbosity |
   | `listen-port` | Public TCP libp2p port |
   | `disc-port` | Public UDP discovery port |
   | `network` | Storage network preset |

   - Use fixed `listen-port` and `disc-port`; do not leave public nodes on random ports.
   - The `logos.test` preset provides the storage bootstrap settings.

   :::info
   To run storage with [mix](../../get-started/glossary.md#mix) support, generate the config from the published mix bootstrap data. You can use the script provided here. Copy its contents into a file (for example `storage-config.sh`):

   ```sh
   #!/usr/bin/env bash
   # Copy the contents of this file into a script named mix-config.sh
   set -euo pipefail

   if ! command -v jq &> /dev/null; then
     echo "Please install jq first"
     exit 1
   fi

   data_dir="${1:-./logos-storage-data}"

   raw_data=$(curl -s -fsSL https://fleets.logos.co/logos-test/storage-network.json)
   mp_json=$(echo $raw_data | jq -c '{
     "version": 1,
     "relays": map({
       "peerId": .peerId,
       "mixPubKey": .mixPubKey,
       "libp2pPubKey": .libp2pPubKey,
       "multiAddr": "/ip4/\(.address)/tcp/\(.port)"
     })
   } | tostring')

   dht_proxy_sprs=$(echo $raw_data | jq '[.[].tcpSpr]')

   cat <<EOF | jq .
   {
     "data-dir": "${data_dir}",
     "log-level": "INFO",
     "listen-port": 8091,
     "disc-port": 8090,
     "network": "logos.test",
     "mix-enabled": true,
     "dht-mix-proxy": ${dht_proxy_sprs},
     "mix-pool-json": ${mp_json}
   }
   EOF
   ```
   Then make it executable and run it:

   ```sh
   chmod +x storage-config.sh
   ./storage-config.sh > config.json
   ```

   The script accepts an optional storage data directory as its first argument. Without one, it uses `logos-storage-data` under the current directory.
   :::

1. Load and start the [storage module](../../get-started/glossary.md#storage-module):

   ```sh
   cd /var/lib/logos-node/storage-module
   logoscore load-module storage_module
   logoscore call storage_module init @config.json
   logoscore call storage_module start
   ```

   _If using the mix config_, also enable private queries and verify with a test download:

   ```sh
   logoscore call storage_module togglePrivateQueries true
   logoscore call storage_module downloadToUrl zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ ./farewell-to-westphalia.pdf false 65536
   ```

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
   | `kernelConf.tcpPort` | Public TCP P2P port |
   | `kernelConf.discv5UdpPort` | Public UDP discovery port |
   | `kernelConf.discv5Discovery` | Enable discv5 discovery |
   | `kernelConf.nat` | Public IP advertisement mode |

   - The kernel-only entry layer intentionally omits the messaging client and reliable channel manager.
   - Calls to `send`, `subscribe`, and `channel*` are unavailable, while `getNodeInfo`, `storeQuery`, and metrics remain available.
   - Use fixed `tcpPort` and `discv5UdpPort`; do not leave public nodes on random ports.
   - The `logos.test` preset provides the delivery network bootstrap settings.

1. Load and start the [delivery module](../../get-started/glossary.md#delivery-module):

   ```sh
   cd /var/lib/logos-node/delivery-module
   logoscore load-module delivery_module
   logoscore call delivery_module createNode @config.json
   logoscore call delivery_module start
   ```

1. Verify the delivery module is running:

   ```sh
   logoscore call delivery_module getAvailableNodeInfoIDs
   logoscore call delivery_module getNodeInfo Version
   logoscore call delivery_module getNodeInfo MyMultiaddresses
   ```

## Step 8: Verify the full node is healthy

Run health checks against the daemon and all three modules to confirm the node is fully operational.

1. Check the daemon and all loaded modules:

   ```sh
   logoscore status --json
   ```

   Expected modules in the output: `storage_module`, `blockchain_module`, `delivery_module`, `capability_module`.

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
   127.0.0.1:8080/tcp
   ```

1. Check the blockchain module sync state:

   ```sh
   logoscore call blockchain_module get_cryptarchia_info | jq -r .result.value | jq .
   ```

1. (Optional) Check the configured Blend UDP listener:

   ```sh
   ss -lun
   ```

   - Confirm that the local UDP port from `blend.core.backend.listening_address` is present. If the public Blend port differs, also confirm that NAT forwards `<YOUR_BLEND_PORT>/udp` to this local port.

1. Check the delivery module bound ports:

   ```sh
   logoscore call delivery_module getNodeInfo MyMultiaddresses
   ```

### Optional: Run the node unattended with systemd

Use a dedicated service for `logoscore` and a separate bootstrap script for module startup. Do not start modules from `ExecStartPost` in the `logoscore` service—slow or failing module starts may cause systemd to kill the daemon.

Daemon service unit:

```ini
[Unit]
Description=Logos Node
After=network-online.target
Wants=network-online.target

[Service]
User=logos
Group=logos
WorkingDirectory=/var/lib/logos-node
Environment=HOME=/var/lib/logos-node
ExecStart=/usr/local/bin/logoscore -m /opt/logos-node/modules -D
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

The bootstrap script should wait for `logoscore status`, load and start the blockchain module, load and start the storage module, and load and start the delivery module. It should tolerate already-loaded modules and slow module starts.

Recommended journald retention to cap disk usage:

```ini
[Journal]
SystemMaxUse=200M
SystemKeepFree=1G
MaxRetentionSec=7day
MaxFileSec=1day
```

Use the `INFO` log level for unattended operation; use `DEBUG` only for short troubleshooting windows.