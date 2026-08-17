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
sidebar_position: 1
---

# Join the Blend Network as a core node

#### Connect your blockchain node to Blend to contribute to proposer privacy.

Joining the [Blend Network](../../get-started/glossary.md#blend-network) lets your blockchain node contribute to the privacy of [Logos Blockchain](../../get-started/glossary.md#logos-blockchain) proposers and receive rewards for participating. This procedure applies to operators of a running Logos Blockchain node who want to register that node as a Blend [core node](../../get-started/glossary.md#core-node). Before you start, make sure your node's address is publicly reachable so other peers can connect to it.

:::note
Joining the Blend Network as a core node via a [Basecamp](../get-started/run-a-logos-blockchain-node-from-basecamp.md) is not currently supported.

Instead, follow the CLI instructions below, but navigate to your Basecamp Logos Blockchain node's **Generate-Config** screen to find the **Blend port** field. Use this value in place of `<YOUR_BLEND_PORT>`.
:::

:::info[Prerequisites]

- [A running blockchain node](../get-started/run-a-logos-blockchain-node-from-cli.md).
- A publicly reachable IP and port (or DNS) combination for the node.
- Stable connection (10 Mbps+ recommended) to handle multiple concurrent connections. A stable, low-latency connection is beneficial for effective message blending and timing obfuscation.
:::

## What to expect

- Your blockchain node is registered as a Blend core node.
- Your node contributes to proposer privacy and becomes eligible for rewards.
- Your declaration is confirmed on-chain and becomes active after two [epochs](../../get-started/glossary.md#epoch).

## Register your node as a Blend core node

Complete these steps to fund the required keys, retrieve a locked [note](../../get-started/glossary.md#note), and submit your Blend join declaration.

1.  Start the node and poll until the mode switches to `"Online"`. This takes approximately one hour:

    ```bash
    logoscore call blockchain_module get_cryptarchia_info | jq -r .result.value | jq .mode
    # > "Bootstrapping"

    # ... Wait ~1h, then re-run until you see:
    # > "Online"
    ```

1.  Open your `keystore.yaml` and use the [faucet](https://testnet.blockchain.logos.co/web/faucet/) to send funds to both the `BlendZk` and `SdpFunding` public keys.

    ```yaml
    # keystore.yaml
    public_keys:
      ...
      BlendZk: 13cccf99f90fd78c2134891ce3c1afce0605753a7694b9d56678d63a8d471820
      ...
      SdpFunding: 91d381a87e05d46fc9bc95246273b6930290506f0589ad039444decd3c24940e
      ...
    ```

1.  Wait until both keys have received funds. Check each balance with `wallet_get_notes`. You may need to repeat the faucet requests since only one drip is allowed per block:

    ```bash
    logoscore call blockchain_module wallet_get_notes <ADDRESS> "" \
      | jq -r .result.value | jq .notes
    # > [
    # >   {
    # >     "id": "<BLEND_ZK_NODE_ID>",
    # >     "value": "1000"
    # >   }
    # > ]
    ```

    - Note the `id` of a note held by the `BlendZk` key — you need it in the next step.

1.  Join the Blend Network by locking one of the notes held by your `BlendZk` key.

:::info
Make sure to open `<YOUR_BLEND_PORT>/udp` on the public host firewall before running the following command. `<YOUR_BLEND_PORT>` can be found in `user_config.yaml` under `blend.core.backend.listening_address`. Configure the firewall and NAT forwarding before joining and verify the local listener and public reachability after activation.
:::

   ```sh
   logoscore call blockchain_module blend_join_as_core_node \
      "/ip4/<YOUR_IP>/udp/<YOUR_BLEND_PORT>/quic-v1" \
      "<BLEND_ZK_NOTE_ID>"

    # A successful call will return the declaration id:
    # > {"method":"blend_join_as_core_node","module":"blockchain_module","result":{"error":null,"success":true,"value":"2691821bd61394cc18939626de4e9231c699e8ddefd1ebf9e6c35b32229bdc65"},"status":"ok"}
   ```

   - `<YOUR_IP>`: Must be your external IP address
   - `<YOUR_BLEND_PORT>`: Your configured Blend port from the `user_config.yaml` file (`blend.core.backend.listening_address`). Note that if you do port-mapping, the external mapped port must be used.
   - `<BLEND_ZK_NOTE_ID>`: The note ID of one of the notes held by your `BlendZk` key, as queried above.
   - The Blend core listener starts only after the node's declaration becomes active.

1.  Confirm the declaration was accepted on-chain by polling `/mantle/sdp/declarations` and looking for your entry:

    ```bash
    curl http://<YOUR_NODE_IP>:8080/mantle/sdp/declarations | jq .
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

    - The response is a JSON **object keyed by declaration id** (not a list). Find your entry by its `provider_id` (your `BlendSigning` key) or `zk_id` (your `BlendZk` key).
    - `service_type: "BN"` identifies this as a [Blend node](../../get-started/glossary.md#blend-node) declaration.
    - `created` is the epoch your declaration was included; it takes effect about two epochs later. `active` is the most recent epoch your node has re-attested activity for (via the periodic Active message), so it **advances over time** — it equals `created + 2` right after activation and grows on a long-running node.
    - If your declaration is not yet listed, retry after your transaction is included in a block.

1. Check the configured Blend UDP listener:

   ```sh
   ss -lun
   ```

   - Confirm that the local UDP port from `blend.core.backend.listening_address` is present. If the public Blend port differs, also confirm that NAT forwards `<YOUR_BLEND_PORT>/udp` to this local port.

## Frequently asked questions

### Did my core declaration land?

After declaring as a core node, query the on-chain SDP declarations and look for your entry:

```bash
curl -s http://localhost:8080/mantle/sdp/declarations
```

Find the entry whose `zk_id` is your BlendZk key, with `"service_type": "BN"`. It will become active a couple of epochs after the declaring transaction is included in a block, and stays active only while the node keeps sending Active messages. 

### Is my node participating in the Blend Network right now?

Check the node log for the Blend service lifecycle:

```bash
grep -aE "blend::service" <node-log> | tail
```

- `Waiting for chain to become Online mode` — not yet; the node is still [bootstrapping](../../get-started/glossary.md#bootstrapping).
- `Chain is now Online`, followed by the Blend service starting and `Blend edge swarm started with local peer id …` — proposals will be routed through Blend, whether your node is a core node or not.
- `current membership is ready members=N` — the node sees `N` active core nodes this epoch. If `N` is below the minimum needed, the node falls back to [broadcast mode](../concepts/about-the-blend-network.md#node-roles-core-edge-and-broadcast) for that epoch (no Blend privacy).

There is also an API endpoint, `curl http://localhost:8080/blend/info`, which returns the Blend Network info once the node is Online. Note that it can hang or time out while the node is still bootstrapping (Blend is not up yet), so it is better to use the log check during sync.
