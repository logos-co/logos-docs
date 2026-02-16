---
title: Quickstart for the Logos Execution Zone wallet
doc_type: quickstart
product: Logos Execution Zone
topics:
  - wallet
  - sequencer
  - Logos Execution Zone
  - LEZ
authors: [jorge-campo]
owner: logos
doc_version: 1
slug: lez-quickstart
---

# Quickstart for Logos Execution Zone wallet

#### Set up the wallet, connect to a sequencer, and run a minimal transfer flow.

> **Note**
>
> - **Permissions**: Access to LSSA testnet credentials for wallet authentication.
> - **Product**: LEZ/LSSA wallet CLI flow; version Unknown.

LEZ (Logos Execution Zone, a programmable blockchain with interoperable public and private state) is used here through the wallet (a CLI for account, transfer, config, and health commands). LSSA (the protocol-level v0.3 specification context) defines the account model and transaction formats behind this flow. The sequencer (the service that collects transactions and finalizes blocks) is the remote component that the wallet communicates with.

The mental model is straightforward: the local wallet CLI reads local configuration, then builds a sequencer client with an endpoint (the `sequencer_addr` value) and credentials/authentication (basic auth in `user` or `user:password` format). That client is reused across health checks, account commands, and transfer commands. Public and private execution share the same chain workflow, while private execution relies on proof verification.

In this quickstart, you will install the wallet tooling, configure endpoint and auth settings, and complete a minimal transfer flow with balance checks.

In this quickstart, a "privacy-preserving transaction" means the network can confirm a transaction is valid without exposing sensitive account data. The wallet runs the private part of the transaction locally, then generates a "zero-knowledge proof" (ZKP), which is cryptographic evidence that the rules were followed without revealing private inputs. The sequencer and validators verify that proof instead of re-running private logic or reading private state. This gives you both privacy and trust: private data stays hidden, and invalid transactions are still rejected. In this workflow, Risc0 is the proof toolchain used to generate those ZKPs.

## Before you start

- Developer audience with CLI-first workflow familiarity.
- Local clone of the [LSSA repository](https://github.com/logos-blockchain/lssa).
- Wallet journey context from [Try the Wallet CLI](https://github.com/logos-blockchain/lssa#try-the-wallet-cli).
- Build dependency package access for Ubuntu/Debian, Fedora, or macOS.
- Rust and Risc0 toolchains available in the local shell.
- LSSA testnet endpoint and credential values for sequencer access.
- Official OS support policy and hardware baseline: Unknown.

## Install the wallet tooling

Install the local toolchain and wallet CLI so the command surface is available in your terminal. This setup step gives you a runnable wallet binary before you apply endpoint and auth settings in the next task.

The key component in this task is the local `wallet` executable. Later tasks use the same binary with configuration values to connect to a sequencer.

1. Install the build dependencies for your operating system.

   ```sh
   # Ubuntu / Debian
   apt install git curl build-essential clang libclang-dev libssl-dev pkg-config

   # Fedora
   sudo dnf install git curl clang clang-devel openssl-devel pkgconf

   # macOS
   xcode-select --install
   brew install pkg-config openssl
   ```

1. Clone the Logos Execution Zone GitHub repository:

   ```sh
   git clone https://github.com/logos-blockchain/lssa.git
   cd lssa
   ```

1. Install Rust and Risc0, then install the Risc0 toolchain component.

   > [!NOTE]
   > 
   > Rust is the language used for wallet development, while Risc0 is the proof toolchain used to generate the ZKPs.

   ```sh
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   curl -L https://risczero.com/install | bash
   rzup install
   ```

After installing Rust and rzup, restart your shell to ensure the `cargo` and `rzup` commands are available. The `rzup install` command adds Risc0 components to your Rust toolchain.

   ```sh
   rzup install
   ```

1. From the repository root, install the wallet CLI.

   ```bash
   cargo install --path wallet --force

   # Output:
   Finished `release` profile [optimized] target(s) in 3m 34s
   ```

   - Purpose: Build and install the `wallet` binary from the repository.
   - Expected result: Install output ends with the line "Finished `release` profile [optimized] target(s) ...".
   - Verify: Continue after the install command finishes without an error.

1. Confirm that the wallet command surface is available.

   ```bash
   wallet help
   ```

   - Purpose: Verify that the installed binary is callable from your shell.
   - Expected result: Help output shows wallet commands, including `wallet check-health` and `wallet config`.
   - Verify: Continue only if help output appears and no command-not-found error is shown.

1. Run a health check if endpoint and auth settings are already configured.

   ```bash
   wallet check-health
   ```

   - Purpose: Check wallet connectivity and remote/local program ID consistency.
   - Expected result: `✅All looks good!`.
   - Verify: If first-run password setup appears, complete it, then rerun until the success line appears.

## Connect the wallet to an LEZ sequencer endpoint

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

Run a compact account-and-transfer sequence to verify end-to-end wallet usability. You will create and initialize an account, claim testnet funds, send a transfer, and confirm resulting balances.

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
