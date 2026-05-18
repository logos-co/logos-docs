# Creating a Logos Zone with the Zone SDK
## Introduction
Applications built on Logos are implemented in execution environments known as *Zones*, which are lightweight appchains that use the Logos Blockchain for settlement and ordering. A Zone could host a versatile rollup with thousands of applications, such as the [Logos Execution Zone](../apps/wallet/journeys/quickstart-for-the-logos-execution-zone-wallet.md). It could also be a simple, standalone Zone keeping track of the state of just one application, or anything in between.

The **Zone SDK** is a ready-to-use toolbox of code that handles basic interactions with a Logos Zone. Developers can use the SDK to simplify the process of building their own Zones and Zone apps.

### Who Interacts with a Zone?

Every Zone is operated by one or more **sequencers**. These sequencers collect transactions from users, batch them, and publish them in the form of an inscription to a Channel on the Logos Blockchain.

**Indexers** are nodes that follow a Zone's updates on the Logos Blockchain. They re-execute these updates locally to obtain an updated copy of the Zone state, as set by the sequencer. The Zone SDK provides functionality for implementing both sequencers and indexers.

Depending on the type of environment the Zone maintains, there could be other actors interacting with the Zone as well. For example, ZK rollup Zones may use provers and validators to ensure the correctness of state transitions. These more complex roles are not directly supported by the Zone SDK, but can be built by integrating basic features from the SDK's sequencer and indexer types.

### Channels
To safeguard the correct ordering of updates from Sovereign Zones, data posted to the blockchain is assigned to a *Logos channel* dedicated to that Zone. Logos channels (sometimes called Mantle channels) are implemented as permissioned hash chains of messages. Each message, or *inscription*, is signed by the Zone’s sequencer, who stores the message on-chain via an operation sent to the Logos Blockchain. For Sovereign Zones, an inscription typically consists of a Zone state update, although channel messages can be used for other purposes, too. 

An example of how messages from two Logos channels can be written to the Logos Blockchain is shown below.

![Two Mantle channel message chains, depicted with the Logos Blockchain blocks they are inscribed in.](./zone-sdk-tutorial/image1.png)

### Tutorial

This tutorial will walk you through the functionality provided by the Zone SDK, structured as a step-by-step guide to building your own Zone by progressively adding more SDK features to nodes interacting with a Zone.

