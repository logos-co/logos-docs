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
doc_version: 2
slug: inscribe-data-on-chain-using-zone-sdk
sidebar_position: 1
---

# Inscribe data on-chain using the Zone SDK

#### Learn how to write plain text as on-chain inscriptions using a simple Logos Zone.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

Applications built on Logos are implemented in execution environments known as [_Zones_](../concepts/about-zones.md), which post data _inscriptions_ on-chain via Logos channels. A Zone could host a versatile rollup with thousands of applications, such as the [Logos Execution Zone](../../lez/introduction-to-the-logos-execution-zone.md), or it could be a simple, standalone Zone tracking the state of just one application.

The [**Zone SDK**](../../get-started/glossary.md#zone-sdk) is a ready-to-use toolbox that handles basic interactions with a Logos Zone. This tutorial shows how to create a simple Logos Zone that writes plain text as on-chain inscriptions.

:::info[Prerequisites]

- A running [Logos Blockchain node](../get-started/run-a-logos-blockchain-node-from-cli.md) that has reached `Online` mode.
- A key in the node's wallet that holds funds, such as the `PoWClaim` key funded by [mining](../get-started/run-a-logos-blockchain-node-from-cli.md#step-4-mine-tokens-to-fund-your-node). The node spends this key's [notes](../../get-started/glossary.md#note) to pay each inscription's transaction fee.
- [Git](https://git-scm.com/) and the [Rust toolchain](https://www.rust-lang.org/tools/install).
:::

## What to expect

- You will initialise a `ZoneSequencer` that connects to your [Logos node](../../get-started/glossary.md#logos-node) and creates a new [channel](../../get-started/glossary.md#channel) for posting inscriptions.
- You will implement event handling so the sequencer tracks which of its inscriptions have finalised and keeps a checkpoint to resume from.
- You will publish plain-text messages as on-chain inscriptions and verify they are finalised in the channel.

## Step 1: Clone the Logos Blockchain repository

Before you begin, clone the [logos-blockchain](https://github.com/logos-blockchain/logos-blockchain) repository. The `tui-zone-tutorial` branch contains a skeleton implementation of the TUI Zone, built on the Zone SDK, with space to fill in the relevant code. A complete implementation of the TUI Zone exists on the `tui-zone-solution` branch.

1.  Run the following in your desired path to clone the repository and switch to the tutorial branch:

    ```bash
    git clone https://github.com/logos-blockchain/logos-blockchain.git
    cd logos-blockchain

    # To follow along with the tutorial
    git checkout tui-zone-tutorial
    cd deployment/tui-zone
    ```

    - The `deployment/tui-zone` directory exists only on the `tui-zone-tutorial` branch, so check out the branch before you change into it.

## Step 2: Initialise the `ZoneSequencer` struct

Sequencer functionality is provided via the `ZoneSequencer` struct from the Zone SDK, found in `logos-blockchain/zone-sdk/src/sequencer/zone_sequencer.rs`. When initialising this struct, provide the following arguments:

- `channel_id: ChannelId`—the ID of the channel associated with the Zone.
- `signing_key: Ed25519Key`—a key authorised to post updates to the channel.
- `node: Node`—a Node struct referring to your Logos Blockchain node, together with the credentials to access it. Created by `NodeHttpClient::new()`.
- `funding: FundingConfig`—the node wallet key that pays transaction fees, and places limits on how much the sequencer pays.
- `checkpoint: Option<SequencerCheckpoint>`—\[Optional] the checkpoint representing the most recently pushed channel update.

Before posting to a new channel, the sequencer must first generate an Ed25519 public/private key pair. **This initial public key defines the channel ID, while the private key becomes the first authorised signing key.** The channel is created when the sequencer posts a [message](../../get-started/glossary.md#message) with this channel ID, unless it already exists. Initially, only the sequencer with the signing key can post messages to the channel. Additional keys can be authorised via the [CHANNEL\_CONFIG](https://nomos-tech.notion.site/v1-2-Mantle-Specification-2ce261aa09df805ea358d80c2046cf95) [Mantle](../../get-started/glossary.md#mantle) Operation.

After the first channel message, further messages include a hash reference to the previous message in the channel. If a message is posted with an incorrect parent hash, it is rejected. **Providing a checkpoint lets the sequencer track the last message posted to its channel, allowing it to resume posting new updates after restarting.** A checkpoint is not necessary for the session during which a sequencer creates a new channel.

Every transaction the sequencer publishes must pay a fee. Before signing a transaction, the sequencer asks your node to fund it from a key in the node's wallet: the node adds a fee transfer and proves it, so the key's secret never leaves the node. `FundingConfig` sets how this works:

- `funding_pk`—the ZK public key, held by the node's wallet, whose notes pay the fees. The skeleton reads it from the `--funding-pk` command-line option into `args.funding_pk`.
- `change_pk`—where change from an atomic withdrawal goes. `None` sends it to `funding_pk`. Plain inscriptions do not use it.
- `max_tx_fee`—the highest fee the sequencer pays for a single transaction.
- `priority_fee_percent`—a reserve on top of the required fee, so the transaction still lands if fees rise slightly before it is included. `FundingConfig::DEFAULT_PRIORITY_FEE_PERCENT` is 12%.

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
1.  Fill in the `run()` function in `src/lib.rs` with the following code that creates a channel with an associated sequencer:

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

        // Pay transaction fees from a funded key in the node's wallet
        let funding = FundingConfig {
            funding_pk: args.funding_pk,
            change_pk: None,
            max_tx_fee: GasCost::new(1_000_000),
            priority_fee_percent: FundingConfig::DEFAULT_PRIORITY_FEE_PERCENT,
        };

        // Initialise ZoneSequencer
        let mut sequencer = ZoneSequencer::init(channel_id, signing_key, node, funding, checkpoint);

        // Wait to start reading from stdin until ready
        let (ready_tx, ready_rx) = tokio::sync::oneshot::channel();
        let mut stdin_rx = spawn_stdin_reader(ready_rx);
        let mut ready_tx = Some(ready_tx);

        ...

    }
    ```

## Step 3: Handle channel events

For a centralised Zone—a single sequencer that owns its channel—event handling is minimal. There are no competing sequencers, and a single sequencer never loses a [slot](../../get-started/glossary.md#slot), so the sequencer only needs to track which of its inscriptions have finalised and keep a checkpoint so it can resume after a restart. It learns about both through the Zone SDK's `Event` stream.

The status of the sequencer's backfill process, transactions sent by the sequencer, and any updates to the Zone state are communicated via the Zone SDK's `Event`. These events are:

- `Ready`—the sequencer is caught up and ready to accept updates. It fires once when the sequencer finishes catching up with the chain, and again each time it reconnects to the node.
- `BlocksProcessed`—a new block was processed. Includes the latest `checkpoint` and the list of `finalized` transactions. It also carries the `deposits` observed in the block and a `channel_update` reporting inscriptions that entered or left the channel, but those are only relevant to bridging and to channels shared by several sequencers—**a centralised Zone ignores them**.
- `TurnNotification`—the sequencer's turn to write in a turn-based decentralised sequencing scenario (not applicable to our example).

1.  In `src/state.rs`, add the following struct to track Zone state in memory and maintain the checkpoint. It implements the skeleton's `ZoneState` trait, which the skeleton's `src/ui.rs` uses to render the state:

    ```rust
    // Keep track of Zone state in memory
    //
    // published: Inscriptions published by your sequencer, not yet finalised
    // finalized: All finalised inscriptions
    // checkpoint: Last message in Zone state—lets the sequencer resume after a restart
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
    }

    impl ZoneState for InMemoryZoneState {
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

        fn published(&self) -> &[Msg] {
            &self.published
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
    ```
1.  Back in `src/lib.rs`, add a function to handle when the sequencer has finished [bootstrapping](../../get-started/glossary.md#bootstrapping):

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
1.  Add a function to apply finalised messages to the Zone state:

    ```rust
    // Apply finalised messages from chain to Zone state
    //
    // items: Finalised transactions
    // state: Zone state
    fn apply_finalized(items: &[FinalizedTx], state: &mut InMemoryZoneState) {

        // TUI only cares about inscriptions for rendering; deposit, withdraw,
        // config and channel transfer ops have no inscription payload.
        let inscriptions: Vec<InscriptionInfo> = items
            .iter()
            .flat_map(|t| t.ops.iter())
            .filter_map(|op| match op {
                FinalizedOp::Inscription(i) => Some(i.clone()),
                FinalizedOp::Deposit(_)
                | FinalizedOp::Withdraw(_)
                | FinalizedOp::Config(_)
                | FinalizedOp::ChannelTransfer(_) => None,
            })
            .collect();
        state.on_finalized(&inscriptions);
        ui::render_state(state);
        ui::prompt();
    }
    ```
1.  Add a function to handle sequencer events and execute whichever of the above handlers is necessary for the current event:

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
            Event::TurnNotification { .. } => {}
        }
    }
    ```
1.  Add the processing loop to `run()` to watch for events:

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

Once the `ZoneSequencer` is set up, posting data to the channel is as easy as passing a vector of bytes to the sequencer handle's asynchronous `publish` function. `publish` first asks your node to fund the transaction, then queues it for posting and returns the queued [inscription](../../get-started/glossary.md#inscription) together with the current checkpoint. It returns `Error::Unavailable` while the sequencer is still catching up with the chain or reconnecting to the node, and an error if the node cannot fund the transaction.

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
                    match sequencer.handle().publish(inscription).await {

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
                                "  \x1b[33msequencer is not ready (starting up or reconnecting), try again in a moment\x1b[0m"
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

1.  Find the public key of the node wallet key that pays the fees. If your node mines, use its `PoWClaim` key, which is the `public_key` of the auto-claim target:

    ```bash
    logosctl call blockchain_module pow_status | jq -r .result.value | jq .auto_claim.targets
    ```

1.  Check that the key holds funds. Replace `<FUNDING_KEY>` with the key from the previous step:

    ```bash
    curl -s http://localhost:8080/wallet/<FUNDING_KEY>/balance | jq .
    ```

    - If the request returns `404`, the key holds no notes yet. [Mine tokens](../get-started/run-a-logos-blockchain-node-from-cli.md#step-4-mine-tokens-to-fund-your-node) until it does.

1.  With the code filled in, build and run the sequencer from the `deployment/tui-zone` directory. The binary is named `tui-sequencer`:

    ```bash
    cargo run --bin tui-sequencer -- --node-url <YOUR_NODE_URL> --funding-pk <FUNDING_KEY>
    ```

    - `--node-url` defaults to `http://localhost:8080`, so you can omit it for a local node.
    - You can set `NODE_URL` and `FUNDING_PK` as environment variables instead of passing the options.

    The sequencer connects to your node, derives the channel ID from your signing key, and prints `Ready.` once it has caught up with the chain. Type a message and press Enter to publish it as an on-chain inscription. The first message creates the channel.

    Each message first appears under `Published` (pending). A block includes it within a few minutes, but it only moves to `Finalized` once that block is behind the last irreversible block (LIB). On the testnet the LIB trails the tip by about 44,000 slots, so this takes roughly 12 hours. Keep the sequencer running if you want to watch the move. Press Ctrl-D or enter an empty line to exit.

    - To confirm that your messages are on-chain before they finalise, query the channel using the `Channel ID` the sequencer printed at startup: `curl -s http://localhost:8080/channel/<CHANNEL_ID> | jq .`. It returns `Channel not found` until a block includes your first message, then the channel's state, where `tip_slot` is the slot of your latest included inscription.

    - If the sequencer exits with `failed to publish: network error: funding failed`, the node could not fund the transaction. Check that `--funding-pk` is a key in your node's wallet and that it holds funds.
