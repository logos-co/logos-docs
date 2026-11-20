---
title: LEZ indexer RPC reference
doc_type: reference
product: lez
owner: logos
mdx:
  format: md
sidebar_position: 100
description: Look up every JSON-RPC method and subscription a LEZ indexer serves.
custom_edit_url: https://github.com/logos-blockchain/logos-execution-zone/blob/dev/lez/indexer/service/rpc/src/lib.rs
source_repo: logos-blockchain/logos-execution-zone
source_version: v0.3.2
---

# LEZ indexer RPC reference

#### Look up every JSON-RPC method and subscription a LEZ indexer serves.

:::note[Mirrored page]
This page mirrors [`lez/indexer/service/rpc/src/lib.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.2/lez/indexer/service/rpc/src/lib.rs) from
`logos-execution-zone` v0.3.2, and is regenerated automatically after each release. To change it, edit
the source in [`logos-blockchain/logos-execution-zone`](https://github.com/logos-blockchain/logos-execution-zone), not this page.
:::

The server speaks JSON-RPC 2.0. Parameter and return types are the Rust types the server is written against; most come from the [`indexer_service_protocol`](https://github.com/logos-blockchain/logos-execution-zone/tree/v0.3.2/lez/indexer/service/protocol) crate, and their JSON shape is their `serde` serialisation. A failed call returns a JSON-RPC error object.

## Methods

| Name | Parameters | Returns |
| --- | --- | --- |
| [`getSchema`](#getschema) | None | `serde_json::Value` |
| [`getLastFinalizedBlockId`](#getlastfinalizedblockid) | None | `Option<BlockId>` |
| [`getBlockById`](#getblockbyid) | `block_id` | `Option<Block>` |
| [`getBlockByHash`](#getblockbyhash) | `block_hash` | `Option<Block>` |
| [`getAccount`](#getaccount) | `account_id` | `Account` |
| [`getAccountAtBlock`](#getaccountatblock) | `account_id`, `block_id` | `Account` |
| [`getAccountSummary`](#getaccountsummary) | `account_id` | `AccountSummary` |
| [`getAccountView`](#getaccountview) | `selector` | `Account` |
| [`getAccountViewAtBlock`](#getaccountviewatblock) | `selector`, `block_id` | `Account` |
| [`getTransaction`](#gettransaction) | `tx_hash` | `Option<Transaction>` |
| [`getBlocks`](#getblocks) | `before`, `limit` | `Vec<Block>` |
| [`getTransactionsByAccount`](#gettransactionsbyaccount) | `account_id`, `offset`, `limit` | `Vec<Transaction>` |
| [`getEvents`](#getevents) | `filter` | `Vec<EventRecord>` |
| [`getStatus`](#getstatus) | None | `IndexerStatus` |
| [`checkHealth`](#checkhealth) | None | None |

### `getSchema`

Takes no parameters.

Returns `serde_json::Value`.

### `getLastFinalizedBlockId`

Takes no parameters.

Returns `Option<BlockId>`.

### `getBlockById`

Parameters, in order:

| Name | Type |
| --- | --- |
| `block_id` | `BlockId` |

Returns `Option<Block>`.

### `getBlockByHash`

Parameters, in order:

| Name | Type |
| --- | --- |
| `block_hash` | `HashType` |

Returns `Option<Block>`.

### `getAccount`

Parameters, in order:

| Name | Type |
| --- | --- |
| `account_id` | `AccountId` |

Returns `Account`.

### `getAccountAtBlock`

Parameters, in order:

| Name | Type |
| --- | --- |
| `account_id` | `AccountId` |
| `block_id` | `BlockId` |

Returns `Account`.

### `getAccountSummary`

The account's balance, nonce, and one entry per shard carrying its size only.
Safe to call on any account: unlike `getAccount`, the response does not grow
with shard contents.

Parameters, in order:

| Name | Type |
| --- | --- |
| `account_id` | `AccountId` |

Returns `AccountSummary`.

### `getAccountView`

Parameters, in order:

| Name | Type |
| --- | --- |
| `selector` | `ProgramShardSelector` |

Returns `Account`.

### `getAccountViewAtBlock`

Parameters, in order:

| Name | Type |
| --- | --- |
| `selector` | `ProgramShardSelector` |
| `block_id` | `BlockId` |

Returns `Account`.

### `getTransaction`

Parameters, in order:

| Name | Type |
| --- | --- |
| `tx_hash` | `HashType` |

Returns `Option<Transaction>`.

### `getBlocks`

Parameters, in order:

| Name | Type |
| --- | --- |
| `before` | `Option<BlockId>` |
| `limit` | `u64` |

Returns `Vec<Block>`.

### `getTransactionsByAccount`

Parameters, in order:

| Name | Type |
| --- | --- |
| `account_id` | `AccountId` |
| `offset` | `u64` |
| `limit` | `u64` |

Returns `Vec<Transaction>`.

### `getEvents`

Parameters, in order:

| Name | Type |
| --- | --- |
| `filter` | `GetEventsFilter` |

Returns `Vec<EventRecord>`.

### `getStatus`

Takes no parameters.

Returns `IndexerStatus`.

### `checkHealth`

Takes no parameters.

Returns no value: the result is `null`.

## Subscriptions

| Name | Parameters | Item |
| --- | --- | --- |
| [`subscribeToFinalizedBlocks`](#subscribetofinalizedblocks) | None | `BlockId` |
| [`subscribeToEvents`](#subscribetoevents) | `filter` | `EventRecord` |

### `subscribeToFinalizedBlocks`

Takes no parameters.

Each notification carries `BlockId`.

### `subscribeToEvents`

Parameters, in order:

| Name | Type |
| --- | --- |
| `filter` | `EventSubscriptionFilter` |

Each notification carries `EventRecord`.
