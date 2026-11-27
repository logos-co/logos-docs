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
source_version: v0.4.0
---

# LEZ sequencer RPC reference

#### Look up every JSON-RPC method a LEZ sequencer serves.

:::note[Mirrored page]
This page mirrors [`lez/sequencer/service/rpc/src/lib.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.4.0/lez/sequencer/service/rpc/src/lib.rs) from
`logos-execution-zone` v0.4.0, and is regenerated automatically after each release. To change it, edit
the source in [`logos-blockchain/logos-execution-zone`](https://github.com/logos-blockchain/logos-execution-zone), not this page.
:::

The server speaks JSON-RPC 2.0. Parameter and return types are the Rust types the server is written against; most come from the [`sequencer_service_protocol`](https://github.com/logos-blockchain/logos-execution-zone/tree/v0.4.0/lez/sequencer/service/protocol) crate, and their JSON shape is their `serde` serialisation. A failed call returns a JSON-RPC error object.

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
| [`getTransactionReceipt`](#gettransactionreceipt) | `tx_hash` | `Option<TransactionReceipt>` |
| [`getAccountsNonces`](#getaccountsnonces) | `account_ids` | `Vec<Nonce>` |
| [`getAccountView`](#getaccountview) | `actor_state_selector` | `Option<Account>` |
| [`getPublications`](#getpublications) | `from_position`, `limit` | `PublicationsPage` |
| [`getMessagePath`](#getmessagepath) | `position` | `Option<MembershipProof>` |
| [`getRecoveryBinding`](#getrecoverybinding) | `address` | `Option<EncryptedNote>` |
| [`getProofsAndRoot`](#getproofsandroot) | `commitments`, `message_positions` | `( Vec<Option<MembershipProof>>, Vec<Option<MembershipProof>>, CommitmentSetDigest, )` |
| [`getAccount`](#getaccount) | `account_id` | `Option<Account>` |
| [`getProgramIds`](#getprogramids) | None | `BTreeMap<String, ProgramId>` |
| [`getChannelId`](#getchannelid) | None | `ChannelId` |
| [`getSequencerStatus`](#getsequencerstatus) | None | `SequencerStatus` |
| [`submitSystemApproval`](#submitsystemapproval) | `approval` | None |
| [`getSystemProposals`](#getsystemproposals) | None | `SystemProposalReport` |

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

### `getTransactionReceipt`

`None` for an unknown transaction, and for a block's trailing fee and clock transactions.

Parameters, in order:

| Name | Type |
| --- | --- |
| `tx_hash` | `HashType` |

Returns `Option<TransactionReceipt>`.

### `getAccountsNonces`

Parameters, in order:

| Name | Type |
| --- | --- |
| `account_ids` | `Vec<AccountId>` |

Returns `Vec<Nonce>`.

### `getAccountView`

Returns the account's nonce and the selected actor state; its balance is the actor state at
the native token program.

Parameters, in order:

| Name | Type |
| --- | --- |
| `actor_state_selector` | `Actor` |

Returns `Option<Account>`.

### `getPublications`

Parameters, in order:

| Name | Type |
| --- | --- |
| `from_position` | `CommitmentPosition` |
| `limit` | `PageLimit` |

Returns `PublicationsPage`.

### `getMessagePath`

Parameters, in order:

| Name | Type |
| --- | --- |
| `position` | `CommitmentPosition` |

Returns `Option<MembershipProof>`.

### `getRecoveryBinding`

Parameters, in order:

| Name | Type |
| --- | --- |
| `address` | `AccountId` |

Returns `Option<EncryptedNote>`.

### `getProofsAndRoot`

The membership paths of `commitments` and of the message leaves at `message_positions`,
all under the root returned with them.

Parameters, in order:

| Name | Type |
| --- | --- |
| `commitments` | `Vec<Commitment>` |
| `message_positions` | `Vec<CommitmentPosition>` |

Returns `( Vec<Option<MembershipProof>>, Vec<Option<MembershipProof>>, CommitmentSetDigest, )`.

### `getAccount`

Parameters, in order:

| Name | Type |
| --- | --- |
| `account_id` | `AccountId` |

Returns `Option<Account>`.

### `getProgramIds`

Takes no parameters.

Returns `BTreeMap<String, ProgramId>`.

### `getChannelId`

Takes no parameters.

Returns `ChannelId`.

### `getSequencerStatus`

What the sequencer is doing: bootstrapping from the channel, or online.

Takes no parameters.

Returns `SequencerStatus`.

### `submitSystemApproval`

Hands the node a committee member's approval of a `system_upgrader` change: a borsh
`SignedApproval`, as `approve_system_change` prints it.

Parameters, in order:

| Name | Type |
| --- | --- |
| `approval` | `HexBytes` |

Returns no value: the result is `null`.

### `getSystemProposals`

Takes no parameters.

Returns `SystemProposalReport`.