Each step in the tutorial is accompanied by example code using the Zone SDK to build a [password manager](https://github.com/H2CO3/steelsafe) Zone. This Zone is sequenced by a single sequencer, with multiple indexers following its updates. However, the major concepts will be applicable to all Sovereign Zones on Logos.

To make things easier, we’ve provided a bare-bones implementation skeleton that contains all dependencies and password manager code not related to Zone functionality. As you work through the tutorial, you can add the example code in each step to the correct location of the skeleton file. By the end of the tutorial, you will have a working password manager Zone demo that is ready to be compiled.

## Getting Started
### Clone Logos Blockchain Repo
Before beginning this tutorial, you should clone the [Logos SQL Zone](https://github.com/logos-blockchain/logos-sql-zone) repository.

To clone the repository with git, run the following in your desired path:

```bash
git clone https://github.com/logos-blockchain/logos-sql-zone.git
```

#### Example Application Skeleton
To follow along with the tutorial example, switch to the `tutorial` branch:

```bash
cd logos-sql-zone
git checkout tutorial
```

The complete demo is available in the `master` branch.

### Access to Logos Blockchain Node
It's also important for your sequencer and indexers to have access to a Logos Blockchain Node. See the [documentation](../quickstart-guide-for-the-logos-blockchain-node.md) for instructions on how to start your own node and connect to the Testnet.

## Sequencer
### Define Your Zone Environment
The first step to creating a Logos Zone is defining the Zone state - what application(s) it will host, how the state is updated, and in what form updates are posted on-chain.

#### Example
In this tutorial, we'll be adapting an existing Rust [password manager](https://github.com/H2CO3/steelsafe) application to the Logos Zone context. The goal is for the user to be able to update their passwords on one device, with other devices syncing their state to match the main device. This design is useful for users who want to avoid relying on managed hosting for their password manager, and don't want to be burdened by self-hosting on their own server. 

> Read [**Decentralise the Log, Not the Server**](https://press.logos.co/article/decentralise-log-not-server) for the motivation behind this design.

This application maintains its state by using a sqlite database, with updates taking the form of SQL transactions applied to the database. To work as a Logos Zone, we will adopt the design as follows:

* The user will interact with the password manager on the main device (in the `sequencer` folder) whenever they want to add or update passwords in the manager.
* The main device will operate as a **sequencer**, posting SQL transactions as inscriptions to its channel.
* Secondary devices will operate as **indexers**, following the channel and obtaining SQL transactions from the chain.
* Secondary devices will run a read-only version of the password manager (in the `indexer` folder), applying SQL transactions from the channel to update the state.

The implementation skeleton already has most of this password manager code written. This tutorial will focus on using the Zone SDK to write the sequencer and indexer functionality, contained primarily in the `sequencer/src/sequencer.rs` and `indexer/src/indexer.rs` files.

### Initialise the `ZoneSequencer` Struct
Your sequencer will be implemented as a wrapper for the `ZoneSequencer` struct from the Zone SDK, found in the `logos-blockchain/zone-sdk/src/sequencer.rs` file. When initialising this struct, you must provide the following arguments:

* `channel_id: ChannelId` - The ID of the channel associated with the Zone.
* `signing_key: Ed25519Key` - A key authorised to post updates to the channel.
* `node: Node` - A Node struct referring to your Logos Blockchain node, together with the credentials to access it. It is created by `NodeHttpClient::new()`.
* `checkpoint: Option<SequencerCheckpoint>` - [Optional] The checkpoint representing the most recently-pushed channel update.

Initialising a `ZoneSequencer` also creates an associated `SequencerHandle` that is used for interacting with the sequencer.

Before posting to a new channel, the sequencer must first generate an Ed25519 public/private key pair. **The public key defines the channel ID, while the private key becomes the signing key**. The channel is created when the sequencer posts a message with this channel ID, unless it already exists. Initially, only the sequencer with the signing key can post messages to the channel. Additional keys can be authorised via the [CHANNEL_CONFIG](https://nomos-tech.notion.site/v1-2-Mantle-Specification-2ce261aa09df805ea358d80c2046cf95) Mantle Operation.

After the first channel message, further messages include a hash reference to the previous message in the channel. If a message is posted with an incorrect parent hash, it is rejected by the channel. **Providing a checkpoint lets the sequencer keep track of the last message posted to its channel, allowing it to resume posting new updates after restarting**. A checkpoint is not necessary for the session during which a sequencer creates a new channel.

#### Example
In the `sequencer/src/sequencer.rs` file, add the `Sequencer` struct definition:

```rust
// The sequencer that handles transactions using the Zone SDK
//
// sequencer: The ZoneSequencer instance used by our wrapper
// handle: Handle for submitting requests to Zone SDK sequencer
// state: A helper struct for keeping track of transaction state,
//          see more on this below.
// queue_file: The path to a file that holds SQL transactions not yet posted to the channel
// checkpoint_path: The path to the channel checkpoint file
pub struct Sequencer {
    sequencer: ZoneSequencer<NodeHttpClient>,
    handle: SequencerHandle<NodeHttpClient>,
    state: InMemoryZoneState,
    queue_file: String,
    checkpoint_path: String,
}
```

Below, add a function to create a new private signing key:

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

Add the function below to handle restoring from a checkpoint:

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

Finally, you can begin filling in the implementation for the `Sequencer` struct, starting with the `new` function:
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
        let (sequencer, handle) = ZoneSequencer::init(channel_id, signing_key, node, checkpoint);

        Ok(Self {
            sequencer,
            handle,
            state: InMemoryZoneState::default(),
            queue_file: queue_file.to_owned(),
            checkpoint_path: checkpoint_path.to_owned(),
        })
    }

    ...

}
```

### Publish Data
Once the `ZoneSequencer` and is set up, posting data to the channel is as easy as passing a vector of bytes to the sequencer handle's `publish_message` function. Once the transaction is posted to the network, this function will return a struct consisting of the inscription (message) ID and the current checkpoint.

#### Example
In our password manager example, a processing loop continuously checks if there are new SQL transactions produced by the password database. If so, these transactions are submitted as plain text to the Zone.

Before you begin implementing this loop, add the following function to the `sequencer/src/sequencer.rs` file to enable you to save checkpoints to the checkpoint file whenever an update is published. 

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

Whenever the password database is updated, the SQL transactions are also written to a queue file. This functionality is already implemented in the `sequencer/src/db.rs` file.

In this tutorial, we will focus on reading these transactions from the queue file and submitting them to the channel. Add the function below to read from queue file and clear it when done:

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

Then, add the following function to publish the pending SQL transactions obtained from the `queue_drain` function.

```rust
// Process all pending queries as a single inscription
//
// queue_file: File for queued SQL statements
// handle: Handle for Sequencer submissions
async fn process_pending_batch(
    queue_file: &str,
    handle: &SequencerHandle<NodeHttpClient>,
) -> Result<()> {
    let pending = queue_drain(queue_file)?;
    if pending.is_empty() {
        return Ok(());
    }

    let count = pending.len();
    debug!("Processing batch of {} queries", count);

    let sql_text = pending.join("\n").as_bytes().to_vec();
    if let Err(e) = handle.publish_message(sql_text).await {
        error!("failed to publish batch: {e}");
    } else {
        info!("Submitted batch of {} statement(s)", count);
    }

    Ok(())
}
```

Within the Sequencer struct implementation, add the following function to periodically check the queue_file and publish its contents. This function also handles channel events.

```rust
impl Sequencer {

    ...

    // Processing loop
    pub async fn run(self) {
        let Self { mut sequencer, handle, mut state, queue_file, checkpoint_path } = self;

        // Loop to check queue and publish
        let mut batch_handle = handle.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_millis(100));
            loop {
                interval.tick().await;
                batch_handle.wait_ready().await;
                if let Err(e) = process_pending_batch(&queue_file, &batch_handle).await {
                    error!("Batch processing failed: {e}");
                }
            }
        });

        ...

    }
}
```

### Handle Channel Events
It is important for your sequencer to keep track of the Zone state on the blockchain and how this differs from the state it maintains locally. A reorg could remove Zone update inscriptions from the canonical chain, or another sequencer could update the Zone state in a Zone with multiple sequencers. For this reason, the sequencer must be able to query the status of Zone updates they've published, and to what extent it is caught up with the latest blockchain state.

The status of the sequencer's backfill process, transactions sent by the sequencer, and any updates to the Zone state are communicated via the Zone SDK's `Event`. These events are:

* `FinalizedInscriptions` - Finalised inscriptions discovered during backfill.
* `Ready` - The sequencer is caught up and ready to accept updates.
* `Published` - When an inscription is published, provides the updated channel checkpoint and a key to distinguish identical payloads published separately.
* `TxsFinalized` - Transaction hashes and inscriptions that have been finalised on-chain.
* `ChannelUpdate` - Provides inscriptions published by other sequencers for this Zone ("adopted") and inscriptions that are no longer on the canonical chain ("orphaned").

#### Example
To keep track of the inscription IDs provided by the SDK via the events, add the following code in the `common/src/state.rs` file:

```rust
// Keep track of Zone state in memory
//
// published: Inscriptions published by your sequencer but not yet finalised or orphaned
// adopted: Inscriptions published by other sequencers. Not applicable in our example.
// finalized: All finalised inscriptions
#[derive(Default)]
pub struct InMemoryZoneState {
    published: Vec<Msg>,
    adopted: Vec<Msg>,
    finalized: Vec<Msg>,
}

