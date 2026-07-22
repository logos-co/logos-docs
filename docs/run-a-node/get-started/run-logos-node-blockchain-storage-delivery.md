---
title: Run a Logos node with blockchain, storage, and delivery
doc_type: procedure
product: core
topics: [node, core]
steps_layout: sectioned
authors:
owner: logos
doc_version: 1
slug: run-logos-node-blockchain-storage-delivery
sidebar_position: 1
---

# Run a Logos node with blockchain, storage, and delivery

#### Get started running a full Logos node with all three core modules on testnet v0.2.

This procedure covers installing and running a single [Logos node](https://docs.logos.co/get-started/glossary#logos-node) with `logoscore` hosting the `blockchain_module`, `storage_module`, and `delivery_module` from one shared modules directory. It is intended for node operators who want to join the testnet and contribute to the Logos network. The steps assume a Linux host.

The default paths used throughout this procedure are:

```text
/usr/local/bin/logoscore
/usr/local/bin/lgpd
/usr/local/bin/lgpm
/opt/logos-node/modules
/opt/logos-node/packages
/var/lib/logos-node
```

Before you start, make sure you have the following:

- Linux host with a public IPv4 address
- Ports `3000/udp`, `8090/udp`, `8091/tcp`, `9000/udp`, and `30303/tcp` open on the host firewall
- Root or `sudo` access to install tools and create system users

## What to expect

- You can run a full Logos node with all three modules active and publicly reachable on the testnet.
- You can verify each [module](https://docs.logos.co/get-started/glossary#module) is healthy by querying the daemon and checking live port bindings.
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

   For x86_64 Linux, these are the current download URLs as of 2026-06-25:

   ```sh
   wget https://github.com/logos-co/logos-logoscore-cli/releases/download/v3/logoscore-x86_64-linux.AppImage
   wget https://github.com/logos-co/logos-package-downloader/releases/download/pre-release-99d70db-7/lgpd-x86_64-linux.tar.gz
   wget https://github.com/logos-co/logos-package-manager/releases/download/pre-release-05b2cf8-7/lgpm-x86_64-linux.tar.gz
   ```

1. Install the tools under `/usr/local/bin`:

   ```sh
   install -m755 logoscore-x86_64-linux.AppImage /usr/local/bin/logoscore
   tar -xzf lgpd-x86_64-linux.tar.gz
   install -m755 lgpd-x86_64.AppImage /usr/local/bin/lgpd
   tar -xzf lgpm-x86_64-linux.tar.gz
   install -m755 lgpm-x86_64.AppImage /usr/local/bin/lgpm
   ```

1. Verify all three tools are accessible:

   ```sh
   logoscore --help
   lgpd --help
   lgpm --help
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

Download and install the three module packages from the configured module [catalogue](https://docs.logos.co/get-started/glossary#catalogue).

:::info
`lgpd download` fetches the version published in the catalogue. It does not automatically pull the newest commit from module repositories. Ensure the intended versions are published in the catalogue before running these commands.
:::

1. Download the module packages:

   ```sh
   lgpd download blockchain_module --version 0.2.0 --output /opt/logos-node/packages
   lgpd download storage_module --output /opt/logos-node/packages
   lgpd download delivery_module --output /opt/logos-node/packages
   ```

1. Install all three packages into the shared modules directory:

   ```sh
   lgpm --modules-dir /opt/logos-node/modules install --file /opt/logos-node/packages/blockchain_module-0.2.0.lgx
   lgpm --modules-dir /opt/logos-node/modules install --file /opt/logos-node/packages/storage_module-*.lgx
   lgpm --modules-dir /opt/logos-node/modules install --file /opt/logos-node/packages/delivery_module-*.lgx
   ```

1. Verify the installed versions:

   ```sh
   jq -r '.name + " " + .version' /opt/logos-node/modules/*/manifest.json
   ```

## Step 4: Start Logos Core

Start the `logoscore` daemon with the shared modules directory before loading any modules.

1. Start `logoscore` in the foreground for a first manual run:

   ```sh
   cd /var/lib/logos-node
   logoscore -m /opt/logos-node/modules
   ```

   - Keep this terminal open. Use a second terminal for all module commands.
   - For a detached run, pass `-D` to start in daemon mode: `logoscore -m /opt/logos-node/modules -D`

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
   chmod 600 /var/lib/logos-node/user_config.yaml
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

## Step 6: Configure and start the storage module

Create the storage config and start the module. Replace `<public-ip>` with the node's public IPv4 address before running these commands.

1. Create the storage config:

   ```sh
   cd /var/lib/logos-node/storage-module
   mkdir -p storage-data
   cat > config.json <<EOF
   {
     "data-dir": "./storage-data",
     "log-level": "INFO",
     "listen-ip": "0.0.0.0",
     "listen-port": 8091,
     "disc-port": 8090,
     "nat": "extip:<public-ip>",
     "network": "logos.test"
   }
   EOF
   ```

   - `config.json` includes the following fields:

   | Field | Purpose |
   |-------|---------|
   | `data-dir` | Storage repository path |
   | `log-level` | Log verbosity |
   | `listen-ip` | Local TCP bind address |
   | `listen-port` | Public TCP libp2p port |
   | `disc-port` | Public UDP discovery port |
   | `nat` | Public IP advertisement mode |
   | `network` | Storage network preset |

   - Use fixed `listen-port` and `disc-port`; do not leave public nodes on random ports.
   - The `logos.test` preset provides the storage bootstrap settings.
   - Fields

   :::info
To run storage with [mix](https://docs.logos.co/get-started/glossary#mix) support, generate the config from the published mix bootstrap data:

     ```sh
     cd /var/lib/logos-node/storage-module
     cat > make-mix-storage-config.sh <<'EOF'
     #!/usr/bin/env bash
     set -e

     data_dir=${1:-"./logos-storage-data"}
     udp_spr_json=$(curl -s https://logos-storage-network.fra1.digitaloceanspaces.com/v0.2/udp-sprs.json)
     tcp_spr_json=$(curl -s https://logos-storage-network.fra1.digitaloceanspaces.com/v0.2/tcp-sprs.json)

     wget https://logos-storage-network.fra1.digitaloceanspaces.com/v0.2/mix-pool.json
     mp_path=$(realpath "./mix-pool.json")

     cat <<JSON
     {
       "nat": "any",
       "log-level": "DEBUG",
       "mix-enabled": true,
       "listen-port": 8080,
       "disc-port": 8090,
       "bootstrap-node": $udp_spr_json,
       "dht-mix-proxy": $tcp_spr_json,
       "data-dir": "${data_dir}",
       "mix-pool": "${mp_path}"
     }
     JSON
     EOF

     chmod 755 make-mix-storage-config.sh
     ./make-mix-storage-config.sh > config.json
     ```
:::

1. Load and start the [storage module](https://docs.logos.co/get-started/glossary#storage-module):

   ```sh
   cd /var/lib/logos-node/storage-module
   logoscore load-module storage_module
   logoscore call storage_module init @config.json
   logoscore call storage_module start
   ```

   - If using the mix config, also enable private queries and verify with a test download:

     ```sh
     logoscore call storage_module togglePrivateQueries true
     logoscore call storage_module downloadToUrl zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ ./farewell-to-westphalia.pdf false 65536
     ```

## Step 7: Configure and start the delivery module

Create the delivery config and start the module. Replace `<public-ip>` with the node's public IPv4 address before running these commands.

1. Create the delivery config:

   ```sh
   cd /var/lib/logos-node/delivery-module
   cat > config.json <<EOF
   {
     "preset": "logos.test",
     "mode": "Core",
     "logLevel": "INFO",
     "tcpPort": 30303,
     "discv5UdpPort": 9000,
     "discv5Discovery": true,
     "nat": "extip:<public-ip>"
   }
   EOF
   ```

   - `config.json` includes the following fields:

   | Field | Purpose |
   |-------|---------|
   | `preset` | Network preset |
   | `mode` | Delivery node mode |
   | `logLevel` | Log verbosity |
   | `tcpPort` | Public TCP P2P port |
   | `discv5UdpPort` | Public UDP discovery port |
   | `discv5Discovery` | Enable discv5 discovery |
   | `nat` | Public IP advertisement mode |

   - Use fixed `tcpPort` and `discv5UdpPort`; do not leave public nodes on random ports.
   - The `logos.test` preset provides the delivery network bootstrap settings.

1. Load and start the [delivery module](https://docs.logos.co/get-started/glossary#delivery-module):

   ```sh
   cd /var/lib/logos-node/delivery-module
   logoscore load-module delivery_module
   logoscore call delivery_module createNode @config.json
   logoscore call delivery_module start
   ```

1. Verify the delivery module is running:

   ```sh
   logoscore call delivery_module getNodeInfo Version
   logoscore call delivery_module getNodeInfo MyBoundPorts
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

1. Check the delivery module bound ports:

   ```sh
   logoscore call delivery_module getNodeInfo MyBoundPorts
   ```

### Optional: Run the node unattended with systemd

Use a dedicated service for `logoscore` and a separate bootstrap script for module startup. Do not start modules from `ExecStartPost` in the `logoscore` service — slow or failing module starts may cause systemd to kill the daemon.

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

The bootstrap script should wait for `logoscore status`, load and start the storage module, load and start the blockchain module, and load and start the delivery module. It should tolerate already-loaded modules and slow module starts.

Recommended journald retention to cap disk usage:

```ini
[Journal]
SystemMaxUse=200M
SystemKeepFree=1G
MaxRetentionSec=7day
MaxFileSec=1day
```

Use the `INFO` log level for unattended operation; use `DEBUG` only for short troubleshooting windows.