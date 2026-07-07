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

Joining the [Blend Network](https://docs.logos.co/get-started/glossary#blend-network) lets your blockchain node contribute to the privacy of [Logos Blockchain](https://docs.logos.co/get-started/glossary#logos-blockchain) proposers and receive rewards for participating. This procedure applies to operators of a running Logos Blockchain node who want to register that node as a Blend [core node](https://docs.logos.co/get-started/glossary#core-node). Before you start, make sure your node's address is publicly reachable so other peers can connect to it.

You need:

* [A running blockchain node](<../README (1).md>).
* A publicly reachable IP and port (or DNS) combination for the node.

## What to expect

* Your blockchain node is registered as a Blend core node.
* Your node contributes to proposer privacy and becomes eligible for rewards.
* Your declaration is confirmed on-chain and becomes active after two epochs.

## Register your node as a Blend core node

Complete these steps to fund the required keys, retrieve a locked [note](https://docs.logos.co/get-started/glossary#note), and submit your Blend join declaration.

1.  Start the node and poll until the mode switches to `"Online"`. This takes approximately one hour:

    ```bash
    logoscore call blockchain_module get_cryptarchia_info | jq -r .result.value | jq .mode
    # > "Bootstrapping"

    # ... Wait ~1h, then re-run until you see:
    # > "Online"
    ```
2.  Open your `keystore.yaml` and use the [faucet](https://testnet.blockchain.logos.co/web/faucet/) to send funds to both the `BlendZk` and `SdpFunding` public keys.

    ```yaml
    # keystore.yaml
    public_keys:
      ...
      BlendZk: 13cccf99f90fd78c2134891ce3c1afce0605753a7694b9d56678d63a8d471820
      ...
      SdpFunding: 91d381a87e05d46fc9bc95246273b6930290506f0589ad039444decd3c24940e
      ...
    ```
3.  Wait until both keys have received funds. Check each balance with `wallet_get_notes`. You may need to repeat the faucet requests since only one drip is allowed per block:

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

    * Note the `id` of a note held by the `BlendZk` key — you need it in the next step.
4.  Join the Blend network by locking one of the notes held by your `BlendZk` key:

    ```bash
    curl -X POST http://<YOUR_NODE_IP>:8080/blend/join \
      -H 'Content-Type: application/json' \
      -d '{"locator":"/ip4/<YOUR_IP>/udp/<YOUR_BLEND_PORT>/quic-v1","locked_note_id":"<BLEND_ZK_NOTE_ID>"}'

    # A successful call returns the declaration id:
    # > 2691821bd61394cc18939626de4e9231c699e8ddefd1ebf9e6c35b32229bdc65
    ```

    * `<YOUR_IP>`: your external IP address.
    * `<YOUR_BLEND_PORT>`: the Blend port from `blend.core.backend.listening_address` in `user_config.yaml`. If you use port mapping, use the externally mapped port.
    * `<BLEND_ZK_NOTE_ID>`: the note `id` from the `BlendZk` balance check above.
5.  Confirm the declaration was accepted on-chain by polling `/mantle/sdp/declarations` and looking for your entry:

    ```bash
    curl http://<YOUR_NODE_IP>:8080/mantle/sdp/declarations | jq .
    # > [
    # >   {
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
    # > ]
    ```

    * `service_type: "BN"` identifies this as a [Blend node](https://docs.logos.co/get-started/glossary#blend-node) declaration.
    * `zk_id` is your `BlendZk` public key; `provider_id` is your `BlendSigning` key.
    * `active == created + 2`: your node becomes active two epochs after the declaration is included in a block.
    * If your declaration is not yet listed, retry after your transaction is included in a block.
