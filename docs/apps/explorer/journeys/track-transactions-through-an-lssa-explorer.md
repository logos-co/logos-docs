# Track transactions through an LSSA explorer

Applies to: https://github.com/logos-blockchain/lssa@main
Runtime target: Logos testnet v0.1
Last checked: 2026-01-28
Status: Stub
Owner: Owner needed
Tracking: [Tracking Google Sheet](https://docs.google.com/spreadsheets/d/1V94fhGxwTGbyLy2u8OcZmJQIzIctIGUHHfqyyY01V3E/edit?usp=sharing) (journey #6) / GitHub issue #155

## Outcome + value

- Outcome (end goal): Look up an LSSA transaction (by hash) and confirm its inclusion/details via an explorer-like interface.
- Why it matters: Gives operators/validators basic observability for debugging and validating LSSA activity on Testnet v0.1.

## Audience

- node operator
- validator

## Known gaps

- Doc Packet missing
- Notion/repo mapping needed
- Scope unclear: whether "sovereign explorer" is LSSA-specific, shared with other chains, and what it exposes for private-state activity.

## Prerequisites

- OS: UNKNOWN
- Dependencies: Rust toolchain; build deps (clang/libclang/openssl/pkg-config) per platform; Risc0 toolchain (if building from source) (see repo README).
- Accounts/keys: UNKNOWN
- Network/chain: UNKNOWN (Logos testnet v0.1 LSSA endpoints not provided)
- Other: Until a sovereign explorer exists, the only documented "transaction lookup" path is via the Wallet CLI `chain-info` subcommands against a running sequencer.

## Hardware requirements

- Target devices: UNKNOWN
- Minimum: UNKNOWN
- Recommended: UNKNOWN
- Storage profile: UNKNOWN
- RPi notes (if supported): UNKNOWN

## Configuration

- Env vars:
  - UNKNOWN

- Flags:
  - UNKNOWN

- Config file keys:
  - UNKNOWN (wallet/sequencer config keys are not documented for testnet in the inventory)

- Default endpoints/ports:
  - 3040/tcp (HTTP) - local sequencer_runner example shows an HTTP server on 0.0.0.0:3040 (local dev only)

## Steps (happy path)

1. If you do not have a sovereign explorer URL for testnet, use the CLI fallback:

   - Build/install the Wallet CLI from `logos-blockchain/lssa`.

2. Install the Wallet CLI (from repo root):

   - `cargo install --path wallet --force`

3. Ensure the wallet can reach a node/sequencer:

   - If you are running locally, start the sequencer (see repo README "Run the sequencer").
   - If you are targeting Testnet v0.1, you need the correct RPC/HTTP endpoint(s): UNKNOWN.

4. Run a health check:

   - `wallet check-health`

5. Find a recent block height/id:

   - `wallet chain-info current-block-id`

6. Look up a transaction:

   - Command shape is not documented here. Use:
     - `wallet chain-info transaction --help`

   - Then run the transaction lookup using the required args with your transaction hash.

7. Optionally, inspect the block that contains the transaction:

   - Command shape is not documented here. Use:
     - `wallet chain-info block --help`
	 
   - Then run the block lookup using the required args with the block id.

## Expected outputs

- After step 4 (`wallet check-health`): expected success indicator is:

  - `✅ All looks good!`

- After step 5 (`wallet chain-info current-block-id`): you should see something like:

  - `Last block id is <number>`

- After steps 6-7: UNKNOWN (output format and required flags/args not captured in current sources)

## Verify

- Command:

  ```sh
  wallet check-health
  ```

- Expected:

  ```sh
  - ✅ All looks good!
  ```

## Troubleshooting (top 3-5)

- Symptom: `wallet check-health` fails or times out
  Cause: Node/sequencer endpoint not reachable, or local sequencer not running
  Fix/workaround: If local, start the sequencer_runner; if testnet, obtain the correct endpoint(s) and configure the wallet accordingly (UNKNOWN where this is configured).

- Symptom: `wallet chain-info current-block-id` fails
  Cause: Same as above (no connectivity or wrong endpoint)
  Fix/workaround: Re-run `wallet check-health` and confirm connectivity first.

- Symptom: You have a tx hash but cannot find how to query it
  Cause: Command args not documented in the inventory
  Fix/workaround: Use `wallet chain-info transaction --help` to discover the required arguments, then re-run with the tx hash.

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN (no sovereign explorer identified; only CLI-level lookup is documented)
- Known issues/sharp edges: UNKNOWN

## References (links)

- Existing sources:

  - [https://github.com/logos-blockchain/lssa](https://github.com/logos-blockchain/lssa) (README: install deps, run sequencer, install wallet, `check-health`, `chain-info`)
- Optional:
