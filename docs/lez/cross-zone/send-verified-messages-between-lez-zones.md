---
title: Send verified messages between LEZ zones
doc_type: procedure
product: lez
topics:
  - lez
  - cross-zone
  - zones
steps_layout: sectioned
authors: kashepavadan
owner: logos
doc_version: 1
slug: send-verified-messages-between-lez-zones
sidebar_position: 1
---

# Send verified messages between LEZ zones

#### Walk through the cross-zone ping example to learn how one LEZ zone emits a message that another zone delivers and independently verifies.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

Two [Logos Execution Zone (LEZ)](../../get-started/glossary.md#logos-execution-zone) zones, each with its own [Bedrock](../../get-started/glossary.md#bedrock) [channel](../../get-started/glossary.md#channel), can exchange messages asynchronously, with no shared sequencer and no trusted relay:

1. A program on zone A emits a message into a write-once outbox.
1. Zone B's sequencer watches zone A's finalised blocks and injects a delivery transaction.
1. Zone B's indexer re-derives the same delivery from zone A's chain before accepting it.

The destination's sequencer drives delivery, but the destination's indexer verifies it against the source zone's finalised, committee-signed blocks. A sequencer that lies is caught, not trusted: the worst it achieves is a halt, not a forged message. Each target program decides which sources it accepts, so anything that holds value sits behind explicit, per-route authorisation.

This procedure walks through the cross-zone ping example in the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone/tree/v0.3.1), in which `ping_sender` on zone A sends a payload that `ping_receiver` on zone B records. It is for developers who want to send messages from their own LEZ programs, and for operators who configure zones to accept them. The token bridge demo follows the same pipeline, with escrow on zone A and a capped mint on zone B.

:::info[Prerequisites]

