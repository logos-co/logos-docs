---
title: Quickstart for the Logos Execution Zone wallet
doc_type: quickstart
product: lez
topics:
  - wallet
  - sequencer
  - Logos Execution Zone
  - LEZ
  - Logos Execution Environment
  - LEE
  - zero-knowledge proofs
  - ZKPs
authors: [jorge-campo]
owner: logos
doc_version: 2
slug: lez-quickstart
---

# Quickstart for the Logos Execution Zone wallet

#### Set up the wallet, connect to a sequencer, and run a minimal transfer flow.

> **Note**
>
> - **Permissions**: No special permissions required.
> - **Product**: Logos Execution Zone wallet CLI.

The Logos Execution Zone (LEZ, for short) is a programmable blockchain that records transactions, maintains public on-chain state, and exposes a sequencer endpoint that clients (like a wallet) can submit transactions to.

LEZ separates account state into public (visible, on-chain) and private (hidden, off-chain). You choose which one you are using by creating a public or private account and using it in transactions. This ability to maintain a public and private state is provided by the Logos Execution Environment (LEE), that defines what an account is, how transactions are structured, and how executions are validated when some data must remain private. You can think of LEZ as the blockchain you connect to and where transactions are recorded, and LEE as the execution model that powers it.

> [!NOTE]
>
> This quickstart covers the public wallet flow only so you can get set up quickly. Privacy-preserving transfers require local proof generation and take longer to run. For the private workflow, see [Send tokens to a private account with the LEZ wallet](./send-tokens-to-a-private-account-with-the-lez-wallet.md).

When a transaction touches the private state, the client runs the private part locally using your private keys and local client data, producing a zero-knowledge proof (ZKP). Validators verify the proof and accept the state update (for example, updating public balances), so the network stays correct even though the private data is never published.

> [!NOTE]
>
> In the context of the Logos Execution Zone, a zero-knowledge proof (ZKP) is a cryptographic proof that lets a blockchain client, such as a wallet, prove a private transaction followed LEE’s rules without revealing the private inputs (like balances). Using ZKPs, LEZ can safely accept the resulting state update and keep the public chain consistent with private execution, even though the network never sees the private values.

In this quickstart, you install the wallet tooling, connect to a local sequencer endpoint, and complete a minimal transfer flow with balance checks. In wallet terms, the wallet client is your control panel for the system: you install it, create and manage public or private accounts, sync private state, and send commands.

## Before you start

- This guide is intended for a developer audience with CLI-first workflow familiarity.
- You should have a basic knowledge of blockchain concepts like accounts, transactions, and balances.
- You will use the Rust toolchain to complete this tutorial, but you don't need prior Rust experience.
- Commands assume a bash-compatible shell.

## Step 1: Install the prerequisites

To run the LEZ wallet CLI, you first need to install system dependencies, the Rust toolchain, and the Logos Blockchain circuits files.

### Install system build dependencies

Install the build prerequisites you need to compile the sequencer and wallet.

> [!TIP]
>
> These prerequisites include a working C toolchain and linker on your machine. You may already have these installed if you have experience building software from source.

Choose the instructions for your operating system:

   ```bash
   # Ubuntu / Debian
   sudo apt update
   apt install git curl build-essential clang libclang-dev pkg-config libssl-dev
   ```

   ```bash
   # Fedora
   sudo dnf install git curl gcc glibc-devel clang clang-devel pkgconf-pkg-config openssl-devel llvm-libs
   ```

   ```bash
   # macOS
   xcode-select --install
   brew install pkg-config openssl
   ```

### Install Rust and RISC Zero components

> [!NOTE]
>
> Rust is the language used for wallet development, while RISC Zero is the proof toolchain used to generate the ZKPs.

1. Install Rust with `rustup`:

   ```bash
   # Install the official Rust compiler with the standard installation option
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  
   ```

1. Install the RISC Zero components:

   ```bash
   # Source the env file under $HOME/.cargo and install the RISC Zero component
   . "$HOME/.cargo/env" 
   curl -L https://risczero.com/install | bash  
   ```

