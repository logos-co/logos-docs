# Create and transfer custom tokens (public and private states)

Applies to: https://github.com/logos-blockchain/lssa@main@UNKNOWN  
Runtime target: Logos testnet v0.1  
Last checked: 2026-01-28  
Status: Stub  
Owner: Owner needed  
Tracking:
	- [Google tracking spreadsheet](https://docs.google.com/spreadsheets/d/1V94fhGxwTGbyLy2u8OcZmJQIzIctIGUHHfqyyY01V3E/edit?usp=sharing) (Journey #3)
	- GitHub tracking issue #159

## Outcome + value

- Outcome (end goal): Create a custom token, hold its supply in a public or private holding account, and transfer units of that token to another holding account.
- Why it matters: Proves token-program functionality and public/private account interoperability for LSSA/NSSA flows targeted in v0.1.

## Audience

- developer

## Known gaps / Blockers

- Doc Packet missing
- Notion/repo mapping needed

## Prerequisites

- OS: Linux (Ubuntu/Debian or Fedora) or macOS (per repo instructions). UNKNOWN for Windows.
- Dependencies: build tooling + Rust + Risc0 (see install steps below).
- Accounts/keys: local wallet key material generated via `wallet account new` (public/private). Any additional wallet seed/config is UNKNOWN.
- Network/chain: local sequencer HTTP server is shown on port 3040 in the repo example; Logos testnet v0.1 endpoints/chain ID are UNKNOWN.
- Other: for private-state interactions, proof generation may be compute-heavy on the user side (see Hardware requirements).

## Hardware requirements

- Target devices: x86_64 computer (assumed). RPi support UNKNOWN.
- Minimum: UNKNOWN (CPU/RAM/storage requirements not documented).
- Recommended: x86_64 with enough CPU to handle client-side ZK proof generation for private transactions (exact specs UNKNOWN).
- Storage profile: UNKNOWN.

## Configuration

- Env vars:

  - `RISC0_DEV_MODE=1` - skips proof generation (documented for tests; may reduce overhead during local experimentation).
  - `NSSA_WALLET_HOME_DIR=<path>` - wallet home dir used by the repo integration test configs (relevance to manual flows is UNKNOWN).

- Flags:

  - UNKNOWN

- Config file keys:

  - UNKNOWN

- Default endpoints/ports:

  - `3040/tcp` - sequencer HTTP server (local example).

## Steps (happy path)

1. Install build dependencies (example for Debian/Ubuntu):

   ```sh
   sudo apt install build-essential clang libclang-dev libssl-dev pkg-config
   ```

2. Install Rust:

   ```sh
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. Install Risc0 and `rzup`:

   ```sh
   curl -L https://risczero.com/install | bash
   rzup install
   ```

4. Clone the repo and run a local sequencer:

   ```sh
   git clone https://github.com/logos-blockchain/lssa
   cd lssa/sequencer_runner
   RUST_LOG=info cargo run --release configs/debug
   ```

5. In another terminal, install the wallet CLI and verify connectivity:

   ```sh
   cd /path/to/lssa
   cargo install --path wallet --force
   wallet check-health
   ```

6. Create and fund a public account (used in the tutorial before executing other programs):

   ```sh
   wallet account new public
   # Take note of the Public/<ID> printed by the CLI.

   wallet auth-transfer init --account-id Public/<YOUR_PUBLIC_ID>
   wallet pinata claim --to Public/<YOUR_PUBLIC_ID>
   ```

7. Create a new custom token (public definition + private holding for supply, to cover "public/private states"):

   ```sh
   # Create an uninitialized public account for the token definition
   wallet account new public
   # => Public/<DEF_ID>

   # Create an uninitialized private account for the initial supply holding
   wallet account new private
   # => Private/<SUPPLY_HOLDING_ID> (CLI prints npk/ipk)

   # Create the token and mint the full initial supply into the supply holding account
   wallet token new \
     --name <TOKEN_SYMBOL> \
     --total-supply <TOTAL_SUPPLY_INT> \
     --definition-account-id Public/<DEF_ID> \
     --supply-account-id Private/<SUPPLY_HOLDING_ID>
   ```

8. Create a recipient holding account and transfer some of the custom token to it:

   ```sh
   # Recipient holding account (uninitialized is OK; it will be claimed by the token program)
   wallet account new public
   # => Public/<RECIPIENT_HOLDING_ID>

   wallet token send \
     --from Private/<SUPPLY_HOLDING_ID> \
     --to Public/<RECIPIENT_HOLDING_ID> \
     --amount <AMOUNT_INT>
   ```

## Expected outputs

- After step 4: sequencer logs show HTTP server starting (example mentions `Starting http server at 0.0.0.0:3040`).

- After step 5:

  - `wallet check-health` prints a success line (example: `✅ All looks good!`).

- After step 7:

  - `wallet account get --account-id Public/<DEF_ID>` shows the definition account is owned by the token program and prints JSON with token name and total supply.
  - `wallet account get --account-id Private/<SUPPLY_HOLDING_ID>` shows a token holding with the expected `definition_id` and full initial `balance` equal to the total supply.

- After step 8:

  - `wallet account get --account-id Public/<RECIPIENT_HOLDING_ID>` shows a token holding owned by the token program and `balance` equal to the amount sent.

## Verify

- Command:

  ```sh
  wallet account get --account-id Public/<RECIPIENT_HOLDING_ID>
  ```

- Expected:

  ```sh
  - Output indicates "Holding account owned by token program"
  - JSON includes "account_type":"Token holding"
  - JSON includes "definition_id":"<DEF_ID>"
  - JSON includes "balance":<AMOUNT_INT>
  ```

## Troubleshooting (top 3-5)

- Symptom: `wallet check-health` fails.
  Cause: sequencer not running or wallet cannot connect to the node.
  Fix/workaround: start the sequencer (`sequencer_runner ...`) and retry `wallet check-health`.

- Symptom: Transactions take a long time during private-state operations.
  Cause: proof generation happens on the user side for privacy-preserving transactions.
  Fix/workaround: for local testing, consider using dev/test configurations that skip proof generation where applicable (exact approach for manual flows is UNKNOWN).

- Symptom: Recipient holding account shows as "Uninitialized" after attempting a transfer.
  Cause: transfer likely did not succeed (reason UNKNOWN).
  Fix/workaround: re-run the transfer and re-check balances; if still failing, capture CLI output and escalate to Owner needed.

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN (v0.1-specific constraints not provided).
- Known issues/sharp edges: private holding accounts are not visible to other users; token transfers to uninitialized recipient accounts are expected to be claimed automatically by the token program.

## References (links)

- Existing sources:

  - [https://github.com/logos-blockchain/lssa](https://github.com/logos-blockchain/lssa) (README sections: install deps, run sequencer, wallet tutorial, token creation, token transfers)
