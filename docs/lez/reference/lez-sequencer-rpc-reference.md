---
title: LEZ sequencer RPC reference
doc_type: reference
product: lez
owner: logos
mdx:
  format: md
sidebar_position: 100
description: Look up every JSON-RPC method a LEZ sequencer serves.
custom_edit_url: https://github.com/logos-blockchain/logos-execution-zone/blob/dev/lez/sequencer/service/rpc/src/lib.rs
source_repo: logos-blockchain/logos-execution-zone
source_version: v0.3.2
---

# LEZ sequencer RPC reference

#### Look up every JSON-RPC method a LEZ sequencer serves.

:::note[Mirrored page]
This page mirrors [`lez/sequencer/service/rpc/src/lib.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.2/lez/sequencer/service/rpc/src/lib.rs) from
`logos-execution-zone` v0.3.2, and is regenerated automatically after each release. To change it, edit
the source in [`logos-blockchain/logos-execution-zone`](https://github.com/logos-blockchain/logos-execution-zone), not this page.
:::

The server speaks JSON-RPC 2.0. Parameter and return types are the Rust types the server is written against; most come from the [`sequencer_service_protocol`](https://github.com/logos-blockchain/logos-execution-zone/tree/v0.3.2/lez/sequencer/service/protocol) crate, and their JSON shape is their `serde` serialisation. A failed call returns a JSON-RPC error object.

## Methods

| Name | Parameters | Returns |
| --- | --- | --- |
| [`sendTransaction`](#sendtransaction) | `tx` | `HashType` |
| [`getFeeState`](#getfeestate) | None | `FeeStateQuote` |
| [`checkHealth`](#checkhealth) | None | None |
| [`getBlock`](#getblock) | `block_id` | `Option<Block>` |
| [`getBlockRange`](#getblockrange) | `start_block_id`, `end_block_id` | `Vec<Block>` |
| [`getLastBlockId`](#getlastblockid) | None | `BlockId` |
| [`getAccountBalance`](#getaccountbalance) | `account_id` | `u128` |
| [`getTransaction`](#gettransaction) | `tx_hash` | `Option<(LeeTransaction, BlockId)>` |
| [`getAccountsNonces`](#getaccountsnonces) | `account_ids` | `Vec<Nonce>` |
| [`getAccountView`](#getaccountview) | `shard_selector` | `Account` |
| [`getProofsAndRoot`](#getproofsandroot) | `commitments` | `(Vec<Option<MembershipProof>>, CommitmentSetDigest)` |
| [`getAccount`](#getaccount) | `account_id` | `Account` |
| [`getProgramIds`](#getprogramids) | None | `BTreeMap<String, ProgramId>` |
| [`getChannelId`](#getchannelid) | None | `ChannelId` |
| [`getCrossZoneDeadLetters`](#getcrosszonedeadletters) | None | `CrossZoneDeadLetterReport` |
| [`requeueCrossZoneDeadLetter`](#requeuecrosszonedeadletter) | `message_key` | `CrossZoneDeadLetterRequeue` |

### `sendTransaction`

Parameters, in order:

| Name | Type |
| --- | --- |
| `tx` | `LeeTransaction` |

Returns `HashType`.

### `getFeeState`

The head fee market: current base fees and the band the next block's
can move within, for sizing `max_fee` at submission time.

Takes no parameters.

Returns `FeeStateQuote`.

### `checkHealth`

Takes no parameters.

Returns no value: the result is `null`.

### `getBlock`

Parameters, in order:

| Name | Type |
| --- | --- |
| `block_id` | `BlockId` |

Returns `Option<Block>`.

### `getBlockRange`

Parameters, in order:

| Name | Type |
| --- | --- |
| `start_block_id` | `BlockId` |
| `end_block_id` | `BlockId` |

Returns `Vec<Block>`.

### `getLastBlockId`

Takes no parameters.

Returns `BlockId`.

### `getAccountBalance`

Parameters, in order:

| Name | Type |
| --- | --- |
| `account_id` | `AccountId` |

Returns `u128`.

### `getTransaction`

Parameters, in order:

| Name | Type |
| --- | --- |
| `tx_hash` | `HashType` |

Returns `Option<(LeeTransaction, BlockId)>`.

### `getAccountsNonces`

Parameters, in order:

| Name | Type |
| --- | --- |
| `account_ids` | `Vec<AccountId>` |

Returns `Vec<Nonce>`.

### `getAccountView`

Returns the account's nonce and the selected shard; its balance is the shard at the
native token program.

Parameters, in order:

| Name | Type |
| --- | --- |
| `shard_selector` | `ProgramShardSelector` |

Returns `Account`.

### `getProofsAndRoot`

Parameters, in order:

| Name | Type |
| --- | --- |
| `commitments` | `Vec<Commitment>` |

Returns `(Vec<Option<MembershipProof>>, CommitmentSetDigest)`.

### `getAccount`

Parameters, in order:

| Name | Type |
| --- | --- |
| `account_id` | `AccountId` |

Returns `Account`.

### `getProgramIds`

Takes no parameters.

Returns `BTreeMap<String, ProgramId>`.

### `getChannelId`

Takes no parameters.

Returns `ChannelId`.

### `getCrossZoneDeadLetters`

The cross-zone deliveries this sequencer has given up on.

Its own method rather than folded into `checkHealth`: one undeliverable
peer message must not read as an unhealthy node.

Takes no parameters.

Returns `CrossZoneDeadLetterReport`.

### `requeueCrossZoneDeadLetter`

Restores a dead-lettered cross-zone delivery to the pending list, with a
clean attempt count.

The operator move once the cause of the failures has cleared: a raised
mint cap, a fixed target program. A delivery that fails again is
dead-lettered again.

Like the rest of this surface it carries no authentication, so anyone
who can reach the RPC can requeue; the blast radius is bounded to
re-attempting deliveries this node already accepted from a peer.

Parameters, in order:

| Name | Type |
| --- | --- |
| `message_key` | `HashType` |

Returns `CrossZoneDeadLetterRequeue`.
