---
title: Run a Logos delivery node
doc_type: procedure
product: messaging
topics: messaging
steps_layout: sectioned
authors: NagyZoltanPeter, kashepavadan
owner: logos
doc_version: 1
slug: run-logos-delivery-node
sidebar_position: 2
---

# Run a Logos delivery node

#### Use the Logos Delivery module to run a Logos delivery node

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

This procedure covers how to install and start a `logos-delivery-module` node connected to the Logos testnet (v0.2). It is intended for node operators who want to run their own Delivery node and join the network. Three installation paths are available—Docker, prebuilt binaries, and Nix—so you can choose the one that fits your environment.

Choose one of the three installation paths based on your environment:

| Path | Method | Best for |
|:-----|:-------|:---------|
| **A** | Docker with Compose | Quickest start; first build takes 30–45 min |
| **B** | Prebuilt binaries | No build, no clone required |
| **C** | Nix | From source; most reproducible |

:::info[Prerequisites]

- A supported OS:
   - Linux
   - macOS
- Network access so both node instances can reach each other.
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.2.3-rc.1) installed.
   - Install it by running `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh | sh`
- Some prerequisites differ between paths:
   - **Path A**: Docker with Compose
   - **Path B**: `curl` and a shell
   - **Path C**: **Nix** with flakes enabled.
      - Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

      ```bash
      mkdir -p ~/.config/nix
      echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
      ```

:::

## What to expect

- You can start a `delivery_module` node connected to the Logos Network.
- You can confirm the node is running and has a live network identity by querying its discv5 [ENR](../../get-started/glossary.md#enr).
- You can configure the node for a different network preset by swapping the config file passed to `createNode`.

## Step 1: Install and start the daemon

Follow the instructions for your chosen path.

**Path A—Docker**

1. Clone the repository and start the daemon container:

   ```bash
   git clone https://github.com/logos-co/logos-delivery-module.git
   cd logos-delivery-module
   docker compose up -d --build
   ```

   :::info
   The first Docker build runs Nix and downloads release packages. It can take 30–45 minutes; subsequent starts are fast.
   :::

**Path B—Prebuilt binaries**

1. Start `logosctl`:

   ```sh
   logosctl daemon start
   ```

1. In a new terminal window with the same user, refresh the official module catalogue:

   ```sh
   logosctl catalog refresh
   ```

1. Download and install the [delivery module](../../get-started/glossary.md#delivery-module):

   ```bash
   logosctl package install delivery_module \
   --version 0.2.1 \
   --yes
   ```

   :::note
   Individual module package versions (for example, delivery module version 0.2.1) are pinned independently and do not necessarily match the testnet version number (0.2.1).
   :::

1. Write the testnet config:

   ```bash
   cat > logos-test.json <<EOF
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

   - `logos-test.json` includes the following fields:

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

**Path C—Nix**

1. Clone the repository and build the [module](../../get-started/glossary.md#module):

   ```bash
   git clone https://github.com/logos-co/logos-delivery-module.git
   cd logos-delivery-module

   nix build '.#lgx' -o delivery-lgx
   ```

1. Start `logosctl`:

   ```sh
   logosctl daemon start
   ```

1. In a new terminal window with the same user, install the module:

   ```bash
   logosctl package install delivery-lgx/*.lgx
   ```

1. Write the testnet config:

   ```bash
   cat > logos-test.json <<EOF
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

## Step 3: Load the module and boot the node

Run these commands for your path.

1. Load the delivery module:

   ```bash
   # Path A (Docker)
   docker exec logos-node logoscore load-module delivery_module --json

   # Paths B and C
   logosctl module load delivery_module
   ```

1. Create the node with the testnet config:

   - Path A (config is mounted at `/conf` in the container):

     ```bash
     docker exec logos-node logoscore call delivery_module createNode @/conf/logos-test.json --json
     ```

   - Path B:

     ```bash
     logosctl call delivery_module createNode @logos-test.json
     ```
   
   - Path C:

     ```bash
     logosctl call delivery_module createNode @conf/logos-test.json
     ```

1. Start the node:

   ```bash
   # Path A
   docker exec logos-node logoscore call delivery_module start --json

   # Paths B and C
   logosctl call delivery_module start
   ```

## Step 3: Verify the node is running

Query the node's discv5 ENR to confirm it booted with a network identity and joined the Logos Testnet.

1. Verify the status of the node:

   ```bash
   # Path A
   docker exec logos-node logoscore status --json

   # Paths B and C
   logosctl daemon status
   ```

1. Run the [health query](https://github.com/logos-co/logos-delivery-module/blob/master/docs/pages/query-node.md):

   ```bash
   # Path A
   docker exec logos-node logoscore call delivery_module getNodeInfo MyENR --json | jq

   # Paths B and C
   logosctl call delivery_module getNodeInfo MyENR --json | jq
   ```

   Expected output:

   ```json
   {
     "method": "getNodeInfo",
     "module": "delivery_module",
     "result": {
       "error": null,
       "success": true,
       "value": "enr:-LW4QItc5tHj3rWoFaaQIUWvaBYijDf2TJKW83SNdyylJVAYVoUlBl1h5..."
     },
     "status": "ok"
   }
   ```

   - The `"value"` field is your node's live ENR and will differ from the example above.
   - `"success": true` and `"status": "ok"` confirm the delivery node is running.

1. Stop the node when finished:

   - Path A: `docker compose down`
   - Paths B and C: `logosctl daemon stop`

## Troubleshooting delivery node setup

### Why does the first `docker compose up` appear stuck?

The first build runs Nix and downloads release packages, which takes 30–45 minutes on a typical connection. The process is not hung—let it finish. Subsequent starts use the cached layers and complete in seconds.

### Why does `logosctl call` or `logoscore call` return an error after `module load`/`load-module`?

The daemon may not have finished starting. Wait a few seconds after `logosctl daemon start` returns and retry. For Path A, confirm the container is running with `docker ps` before calling `docker exec logos-node logoscore …`.
