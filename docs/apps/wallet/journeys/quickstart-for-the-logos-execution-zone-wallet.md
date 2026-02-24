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

# Quickstart for Logos Execution Zone wallet

#### Set up the wallet, connect to a sequencer, and run a minimal transfer flow.

> **Note**
>
> - **Permissions**: No special permissions required.
> - **Product**: Logos Execution Zone wallet CLI; version Unknown.

The Logos Execution Zone (LEZ, for short) is a programmable blockchain that records transactions, maintains public on-chain state, and exposes a sequencer endpoint that clients (like a wallet) can submit transactions to.

LEZ separates account state into public (visible, on-chain) and private (hidden, off-chain). You choose which one you are using by creating a public or private account and using it in transactions. This ability to maintain a public and private state is provided by the Logos Execution Environment (LEE), that defines what an account is, how transactions are structured, and how executions are validated when some data must remain private. You can think of LEZ as the blockchain you connect to and where transactions are recorded, and LEE as the execution model that powers it.

When a transaction touches the private state, the client runs the private part locally using your private keys and local client data and produces a zero-knowledge proof (ZKP). Validators verify the proof and accept the state update (for example, updating public balances), so the network stays correct even though the private data is never published.

> [!NOTE]
>
> In the context of the Logos Execution Zone, a zero-knowledge proof (ZKP) is a cryptographic proof that lets the blockchain client, such as a wallet, prove a private transaction followed LEE’s rules without revealing the private inputs (like balances). Using ZKPs, LEZ can safely accept the resulting state update and keep the public chain consistent with private execution, even though the network never sees the private values.

In this quickstart, you install the wallet tooling, connect to a local sequencer endpoint, and complete a minimal transfer flow with balance checks. In wallet terms, the wallet client is your control panel for the system: you install it, create and manage public or private accounts, sync private state, and send commands.

> [!NOTE]
>
> This quickstart covers the public wallet flow only so you can get set up quickly. Privacy-preserving transfers require local proof generation and take longer to run. For the private workflow, see [Send tokens to a private account with the LEZ wallet](./send-tokens-to-a-private-account-with-the-lez-wallet.md).

## Before you start

- This quickstart is intended for a developer audience with CLI-first workflow familiarity.
- You should have basic knowledge of blockchain concepts like accounts, transactions, and balances to understand the flow.
- You will use the Rust toolchain to complete this tutorial, but you don't need prior Rust experience.

## Install the build prerequisites

Install the build prerequisites you need to compile the sequencer and wallet.

1. Install the build dependencies for your operating system.

   ```sh
   # Ubuntu / Debian
   sudo apt update
   apt install git curl build-essential clang libclang-dev pkg-config libssl-dev

   # Fedora
   sudo dnf install git curl gcc glibc-devel clang clang-devel pkgconf-pkg-config openssl-devel llvm-libs

   # macOS
   xcode-select --install
   brew install pkg-config openssl
   ```

1. Install Rust and Risc0 components.

   > [!NOTE]
   > 
   > Rust is the language used for wallet development, while Risc0 is the proof toolchain used to generate the ZKPs.

   ```sh
   # Install the official Rust compiler with the standard installation option
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  
   ```

   ```sh
   # Source the env file under $HOME/.cargo and install the Risc0 component
   . "$HOME/.cargo/env" 
   curl -L https://risczero.com/install | bash  
   ```

Restart your shell to ensure the `cargo` and `rzup` commands are available.

1. Add Risc0 components to your Rust toolchain with `rzup`.

   ```sh
   rzup install
   ```

## Install the `wallet` binary prerequisites and build the wallet

The Logos Blockchain repository provides a script that downloads a circuits release required by the `wallet` build.

1. Clone the Logos Blockchain GitHub repository:

   ```sh
   git clone https://github.com/logos-blockchain/logos-blockchain.git
   ```

1. Run the script to download the circuits release.

> [!NOTE]
>
> This script downloads `logos-blockchain-circuits-<VERSION>-<platform>.tar.gz` and installs it under `~/.logos-blockchain-circuits` by default.

   ```sh
   cd logos-blockchain
   ./scripts/setup-logos-blockchain-circuits.sh
   ```

