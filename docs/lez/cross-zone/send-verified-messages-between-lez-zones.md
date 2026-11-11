---
title: Send verified messages between LEZ Zones
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

# Send verified messages between LEZ Zones

#### Walk through the cross-Zone ping example to learn how one LEZ Zone emits a message that another Zone delivers and independently verifies.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

Two independent [Logos Execution Zone (LEZ)](../../get-started/glossary.md#logos-execution-zone) Zones, each with its own [Bedrock](../../get-started/glossary.md#bedrock) [channel](../../get-started/glossary.md#channel), can exchange messages asynchronously, with no shared sequencer and no trusted relay:

1. A program on Zone A emits a message into a write-once outbox.
1. Zone B's sequencer watches Zone A's finalised blocks and injects a delivery transaction.
1. Zone B's indexer re-derives the same delivery from Zone A's chain before accepting it.

The destination's sequencer drives delivery, but the destination's indexer verifies it against the source Zone's finalised, committee-signed blocks. A lying sequencer that lies is caught: the worst it achieves is a halt, not a forged message. Each target program decides which sources it accepts, so anything that holds value sits behind explicit, per-route authorisation.

This procedure walks through the cross-Zone ping example in the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone/tree/v0.3.2), in which `ping_sender` on Zone A sends a payload that `ping_receiver` on Zone B records. It is written for developers who want to send messages from their own LEZ programs, and for operators who configure Zones to accept them. The token bridge demo follows the same pipeline, with escrow on Zone A and a capped mint on Zone B.

:::info[Prerequisites]

