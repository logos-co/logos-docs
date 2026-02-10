# Users interact with sample apps in public and private state

Applies to: https://github.com/logos-blockchain/lssa  
Last checked: 2026-01-28  
Status: Stub  
Owner: Owner needed  
Docs packet: Not provided  
Tracking: [Testnet v0.1 docs in scope](https://docs.google.com/spreadsheets/d/1V94fhGxwTGbyLy2u8OcZmJQIzIctIGUHHfqyyY01V3E/edit?usp=sharing) spreadsheet / GitHub issue #157  
Runtime target: Logos Testnet v0.1 (instructions below are for local sequencer / tutorial; testnet endpoints and UX app flow are UNKNOWN)

## Outcome + value 

- Demonstrate an end-to-end "dApp-like" interaction on LSSA by using the built-in AMM program (and token program) through the Wallet CLI.
- A developer can create tokens, create/add liquidity to an AMM pool, and execute a swap, using a mix of public/private state where applicable.

## Audience

- Developer

## Hardware requirements

- UNKNOWN (no explicit minimums published). Note: privacy-preserving transactions require user-side zk proof generation, which is described as the main computational bottleneck for private execution.

## Known gaps

- Missing Doc Packet
  - Ownership / review SLA (who answers PR questions)
  - Top failures + fixes for this journey on testnet
- Notion/repo -> journey mapping in spreadsheet

## Prerequisites

- OS: Linux or macOS (examples provided for Debian/Ubuntu, Fedora, and macOS)

- Build deps:
  - Debian/Ubuntu: `build-essential clang libclang-dev libssl-dev pkg-config`
  - Fedora: `clang clang-devel openssl-devel pkgconf`
  - macOS: Xcode CLT + `brew install pkg-config openssl`

- Rust toolchain installed (rustup)

- Risc0 installed (`rzup install`)

- Running sequencer:
  - Local sequencer: can be started from the repo (see Steps)

## Configuration

- Env vars:

  - `NSSA_WALLET_HOME_DIR` (used by integration tests to point wallet home/config)
  - `RUST_LOG` (optional, for logs)
  - `RISC0_DEV_MODE=1` (skips proof generation; intended for tests/dev)

- Flags: UNKNOWN (journey-specific CLI flags depend on wallet subcommands)

- Config file keys: UNKNOWN (wallet home/config format not documented in this stub)

- Default endpoints/ports:

  - Local sequencer example logs mention HTTP server at `0.0.0.0:3040`
  - Testnet endpoints: UNKNOWN

## Steps

1. Clone the LSSA repo and install dependencies (see Prerequisites).

2. Install Risc0 and restart your shell if needed:

   - `curl -L https://risczero.com/install | bash`
   - `rzup install`

3. (Option A) Run integration tests to spin up a local environment:

   - `export NSSA_WALLET_HOME_DIR=$(pwd)/integration_tests/configs/debug/wallet/`
   - `cd integration_tests`
   - `RUST_LOG=info RISC0_DEV_MODE=1 cargo run $(pwd)/configs/debug all`

4. (Option B) Run the local sequencer directly:

   - `cd sequencer_runner`
   - `RUST_LOG=info cargo run --release configs/debug`

5. Install the Wallet CLI from repo root:

   - `cargo install --path wallet --force`
   - `wallet help`

6. Health check (verify wallet can connect to node/sequencer):

   - `wallet check-health`

7. Follow the repo tutorial to create accounts and tokens (public/private), then use the AMM program subcommands.

   - NOTE: The tutorial includes:

     - Creating accounts (public and private)
     - Minting/funding via `wallet pinata ...`
     - Creating token definitions and holdings via `wallet token ...`

8. Create and interact with an AMM pool (CLI-based "sample app"):

   - Create pool:

     - `wallet amm new --token-definition-a <PUBLIC_TOKEN_A_DEF> --token-definition-b <PUBLIC_TOKEN_B_DEF> --creator-account-id <PUBLIC_CREATOR_ACCOUNT> --amount-a <N> --amount-b <N>`
	 
   - (Optional) Swap:

     - `wallet amm swap --user-holding-a <PUBLIC_USER_HOLDING_A> --user-holding-b <PUBLIC_USER_HOLDING_B> --amount-a <N> --min-amount-b <N>`

   - Add liquidity:

     - `wallet amm add-liquidity --user-holding-a <...> --user-holding-b <...> --user-holding-lp <...> --min-amount-lp <N> --max-amount-a <N> --max-amount-b <N>`

## Expected outputs

- After step 4 (sequencer running): logs indicating the HTTP server started (port likely `3040` for local config).
- After step 6 (health check): output should include `✅ All looks good!` when connectivity and builtin program versions match.
- After step 7 (token steps): wallet should report created account IDs in the form `Public/<...>` and `Private/<...>` and allow querying holdings via `wallet account get`.
- After step 8 (AMM ops): command should complete successfully; exact CLI output for AMM commands is UNKNOWN (not captured in the linked tutorial excerpt).

## Verify

- Connectivity + basic sanity:

  - `wallet check-health`
  - Expected: includes `✅ All looks good!`

- Optional: chain progress (local):

  - `wallet chain-info current-block-id`
  - Expected: prints "Last block id is <number>"

- Optional: state query after AMM actions:

  - `wallet account get --account-id <HOLDING_OR_LP_ACCOUNT_ID>`
  - Expected: balances change according to swap / liquidity actions (exact values depend on inputs)

## Troubleshooting

- Wallet can't connect to node:

  - Fix: ensure the sequencer is running (local logs should show an HTTP server started; local config mentions port `3040`). Testnet endpoint/config is UNKNOWN.

- Transactions/tests are extremely slow:

  - Fix: for dev/testing, set `RISC0_DEV_MODE=1` to skip proof generation (reduces runtime overhead).

- Missing wallet config / wallet behaves unexpectedly:

  - Fix: if using integration tests, confirm `NSSA_WALLET_HOME_DIR` is exported as shown in the integration test instructions.

## Limits (v0.1)

- AMM fees / LP rewards are not described as implemented; tutorial explicitly notes swap fees (and fee distribution) as a future step.
- The tutorial demonstrates the AMM flow using public accounts; private AMM interactions are not documented here (programs run privately when at least one private account participates, but the AMM section does not show that variant).
- Testnet-specific instructions (endpoints, chain IDs, faucet equivalents, canonical "sample app" UI) are UNKNOWN.

## References

- LSSA repo README tutorial (wallet CLI, public/private state overview, token + AMM commands): https://github.com/logos-blockchain/lssa/
- Spreadsheet-linked "sample apps" repo (relationship to LSSA AMM is unclear): https://github.com/logos-co/logos-app-poc
