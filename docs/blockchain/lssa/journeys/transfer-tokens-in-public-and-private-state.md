# Transfer tokens in public and private state

Applies to: https://github.com/logos-blockchain/lssa@main 
Last checked: 2026-01-27  
Status: Stub  
Owner: owner needed  
Tracking: Testnet v0.1 docs in scope spreadsheet (journey: "Transfer tokens in public and private state")

## Purpose

Enable a developer to move native tokens between public and private accounts on the LSSA-based chain, to validate the public/private state model and ZK-backed execution paths.

## Audience

- Developer

## Known gaps

- Missing Doc Packet items:

  - Canonical testnet environment details (chain/network name, endpoints, faucet details, supported versions)
  - Repo + commit SHA for "v0.1" (or any pinned reference)
  - Hardware requirements (beyond "proof generation may take minutes")
  - SME-confirmed failure modes and troubleshooting list for transfers
  
- Clear instructions for transfers from a private sender (private->public, private->private) are not shown as a full worked example.

- Wallet networking configuration (how to point the wallet at a specific sequencer endpoint) is not documented in the referenced material.

## Prerequisites

- OS: Linux/macOS (per repository instructions); Windows: UNKNOWN

- Tooling:

  - Rust toolchain installed (via rustup)
  - Build deps (clang/libclang, OpenSSL dev libs, pkg-config) per repo instructions
  - Risc0 installed (rzup)

- Access to a running sequencer:

  - Local sequencer can be started from the repo; logs show an HTTP server starting at 0.0.0.0:3040 (exact remote/testnet endpoint: UNKNOWN).

- Wallet CLI installed (from repo root):

  - `cargo install --path wallet --force`

- Funding source for native tokens:

  - "Pinata" program exists on the testnet and can fund a public account via `wallet pinata claim` (amount and constraints: UNKNOWN).
  
- Hardware assumptions:

  - Private transfers require generating a proof locally; the referenced tutorial says this can take ~30 seconds to ~4 minutes depending on the machine.

## Configuration

- Env vars:

  - UNKNOWN (wallet network configuration not described in the referenced material)

- Flags:

  - UNKNOWN (wallet network configuration not described in the referenced material)

- Config file keys:

  - UNKNOWN

- Default endpoints/ports:

  - Local sequencer example starts an HTTP server at 0.0.0.0:3040 (from sequencer_runner logs).
  - Wallet endpoint defaults: UNKNOWN / NOT ENOUGH INFORMATION

## Steps

### 0) Start or confirm a sequencer is running (local example)

From the repo:

1. Start the sequencer:

   ```sh
   cd sequencer_runner
   RUST_LOG=info cargo run --release configs/debug
   ```

### 1) Install the wallet CLI (if not already installed)

From the repo root:

```sh
cargo install --path wallet --force
wallet help
```

### 2) Optional: sanity-check wallet connectivity

```sh
wallet check-health
```

### 3) Create a sender public account

```sh
wallet account new public
```

Record the generated `Public/<ACCOUNT_ID>` as:

- `SENDER_PUBLIC_ACCOUNT_ID`

### 4) Initialize the sender account for authenticated native-token transfers

```sh
wallet auth-transfer init --account-id Public/<SENDER_PUBLIC_ACCOUNT_ID>
```

Check the account state:

```sh
wallet account get --account-id Public/<SENDER_PUBLIC_ACCOUNT_ID>
```

### 5) Fund the sender account (testnet faucet via "Pinata" program)

```sh
wallet pinata claim --to Public/<SENDER_PUBLIC_ACCOUNT_ID>
```

Verify it has a balance:

```sh
wallet account get --account-id Public/<SENDER_PUBLIC_ACCOUNT_ID>
```

### 6) Public -> public transfer

Create a recipient public account:

```sh
wallet account new public
```

Record the generated `Public/<ACCOUNT_ID>` as:

- `RECIPIENT_PUBLIC_ACCOUNT_ID`

Send tokens:

```sh
wallet auth-transfer send \
  --from Public/<SENDER_PUBLIC_ACCOUNT_ID> \
  --to Public/<RECIPIENT_PUBLIC_ACCOUNT_ID> \
  --amount <AMOUNT>
```

Check both balances:

```sh
wallet account get --account-id Public/<SENDER_PUBLIC_ACCOUNT_ID>
wallet account get --account-id Public/<RECIPIENT_PUBLIC_ACCOUNT_ID>
```

### 7) Public -> private transfer (local private recipient)

Create a private account in your local wallet:

```sh
wallet account new private
```

Record the generated `Private/<ACCOUNT_ID>` as:

- `RECIPIENT_PRIVATE_ACCOUNT_ID`

Send tokens to the private account (this runs locally, generates a proof, then submits it):

```sh
wallet auth-transfer send \
  --from Public/<SENDER_PUBLIC_ACCOUNT_ID> \
  --to Private/<RECIPIENT_PRIVATE_ACCOUNT_ID> \
  --amount <AMOUNT>
```

Check balances:

```sh
wallet account get --account-id Public/<SENDER_PUBLIC_ACCOUNT_ID>
wallet account get --account-id Private/<RECIPIENT_PRIVATE_ACCOUNT_ID>
```

### 8) Public -> foreign private transfer (recipient uses npk/ipk)

If you need to send to a private account that belongs to someone else, the tutorial shows using `--to-npk` and `--to-ipk` (recipient-provided public keys):

```sh
wallet auth-transfer send \
  --from Public/<SENDER_PUBLIC_ACCOUNT_ID> \
  --to-npk <RECIPIENT_NPK> \
  --to-ipk <RECIPIENT_IPK> \
  --amount <AMOUNT>
```

Recipient must then sync:

```sh
wallet account sync-private
```

## Expected outputs

- After starting the sequencer (local example): logs include an HTTP server starting at `0.0.0.0:3040`.
- After `wallet check-health`: the tutorial shows:

  - `✅ All looks good!`
- After `wallet account get` on an initialized public account:

  - A line like: `Account owned by authenticated transfer program`
  - A JSON balance line like: `{"balance":<NUMBER>}`
- After `wallet account new public`:

  - `Generated new account with account_id Public/<...>`
- After `wallet account new private`:

  - `Generated new account with account_id Private/<...>`
  - plus `npk ...` and `ipk ...` lines (when shown in the tutorial)
- After transfers succeed:

  - Sender/recipient balances change as expected when re-checking with `wallet account get`.

## Verify

Run account queries and confirm balances reflect the transfer:

```sh
wallet account get --account-id Public/<SENDER_PUBLIC_ACCOUNT_ID>
wallet account get --account-id Public/<RECIPIENT_PUBLIC_ACCOUNT_ID>
wallet account get --account-id Private/<RECIPIENT_PRIVATE_ACCOUNT_ID>
```

Expected:

- Public/public: recipient balance increases by `<AMOUNT>`, sender decreases accordingly.
- Public/private: private recipient balance increases by `<AMOUNT>`, sender decreases accordingly.

## Troubleshooting

- Symptom: Transfer to a private recipient takes a long time.

  - Fix: Expected behavior for proof generation; the tutorial says it can take ~30 seconds to ~4 minutes depending on the machine.
- Symptom: A private account does not reflect incoming funds on another machine/wallet.

  - Fix: For "foreign private" transfers, the recipient must run `wallet account sync-private` to scan and update local private account state.
- Symptom: Confusion about querying private accounts "from the network".

  - Fix: Private accounts are described as existing only in local wallet storage; ensure you are querying from the wallet that owns/synced the private account.

## Limits (v0.1)

- UNKNOWN
- Private-sender transfers (private->public, private->private) are stated to work similarly, but a full worked example is not provided in the referenced material.

## References

- LSSA repo (Wallet CLI tutorial and native token transfers): [https://github.com/logos-blockchain/lssa#try-the-wallet-cli](https://github.com/logos-blockchain/lssa#try-the-wallet-cli)
- Same repo (sequencer run instructions are in README near "Run the sequencer"): [https://github.com/logos-blockchain/lssa](https://github.com/logos-blockchain/lssa)
