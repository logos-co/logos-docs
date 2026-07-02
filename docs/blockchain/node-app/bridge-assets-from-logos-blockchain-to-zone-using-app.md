---
title: Bridge assets from Logos Blockchain to a Zone using the Logos Blockchain app
doc_type: procedure
product: blockchain
topics: [lez, bridging]
steps_layout: flat
authors: danielsanchezq, kashepavadan
owner: logos
doc_version: 1
slug: bridge-assets-from-logos-blockchain-to-zone-using-app
---

# Bridge assets from Logos Blockchain to a Zone using the Logos Blockchain app

#### Get started locking wallet notes into a Logos Zone, including the LEZ, using the Logos Blockchain UI app.

This procedure covers how to lock one or more of your wallet notes (UTXOs) into a Logos Zone (such as the LEZ) using the [Logos Blockchain desktop app](./build-and-run-logos-blockchain-node-app-ui.md), and receive the resulting transaction hash. It is intended for wallet users on testnet v0.2 who need to fund a channel for off-chain or on-chain channel operations without hand-assembling note IDs, keys, and fees on a CLI.

Before you start, make sure you have the following:

- The [Logos Blockchain UI app](./build-and-run-logos-blockchain-node-app-ui.md) built and able to launch
- A Logos Blockchain node user config selected or generated on the first screen, with an associated keystore (`user_config.yaml`, optional `deployment-settings.yaml`, `keystore.yaml`)
- At least one wallet address with a positive balance, for example one funded via the faucet at [`testnet.blockchain.logos.co`](https://testnet.blockchain.logos.co/web/faucet/)
- The target Zone's channel ID you are depositing into. You can get the channel ID of the public LEZ instance by running:

   ```bash
   curl https://testnet.lez.logos.co/ \
    -H "Content-Type: application/json" \
    -d "{ \
        \"jsonrpc\": \"2.0\", \
        \"method\": \"getChannelId\", \
        \"params\": {}, \
        \"id\": 1 \
    }"
   ```
- Public keys for change (receives leftover value) and funding (to pay for gas). This is typically your own wallet address

## What to expect

- You can select one or more wallet notes and lock their full value into a channel through a guided four-step wizard.
- You can review the exact deposit payload — channel ID, notes, keys, fee, and metadata — before submitting.
- You can confirm the deposit succeeded by copying the returned transaction hash and finding it in a new block under opcode `18` (Channel Deposit).

## Launch the app and start the node

The **Operations** tab is disabled until the node is running. Notes and balances are unavailable until the node is also synced.

1. Launch the app and, on the config screen, select or generate a user config and deployment config:

   ```sh
   nix run
   ```

   - This lands you on the main view.

1. In the **Node** tab, click **Start Node**.

   - Status turns **Running** (green), the consensus card appears and progresses toward **Online**, and blocks begin streaming in the **Blocks** list.
   - The **Operations** tab becomes enabled.

1. Wait for the consensus card to reach **Online** before proceeding.

   - Notes and balances will not load until the node reaches this state.

## Submit a deposit

The UI collects the deposit payload across three input steps, then submits it on confirmation.

1. In the **Operations** tab, click **Channel Deposit** in the left sidebar.

   - The deposit wizard opens at Step 1.

1. On **Step 1 – Select notes**, choose your address from **Known address…**, or paste a hex address and commit it with **Enter**.

   - Notes load automatically once an address is selected. Selecting a different address reloads them.
   
1. Select one or more notes. **Next** enables once at least one note is selected; the full value of each selected note will be consumed.

1. On **Step 2 – Fields**, enter the deposit parameters:

   - **Channel ID (hex)** — the target channel.
   - **Change public key** — prefilled from the selected wallet; receives leftover value.
   - **Funding public keys** — one per line, prefilled; for paying the gas fee.
   - **Max tx fee** — Maximum fee allowed to spend
   - **Metadata (base58)** (Optional) — Usually specific to the Zone
   - **tip hex** or **Use query tip** (Optional) — The chain tip the deposit is built against. Leave empty to use the node's current tip.

   - The **Next** button is enabled once the channel ID, change key, at least one funding key, and max fee are present, and any metadata entered is valid base58.

1. On **Step 3 – Confirm**, review the exact payload — channel ID, notes and total amount, change and funding keys, max fee, metadata, and tip — then click **Confirm & deposit**.

   {% hint style="warning" %}
   Review the information carefully. Deposits are irreversible once included in a block.
   {% endhint %}

## Read the deposit result

1. On **Step 4 – Result**, wait for the submission status:

   - On success, the wizard shows **Deposit submitted** with a copyable transaction hash.
   - On failure, the wizard shows **Deposit failed** with the backend error message.

1. Click **New deposit** to reset the wizard for another deposit.

1. Confirm the transaction on-chain by expanding the new block in the **Node** tab's **Blocks** list and checking that the transaction's opcode is `18` (Channel Deposit).

## Troubleshooting channel deposits

### Why is Channel Deposit unavailable in the Operations tab?

The node is not in the **Running** state. Start it from the **Node** tab and wait for the status to turn green before opening the wizard.

### Why do no notes appear after selecting an address?

The node has not finished syncing, or the selected address has no spendable notes. Wait for the consensus card to reach **Online** before retrying, and confirm the address actually holds notes.

### Why does Next stay disabled on Step 2?

A required field is missing — channel ID, change key, at least one funding key, or max fee — or the metadata entered is not valid base58. The metadata field shows **Invalid base58 input** when this is the cause.

### Why does the wizard show "Deposit failed"?

The backend rejected the transaction. Common causes are insufficient funds to cover the selected notes plus the max transaction fee, an invalid channel ID or key, or a rejected or expired tip. The exact backend error is shown in the result step.
