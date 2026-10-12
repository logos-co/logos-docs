---
title: Build an application with Logos SQL
doc_type: procedure
product: blockchain
topics:
  - logos-sql
  - channels
steps_layout: sectioned
authors: andrussal
owner: logos
doc_version: 1
slug: /blockchain/logos-sql/replicate-a-database
sidebar_position: 1
---

# Build an application with Logos SQL

#### Run the password-manager example and follow its SQL writes between two local databases.

:::tip[Version]
This guide uses the source on `master`, not a tagged release. Build the example and the node from the same revision for a local test network. Compatibility with a deployed test network must be checked separately.
:::

This guide uses the [password-manager example](https://github.com/logos-blockchain/logos-blockchain/tree/master/logos_sql/examples/password_manager) maintained in the node repository. It shows how an application starts Logos SQL, prepares SQL transactions and reads its local database.

The example separates startup configuration, database operations and terminal commands. The same library calls apply to other applications. Read the [introduction](introduction-to-logos-sql.md) first for the relationship between local data and shared history.

:::danger[Use fake credentials only]
The example encrypts accounts, passwords and notes before submitting them to Logos SQL. Labels and write activity remain public. It is a demonstration, not an audited password manager: use fake credentials only. Deleting an entry does not erase its encrypted data from channel history.
:::

The walkthrough uses two instances on your own machine, each with a separate database directory.

:::info[Prerequisites]

- Git, Rust and the [Logos Blockchain build prerequisites](https://github.com/logos-blockchain/logos-blockchain/blob/master/README.md#prerequisites).
- The OpenSSL command-line tool to generate an encryption key for the example.
- A running, compatible Logos Blockchain node with a reachable HTTP API.
- A channel reserved for this example, an authorised Ed25519 signing key and a funded public key for inscription fees.
- A maximum inscription fee appropriate for your test network.

:::

## What to expect

- You can build and run an existing Logos SQL application.
- You can update a fake credential and read it from another participant.
- You can identify the SQL calls and review commands used to handle displaced writes.

## Step 1: Build the example

Logos SQL is not yet published to crates.io. Build the example inside its source workspace.

1. Clone the repository and select `master`:

   ```bash
   git clone https://github.com/logos-blockchain/logos-blockchain.git
   cd logos-blockchain
   git checkout master
   ```

1. Build the password manager:

   ```bash
   cargo build --locked --release -p logos-sql --example password_manager
   ```

1. Check its startup options:

   ```bash
   ./target/release/examples/password_manager --help
   ```

   **Expected result:** help lists the encryption key file, channel, node, signing key, funding key, fee and state-directory options.

## Step 2: Configure and start the application

1. Generate a separate encryption key for this example:

   ```bash
   (umask 077; openssl rand -out password-manager.key 32)
   ```

   Run this once, before starting either instance. Do not overwrite an existing key. The file contains 32 random bytes, not a password or a hexadecimal string. Keep it private and backed up: without it, the encrypted data cannot be read. Do not use the channel signing key for encryption.

1. In terminal A, set these values from your test-network setup:

   ```bash
   export LOGOS_SQL_NODE_URL='<node-http-url>'
   export LOGOS_SQL_CHANNEL_ID='<channel-id-hex>'
   export LOGOS_SQL_SIGNING_KEY='<signing-key-hex>'
   export LOGOS_SQL_FUNDING_KEY='<funding-public-key-hex>'
   export LOGOS_SQL_MAX_TX_FEE='<maximum-fee>'
   export LOGOS_SQL_ENCRYPTION_KEY_FILE="$PWD/password-manager.key"
   ```

   Replace every angle-bracket placeholder. The channel ID and signing key are 32-byte hexadecimal values without a `0x` prefix. The funding key uses the hexadecimal public-key encoding from your funding setup. Keep the signing key private.

   See the [Zone SDK channel setup](../zone-sdk/inscribe-data-on-chain-using-zone-sdk.md#step-2-initialise-the-zonesequencer-struct) for channel identity and signing authority. The example does not create or fund a wallet.

1. Start the application with its own state directory:

   ```bash
   ./target/release/examples/password_manager --state-dir ./password-manager-a
   ```

   **Expected result:** after catching up and preparing the schema, it prints:

   ```text
   Password manager is running. Enter `help` to list commands.
   Credentials are encrypted; labels remain public. Use test credentials only.
   password-manager>
   ```

1. Open `logos_sql/examples/password_manager/passwords.rs` and find `PasswordManager::start`.

   It calls `LogosSql::start(config).await?`, then checks whether the `credentials` table exists. If needed, it submits `CREATE TABLE` through Logos SQL. A later participant obtains the schema by replaying channel history.

   `config.rs` constructs `LogosSqlConfig` with signing and funding credentials in `WriterConfig`. Publication settings control batching and queue limits. The library drives replication in the background; the application does not run a separate Zone SDK event loop.

   Encryption belongs to the application, not `LogosSqlConfig`. The example uses XChaCha20-Poly1305 from RustCrypto to encrypt each field and detect tampering. It stores the nonce with the encrypted value; the key stays in the local key file and is never submitted to Logos SQL.

## Step 3: Add and read a credential

1. At the prompt in terminal A, enter:

   ```text
   add email demo@example.org not-a-real-password
   ```

   **Expected result:** `committed locally as <tx-id>; not final`. The transaction ID varies. This confirms a local commit, not publication or finality.

1. Read the credential:

   ```text
   show email
   ```

   **Expected result:**

   ```text
   email
     account: demo@example.org
     password: not-a-real-password
     notes:
   ```

1. Find `prepare_credential_insert` in `passwords.rs`:

   ```rust
   fn prepare_credential_insert(credential: &StoredCredential) -> TransactionBuilder {
       TransactionBuilder::new(
           "INSERT INTO credentials (label, account, password, notes)
            VALUES (?1, ?2, ?3, ?4)",
       )
       .bind(&credential.label)
       .bind(credential.account.as_slice())
       .bind(credential.password.as_slice())
       .bind(credential.notes.as_slice())
   }
   ```

   The application's `add` method encrypts the account, password and initially empty notes into a `StoredCredential`. Each `bind` supplies the next parameter through the standard `rusqlite::ToSql` interface: a readable label and three encrypted binary values. The app then passes this builder to `self.logos_sql.execute(...).await?`.

   For multiple statements in one SQL transaction, append `.query(sql)` and its bindings. They commit or roll back together under one transaction ID. The library owns `BEGIN` and `COMMIT`; do not include them in the SQL.

1. Find `credential` in the same file. It calls `stored_credential`, which opens `self.logos_sql.read_connection()?` and queries `credentials` with ordinary SQLite calls. The app decrypts the fields before displaying them. Reads use the local database, not a network request.

## Step 4: Read from another participant

1. In terminal B, enter the same source checkout and set the environment variables from step 2. For this local demonstration, use the same test channel, credentials and encryption key file. Do not generate another encryption key. On separate machines, each instance needs a securely transferred copy of the same key.

   The example has no read-only startup mode: both instances have writer credentials, even when you only issue read commands. Keep these test credentials on your own machine.

1. Start a second instance with a different directory:

   ```bash
   ./target/release/examples/password_manager --state-dir ./password-manager-b
   ```

1. At its prompt, enter `show email`.

   **Expected result:** the same account and fake password appear. If it prints `credential not found`, leave both processes running and try again after the write reaches this participant.

   Each instance has its own SQLite database. The schema and data arrive through channel history; no database files are copied between them. Seeing the row here confirms replication, not finality.

## Step 5: Update the password and notes

1. In terminal A, enter:

   ```text
   update email another-fake-password
   notes email recovery codes stored separately
   ```

   **Expected result:** each command reports `committed locally as <tx-id>; not final`.

1. In terminal B, run `show email` again until both changes appear. Run `list` to see the label and account:

   ```text
   email (demo@example.org)
   ```

1. Find `prepare_password_update` in `passwords.rs`:

   ```rust
   fn prepare_password_update(label: &str, password: &[u8], old_password: &[u8]) -> TransactionBuilder {
       TransactionBuilder::new(
           "UPDATE credentials SET password = ?2
            WHERE label = ?1 AND password = ?3",
       )
       .bind(label)
       .bind(password)
       .bind(old_password)
   }
   ```

   The application reads the stored password, checks it can decrypt it, and encrypts the replacement. The SQL compares the original encrypted bytes with the bytes still in the row; it does not decrypt them. Notes updates check the old notes independently, so changing the notes does not invalidate the password condition. Deletes check all the entry's stored values as read when the command was prepared.

   These conditions stay with the original SQL if the user retries a displaced write. The retry reuses the saved encrypted values, rather than encrypting them again. A condition that no longer matches changes no rows; SQLite still considers that successful. Check the resulting data rather than treating a transaction ID as proof that a value changed.

## Step 6: Review a displaced write

This step applies if channel history changes and the application reports displaced writes. The commands above do not deliberately create a fork, so an ordinary run may have none.

1. Enter `displacements` to list writes awaiting review. If there are none, it prints `no displacements awaiting review`.

   While any remain, ordinary new writes are blocked. A blocked write prints an error and directs the user to `displacements`, then `show` or `list` to inspect the data.

1. Inspect the current entry with `show email`. Decide whether the original operation should still be attempted.

1. Choose one action for an ID from the list, replacing `<tx-id>`:

   | Command | Effect |
   | --- | --- |
   | `retry <tx-id>` | Executes the saved SQL with its original conditions and marks that displacement handled after success. |
   | `handle <tx-id>` | Marks the displacement handled without submitting another write. |

   A retry prints `retry committed locally as <new-tx-id>; not final`. Use `show` to check the data afterwards. If the selected displacement has changed since it was listed, refresh `displacements` and review it again.

   This example leaves retries to the user. Other applications can handle displacements automatically when their SQL conditions and application policy make that safe. Handling a displacement does not cancel the original write; it can return after another reorganisation.

1. Check `displacements` again before continuing. If another displacement arrives during review, the next ordinary write remains blocked until that item is handled too.

   See [Handle displaced writes](handle-displaced-writes.md) for the underlying library calls and how to add this flow to another application.

## Step 7: Remove the entry and stop

1. In terminal A, enter `remove email`.

1. In terminal B, run `show email` until it prints `credential not found`.

1. Enter `exit` in both terminals. The example calls `shutdown().await` to stop replication. Shutdown does not wait for finality.

1. Restart either instance with its original command and state directory, then enter `list`.

   **Expected result:** it resumes from saved state and follows the channel. If the deletion remains in the current history, `email` is absent. A chain reorganisation can still change non-finalised data.

## Troubleshooting

### A credential cannot be decrypted

Check that both instances use the same encryption key file contents and channel. A wrong key or modified encrypted data causes decryption to fail. Do not generate a replacement key to fix this: a new key cannot decrypt existing entries.

Use a fresh channel and state directory for this encrypted example. It does not migrate old unencrypted entries or rotate keys. Encrypting future writes cannot hide unencrypted data already published in the channel history.

### Adding a credential reports a primary key constraint error

The label already exists. Use `show` to inspect it, `update` to change its password, or choose another label for a new entry.

### The second instance does not show a change

Check that both instances follow the same channel, that the node is processing blocks, and that the writer has valid signing authority and funding. Keep both processes running and issue the read command again. The terminal does not refresh displayed results automatically.

### A request returns PublishPending

The pending-write queue is full or the library is still saving an accepted publication. The new request has not committed any SQL changes. Leave replication running and try that request later; do not assume other errors have the same retry guarantee.

### A read needs finalised data

The example reads the latest local state. Applications needing settled history can use `finalized_read_connection()` with the same SQLite API. The schema and each data change appear in that view only after their writes finalise.
