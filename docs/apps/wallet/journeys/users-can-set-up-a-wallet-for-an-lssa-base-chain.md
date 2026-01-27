# Users can set up a wallet for an LSSA-based chain

Applies to: https://github.com/logos-blockchain/lssa@main  
Runtime target: other (local LSSA sequencer + wallet CLI per repo README)  
Last checked: Jan 27, 2026
Status: Stub  
Owner: Owner needed  
Tracking: [User journey inventory spreadsheet](https://docs.google.com/spreadsheets/d/1V94fhGxwTGbyLy2u8OcZmJQIzIctIGUHHfqyyY01V3E/edit?usp=sharing) num. 1

## Outcome + value

- Outcome (end goal): Install and run the LSSA wallet CLI and create an account ID you can use to interact with an LSSA sequencer.
- Why it matters: Confirms the minimum client-side setup needed to exercise LSSA flows (accounts, tokens, programs) as part of Testnet v0.1.

## Audience

- developer
- tester

## Known gaps / Blockers

- [Doc Packet](../../../_shared/templates/doc-packet-testnet-v01.md) missing.
- Notion/repo mapping needed.
- Hardware guidance: no official minimum/recommended specs provided.

## Prerequisites

- OS: Linux (Ubuntu/Debian or Fedora) or macOS (per repository README); Windows: UNKNOWN
- Dependencies:
  - Linux (Ubuntu/Debian): build-essential, clang, libclang-dev, libssl-dev, pkg-config
  - Linux (Fedora): clang, clang-devel, openssl-devel, pkgconf
  - macOS: Xcode command line tools; Homebrew packages pkg-config and openssl
  - Rust toolchain via rustup
  - Risc0 toolchain (rzup)
- Accounts/keys: None required up front; the wallet CLI generates key material when creating accounts.
- Network/chain:
  - Local: sequencer HTTP server listens on 0.0.0.0:3040 when running the sequencer locally.
  - Logos testnet v0.1 endpoints/chain ID: UNKNOWN
- Other: Some wallet operations (proof generation) can take significant time depending on machine; no official minimum specs documented.

## Hardware requirements

- Target devices: x86_64 developer machine (local build + local sequencer); RPi: UNKNOWN
- Minimum: UNKNOWN
- Recommended: UNKNOWN
- Storage profile: UNKNOWN

## Configuration

- Env vars:
  - UNKNOWN (no wallet config env vars documented in the README for the basic "wallet install + connect" flow).
- Flags:
  - UNKNOWN
- Config file keys:
  - UNKNOWN
- Default endpoints/ports:
  - 3040/tcp - sequencer HTTP server (local run).

## Steps (happy path)

1. Clone the repo and install dependencies (example for Ubuntu/Debian; adjust for Fedora/macOS):

   ```sh
   git clone https://github.com/logos-blockchain/lssa.git
   cd lssa
   sudo apt install build-essential clang libclang-dev libssl-dev pkg-config
   ```

## Steps (happy path)

1. Clone the repo and install dependencies (example for Ubuntu/Debian; adjust for Fedora/macOS):

   ```sh
   git clone https://github.com/logos-blockchain/lssa.git
   cd lssa
   sudo apt install build-essential clang libclang-dev libssl-dev pkg-config
   ```

2. Install Rust:

   ```sh
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. Install Risc0 and its tooling:

   ```sh
   curl -L https://risczero.com/install | bash
   # Restart your shell, then:
   rzup install
   ```

4. Run the LSSA sequencer locally:

   ```sh
   cd sequencer_runner
   RUST_LOG=info cargo run --release configs/debug
   ```

5. In a second terminal, from the repo root, install the wallet CLI:

   ```sh
   cd /path/to/lssa
   cargo install --path wallet --force
   wallet help
   ```

6. Check that the wallet can connect to the sequencer:

   ```sh
   wallet check-health
   ```

7. Create a new public account:

   ```sh
   wallet account new public
   ```

## Expected outputs

- After step 4: Logs include an HTTP server start message (for example: "Starting http server at 0.0.0.0:3040") and the sequencer loop starts.
- After step 6: `✅ All looks good!`
- After step 7: Output includes a generated account ID similar to `Generated new account with account_id Public/<...>`.

## Verify

- Command:

  ```sh
  wallet check-health
  ```

- Expected:

  ```sh
  ✅ All looks good!
  ```

## Troubleshooting (top 3-5)

- Symptom: `cargo` build fails with missing `clang` / `libclang` errors.
  Cause: Build dependencies are not installed.
  Fix/workaround: Install the repo's documented build dependencies for your OS (Ubuntu/Debian/Fedora/macOS), then retry.

- Symptom: `rzup: command not found` or Risc0-related build/proof errors.
  Cause: Risc0 tooling is not installed (or the shell wasn't restarted after install).
  Fix/workaround: Re-run the documented Risc0 install, restart the shell, and run `rzup install`.

- Symptom: `wallet check-health` fails to connect.
  Cause: The sequencer is not running (or is not reachable at the expected address/port).
  Fix/workaround: Ensure the sequencer is running locally and listening on port 3040; retry.

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN / NOT ENOUGH INFORMATION.
- Known issues/sharp edges: UNKNOWN / NOT ENOUGH INFORMATION (link issues/PRs).

## References (links)

- Existing sources:

  - [https://github.com/logos-blockchain/lssa#install-dependencies](https://github.com/logos-blockchain/lssa#install-dependencies)
  - [https://github.com/logos-blockchain/lssa#run-the-sequencer](https://github.com/logos-blockchain/lssa#run-the-sequencer)
  - [https://github.com/logos-blockchain/lssa#try-the-wallet-cli](https://github.com/logos-blockchain/lssa#try-the-wallet-cli)
