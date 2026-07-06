---
title: Operate a decentralised Zone with round-robin sequencer rotation
doc_type: procedure
product: blockchain
topics: zone-sdk
steps_layout: sectioned
authors: pradovic, hansieodendaal, kashepavadan
owner: logos
doc_version: 1
slug: operate-decentralised-zone-with-round-robin-sequencer-rotation
---

# Operate a decentralised Zone with round-robin sequencer rotation

#### Get started with multi-sequencer channels using the Zone SDK and round-robin slot windows.

This tutorial covers how to configure and operate a [Logos Blockchain](https://docs.logos.co/get-started/glossary#logos-blockchain) [channel](https://docs.logos.co/get-started/glossary#channel) with a committee of accredited sequencers that take turns publishing inscriptions to a Logos [Zone](https://docs.logos.co/get-started/glossary#zone). It is intended for zone developers using the [Zone SDK](https://github.com/logos-blockchain/logos-blockchain/tree/master/zone-sdk) who need to move from a single-sequencer setup to a decentralized one.

The [Zone SDK](https://docs.logos.co/get-started/glossary#zone-sdk) currently supports **round-robin** rotation only. Each sequencer publishes inscriptions for `posting_timeframe` slots before the rotation advances to the next sequencer in the `accredited_keys` list. Other scheduling schemes (such as First-Write-Wins) are not yet available.

Before you start, make sure you have the following:

- An existing application using the [Zone SDK](./inscribe-data-on-chain-using-zone-sdk.md)
- At least one `Ed25519PublicKey` generated per committee member

## What to expect

- You can publish inscriptions from any sequencer at any time; the SDK holds pending transactions and drains them automatically when the sequencer's turn arrives.
- You can monitor each sequencer's turn status in real time using `subscribe_turn_to_write` or `subscribe_channel_view`.
- You can update the accredited key list to add or remove sequencers by submitting a `ChannelConfigOp`.

## Step 1: Size the rotation parameters

Choose values for `posting_timeframe` and `posting_timeout` before creating or reconfiguring the channel. These fields on [`ChannelState`](https://nomos-tech.notion.site/1-5-0-Mantle-33d261aa09df8051b0d0cd4d5ddade85#e9c261aa09df839b8f1d81a357aaf616) control the rotation cadence and inactive-sequencer skip behavior.

{% hint style="info" %}
The [Mantle specification](https://nomos-tech.notion.site/1-5-0-Mantle-33d261aa09df8051b0d0cd4d5ddade85#5d6261aa09df836f9638814e35f5fe81) is the source of truth for the exact rotation algorithm. The guidance below is a practical summary.
{% endhint %} 

1. Set `posting_timeframe` - the length of each sequencer's turn under normal circumstances - to at least the average slots-per-block of the Logos Blockchain.

   - A turn shorter than one block lets multiple sequencers become authorized within the same block, defeating the purpose of rotation.
   - As a rule of thumb, use a multiple: with a ~20 slots/block average, `posting_timeframe = 60` gives each sequencer roughly three blocks of ownership per turn.

1. Set `posting_timeout` to a value greater than or equal to `posting_timeframe`. `posting_timeout` is the time we wait for an inactive sequencer to publish before continuing to the next sequencer - all subsequent inactive sequencers have a turn of `posting_timeout` slots until one of them publishes. At that point, turns go back to being `posting_timeframe` slots long.

   - Values smaller than `posting_timeframe` make the timeout branch dominate cadence as soon as the authorized sequencer goes silent.

1. Confirm the worked example matches your intended behavior before proceeding.

   A channel with three accredited keys, `posting_timeframe = 60`, and `posting_timeout = 180`:

   ```
   slots 0–59     → index 0
   slots 60–119   → index 1
   slots 120–179  → index 2
   slots 180–239  → index 0
   ...
   ```

    {% hint style="info" %}
   The Zone SDK exposes the current rotation state to your sequencer in two forms:
   
   - The full `SequencerChannelView` (`subscribe_channel_view`) — a `tokio::sync::watch` receiver carrying `authorized_key_index`, `own_key_index`, `our_turn_to_write`, the current [slot](https://docs.logos.co/get-started/glossary#slot), and the turn window's `turn_to_write_slots`.
   - A focused `TurnNotification` (`subscribe_turn_to_write`) plus `Event::TurnNotification` — emitted only when the turn boundary actually changes.
   
   `our_turn_to_write` is the boolean a sequencer reads to decide whether it is currently authorised.
   {% endhint %}

## Step 2: Publish inscriptions and monitor turn state

The Zone SDK queues inscriptions locally when it is not your sequencer's turn and posts them automatically when the turn arrives. You do not need to gate `publish` calls on turn state yourself.

1. Call `publish` from any task at any time.

   ```rust
   // From the drive task, once `Event::Ready` has fired.
   let (result, checkpoint) = sequencer.handle().publish(zone_block)?;
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

1. Handle competing writes by listening for `Event::BlocksProcessed` events and checking `channel_update.orphaned` for orphaned transactions. Republish these transactions with the latest parent.

{% hint style="info" %}
Two sequencers can race on the same parent slot during rotation transitions or after a resync. The on-chain rule is: the first valid [inscription](https://docs.logos.co/get-started/glossary#inscription) wins; the loser's transaction is surfaced in `channel_update.orphaned`.
{% endhint %} 

   ```rust
   use lb_zone_sdk::sequencer::{Event, OrphanedTx};

   if let Event::BlocksProcessed { channel_update, .. } = event {
       for entry in channel_update.orphaned {
           if let OrphanedTx::Inscription(info) = entry {
               let (result, checkpoint) = sequencer.handle().publish(info.payload)?;
               // Persist `result` + `checkpoint` exactly as on the original publish.
           }
       }
   }
   ```

   - See `OrphanRepublishPolicy` in `tests/src/cucumber/steps/manual_zone/support.rs` for the reference policy used in integration tests.
   - If the orphan was caused by an application-level conflict rather than a race, you can choose to drop the payload or deduplicate it against a higher-level transaction stream, or apply any other custom rule instead of republishing.

## Step 3: Update the committee with a channel config op

Submit a `ChannelConfigOp` to add or remove sequencers from `accredited_keys`. Because `ChannelConfigOp` overwrites the entire key list, you should re-include any keys that should remain accredited after the update.

1. Use `channel_config` directly when `configuration_threshold == 1` - that is, when you only need one sequencer's signature to change the configuration.

   ```rust
   use lb_core::mantle::channel::{SlotTimeframe, SlotTimeout};
   use lb_core::mantle::ops::channel::config::Keys;

   let new_keys = Keys::from(vec![
       admin_pk,
       new_sequencer_b_pk,
       new_sequencer_c_pk,
   ]);

   let (result, checkpoint, signed_tx) = sequencer.handle().channel_config(
       new_keys,
       SlotTimeframe::from(60),   // ~3 blocks per turn at 20 slots/block
       SlotTimeout::from(180),    // skip after 3 turn windows of inactivity
       1,                          // configuration_threshold (still single-admin)
       1,                          // withdraw_threshold
   )?;
   ```

   On finalization, `refresh_channel_state` picks up the new config and the next `BlocksProcessed` event recomputes `our_turn_to_write` for every running sequencer.

1. Use the `prepare_tx` + `submit_signed_tx` flow when `configuration_threshold > 1`. In this case, collecting signatures from other sequencers is the responsibility of the application rather than the Zone SDK.

{% hint style="info" %}
Multi-admin config changes are not yet exercised by integration tests; treat the flow below as the reference path until full SDK support lands.
{% endhint %} 

   - The proposer calls `prepare_tx` with a `ChannelConfigOp` payload and distributes the unsigned transaction to the rest of the committee.
   - Each co-signer calls `sign_tx` and returns an `IndexedSignature`.
   - The proposer assembles a `ChannelMultiSigProof` from the collected signatures and submits via `submit_signed_tx`.

   ```rust
   use lb_core::mantle::{
       Op, SignedMantleTx,
       ops::{OpProof, channel::config::ChannelConfigOp},
   };
   use lb_core::proofs::channel_multi_sig_proof::{ChannelMultiSigProof, IndexedSignature};

   // 1. Read this sequencer's index from the channel view.
   let view = sequencer.subscribe_channel_view().borrow().clone();
   let own_key_index = view.own_key_index.ok_or("not an accredited key")?;

   // 2. Build the unsigned config tx and get this sequencer's own signature.
   let config = ChannelConfigOp {
       channel,
       keys: new_keys,
       posting_timeframe,
       posting_timeout,
       configuration_threshold,
       withdraw_threshold,
   };
   let (tx, msg_id, own_sig) = sequencer.handle().prepare_tx(
       [Op::ChannelConfig(config)].into(),
       inscription_payload,
   )?;

   // 3. Distribute `tx` to the rest of the committee, collect their
   //    `IndexedSignature`s. Transport is application-defined.
   let signatures: Vec<IndexedSignature> = collect_signatures_from_committee(
       &tx,
       IndexedSignature::new(own_key_index, own_sig.clone()),
   ).await?;

   // 4. Assemble the threshold proof and submit.
   let config_proof = ChannelMultiSigProof::new(signatures)?;
   let signed_tx = SignedMantleTx::new(
       tx,
       vec![
           OpProof::ChannelMultiSigProof(config_proof),
           OpProof::Ed25519Sig(own_sig),
       ],
   )?;
   let (result, checkpoint) = sequencer
       .handle()
       .submit_signed_tx(signed_tx, msg_id)?;
   ```