- [Git](https://git-scm.com/), the [Rust toolchain](https://www.rust-lang.org/tools/install), and [`just`](https://github.com/casey/just).
- [Docker](https://docs.docker.com/get-docker/) running locally, to run the demos in [Step 7](#step-7-run-the-demos).
- Familiarity with how LEZ programs declare effects and chained calls in `plan` and write one shard in `apply`.
:::

## What to expect

- You can emit a cross-zone message from a program by chaining a call into the cross-zone outbox.
- You can configure a destination zone to watch a peer zone and accept messages only from routes you allow.
- You can run the ping, bridge and chat demos to watch messages cross between two local zones.

## Step 1: Get the example code

1. Clone the LEZ repository at the release the testnet runs:

   ```bash
   git clone https://github.com/logos-blockchain/logos-execution-zone.git
   cd logos-execution-zone
   git checkout v0.3.1
   ```

   The programs this procedure reads are in `lez/programs`:

   | Program | Zone | Role |
   | :--- | :--- | :--- |
   | `ping_sender` | Source | The emitting program. It chains into the outbox. |
   | `cross_zone_outbox` | Source | Stores each outbound message in a write-once slot. |
   | `cross_zone_inbox` | Destination | Takes deliveries from the sequencer, de-duplicates them, and calls the target. |
   | `ping_receiver` | Destination | The target program. It checks the source and records the payload. |
   | `ping_core` | Both | Shared instruction types and PDA helpers. |

## Step 2: Emit a message on the source zone

A program sends a cross-zone message by chaining a call into `cross_zone_outbox` with an `Emit` instruction. The outbox writes an `OutboxRecord` into a PDA keyed by (emitter, target zone, ordinal). Each slot is write-once, and the outbox takes the identity of the emitter from the caller, not from the instruction.

1. Open `lez/programs/ping_sender/src/main.rs` and read the `Send` branch of `plan`:

   ```rust
   SenderInstruction::Send {
       target_zone,
       target_account_id,
       target_accounts,
       payload,
       ordinal,
   } => {
       let [config, outbox] = <&[_; 2]>::try_from(accounts.as_slice())
           .expect("Send requires the config and outbox accounts");
       assert_config_account(config, self_account_id);

       plan.effect(config, &Effect::OutboxIs(outbox.program_account_id));
       plan.call(ChainedCall::new(
           outbox.program_account_id,
           vec![ProgramShardSelector::from(outbox)],
           &OutboxInstruction::Emit {
               target_zone,
               target_account_id,
               target_accounts,
               payload,
               ordinal,
           },
       ));
   }
   ```

   - The transaction chooses which program the outbox handle names. The `OutboxIs` effect checks it against the outbox ID pinned in the sender's config PDA at genesis, so the emission cannot be redirected to another program.
   - `plan` also asserts `input.caller_account_id.is_none()`. An emitter should refuse to be called by another program, because cross-zone discovery attributes the message to the top-level program.

   The `Emit` fields are:

   | Field | Description |
   | :--- | :--- |
   | `target_zone` | The destination zone's ID: the raw 32 bytes of its Bedrock channel ID. |
   | `target_account_id` | The program on the destination zone to deliver to. |
   | `target_accounts` | Shard selectors forwarded unchanged to the target program as its inputs. |
   | `payload` | The instruction data the target program receives. |
   | `ordinal` | A per-emitter, per-zone sequence number. Each value can be used once. |

1. Read how the outbox stores the message, in `lez/programs/cross_zone_outbox/src/main.rs`:

   ```rust
   fn plan(input: &PlanInput, instruction: Instruction) -> Plan {
       let Some(emitter) = input.caller_account_id else {
           panic!("Outbox is only callable through a chain call from a user program");
       };
       // ...
       assert_eq!(
           outbox.account_id,
           outbox_pda(input.self_account_id, emitter, &target_zone, ordinal),
           "Account must be the outbox PDA for (emitter, target_zone, ordinal)"
       );

       plan.effect(
           outbox,
           &Effect::CreateRecord(OutboxRecord {
               emitter,
               target_zone,
               ordinal,
               target_account_id,
               target_accounts,
               payload,
           }),
       );
       plan
   }

   fn apply(effect: Effect, pre_data: &[u8]) -> Option<Vec<u8>> {
       let Effect::CreateRecord(record) = effect;
       assert!(
           pre_data.is_empty(),
           "Outbox slot already written: one Emit per (emitter, target_zone, ordinal)"
       );
       Some(record.to_bytes())
   }
   ```

   Because `emitter` comes from `caller_account_id` and is part of the PDA address, two programs can never share a slot, and `apply` refuses a second write to an occupied slot.

## Step 3: Build the source transaction

The client submits a normal public transaction to zone A's sequencer. The integration test [`integration_tests/tests/cross_zone_verified.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.1/integration_tests/tests/cross_zone_verified.rs) builds one in `build_ping_tx`.

1. Encode the target program's instruction as the payload, and name the target's input shards:

   ```rust
   let payload = borsh::to_vec(&ReceiverInstruction::Record {
       payload: PING_PAYLOAD.to_vec(),
   })
   .expect("serialize ping instruction");

   let send = SenderInstruction::Send {
       target_zone,
       target_account_id: receiver_id,
       target_accounts: vec![
           ProgramShardSelector::new(receiver_config_account_id(receiver_id), receiver_id),
           ProgramShardSelector::new(ping_record_pda(receiver_id), receiver_id),
       ],
       payload,
       ordinal,
   };
   ```

   The payload is opaque to the outbox and the inbox. Only the target program decodes it.

1. Select the sender's config PDA and the outbox slot as the transaction's inputs:

   ```rust
   let sender_id = programs::ping_sender_account_id();
   let outbox_id = programs::cross_zone_outbox_account_id();
   let outbox_account = outbox_pda(outbox_id, sender_id, &target_zone, ordinal);

   let message = Message::try_new(
       sender_id,
       vec![
           ProgramShardSelector::new(sender_config_account_id(sender_id), sender_id),
           ProgramShardSelector::new(outbox_account, outbox_id),
       ],
       vec![],
       send,
   )?;
   ```

   - `outbox_pda(outbox_id, emitter, &target_zone, ordinal)` derives the same slot address the outbox checks in Step 2. Use a new `ordinal` for each message to the same zone.

1. Submit the transaction to zone A's sequencer with `send_transaction`, as for any other public transaction.

## Step 4: Configure the destination zone

Cross-zone messaging is off by default, and no shipped configuration file enables it. A zone takes part by declaring a `cross_zone` section in **both** its sequencer and indexer configurations.

:::warning
Declaring `cross_zone` selects the cross-zone genesis program set. It must be present in both the sequencer and the indexer configuration, and you cannot add or remove it on an existing chain. Peers are read once at startup, so adding a peer needs a configuration change and a restart of both services.
:::

1. On the source zone, declare an empty section. A zone that only sends needs no peers:

   ```json
   "cross_zone": {}
   ```

1. On the destination zone, declare each peer it watches and the routes it accepts:

   ```json
   "cross_zone": {
     "peers": [
       {
         "channel_id": [<32 comma-separated bytes of zone A's channel ID>],
         "allowed_routes": [
           {
             "src_account_id": "<ping_sender account ID>",
             "target_account_id": "<ping_receiver account ID>"
           }
         ],
         "min_committee_size": 1
       }
     ]
   }
   ```

   Replace the placeholders:
   - `channel_id` is a JSON array of 32 numbers, not the hex string that `bedrock_config.channel_id` accepts.
   - The account IDs are base58 strings. Built-in programs have fixed IDs, such as `programs::ping_sender_account_id()`.

   | Key | Description |
   | :--- | :--- |
   | `peers[].channel_id` | The peer's Bedrock channel ID, which is also its zone ID. |
   | `peers[].allowed_routes` | Pairs of a source program on the peer and a target program here. Genesis writes each pair into the target's own config PDA. |
   | `allowed_routes[].mint_cap` | Optional lifetime mint allowance for the route. Only valid on a target that mints, such as `wrapped_token`. |
   | `peers[].min_committee_size` | Suspends reading from the peer if its live committee drops below this size. `0`, the default, disables the floor; set it in production. |
   | `source_authority` | Optional account that may later change each target's accepted sources. It can only be set at genesis. |
   | `source_governance` | Optional program that may act for a PDA `source_authority` through a chained call. |

   - Unknown keys are refused at startup, so a misspelled key fails loudly instead of being ignored.
   - When you run two zones on one host, give each sequencer its own `metrics_address`, or the second fails to start.

## Step 5: Follow delivery and verification on the destination zone

No user action is needed on zone B. This step explains what its sequencer, inbox and indexer do, so you can follow a message through the logs and the indexer's status.

1. Zone B's sequencer runs one **watcher** per configured peer, in [`lez/sequencer/core/src/cross_zone_watcher.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.1/lez/sequencer/core/src/cross_zone_watcher.rs). It streams the peer's finalised blocks from Bedrock, screens each block through the shared acceptance policy, extracts the emissions addressed to this zone, and queues a dispatch transaction for each. Block production includes up to 16 dispatches per block. The watcher keeps a per-peer delivery floor, so a restart resumes instead of replaying.

1. Each dispatch calls `cross_zone_inbox` with a `CrossZoneMessage`, in `lez/programs/cross_zone_inbox/src/main.rs`. Only the sequencer can submit it: a user-signed inbox call is rejected at ingress. The inbox authenticates transport only:

   ```rust
   plan.effect(config, &Effect::ForeignZone(msg.src_zone));
   plan.effect(
       seen,
       &Effect::MarkDelivery {
           src_block_hash: msg.src_block_hash,
           src_tx_index: msg.src_tx_index,
       },
   );
   let mut shard_selectors = vec![ProgramShardSelector::native_balance(marker.account_id)];
   shard_selectors.extend(accounts.map(ProgramShardSelector::from));
   plan.call(ChainedCall {
       program_account_id: msg.target_account_id,
       shard_selectors,
       instruction_data: msg.payload,
       pda_seeds: vec![],
   });
   ```

   - `ForeignZone` refuses a message whose source is this zone.
   - `MarkDelivery` records the message in a seen shard keyed by the source block, and refuses a message it has already delivered.
   - The chained call passes a **source marker** account at position 0. Its address encodes (source zone, source program), so the target can tell where the message came from. The remaining inputs are the `target_accounts` from the emission.

1. Zone B's **indexer** checks every block that contains a dispatch before applying it, in [`lez/indexer/core/src/cross_zone_verifier.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.1/lez/indexer/core/src/cross_zone_verifier.rs). It re-derives the dispatch byte for byte from the peer's finalised chain, after recomputing each peer block's hash, checking its signatures, and linking it back to the peer's genesis.

   - A mismatch is a `Forged` verdict. The indexer halts ingestion and stores the halt, so it persists across restarts.
   - A peer block that is not available yet is a visible, retried stall, not a forgery.
   - The indexer's `getStatus` method reports each peer's health as `Live`, `Lagging`, `Holed`, `Suspended` or `Halted`, plus any stored halt.

## Step 6: Accept the delivery in the target program

The inbox delivers to whatever program a message names. The target program, not the inbox, decides which sources it accepts, using the routes that genesis wrote into its config PDA.

1. Open `lez/programs/ping_receiver/src/main.rs` and read the `Record` branch of `plan`:

   ```rust
   ReceiverInstruction::Record { payload } => {
       let [marker, config, record] = <&[_; 3]>::try_from(accounts.as_slice())
           .expect("Record requires the source marker, config, and record accounts");
       assert_config_account(config, self_account_id);
       let Some(caller) = caller_account_id else {
           panic!(
               "Record is only callable by the authorized deliverer (the cross-zone inbox)"
           );
       };
       // ... the record account must be this receiver's record PDA

       plan.effect(
           config,
           &Effect::AcceptDelivery {
               caller,
               marker: marker.account_id,
           },
       );
       plan.effect(record, &Effect::WriteRecord(payload));
   }
   ```

   `plan` cannot read the config, so it declares an `AcceptDelivery` check on the config shard alongside the write.

1. Read the matching branch of `apply`, which runs against the config shard:

   ```rust
   Effect::AcceptDelivery { caller, marker } => {
       let cfg = decode_config(pre_data);
       assert_eq!(
           caller, cfg.deliverer,
           "Record is only callable by the authorized deliverer (the cross-zone inbox)"
       );
       assert!(
           cfg.sources.iter().any(|(src_zone, src_account_id)| {
               marker
                   == inbox_source_marker_account_id(cfg.deliverer, src_zone, *src_account_id)
           }),
           "Record is only callable for a peer source this receiver authorizes"
       );
       None
   }
   ```

   The check writes nothing (`None`). If it panics, the whole delivery fails, including the record write. Use the same pattern in your own target: pin the deliverer, recompute the marker address for each source you accept, and compare.

   - If the config names an authority, `UpdateSources` replaces the accepted sources and `RenounceAuthority` fixes them permanently. There is no instruction to reassign the authority.
   - A target that mints, such as `wrapped_token`, also enforces the route's lifetime `mint_cap`. Its mint counters survive an `UpdateSources`, so raising a source's allowance cannot reset what it has already minted.

## Step 7: Run the demos

The `Justfile` has three recipes that boot two zones and one Bedrock node on your machine. Each takes a few minutes, mostly waiting for Bedrock finality. Run them from the repository root.

1. Run the verified ping, which runs the `indexer_verifies_and_delivers_cross_zone_ping` test:

   ```bash
   just demo-cross-zone-ping
   ```

   **Expected result:** the test passes once zone B's indexer records the payload `hello-verified-zone` in the receiver's record PDA. The payload only reaches indexer state after verification passes.

1. Run the token bridge, which runs the `lock_on_zone_a_mints_wrapped_token_on_zone_b` test:

   ```bash
   just demo-cross-zone-bridge
   ```

   **Expected result:** the test passes. Zone B's wrapped-token holding for the recipient reads 30, zone A's escrow reads 30, and the holding of the account that locked the tokens is debited by 30, all confirmed through indexer state on both zones.

1. Optionally, start the interactive chat app:

   ```bash
   just cross-zone-chat
   ```

   Open `http://127.0.0.1:8088`. Type a message in one zone's column and watch it move through the pipeline stages: submitted, source block, Bedrock finalised, delivered.

## Troubleshooting

### The destination indexer stops ingesting after a `Forged` verdict

The indexer re-derived a dispatch that did not match zone A's chain. The halt is stored and does not clear itself on restart. Investigate the destination sequencer before taking operator action to clear the halt.

### A message never arrives on the destination zone

Delivery waits for the source block to finalise on Bedrock, which dominates the end-to-end time. If it still does not arrive, check the following:

- The route is in the destination's `allowed_routes`, and the target program's config accepts it.
- The peer is not suspended for falling below `min_committee_size`. The indexer's `getStatus` reports the peer's health.
- The dispatch has not been retired. A dispatch that fails three times moves to a dead-letter queue. List it with the sequencer's `getCrossZoneDeadLetters` RPC method, and restore it with `requeueCrossZoneDeadLetter`.

### The sequencer fails to parse the `cross_zone` section

`peers[].channel_id` must be a JSON array of 32 numbers. Unlike `bedrock_config.channel_id`, it does not accept a hex string. Unknown or misspelled keys are also refused.

### Cross-zone tests fail to compile with `--release`

Tests in `sequencer_core` and the `test-utils` feature refuse to build in the release profile, by design, so test-only helpers cannot ship. Run those tests in the debug profile. The `just` demos above run the integration tests and are not affected.
