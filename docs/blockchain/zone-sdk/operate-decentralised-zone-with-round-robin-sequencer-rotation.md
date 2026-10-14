---
title: Operate a decentralised Zone with round-robin sequencer rotation
doc_type: procedure
product: blockchain
topics: zone-sdk
steps_layout: sectioned
authors: pradovic, hansieodendaal, kashepavadan
owner: logos
doc_version: 3
slug: operate-decentralised-zone-with-round-robin-sequencer-rotation
sidebar_position: 3
---

# Operate a decentralised Zone with round-robin sequencer rotation

#### Get started with multi-sequencer channels using the Zone SDK and round-robin slot windows.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

This tutorial covers how to configure and operate a [Logos Blockchain](../../get-started/glossary.md#logos-blockchain) [channel](../../get-started/glossary.md#channel) with a committee of accredited sequencers that take turns publishing inscriptions to a Logos [Zone](../../get-started/glossary.md#zone). It is intended for zone developers using the [Zone SDK](https://github.com/logos-blockchain/logos-blockchain/tree/0.3.2/zone-sdk) who need to move from a single-sequencer setup to a decentralised one.

The Zone SDK currently supports **round-robin** rotation only. Each sequencer publishes inscriptions for `posting_timeframe` slots before the rotation advances to the next sequencer in the `accredited_keys` list. Other scheduling schemes (such as First-Write-Wins) are not yet available.

:::info[Prerequisites]

- An existing application using the Zone SDK, such as an [inscription program](./inscribe-data-on-chain-using-zone-sdk.md).
- At least one `Ed25519PublicKey` generated per committee member.
:::

## What to expect

- You can publish inscriptions from any sequencer at any time; the SDK holds pending transactions and drains them automatically when the sequencer's turn arrives.
- You can monitor each sequencer's turn status in real time using `subscribe_turn_to_write` or `subscribe_channel_view`.
- You can update the accredited key list to add or remove sequencers by submitting a `ChannelConfigOp`.

## Step 1: Size the rotation parameters

Choose values for `posting_timeframe` and `posting_timeout` before creating or reconfiguring the channel. These fields on [`ChannelState`](https://lip.logos.co/blockchain/raw/bedrock-v1.1-mantle-specification.html#message-ordering) control the rotation cadence and inactive-sequencer skip behaviour.

:::info
The [Mantle specification](https://lip.logos.co/blockchain/raw/bedrock-v1.1-mantle-specification.html) is the source of truth for the exact rotation algorithm. The guidance below is a practical summary.
::: 

1. Set `posting_timeframe` - the length of each sequencer's turn under normal circumstances - to at least the average slots-per-block of the Logos Blockchain.

   - A turn shorter than one block lets multiple sequencers become authorised within the same block, defeating the purpose of rotation.
   - As a rule of thumb, use a multiple: with a ~20 slots/block average, `posting_timeframe = 60` gives each sequencer roughly three blocks of ownership per turn.

1. Set `posting_timeout` to a value greater than or equal to `posting_timeframe`. `posting_timeout` is the time we wait for an inactive sequencer to publish before continuing to the next sequencer - all subsequent inactive sequencers have a turn of `posting_timeout` slots until one of them publishes. At that point, turns go back to being `posting_timeframe` slots long.

   - Values smaller than `posting_timeframe` make the timeout branch dominate cadence as soon as the authorised sequencer goes silent.

1. Confirm the worked example matches your intended behaviour before proceeding.

   A channel with three accredited keys, `posting_timeframe = 60`, and `posting_timeout = 180`:

   ```
   slots 0–59     → index 0
   slots 60–119   → index 1
   slots 120–179  → index 2
   slots 180–239  → index 0
   ...
   ```

   :::info
   The Zone SDK exposes the current rotation state to your sequencer in two forms:

   - The full `SequencerChannelView` (`subscribe_channel_view`)—a `tokio::sync::watch` receiver carrying `authorized_key_index`, `own_key_index`, `our_turn_to_write`, the current [slot](../../get-started/glossary.md#slot), and the turn window's `turn_to_write_slots`.
   - A focused `TurnNotification` (`subscribe_turn_to_write`) plus `Event::TurnNotification`—emitted only when the turn boundary actually changes.

   `our_turn_to_write` is the boolean a sequencer reads to decide whether it is currently authorised.
   :::

## Step 2: Publish inscriptions and monitor turn state

The Zone SDK queues inscriptions locally when it is not your sequencer's turn and posts them automatically when the turn arrives. You do not need to gate `publish` calls on turn state yourself.

1. Call `publish` from any task at any time.

   ```rust
   // From the drive task, once `Event::Ready` has fired.
   let (result, checkpoint) = sequencer.handle().publish(zone_block).await?;
   // `result.tx` is a `PendingTx::Inscription(...)`.
   // `checkpoint` is up to date with the new pending entry.
   // The post may not have hit the node yet if it is not our turn.
   ```

   - The SDK enqueues the transaction immediately if it is your turn and posts to the network.
   - The SDK enqueues the transaction with `posted: false` if it is not your turn; it drains automatically when the turn arrives.
   - A periodic `resubmit_interval` (default 30 s) re-drains pending publishes if your turn is current, covering transient network failures.

1. Subscribe to turn notifications to drive your UI or application logic. Choose one of the two surfaces based on your use case:

   - Use `TurnNotification` (edge-triggered) to wake the UI only when the turn boundary changes:

     ```rust
     use lb_zone_sdk::sequencer::Event;

     if let Event::TurnNotification { notification } = event {
         if notification.our_turn_to_write {
             println!(
                 "Our turn until slot {:?}",
                 notification.ends_at_slot,
             );
         } else {
             println!(
                 "Waiting for our turn; current authorized window ends at {:?}",
                 notification.ends_at_slot,
             );
         }
     }
     ```

   - Use `subscribe_channel_view` (snapshot) to read the full rotation state on every block, for example to render a status panel:

     ```rust
     let view_rx = sequencer.subscribe_channel_view();
     let view = view_rx.borrow().clone();
     if view.our_turn_to_write {
         // Authorized right now.
     } else if let (Some(own), Some(auth)) = (view.own_key_index, view.authorized_key_index) {
         println!(
             "Sequencer {} is publishing; we are sequencer {}.",
             auth, own,
         );
     }
     ```

     The view also carries `pending_publish_txs` and `queued_messages` so the UI can show how many inscriptions are waiting for the next turn.

1. Handle competing writes by listening for `Event::BlocksProcessed` events and checking `channel_update.orphaned()` for orphaned transactions. Republish these transactions with the latest parent.

   :::info
   Two sequencers can race on the same parent slot during rotation transitions or after a resync. The on-chain rule is: the first valid [inscription](../../get-started/glossary.md#inscription) wins; the loser's transaction is surfaced in `channel_update.orphaned()`.
   :::

   ```rust
   use lb_zone_sdk::sequencer::{ChannelUpdateTx, Event};

   if let Event::BlocksProcessed { channel_update, .. } = event {
       for entry in channel_update.orphaned() {
           if let ChannelUpdateTx::Inscription(info) = entry {
               let (result, checkpoint) = sequencer.handle().publish(info.payload.clone()).await?;
               // Persist `result` + `checkpoint` exactly as on the original publish.
           }
       }
   }
   ```

   - `channel_update` is a `ChannelUpdate` object. It is a `ChannelUpdate::Extension { adopted }` when nothing you hold became invalid, and a `ChannelUpdate::Conflict { common_prefix, adopted, orphaned }` when entries left the channel view. `orphaned()` is empty on an extension.
   - To keep your own state in step with a conflict, either revert every orphaned entry and apply every adopted one, or reset to finalised state and replay `channel_update.canonical_chain()`, the whole non-finalised view at the new tip. Your own publishes are applied at publish time and appear in `adopted` only after they were first reported orphaned.
   - `tests/src/cucumber/steps/zone/operations/policies.rs` in the `logos-blockchain` repository contains reference policies for this republish loop: `OrphanRepublishPolicy` (simple republish), `RepublishLineagePolicy` (for repeating payloads, so each intent lands once), `SortedConflictPolicy` (republish only when it preserves the channel's sorted order), and `BalanceAwarePolicy` (republish only when the account balance still allows it).
   - If the orphan was caused by an application-level conflict rather than a race, you can choose to drop the payload or deduplicate it against a higher-level transaction stream, or apply any other custom rule instead of republishing.

   :::note
   Channel transactions built outside the publish API are classified by shape, not by how they were submitted. One inscription plus at most one funding transfer surfaces as `ChannelUpdateTx::Inscription`; with withdrawals added, as `ChannelUpdateTx::AtomicWithdraw`; with one channel transfer and no withdrawals, as `ChannelUpdateTx::PinDeposit`. A lone channel config surfaces as `ChannelUpdateTx::Config`. Anything else surfaces as `ChannelUpdateTx::Custom(SignedOps)`.

   For `Custom` entries the SDK hands back the whole transaction, and it is up to the consumer to parse it (the `channel_inscriptions` helper extracts its inscriptions) and decide how to recover it. The main API is `publish`, `publish_atomic_withdraw`, and `publish_pin_deposit`.
   :::

   :::info[Stuck transactions]
   A pending transaction that stays out of a block for longer than `SequencerConfig::stale_refund_slots` (default 30 slots of the last irreversible block, `0` disables it) is recovered automatically when the SDK can sign it alone. Transactions from `publish`, `publish_atomic_withdraw`, and `publish_pin_deposit` are re-funded, re-signed, and posted again with the same message ID. Multi-signature and custom transactions are shed instead and reported in `orphaned()`, together with everything chained on them, so you prepare them, collect signatures, and submit them again.
   :::

## Step 3: Update the committee with a channel config op

Submit a channel config to add or remove sequencers from `accredited_keys`. Because a channel config overwrites the entire key list, you should re-include any keys that should remain accredited after the update.

1. Use `channel_config` directly when `configuration_threshold == 1`, that is, when you only need one sequencer's signature to change the configuration.

   ```rust
   use lb_core::mantle::{
       channel::{SlotTimeframe, SlotTimeout},
       ops::channel::VerifiedChannelKeys,
   };

   let new_keys = VerifiedChannelKeys::from([
       admin_pk,
       new_sequencer_b_pk,
       new_sequencer_c_pk,
   ]);

   let ((result, checkpoint), signed_tx) = sequencer
       .handle()
       .channel_config(
           new_keys,
           SlotTimeframe::from(60), // ~3 blocks per turn at 20 slots/block
           SlotTimeout::from(180),  // skip after 3 turn windows of inactivity
           1,                       // configuration_threshold (still single-admin)
           1,                       // transfer_threshold
       )
       .await?;
   ```

   `channel_config` funds, signs with the local key only, and submits the transaction. On finalisation, the SDK picks up the new config and the next `BlocksProcessed` event recomputes `our_turn_to_write` for every running sequencer.

1. Use the `prepare_channel_config` → `sign_with` → `submit_channel_config` flow when `configuration_threshold > 1`. In this case, collecting signatures from other sequencers is the responsibility of the application rather than the Zone SDK.

   - The proposer calls `prepare_channel_config` with the new configuration. The SDK builds and funds the config transaction and returns a `PreparedChannelConfig`.
   - Each key holder inspects `prepared.tx()` and signs with `prepared.sign_with(&key)`, which returns an `IndexedSignature` indexed against the channel's current accredited keys. A key holder without a running sequencer can call `sign_prepared(&key, &prepared.accredited_keys, &prepared.sign_payload)` instead.
   - The proposer gathers `prepared.signing_threshold` signatures, the channel's current `configuration_threshold`, into `IndexedSignatures` and submits them with `submit_channel_config`.

   ```rust
   use lb_core::mantle::{
       channel::{SlotTimeframe, SlotTimeout},
       ops::channel::VerifiedChannelKeys,
   };
   use lb_zone_sdk::sequencer::{IndexedSignature, IndexedSignatures};

   // 1. Propose the new configuration. The SDK builds and funds the tx.
   let prepared = sequencer
       .handle()
       .prepare_channel_config(
           VerifiedChannelKeys::from([admin_pk, sequencer_b_pk, sequencer_c_pk]),
           SlotTimeframe::from(60),
           SlotTimeout::from(180),
           2, // configuration_threshold
           1, // transfer_threshold
       )
       .await?;

   // 2. Distribute `prepared` to the rest of the committee; each key holder
   //    signs with `prepared.sign_with(&key)`. Transport is application-defined.
   let collected: Vec<IndexedSignature> = collect_signatures_from_committee(&prepared).await?;

   // 3. Gather the signatures, ordered by key index with at most one per key,
   //    and submit.
   let signatures = IndexedSignatures::try_from_iter(collected.into_iter().map(Into::into))?;
   let (result, checkpoint) = sequencer
       .handle()
       .submit_channel_config(prepared, signatures)?;
   ```

   - A signature authorises every channel operation in the prepared transaction, not only the config, so signers should inspect the whole of `prepared.tx()` before signing.
   - A config position holds one pending continuation, so `prepare_channel_config` refuses a second config on a parent that already has one pending until it lands or expires.
   - An orphaned multi-signature config surfaces as `ChannelUpdateTx::Config`. Recover it by running the prepare → collect signatures → submit flow again.
