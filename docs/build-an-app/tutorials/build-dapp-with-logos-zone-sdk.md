---
title: Build a dApp with the Logos Zone SDK
doc_type: procedure
product: blockchain
topics: [channels, zones]
steps_layout: sectioned
authors: kashepavadan
owner: logos
doc_version: 1
slug: build-dapp-with-logos-zone-sdk
---

# Build a dApp with the Logos Zone SDK

#### Learn how to use the Zone SDK to implement a decentralised password manager application.

This tutorial covers building a Logos [Zone](/get-started/glossary#zone) from scratch using the [Zone SDK](/get-started/glossary#zone-sdk). Zones are execution environments built on the [Logos Blockchain](/get-started/glossary#logos-blockchain) that post data as on-chain inscriptions via Logos channels. A Zone can host a versatile rollup with thousands of applications, such as the [Logos Execution Zone](../../lez/get-started/quickstart-for-the-logos-execution-zone-wallet.md), or a simple standalone Zone tracking the state of a single application.

The Zone SDK provides a ready-to-use toolbox for basic interactions with a Logos Zone. Every Zone is operated by one or more **sequencers**, which collect transactions, batch them, and publish them as inscriptions on the Logos Blockchain. **Indexers** are nodes that follow a Zone's updates on-chain, re-executing them locally to maintain an up-to-date copy of the Zone state. The Zone SDK supports building both.

The tutorial uses a [password manager](https://github.com/H2CO3/steelsafe) Zone as the running example: a single sequencer posts SQL transactions on-chain, and one or more indexers replay those transactions to sync their local state. The password manager maintains state in a SQLite database, with updates taking the form of SQL transactions applied to that database. The Zone design maps onto those concepts as follows:

- The user interacts with the password manager on the main device (in the `sequencer` folder) to add or update passwords.
- The main device operates as a **sequencer**, posting SQL transactions as inscriptions to its [channel](/get-started/glossary#channel).
- Secondary devices operate as **indexers**, following the channel and obtaining SQL transactions from the chain.
- Secondary devices run a read-only version of the password manager (in the `indexer` folder), applying SQL transactions from the channel to update their local state.

{% hint style="info" %}
Read [**Decentralise the Log, Not the Server**](https://press.logos.co/article/decentralise-log-not-server) for the motivation behind this design.
{% endhint %}

The implementation skeleton already has most of the password manager code written. This tutorial will focus on using the Zone SDK to write the sequencer and indexer functionality, contained primarily in the `sequencer/src/sequencer.rs` and `indexer/src/indexer.rs` files.

**Before you start:**

- [Git](https://git-scm.com/)
- [Rust toolchain](https://www.rust-lang.org/tools/install) (stable)
- Access to a running Logos Blockchain node (see [documentation](../../blockchain/get-started/run-a-logos-blockchain-node-from-cli.md))

## What to expect

- You will configure a `ZoneSequencer` that signs and publishes SQL transactions as on-chain inscriptions.
- You will configure a `ZoneIndexer` that follows a channel and applies incoming inscriptions to a local database.
- You will have a compilable password manager Zone demo that illustrates core Zone SDK patterns.

## Set up the repository

Clone the [Logos SQL Zone](https://github.com/logos-blockchain/logos-sql-zone) repository, which contains all dependencies and password manager code unrelated to Zone functionality.

1. Clone the repository:

   ```bash
   git clone https://github.com/logos-blockchain/logos-sql-zone.git
   ```

1. Switch to the `tutorial` branch and initialise submodules:

   ```bash
   cd logos-sql-zone
   git checkout tutorial
   
   git submodule update --init --recursive
   ```

   The complete demo is available in the `master` branch.

## Sequencer

The sequencer is the node that accepts user transactions, batches them, and posts them as inscriptions to the Logos Blockchain. The steps in this section implement the sequencer using the Zone SDK, using the password manager Zone as the example.

### Step 1: Initialise the `ZoneSequencer` struct

Your sequencer wraps the `ZoneSequencer` struct from the Zone SDK, found in `logos-blockchain/zone-sdk/src/sequencer/zone_sequencer.rs`. Initialising it requires these arguments:

- `channel_id: ChannelId` — the ID of the channel associated with the Zone.
- `signing_key: Ed25519Key` — a key authorised to post updates to the channel.
- `node: Node` — a `Node` struct referring to your Logos Blockchain node, created by `NodeHttpClient::new()`.
- `checkpoint: Option<SequencerCheckpoint>` — (optional) the checkpoint representing the most recently pushed channel update.

Before posting to a new channel, the sequencer must generate an Ed25519 public/private key pair. **The initial public key defines the channel ID; the private key becomes the first authorised signing key.** The channel is created when the sequencer posts a [message](/get-started/glossary#message) with this channel ID, unless the channel already exists. Additional keys can be authorised via the [CHANNEL_CONFIG](https://nomos-tech.notion.site/v1-2-Mantle-Specification-2ce261aa09df805ea358d80c2046cf95) [Mantle](/get-started/glossary#mantle) Operation.

After the first channel message, each subsequent message includes a hash reference to the previous one. A message with an incorrect parent hash is rejected. **Providing a checkpoint lets the sequencer resume posting after a restart.** A checkpoint is not required during the session that creates a new channel.

1. In `sequencer/src/sequencer.rs`, add the `Sequencer` struct definition:

   ```rust
   // The sequencer that handles transactions using the Zone SDK
   //
   // sequencer: The ZoneSequencer instance used by our wrapper
   // client: Async handle for submitting requests to Zone SDK sequencer
   // state: A helper struct for keeping track of transaction state,
   //          see more on this below.
   // queue_file: The path to a file that holds SQL transactions not yet posted to the channel
   // checkpoint_path: The path to the channel checkpoint file
   pub struct Sequencer {
       sequencer: ZoneSequencer<NodeHttpClient>,
       client: SequencerClient,
       state: InMemoryZoneState,
       queue_file: String,
       checkpoint_path: String,
   }
   ```

1. Add a function to load or generate a private signing key:

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
           rand::RngCore::fill_bytes(&mut rand::rng(), &mut key_bytes);
           fs::write(path, key_bytes).expect("failed to write key file");
           Ed25519Key::from_bytes(&key_bytes)
       }
   }
   ```

1. Add a function to restore from a saved checkpoint:

   ```rust
   // Restore from saved checkpoint
   //
   // path: Path to checkpoint file
   fn load_checkpoint(path: &Path) -> Option<SequencerCheckpoint> {
       if !path.exists() {
           return None;
       }
       let data = fs::read(path).expect("failed to read checkpoint file");
       Some(serde_json::from_slice(&data).expect("failed to deserialize checkpoint"))
   }
   ```

1. Add the `new` function to the `Sequencer` struct implementation:

   ```rust
   impl Sequencer {
   
       // Create a new Sequencer
       //
       // node_endpoint: Address of Logos Blockchain node
       // signing_key_path: Path to file containing signing key
       // node_auth_username: Username to access node
       // node_auth_password: Password to access node
       // queue_file: Path to file storing queued SQL statements
       // checkpoint_path: Path to file containing latest channel checkpoint
       // channel_path: Path to file with channel ID
       pub async fn new(
           node_endpoint: &str,
           signing_key_path: &str,
           node_auth_username: Option<String>,
           node_auth_password: Option<String>,
           queue_file: &str,
           checkpoint_path: &str,
           channel_path: &str,
       ) -> Result<Self> {
           let node_url = Url::parse(node_endpoint).map_err(|e| SequencerError::Url(e.to_string()))?;
   
           let basic_auth = node_auth_username
               .map(|username| BasicAuthCredentials::new(username, node_auth_password));
   
           // Create files from paths if they don't exist
           for path in [signing_key_path, checkpoint_path, channel_path] {
               if let Some(parent) = Path::new(path).parent() {
                   fs::create_dir_all(parent)?;
               }
           }
   
           let checkpoint = load_checkpoint(Path::new(checkpoint_path));
           if checkpoint.is_some() {
               println!("  Restored checkpoint from {checkpoint_path}");
           }
   
           // Produce channel ID from signing key
           let signing_key = load_or_create_signing_key(Path::new(signing_key_path));
           let channel_id = ChannelId::from(signing_key.public_key().to_bytes());
           fs::write(channel_path, hex::encode(channel_id.as_ref()))
               .expect("failed to write channel id");
   
           // Initialise the ZoneSequencer
           let node = NodeHttpClient::new(CommonHttpClient::new(basic_auth), node_url);
           let sequencer = ZoneSequencer::init(channel_id, signing_key, node, checkpoint);
           let client = sequencer.client();
   
           Ok(Self {
               sequencer,
               client,
               state: InMemoryZoneState::default(),
               queue_file: queue_file.to_owned(),
               checkpoint_path: checkpoint_path.to_owned(),
           })
       }
   
       ...
   
   }
   ```

### Step 2: Publish data to the channel

Once the `ZoneSequencer` is set up, posting data to the channel is as simple as passing a byte vector to the sequencer's `publish` function, which returns an [inscription](/get-started/glossary#inscription) ID and the current checkpoint.

Whenever the password manager's database is updated, the SQL transactions are also written to a queue file. This functionality is already implemented in the `sequencer/src/db.rs` file. A processing loop continuously checks for new SQL transactions from the password database and submits them as plain text to the Zone.

1. In `sequencer/src/sequencer.rs`, add a function to save checkpoints after each published update:

   ```rust
   // Write latest checkpoint to file
   //
   // path: Path to checkpoint file
   // checkpoint: Checkpoint message
   fn save_checkpoint(path: &Path, checkpoint: &SequencerCheckpoint) {
       let data = serde_json::to_vec(checkpoint).expect("failed to serialize checkpoint");
       fs::write(path, data).expect("failed to write checkpoint file");
   }
   ```

1. Add a function to read pending SQL transactions from the queue file and clear it:

   ```rust
   // Drain the queue file and return all pending queries
   //
   // queue_file: File for queued SQL statements
   fn queue_drain(queue_file: &str) -> Result<Vec<String>> {
   
       // Check if queue_file is empty
       let file = match OpenOptions::new().read(true).write(true).open(queue_file) {
           Ok(f) => f,
           Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
           Err(e) => return Err(SequencerError::Io(e)),
       };
   
       file.lock_exclusive()?;
   
       let reader = BufReader::new(&file);
       let mut queue_vec = Vec::new();
       for query in reader.lines() {
           queue_vec.push(query?);
       }
   
       // Clear queue file
       file.set_len(0)?;
   
       Ok(queue_vec)
   }
   ```

1. Add a function to publish the pending SQL transactions as a single inscription:

   ```rust
   // Process all pending queries as a single inscription
   //
   // queue_file: File for queued SQL statements
   async fn process_pending_batch(queue_file: &str, client: &SequencerClient) -> Result<()> {
   
       // Read list of pending SQL statements
       let pending = queue_drain(queue_file)?;
       if pending.is_empty() {
           return Ok(());
       }
   
       let count = pending.len();
       debug!("Processing batch of {} queries", count);
   
       // Publish batch of statements
       let sql_bytes = pending.join("\n").into_bytes();
       let inscription = Inscription::try_from(sql_bytes)
           .map_err(|e| SequencerError::InscriptionTooLarge(e.to_string()))?;
       if let Err(e) = client.publish(inscription).await {
           error!("failed to publish batch: {e}");
       } else {
           info!("Submitted batch of {} statement(s)", count);
       }
   
       Ok(())
   }
   ```

1. Add the `run` function to the `Sequencer` struct implementation to poll the queue and publish its contents:

   ```rust
   impl Sequencer {
   
       ...
   
       // Processing loop
       pub async fn run(self) {
           let Self { mut sequencer, client, mut state, queue_file, checkpoint_path } = self;
   
           // Loop to check queue and publish
           let batch_client = client;
           tokio::spawn(async move {
               // Wait until the sequencer completes cold-start backfill before publishing.
               let mut ready_rx = batch_client.subscribe_ready();
               drop(ready_rx.wait_for(|r| *r).await);
   
               let mut interval = tokio::time::interval(Duration::from_millis(100));
               loop {
                   interval.tick().await;
                   if let Err(e) = process_pending_batch(&queue_file, &batch_client).await {
                       error!("Batch processing failed: {e}");
                   }
               }
           });
   
           ...
   
       }
   }
   ```

### Step 3: Handle channel events

The sequencer must track the Zone state on the blockchain so it can detect reorgs, finalized blocks, and updates from other sequencers. In our example, there is only one sequencer, and therefore the state only has to track which inscriptions have finalized. The Zone SDK communicates these via `Event`:

- `Ready` — the sequencer is caught up and ready to accept updates.
- `BlocksProcessed` — a new block was processed. Includes the latest `checkpoint` and the list of `finalized` transactions. It also carries a `channel_update` (`adopted` / `orphaned` inscriptions), but that is only relevant when several sequencers share a channel — **a centralized Zone ignores it**.
- `MempoolPending` — transaction was accepted by node API and is waiting in mempool.
- `TurnNotification` — the sequencer's turn to write in a turn-based decentralised sequencing scenario (not applicable to our example).

1. In `common/src/state.rs`, add the `InMemoryZoneState` struct to track inscription IDs:

   ```rust
   // Keep track of Zone state in memory
   //
   // published: Inscriptions published by your sequencer but not yet finalised or orphaned
   // finalized: All finalised inscriptions
    #[derive(Default)]
    pub struct InMemoryZoneState {
        published: Vec<Msg>,
        finalized: Vec<Msg>,
    }

    impl ZoneState for InMemoryZoneState {
        fn on_published(&mut self, info: &InscriptionInfo) {
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

        fn published(&self) -> &[Msg] {
            &self.published
        }

        fn finalized(&self) -> &[Msg] {
            &self.finalized
        }
    }
   ```

1. In `sequencer/src/sequencer.rs`, add a function to handle events:

   ```rust
   // Handle channel events
   //
   // event: Channel event enum
   // state: Zone state struct from common/src/state.rs
   // checkpoint_path: Path to checkpoint file
   fn handle_event(
       event: Event,
       state: &mut InMemoryZoneState,
       checkpoint_path: &str,
   ) {
       match event {
           Event::Ready => {
               info!("Sequencer ready");
           }
           Event::BlocksProcessed { checkpoint, channel_update, finalized } => {
   
               // Add newly-finalized inscriptions to the finalized list
               let inscriptions: Vec<_> = finalized
                   .into_iter()
                   .flat_map(|tx| tx.ops.into_iter())
                   .filter_map(|op| match op {
                       FinalizedOp::Inscription(info) => Some(info),
                       _ => None,
                   })
                   .collect();
               state.on_finalized(&inscriptions);
               save_checkpoint(Path::new(checkpoint_path), &checkpoint);
           }
           Event::MempoolPending(_) | Event::TurnNotification { .. } => {}
       }
   }
   ```

1. Add an event loop to the `run` function in the `Sequencer` struct:

   ```rust
   impl Sequencer {
   
       ...
   
       // Processing loop
       pub async fn run(self) {
   
           ...
   
           loop {
               let event = sequencer.next_event().await;
               handle_event(event, &mut state, &checkpoint_path);
           }
       }
   }
   ```

## Indexer

The indexer is the node that follows a Zone's channel on the Logos Blockchain and re-executes updates locally to maintain a current copy of the Zone state. The steps in this section implement the indexer using the Zone SDK, continuing the password manager example. The indexer must obtain the sequencer's channel ID via an out-of-band mechanism (in our case, the `channel_path` file) before it can start.

### Step 1: Initialise the `ZoneIndexer` struct

Your indexer wraps the `ZoneIndexer` struct from the Zone SDK, found in `logos-blockchain/zone-sdk/src/indexer.rs`. Initialising it requires:

- `channel_id: ChannelId` — the ID of the channel associated with the Zone.
- `node: Node` — a `Node` struct referring to your Logos Blockchain node, created by `NodeHttpClient::new()`.

1. In `indexer/src/indexer.rs`, add the `Indexer` struct definition:

   ```rust
   // Indexer struct
   //
   // zone_indexer: SDK indexer
   // db_path: Path to password database file
   pub struct Indexer {
       zone_indexer: ZoneIndexer<NodeHttpClient>,
       db_path: String,
   }
   ```

1. Add a helper function to parse a channel ID from a hex string:

   ```rust
   // Parse channel ID from string
   //
   // channel_id_str: channel ID
   fn parse_channel_id(channel_id_str: &str) -> Result<ChannelId> {
   
       // string to bytes
       let decoded = hex::decode(channel_id_str).map_err(|_| {
           Error::InvalidChannelId(format!(
               "INDEXER_CHANNEL_ID must be a valid hex string, got: '{channel_id_str}'"
           ))
       })?;
   
       // to 32 bytes
       let channel_bytes: [u8; 32] = decoded.try_into().map_err(|v: Vec<u8>| {
           Error::InvalidChannelId(format!(
               "INDEXER_CHANNEL_ID must be exactly 64 hex characters (32 bytes), got {} characters ({} bytes)",
               v.len() * 2,
               v.len()
           ))
       })?;
   
       Ok(ChannelId::from(channel_bytes))
   }
   ```

1. Add the `new` function to the `Indexer` struct implementation:

   ```rust
   impl Indexer {
   
       // Create new indexer
       //
       // db_path: Path to local password db
       // node_endpoint: Address of Logos Blockchain node
       // channel_path: Path to file with channel ID
       // node_auth_username: Username to access node
       // node_auth_password: Password to access node
       pub fn new(
           db_path: &str,
           node_endpoint: &str,
           channel_path: &str,
           node_auth_username: Option<String>,
           node_auth_password: Option<String>,
       ) -> Result<Self> {
           let node_url = Url::parse(node_endpoint).map_err(|e| Error::Url(e.to_string()))?;
   
           let basic_auth = node_auth_username
               .map(|username| BasicAuthCredentials::new(username, node_auth_password));
   
           // Parse channel ID
           let channel_id_str = fs::read_to_string(channel_path).map_err(|e| {
               Error::InvalidChannelId(format!("Failed to read channel path '{channel_path}': {e}"))
           })?;
           let channel_id = parse_channel_id(channel_id_str.trim())?;
   
           info!("Channel ID: {}", hex::encode(channel_id.as_ref()));
   
           // New ZoneIndexer
           let node = NodeHttpClient::new(CommonHttpClient::new(basic_auth), node_url);
           let zone_indexer = ZoneIndexer::new(channel_id, node);
   
           Ok(Self { zone_indexer, db_path: db_path.to_owned() })
       }
   
       ...
   
   }
   ```

### Step 2: Follow the channel

An indexer uses the `follow` function to check new blocks for channel updates. It returns a stream that can be iterated to obtain the latest messages. Once a block with a new channel message is finalised, the indexer applies the message to update its local state.

1. Add the `run` function to the `Indexer` struct implementation:

   ```rust
   impl Indexer {
   
       ...
   
       // Follow the Zone channel & apply updates
       pub async fn run(self) {
   
           // Open database at db_path
           let db = match DatabaseReadOnly::open(&self.db_path) {
               Ok(db) => db,
               Err(e) => {
                   error!("Failed to open database: {e}");
                   return;
               }
           };
   
           loop {
   
               // Follow channel & create stream
               info!("Connecting to zone block stream...");
               let stream = match self.zone_indexer.follow().await {
                   Ok(s) => s,
                   Err(e) => {
                       error!("Failed to connect to block stream: {e}");
                       tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                       continue;
                   }
               };
               info!("Connected to zone block stream");
   
               // Get next message from stream
               futures::pin_mut!(stream);
               while let Some(zone_msg) = stream.next().await {
   
                   // Ensure zone_block includes the inscriptions but not the deposit operations in the block
                   let logos_blockchain_zone_sdk::ZoneMessage::Block(zone_block) = zone_msg else {
                       continue;
                   };
                   
                   let sql_text = match String::from_utf8(Vec::from(zone_block.data)) {
                       Ok(s) => s,
                       Err(e) => {
                           error!("Zone block data is not valid UTF-8: {e}");
                           continue;
                       }
                   };
   
                   // Extract SQL statements from message
                   let statements: Vec<&str> = sql_text
                       .lines()
                       .map(|l: &str| l.trim().trim_end_matches(';').trim())
                       .filter(|s: &&str| !s.is_empty())
                       .collect();
   
                   if statements.is_empty() {
                       continue;
                   }
   
                   info!("Applying {} SQL statement(s)", statements.len());
   
                   // Apply statements to db
                   for stmt in &statements {
                       if let Err(e) = db.execute_batch(stmt) {
                           error!("Failed to execute SQL '{}': {e}", stmt);
                       }
                   }
                   info!("Applied {} statement(s)", statements.len());
               }
   
               error!("Zone block stream ended, reconnecting...");
               tokio::time::sleep(std::time::Duration::from_secs(5)).await;
           }
       }
   }
   ```

## Frequently asked questions

### What other Zones can I build with the SDK?

This tutorial covered a simple single-sequencer appchain, but the Zone SDK supports a much wider range. You could build traditional ZK or optimistic rollups, high-throughput appchains, or applications compartmentalised across several Zones. Logos Zones also support interoperability features such as bridging Layer 1 tokens into Zones, on-chain message passing between Zones, and complex cross-Zone transaction coordination.

### Where do I find instructions for running the demo?

Instructions for building and interacting with the sequencer and indexer applications are in the `README.md` file in the repository root.