> [!TIP]
> 
> In this quickstart, "circuits" are files that the wallet build expects to find to support privacy-preserving transactions. Even when you are only running public transactions in this quickstart guide, the wallet still needs the circuits to build successfully. The `setup-logos-blockchain-circuits.sh` script ensures you have the files in place for the build to work.

1. Clone the Logos Execution Zone GitHub repository:

   ```sh
   cd .. # change directory back to the parent of logos-blockchain before cloning lssa
   git clone https://github.com/logos-blockchain/lssa.git
   cd lssa
   ```

1. From the repository root, install the wallet CLI.

   ```bash
   cargo install --path wallet --force

1. Confirm that the wallet command is available.

   ```bash
   wallet help
   ```

This should output the `wallet` help information, showing the available wallet commands, including `wallet check-health` and `wallet config`.

1. Run a health check if endpoint and auth settings are already configured.

   ```bash
   wallet check-health
   ```

## Start the LEZ sequencer in standalone mode

Open a dedicated terminal window and start the LEZ sequencer in standalone mode.

```bash
# Run this command from the root of the `lssa` repository you cloned before
RUST_LOG=info cargo run --features standalone -p sequencer_runner sequencer_runner/configs/debug
```

You should see the sequencer starting up at localhost:3040 and logging information to the terminal:

```bash
2026-02-24T16:27:58Z INFO  sequencer_runner] Sequencer core set up
[2026-02-24T16:27:58Z INFO  network] Starting HTTP server at 0.0.0.0:3040
[2026-02-24T16:27:58Z INFO  network] HTTP server started at 0.0.0.0:3040
[2026-02-24T16:27:58Z INFO  actix_server::builder] starting 4 workers
[2026-02-24T16:27:58Z INFO  sequencer_runner] HTTP server started
[2026-02-24T16:27:58Z INFO  actix_server::server] Tokio runtime found; starting in existing Tokio runtime
[2026-02-24T16:27:58Z INFO  actix_server::server] starting service: "actix-web-service-0.0.0.0:3040", workers: 4, listening on: 0.0.0.0:3040
[2026-02-24T16:27:58Z INFO  sequencer_runner] Starting main sequencer loop
[2026-02-24T16:27:58Z INFO  sequencer_runner] Starting pending block retry loop
[2026-02-24T16:27:58Z INFO  sequencer_runner] Starting bedrock block listening loop
[2026-02-24T16:27:58Z INFO  sequencer_runner] Sequencer running. Monitoring concurrent tasks...
[2026-02-24T16:28:10Z INFO  sequencer_runner] Collecting transactions from mempool, block creation
[2026-02-24T16:28:10Z INFO  sequencer_core] Created block with 0 transactions in 0 seconds
[2026-02-24T16:28:10Z INFO  sequencer_runner] Block with id 2 created
[2026-02-24T16:28:10Z INFO  sequencer_runner] Waiting for new transactions
```

## Configure the wallet to connect to the sequencer

1. Point the wallet at the standalone LEZ sequencer endpoint

The wallet works by reading its configuration from a "wallet home" directory. It uses the `NSSA_WALLET_HOME_DIR` environment variable if set; otherwise, it falls back to `~/.nssa/wallet`. A ready-to-copy sample config exists in the repo at wallet/configs/debug/wallet_config.json, and it already points to http://127.0.0.1:3040 (the sequencer address).

Run these command from the root of the `lssa` repository you cloned before:

```bash
export NSSA_WALLET_HOME_DIR="$PWD/.wallet-home"
mkdir -p "$NSSA_WALLET_HOME_DIR"
cp wallet/configs/debug/wallet_config.json "$NSSA_WALLET_HOME_DIR/wallet_config.json"
``` 

1. Initialize the wallet local storage and verify connectivity

<!--
==============================================================
CONTENT BELOW THIS COMMENT IS STILL IN PROGRESS. DO NOT REVIEW
==============================================================
-->

---

Set endpoint and authentication values so wallet requests target the correct sequencer. This task links the local install step to live chain interaction, which you use in the transfer flow next.

The relationship to keep in mind is config-to-client wiring: `sequencer_addr` and `basic_auth` are read from wallet config and passed into sequencer client construction.

1. Collect your sequencer address and basic auth values in `username:password` format.

1. Set the sequencer endpoint value.

   ```bash
   wallet config set sequencer_addr address_from_credentials
   ```

   - Purpose: Store the sequencer address used by wallet network requests.
   - Expected result: Unknown.

1. Set the sequencer authentication value.

   ```bash
   wallet config set basic_auth username_from_credentials:password_from_credentials
   ```

   - Purpose: Store the basic auth value used for sequencer HTTP requests.
   - Expected result: Unknown.

1. Edit local config directly if you prefer file-based configuration.

   - Purpose: Apply `sequencer_addr` and `basic_auth` in `wallet_config.json` under `~/.nssa/wallet` after running a wallet command at least once.
   - Expected result: Unknown.

1. Validate connectivity after setting endpoint and auth values.

   ```bash
   wallet check-health
   ```

   - Purpose: Confirm that wallet-to-sequencer communication is working.
   - Expected result: `✅All looks good!`.
   - Verify: Use this success line as the gate before running transfer commands.

## Complete a minimal wallet flow

In this flow, you create and initialize an account, claim testnet funds, send a transfer, and confirm resulting balances.

In this task, wallet account and transfer commands interact with the authenticated-transfer program, and sequencer processing determines the resulting account state. Public and private account paths share command patterns, while private paths can include local proof generation.

> **Important**
>
> Sending to a private recipient uses the same transfer command shape, but local proof generation may take 30 seconds to 4 minutes.

1. Create a sender public account and record the account ID.

   ```bash
   wallet account new public

   # Output:
   Generated new account with account_id Public/...
   ```

   - Purpose: Create a sender account for the transfer flow.
   - Expected result: Output includes `Generated new account with account_id Public/...`.

1. Check sender status before initialization.

   ```bash
   wallet account get --account-id <sender_public_account_id>

   # Output:
   Account is Uninitialized
   ```

   - Purpose: Confirm the starting state of the new sender account.
   - Expected result: Output includes `Account is Uninitialized`.
   - Verify: Continue only after the uninitialized state is confirmed.

1. Initialize the sender account, then check the updated state.

   ```bash
   wallet auth-transfer init --account-id <sender_public_account_id>
   ```

   ```bash
   wallet account get --account-id <sender_public_account_id>

   # Output:
   Account owned by authenticated-transfer program
   {"balance":0}
   ```

   - Purpose: Register sender ownership under the authenticated-transfer program.
   - Expected result: Output changes to `Account owned by authenticated-transfer program` with `{"balance":0}`.
   - Verify: Continue only after ownership and zero balance are both visible.

1. Claim Piñata funds, then confirm sender balance.

   ```bash
   wallet pinata claim --to <sender_public_account_id>
   ```

   ```bash
   wallet account get --account-id <sender_public_account_id>

   # Output:
   Account owned by authenticated-transfer program
   {"balance":150}
   ```

   - Purpose: Fund the initialized sender account for transfer execution.
   - Expected result: Sender output includes `{"balance":150}`.
   - Verify: Use `{"balance":150}` as the funding success signal.

1. Create a recipient public account and record the account ID.

   ```bash
   wallet account new public

   # Output:
   Generated new account with account_id Public/...
   ```

   - Purpose: Create the destination account for token transfer.
   - Expected result: Output includes `Generated new account with account_id Public/...`.

1. Send 37 tokens from sender to recipient.

   ```bash
   wallet auth-transfer send \
       --from <sender_public_account_id> \
       --to <recipient_public_account_id> \
       --amount 37
   ```

   - Purpose: Execute the public-to-public transfer operation.
   - Expected result: Unknown.
   - Verify: Complete the next balance-check step to confirm transfer results.

1. Check sender and recipient balances.

   ```bash
   # Sender account
   wallet account get --account-id <sender_public_account_id>

   # Output:
   Account owned by authenticated-transfer program
   {"balance":113}
   ```

   ```bash
   # Recipient account
   wallet account get --account-id <recipient_public_account_id>

   # Output:
   Account owned by authenticated-transfer program
   {"balance":37}
   ```

   - Purpose: Verify debit and credit effects of the transfer.
   - Expected result: Sender shows `{"balance":113}` and recipient shows `{"balance":37}`.
   - Verify: Treat matching balances as task completion.

## Next steps

- 
