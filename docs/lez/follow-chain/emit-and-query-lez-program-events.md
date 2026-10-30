---
title: Emit and query LEZ program events
doc_type: procedure
product: lez
topics:
  - lez
  - indexer
  - events
steps_layout: sectioned
authors: kashepavadan
owner: logos
doc_version: 1
slug: emit-and-query-lez-program-events
sidebar_position: 3
---

# Emit and query LEZ program events

#### Emit typed events from an LEZ program and read them back from an LEZ Indexer by program, selector, transaction or block range.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

A [Logos Execution Zone (LEZ)](../../get-started/glossary.md#logos-execution-zone) [program](../../get-started/glossary.md#program) can emit typed **events** while it runs: a deposit, a swap, a delivery, or anything else off-chain consumers should see without re-deriving it from state changes. An LEZ Indexer stores the events it is configured to keep and serves them over JSON-RPC with exact-match filtering. Events are the basis for explorers, bots, bridges and any service that reacts to on-chain activity.

This procedure uses the bridge program's `Deposit` event in the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone/tree/v0.3.1) as its example. It walks through how a program defines and emits an event, how an indexer decides which events to keep, and how a client queries and streams them. It is for program developers who want to expose activity, and for developers building services that consume it.

Events are not stored in blocks and no hash commits to them. Re-executing a block produces them again, so any party holding the chain can re-derive the same event stream.

:::info[Prerequisites]

- A local clone of the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone) at `v0.3.1`, to read the example code.
- A running [LEZ Indexer](./run-lez-indexer.md) that follows a chain whose blocks finalise. The indexer serves JSON-RPC on `http://localhost:8779` by default.
- [`curl`](https://curl.se/) and [`jq`](https://jqlang.org/). To stream events, a WebSocket client such as [`websocat`](https://github.com/vi/websocat).
:::

## What to expect

- You can define an event type with a stable selector and emit it from a program's `plan` function.
- You can configure an LEZ Indexer to keep all events, or only the programs and selectors you care about.
- You can query stored events with `getEvents` and stream new ones with `subscribeToEvents`.

## Step 1: Define an event type and its selector

An event on the wire is a `ProgramEvent { selector: [u8; 8], data: Vec<u8> }`. The selector tells consumers which event type the data holds. By convention it is the first 8 bytes of `sha256("<program>::<EventName>")`, so consumers can compute it without a registry. Nothing enforces the convention at runtime.

1. Open [`lez/programs/bridge/core/src/event.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.1/lez/programs/bridge/core/src/event.rs). It defines the event as a struct that derives the `borsh` traits, pins the selector as a constant next to the name it is derived from, and provides byte conversions:

   ```rust
   #[derive(Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
   pub struct Deposit {
       pub l1_deposit_op_id: [u8; 32],
       pub recipient_id: AccountId,
       pub amount: u64,
   }

   impl Deposit {
       pub const SELECTOR: [u8; 8] = [0xcd, 0x49, 0x9a, 0xe5, 0x48, 0xcd, 0xf2, 0x3d];
       pub const SELECTOR_NAME: &str = "bridge::Deposit";

       pub fn to_bytes(&self) -> Vec<u8> {
           borsh::to_vec(self).expect("Deposit serializes")
       }

       pub fn from_bytes(bytes: &[u8]) -> borsh::io::Result<Self> {
           borsh::from_slice(bytes)
       }
   }
   ```

   Put the event types in a `core` crate that both the program and its off-chain consumers depend on, so both sides decode the same layout.

1. Add a unit test that checks the constant matches its derivation, as the bridge does:

   ```rust
   #[test]
   fn event_selectors_match_their_derivations() {
       use sha2::Digest as _;

       assert_eq!(
           Deposit::SELECTOR[..],
           sha2::Sha256::digest(Deposit::SELECTOR_NAME.as_bytes())[..8]
       );
   }
   ```

   - To compute a selector from the command line, run `printf 'bridge::Deposit' | sha256sum | cut -c1-16`. The output is `cd499ae548cdf23d`, the same hex string you use in queries.

## Step 2: Emit the event from `plan`

Events are declared in a program's `plan` function, the state-blind entrypoint that also declares the program's effects and chained calls.

1. Open [`lez/programs/bridge/src/main.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.1/lez/programs/bridge/src/main.rs) and find the end of `plan`. After declaring its effect and its chained transfer, the bridge emits the deposit:

   ```rust
   plan.event(ProgramEvent {
       selector: bridge_core::event::Deposit::SELECTOR,
       data: bridge_core::event::Deposit {
           l1_deposit_op_id,
           recipient_id,
           amount,
       }
       .to_bytes(),
   });
   plan
   ```

   `plan.event(..)` adds the event to `PlanOutput.events`. It changes no state.

1. Note how the runtime records the event. When the transaction executes, the runtime stamps each event with the emitting program's account ID, taken from the call frame rather than from the program, and stores it as a `TransactionEvent { account_id, event }`. A program cannot emit an event that appears to come from another program. Within a transaction:

   - Events come out in emission order, and events from chained calls follow depth-first pre-order.
   - An event from a chained call is attributed to the program that was called, not to its caller.
   - Events are grouped per transaction as `TxEvents { tx_index, tx_hash, events }`.

:::warning
Events are a public-execution feature. A privacy-preserving transaction drops its events to protect function privacy, so a program run privately emits nothing an indexer can read.
:::

## Step 3: Configure which events the indexer keeps

Each indexer decides at ingest which events to store, through the `event_filter` key in its configuration file, such as `lez/indexer/service/configs/debug/indexer_config.json`. Events the filter drops are never written.

1. Check the `event_filter` value in your indexer configuration. Choose one of the following:

   - Keep every event. The shipped configurations use this:

     ```json
     "event_filter": "archival"
     ```

   - Keep only declared programs. Each source names a program by its base58 account ID, with an optional list of hex selectors. A source without `selectors` keeps all of that program's events:

     ```json
     "event_filter": {
       "sources": [
         { "program_id": "<program-account-id>" },
         { "program_id": "<other-program-account-id>", "selectors": ["cd499ae548cdf23d"] }
       ]
     }
     ```

     Replace `<program-account-id>` and `<other-program-account-id>` with the base58 account IDs of the programs to watch.

   - If you omit `event_filter`, the indexer keeps nothing, prints a warning at startup, and rejects every event query. A source with an empty `selectors` list, or a program listed twice, fails startup.

1. Restart the indexer after changing the filter. The indexer records each filter change as a history segment that starts at the next block, so it knows which block ranges each filter covered. A query that asks for events a past filter did not keep is rejected with `UncoveredEventQuery`, rather than returning a silently incomplete result.

## Step 4: Query events with `getEvents`

`getEvents` takes one filter object. With `tx_hash` set, it returns the events of that transaction. Otherwise `from_block` is required and `to_block` defaults to the indexer's tip.

:::info
The indexer only ingests finalised blocks, so an event becomes available to query once its block finalises. On a stack whose blocks do not finalise, only genesis events are ever stored.
:::

1. Query the bridge's `Deposit` events from block 1 onwards:

   ```bash
   curl -s -X POST http://localhost:8779 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getEvents","params":[{"from_block":1,"selector":"cd499ae548cdf23d"}]}' | jq .
   ```

   **Expected result:** `result` is an array of event records, empty if no deposit has finalised in the range. Each record has these fields:

   | Field | Description |
   | :--- | :--- |
   | `block_id` | The block that contains the transaction. |
   | `tx_index` | The transaction's position in the block. |
   | `tx_hash` | The transaction hash. |
   | `program_account_id` | The program that emitted the event, as stamped by the runtime. |
   | `selector` | The event selector, as hex. |
   | `data` | The event data, base64-encoded. |

   The filter fields are:

   | Field | Description |
   | :--- | :--- |
   | `from_block` | First block to search. Required unless `tx_hash` is set. |
   | `to_block` | Last block to search. Defaults to the indexer's tip. A range may span at most 1,000 blocks. |
   | `tx_hash` | Return only this transaction's events. Takes precedence over the block range. |
   | `program_account_id` | Return only events from this program. |
   | `selector` | Return only events with this hex selector. |

   - Filters are exact-match and conjunctive: a record must match every field you set.
   - A response is capped at 8 MiB. Narrow the range or the filter if a query exceeds it.
   - With a `sources` filter configured, include `program_account_id`, and `selector` where the source lists selectors, so the indexer can confirm it kept everything you ask for.

1. Decode an event's `data` with the event type from Step 1. A `Deposit` is Borsh-encoded as 32 bytes of `l1_deposit_op_id`, 32 bytes of `recipient_id`, then `amount` as a little-endian `u64`:

   ```rust
   use base64::prelude::*;

   let bytes = BASE64_STANDARD.decode(&record.data)?;
   let deposit = bridge_core::event::Deposit::from_bytes(&bytes)?;
   ```

1. Fetch the events of a single transaction by its hash. Replace `<tx-hash>` with a `tx_hash` from a previous result:

   ```bash
   curl -s -X POST http://localhost:8779 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getEvents","params":[{"tx_hash":"<tx-hash>"}]}' | jq .
   ```

   - The full method schema, including every filter field, is available from the indexer's `getSchema` method.

## Step 5: Stream new events with `subscribeToEvents`

`subscribeToEvents` takes the same filter without the block range, and pushes each matching event record as it is ingested.

1. Open a WebSocket connection to the indexer and subscribe to `Deposit` events:

   ```bash
   websocat ws://localhost:8779
   ```

   Then send:

   ```json
   {"jsonrpc":"2.0","id":1,"method":"subscribeToEvents","params":[{"selector":"cd499ae548cdf23d"}]}
   ```

   **Expected result:** the indexer replies with a subscription ID, then sends one notification per matching event record as new blocks finalise.

1. To read events from C or another language with C bindings, use the FFI instead of RPC. The indexer FFI exposes `query_events(indexer, from_block, to_block, tx_hash, program_account_id, selector)` in [`lez/indexer/ffi/src/api/query.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.1/lez/indexer/ffi/src/api/query.rs), and the sequencer FFI exposes `sequencer_ffi_query_events` with the same filter fields and span cap. Pass a null pointer for any filter you do not set, and free the returned vector when you are done.

## Troubleshooting

### Every query fails with `UncoveredEventQuery`

The indexer's filter did not keep the events you asked for, for some or all of the requested range. This includes an indexer with no `event_filter` set, which keeps nothing. Set `"event_filter": "archival"`, or add the program and selector to `sources`, and restart. Blocks ingested before the change remain uncovered.

### Queries return an empty array for recent transactions

The block holding the transaction has not finalised yet, or the transaction ran privately. Wait for finalisation and check that the program ran on the public execution path.

### A subscription returns an ID but no notifications arrive

No new blocks are finalising on the chain the indexer follows, so nothing new is ingested. Check the indexer's progress with `getLastFinalizedBlockId`, as in [Run an LEZ Indexer](./run-lez-indexer.md).
