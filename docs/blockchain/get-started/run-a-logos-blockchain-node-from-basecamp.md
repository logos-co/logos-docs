---
title: Run a Logos Blockchain node from Basecamp
doc_type: procedure
product: blockchain
topics: blockchain
steps_layout: sectioned
authors: xalisher
owner: logos
doc_version: 1
slug: run-a-logos-blockchain-node-from-basecamp
sidebar_position: 3
---

# Run a Logos Blockchain node from Basecamp

#### Install the blockchain modules and run a syncing testnet node from the Basecamp desktop app.

The [Logos Blockchain](https://docs.logos.co/get-started/glossary#logos-blockchain) is the blockchain [module](https://docs.logos.co/get-started/glossary#module) of the Logos technology stack. You can run a node [from the CLI](./run-a-logos-blockchain-node-from-cli.md), from a [standalone application](../node-app/build-and-run-logos-blockchain-node-app-ui.md), or — as described here — from **Basecamp**, the modular Logos desktop app, by installing the blockchain module and its UI.

This procedure covers Linux, Windows (via WSL), and macOS on Apple Silicon. It requires no terminal beyond a single prerequisite-install command on Linux.

## Before you start

Make sure you have the following:

- A graphical desktop session on one of: **Linux** (tested on Ubuntu 24.04), **Windows 11 with WSL2** (plus WSLg for the GUI), or an **Apple Silicon Mac** (M1 or later). Basecamp is a desktop application and needs a real display.
- Around **8 GB of RAM** and a few GB of free disk. The chain downloads on first sync and grows over time.
- An always-on machine is recommended — a laptop that sleeps will fall behind and resync on wake.

Port forwarding is **not** required. A blockchain node participates outbound-only: it syncs, validates, and (once funded) proposes blocks. Forwarding only makes your node *reachable* so others can use it, which is out of scope here.

:::info Pin the versions
Install **`blockchain_module` `0.2.0`** and **`blockchain_ui` `0.2.0`**. In the Package Manager, `blockchain_module` may pre-select `0.0.999`, which is a *devnet* build and will not sync the public testnet. Always select `0.2.0` explicitly (Step 3).
:::

## What to expect

By the end of this procedure:

- Basecamp will be running the `blockchain_module` and `blockchain_ui` modules, both at `0.2.0`.
- Your node will be connected to testnet peers and syncing the chain.
- You will confirm sync by observing an advancing block height.
- Optionally, you can fund your wallet from the faucet so your node proposes blocks.

## Step 1: Install prerequisites

**On Linux**, install the libraries Basecamp's AppImage requires:

```bash
sudo apt-get install -y libfuse2t64 libegl1 libopengl0
```

On Ubuntu 22.04 and earlier, use `libfuse2` instead of `libfuse2t64`.

**On Windows**, run every step inside a **WSL2 Ubuntu** shell, on Windows 11 (or Windows 10 21H2+ with WSLg for GUI support). Use the prebuilt AppImage rather than building from source. Default NAT networking is sufficient.

**On macOS (Apple Silicon)**, no prerequisite command is needed. Intel Macs are not supported — there is no x86_64 build.

## Step 2: Download and launch Basecamp

Download the Basecamp `0.2.1` release for your platform from the [releases page](https://github.com/logos-co/logos-basecamp/releases/tag/0.2.1). On Linux, use the `x86_64` (or `aarch64` on ARM) AppImage.

Make it executable and launch it:

```bash
chmod +x LogosBasecamp-Desktop-v0.2.1-*-x86_64.AppImage
./LogosBasecamp-Desktop-v0.2.1-*-x86_64.AppImage
```

Basecamp opens.

## Step 3: Install the blockchain module

In the sidebar, open **Package Manager** and find **`blockchain_module`** (category: Blockchain).

:::caution Use Package Manager, not Applications
Install blockchain modules from **Package Manager**. Open the version dropdown and **select `0.2.0`** before installing — the pre-selected version is `0.0.999`, the devnet build.
:::

Select `0.2.0`, then press **Install** (~142 MB). When it completes, the Details pane shows `Installed version: 0.2.0`. If it shows `0.0.999`, select `0.2.0` again and reinstall — Basecamp will offer to upgrade, which is safe.

## Step 4: Install the blockchain UI

On the same screen, select **`blockchain_ui`** at version **`0.2.0`** (already the default) and press **Install**.

A dependency dialog appears. Choose **"Install just 'blockchain_ui'"** — installing with dependencies replaces your `0.2.0` core with the `0.0.999` devnet build.

## Step 5: Configure the node

Open the **blockchain** module from the sidebar to reach the node view, then generate a config:

1. Choose to generate a new config.
2. In the **Initial peers** field, add the testnet bootstrap peers (one per line):

   ```text
   /ip4/65.109.51.37/udp/3000/quic-v1/p2p/12D3KooWFrouXfmrR4nsLMtE7wu15DoMJ6VtoUtHinREZCvbWHar
   /ip4/65.109.51.37/udp/3001/quic-v1/p2p/12D3KooWJRGau8M1rjT7R5e4YYsgdFhsMX35nRDtMwCDjxQkXAHz
   /ip4/65.109.51.37/udp/3002/quic-v1/p2p/12D3KooWQXJavMDTRscjauFSgVAB1VLB6Rzpy2uY5SU9Tk7927tb
   /ip4/65.109.51.37/udp/50001/quic-v1/p2p/12D3KooWSQc7CcGtvWDPF1yCbBthFnQjprfCVHmfmNDUrSmqQsU1
   ```

3. Leave the other fields at their defaults and select **Generate config**.

:::caution Peers are required
A config generated with an empty **Initial peers** field produces a node that starts and reports success but never syncs. Make sure the peers above are present before generating.
:::

## Step 6: Start the node

On the node view, select **Start Node**. The status moves to *Starting*, then *Bootstrapping*, and the node begins connecting to peers.

## Step 7: Verify that your node is syncing

Confirm sync by evidence rather than the status label. Query the node's HTTP API and check that the height advances across two polls:

```bash
curl -s http://127.0.0.1:8080/cryptarchia/info
```

A syncing node returns a `tip` that is not genesis and a `height`/`slot` that increases between calls. The block list in the UI also begins filling within a minute or two.

:::note Bootstrapping can take time
If you were offline for a while, expect the node to sit in *Bootstrapping* while it catches up before it reports *Online*. A height that is far below the current slot during initial sync is normal.
:::

## Fund your node and propose blocks

A synced node validates the chain but does not **propose** blocks until its wallet has a balance. For chain leadership, your wallet balance counts as stake automatically — there is no separate lock step.

1. In the node view, open **Operations → Accounts** and copy one of your wallet keys.
2. Go to the [testnet faucet](https://testnet.blockchain.logos.co/web/faucet/), paste the key, and select **Request Funds** (do this once your node is *Online*).
3. Once the funds arrive they auto-stake. Your node starts winning leader slots proportional to your balance and proposes blocks on its own.
4. Rewards appear under **Operations → Leader Rewards**, where **Claim** redeems them into your wallet.

:::note Blend staking is separate
Participating in the [Blend network](https://docs.logos.co/get-started/glossary#blend) as a *Core* node requires a separate locked note (staked funds) and does not affect block proposing. See [Join the Blend network as a Core node](../blend/join-the-blend-network-as-a-core-node.md).
:::

## Keeping your node running

The node runs only while Basecamp is open, and it does not resume automatically after a restart — reopen Basecamp, open the blockchain module, and select **Start Node** again. For an unattended, always-on node, use the [CLI setup](./run-a-logos-blockchain-node-from-cli.md) with a service manager instead.

## Troubleshooting

### The node is Online but Consensus shows "Call failed", or Accounts won't load

This is a UI-side issue, not a node fault — the core is healthy but the UI cannot render the call. Recover least-destructively first:

1. **Fully quit Basecamp and relaunch** (Quit, not just close the window), then reopen the node. This clears most cases with no data loss.
2. **Check the versions match** — both `blockchain_module` and `blockchain_ui` should be `0.2.0`. A version mismatch is a common cause.
3. **If it persists**, reset the chain state while keeping your keys: quit Basecamp, delete `db/` and `state/` inside `module_data/blockchain_module/<id>/` (not the whole folder — that removes your wallet keystore), relaunch, and Start. The node re-syncs from genesis.

If `curl http://127.0.0.1:8080/cryptarchia/info` shows an advancing height, the node is syncing and a restart (step 1) is enough — do not wipe a working node.

### Height stays at 0

Your Initial peers are empty. Quit Basecamp, delete `user_config.yaml`, `db/`, and `state/` inside `module_data/blockchain_module/<id>/` (leave `keystore.yaml`), relaunch, and redo Step 5 with the peers present.

### I need my wallet address but the Accounts panel is blank

Your keys are safe in the keystore regardless of the UI. Retrieve an address directly:

```bash
cd ~/.local/share/Logos/LogosBasecamp/module_data/blockchain_module/<id>/
grep -A20 public_keys keystore.yaml
```

### Basecamp will not launch

On Linux, confirm the Step 1 prerequisites are installed. Clearing the QML cache can also help: `rm -rf ~/.cache/Logos`.
