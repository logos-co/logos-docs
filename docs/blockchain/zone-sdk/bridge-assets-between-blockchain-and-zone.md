---
title: Bridge assets between Logos Blockchain and a Zone
doc_type: procedure
product: blockchain
topics: [bridging, channels, zones, withdrawals, deposits]
steps_layout: sectioned
authors: youngjoon-lee, kashepavadan
owner: logos
doc_version: 3
slug: bridge-assets-between-blockchain-and-zone
sidebar_position: 2
---

# Bridge assets between Logos Blockchain and a Zone

#### Move tokens between Logos Blockchain and a Zone using channels and the Zone SDK.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

[Logos Zones](../concepts/about-zones.md) are customizable, high-performance blockchains for applications built on Logos. [Logos Blockchain](../../get-started/glossary.md#logos-blockchain) [notes](../../get-started/glossary.md#note) can be bridged from [Bedrock](../concepts/about-bedrock.md) to Zones. A Zone's [channel](../../get-started/glossary.md#channel) holds the bridged funds as [**channel notes**](../../get-started/glossary.md#channel-note): ledger notes registered to the channel, which only the channel's accredited keys can spend.

This procedure covers creating a channel, depositing notes from the Blockchain into a Zone, and withdrawing notes from a Zone back to the Blockchain, using the [Zone SDK](../../get-started/glossary.md#zone-sdk)'s `ZoneSequencer`. It applies to Zone developers building sequencers and indexers; the Zone itself defines how the channel's funds map to its internal accounts, while the SDK only surfaces the on-chain events.

Bridging has two directions:

- **Deposit** (Blockchain to Zone). A user deposits notes into a channel with a `ChannelDeposit` operation. Each deposited note is re-created as a channel note, and the Zone sequencer credits the user inside the Zone.
- **Withdraw** (Zone to Blockchain). The Zone sequencer submits a `ChannelTransfer` that moves channel notes to the recipients, together with a `ChannelWithdraw` that releases the recipients' notes. The released notes become regular notes on the Blockchain, owned by the recipients' keys.

:::info[Prerequisites]

- A running [Logos Blockchain node](../get-started/run-a-logos-blockchain-node-from-cli.md) reachable over HTTP, with a funded key in its wallet to pay transaction fees.
- The Zone SDK (`lb_zone_sdk`) and `lb_core` crates from release 0.3.2 added to your project.
- You have completed the [Zone SDK inscription tutorial](./inscribe-data-on-chain-using-zone-sdk.md).
:::

## What to expect

- You can create a channel and have it recognised on-chain without a separate deployment transaction.
- You can observe deposits on your channel, and credit them either once they are finalised or straight away by pinning them.
- You can submit single- or multi-signature withdrawals and confirm them once finalised, including after a reorg.

## Step 1: Create a channel

A channel is created automatically the first time an operation references a previously unseen `ChannelId`. Whoever signs that first operation becomes the sole accredited key, and the channel starts with `configuration_threshold = 1`, `transfer_threshold = 1`, and no channel notes.

1. Generate a [`Ed25519Key`](https://github.com/logos-blockchain/logos-blockchain/blob/0.3.2/kms/keys/src/keys/ed25519/mod.rs) for your sequencer. The private key is used to sign inscriptions and channel operations, while the public key defines the `ChannelId`. An example implementation is shown below:

   ```rust
   // Generate Ed25519 key pair
   let mut key_bytes = [0u8; ED25519_SECRET_KEY_SIZE];
   rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut key_bytes);
   std::fs::write(&your_key_file_path, key_bytes).expect("failed to write key file");
   let signing_key = Ed25519Key::from_bytes(&key_bytes);

   // Derive channel ID
   let channel_id = ChannelId::from(signing_key.public_key().to_bytes());
   ```

   The bridging-relevant fields on `ChannelState` in the [Mantle](../../get-started/glossary.md#mantle) specification:

   | Field                | Purpose                                                              |
   | -------------------- | -------------------------------------------------------------------- |
   | `transfer_threshold` | Minimum number of accredited-key signatures needed to authorise a channel transfer or withdrawal. |
   | `accredited_keys`    | The committee that may sign transfers and withdrawals. |

1. Initialise a `ZoneSequencer` with a `FundingConfig` and publish the first [inscription](../../get-started/glossary.md#inscription) inside your event loop once `Event::Ready` has fired. The channel is created on-chain automatically, naming this sequencer's key as the sole accredited key.

    ```rust
    use lb_zone_sdk::{
        CommonHttpClient,
        adapter::NodeHttpClient,
        sequencer::{FundingConfig, ZoneSequencer},
    };

    // Connect to the Logos Blockchain node.
    let node = NodeHttpClient::new(
        CommonHttpClient::new(None),
        "http://localhost:8080".parse()?,
    );

    // Every publish-type call funds its transaction from the node's wallet.
    let funding = FundingConfig {
        funding_pk,
        // Where an atomic withdrawal's change goes; `None` sends it to `funding_pk`.
        change_pk: None,
        max_tx_fee: 1_000_000.into(),
        priority_fee_percent: FundingConfig::DEFAULT_PRIORITY_FEE_PERCENT,
    };

    // Initialise the sequencer for this channel.
    let mut sequencer = ZoneSequencer::init(channel_id, signing_key, node, funding, None);

    // Inside the event loop, once `Event::Ready` has fired:
    // publishing the first inscription creates the channel just-in-time.
    let (result, checkpoint) = sequencer.handle().publish(genesis_zone_block).await?;
    ```

    - `funding_pk` is the ZK public key of a funded key in the connected node's wallet. The node builds and proves the fee transfer, so the key's secret never leaves the node.
    - `priority_fee_percent` is a reserve over the required fee that absorbs normal fee movement. Only the part left over after the final fee is charged becomes a priority tip. The default is 12%, and `max_tx_fee` caps the total.
    - To change other sequencer settings, such as `resubmit_interval`, build a `SequencerConfig` with `SequencerConfig { ..SequencerConfig::new(funding) }` and pass it to `ZoneSequencer::init_with_config`.

    `publish` funds the transaction, then queues it in the sequencer's pending set; the post reaches the node the next time the event loop polls `next_event`. The returned `PublishResult` and checkpoint carry everything you need to record this publish in your outbox.

1. (Optional) Reconfigure the channel by calling `sequencer.handle().channel_config(..).await` with new keys, timing, and thresholds. See [Update the committee with a channel config op](./operate-decentralised-zone-with-round-robin-sequencer-rotation.md#step-3-update-the-committee-with-a-channel-config-op).

## Step 2: Observe deposits from Bedrock

A deposit happens when a Bedrock user submits a transaction with a `ChannelDeposit` operation naming the target `channel`, the consumed `inputs`, and opaque `metadata` that the Zone interprets, such as a recipient address. On-chain execution spends the inputs and re-creates each one as a channel note with the same value and key.

1. Watch for finalised deposits inside your event loop. The Zone SDK surfaces every finalised deposit on your channel as a `FinalizedOp::Deposit(DepositInfo)` inside the `finalized` field of `Event::BlocksProcessed`.

   ```rust
   use lb_zone_sdk::sequencer::{Event, FinalizedOp};

   if let Event::BlocksProcessed { finalized, .. } = event {
       // Iterate over every finalised transaction in this batch of blocks.
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

   `Event::BlocksProcessed` fires once per ingested block, whether live or backfilled, and `finalized` only carries items at or below the last irreversible block (LIB), so deposits surfaced here cannot be re-orged off the chain.

1. Credit the user inside the Zone according to the Zone's internal state transition function rules.

1. (Optional) Credit a deposit before it is finalised by **pinning** it. `Event::BlocksProcessed` also carries `deposits`: the deposits observed in the block just processed, each with its `op_id`, `amount`, `metadata`, and the channel notes it created. Pin a deposit with `publish_pin_deposit(inscription, consumed_notes)`, which bundles an inscription with a channel transfer that consumes the deposit's notes, so the bundle can only land on a branch where the deposit exists.

   ```rust
   use lb_zone_sdk::sequencer::{ChannelUpdateTx, Error, Event};

   if let Event::BlocksProcessed { channel_update, deposits, .. } = event {
       observed.extend(deposits.iter().cloned());

       // A shed pin surfaces as orphaned: forget it so it is pinned again.
       for tx in channel_update.orphaned() {
           if let ChannelUpdateTx::PinDeposit(info) = tx {
               pinned.remove(&deposit_of(info));
           }
       }

       for deposit in &observed {
           if pinned.contains(&deposit.op_id) {
               continue;
           }
           let notes = deposit.notes.iter().map(|note| note.note_id).collect();
           match sequencer.handle().publish_pin_deposit(pin_payload_for(deposit), notes).await {
               Ok(_) => { pinned.insert(deposit.op_id); }
               Err(Error::Network(_)) => {} // Not on this branch right now.
               Err(e) => return Err(e),
           }
       }
   }
   ```

   - Deposits in `deposits` are observations, not finalised state: a branch change can surface the same deposit again or reorg it out.
   - If the deposit is not on the current branch, `publish_pin_deposit` returns `Error::Network` and posts nothing. Pin it again on a later event.
   - The pin surfaces as `ChannelUpdateTx::PinDeposit` in `channel_update.adopted()`, and in `channel_update.orphaned()` if it is shed, in which case pin it again.
   - `DepositLifecyclePolicy` in `tests/src/cucumber/steps/zone/operations/deposit_policy.rs` in the `logos-blockchain` repository is the reference implementation.

## Step 3: Submit a withdrawal

A withdrawal is initiated inside the Zone and lands on-chain as two operations in one transaction:

- a `ChannelTransfer` that spends channel notes covering the amount and creates the recipients' notes, plus any change, as new channel notes;
- a `ChannelWithdraw` that names the recipients' notes by ID and releases them, so they stay on-chain as regular notes owned by the recipients' keys.

Each of the two carries a `ChannelMultiSigProof` with `ChannelState.transfer_threshold` signatures, at most one per accredited key. The process is different for single-sequencer Zones and for Zones whose transfer threshold is greater than one.

### Option 1: Submit a single-sequencer withdrawal

This option applies only when `ChannelState.transfer_threshold == 1`.

1. Describe the withdrawal by building a `WithdrawArg` with the recipient `Outputs`, and choose which channel notes pay for it with `WithdrawInputs`:

   - `WithdrawInputs::Auto` lets the SDK pick covering notes from the channel notes it tracks.
   - `WithdrawInputs::Explicit(note_ids)` names the exact notes, for example chosen from `sequencer.channel_wallet()`, which lists each tracked note's ID, value, key, and creation slot.

   ```rust
   use lb_core::mantle::{Note, ledger::Outputs};
   use lb_zone_sdk::sequencer::{WithdrawArg, WithdrawInputs};

   // Describe what to withdraw: a single note to the recipient.
   let withdraw = WithdrawArg {
       outputs: Outputs::new([Note::new(50, recipient_pk)]),
   };
   ```

   The SDK fills in the `channel_id` and signs with this sequencer's accredited key.

1. Submit the inscription bundled with the withdrawal by calling `sequencer.handle().publish_atomic_withdraw(..)`.

   ```rust
   // Inside the event loop: submit the inscription bundled with the withdrawal.
   let (result, checkpoint) = sequencer
       .handle()
       .publish_atomic_withdraw(
           inscription_payload, // the Zone block this withdrawal goes with
           vec![withdraw],
           WithdrawInputs::Auto,
       )
       .await?;
   ```

   Because the inscription, the transfer, and the withdrawal share one transaction, they become adopted, orphaned, or finalised as a unit, so the Zone block recording the withdrawal and the on-chain debit cannot drift apart.

   :::info
   `publish_atomic_withdraw` returns the `PublishResult` as soon as the bundle is queued. For a single-signature bundle, `PublishResult.tx` is a `PendingTx::AtomicWithdraw(AtomicWithdrawInfo)` carrying the inscription, the bundled withdraw operations, and the recipient `outputs`. Record it in your outbox straight away.
   :::

1. Check the finalised transactions in `Event::BlocksProcessed.finalized` against the pending transaction's `tx_hash`. Because it is a bundle, the inscription, the channel transfer, and the withdrawal all appear in the same `tx.ops` once the withdrawal is finalised.

   ```rust
   use lb_zone_sdk::sequencer::{Event, FinalizedOp};

   if let Event::BlocksProcessed { finalized, .. } = event {
       for tx in finalized {
           // Check if tx.tx_hash matches the pending tx_hash in your outbox.
           for op in tx.ops {
               match op {
                   FinalizedOp::Inscription(info) => {
                       // The Zone block carried with the withdrawal.
                       println!("Inscribed {:?} in tx {:?}", info.this_msg, info.tx_hash);
                   }
                   FinalizedOp::ChannelTransfer(transfer) => {
                       // The channel notes moved to the recipients.
                       println!("Transferred {:?} in tx {:?}", transfer.op, transfer.tx_hash);
                   }
                   FinalizedOp::Withdraw(withdrawal) => {
                       // The recipients' notes released from the channel.
                       println!("Withdrawn {:?} in tx {:?}", withdrawal.op, withdrawal.tx_hash);
                   }
                   _ => {}
               }
           }
       }
   }
   ```

### Option 2: Submit a multi-sequencer withdrawal

When `transfer_threshold > 1`, no single sequencer can authorise a withdrawal alone. The proposing sequencer prepares a funded bundle, collects signatures from the other accredited key holders, and submits the bundle once it has enough.

:::info
Defining the committee transport, meaning how prepared bundles and signatures are exchanged between sequencers, is outside the Zone SDK's scope.
:::

1. Prepare the bundle by calling `handle.prepare_atomic_withdraw(..)` with the same arguments as `publish_atomic_withdraw`. The SDK builds and funds the transaction and returns a `PreparedAtomicBundle`. The bundled inscription is turn-gated, so prepare and submit from the sequencer whose turn it is to write.

   ```rust
   use lb_zone_sdk::sequencer::{WithdrawArg, WithdrawInputs};

   // 1. Build and fund the bundle for external signing.
   let prepared = sequencer
       .handle()
       .prepare_atomic_withdraw(
           inscription_payload,
           vec![WithdrawArg { outputs }],
           WithdrawInputs::Auto,
       )
       .await?;
   ```

1. Share the prepared bundle with the other accredited key holders. Each signer calls `prepared.sign_with(&key)`, which returns an `IndexedSignature` indexed against the channel's current accredited keys. A key holder without a running sequencer can call `sign_prepared(&key, &prepared.accredited_keys, &prepared.sign_payload)` instead.

   ```rust
   use lb_zone_sdk::sequencer::IndexedSignature;

   // 2. Distribute `prepared` and collect the committee's signatures.
   //    Transport is application-defined.
   let collected: Vec<IndexedSignature> = collect_signatures_from_committee(&prepared).await?;
   ```

1. Gather `prepared.signing_threshold` signatures, which is the channel's current `transfer_threshold`, into `IndexedSignatures` and submit them with `handle.submit_atomic_bundle(prepared, signatures)`.

   ```rust
   use lb_zone_sdk::sequencer::IndexedSignatures;

   // 3. Order the signatures by key index, at most one per key, and submit.
   let signatures = IndexedSignatures::try_from_iter(collected.into_iter().map(Into::into))?;
   let (result, checkpoint) = sequencer
       .handle()
       .submit_atomic_bundle(prepared, signatures)?;
   ```

   If the channel's configuration or message tip changed since the bundle was prepared, `submit_atomic_bundle` returns `Error::ChannelStateChanged`. Prepare the bundle again and collect new signatures.

1. Match the finalised transaction by `tx_hash` once it appears in `Event::BlocksProcessed.finalized`, the same way as in the single-signature flow in Option 1.

## Step 4: Recover from a reorg

A reorg can orphan the parent inscription of a withdrawal, which invalidates the original signed transaction.

1. Watch for orphaned transactions in the `channel_update` field of `Event::BlocksProcessed`. When entries leave the channel, the update is a `ChannelUpdate::Conflict`, and `channel_update.orphaned()` lists the abandoned transactions.

1. Republish a single-signature withdrawal by calling `publish_atomic_withdraw` again with the same inscription payload and a `WithdrawArg` rebuilt from the bundle's `outputs`. The SDK refills the inscription parent and picks covering channel notes again from the current on-chain state.

   ```rust
   use lb_zone_sdk::sequencer::{ChannelUpdateTx, Event, WithdrawArg, WithdrawInputs};

   if let Event::BlocksProcessed { channel_update, .. } = event {
       for tx in channel_update.orphaned() {
           if let ChannelUpdateTx::AtomicWithdraw(info) = tx {
               // Republish with the same inscription payload and recipients;
               // the SDK refreshes the parent and the channel notes it spends.
               let (result, checkpoint) = sequencer
                   .handle()
                   .publish_atomic_withdraw(
                       info.inscription.payload.clone(),
                       vec![WithdrawArg { outputs: info.outputs.clone() }],
                       WithdrawInputs::Auto,
                   )
                   .await?;

               // Record `result` + `checkpoint` exactly as on the original publish.
           }
       }
   }
   ```

1. Record the new `result` and `checkpoint` in your outbox exactly as you did for the original publish, and match the finalised transaction against the new `tx_hash`.

:::note
For multi-signature bundles the orphan event carries the same `ChannelUpdateTx::AtomicWithdraw` data, whether the bundle was mined and reorged out, or never mined and shed once its parent [slot](../../get-started/glossary.md#slot) was taken by a competing entry. The SDK cannot re-sign the transaction, so recovery means running the `prepare_atomic_withdraw` → collect signatures → `submit_atomic_bundle` flow again against the new parent, with channel notes that are still unspent.
:::
