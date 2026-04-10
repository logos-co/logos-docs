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
Before beginning this tutorial, you should clone the [Logos Blockchain Node](https://github.com/logos-blockchain/logos-blockchain) repository, which contains the Zone SDK in the [`zone-sdk`](https://github.com/logos-blockchain/logos-blockchain/tree/master/zone-sdk) folder.

To clone the repository with git, run the following in your desired path:

```bash
git clone https://github.com/logos-blockchain/logos-blockchain.git
```

#### Example Application Skeleton
To follow along with the tutorial example, switch to the `sql-zone-tutorial` branch:

```bash
cd logos-blockchain
git checkout sql-zone-tutorial
cd testnet/sqlite-zone-demo
```

The complete demo is available in the `sql-zone` branch.

### Access to Logos Blockchain Node
It's also important for your sequencer and indexers to have access to a Logos Blockchain Node. See the [documentation](../quickstart-guide-for-the-logos-blockchain-node.md) for instructions on how to start your own node and connect to the Testnet.

## Sequencer
### Define Your Zone Environment
The first step to creating a Logos Zone is defining the Zone state - what application(s) it will host, how the state is updated, and in what form updates are posted on-chain.

#### Example
In this tutorial, we'll be adapting an existing Rust [password manager](https://github.com/H2CO3/steelsafe) application to the Logos Zone context. The goal is for the user to be able to update their passwords on one device, with other devices syncing their state to match the main device. This design is useful for users who want to avoid relying on managed hosting for their password manager, and don't want to be burdened by self-hosting on their own server. 

> Read **Decentralise the Log, Not the Server** (ADD LINK) for the motivation behind this design.

This application maintains its state by using a sqlite database, with updates taking the form of SQL transactions applied to the database. To work as a Logos Zone, we will adopt the design as follows:

* The user will interact with the password manager on the main device (in the `sequencer` folder) whenever they want to add or update passwords in the manager.
* The main device will operate as a **sequencer**, posting SQL transactions as inscriptions to its channel.
* Secondary devices will operate as **indexers**, following the channel and obtaining SQL transactions from the chain.
* Secondary devices will run a read-only version of the password manager (in the `indexer` folder), applying SQL transactions from the channel to update the state.

The implementation skeleton already has most of this password manager code written. This tutorial will focus on using the Zone SDK to write the sequencer and indexer functionality, contained in the `sequencer/src/sequencer.rs` and `indexer/src/indexer.rs` files.

### Initialise the `ZoneSequencer` Struct
Your sequencer will be implemented as a wrapper for the `ZoneSequencer` struct from the Zone SDK, found in the `../zone-sdk/src/sequencer.rs` file. When initialising this struct, you must provide the following arguments:

* `channel_id: ChannelId` - The ID of the channel associated with the Zone.
* `signing_key: Ed25519Key` - A key authorised to post updates to the channel.
* `node_url: Url` - The Url of your Logos Blockchain node.
* `auth: Option<BasicAuthCredentials>` - [Optional] Credentials to access the Logos Blockchain node.
* `checkpoint: Option<SequencerCheckpoint>` - [Optional] The checkpoint representing the most recently-pushed channel update.

Before posting to a new channel, the sequencer must first generate an Ed25519 public/private key pair. **The public key defines the channel ID, while the private key becomes the signing key**. The channel is created when the sequencer posts a message with this channel ID, unless it already exists. Initially, only the sequencer with the signing key can post messages to the channel. Additional keys can be authorised via the [CHANNEL_CONFIG](https://nomos-tech.notion.site/v1-2-Mantle-Specification-2ce261aa09df805ea358d80c2046cf95) Mantle Operation.

After the first channel message, further messages include a hash reference to the previous message in the channel. If a message is posted with an incorrect parent hash, it is rejected by the channel. **Providing a checkpoint lets the sequencer keep track of the last message posted to its channel, allowing it to resume posting new updates after restarting**. A checkpoint is not necessary for the session during which a sequencer creates a new channel.

#### Example
In the `sequencer/src/sequencer.rs` file, add the `Sequencer` struct definition:

```rust
// The sequencer that handles transactions using the Zone SDK
//
// zone_sequencer: The sequencer from the Zone SDK
// queue_file: The path to a file that holds SQL transactions not yet posted to the channel
// checkpoint_path: The path to the channel checkpoint file
pub struct Sequencer {
    zone_sequencer: ZoneSequencer,
    queue_file: String,
    checkpoint_path: String,
}
```

Below, add a function to create a new private signing key:

```rust
// Load signing key from file or generate a new one if it doesn't exist
//
// path: The path to the signing key file
fn load_or_create_signing_key(path: &Path) -> Result<Ed25519Key> {
    if path.exists() {
        debug!("Loading existing signing key from {:?}", path);
        let key_bytes = fs::read(path)?;

        // Ensure key is correct
        if key_bytes.len() != ED25519_SECRET_KEY_SIZE {
            return Err(SequencerError::InvalidKeyFile {
                expected: ED25519_SECRET_KEY_SIZE,
                actual: key_bytes.len(),
            });
        }
        let key_array: [u8; ED25519_SECRET_KEY_SIZE] =
            key_bytes.try_into().expect("length already checked");


        Ok(Ed25519Key::from_bytes(&key_array))
    } else {
        debug!("Generating new signing key and saving to {:?}", path);
        let mut key_bytes = [0u8; ED25519_SECRET_KEY_SIZE];
        rand::RngCore::fill_bytes(&mut rand::rng(), &mut key_bytes);
        fs::write(path, key_bytes)?;

        Ok(Ed25519Key::from_bytes(&key_bytes))
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
    pub fn new(
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

        let checkpoint = load_checkpoint(Path::new(&checkpoint_path));
        if checkpoint.is_some() {
            println!("  Restored checkpoint from {checkpoint_path}");
        }

        let signing_key = load_or_create_signing_key(Path::new(signing_key_path))?;

        // Produce channel ID from signing key
        let channel_id = ChannelId::from(signing_key.public_key().to_bytes());
        fs::write(channel_path, hex::encode(channel_id.as_ref()))
            .expect("failed to write channel id");

        // Initialise the ZoneSequencer
        let zone_sequencer =
            ZoneSequencer::init(channel_id, signing_key, node_url, basic_auth, checkpoint);

        Ok(Self {
            zone_sequencer,
            queue_file: queue_file.to_owned(),
            checkpoint_path: checkpoint_path.to_owned(),
        })
    }

    ...

}
```

### Publish Data
Once the `ZoneSequencer` is set up, posting data to the channel is as easy as passing it to the sequencer's `publish` function. This function returns a struct consisting of the inscription (message) ID and the current checkpoint.

Once you have the inscription ID, you can choose to query the on-chain status of the submitted transaction with the `status` function. The status returned will be one of:

* **Pending**: Not yet on the canonical chain, needs resubmitting.
* **Safe**: On the canonical chain, but not yet finalised.
* **Finalized**: Permanently finalised as part of the blockchain.
* **Unknown**: Unknown transaction.

#### Example
In our password manager example, a processing loop continuously checks if there are new SQL transactions produced by the password database. If so, these transactions are submitted as plain text to the Zone.

Before you begin implementing this loop, add the following function to the `sequencer/src/sequencer.rs` file to enable you to save checkpoints to the checkpoint file whenever an update is published. 

> This function must be outside the `Sequencer` struct implementation!
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

In this tutorial, we will focus on reading these transactions from the queue file and submitting them to the channel. Within the `Sequencer` implementation, add the function below to read from queue file and clear it when done:

```rust
impl Sequencer {

    ...

    // Drain the queue file and return all pending queries
    fn queue_drain(&self) -> Result<Vec<String>> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .open(self.queue_file.clone())?;

        // Lock the queue file to prevent concurrent writes from the database
        file.lock_exclusive()?;

        let reader = BufReader::new(&file);
        let mut queue_vec = Vec::new();
        for query in reader.lines() {
            queue_vec.push(query?.clone());
        }

        // Clear queue file
        file.set_len(0)?;

        Ok(queue_vec)
    }

    ...

}
```

Continuing in the `Sequencer` struct implementation, add the following function to publish the pending SQL transactions obtained from the `queue_drain` function.

The transaction status is not queried in this demo application.

```rust
impl Sequencer {

    ...

    // Process all pending queries as a single inscription
    async fn process_pending_batch(&self) -> Result<()> {
        let pending = self.queue_drain()?;
        if pending.is_empty() {
            return Ok(());
        }

        let count = pending.len();
        debug!("Processing batch of {} queries", count);

        // Publish SQL transactions
        let data = pending.join("\n").into_bytes();
        let result = self.zone_sequencer.publish(data).await?;

        info!(
            "Inscription published with tx_hash: {:?}",
            result.inscription_id
        );

        // Save latest message checkpoint
        save_checkpoint(Path::new(&self.checkpoint_path), &result.checkpoint);

        Ok(())
    }

    ...

}
```

Complete the Sequencer struct implementation by adding the processing loop and a function to check if the queue is empty:

```rust
impl Sequencer {

    ...

    // Check if the queue file is empty
    pub fn queue_is_empty(&self) -> Result<bool> {
        match fs::metadata(self.queue_file.clone()) {
            Ok(meta) => Ok(meta.len() == 0),
            Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(true),
            Err(e) => Err(e.into()),
        }
    }

    // Background processing loop - call this in a spawned task
    pub async fn run_processing_loop(&self) {

        // How long to wait between checks
        let poll_interval = Duration::from_millis(100);

        loop {
            let is_empty = match self.queue_is_empty() {
                Ok(empty) => empty,
                Err(e) => {
                    tracing::error!("Failed to check queue: {}", e);
                    sleep(poll_interval).await;
                    continue;
                }
            };

            if is_empty {
                sleep(poll_interval).await;
                continue;
            }

            if let Err(e) = self.process_pending_batch().await {
                tracing::error!("Batch processing failed: {}", e);
            }
        }
    }
}
```

## Indexer
### Initialise the Indexer
Your indexer will be implemented as a wrapper for the `ZoneIndexer` struct from the Zone SDK, found in the `../zone-sdk/src/indexer.rs` file. When initialising this struct, you must provide the following arguments:

* `channel_id: ChannelId` - The ID of the channel associated with the Zone.
* `node_url: Url` - The Url of your Logos Blockchain node.
* `auth: Option<BasicAuthCredentials>` - [Optional] Credentials to access the Logos Blockchain node.

The indexer must obtain the channel ID used by the sequencer to check for new messages in that channel. This must be done via another medium before starting the indexer.

#### Example
In the `indexer/src/indexer.rs` file, add the `Indexer` struct definition:

```rust
// Indexer struct
//
// zone_indexer: SDK indexer
// db: Mutable password database
pub struct Indexer {
    zone_indexer: ZoneIndexer,
    db: Arc<Mutex<DatabaseReadOnly>>,
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
    // channel_path: Path to file with channel ID
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
        let zone_indexer = ZoneIndexer::new(channel_id, node_url, basic_auth);

        // New password database
        let database = DatabaseReadOnly::open(db_path)?;
        let db = Arc::new(Mutex::new(database));

        Ok(Self { zone_indexer, db })
    }

    ...

}
```

Within the `Indexer` struct implementation, add a function exposing the database for public access:

```rust
impl Indexer {

    ...

    // Access db outside of struct
    #[must_use]
    pub fn db(&self) -> Arc<Mutex<DatabaseReadOnly>> {
        Arc::clone(&self.db)
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
    pub async fn run(&self) {
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
            while let Some(zone_block) = stream.next().await {
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
                    .map(|l| l.trim().trim_end_matches(';').trim())
                    .filter(|s| !s.is_empty())
                    .collect();

                if statements.is_empty() {
                    continue;
                }

                info!("Applying {} SQL statement(s)", statements.len());

                // Apply statements to db
                let db = self.db.lock().await;
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
After you add the code from the tutorial, your password manager should be ready to use. Instructions on building and interacting with the sequencer and indexer applications can be found within the `testnet/sqlite-zone-demo` folder, in the `README.md` file.

### More Zone Possibilities
This tutorial illustrated the basic functionality of the Zone SDK to build a simple appchain Zone. However, this is far from the only possibility for custom Zones on Logos. You could use the SDK to build traditional ZK or optimistic rollups, customised high transaction throughput appchains, or even applications with functionality compartmentalised across several Zones.

Despite their autonomy and customisability, Logos Zones support several key interoperability features. Bridging Layer 1 tokens into Zones, on-chain message passing between Zones, as well as complex cross-Zone transaction coordination are all supported by the Logos Blockchain. See [**The Secret to Sovereign Zone Interoperability on Logos**](https://press.logos.co/article/sovereign-zone-interoperability) for more details.

### Start Building!
Building your app on Logos has never been easier. The testnet is live (at the time of writing), and members of the Logos team are available to help you if you get stuck.

> Check out the [**Builder Hub**](https://build.logos.co/) to get started!