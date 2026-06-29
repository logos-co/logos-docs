---
title: Bridge assets between Logos Blockchain and a Zone
doc_type: procedure
product: blockchain
topics: [bridging, channels, zones, withdrawals, deposits]
steps_layout: sectioned
authors: youngjoon-lee, kashepavadan
owner: logos
doc_version: 1
slug: bridge-assets-between-blockchain-and-zone
---

# Bridge assets between Logos Blockchain and a Zone

#### Move tokens between Logos Blockchain and a Zone using channels and the Zone SDK.

[Logos Zones](../concepts/about-zones.md) are customizable, high-performance blockchains for applications built on Logos. Logos Blockchain notes can be bridged from [Bedrock](../concepts/about-bedrock.md) to Zones, with the Zone's associated channel maintaining a token balance that keeps track of the total token value stored in the Zone. 

This procedure covers creating a channel, depositing notes from the Blockchain into a Zone, and withdrawing notes from a Zone back to the Blockchain, using the Zone SDK's `ZoneSequencer`. It applies to Zone developers building sequencers and indexers; the Zone itself defines how the channel balance maps to its internal accounts, while the SDK only surfaces the on-chain events.

Bridging has two directions: deposit (Blockchain to Zone), where a user funds a channel and the Zone sequencer credits the user internally (`ChannelDeposit`), and withdraw (Zone to Blockchain), where the sequencer submits a signed `ChannelWithdraw` to debit the channel and mint fresh notes on-chain.

{% hint style="info" %}

The Zone SDK currently supports the bundled withdrawal API only for single-sequencer Zones (`ChannelState.withdraw_threshold == 1`). Multi-sequencer Zones require building the threshold proof manually, as covered in a later step.

{% endhint %}

Before you start, make sure you have:

- A running Logos Blockchain node reachable over HTTP
- The Zone SDK (`lb_zone_sdk`) and `lb_core` crates added to your project
- Completed the [Zone SDK inscription tutorial](./inscribe-data-on-chain-using-zone-sdk.md)

## What to expect

- You can create a channel and have it recognized on-chain without a separate deployment transaction.
- You can observe finalized deposits on your channel as they are credited inside the zone.
- You can submit single- or multi-signature withdrawals and confirm them once finalized, including after a reorg.

## Step 1: Create a channel

A channel is created automatically the first time an operation references a previously unseen `ChannelId`.

