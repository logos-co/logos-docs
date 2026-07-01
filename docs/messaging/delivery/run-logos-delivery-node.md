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
---

# Run a Logos delivery node

#### Use the Logos Delivery module to run a Logos delivery node

This procedure covers how to install and start a `logos-delivery-module` node connected to the Logos testnet (v0.2). It is intended for node operators who want to run their own Delivery node and join the network. Three installation paths are available — Docker, prebuilt binaries, and Nix — so you can choose the one that fits your environment.

Choose one of the three installation paths based on your environment:

| Path | Method | Best for |
|:-----|:-------|:---------|
| **A** | Docker with Compose | Quickest start; first build takes 30–45 min |
| **B** | Prebuilt binaries | No build, no clone required |
| **C** | Nix | From source; most reproducible |

Before you start, make sure you have the following:

- Linux or macOS
- Network access so both node instances can reach each other
- `jq` installed (required for the verify step)
- Per path: **A** — Docker with Compose; **B** — `curl` and a shell; **C** — [Nix with flakes enabled](https://nixos.org/download)

## What to expect

- You can start a `delivery_module` node connected to the Logos Network.
- You can confirm the node is running and has a live network identity by querying its discv5 ENR.
- You can configure the node for a different network preset by swapping the config file passed to `createNode`.

## Step 1: Install and start the daemon

Follow the instructions for your chosen path.

**Path A — Docker**

1. Clone the repository and start the daemon container:

   ```bash
   git clone https://github.com/logos-co/logos-delivery-module.git
   cd logos-delivery-module
   docker compose up -d --build
   ```

   {% hint style="info" %}
   The first Docker build runs Nix and downloads release packages. It can take 30–45 minutes; subsequent starts are fast.
   {% endhint %}

**Path B — Prebuilt binaries**

1. Install `logoscore`, `lgpd`, and `lgpm` into `./bin`:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-node-tools.sh | sh
   export PATH="$PWD/bin:$PATH"
   ```

1. Download and install the delivery module:

   ```bash
   mkdir -p packages modules
   lgpd download delivery_module --output ./packages
   lgpm install --dir ./packages --modules-dir ./modules
   ```

1. Write the testnet config and start the daemon:

   ```bash
   cat > logos-test.json <<EOF
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

   logoscore -D -m ./modules > logs.txt
   ```

**Path C — Nix**

1. Clone the repository and build the runtime, package manager, and module:

   ```bash
   git clone https://github.com/logos-co/logos-delivery-module.git
   cd logos-delivery-module

   nix build 'github:logos-co/logos-logoscore-cli' --out-link ./logos
   nix build 'github:logos-co/logos-package-manager#cli' -o lgpm
   nix build '.#lgx' -o delivery-lgx
   ```

1. Seed the modules directory and install the module:

   ```bash
   mkdir -p modules
   cp -RL ./logos/modules/. ./modules/
   ./lgpm/bin/lgpm --modules-dir ./modules --allow-unsigned install --file delivery-lgx/*.lgx
   ```

1. Start the daemon:

   ```bash
   export PATH="$PWD/logos/bin:$PATH"
   logoscore -D -m ./modules > logs.txt
   ```

## Step 2: Load the module and boot the node

Run these commands for your path.

1. Load the delivery module:

   ```bash
   # Path A (Docker)
   docker exec logos-node logoscore load-module delivery_module --json

   # Paths B and C
   logoscore load-module delivery_module
   ```

1. Create the node with the testnet config:

   - Path A (config is mounted at `/conf` in the container):

     ```bash
     docker exec logos-node logoscore call delivery_module createNode @/conf/logos-test.json --json
     ```

   - Path B:

     ```bash
     logoscore call delivery_module createNode @logos-test.json
     ```
   
   - Path C:

     ```bash
     logoscore call delivery_module createNode @conf/logos-test.json
     ```

1. Start the node:

   ```bash
   # Path A
   docker exec logos-node logoscore call delivery_module start --json

   # Paths B and C
   logoscore call delivery_module start
   ```

## Step 3: Verify the node is running

Query the node's discv5 ENR to confirm it booted with a network identity and joined the Logos Testnet.

1. Verify the status of the node:

   ```bash
   # Path A
   docker exec logos-node logoscore status --json

   # Paths B and C
   logoscore status
   ```

1. Run the [health query](https://github.com/logos-co/logos-delivery-module/blob/master/docs/query-node.md):

   ```bash
   # Path A
   docker exec logos-node logoscore call delivery_module getNodeInfo MyENR --json | jq

   # Paths B and C
   logoscore call delivery_module getNodeInfo MyENR --json | jq
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
   - Paths B and C: `logoscore stop`

## Troubleshooting delivery node setup

### Why does the first `docker compose up` appear stuck?

The first build runs Nix and downloads release packages, which takes 30–45 minutes on a typical connection. The process is not hung — let it finish. Subsequent starts use the cached layers and complete in seconds.

### Why does `logoscore call` return an error after `load-module`?

The daemon may not have finished starting. Wait a few seconds after `logoscore -D` returns and retry. For Path A, confirm the container is running with `docker ps` before calling `docker exec logos-node logoscore …`.
