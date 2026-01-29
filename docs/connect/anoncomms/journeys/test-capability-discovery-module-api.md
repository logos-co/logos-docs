# Deploy custom programs using LSSA templates / boilerplates

Applies to: https://github.com/logos-blockchain/lssa
Runtime target: local  
Last checked: 2026-01-29  
Status: Stub  
Owner: Owner needed 
Tracking: [Testnet v0.1 docs in scope](https://docs.google.com/spreadsheets/d/1V94fhGxwTGbyLy2u8OcZmJQIzIctIGUHHfqyyY01V3E/edit?usp=sharing) spreadsheet / GitHub issue [#161](https://github.com/logos-co/logos-docs/issues/161)

## Outcome + value

- Outcome (end goal): Build and deploy a sample custom program to a locally running LSSA (Nescience/NSSA) sequencer, then execute it (including public vs private execution where applicable).
- Why it matters: Proves the end-to-end “write/compile/deploy/execute” path works for Testnet v0.1 developer onboarding, including zkVM toolchain setup and local node + wallet connectivity.

## Audience

- Developer (dApp developer)

## Known gaps / Blockers

- Doc Packet missing: a pinned repo version (tag/SHA) for the `examples/program_deployment` tutorial, plus the exact runnable commands and “expected outputs” for the deploy + execute steps.
- “Templates / boilerplates” mapping needed: which program templates exist, what files developers should copy/change, and what the minimum edits are to go from “hello world” to “my program”.
- Debugging/logging guidance missing: where program execution logs show up, and how to inspect failures (build-time and run-time).
- Testnet vs local clarity missing: whether the supported flow for v0.1 is strictly “local sequencer” or also “remote testnet sequencer endpoints” (and, if remote exists, what the endpoints are).

## Prerequisites

- OS: Linux (Ubuntu/Debian or Fedora) or macOS
- Dependencies (system):
  - Linux Ubuntu/Debian: `build-essential clang libclang-dev libssl-dev pkg-config`
  - Fedora: `clang clang-devel openssl-devel pkgconf`
  - macOS: Xcode CLT + Homebrew packages `pkg-config openssl`
- Dependencies (tooling):
  - Rust toolchain (installed via rustup)
  - Risc0 toolchain (`rzup`)
- Accounts/keys: generated via `wallet account new ...` (no external account system required for the local flow)
- Network/chain:
  - Local sequencer (HTTP server observed at `0.0.0.0:3040`)
  - Chain ID / network name: UNKNOWN
- Other:
  - Repo checkout: you run most commands from the `logos-blockchain/lssa` repo root

## Hardware requirements

- Target devices: x86_64 computer (Linux/macOS)
- Minimum: UNKNOWN (depends on proof generation and Rust compilation workload)

## Configuration

- Env vars:
  - `RUST_LOG=info` — enables runtime logs (used when running the sequencer/tests).
  - `RISC0_DEV_MODE=1` — skips proof generation to reduce runtime overhead (documented for tests; whether it’s appropriate for program deployment steps is UNKNOWN).
  - `NSSA_WALLET_HOME_DIR=...` — used by integration tests to set wallet state location (whether required for the program deployment tutorial is UNKNOWN).
- Flags:
  - UNKNOWN
- Config file keys:
  - Sequencer config directory argument appears to be `configs/debug` (exact config keys inside: UNKNOWN).
- Default endpoints/ports:
  - `3040/tcp` — sequencer HTTP server (wallet connects here; exact API surface: UNKNOWN).

## Steps (happy path)

1. Clone the repo and enter it:

   ```sh
   git clone https://github.com/logos-blockchain/lssa
   cd lssa
   ```

2. Install OS build dependencies:

   - Ubuntu/Debian:

     ```sh
     apt install build-essential clang libclang-dev libssl-dev pkg-config
     ```

   - Fedora:

     ```sh
     sudo dnf install clang clang-devel openssl-devel pkgconf
     ```

   - macOS:

     ```sh
     xcode-select --install
     brew install pkg-config openssl
     ```

3. Install Rust:

   ```sh
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

4. Install Risc0 + the zkVM toolchain:

   ```sh
   curl -L https://risczero.com/install | bash
   ```

   Restart your shell, then run:

   ```sh
   rzup install
   ```

5. Run the sequencer locally:

   ```sh
   cd sequencer_runner
   RUST_LOG=info cargo run --release configs/debug
   ```

6. In another terminal, install the wallet CLI from the repo root:

   ```sh
   cd /path/to/lssa
   cargo install --path wallet --force
   ```

7. Verify the wallet can connect to the running sequencer:

   ```sh
   wallet check-health
   ```

8. Deploy a sample program using the program deployment tutorial:

   - Go to the tutorial directory:

     ```sh
     cd examples/program_deployment
     ```

   - Follow the instructions in that tutorial to:

     - compile the example programs with Risc0,
     - deploy “hello world” variants,
     - run executions (including public/private contexts and tail calls),
     - observe results.

   Commands and exact steps: UNKNOWN (must be extracted from `examples/program_deployment`).

## Expected outputs

- After running the sequencer (step 5): logs indicating the HTTP server started and the sequencer is producing blocks (example logs include `Starting http server at 0.0.0.0:3040` and “Created block ...”).

- After installing the wallet (step 6): `wallet help` works (exact output: UNKNOWN).

- After `wallet check-health` (step 7): you should see:

  - `✅ All looks good!`

- After the program deployment tutorial (step 8): UNKNOWN (expected outputs must be documented per the tutorial’s steps).

## Verify

- Command:

  ```sh
  wallet check-health
  ```

- Expected:

  ```sh
  ✅ All looks good!
  ```

Additional verification for “custom program deployment” (beyond connectivity): UNKNOWN (depends on the tutorial’s deploy + execute commands and what success looks like).

## Troubleshooting (top 3-5)

- Symptom: `wallet check-health` fails / cannot connect.
  Cause: sequencer not running, or port differs from default.
  Fix/workaround: confirm the sequencer is running (`RUST_LOG=info ...`), and confirm the HTTP server port (observed default is 3040). If the tutorial config changes ports, document the override (UNKNOWN).

- Symptom: build fails with missing headers / OpenSSL / clang errors.
  Cause: OS build dependencies not installed.
  Fix/workaround: install the Linux/macOS dependency set from “Prerequisites” and retry.

- Symptom: `rzup` not found or Risc0 install incomplete.
  Cause: shell not restarted after install, or install failed.
  Fix/workaround: restart the shell, re-run `rzup install`, then retry.

- Symptom: Rust compilation is extremely slow or appears to hang during proof-related steps.
  Cause: proof generation and heavy compilation.
  Fix/workaround: for tests, `RISC0_DEV_MODE=1` is documented to skip proof generation. Whether that is valid for the deployment tutorial flow is UNKNOWN—confirm in `examples/program_deployment`.

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN
- Known issues/sharp edges:

  - The most complete workflow appears to be “dev/CLI + local sequencer”; an explicit “template → your own program” developer guide is still missing (exact status depends on `examples/program_deployment`, which must be reviewed and pinned).
  - Official “logos-docs” quickstart page linking and framing is still incomplete (per project tracking notes).

## References (links)

- Existing sources:

  - LSSA (Nescience/NSSA) repo: [https://github.com/logos-blockchain/lssa](https://github.com/logos-blockchain/lssa)
  - Wallet CLI walkthrough section in repo README: [https://github.com/logos-blockchain/lssa#try-the-wallet-cli](https://github.com/logos-blockchain/lssa#try-the-wallet-cli)
  - Program deployment tutorial directory: [https://github.com/logos-blockchain/lssa/tree/main/examples/program_deployment](https://github.com/logos-blockchain/lssa/tree/main/examples/program_deployment)
  - Logos docs index pointing to this journey: [https://github.com/logos-co/logos-docs](https://github.com/logos-co/logos-docs)
- Optional:

  - Risc0 install: [https://risczero.com/install](https://risczero.com/install)
