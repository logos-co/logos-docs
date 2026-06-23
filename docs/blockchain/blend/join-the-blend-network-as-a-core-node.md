---
title: Join the Blend network as a core node
doc_type: procedure
product: blockchain
topics: blend
steps_layout: flat
authors: ntn-x2, kashepavadan
owner: logos
doc_version: 1
slug: join-the-blend-network-as-a-core-node
---

# Join the Blend Network as a core node

#### Connect your blockchain node to Blend to contribute to proposer privacy.

Joining the Blend Network lets your blockchain node contribute to the privacy of Logos Blockchain proposers and receive rewards for participating. This procedure applies to operators of a running Logos Blockchain node who want to register that node as a Blend core node. Before you start, make sure your node's address is publicly reachable so other peers can connect to it.

You need:

- [A running blockchain node](../get-started/run-a-logos-blockchain-node-from-cli.md).
- A publicly reachable IP and port (or DNS) combination for the node.

## What to expect

- Your blockchain node is registered as a Blend core node.
- Your node contributes to proposer privacy and becomes eligible for rewards.
- Your declaration is confirmed on-chain and becomes active after two epochs.

## Register your node as a Blend core node

Complete these steps to fund the required keys, retrieve a locked note, and submit your Blend join declaration.

1. Start the node and wait for it to switch to "Online" mode. This takes approximately one hour.
1. Use the [faucet](https://testnet.blockchain.logos.co/web/faucet/) to send funds to the public key specified in the `user_config.yaml` file, in `sdp.wallet.funding_pk`.
1. Use the faucet to send funds to the public key specified in the `user_config.yaml` file, in `blend.core.zk.secret_key_kms_id`.
1. Call the `<YOUR_NODE_IP>/wallet/<pk>/balance` endpoint, using the key from the previous step as `<pk>`, to view the balances of your notes.
1. From the response, select either one of the returned notes.
1. Send a `POST` request to `<YOUR_NODE_IP>/blend/join` with the following payload:

   ```bash
   {"locator": "<multiaddr>", "locked_note_id": "<locked_note_id>"}
   ```

   - `<multiaddr>`: a publicly reachable multiaddress for the node (IP or DNS)
   - `<locked_note_id>`: the note ID from the previous step.

1. Confirm the declaration was submitted by calling `<YOUR_NODE_IP>/mantle/sdp/declarations`. If your declaration is included in the set, you will see your node's `zk_id` there.

   - If your declaration is not yet included, retry the request after your transaction is included in a block.
   - Once included in a block, the active epoch shown should be two epochs in the future. This is the epoch starting from which your node will be able to participate in the Blend Network.
