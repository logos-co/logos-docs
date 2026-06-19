---
title: Inscribe data on-chain using the Zone SDK
doc_type: procedure
product: blockchain
topics: [channels, zones]
steps_layout: sectioned
authors: kashepavadan
owner: logos
doc_version: 1
slug: inscribe-data-on-chain-using-zone-sdk
---

# Inscribe data on-chain using the Zone SDK

#### Learn how to write plain text as on-chain inscriptions using a simple Logos Zone.

Applications built on Logos are implemented in execution environments known as [*Zones*](../concepts/about-zones.md), which post data *inscriptions* on-chain via Logos channels. A Zone could host a versatile rollup with thousands of applications, such as the [Logos Execution Zone](../apps/wallet/journeys/quickstart-for-the-logos-execution-zone-wallet.md), or it could be a simple, standalone Zone tracking the state of just one application.

The **Zone SDK** is a ready-to-use toolbox that handles basic interactions with a Logos Zone. This tutorial shows how to create a simple Logos Zone that writes plain text as on-chain inscriptions, based on the [TUI Zone demo](https://github.com/logos-blockchain/logos-blockchain/tree/master/deployment/tui-zone).

{% hint style="info" %}

You can try out a working version of the TUI Zone used in this tutorial directly from your Logos Blockchain node. Just run `./logos-blockchain-node inscribe`.

{% endhint %} 

Before you begin, you will need:

- A running [Logos node](../get-started/run-a-logos-blockchain-node-from-cli.md)

## What to expect

- You will initialise a `ZoneSequencer` that connects to your Logos node and creates a new channel for posting inscriptions.
- You will implement event handling so the sequencer tracks blockchain state, reorgs, and updates from other sequencers.
- You will publish plain-text messages as on-chain inscriptions and verify they are finalised in the channel.

## Step 1: Clone the Logos Blockchain repository

Before you begin, clone the [logos-blockchain](https://github.com/logos-blockchain/logos-blockchain/tree/master) repository. The `tui-zone-tutorial` branch contains a skeleton implementation of the TUI Zone with space to fill in the relevant code. The full implementation can be found in the `master` branch.

1. Run the following in your desired path to clone the repository and switch to the tutorial branch:

   ```bash
   git clone https://github.com/logos-blockchain/logos-blockchain.git
   cd logos-blockchain/deployment/tui-zone

   # To follow along with the tutorial
   git checkout tui-zone-tutorial
   ```

## Step 2: Initialise the `ZoneSequencer` struct

Sequencer functionality is provided via the `ZoneSequencer` struct from the Zone SDK, found in `logos-blockchain/zone-sdk/src/sequencer.rs`. When initialising this struct, provide the following arguments:

- `channel_id: ChannelId` — the ID of the channel associated with the Zone.
- `signing_key: Ed25519Key` — a key authorised to post updates to the channel.
- `node: Node` — a Node struct referring to your Logos Blockchain node, together with the credentials to access it. Created by `NodeHttpClient::new()`.
- `checkpoint: Option<SequencerCheckpoint>` — [Optional] the checkpoint representing the most recently-pushed channel update.

Before posting to a new channel, the sequencer must first generate an Ed25519 public/private key pair. **This initial public key defines the channel ID, while the private key becomes the first authorised signing key.** The channel is created when the sequencer posts a message with this channel ID, unless it already exists. Initially, only the sequencer with the signing key can post messages to the channel. Additional keys can be authorised via the [CHANNEL_CONFIG](https://nomos-tech.notion.site/v1-2-Mantle-Specification-2ce261aa09df805ea358d80c2046cf95) Mantle Operation.

After the first channel message, further messages include a hash reference to the previous message in the channel. If a message is posted with an incorrect parent hash, it is rejected. **Providing a checkpoint lets the sequencer track the last message posted to its channel, allowing it to resume posting new updates after restarting.** A checkpoint is not necessary for the session during which a sequencer creates a new channel.

1. Add a function to create a new private signing key in `src/lib.rs`:

   ```rust
   // Load signing key from file or generate a new one if it doesn't exist
   //
   // path: The path to the signing key file
   fn load_or_create_signing_key(path: &Path) -> Ed25519Key {
       if path.exists() {
           let key_bytes = fs::read(path).expect("failed to read key file");
           assert!(
               key_bytes.len() == ED25519_SECRET_KEY_SIZE,
               "invalid key file: expected {} bytes, got {}",
               ED25519_SECRET_KEY_SIZE,
               key_bytes.len()
           );
           let key_array: [u8; ED25519_SECRET_KEY_SIZE] =
               key_bytes.try_into().expect("length already checked");
           Ed25519Key::from_bytes(&key_array)
       } else {
           let mut key_bytes = [0u8; ED25519_SECRET_KEY_SIZE];
           rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut key_bytes);
           fs::write(path, key_bytes).expect("failed to write key file");
           Ed25519Key::from_bytes(&key_bytes)
       }
   }
   ```

1. Fill in the `run()` function in `src/lib.rs` with the following code that creates a channel with an associated sequencer:

   ```rust
   // Processing loop
   //
   // args: Setup info
   pub async fn run(args: InscribeArgs) {

       // Get node URL
       let node_url: Url = args.node_url.parse().expect("invalid node URL");

       // Create new signing key or load existing one from path
       let signing_key = load_or_create_signing_key(Path::new(&args.key_path));

       // Derive channel ID
       let channel_id = ChannelId::from(signing_key.public_key().to_bytes());

       println!("TUI Zone Sequencer");
       println!("  Node:       {node_url}");
       println!("  Key:        {}", args.key_path);
       println!("  Channel ID: {}", hex::encode(channel_id.as_ref()));
       println!();

       // Create initial Zone state & load checkpoint (to be implemented later in the tutorial)
       let mut state = InMemoryZoneState::default();
       let checkpoint = state.load_checkpoint().cloned();

       // Connect to node
       let node = NodeHttpClient::new(CommonHttpClient::new(None), node_url);

       // Initialise ZoneSequencer
       let mut sequencer = ZoneSequencer::init(channel_id, signing_key, node, checkpoint);

       // Monitor changes to channel
       let view_rx = sequencer.subscribe_channel_view();

       // Wait to start reading from stdin until ready
       let (ready_tx, ready_rx) = tokio::sync::oneshot::channel();
       let mut stdin_rx = spawn_stdin_reader(ready_rx);
       let mut ready_tx = Some(ready_tx);

       ...

   }
   ```

## Step 3: Handle channel events

It is important for your sequencer to track the Zone state on the blockchain and how it differs from the state maintained locally. A reorg could remove Zone update inscriptions from the canonical chain, or another sequencer could update the Zone state in a Zone with multiple sequencers. For this reason, the sequencer must be able to query the status of Zone updates it has published and to what extent it is caught up with the latest blockchain state.

The status of the sequencer's backfill process, transactions sent by the sequencer, and any updates to the Zone state are communicated via the Zone SDK's `Event`. These events are:

- `Ready` — the sequencer is caught up and ready to accept updates.
- `BlocksProcessed` — a new block is seen by the sequencer. Includes the latest `checkpoint`, the list of `finalized` transactions, and a `channel_update` list of inscriptions published by other sequencers for this Zone ("adopted") and inscriptions that are no longer on the canonical chain ("orphaned").
- `MempoolPending` — transaction was accepted by node API and is waiting in mempool.
- `TurnNotification` — the sequencer's turn to write in a turn-based decentralised sequencing scenario (not applicable to our example).

1. In `src/state.rs`, add the following struct to track Zone state in memory and maintain the checkpoint and channel view:

   ```rust
   // Keep track of Zone state in memory
   //
   // published: Inscriptions published by your sequencer but not yet finalised or orphaned
   // adopted: Inscriptions published by other sequencers. Not applicable in our example.
   // finalized: All finalised inscriptions
   // checkpoint: Last message in Zone state
   // channel_view: Channel info
   #[derive(Default)]
   pub struct InMemoryZoneState {
       published: Vec<Msg>,
       adopted: Vec<Msg>,
       finalized: Vec<Msg>,
       checkpoint: Option<SequencerCheckpoint>,
       channel_view: Option<SequencerChannelView>,
   }

   impl ZoneState for InMemoryZoneState {
       fn on_adopted(&mut self, adopted: &[InscriptionInfo]) {
           for info in adopted {
               if !self.adopted.iter().any(|m| m.msg_id == info.this_msg) {
                   self.adopted
                       .push(Msg::from_payload(info.this_msg, &info.payload));
               }
           }
       }

       // Remove from our list of published inscriptions
       fn on_orphaned(&mut self, msg_id: &MsgId) {
           if let Some(i) = self.published.iter().position(|m| &m.msg_id == msg_id) {
               self.published.remove(i);
           }
       }

       // Remove finalised inscriptions from published and adopted lists
       fn on_finalized(&mut self, inscriptions: &[InscriptionInfo]) {
           for info in inscriptions {
               if let Some(i) = self
                   .published
                   .iter()
                   .position(|m| m.msg_id == info.this_msg)
               {
                   self.published.remove(i);
               } else if let Some(i) = self.adopted.iter().position(|m| m.msg_id == info.this_msg) {
                   self.adopted.remove(i);
               }
               if !self.finalized.iter().any(|m| m.msg_id == info.this_msg) {
                   self.finalized
                       .push(Msg::from_payload(info.this_msg, &info.payload));
               }
           }
       }

       fn published(&self) -> &[Msg] {
           &self.published
       }

       fn adopted(&self) -> &[Msg] {
           &self.adopted
       }

       fn finalized(&self) -> &[Msg] {
           &self.finalized
       }

       fn save_checkpoint(&mut self, checkpoint: SequencerCheckpoint) {
           self.checkpoint = Some(checkpoint);
       }

       fn load_checkpoint(&self) -> Option<&SequencerCheckpoint> {
           self.checkpoint.as_ref()
       }
   }

   impl InMemoryZoneState {
       pub fn set_channel_view(&mut self, channel_view: SequencerChannelView) {
           self.channel_view = Some(channel_view);
       }

       pub const fn channel_view(&self) -> Option<&SequencerChannelView> {
           self.channel_view.as_ref()
       }

       /// Record a tx we just published locally. Called at the publish-call
       /// site so the local outbox stays in sync with what the SDK accepted.
       pub fn on_published(&mut self, info: &InscriptionInfo) {
           self.published
               .push(Msg::from_payload(info.this_msg, &info.payload));
       }
   }
   ```

1. Back in `src/lib.rs`, add a function to handle when the sequencer has finished bootstrapping:

   ```rust
   // Defines initial post-bootstrapping behaviour
   //
   // state: Zone state
   // ready_tx: The transmitter of the ready event to ready_rx
   fn handle_ready(
       state: &InMemoryZoneState,
       ready_tx: &mut Option<tokio::sync::oneshot::Sender<()>>,
   ) {
       info!("Sequencer ready");
       if let Some(tx) = ready_tx.take() {
           let _ = tx.send(());
       }
       println!("Ready.");
       println!();
       println!("Type a message and press Enter to publish.");
       println!("Press Ctrl-D or type an empty line to exit.");
       println!();
       ui::render_state(state);
       ui::prompt();
   }
   ```

1. Add functions for channel updates, finalised messages, and orphaned messages:

   ```rust
   // Apply finalised messages from chain to Zone state
   //
   // items: Finalised transactions
   // state: Zone state
   fn apply_finalized(items: &[FinalizedTx], state: &mut InMemoryZoneState) {

       // TUI only cares about inscriptions for rendering; deposit / withdraw
       // ops have no inscription payload.
       let inscriptions: Vec<InscriptionInfo> = items
           .iter()
           .flat_map(|t| t.ops.iter())
           .filter_map(|op| match op {
               FinalizedOp::Inscription(i) => Some(i.clone()),
               FinalizedOp::Deposit(_) | FinalizedOp::Withdraw(_) => None,
           })
           .collect();
       state.on_finalized(&inscriptions);
       ui::render_state(state);
       ui::prompt();
   }

   // Apply channel updates
   //
   // update: Update to the channel messages
   fn apply_channel_update(
       update: ChannelUpdate,
       state: &mut InMemoryZoneState,
       sequencer: &mut ZoneSequencer<NodeHttpClient>,
   ) {
       let ChannelUpdate { orphaned, adopted } = update;
       if orphaned.is_empty() && adopted.is_empty() {
           return;
       }
       state.on_adopted(&adopted);
       for entry in &orphaned {
           handle_orphan(state, sequencer, entry);
       }
       ui::render_state(state);
       ui::prompt();
   }

   // Handle Zone messages reorged away in 'orphaned' blocks
   //
   // entry: Orphaned transaction
   fn handle_orphan(
       state: &mut InMemoryZoneState,
       sequencer: &mut ZoneSequencer<NodeHttpClient>,
       entry: &OrphanedTx,
   ) {
       match entry {
           OrphanedTx::Inscription(info) => {
               
               // Add to orphaned list
               state.on_orphaned(&info.this_msg);

               // Republish inscription
               debug!(msg_id = %hex::encode(info.this_msg.as_ref()), "Auto-republishing orphan");
               match sequencer.handle().publish(info.payload.clone()) {
                   Ok((result, checkpoint)) => {

                       // If successful, add to published
                       state.on_published(result.tx.inscription());
                       state.save_checkpoint(checkpoint);
                   }
                   Err(e) => error!("failed to auto-republish: {e}"),
               }
           }
           OrphanedTx::AtomicWithdraw(_) => {
               error!("unexpected atomic-withdraw orphan - TUI does not publish bundles");
           }
       }
   }
   ```

1. Add a function to handle sequencer events and execute whichever of the above handlers is necessary for the current event:

   ```rust
   // Handle sequencer events
   //
   // event: current sequencer event
   fn handle_event(
    event: Event,
    state: &mut InMemoryZoneState,
    sequencer: &mut ZoneSequencer<NodeHttpClient>,
    ready_tx: &mut Option<tokio::sync::oneshot::Sender<()>>,) {
        match event {
            Event::Ready => handle_ready(state, ready_tx),
            Event::BlocksProcessed {
                checkpoint,
                channel_update,
                finalized,
            } => {
                apply_channel_update(channel_update, state, sequencer);
                if !finalized.is_empty() {
                    apply_finalized(&finalized, state);
                }
                state.save_checkpoint(checkpoint);
            }
            Event::MempoolPending(_) | Event::TurnNotification { .. } => {}
        }
    }
   ```

1. Add the processing loop to `run()` to watch for events:

   ```rust
   pub async fn run(args: InscribeArgs) {

       ...

       loop {
           tokio::select! {

               // Watch for events
               event = sequencer.next_event() => {
                   if let Some(event) = event {

                       // Update channel info
                       state.set_channel_view(view_rx.borrow().clone());
                       handle_event(event, &mut state, &mut sequencer, &mut ready_tx);
                   }
               }

               ...

               // Ctrl+C exits the loop
               _ = tokio::signal::ctrl_c() => {
                   println!();
                   break;
               }
           }
       }

       println!("Goodbye!");
   }
   ```

## Step 4: Publish data

Once the `ZoneSequencer` is set up, posting data to the channel is as easy as passing a vector of bytes to the sequencer handler's `publish` function. Once the transaction is submitted to the Zone SDK, this function returns a struct consisting of the inscription (message) ID and the current checkpoint.

1. Add the following code to process user input text in the `run` function in `src/lib.rs`:

   ```rust
   pub async fn run(args: InscribeArgs) {

       ...

       loop {
           tokio::select! {

               ...

               // Get input text from stdin
               input = stdin_rx.recv() => {

                   // Handle unexpected input
                   let Some(text) = input else {
                       println!();
                       break;
                   };

                   // Turn input into AppMessage wrapper. Includes unique ID for each transaction to avoid removing 'duplicate' messages
                   // from mempool
                   let msg = AppMessage::new(text);
                   debug!(tx_uuid = %msg.tx_uuid, text = %msg.text, "Publishing message");

                   // publish() takes bytes anyway, so must convert
                   let Ok(inscription) = Inscription::try_from(msg.to_bytes()) else {
                       error!("Message is too large to fit in an inscription");
                       continue;
                   };

                   // Publish data
                   match sequencer.handle().publish(inscription) {

                       // Get result and checkpoint, update Zone state
                       Ok((result, checkpoint)) => {
                           let info = result.tx.inscription();
                           debug!(msg_id = %hex::encode(info.this_msg.as_ref()), "Published");
                           state.on_published(info);
                           state.save_checkpoint(checkpoint);
                           ui::render_state(&state);
                           eprintln!("  \x1b[90mpending...\x1b[0m");
                           ui::prompt();
                       }
                       Err(lb_zone_sdk::sequencer::Error::Unavailable { reason }) => {
                           warn!("publish rejected: {reason}");
                           eprintln!(
                               "  \x1b[33msequencer is still starting up, try again in a moment\x1b[0m"
                           );
                           ui::prompt();
                       }
                       Err(e) => {
                           error!("failed to publish: {e}");
                           break;
                       }
                   }
               }

               ...

           }
       }

       ...

   }
   ```
