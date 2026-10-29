---
title: Run a Delivery node from the CLI
doc_type: procedure
product: messaging
topics: messaging
steps_layout: sectioned
authors: NagyZoltanPeter, kashepavadan
owner: logos
doc_version: 1
slug: run-delivery-node-from-cli
sidebar_position: 2
---

# Run a Delivery node from the CLI

#### Use the Delivery module to run a Logos Delivery node on the CLI

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

This procedure covers how to install and start a `logos-delivery-module` node connected to the Logos testnet (v0.3). It is intended for node operators who want to run their own Delivery node and join the network.

:::info[Prerequisites]

- A supported OS:
   - Linux
   - macOS
- Network access so both node instances can reach each other.
- Inbound ports open:
   - TCP `30303`: P2P (`tcpPort`).
   - UDP `30303`: P2P over QUIC, on by default at the `tcpPort` number.
   - UDP `9000`: discv5 discovery (`discv5UdpPort`).
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.3.2) installed.
   - Install it by running `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh | sudo sh`
- `curl` and a shell
:::

## What to expect

- You can start a `delivery_module` node connected to the Logos Network.
- You can confirm the node is running and has a live network identity by querying its discv5 [ENR](../../get-started/glossary.md#enr).
- You can configure the node for a different network preset by swapping the config file passed to `createNode`.

## Step 1: Install and start the daemon

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
   --version 0.3.0 \
   --yes
   ```

   :::note
   Individual module [package](../../get-started/glossary.md#package) versions (for example, delivery module version 0.3.0) are pinned independently and do not necessarily match the testnet version number (0.3.0).
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

## Step 2: Load the module and boot the node

Run these commands for your path.

1. Load the delivery module:

   ```bash
   logosctl module load delivery_module
   ```

1. Create the node with the testnet config:

   ```bash
   logosctl call delivery_module createNode @logos-test.json
   ```

1. Start the node:

   ```bash
   logosctl call delivery_module start
   ```

## Step 3: Verify the node is running

Query the node's discv5 ENR to confirm it booted with a network identity and joined the Logos Testnet.

1. Verify the status of the node:

   ```bash
   logosctl daemon status
   ```

1. Run the [health query](https://github.com/logos-co/logos-delivery-module/blob/master/docs/pages/query-node.md):

   ```bash
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

   ```bash
   logosctl daemon stop
   ```

## Troubleshooting delivery node setup

### Why does `logosctl call` return an error after `module load`?

The daemon may not have finished starting. Wait a few seconds after `logosctl daemon start` returns and retry. For Path A, confirm the container is running with `docker ps` before calling `docker exec logos-node logosctl …`.