1. Restart your shell to ensure the `cargo` and `rzup` commands are available.

1. Add the RISC Zero components to your Rust toolchain with `rzup`:

   ```bash
   rzup install
   ```

### Set up the `wallet` binary prerequisites and build the wallet

The Logos Blockchain repository provides a script that downloads a circuits release required by the `wallet` build.

> [!TIP]
>
> "Circuits" are prebuilt files used for privacy-preserving execution (zero-knowledge proofs). Even though the quickstart flow uses public transactions, the current `wallet` build still requires these files to be present locally.

1. Create a workspace folder and clone the Logos Blockchain repository:

   ```bash
   mkdir -p ~/logos/src
   cd ~/logos/src
   git clone https://github.com/logos-blockchain/logos-blockchain.git
   ```

1. Run the script to download the circuits release:

   > [!NOTE]
   >
   > This script downloads `logos-blockchain-circuits-<version>-<platform>.tar.gz` and installs it under `~/.logos-blockchain-circuits` by default.

   ```bash
   cd logos-blockchain
   ./scripts/setup-logos-blockchain-circuits.sh
   ```

1. From the same workspace folder, clone the Logos Execution Zone repository:

   ```bash
   cd ~/logos/src
   git clone https://github.com/logos-blockchain/lssa.git
   cd lssa
   ```

1. From the repository root, install the wallet CLI:

   ```bash
   cargo install --path wallet --force
   ```

1. Confirm that the `wallet` command is available:

   ```bash
   wallet help
   ```

## Step 2: Start the LEZ sequencer in standalone mode

Open a new terminal window and start the LEZ sequencer from the root of the Logos Execution Zone repository:

```bash
cd ~/logos/src/lssa
RUST_LOG=info cargo run --features standalone -p sequencer_runner sequencer_runner/configs/debug
```

> [!NOTE]
>
> This quickstart uses standalone mode, which runs only the LEZ sequencer locally. The full local stack also runs a Logos Blockchain node and the indexer service for development and block exploration, but it adds extra components and is covered separately.

You should see the sequencer starting up at `localhost:3040` and logging information to the terminal:

```bash
[2026-02-24T16:27:58Z INFO  sequencer_runner] HTTP server started
[2026-02-24T16:27:58Z INFO  actix_server::server] Tokio runtime found; starting in existing Tokio runtime
[2026-02-24T16:27:58Z INFO  actix_server::server] starting service: "actix-web-service-0.0.0.0:3040", workers: 4, listening on: 0.0.0.0:3040
[2026-02-24T16:27:58Z INFO  sequencer_runner] Starting main sequencer loop
[2026-02-24T16:27:58Z INFO  sequencer_runner] Starting pending block retry loop
[2026-02-24T16:27:58Z INFO  sequencer_runner] Starting bedrock block listening loop
[2026-02-24T16:27:58Z INFO  sequencer_runner] Sequencer running. Monitoring concurrent tasks...
```

## Step 3: Configure the wallet to connect to the sequencer

The wallet works by reading its configuration from a "wallet home" directory. It uses the `NSSA_WALLET_HOME_DIR` environment variable if set. If not set, it falls back to `~/.nssa/wallet`.

A ready-to-copy sample configuration exists in the repo at `wallet/configs/debug/wallet_config.json`, and it already points to http://127.0.0.1:3040 (the sequencer address). This `wallet_config.json` file defines how the wallet CLI talks to the LEZ sequencer endpoint.

Run these commands from the root of the `lssa` repository:

> [!TIP]
>
> Leave the sequencer running in the other terminal window while you configure the wallet.

```bash
cd ~/logos/src/lssa
export NSSA_WALLET_HOME_DIR="$PWD/.wallet-home"
mkdir -p "$NSSA_WALLET_HOME_DIR"
cp wallet/configs/debug/wallet_config.json "$NSSA_WALLET_HOME_DIR/wallet_config.json"
```

## Step 4: Initialize the wallet local storage and verify connectivity