1. Generate a [`Ed25519Key`](https://github.com/logos-blockchain/logos-blockchain/blob/master/kms/keys/src/keys/ed25519/mod.rs#L31) for your sequencer. The private key is used to sign inscriptions and channel operations, while the public key defines the `ChannelId`. An example implementation is shown below:

   ```rust
   // Generate Ed25519 key pair
   let mut key_bytes = [0u8; ED25519_SECRET_KEY_SIZE];
   rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut key_bytes);
   std::fs::write(&your_key_file_path, key_bytes).expect("failed to write key file");
   let signing_key = Ed25519Key::from_bytes(&key_bytes);

   // Derive channel ID
   let channel_id = ChannelId::from(signing_key.public_key().to_bytes());
   ```

   The bridging-relevant fields on [`ChannelState`](https://app.notion.com/p/nomos-tech/1-5-0-Mantle-33d261aa09df8051b0d0cd4d5ddade85?source=copy_link#22b261aa09df8289a3f281de4aa8fdca) in the Mantle specification:

    | Field                | Purpose                                                              |
    | -------------------- | -------------------------------------------------------------------- |
    | `balance`            | On-chain TokenValue held by the channel. Deposits add, withdrawals subtract. Defaults to 0. |
    | `withdrawal_nonce`   | Increments by 1 on every successful withdraw. Provides replay protection. |
    | `withdraw_threshold` | Minimum number of accredited-key signatures needed to authorize a withdrawal. Defaults to 0. |
    | `accredited_keys`    | The committee that may sign withdrawals. |

   
1. Initialize a `ZoneSequencer` and publish the first inscription inside your event loop once `Event::Ready` has fired. The channel is created on-chain automatically, naming this sequencer's key as the sole accredited key.

   ```rust
   use lb_zone_sdk::{
       CommonHttpClient, adapter::NodeHttpClient, sequencer::ZoneSequencer,
   };

   // Connect to the Logos Blockchain node.
   let node = NodeHttpClient::new(
       CommonHttpClient::new(None),
       "http://localhost:8080".parse()?,
   );

   // Initialize the sequencer for this channel
   let mut sequencer = ZoneSequencer::init(channel_id, signing_key, node, None);

   // Inside the event loop, once `Event::Ready` has fired:
   // Publishing the first inscription creates the channel just-in-time.
   let (result, checkpoint) = sequencer.handle().publish(genesis_zone_block)?;
   ```

   `publish` returns synchronously after enqueueing the transaction into the sequencer's pending set; the post reaches the node the next time the event loop polls `next_event`. Persist the returned `PublishResult` and `SequencerCheckpoint` into your outbox.

1. (Optional) Reconfigure the channel by calling `sequencer.handle().channel_config(..)` with a [`ChannelConfig`](https://app.notion.com/p/nomos-tech/1-5-0-Mantle-33d261aa09df8051b0d0cd4d5ddade85?source=copy_link#f96261aa09df826a93d801db1e432a54) operation.

## Step 2: Observe deposits from Bedrock

A deposit happens when a Bedrock user submits a transaction with a [`ChannelDeposit`](https://app.notion.com/p/nomos-tech/1-5-0-Mantle-33d261aa09df8051b0d0cd4d5ddade85?source=copy_link#80b261aa09df8353814a81efe0fbd8ed) operation naming the target `channel`, the consumed `inputs`, and opaque `metadata` that the Zone interprets, such as a recipient address.

1. Watch for finalized deposits inside your events loop. The Zone SDK surfaces every finalized deposit on your channel as a `FinalizedOp::Deposit(DepositInfo)` inside the `finalized` field of `Event::BlocksProcessed`.

   ```rust
   use lb_zone_sdk::sequencer::{Event, FinalizedOp};

   if let Event::BlocksProcessed { finalized, .. } = event {
       // Iterate over every finalized transaction in this batch of blocks.
       for tx in finalized {
           for op in tx.ops {
               if let FinalizedOp::Deposit(deposit) = op {
                   // Credit the user inside the Zone according to the Zone's internal rules.
                   println!(
                       "Deposit of {} with metadata {:?}",
                       deposit.amount, deposit.metadata,
                   );
               }
           }
       }
   }
   ```

   `Event::BlocksProcessed` fires once per ingested block, whether live or backfilled, and only carries finalized items at or below LIB, so deposits surfaced here cannot be re-orged off the chain.

1. Credit the user inside the Zone according to the Zone's internal state transition function rules.

## Step 3: Submit a withdrawal

The process of withdrawing funds is different for single-sequencer Zones and multiple-sequencer Zones with a withdraw threshold greater than one.

### Option 1: Submit a single-sequencer withdrawal

A withdrawal is initiated inside the zone and lands on-chain as a signed [`ChannelWithdraw`](https://app.notion.com/p/nomos-tech/1-5-0-Mantle-33d261aa09df8051b0d0cd4d5ddade85?source=copy_link#5de261aa09df8321b05401f2e8dea08b) operation. This step applies only when `ChannelState.withdraw_threshold == 1`.

1. Describe the withdrawal by building a `WithdrawArg` with the recipient `Outputs`. The SDK fills in the `channel_id` and reads the current `withdraw_nonce` and accredited sequencer key.

   ```rust
   use lb_core::mantle::{Note, ledger::Outputs};
   use lb_zone_sdk::sequencer::WithdrawArg;

   // Describe what to withdraw: a single note to the recipient.
   let withdraw = WithdrawArg {
       outputs: Outputs::new([Note::new(50, recipient_pk)]),
   };
   ```

1. Submit the inscription bundled with the withdraw by calling `sequencer.handle().publish_atomic_withdraw(..)`.

   ```rust
   // Inside the drive task: submit the inscription bundled with the withdraw.
   let (result, checkpoint) = sequencer.handle().publish_atomic_withdraw(
       inscription_payload,   // the Zone block this withdraw goes with
       vec![withdraw],
   )?;
   ```

   Because the inscription and the withdrawal share one transaction, they become adopted, orphaned, or finalized as a unit, so the Zone block recording the withdrawal and the on-chain debit cannot drift apart.

   {% hint style="info" %}
   
   `publish_atomic_withdraw` returns the `PublishResult` synchronously. For a single-signature bundle, `PublishResult.tx` is a `PendingTx::AtomicWithdraw(AtomicWithdrawInfo)` carrying the inscription and the bundled withdraw operations.

   {% endhint %}

1. Check the finalized transactions in `Event::BlocksProcessed.finalized` against the pending transaction's `AtomicWithdrawInfo.tx_hash`. Because it is a bundle, both the inscription and the withdrawal will appear in the same `tx.ops` once the withdrawal is finalized.

   ```rust
   use lb_zone_sdk::sequencer::{Event, FinalizedOp};

   if let Event::BlocksProcessed { finalized, .. } = event {
       for tx in finalized {
           for op in tx.ops {
               match op {
                   FinalizedOp::Inscription(info) => {
                       // The Zone block carried with the withdrawal.
                       println!("Inscribed {:?} in tx {:?}", info.this_msg, info.tx_hash);

                       // Check if info.tx_hash matches the pending tx_hash
                   }
                   FinalizedOp::Withdraw(withdrawal) => {
                       // The on-chain debit.
                       println!("Withdrawn {:?} in tx {:?}", withdrawal.op, withdrawal.tx_hash);
                   }
                   FinalizedOp::Deposit(_) => {}
               }
           }
       }
   }
   ```

### Option 2: Submit a multi-sequencer withdrawal

When `withdraw_threshold > 1`, no single sequencer can authorize a withdrawal alone. The proposing sequencer builds the `ChannelWithdrawOp` directly, because it must commit to a specific `withdraw_nonce` before sharing the unsigned transaction with the rest of the committee.

1. Read the current `withdraw_nonce` and this sequencer's accredited-key index from the channel view.

   ```rust
   use lb_core::mantle::{
       Op, SignedMantleTx,
       ops::{OpProof, channel::withdraw::ChannelWithdrawOp},
   };
   use lb_core::proofs::channel_multi_sig_proof::{ChannelMultiSigProof, IndexedSignature};

   // 1. Read current nonce + this sequencer's accredited-key index from
   //    the channel view.
   let view = sequencer.subscribe_channel_view().borrow().clone();
   let withdraw_nonce = view
       .channel
       .as_ref()
       .ok_or("channel state not yet available")?
       .withdrawal_nonce;
   let own_key_index = view.own_key_index.ok_or("not an accredited key")?;
   ```

1. Build the unsigned transaction and obtain this sequencer's own signature by calling `handle.prepare_tx(ops, inscription)`.

   ```rust
   // 2. Build the unsigned tx and get this sequencer's own signature back.
   let withdraw = ChannelWithdrawOp {
       channel_id,
       outputs,
       withdraw_nonce,
   };
   let (tx, msg_id, own_sig) = sequencer.handle().prepare_tx(
       [Op::ChannelWithdraw(withdraw)].into(),
       inscription_payload,
   )?;
   ```

1. Share the unsigned transaction with the other accredited signers and collect their `IndexedSignature`s. Each signer calls `handle.sign_tx(&tx)` on the transaction the first sequencer proposes.

    {% hint style="info" %}

   Defining the committee transport - how proposals and signatures are exchanged - is outside the Zone SDK's scope.

   {% endhint %}

   ```rust
   // 3. Hand `tx` to the other accredited signers and collect their
   //    `IndexedSignature`s. Transport is application-defined.
   let signatures: Vec<IndexedSignature> = collect_signatures_from_committee(
       &tx,
       IndexedSignature::new(own_key_index, own_sig.clone()),
   ).await?;
   ```

1. Assemble the threshold proof and submit it once you have gathered `ChannelState.withdraw_threshold` signatures, by calling `handle.submit_signed_tx(signed_tx, msg_id)`.

   ```rust
   // 4. Assemble the threshold proof and submit.
   let withdraw_proof = ChannelMultiSigProof::new(signatures)?;
   let signed_tx = SignedMantleTx::new(
       tx,
       vec![
           OpProof::ChannelMultiSigProof(withdraw_proof),
           OpProof::Ed25519Sig(own_sig),
       ],
   )?;
   let (result, checkpoint) = sequencer
       .handle()
       .submit_signed_tx(signed_tx, msg_id)?;
   ```

   Keep the result and use the returned `tx_hash` to identify the bundle. Unlike the single-sig flow, the SDK treats the caller-built transaction as opaque, so `PublishResult.tx` is `PendingTx::Inscription(InscriptionInfo)` regardless of the underlying ops.

1. Match the finalized transaction by `tx_hash` once it appears in `Event::BlocksProcessed.finalized`, the same way as in the single-signature flow in Option 1.

## Step 4: Recover from a reorg

A reorg can orphan the parent inscription of a withdrawal submitted via `publish_atomic_withdraw`, which invalidates the original signed transaction.

1. Watch for orphaned transactions in the `channel_update` field of `Event::BlocksProcessed`. The abandoned transaction appears in `channel_update.orphaned`.

1. Reconstruct the original `WithdrawArg`s from the orphaned bundle and re-call `publish_atomic_withdraw` with the same inscription payload; the SDK refills the inscription parent and the `withdraw_nonce` from the current on-chain state.

   ```rust
   use lb_zone_sdk::sequencer::{Event, OrphanedTx, WithdrawArg};

   if let Event::BlocksProcessed { channel_update, .. } = event {
       for tx in channel_update.orphaned {
           if let OrphanedTx::AtomicWithdraw(info) = tx {

               // Rebuild the withdraw args from the orphaned bundle.
               let withdraws = info
                   .withdraws
                   .into_iter()
                   .map(|w| WithdrawArg { outputs: w.op.outputs })
                   .collect();

               // Republish with the same inscription payload; the SDK
               // refreshes the parent and withdraw_nonce automatically.
               let (result, checkpoint) = sequencer.handle().publish_atomic_withdraw(
                   info.inscription.payload,
                   withdraws,
               )?;

               // Keep `result` + `checkpoint` exactly as on the original publish.
           }
       }
   }
   ```

1. Keep the new `result` and `checkpoint` exactly as you did for the original publish to compare it to 

## Frequently asked questions

### Does the reorg recovery path work for multi-sequencer withdrawals?

No. The reorg-aware recovery path described in Step 5 is not supported for multi-sig withdrawals at the moment and is planned for a future release.