impl ZoneState for InMemoryZoneState {
    fn on_published(&mut self, info: &InscriptionInfo) {
        self.published
            .push(Msg::from_payload(info.this_msg, &info.payload));
    }

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
}
```

Then, back in the `sequencer/src/sequencer.rs` file, add the following function to handle events:

```rust
// Handle channel events
//
// event: Channel event enum.
// handle: Sequencer handle for publishing messages
// state: Zone state struct from common/src/state.rs
// checkpoint_path: Path to checkpoint file
async fn handle_event(
    event: Event,
    handle: &SequencerHandle<NodeHttpClient>,
    state: &mut InMemoryZoneState,
    checkpoint_path: &str,
) {
    match event {
        Event::Ready => {
            info!("Sequencer ready");
        }
        Event::ChannelUpdate { orphaned, adopted } => {
            state.on_adopted(&adopted);
            for info in &orphaned {
                state.on_orphaned(&info.this_msg);
                debug!(msg_id = %hex::encode(info.this_msg.as_ref()), "Auto-republishing orphan");

                // Republish orphaned inscriptions
                if let Err(e) = handle.publish_message(info.payload.clone()).await {
                    error!("failed to auto-republish: {e}");
                }
            }
        }
        Event::TxsFinalized { inscriptions, .. } => {
            state.on_finalized(&inscriptions);
        }
        Event::Published { info, checkpoint } => {
            debug!(msg_id = %hex::encode(info.this_msg.as_ref()), "Published");
            state.on_published(&info);
            save_checkpoint(Path::new(checkpoint_path), &checkpoint);
        }
        Event::FinalizedInscriptions { inscriptions } => {
            state.on_finalized(&inscriptions);
        }
    }
}
```

Finally, add a loop to the Sequencer struct's `run` function to listen for events:

```rust
impl Sequencer {

