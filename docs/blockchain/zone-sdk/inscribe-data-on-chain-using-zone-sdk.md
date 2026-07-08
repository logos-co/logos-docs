---
title: Inscribe data on-chain using the Zone SDK
doc_type: procedure
product: blockchain
topics:
  - channels
  - zones
steps_layout: sectioned
authors: kashepavadan
owner: logos
doc_version: 1
slug: inscribe-data-on-chain-using-zone-sdk
---

# Inscribe data on-chain using the Zone SDK

#### Learn how to write plain text as on-chain inscriptions using a simple Logos Zone.

Applications built on Logos are implemented in execution environments known as [_Zones_](../concepts/about-zones.md), which post data _inscriptions_ on-chain via Logos channels. A [Zone](https://docs.logos.co/get-started/glossary#zone) could host a versatile rollup with thousands of applications, such as the [Logos Execution Zone](https://github.com/logos-co/logos-docs/blob/main/docs/blockchain/apps/wallet/journeys/quickstart-for-the-logos-execution-zone-wallet.md), or it could be a simple, standalone Zone tracking the state of just one application.

The [**Zone SDK**](https://docs.logos.co/get-started/glossary#zone-sdk) is a ready-to-use toolbox that handles basic interactions with a Logos Zone. This tutorial shows how to create a simple Logos Zone that writes plain text as on-chain inscriptions, based on the [TUI Zone demo](https://github.com/logos-blockchain/logos-blockchain/tree/master/deployment/tui-zone).

{% hint style="info" %}
You can try out a working version of the TUI Zone used in this tutorial directly from your [Logos Blockchain](https://docs.logos.co/get-started/glossary#logos-blockchain) node. Just run `./logos-blockchain-node inscribe`.
{% endhint %}

Before you begin, you will need:

- A running [Logos node](../)

## What to expect

- You will initialise a `ZoneSequencer` that connects to your [Logos node](https://docs.logos.co/get-started/glossary#logos-node) and creates a new [channel](https://docs.logos.co/get-started/glossary#channel) for posting inscriptions.
- You will implement event handling so the sequencer tracks which of its inscriptions have finalised and keeps a checkpoint to resume from.
- You will publish plain-text messages as on-chain inscriptions and verify they are finalised in the channel.

## Step 1: Clone the Logos Blockchain repository

Before you begin, clone the [logos-blockchain](https://github.com/logos-blockchain/logos-blockchain/tree/master) repository. The `tui-zone-tutorial` branch contains a skeleton implementation of the TUI Zone with space to fill in the relevant code. A more comprehensive implementation, which also supports decentralised sequencing, can be found in the `master` branch.

1.  Run the following in your desired path to clone the repository and switch to the tutorial branch:

    ```bash
    git clone https://github.com/logos-blockchain/logos-blockchain.git
    cd logos-blockchain/deployment/tui-zone

    # To follow along with the tutorial
    git checkout tui-zone-tutorial
    ```

## Step 2: Initialise the `ZoneSequencer` struct

Sequencer functionality is provided via the `ZoneSequencer` struct from the Zone SDK, found in `logos-blockchain/zone-sdk/src/sequencer/zone_sequencer.rs`. When initialising this struct, provide the following arguments:

- `channel_id: ChannelId` — the ID of the channel associated with the Zone.
- `signing_key: Ed25519Key` — a key authorised to post updates to the channel.
- `node: Node` — a Node struct referring to your Logos Blockchain node, together with the credentials to access it. Created by `NodeHttpClient::new()`.
- `checkpoint: Option<SequencerCheckpoint>` — \[Optional] the checkpoint representing the most recently-pushed channel update.

Before posting to a new channel, the sequencer must first generate an Ed25519 public/private key pair. **This initial public key defines the channel ID, while the private key becomes the first authorised signing key.** The channel is created when the sequencer posts a [message](https://docs.logos.co/get-started/glossary#message) with this channel ID, unless it already exists. Initially, only the sequencer with the signing key can post messages to the channel. Additional keys can be authorised via the [CHANNEL\_CONFIG](https://nomos-tech.notion.site/v1-2-Mantle-Specification-2ce261aa09df805ea358d80c2046cf95) [Mantle](https://docs.logos.co/get-started/glossary#mantle) Operation.

After the first channel message, further messages include a hash reference to the previous message in the channel. If a message is posted with an incorrect parent hash, it is rejected. **Providing a checkpoint lets the sequencer track the last message posted to its channel, allowing it to resume posting new updates after restarting.** A checkpoint is not necessary for the session during which a sequencer creates a new channel.

1.  Add a function to create a new private signing key in `src/lib.rs`:

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
2.  Fill in the `run()` function in `src/lib.rs` with the following code that creates a channel with an associated sequencer:

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

        // Wait to start reading from stdin until ready
        let (ready_tx, ready_rx) = tokio::sync::oneshot::channel();
        let mut stdin_rx = spawn_stdin_reader(ready_rx);
        let mut ready_tx = Some(ready_tx);

        ...

    }
    ```

## Step 3: Handle channel events

For a centralized Zone — a single sequencer that owns its channel — event handling is minimal. There are no competing sequencers, and a single sequencer never loses a [slot](https://docs.logos.co/get-started/glossary#slot), so the sequencer only needs to track which of its inscriptions have finalised and keep a checkpoint so it can resume after a restart. It learns about both through the Zone SDK's `Event` stream.

The status of the sequencer's backfill process, transactions sent by the sequencer, and any updates to the Zone state are communicated via the Zone SDK's `Event`. These events are:

- `Ready` — the sequencer is caught up and ready to accept updates.
- `BlocksProcessed` — a new block was processed. Includes the latest `checkpoint` and the list of `finalized` transactions. It also carries a `channel_update` (`adopted` / `orphaned` inscriptions), but that is only relevant when several sequencers share a channel — **a centralized Zone ignores it**.
- `MempoolPending` — transaction was accepted by node API and is waiting in mempool.
- `TurnNotification` — the sequencer's turn to write in a turn-based decentralised sequencing scenario (not applicable to our example).

1.  In `src/state.rs`, add the following struct to track Zone state in memory and maintain the checkpoint:

    ```rust
    // Keep track of Zone state in memory
    //
    // published: Inscriptions published by your sequencer, not yet finalised
    // finalized: All finalised inscriptions
    // checkpoint: Last message in Zone state — lets the sequencer resume after a restart
    #[derive(Default)]
    pub struct InMemoryZoneState {
        published: Vec<Msg>,
        finalized: Vec<Msg>,
        checkpoint: Option<SequencerCheckpoint>,
    }

    impl InMemoryZoneState {
        // Record a tx we just published locally, so the local view stays in
        // sync with what the SDK accepted. Called at the publish-call site.
        pub fn on_published(&mut self, info: &InscriptionInfo) {
            self.published
                .push(Msg::from_payload(info.this_msg, &info.payload));
        }

        // Move our finalised publishes out of `published` and into `finalized`.
        fn on_finalized(&mut self, inscriptions: &[InscriptionInfo]) {
            for info in inscriptions {
                if let Some(i) = self
                    .published
                    .iter()
                    .position(|m| m.msg_id == info.this_msg)
                {
                    self.published.remove(i);
                }
                if !self.finalized.iter().any(|m| m.msg_id == info.this_msg) {
                    self.finalized
                        .push(Msg::from_payload(info.this_msg, &info.payload));
                }
            }
        }

        pub fn published(&self) -> &[Msg] {
            &self.published
        }

        pub fn finalized(&self) -> &[Msg] {
            &self.finalized
        }

        pub fn save_checkpoint(&mut self, checkpoint: SequencerCheckpoint) {
            self.checkpoint = Some(checkpoint);
        }

        pub fn load_checkpoint(&self) -> Option<&SequencerCheckpoint> {
            self.checkpoint.as_ref()
        }
    }
    ```
2.  Back in `src/lib.rs`, add a function to handle when the sequencer has finished [bootstrapping](https://docs.logos.co/get-started/glossary#bootstrapping):

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
3.  Add a function to apply finalised messages to the Zone state:

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
    ```
4.  Add a function to handle sequencer events and execute whichever of the above handlers is necessary for the current event:

    ```rust
    // Handle sequencer events
    //
    // event: current sequencer event
    fn handle_event(
        event: Event,
        state: &mut InMemoryZoneState,
        ready_tx: &mut Option<tokio::sync::oneshot::Sender<()>>,
    ) {
        match event {
            Event::Ready => handle_ready(state, ready_tx),

            // Centralized Zone: ignore `channel_update` — a single sequencer
            // never loses a slot, so there is nothing to adopt or roll back.
            // Just apply finalised inscriptions and persist the checkpoint.
            Event::BlocksProcessed {
                checkpoint, finalized, ..
            } => {
                if !finalized.is_empty() {
                    apply_finalized(&finalized, state);
                }
                state.save_checkpoint(checkpoint);
            }
            Event::MempoolPending(_) | Event::TurnNotification { .. } => {}
        }
    }
    ```
5.  Add the processing loop to `run()` to watch for events:

    ```rust
    pub async fn run(args: InscribeArgs) {

        ...

        loop {
            tokio::select! {

                // Watch for events
                event = sequencer.next_event() => {
                    handle_event(event, &mut state, &mut ready_tx);
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

Once the `ZoneSequencer` is set up, posting data to the channel is as easy as passing a vector of bytes to the sequencer handler's `publish` function. Once the transaction is submitted to the Zone SDK, this function returns a struct consisting of the [inscription](https://docs.logos.co/get-started/glossary#inscription) (message) ID and the current checkpoint.

1.  Add the following code to process user input text in the `run` function in `src/lib.rs`:

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

## Step 5: Build and run the sequencer

1.  With the code filled in, build and run the sequencer from the `deployment/tui-zone` directory. The binary is named `tui-sequencer`:

    ```bash
    cargo run --bin tui-sequencer -- --node-url <Your Node URL>
    ```

    The sequencer connects to your node, derives the channel ID from your signing key, and prints `Ready.` once it has bootstrapped. Type a message and press Enter to publish it as an on-chain inscription.

    Each message first appears under **Published** (pending). Once your node finalises the block containing it, the message moves to **Finalized** — confirming the inscription is on-chain. Press Ctrl-D or enter an empty line to exit.