The wallet persistent storage is defined by the `storage.json` file. When you run any `wallet` subcommand, the wallet checks whether `storage.json` exists in the wallet home directory. If it does not exist, it requires a password to initialize the wallet storage.

Run a `wallet` command to initialize the storage. Use the built-in health check:

```bash
wallet check-health
```

If the wallet storage was not previously initialized, this command prints `Persistent storage not found, need to execute setup`, and prompts you to create a password. You can choose any password you like, but make sure to remember it, as you will need it to access the wallet in the future.

> [!IMPORTANT]
>
> The wallet uses this password as a seed to deterministically generate your public and private key trees. The wallet stores the derived key material and local state in storage.json under the wallet home directory.

## Step 5: Complete a minimal wallet flow

In this flow, you create and initialize an account, claim testnet funds, send a transfer, and confirm resulting balances.

In this task, wallet account and transfer commands interact with the authenticated-transfer program, and sequencer processing determines the resulting account state. Public and private account paths share command patterns, while private paths can include local proof generation.

### Create and initialize the sender public account

1. Create a sender public account and record the `account_id` value:

   ```bash
   cd ~/logos/src/lssa
   wallet account new public
   ```

1. Check sender status before initialization:

   ```bash
   wallet account get --account-id <sender_public_account_id>
   ```

   Example:

   ```bash
   wallet account get --account-id Public/14TYHiuzKiNR1ydETpr9mJMkjY6jf1hQFZ11d3X8Tc7N
   ```

   You should see `Account is Uninitialized` in the output. New accounts start uninitialized, so no program owns them yet. A program can claim an uninitialized account (for example, the authenticated-transfer program or the token program). After a program claims an account, only that program can modify the account state. LEZ makes one exception for account credits, where any program can credit native tokens to any account. For account debits, LEZ requires the owning program.

1. Initialize the sender account, then check the updated state:

   > [!NOTE]
   >
   > Running `wallet auth-transfer init` initializes the sender account under the authenticated-transfer program, so the account can debit native tokens when you send transfers.

   ```bash
   wallet auth-transfer init --account-id <sender_public_account_id>
   ```

   In the output, you should see `status: "Transaction submitted"`, and the transaction hash. If you change to the terminal session where the sequencer is running, you can see a message similar to this: `Validated transaction with hash <hash_id>, including it in block`.

1. Check the account updated state:

   ```bash
   wallet account get --account-id <sender_public_account_id>

   In the output you should see `Account owned by authenticated transfer program`, with `"balance":0`

### Claim funds using the Piñata faucet

"Piñata" is the name of the the LEZ-specific testnet faucet program that funds accounts with native tokens.

1. Fund the sender account via Piñata:

   ```bash
   # This may take a few seconds to complete
   wallet pinata claim --to <sender_public_account_id>
   ```

2. Check the sender account balance:

   ```bash
   wallet account get --account-id <sender_public_account_id>
   ```

   In the output you should see `Account owned by authenticated transfer program`, with a `"balance":150`.

### Create and fund the recipient public account

1. Create a recipient public account and record the `account_id` value. Complete this step in the same terminal session as the sender account commands to avoid exporting `NSSAS_WALLET_HOME_DIR` again.

   ```bash
   wallet account new public
   ```

1. Send 37 tokens from sender to recipient:

   ```bash
   wallet auth-transfer send \
       --from <sender_public_account_id> \
       --to <recipient_public_account_id> \
       --amount 37
   ```

   Example:

   ```bash
   wallet auth-transfer send \
       --from Public/14TYHiuzKiNR1ydETpr9mJMkjY6jf1hQFZ11d3X8Tc7N \
       --to Public/74zHyMW81mtfcd6VMaLnpnAna8k2V4AN2Ygyy9LcEAQQ \
       --amount 37
   ```

1. Check sender and recipient balances:

   ```bash
   # Sender account
   wallet account get --account-id <sender_public_account_id>
   ```

This should show a `"balance":113` (150 - 37 = 113).

   ```bash
   # Recipient account
   wallet account get --account-id <recipient_public_account_id>
   ```

This should show a `"balance":37`.

## Next steps

- 