    ...

    // Processing loop
    pub async fn run(self) {

        ...

        loop {
            let Some(event) = sequencer.next_event().await else { continue; };
            handle_event(event, &handle, &mut state, &checkpoint_path).await;
        }
    }
}
```

## Indexer
### Initialise the Indexer
Your indexer will be implemented as a wrapper for the `ZoneIndexer` struct from the Zone SDK, found in the `logos-blockchain/zone-sdk/src/indexer.rs` file. When initialising this struct, you must provide the following arguments:

* `channel_id: ChannelId` - The ID of the channel associated with the Zone.
* `node: Node` - A Node struct referring to your Logos Blockchain node, together with the credentials to access it. It is created by `NodeHttpClient::new()`.

The indexer must obtain the channel ID used by the sequencer to check for new messages in that channel. This must be done via another medium before starting the indexer.

#### Example
In the `indexer/src/indexer.rs` file, add the `Indexer` struct definition:

```rust
// Indexer struct
//
// zone_indexer: SDK indexer
// db_path: Path to password database file
pub struct Indexer {
    zone_indexer: ZoneIndexer,
    db_path: String,
}
```

Then, add a helper function to parse a string into a channel ID:

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

Begin implementing the `Indexer` struct implementation by adding the `new` function, as below:

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

        Ok(Self { zone_indexer, db_path.to_owned() })
    }

    ...

}
```

### Follow the Channel
An indexer uses the `follow` function to check new blocks for updates to the channel. This function returns a stream which can be iterated over to obtain the latest messages. Once a block with a new channel message is finalised, the indexer can apply the message to update its own state.

#### Example
In the `Indexer` struct implementation, add the `run` function below to follow the channel. Whenever updates are found, this function will apply the SQL statements to the indexer's local database.

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
                
                let sql_text = match String::from_utf8(zone_block.data) {
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

## Conclusion
### Using the Password Manager
After you add the code from the tutorial, your password manager should be ready to use. Instructions on building and interacting with the sequencer and indexer applications can be found in the `README.md` file.

### More Zone Possibilities
This tutorial illustrated the basic functionality of the Zone SDK to build a simple appchain Zone. However, this is far from the only possibility for custom Zones on Logos. You could use the SDK to build traditional ZK or optimistic rollups, customised high transaction throughput appchains, or even applications with functionality compartmentalised across several Zones.

Despite their autonomy and customisability, Logos Zones support several key interoperability features. Bridging Layer 1 tokens into Zones, on-chain message passing between Zones, as well as complex cross-Zone transaction coordination are all supported by the Logos Blockchain. See [**The Secret to Sovereign Zone Interoperability on Logos**](https://press.logos.co/article/sovereign-zone-interoperability) for more details.

### Start Building!
Building your app on Logos has never been easier. The testnet is live, and members of the Logos team are available to help you if you get stuck.

> Check out the [**Builder Hub**](https://build.logos.co/) to get started!