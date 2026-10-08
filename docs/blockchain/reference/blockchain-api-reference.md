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

This page describes the HTTP endpoints a Logos Blockchain node exposes for inspecting its state and for controlling Proof-of-Work (PoW) mining and reward claiming.

## Conventions

- Requests and responses use JSON. None of the `GET` and `PUT` endpoints on this page take a request body or query parameters.
- Hashes, block IDs, and ZK public keys are 32-byte values encoded as 64-character hexadecimal strings without a `0x` prefix.
- Peer IDs are libp2p peer IDs encoded as base58 strings.
- Slots, epochs, and token amounts are unsigned integers.

### Error responses

When a request fails, every endpoint returns a non-`200` status code (`500` for the endpoints on this page) with the following body:

| Field | Type | Description |
| --- | --- | --- |
| `code` | integer | The HTTP status code of the response. |
| `message` | string | A human-readable description of the error. |

## Consensus and blocks

### `GET /cryptarchia/info`

Gets the consensus state information for the node.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `cryptarchia_info` | object | The node's current view of the chain. |
| `cryptarchia_info.lib` | string | The ID of the latest immutable block (LIB), the most recent block that can no longer be reorganized. |
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

## Mantle and mempool

### `GET /mantle/metrics`

Gets metrics about the node's transaction mempool.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `pending_items` | integer | The number of transactions pending in the mempool. |
| `last_item_timestamp` | integer | The time the most recent transaction was added to the mempool, in milliseconds since the Unix epoch. `0` if no transaction has been added. |

## Network and Blend

### `GET /network/info`

Gets information about the node's peer connectivity.

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `listen_addresses` | array of strings | The multiaddresses the node listens on. |
| `peer_id` | string | The peer ID of this node. |
| `connected_peers` | array of strings | The peer IDs of the peers the node is connected to. |
| `discovered_peers` | array of strings | The peer IDs of the peers the node has discovered through Kademlia. A discovered peer isn't necessarily connected. |
| `n_peers` | integer | The number of connected peers. |
| `n_connections` | integer | The total number of connections, both pending and established. A peer can have more than one connection. |
| `n_discovered_peers` | integer | The number of entries in `discovered_peers`. |
| `n_pending_connections` | integer | The number of connections, incoming and outgoing, that aren't established yet. |

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

## Proof-of-Work

The four `PUT` endpoints in this section take no request body. On success, each returns status `200` with a `null` JSON body. The response confirms only that the node received the command, so use [`GET /pow/status`](#get-powstatus) to check the resulting state.

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
| `slots_until_expiry` | array of integers | One entry per claimable ticket: the number of slots the ticket stays within the reward window before it can no longer be claimed. |

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

#### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `tx_hash` | string or `null` | The hash of the submitted reward-claim transaction. `null` if there were no rewards to claim. |
