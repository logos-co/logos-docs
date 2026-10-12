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

:::tip[Version]
This document is accurate for **Testnet v0.3.0**.
:::

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
    logosctl call blockchain_module get_cryptarchia_info | jq -r .result.value | jq .mode
    # > "Bootstrapping"

    # ... Wait ~1h, then re-run until you see:
    # > "Online"
    ```

1.  Open your `keystore.yaml` and note the `BlendZk` and `SdpFunding` public keys. Both need funds.

    ```yaml
    # keystore.yaml
    public_keys:
      ...
      BlendZk: 13cccf99f90fd78c2134891ce3c1afce0605753a7694b9d56678d63a8d471820
      ...
      SdpFunding: 91d381a87e05d46fc9bc95246273b6930290506f0589ad039444decd3c24940e
      ...
    ```

1.  Fund both keys by mining. Start mining. Auto-claim pays the mined rewards into your node's `PoWClaim` key, and you then transfer funds from that key to the `BlendZk` and `SdpFunding` keys:

    ```bash
    logosctl call blockchain_module pow_start_mining
    ```

    - The `BlendZk` key needs a single note of at least 1,000,000,000 (1 billion), the minimum stake that the declaration locks.
    - The `SdpFunding` key pays the fees for the declaration and for the activity message your node sends each epoch. Send it at least 50,000,000 (50 million), which covers two months of fees with a wide margin for fee increases.

1.  Check the auto-claim target. Its `public_key` is your `PoWClaim` key, and its `balance` grows as auto-claim collects rewards. Rerun this command periodically until the balance is at least 1,050,000,000 (1.05 billion):

    ```bash
    logosctl call blockchain_module pow_status | jq -r .result.value | jq .auto_claim.targets
    ```

    - With the generated config, auto-claim pays the `PoWClaim` key up to 2,000,000,000 (2 billion), then stops itself and stops mining. You can continue as soon as the balance reaches 1.05 billion, or wait for mining to stop at 2 billion.

    :::info[How long mining takes]
    Each claim pays about 2 million, so 1.05 billion takes about 525 claims and 2 billion about 1,000. How fast a node collects claims depends on its CPU and on how many other nodes are mining. On Testnet v0.3.1 in October 2026, a typical node collected about 8 claims an hour, so it reached 1.05 billion in about 3 days and 2 billion in about 5.5 days. The fastest nodes collected about 65 claims an hour and reached 2 billion in about 15 hours. To estimate your own time, check the `balance` an hour apart.
    :::

1.  Merge the mined rewards into larger notes. Auto-claim pays each claim as a separate note of about 2 million, but a transfer can spend at most 32 notes, so the 1 billion transfer can't be sent from these small notes directly. This script repeatedly transfers the 32 largest notes of the `PoWClaim` key back to itself as one note, waiting for each transfer to land, until the 32 largest notes together cover the 1 billion transfer plus a margin for its fee. Replace `<POW_CLAIM_KEY>` with the `public_key` from the previous step:

    ```bash
    K=<POW_CLAIM_KEY>; n() { logosctl call blockchain_module wallet_get_notes $K "" | jq -r .result.value | jq "[.notes[].value | tonumber] | sort | reverse | $1"; }
    if [ $(n 'add // 0') -lt 1000100000 ]; then echo "Not enough funds: the key holds $(n 'add // 0'), and merging needs at least 1000100000. Keep mining."; else
    while [ $(n length) -gt 2 ] && [ $(n '.[:32] | add') -lt 1000100000 ]; do a=$(( $(n '.[:32] | add') - 100000 )); logosctl call blockchain_module wallet_transfer_funds $K "json:[\"$K\"]" $K str:$a "" | jq -e .result.success || break; until [ $(n '.[0]') -ge $a ]; do sleep 30; done; done; fi
    ```

    - If the key holds less than 1,000,100,000 in total, the script prints the current balance and stops without sending anything. Keep mining and run it again later.

    - Each round merges up to 32 notes and needs a block to land, so reaching 1 billion takes about 16 rounds. Expect this to take 15 to 30 minutes.
    - Each round pays a fee of about 1,800 at current gas prices.

1.  Transfer 1,000,000,000 (1 billion) from your `PoWClaim` key to the `BlendZk` key, replacing the placeholders with your keys. The `PoWClaim` key pays the fee and receives any change:

    ```bash
    logosctl call blockchain_module wallet_transfer_funds \
      <POW_CLAIM_KEY> 'json:["<POW_CLAIM_KEY>"]' <BLEND_ZK_KEY> str:1000000000 ""

    # A successful call returns the transaction hash:
    # > {"method":"wallet_transfer_funds","module":"blockchain_module","result":{"error":null,"success":true,"value":"<TX_HASH>"},"status":"ok"}
    ```

    - The arguments are, in order: the key that receives any change, the list of keys whose notes pay for the transfer, the recipient key, the amount, and the block to build the transfer on, where `""` means the current tip.
    - The `json:` prefix passes the funding keys as a list, and the `str:` prefix passes the amount as text, which `wallet_transfer_funds` requires. Both prefixes need `logosctl` 0.3.2 or later.

1.  Once the 1 billion transfer has landed, which you can check with `wallet_get_notes` as shown in the next step, transfer the remaining funds to the `SdpFunding` key. Send at least 50,000,000 (50 million):

    ```bash
    logosctl call blockchain_module wallet_transfer_funds \
      <POW_CLAIM_KEY> 'json:["<POW_CLAIM_KEY>"]' <SDP_FUNDING_KEY> str:50000000 ""
    ```

    - One transfer can move about 60 million at most, because it spends at most 32 notes. To move more of the remaining balance, repeat the transfer once the previous one has landed.

1.  Wait until both keys have received funds. Check each balance with `wallet_get_notes`:

    ```bash
    logosctl call blockchain_module wallet_get_notes <ADDRESS> "" \
      | jq -r .result.value | jq .notes
    # > [
    # >   {
    # >     "id": "<BLEND_ZK_NOTE_ID>",
    # >     "value": "1000000000"
    # >   }
    # > ]
    ```

    - Note the `id` of the 1 billion note held by the `BlendZk` key—you need it in the next step.

1.  Join the Blend Network by locking the 1 billion note held by your `BlendZk` key.

    :::info
    Make sure to open `<YOUR_BLEND_PORT>/udp` on the public host firewall before running the following command. `<YOUR_BLEND_PORT>` can be found in `user_config.yaml` under `blend.core.backend.listening_address`. Configure the firewall and NAT forwarding before joining and verify the local listener and public reachability after activation.
    :::

    ```sh
    logosctl call blockchain_module blend_join_as_core_node \
       "/ip4/<YOUR_IP>/udp/<YOUR_BLEND_PORT>/quic-v1" \
       "<BLEND_ZK_NOTE_ID>"

    # A successful call will return the declaration id:
    # > {"method":"blend_join_as_core_node","module":"blockchain_module","result":{"error":null,"success":true,"value":"2691821bd61394cc18939626de4e9231c699e8ddefd1ebf9e6c35b32229bdc65"},"status":"ok"}
    ```

    - `<YOUR_IP>`: Must be your external IP address
    - `<YOUR_BLEND_PORT>`: Your configured Blend port from the `user_config.yaml` file (`blend.core.backend.listening_address`). Note that if you do port-mapping, the external mapped port must be used.
    - `<BLEND_ZK_NOTE_ID>`: The ID of the 1 billion note held by your `BlendZk` key, as queried above.
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
    - `created` is the epoch your declaration was included; it takes effect about two epochs later. `active` is the most recent epoch your node has re-attested activity for (via the periodic Active message), so it **advances over time**—it equals `created + 2` right after activation and grows on a long-running node.
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

- `Waiting for chain to become Online mode`—not yet; the node is still [bootstrapping](../../get-started/glossary.md#bootstrapping).
- `Chain is now Online`, followed by the Blend service starting and `Blend edge swarm started with local peer id …`—proposals will be routed through Blend, whether your node is a core node or not.
- `current membership is ready members=N`—the node sees `N` active core nodes this epoch. If `N` is below the minimum needed, the node falls back to [broadcast mode](../concepts/about-the-blend-network.md#node-roles-core-edge-and-broadcast) for that epoch (no Blend privacy).

There is also an API endpoint, `curl http://localhost:8080/blend/info`, which returns the Blend Network info once the node is Online. Note that it can hang or time out while the node is still bootstrapping (Blend is not up yet), so it is better to use the log check during sync.
