---
title: Logos Blockchain API Reference
doc_type: reference
product: blockchain
topics: blockchain
authors: kashepavadan
owner: logos
doc_version: 1
slug: blockchain-api-reference
---

# Logos Blockchain API Reference

This page describes every HTTP endpoint a Logos Blockchain node exposes. It's accurate for Logos Blockchain node `0.3.1`.

:::tip
If you have access to a running Blockchain node, you can view the OpenAPI specification at `/api-docs/openapi.json` and a Swagger UI at `/swagger-ui/` on the same port.
:::

## Conventions

- The API listens on `127.0.0.1:8080` by default. To change the address, set `api.backend.listen_address` in the node's configuration.
- Requests and responses use JSON unless an endpoint says otherwise. Send request bodies with the `Content-Type: application/json` header.
- A few successful responses have a JSON body but a `text/plain` content type: [`GET /leader/aged-notes`](#get-leaderaged-notes), [`GET /leader/claim/vouchers`](#get-leaderclaimvouchers), [`GET /wallet/{public_key}/balance`](#get-walletpublic_keybalance), and [`POST /wallet/transactions/transfer-funds`](#post-wallettransactionstransfer-funds). Parse the body as JSON regardless of the content type.
- Hashes, block IDs, transaction IDs, note IDs, declaration IDs, and ZK public keys are 32-byte values encoded as 64-character hexadecimal strings without a `0x` prefix.
- Peer IDs are libp2p peer IDs encoded as base58 strings. Network addresses and locators are libp2p `multiaddr` strings, such as `/ip4/203.0.113.10/udp/3000/quic-v1`.
- Slots, epochs, and token amounts are unsigned integers.
- Path parameters are shown in braces. For example, in `GET /cryptarchia/blocks/{id}`, replace `{id}` with a block ID.

### Access and security

The API has no authentication. Anyone who can reach it can read the node's wallet balances, sign arbitrary transaction hashes with the node's keys, and spend its funds. Keep the API bound to `127.0.0.1`, or put it behind an authenticating proxy, and don't expose it to the public internet.

### Error responses

When the node handles a request and it fails, the response has a non-`200` status code and the following body:

| Field | Type | Description |
| --- | --- | --- |
| `code` | integer | The HTTP status code of the response. |
| `message` | string | A human-readable description of the error. |

Most failures return `500`. Endpoints that look up a single item return `404` when the item doesn't exist, and [`GET /cryptarchia/blocks_range`](#get-cryptarchiablocks_range) returns `400` for invalid query parameters.

Some errors don't use this body:

- A malformed path parameter, query string, or request body returns `400`, `415`, or `422` with a plain-text message, such as `Failed to deserialize query string: missing field 'slot_from'`.
- An unknown path returns `404` with an empty body.
- A request that takes longer than the API timeout returns `408` with an empty body. The timeout is 30 seconds by default. To change it, set `api.backend.timeout`, in seconds, in the node's configuration.

### Requests while the node is bootstrapping

While the node is in the `Bootstrapping` state, the following endpoints don't respond until the node is `Online`. Each request waits until the API timeout and then returns `408`:

- [`GET /blend/info`](#get-blendinfo)
- [`GET /blend/transactions/pending`](#get-blendtransactionspending)
- [`GET /pow/status`](#get-powstatus)
- [`GET /pow/rewards/claimable`](#get-powrewardsclaimable)
- [`POST /pow/claim`](#post-powclaim)

The other read endpoints on this page respond normally while the node is bootstrapping.

## Node

### `GET /version`

Gets the version and build information of the running node.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `version` | string | The version of the node binary, such as `0.3.1`. |
| `commit` | string or `null` | The abbreviated commit the binary was built from. `null` if it wasn't built from a Git checkout. |
| `tag` | string or `null` | The Git tag that points at that commit. `null` if there is none. |
| `target` | string | The target triple the binary was compiled for, such as `x86_64-unknown-linux-gnu`. |
| `profile` | string | The Cargo profile the binary was compiled with, such as `release`. |
| `rustc` | string | The version of the Rust compiler that built the binary. |

### `GET /chain/id`

Gets the ID of the chain the node runs on. The chain ID is fixed by the node's deployment and doesn't change while the node runs.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `chain_id` | string | The chain ID. |

## Consensus

### `GET /cryptarchia/info`

Gets the consensus state information for the node.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `cryptarchia_info` | object | The node's current view of the chain. |
| `cryptarchia_info.lib` | string | The ID of the latest immutable block (LIB), the most recent block that can no longer be reorganised. |
| `cryptarchia_info.lib_slot` | integer | The slot of the latest immutable block. |
| `cryptarchia_info.tip` | string | The ID of the block at the tip of the node's canonical chain. |
| `cryptarchia_info.slot` | integer | The slot of the tip block. |
| `cryptarchia_info.height` | integer | The height of the tip block, which is the length of the canonical chain. |
| `cryptarchia_info.state` | string | The state of the consensus engine: `Bootstrapping` or `Online`. |
| `phase` | string | The phase the chain service is in. See the following table. |

`phase` has one of the following values:

| Value | Description |
| --- | --- |
| `AwaitingGenesisTime` | The genesis time is in the future. The node serves only read-only queries. |
| `InitialBlockDownload` | The node applies blocks while it waits for the Initial Block Download to complete. |
| `ProlongedBootstrapPeriod` | The Prolonged Bootstrap Period is running. |
| `Following` | The node follows the chain in real time. |

### `GET /time/info`

Gets the node's slot and epoch timing information.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `slot_duration_ms` | integer | The duration of a slot, in milliseconds. |
| `genesis_time_unix_ms` | integer | The genesis time of the chain, in milliseconds since the Unix epoch. |
| `current_slot` | integer | The current slot. |
| `current_epoch` | integer | The current epoch. |
| `slots_per_epoch` | integer | The number of slots in an epoch. |

### `GET /cryptarchia/headers`

Gets the IDs of the blocks on a branch of the chain, walking from a descendant block back towards an ancestor.

#### Query parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | No | The ID of the block to start from. Defaults to the tip of the node's canonical chain. |
| `to` | string | No | The ID of the ancestor block to stop at. Defaults to the latest immutable block. |

#### Response

An array of block IDs, newest first, including both `from` and `to`. The response contains at most 512 IDs.

### `GET /cryptarchia/blocks/{id}`

Gets a block by its ID.

#### Path parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | string | The ID of the block. |

#### Response fields

Returns `404` if the node doesn't store the block.

| Field | Type | Description |
| --- | --- | --- |
| `header` | object | The block header. |
| `header.id` | string | The ID of the block. |
| `header.parent_block` | string | The ID of the parent block. |
| `header.slot` | integer | The slot the block was proposed in. |
| `header.body_root` | string | The root of the block body's Merkle tree. |
| `header.proof_of_leadership` | object | The proposer's Proof of Leadership. It contains `proof`, `entropy_contribution`, `leader_key`, and `voucher_cm`. |
| `uncle_headers` | array of objects | The signed headers of uncle blocks referenced by this block. Each entry has a `header` object in the same format as `header`, and a `signature` string. |
| `transactions` | array of objects | The transactions in the block, in the format that [`GET /cryptarchia/transaction/{id}`](#get-cryptarchiatransactionid) returns. |

### `GET /cryptarchia/blocks/{id}/events`

Gets the ledger events produced when processing a block, including reward claims and channel deposits.

#### Path parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | string | The ID of the block. |

#### Response

An array of events. Each event is an object with a single key that names the event kind, such as `Tx` for an event produced by a transaction. A `Tx` event contains the `tx_hash` of the transaction, the `op_id` of the operation, and a `payload` object whose single key names the payload type, such as `PoWRewardClaimed`, `LeaderRewardClaimed`, or `Deposit`.

Returns `404` if the node has no events for the block.

### `GET /cryptarchia/blocks`

Gets the immutable blocks in a slot range.

#### Query parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `slot_from` | integer | Yes | The first slot of the range. |
| `slot_to` | integer | Yes | The last slot of the range, inclusive. |

#### Response

An array of blocks in the format that [`GET /cryptarchia/blocks/{id}`](#get-cryptarchiablocksid) returns. The array is empty if the range contains no immutable blocks. To include blocks that aren't immutable yet, use [`GET /cryptarchia/blocks_range`](#get-cryptarchiablocks_range).

### `GET /cryptarchia/blocks_range`

Streams the blocks in a slot range, with the chain state at the time each block was processed.

#### Query parameters

All query parameters are optional.

| Parameter | Type | Description |
| --- | --- | --- |
| `slot_from` | integer | The first slot of the range. For a descending stream, defaults to `0`. For an ascending stream, the node estimates a lower bound that makes the stream end near `slot_to`, so the stream can return fewer than `blocks_limit` blocks. |
| `slot_to` | integer | The last slot of the range, inclusive. Defaults to the slot of the tip, or of the latest immutable block if `block_filter` is `immutable_only`. A value past that slot is lowered to it. |
| `order` | string | `descending` (newest first) or `ascending` (oldest first). Defaults to `descending`. |
| `blocks_limit` | integer | The maximum number of blocks to return, from `1` to `630720000`. Defaults to `630720000` if you set both `slot_from` and `slot_to`, and to `100` otherwise. |
| `server_batch_size` | integer | How many blocks the node fetches at a time, from `1` to `1000`. Defaults to `100`. |
| `block_filter` | string | `immutable_only` to return only immutable blocks, or `mutable_and_immutable` to return all blocks on the canonical chain. Defaults to `mutable_and_immutable`. |

#### Response

A stream of newline-delimited JSON objects, with the content type `application/x-ndjson`. Each line has the following fields:

| Field | Type | Description |
| --- | --- | --- |
| `block` | object | The block, in the format that [`GET /cryptarchia/blocks/{id}`](#get-cryptarchiablocksid) returns. |
| `tip` | string | The ID of the tip when the block was processed. |
| `tip_slot` | integer | The slot of that tip. |
| `lib` | string | The ID of the latest immutable block when the block was processed. |
| `lib_slot` | integer | The slot of that latest immutable block. |

Returns `400` if `slot_from` is greater than `slot_to` or a parameter is out of range. If the node hits an error after the stream has started, the stream ends early without reporting the error.

### `GET /cryptarchia/events/blocks/stream`

Streams each new block the node processes, from the time of the request onwards. The response is a stream of newline-delimited JSON objects in the same format as [`GET /cryptarchia/blocks_range`](#get-cryptarchiablocks_range). The stream stays open until the client closes it.

### `GET /cryptarchia/lib-stream`

Streams each block that becomes immutable, from the time of the request onwards. The response is a stream of newline-delimited JSON objects, with the content type `application/x-ndjson`. The stream stays open until the client closes it. Each line has the following fields:

| Field | Type | Description |
| --- | --- | --- |
| `height` | integer | The height of the block. |
| `header_id` | string | The ID of the block. |

### `GET /cryptarchia/transaction/{id}`

Gets a transaction that's included in a block the node stores.

#### Path parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | string | The hash of the transaction. |

#### Response fields

Returns `404` if the node doesn't store the transaction.

| Field | Type | Description |
| --- | --- | --- |
| `mantle_tx` | object | The unsigned transaction. |
| `mantle_tx.hash` | string | The hash of the transaction. |
| `mantle_tx.ops` | array of objects | The operations in the transaction. Each has a numeric `opcode` and a `payload` object whose fields depend on the operation. |
| `ops_proofs` | array of objects | The proofs that authorise each operation, in the same order as `mantle_tx.ops`. Each entry is an object with a single key that names the proof type, such as `ZkSig`. An operation that needs no proof has the entry `{"None": null}`. |

## Mantle and mempool

### `GET /mantle/metrics`

Gets metrics about the node's transaction mempool.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `pending_items` | integer | The number of transactions pending in the mempool. |
| `last_item_timestamp` | integer | The time the most recent transaction was added to the mempool, in milliseconds since the Unix epoch. `0` if no transaction has been added. |

### `GET /mempool/view`

Gets the hashes of the transactions in the mempool that can be included on top of the current tip.

#### Response

An array of transaction hashes.

### `POST /mantle/status`

Gets the mempool status of one or more transactions.

#### Request body

An array of transaction hashes.

#### Response

An array with one status per requested hash, in request order. Each status is `Pending` if the transaction is in the mempool, or `Unknown` if it isn't.

### `POST /mempool/add/tx`

Adds a signed transaction to the node's mempool, which then shares it with the network.

#### Request body

A signed transaction, as an object with `mantle_tx` and `ops_proofs` fields in the format that [`GET /cryptarchia/transaction/{id}`](#get-cryptarchiatransactionid) returns.

#### Response

Returns `200` with a `null` body when the node accepts the transaction.

### `GET /mantle/gas-prices`

Gets the gas prices from the ledger state at a block.

#### Query parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tip` | string | No | The ID of the block to read the ledger state at. Defaults to the current tip. |

#### Response fields

Returns `404` if the node has no ledger state for the block.

| Field | Type | Description |
| --- | --- | --- |
| `tip` | string | The ID of the block the prices were read at. |
| `execution_base_gas_price` | integer | The base price per unit of execution gas. |
| `storage_gas_price` | integer | The price per unit of storage gas. |

### `GET /channel/{id}`

Gets the current state of a [channel](../../get-started/glossary.md#channel).

#### Path parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | string | The ID of the channel. |

#### Response fields

Returns `404` if the channel doesn't exist.

| Field | Type | Description |
| --- | --- | --- |
| `accredited_keys` | array | The keys that are authorised to post to the channel. |
| `configuration_threshold` | integer | The number of keys required to change the channel's configuration. |
| `tip_message` | string | The ID of the channel's latest message. |
| `config_tip_hash` | string | The ID of the channel's latest configuration message. |
| `tip_slot` | integer | The slot of the channel's latest message. |
| `tip_sequencer` | integer | The position, in `accredited_keys`, of the key whose turn it is to post. |
| `tip_sequencer_starting_slot` | integer | The slot at which the current sequencer's turn started. |
| `posting_timeframe` | integer | The number of slots in each sequencer's turn. `0` means unlimited. |
| `posting_timeout` | integer | The number of slots a sequencer can stay silent before the turn passes to the next key. `0` means no timeout. |
| `transfer_threshold` | integer | The number of keys required to transfer funds out of the channel. |

### `POST /channel/deposit`

Builds a channel deposit transaction, funds and signs it with the node's wallet, and adds it to the mempool.

#### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `deposit` | object | Yes | The deposit operation. It contains the `channel_id` to deposit into, the `inputs` (an array of note IDs to deposit), and `metadata`. |
| `change_public_key` | string | Yes | The ZK public key that receives any change. |
| `funding_public_keys` | array of strings | Yes | The ZK public keys whose notes the wallet can spend to pay the fee. |
| `max_tx_fee` | integer | Yes | The maximum fee the transaction can pay. The request fails if the fee is higher. |
| `tip` | string | No | Accepted, but ignored. The node always funds the deposit against the current tip. |

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `hash` | string | The hash of the submitted transaction. |

## Service Declaration Protocol

These endpoints read and submit [Service Declaration Protocol](../../get-started/glossary.md#service-declaration-protocol) (SDP) declarations. In `0.3.1`, the only service type is the Blend Network, shown as `BN`.

### `GET /mantle/sdp/declarations`

Gets every declaration in the current SDP registry.

#### Response fields

An object that maps each declaration ID to a declaration with the following fields:

| Field | Type | Description |
| --- | --- | --- |
| `service_type` | string | The service the declaration is for. Always `BN` in `0.3.1`. |
| `provider_id` | string | The provider's public key. |
| `service_note_id` | string | The ID of the note locked for the declaration. |
| `locators` | array of strings | The `multiaddr` addresses where the provider can be reached. |
| `zk_id` | string | The ZK public key of the provider. |
| `created` | integer | The epoch of the block that contained the declaration. |
| `active` | integer | The latest epoch for which the provider sent an activity message. |
| `withdraw_at` | integer or `null` | The epoch at which the declaration is scheduled to be withdrawn. `null` if no withdrawal is scheduled. |
| `nonce` | integer | The declaration's nonce, which increases with each update. |

### `GET /mantle/sdp/snapshot`

Gets the SDP declarations in the snapshot for the current epoch, which is the set the network uses during that epoch. The response has the same format as [`GET /mantle/sdp/declarations`](#get-mantlesdpdeclarations).

### `POST /sdp/declaration`

Builds a declaration transaction, funds and signs it with the node's wallet, and adds it to the mempool.

#### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `service_type` | string | Yes | The service to declare. Must be `BN`. |
| `locators` | array of strings | Yes | The `multiaddr` addresses where the node can be reached. At least one is required. |
| `provider_id` | string | Yes | The provider's public key. |
| `zk_id` | string | Yes | The ZK public key of the provider. |
| `service_note_id` | string | Yes | The ID of the note to lock for the declaration. |

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `declaration_id` | string | The ID of the declaration. |
| `tx_id` | string | The hash of the submitted transaction. |

### `POST /sdp/activity`

Submits an activity message that proves the node's service was active during an epoch.

#### Request body

The activity metadata. In `0.3.1`, this is an object with a single `Blend` key that holds a Blend activity proof.

#### Response fields

The response has the same format as [`POST /sdp/declaration`](#post-sdpdeclaration). The request fails if the node hasn't set a current declaration with [`POST /sdp/set-declaration-id`](#post-sdpset-declaration-id).

### `POST /sdp/withdrawal`

Withdraws an SDP declaration.

#### Request body

The ID of the declaration to withdraw, as a JSON string.

#### Response fields

The response has the same format as [`POST /sdp/declaration`](#post-sdpdeclaration). After a successful withdrawal, the node no longer has a current declaration.

### `POST /sdp/set-declaration-id`

Sets the declaration the node uses for its own SDP messages, such as activity messages.

#### Request body

The declaration ID as a JSON string, or `null` to clear the current declaration. The request fails if the declaration doesn't exist.

#### Response

Returns `200` with a `null` body on success.

## Network and Blend

### `GET /network/info`

Gets information about the node's peer connectivity.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `listen_addresses` | array of strings | The addresses the node listens on. |
| `peer_id` | string | The peer ID of this node. |
| `connected_peers` | array of strings | The peer IDs of the peers the node is connected to. |
| `discovered_peers` | array of strings | The peer IDs of the peers the node has discovered through Kademlia. A discovered peer isn't necessarily connected. |
| `n_peers` | integer | The number of connected peers. |
| `n_connections` | integer | The total number of connections, both pending and established. A peer can have more than one connection. |
| `n_discovered_peers` | integer | The number of entries in `discovered_peers`. |
| `n_pending_connections` | integer | The number of connections, incoming and outgoing, that aren't established yet. |

### `POST /network/dial_peer`

Connects the node to a peer.

#### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `addr` | string | Yes | The `multiaddr` address of the peer. |

#### Response

The peer ID of the connected peer, as a JSON string.

### `GET /blend/info`

Gets information about the node's view of the Blend network.

#### Response fields

The response is `null` if the Blend service has no network information to report.

| Field | Type | Description |
| --- | --- | --- |
| `node_id` | string | The peer ID of this node in the Blend network. |
| `core_info` | object or `null` | Peer information for a node that participates in the Blend network as a core node. `null` if the node runs as an edge or broadcast node. |
| `core_info.current_epoch_peers` | array | The peers negotiated for the current epoch. Each entry is a two-element array: the peer ID (string) and whether the peer is healthy (boolean). |
| `core_info.old_epoch_peers` | array of strings or `null` | The peer IDs negotiated for the previous epoch while an epoch transition is in progress. `null` if no transition is in progress. |

### `POST /blend/join`

Declares the node as a Blend Network core node by submitting an SDP declaration.

#### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `locator` | string | Yes | The `multiaddr` address where other Blend nodes can reach this node, such as `/ip4/203.0.113.10/udp/3000/quic-v1`. |
| `service_note_id` | string | Yes | The ID of the note to lock for the declaration. |

#### Response fields

The response has the same format as [`POST /sdp/declaration`](#post-sdpdeclaration).

### `POST /blend/transactions/disperse`

Sends a signed transaction through the Blend Network instead of adding it to this node's mempool.

#### Request body

A signed transaction, in the same format as [`POST /mempool/add/tx`](#post-mempooladdtx).

#### Response

The hash of the transaction, as a JSON string.

### `GET /blend/transactions/pending`

Gets the hashes of the transactions waiting for a PoW solution before the node can blend them.

#### Response

An array of transaction hashes.

## Leader rewards

### `GET /leader/aged-notes`

Gets the wallet's notes that are eligible to take part in the leadership lottery. A note is eligible when it's in the aged note snapshot for the current epoch and the wallet holds its key.

#### Query parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tip` | string | No | The ID of the block to check eligibility at. Defaults to the current tip. |

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `tip` | string | The ID of the block eligibility was checked at. |
| `notes` | array of objects | The eligible notes. Empty if the node can't win a slot at `tip`. |
| `notes[].note_id` | string | The ID of the note. |
| `notes[].value` | integer | The value of the note. |
| `notes[].public_key` | string | The ZK public key that holds the note. |
| `count` | integer | The number of eligible notes. |
| `total_value` | integer | The total value of the eligible notes. |

### `GET /leader/claim/vouchers`

Gets the reward vouchers the wallet can claim from proposing blocks.

#### Query parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tip` | string | No | The ID of the block to check at. Defaults to the current tip. |

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `tip` | string | The ID of the block the vouchers were checked at. |
| `vouchers` | array of objects | The claimable vouchers. Each has a `commitment` and a `nullifier` string. |
| `reward_amount` | integer | What a single voucher pays out at `tip`. The reward pool is split evenly across every unclaimed voucher on the chain, so this value changes as other leaders claim. |
| `total_claimable` | integer | `reward_amount` multiplied by the number of `vouchers`. |

### `POST /leader/claim`

Claims one leader reward voucher and adds the claim transaction to the mempool. The request takes no body. To claim several vouchers, call this endpoint once per voucher listed by [`GET /leader/claim/vouchers`](#get-leaderclaimvouchers).

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `tx_hash` | string | The hash of the submitted claim transaction. |

Returns `500` if the wallet has no claimable voucher.

## Wallet

### `GET /wallet/{public_key}/balance`

Gets the balance of a key in the node's wallet.

#### Path parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `public_key` | string | The ZK public key to check. |

#### Query parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tip` | string | No | The ID of the block to read the balance at. Defaults to the current tip. |

#### Response fields

Returns `404` if the key holds no notes at that block. This includes a key that the node's wallet holds but that hasn't received any funds yet, and a funded key whose funding block the node hasn't synced yet.

| Field | Type | Description |
| --- | --- | --- |
| `tip` | string | The ID of the block the balance was read at. |
| `balance` | integer | The total value of the key's notes, excluding notes deposited into channels. |
| `notes` | object | An object that maps each note ID to the note's value. |
| `address` | string | The ZK public key. |

### `POST /wallet/transactions/transfer-funds`

Builds a transfer transaction, funds and signs it with the node's wallet, and adds it to the mempool.

#### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `recipient_public_key` | string | Yes | The ZK public key that receives the funds. |
| `amount` | integer | Yes | The amount to transfer. |
| `change_public_key` | string | Yes | The ZK public key that receives any UTXO change. |
| `funding_public_keys` | array of strings | Yes | The ZK public keys whose notes the wallet can spend to fund the transfer and its fee. |
| `tip` | string | No | The ID of the block to fund the transaction against. Defaults to the current tip. |

#### Response fields

Returns `201` on success.

| Field | Type | Description |
| --- | --- | --- |
| `hash` | string | The hash of the submitted transaction. |

### `POST /wallet/fund`

Adds inputs and a fee payment to an unsigned transaction, using the node's wallet. The node doesn't sign the transaction's own operations or submit it.

#### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tx_builder` | object | Yes | The unsigned transaction to fund. |
| `change_public_key` | string | Yes | The ZK public key that receives any UTXO change. |
| `funding_public_keys` | array of strings | Yes | The ZK public keys whose notes the wallet can spend to pay the fee. |
| `max_tx_fee` | integer | Yes | The maximum fee the funded transaction can pay. The request fails if the fee is higher. |
| `priority_fee_percent` | integer | No | An extra fee reserve, as a percentage of the mandatory fee, to absorb fee changes before the transaction is included. `0` funds exactly the mandatory fee. The value isn't capped at `100`. Defaults to `0`. |
| `tip` | string | No | The ID of the block to fund the transaction against. Defaults to the current tip. |

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `tip` | string | The ID of the block the transaction was funded against. |
| `funded_tx` | object | The funded transaction, with the fee transfer added as the last operation. All operations are still unsigned. |
| `transfer_proof` | object or `null` | The proof for the added fee transfer, signed over the funded transaction's hash. `null` if funding needed no transfer. |

### `POST /wallet/sign/ed25519`

Signs a transaction hash with one of the wallet's Ed25519 keys.

#### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tx_hash` | string | Yes | The hash to sign. |
| `pk` | string | Yes | The Ed25519 public key whose secret key signs the hash. |

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `sig` | string | The signature. |

### `POST /wallet/sign/zk`

Signs a transaction hash with one or more of the wallet's ZK keys.

#### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tx_hash` | string | Yes | The hash to sign. |
| `pks` | array of strings | Yes | The ZK public keys whose secret keys sign the hash. Up to 32 keys. |

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `sig` | object | The ZK signature, as an object with the proof components `pi_a`, `pi_b`, and `pi_c`. |

## Proof-of-Work

The four `PUT` endpoints used for EmPoWering take no request body. On success, each returns status `200` with a `null` JSON body. The response confirms only that the node received the command, so use [`GET /pow/status`](#get-powstatus) to check the resulting state.

### `GET /pow/status`

Gets the runtime state of the PoW service: whether the node is mining, whether auto-claim is armed, and the balance of each auto-claim target.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `is_mining` | boolean | Whether mining is turned on. This setting isn't persisted, so a restart clears it. |
| `are_rewards_enabled` | boolean | Whether PoW rewards are enabled for the node's deployment. Auto-claim can't start while rewards are disabled. |
| `auto_claim` | object | The runtime state of auto-claim, which claims rewards without operator action. |
| `auto_claim.is_armed` | boolean | Whether auto-claim is running. |
| `auto_claim.tick` | object | How often auto-claim tries to claim, as set in the node's `pow.auto_claim.tick` configuration. |
| `auto_claim.tick.unit` | string | `seconds` to pace claim attempts by wall-clock time, or `slots` to pace them by chain progress. |
| `auto_claim.tick.value` | integer | The number of seconds or slots between claim attempts. Always greater than zero. |
| `auto_claim.targets` | array of objects | The keys auto-claim pays, as set in the node's `pow.auto_claim.targets` configuration. Empty if no targets are configured. |
| `auto_claim.targets[].public_key` | string | The ZK public key the rewards are paid to. |
| `auto_claim.targets[].threshold` | integer | The balance, in tokens, this key should reach. When the key's on-chain balance is at or above this value, auto-claim stops paying it. |
| `auto_claim.targets[].balance` | integer or `null` | The key's current balance. `null` if the node couldn't read the balance from the wallet. |

### `GET /pow/rewards/claimable`

Gets a summary of the PoW rewards the node can currently claim. Each reward corresponds to a winning ticket the node mined. A ticket can be claimed only while it's within the reward window.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `claimable_tickets` | integer | The number of mined tickets that are still within the reward window. |
| `slots_until_expiry` | array of integers | One entry per claimable ticket: the number of slots during which the ticket stays within the reward window, before it can no longer be claimed. |

### `PUT /pow/mining/start`

Starts PoW mining. The setting isn't persisted, so the node stops mining when it restarts. While auto-claim is armed, the node also stops mining when every auto-claim target has reached its threshold.

### `PUT /pow/mining/stop`

Stops PoW mining.

### `PUT /pow/auto-claim/start`

Starts auto-claim. At every tick, the node pays the claimable rewards to the configured target that holds the lowest balance among those still below their threshold.

The node ignores this request if PoW rewards are disabled or if no auto-claim targets are configured. Auto-claim stops itself, and stops mining, when every target has reached its threshold.

### `PUT /pow/auto-claim/stop`

Stops auto-claim. You can still claim rewards manually with [`POST /pow/claim`](#post-powclaim).

### `POST /pow/claim`

Builds and submits a transaction that claims the node's currently claimable PoW rewards.

#### Request fields

The request body is optional.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `claim_address` | string | No | The ZK public key the rewards are paid to. If you omit this field or the whole body, the node pays the auto-claim target that holds the lowest balance among those still below their threshold. In that case, the request fails if no targets are configured or every target has reached its threshold. |

:::warning
The node doesn't reject a request body it can't parse. If the body isn't valid JSON, or `claim_address` isn't a valid ZK public key, the node treats the request as if it had no body and pays the auto-claim target instead.
:::

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `tx_hash` | string or `null` | The hash of the submitted reward-claim transaction. `null` if there were no rewards to claim. |

## Administration

### `PUT /admin/tracing/filter`

Replaces the node's log filter while the node runs.

#### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `filters` | object | Yes | An object that maps each log target to a level: `trace`, `debug`, `info`, `warn`, or `error`. Use the `*` key to set the default level for every target. |

For example:

```json
{
  "filters": {
    "*": "info"
  }
}
```

#### Response

Returns `200` with a `null` body on success.
