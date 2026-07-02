---
title: Move assets using the Logos Blockchain app
doc_type: procedure
product: blockchain
topics: [blockchain-app]
steps_layout: flat
authors: danielsanchezq, kashepavadan
owner: logos
doc_version: 1
slug: move-assets-using-logos-blockchain-app
---

# Move assets using the Logos Blockchain node app

#### Get started with token transfers between wallet accounts directly from the dashboard UI.

This procedure covers how to send funds from one of your wallet addresses to a recipient on the Logos Blockchain using the Logos Blockchain dashboard. It is intended for users who need to move tokens between accounts without using the CLI or crafting transactions manually.

Before you start, make sure you have the following:

- A built [Blockchain node app](./build-and-run-logos-blockchain-node-app-ui.md)
- At least one wallet address with a positive balance, for example one funded via the faucet at [`testnet.blockchain.logos.co`](https://testnet.blockchain.logos.co/web/faucet/)
- The recipient's 64-hex-character public key

## What to expect

- You can select any funded wallet address as the sender and see its live balance in the **From address** dropdown.
- You can submit a transfer and receive a transaction ID in the result row directly below the **Send** button.
- Your sender balance updates after a refresh once the transfer is confirmed.

## Start the node and open the transfer panel

The **Operations** tab is disabled until the node is running and synced. Start the node first, then navigate to the transfer panel.

1. In the **Node** tab, start the node and wait until the status reads **Running**.

   - Stopping the node mid-session disables the **Operations** tab and returns the UI to the **Node** tab.

1. Click **Operations** in the top navigation, then click **Transfer** in the sidebar.

   - The **Transfer funds** panel appears.

1. Select a sender address in the **From address** dropdown.

   - The address's current balance is shown read-only next to the dropdown.
   - A balance that could not be fetched is displayed as `---`.

1. Enter the recipient's public key in the **To key (64 hex chars)** field.

1. Enter the amount to send in the **Amount** field.

1. Click **Send**.

   {% hint style="warning" %}
   Transfers are irreversible; double-check the 64-hex recipient key and the amount before pressing **Send**.
   {% endhint %}

## Read the transfer result

1. Check the result row directly below the **Send** button:

   - On success, the row displays the transaction ID or hash returned by the module. Click the copy button to copy it to the clipboard.
   - On failure, the row displays `Error: <message>` with the rejection reason from the module.

1. Confirm the sender's balance decreased by refreshing the **From address** dropdown.

## Troubleshooting dashboard transfers

### Why is the Operations tab disabled?

The **Operations** tab is gated on the node status being **Running**. Start the node from the **Node** tab and wait for the status to change before attempting a transfer.

### Why does the result row show "Module not initialized"?

The backend client is null, which means the module did not initialise correctly at startup. Restart the app and try again.

### Why does the result row show "Call failed"?

The remote call timed out or returned no reply. Confirm the node is still running and the network connection is healthy, then retry.

### Why does the result row show "Error: …"?

The module rejected the transaction. Common causes are an insufficient balance, an invalid recipient key, or a malformed amount string. Verify the recipient key is exactly 64 hex characters and the amount is a valid number, then retry.