- [Git](https://git-scm.com/), the [Rust toolchain](https://www.rust-lang.org/tools/install), and [`just`](https://github.com/casey/just).
- The [RISC Zero toolchain](https://dev.risczero.com/api/zkvm/install), installed with `rzup` at the versions LEZ `v0.3.2` is tested against:

    ```bash
    curl -L https://risczero.com/install | bash   # installs rzup; restart your shell afterwards
    rzup install rust 1.94.1
    rzup install cpp 2024.1.5
    rzup install r0vm 3.0.5
    rzup install cargo-risczero 3.0.5
    ```
- [Docker](https://docs.docker.com/get-docker/) running locally, to run the demos in [Step 7](#step-7-run-the-demos).
- `pkconf` and one of `libpcsclite-dev` (Debian and derivatives), `pcsclite` (Arch and derivatives), or `pcsc-lite-devel` (Fedora and derivatives).
- [Familiarity with how LEZ programs declare effects and chained calls in `plan` and write one shard in `apply`](../programs/write-lez-program-with-plan-and-apply.md).
:::

## What to expect

- You can emit a cross-Zone message from a program by chaining a call into the cross-Zone outbox.
- You can configure a destination Zone to watch a peer Zone and accept messages only from routes you allow.
- You can run the ping, bridge and chat demos to watch messages cross between two local Zones.

## Step 1: Get the example code

1. Clone the LEZ repository at the `v0.3.2` release:

   ```bash
   git clone https://github.com/logos-blockchain/logos-execution-zone.git
   cd logos-execution-zone
   git checkout v0.3.2
   ```

   The programs this procedure reads are in `lez/programs`:

   | Program | Zone | Role |
   | :--- | :--- | :--- |
   | `ping_sender` | Source | The emitting program. It chains into the outbox. |
   | `cross_zone_outbox` | Source | Stores each outbound message in a write-once slot. |
   | `cross_zone_inbox` | Destination | Takes deliveries from the sequencer, de-duplicates them, and calls the target. |
   | `ping_receiver` | Destination | The target program. It checks the source and records the payload. |
   | `ping_core` | Both | Shared instruction types and PDA helpers. |

## Step 2: Emit a message on the source Zone

A program sends a cross-Zone message by chaining a call into `cross_zone_outbox` with an `Emit` instruction. The outbox writes an `OutboxRecord` into a PDA keyed by (emitter, target Zone, ordinal). Each slot is write-once, and the outbox takes the identity of the emitter from the caller, not from the instruction.

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
   - `plan` also asserts `input.caller_account_id.is_none()`. An emitter should refuse to be called by another program, because cross-Zone discovery attributes the message to the top-level program.

   The `Emit` fields are:

   | Field | Description |
   | :--- | :--- |
   | `target_zone` | The destination Zone's ID: the raw 32 bytes of its Bedrock channel ID. |
   | `target_account_id` | The program on the destination Zone to deliver to. |
   | `target_accounts` | Shard selectors forwarded unchanged to the target program as its inputs. |
   | `payload` | The instruction data the target program receives. |
   | `ordinal` | A caller-chosen sequence number for the outbox slot. Each (emitter, target zone, ordinal) slot can be written once. The emitter is the sending program, not the signer, so every client of one sender shares the numbering and any of them can take a given value. Pick a value the chain does not already hold instead of counting from zero.|

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

The client submits a normal public transaction to Zone A's sequencer. The integration test [`integration_tests/tests/cross_zone_verified.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.2/integration_tests/tests/cross_zone_verified.rs) builds one in `build_ping_tx`.

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

   - `outbox_pda(outbox_id, emitter, &target_zone, ordinal)` derives the same slot address the outbox checks in [Step 2](#step-2-emit-a-message-on-the-source-zone). The `emitter` is the sending program, so every client of one sender shares the slot namespace. Read the derived address first and submit with an `ordinal` whose slot is still empty, rather than counting from zero.

1. Submit the transaction to Zone A's sequencer with `send_transaction`, as for any other public transaction.

## Step 4: Configure the destination Zone

Cross-Zone messaging is off by default, and no shipped configuration file enables it. A Zone takes part by declaring a `cross_zone` section in **both** its sequencer and indexer configurations.

:::warning
Declaring `cross_zone` selects the cross-Zone genesis program set. It must be present in both the sequencer and the indexer configuration, and you cannot add or remove it on an existing chain. Peers are read once at startup, so adding a peer needs a configuration change and a restart of both services.
:::

1. On the source Zone, declare an empty section. A Zone that only sends needs no peers:

   ```json
   "cross_zone": {}
   ```

1. On the destination Zone, declare each peer it watches and the routes it accepts:

   ```json
   "cross_zone": {
     "peers": [
       {
         "channel_id": [<32 comma-separated bytes of Zone A's channel ID>],
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
   | `peers[].channel_id` | The peer's Bedrock channel ID, which is also its Zone ID. |
   | `peers[].allowed_routes` | Pairs of a source program on the peer and a target program here. Genesis writes each pair into the target's own config PDA. |
   | `allowed_routes[].mint_cap` | Optional lifetime mint allowance for the route. Only valid on a target that mints, such as `wrapped_token`. |
   | `peers[].min_committee_size` | Suspends reading from the peer if its live committee drops below this size. `0`, the default, disables the floor; set it in production. |
   | `source_authority` | Optional account that may later change each target's accepted sources. It can only be set at genesis. |
   | `source_governance` | Optional program that may act for a PDA `source_authority` through a chained call. |

   - Unknown keys are refused at startup, so a misspelled key fails loudly instead of being ignored.
   - When you run two Zones on one host, give each sequencer its own `metrics_address`, or the second fails to start.

## Step 5: Follow delivery and verification on the destination Zone

No user action is needed on Zone B. This step explains what its sequencer, inbox and indexer do, so you can follow a message through the logs and the indexer's status.

1. Zone B's sequencer runs one **watcher** per configured peer, in [`lez/sequencer/core/src/cross_zone_watcher.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.2/lez/sequencer/core/src/cross_zone_watcher.rs). It streams the peer's finalised blocks from Bedrock, screens each block through the shared acceptance policy, extracts the emissions addressed to this Zone, and queues a dispatch transaction for each. Block production includes up to 16 dispatches per block. The watcher keeps a per-peer delivery floor, so a restart resumes instead of replaying.

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

   - `ForeignZone` refuses a message whose source is this Zone.
   - `MarkDelivery` records the message in a seen shard keyed by the source block, and refuses a message it has already delivered.
   - The chained call passes a **source marker** account at position 0. Its address encodes (source Zone, source program), so the target can tell where the message came from. The remaining inputs are the `target_accounts` from the emission.

1. Zone B's **indexer** checks every block that contains a dispatch before applying it, in [`lez/indexer/core/src/cross_zone_verifier.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.2/lez/indexer/core/src/cross_zone_verifier.rs). It re-derives the dispatch byte for byte from the peer's finalised chain, after recomputing each peer block's hash, checking its signatures, and linking it back to the peer's genesis.

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
               "Record is only callable by the authorized deliverer (the cross-Zone inbox)"
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
           "Record is only callable by the authorized deliverer (the cross-Zone inbox)"
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

1. Resolve the Bedrock node binary that the demos run in Docker. You only need to do this once per checkout:

   ```bash
   just resolve-bedrock-node
   ```

   **Expected result:** the command writes `bedrock/.resolved/logos-blockchain-node`. Without it, each demo fails with `Resolved Bedrock node is missing`.

1. Run the verified ping, which runs the `indexer_verifies_and_delivers_cross_zone_ping` test:

   ```bash
   just demo-cross-zone-ping
   ```

   **Expected result:** the test passes once Zone B's indexer records the payload `hello-verified-zone` in the receiver's record PDA. The payload only reaches indexer state after verification passes.

1. Run the token bridge, which runs the `lock_on_zone_a_mints_wrapped_token_on_zone_b` test:

   ```bash
   just demo-cross-zone-bridge
   ```

   **Expected result:** the test passes. Zone B's wrapped-token holding for the recipient reads 30, Zone A's escrow reads 30, and the holding of the account that locked the tokens is debited by 30, all confirmed through indexer state on both Zones.

1. Optionally, start the interactive chat app:

   ```bash
   just cross-zone-chat
   ```

   Open `http://127.0.0.1:8088`. Type a message in one Zone's column and watch it move through the pipeline stages: submitted, source block, Bedrock finalised, delivered.

## Troubleshooting

### The destination indexer stops ingesting after a `Forged` verdict

The indexer re-derived a dispatch that did not match Zone A's chain. The halt is stored and does not clear itself on restart. Investigate the destination sequencer before taking operator action to clear the halt.

### A message never arrives on the destination Zone

Delivery waits for the source block to finalise on Bedrock, which dominates the end-to-end time. If it still does not arrive, check the following:

- The route is in the destination's `allowed_routes`, and the target program's config accepts it.
- The peer is not suspended for falling below `min_committee_size`. The indexer's `getStatus` reports the peer's health.
- The dispatch has not been retired. A dispatch that fails three times moves to a dead-letter queue. List it with the sequencer's `getCrossZoneDeadLetters` RPC method, and restore it with `requeueCrossZoneDeadLetter`.

### The sequencer fails to parse the `cross_zone` section

`peers[].channel_id` must be a JSON array of 32 numbers. Unlike `bedrock_config.channel_id`, it does not accept a hex string. Unknown or misspelled keys are also refused.

### The emission fails with `Outbox slot already written`

The (emitter, target Zone, ordinal) slot is already occupied. The slot is keyed by the sending program rather than by the signer, and an emission needs no signature, so another client of the same sender may hold the value you chose, and a chain that has already run the demos holds the low ones. Derive the slot address with `outbox_pda` and read it before submitting, then retry with a free `ordinal`.

### Cross-Zone tests fail to compile with `--release`

Tests in `sequencer_core` and the `test-utils` feature refuse to build in the release profile, by design, so test-only helpers cannot ship. Run those tests in the debug profile. The `just` demos above run the integration tests and are not affected.

### A demo fails with `Resolved Bedrock node is missing`

The demos run a Bedrock node binary resolved ahead of time into `bedrock/.resolved/`. Run `just resolve-bedrock-node` from the repository root, with Docker running, then run the demo again.