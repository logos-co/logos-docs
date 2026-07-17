---
title: Run an LEZ payment stream
doc_type: procedure
product: lez
topics: [lez]
steps_layout: sectioned
authors: s-tikhomirov, kashepavadan
owner: logos
doc_version: 1
slug: run-lez-payment-stream
---

# Run an LEZ payment stream

#### Get started opening and closing a continuous payment stream on testnet v0.2.

This procedure covers how to open a payment stream on the LEZ that pays a service provider continuously over time and lets the provider claim the accrued tokens. Both the payer and payee roles run on a single host with one `logoscore` daemon and one wallet file holding two public accounts. Payment streams are based on the [LIP-155](https://lip.logos.co/anoncomms/raw/payment-streams.html) protocol.

Before you start, make sure you have the following:

- Linux host with `bash`, `git`, `python3` (stdlib only), `curl`, `rsync`
- [Docker](https://docs.docker.com/get-docker/)
- [Nix with flakes enabled](https://nixos.org/download)
- [RISC Zero CLI](https://dev.risczero.com/api/zkvm/install)
- Rust and `cargo` (for `lgs setup` and `lgs` install)
- Outbound network access to `https://testnet.lez.logos.co/`

## What to expect

- You can build the RISC Zero guest ELF, verify its ImageID matches the testnet fixture, and confirm the sequencer is reachable before any chain writes.
- You can fund two public accounts, initialize a vault, deposit tokens, and open a payment stream at a fixed rate from a single wallet.
- You can close the stream after tokens accrue and confirm the payee's on-chain balance increases after the claim transaction is included in a block.

## Step 1: Set up the environment

Clone the LEZ Payment Streams repository, initialize the journey shell, and export all session variables and shell helper functions used by later steps.

1. Clone the repository and initialize the journey shell:

   ```bash
   git clone https://github.com/logos-co/lez-payment-streams.git
   cd lez-payment-streams
   chmod +x scripts/user-journey-*.sh
   ./scripts/user-journey-reset.sh
   ./scripts/user-journey-shell.sh
   ```

   - `user-journey-shell.sh` installs `lgs` when missing, then opens a Nix shell with pinned `logoscore` and `lgpm` that load `linux-amd64-dev` modules.

1. Export session variables and define shell helper functions:

   ```bash
   export REPO_ROOT="$(pwd)"
   export REPO="$REPO_ROOT"
   export FIXTURE_MANIFEST="$REPO_ROOT/fixtures/testnet-module.json"
   export LEZ_PIN="$(grep -A2 '^\[repos.lez\]' "$REPO_ROOT/scaffold.toml" | sed -n 's/^pin = "\(.*\)"/\1/p')"
   export SCAFFOLD_LEZ_CACHE="${HOME}/.cache/logos-scaffold/repos/lez/${LEZ_PIN}"
   export SCAFFOLD_WALLET="${SCAFFOLD_LEZ_CACHE}/target/release/wallet"
   export MODULES="$REPO_ROOT/.scaffold/e2e/user/modules"
   export WALLET_HOME="$REPO_ROOT/.scaffold/e2e/testnet-wallet"
   export LEE_WALLET_HOME_DIR="$WALLET_HOME"
   export WALLET_CONFIG="$WALLET_HOME/wallet_config.json"
   export WALLET_STORAGE="$WALLET_HOME/storage.json"
   export WALLET_PASSWORD="choose-a-local-password"
   export PAYMENT_STREAMS_GUEST_BIN="$REPO_ROOT/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/lez_payment_streams.bin"
   export SEQUENCER_URL="https://testnet.lez.logos.co/"
   export DEPOSIT=500
   export ALLOCATION=80
   export RATE=1
   export MIN_ACCRUED=1
   export VAULT_ID=0
   export STREAM_ID=0
   export PAYER=""
   export PAYEE=""
   export LOGOSCORE_DAEMON_LOG="$REPO_ROOT/.scaffold/e2e/user-journey-logoscore-$(date -u +%Y-%m-%dT%H-%M-%SZ).log"
   ```

   ```bash
   # wrap CLI calls with `-q`
   logoscore() { command logoscore -q "$@"; }

   # print step status
   journey_ok() { echo "Success: $*"; }
   journey_fail() { echo "Failed: $*" >&2; return 1; }

   # checks the last line of a chain write for `"status":"error"`
   journey_write_ok() {
     local label="$1" line="$2"
     if [[ -z "$line" ]] || echo "$line" | grep -q '"status":"error"'; then
       journey_fail "$label"
       [[ -n "$line" ]] && echo "$line" >&2
       return 1
     fi
     journey_ok "$label"
   }

   # pulls the wallet mirror up to the current tip; call it after each `chainAction` write before reading status
   sync_to_chain() {
     local raw height
     raw=$(curl -sf -X POST "$SEQUENCER_URL" -H 'Content-Type: application/json' \
       -d '{"jsonrpc":"2.0","id":1,"method":"getLastBlockId","params":[]}')
     height=$(printf '%s' "$raw" | python3 -c 'import json,sys; d=json.load(sys.stdin); r=d.get("result"); print(r if isinstance(r,int) else (r or ""))' 2>/dev/null || true)
     if [[ -z "$height" ]]; then
       echo "sync_to_chain: could not parse getLastBlockId from sequencer" >&2
       return 1
     fi
     logoscore call logos_execution_zone sync_to_block "$height" >/dev/null
     sleep 3
   }

   # reads a sequencer `getAccount` balance directly
   chain_balance() {
     curl -sf -X POST "$SEQUENCER_URL" -H 'Content-Type: application/json' \
       -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccount\",\"params\":[\"$1\"]}" \
       | sed -n 's/.*"balance":\([0-9][0-9]*\).*/\1/p' | head -1
   }
   last_block() {
     curl -sf -X POST "$SEQUENCER_URL" -H 'Content-Type: application/json' \
       -d '{"jsonrpc":"2.0","id":1,"method":"getLastBlockId","params":[]}' \
     | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"])'
   }
   journey_ok "Session variables and shell helpers ready"
   ```

1. Confirm the sequencer is reachable:

   ```bash
   curl -sf -X POST "$SEQUENCER_URL" -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"getLastBlockId","params":[]}'
   journey_ok "Sequencer reachable"
   ```

1. Build the guest ELF and verify its ImageID matches the testnet fixture:

   ```bash
   cd "$REPO_ROOT"
   make build
   test -f "$PAYMENT_STREAMS_GUEST_BIN"
   journey_ok "Guest ELF built"
   ```

   ```bash
   cd "$REPO_ROOT"
   EXPECTED=$(grep -o '"program_id_hex": "[^"]*"' "$REPO_ROOT/fixtures/testnet-module.json" \
     | sed -n 's/.*"program_id_hex": "\([^"]*\)".*/\1/p')
   BUILT=$(make program-id 2>/dev/null | sed -n 's/.*ImageID (hex bytes): //p' | tr -d '[:space:]')
   if [[ -z "$BUILT" ]]; then
     echo "Could not read ImageID from make program-id (run make build first)." >&2
   elif [[ "$BUILT" == "$EXPECTED" ]]; then
     echo "Program id matches testnet fixture."
     journey_ok "Guest ELF built; program id matches testnet fixture"
   else
     echo "Guest ImageID mismatch." >&2
     echo "  built:    $BUILT" >&2
     echo "  expected: $EXPECTED" >&2
   fi
   ```

   - Stop if ImageID does not match the fixture.

1. Install the scaffold, wallet CLI, and Logos modules:

   ```bash
   cd "$REPO_ROOT"
   ./scripts/user-journey-lgs-setup.sh
   export SCAFFOLD_WALLET="${SCAFFOLD_LEZ_CACHE}/target/release/wallet"
   test -x "$SCAFFOLD_WALLET"
   journey_ok "Scaffold and standalone wallet CLI ready"
   ```

   ```bash
   cd "$REPO_ROOT"
   ./scripts/user-journey-install-modules.sh
   export WALLET_CONFIG="$WALLET_HOME/wallet_config.json"
   export LEE_WALLET_HOME_DIR="$WALLET_HOME"
   journey_ok "Testnet wallet config and Logos modules installed"
   ```

## Step 2: Start the daemon and open the wallet

Start `logoscore` with `FIXTURE_MANIFEST` in the environment, then load the `payment_streams_module` and `logos_execution_zone` modules and open or create the wallet. `payment_streams_module` reads `FIXTURE_MANIFEST` at daemon startup — if you change it later, re-run this step.

{% hint style="info" %}
Only `capability_module` loads automatically. `logos_execution_zone` and `payment_streams_module` must be loaded explicitly in the second block below.
{% endhint %}

1. Start the `logoscore` daemon in background mode:

   ```bash
   cd "$REPO_ROOT"
   mkdir -p "$(dirname "$LOGOSCORE_DAEMON_LOG")"
   logoscore stop 2>/dev/null || true
   logoscore -D -m "$MODULES" >>"$LOGOSCORE_DAEMON_LOG" 2>&1 &
   ready=0
   for (( i = 0; i < 20; i++ )); do
     if logoscore list-modules --loaded >/dev/null 2>&1; then ready=1; break; fi
     sleep 0.5
   done
   if (( ready )); then
     journey_ok "logoscore daemon started (log: $LOGOSCORE_DAEMON_LOG)"
   else
     journey_fail "logoscore daemon not ready; check $LOGOSCORE_DAEMON_LOG"
   fi
   ```

   - If this step prints `Failed`, inspect `$LOGOSCORE_DAEMON_LOG` before continuing.
   - The daemon log filename includes a UTC ISO timestamp; `tail -f "$LOGOSCORE_DAEMON_LOG"` streams daemon debug output.

1. Load the `payment_streams_module` and `logos_execution_zone` modules and open or create the wallet:

   ```bash
   logoscore load-module logos_execution_zone
   logoscore load-module payment_streams_module
   if [[ ! -f "$WALLET_STORAGE" ]]; then
     logoscore call logos_execution_zone create_new "$WALLET_CONFIG" "$WALLET_STORAGE" "$WALLET_PASSWORD"
   else
     logoscore call logos_execution_zone open "$WALLET_CONFIG" "$WALLET_STORAGE"
   fi
   logoscore call logos_execution_zone save
   journey_ok "Modules loaded; wallet open (log: $LOGOSCORE_DAEMON_LOG)"
   ```

## Step 3: Create and fund accounts

Create a payer and payee public account, register them for authenticated transfers, and fund them from the LEZ pinata (testnet faucet).

1. Create payer and payee public accounts:

   ```bash
   if ! logoscore list-modules --loaded 2>/dev/null | grep -q logos_execution_zone; then
     journey_fail "logos_execution_zone not loaded; run the second block of Step 2 (load-module logos_execution_zone, load-module payment_streams_module, open wallet) before continuing"
   else
   if [[ -z "$PAYER" ]]; then
     PAYER_HEX=$(logoscore call logos_execution_zone create_account_public | tail -1 \
       | sed -n 's/.*"result":"\([^"]*\)".*/\1/p')
     PAYER=$(logoscore call logos_execution_zone account_id_to_base58 "$PAYER_HEX" | tail -1 \
       | sed -n 's/.*"result":"\([^"]*\)".*/\1/p')
     export PAYER
   fi
   if [[ -z "$PAYEE" ]]; then
     PAYEE_HEX=$(logoscore call logos_execution_zone create_account_public | tail -1 \
       | sed -n 's/.*"result":"\([^"]*\)".*/\1/p')
     PAYEE=$(logoscore call logos_execution_zone account_id_to_base58 "$PAYEE_HEX" | tail -1 \
       | sed -n 's/.*"result":"\([^"]*\)".*/\1/p')
     export PAYEE
   fi
   logoscore call logos_execution_zone save
   journey_ok "Payer and payee public accounts ready (payer=$PAYER payee=$PAYEE)"
   fi
   ```

1. Register both accounts for authenticated transfers:

   ```bash
   cd "$REPO_ROOT"
   ./scripts/user-journey-auth-transfer.sh
   sync_to_chain
   journey_ok "Authenticated transfer registered for payer and payee"
   ```

1. Fund accounts from the testnet pinata. The wallet must be closed before the standalone `wallet` binary claims pinata:

   ```bash
   export PATH="$(dirname "$SCAFFOLD_WALLET"):$PATH"
   PINATA_PER_CLAIM=150
   PAYER_TARGET=$((DEPOSIT + 50))
   PAYEE_TARGET=50
   MAX_CLAIMS_PER_ACCOUNT=6

   pb=$(chain_balance "$PAYER"); pb=${pb:-0}
   pe=$(chain_balance "$PAYEE"); pe=${pe:-0}
   payer_claims=0
   payee_claims=0
   if (( pb < PAYER_TARGET )); then
     payer_claims=$(( (PAYER_TARGET - pb + PINATA_PER_CLAIM - 1) / PINATA_PER_CLAIM ))
     (( payer_claims > MAX_CLAIMS_PER_ACCOUNT )) && payer_claims=$MAX_CLAIMS_PER_ACCOUNT
   fi
   if (( pe < PAYEE_TARGET )); then
     payee_claims=$(( (PAYEE_TARGET - pe + PINATA_PER_CLAIM - 1) / PINATA_PER_CLAIM ))
     (( payee_claims > MAX_CLAIMS_PER_ACCOUNT )) && payee_claims=$MAX_CLAIMS_PER_ACCOUNT
   fi

   logoscore call logos_execution_zone close
   for (( i = 0; i < payer_claims; i++ )); do
     "$SCAFFOLD_WALLET" pinata claim --to "Public/$PAYER"
     sleep 2
   done
   for (( i = 0; i < payee_claims; i++ )); do
     "$SCAFFOLD_WALLET" pinata claim --to "Public/$PAYEE"
     sleep 2
   done
   logoscore call logos_execution_zone open "$WALLET_CONFIG" "$WALLET_STORAGE"
   logoscore call logos_execution_zone save

   pb=$(chain_balance "$PAYER"); pb=${pb:-0}
   pe=$(chain_balance "$PAYEE"); pe=${pe:-0}
   echo "Payer balance $pb (target $PAYER_TARGET); payee balance $pe (target $PAYEE_TARGET)"
   sync_to_chain
   journey_ok "Payer and payee funded on testnet (pinata)"
   ```

## Step 4: Initialise the vault and deposit

Initialise a vault for the payer and deposit tokens into it. Each write block captures the submission height `$h0`. Wait until `last_block` is greater than `$h0` before reading vault status.

{% hint style="warning" %}
If `initializeVault` fails because vault 0 already exists for `$PAYER` (from a previous run), run `export VAULT_ID=1` and retry. Or run `./scripts/user-journey-reset.sh` to start with new accounts.
{% endhint %}

1. Initialise the vault and confirm inclusion:

   ```bash
   h0=$(last_block)
   line=$(logoscore call payment_streams_module chainAction initializeVault \
     "{\"signer\":\"$PAYER\",\"vault_id\":$VAULT_ID}" | tail -1)
   echo "$line"
   journey_write_ok "Vault created (vault_id=$VAULT_ID)" "$line"
   echo "Submitted at chain height $h0"
   ```

   Wait until `last_block` is greater than `$h0`, then confirm the state change:

   ```bash
   sync_to_chain
   logoscore call payment_streams_module chainAction getVaultStatus \
     "{\"owner\":\"$PAYER\",\"vault_id\":$VAULT_ID}"
   ```

   - Proceed only once the read returns a real `vault_config` instead of `account data missing`. If the expected state has not appeared after about one minute (several blocks), the transaction was likely dropped — re-run the write block.

1. Deposit tokens into the vault and confirm inclusion:

   ```bash
   h0=$(last_block)
   line=$(logoscore call payment_streams_module chainAction deposit \
     "{\"signer\":\"$PAYER\",\"vault_id\":$VAULT_ID,\"amount_lo\":$DEPOSIT,\"amount_hi\":0}" | tail -1)
   echo "$line"
   journey_write_ok "Vault funded ($DEPOSIT tokens, vault_id=$VAULT_ID)" "$line"
   echo "Submitted at chain height $h0"
   ```

   Wait until `last_block` is greater than `$h0`, then confirm the state change:

   ```bash
   sync_to_chain
   logoscore call payment_streams_module chainAction getVaultStatus \
     "{\"owner\":\"$PAYER\",\"vault_id\":$VAULT_ID}"
   ```

   - Proceed only once the read reflects the funded `vault_holding_balance`. If the expected state has not appeared after about one minute (several blocks), the deposit was likely dropped — re-run the write block.

## Step 5: Create the stream and wait for accrual

Open the payment stream at the configured rate and allocation, then wait for at least `MIN_ACCRUED` tokens to accrue before closing.

1. Create the stream and confirm inclusion:

   ```bash
   h0=$(last_block)
   line=$(logoscore call payment_streams_module chainAction createStream \
     "{\"signer\":\"$PAYER\",\"vault_id\":$VAULT_ID,\"stream_id\":$STREAM_ID,\"provider\":\"$PAYEE\",\"rate\":$RATE,\"allocation_lo\":$ALLOCATION,\"allocation_hi\":0}" | tail -1)
   echo "$line"
   journey_write_ok "Payment stream created (stream_id=$STREAM_ID, payee=$PAYEE)" "$line"
   echo "Submitted at chain height $h0"
   ```

   Wait until `last_block` is greater than `$h0`, then confirm the state change:

   ```bash
   sync_to_chain
   logoscore call payment_streams_module chainAction getStreamStatus \
     "{\"owner\":\"$PAYER\",\"vault_id\":$VAULT_ID,\"stream_id\":$STREAM_ID}"
   ```

   - Proceed only once the read shows the stream instead of `account data missing`. If the expected state has not appeared after about one minute (several blocks), the stream creation was likely dropped — re-run the write block.

1. Wait approximately 30 seconds for tokens to accrue, then check the stream status:

   ```bash
   sync_to_chain
   logoscore call payment_streams_module chainAction getStreamStatus \
     "{\"owner\":\"$PAYER\",\"vault_id\":$VAULT_ID,\"stream_id\":$STREAM_ID}"
   journey_ok "Accrual window elapsed; check accrued_lo in JSON above (need ≥ $MIN_ACCRUED before close)"
   ```

   - Proceed to Step 6 only once `accrued_lo` in the response is at least `MIN_ACCRUED` (default `1`). `accrued_lo` is the claimable allocation; `unaccrued_lo` is allocation not yet time-accrued. `stream_state` values: `0` Active, `1` Paused, `2` Closed.

## Step 6: Close the stream and claim

The payer closes the stream, then the payee claims the accrued tokens. Each write block captures `$h0` — wait for block inclusion before reading state.

1. Close the stream as the payer and confirm inclusion:

   ```bash
   h0=$(last_block)
   line=$(logoscore call payment_streams_module chainAction closeStream \
     "{\"signer\":\"$PAYER\",\"vault_id\":$VAULT_ID,\"stream_id\":$STREAM_ID}" | tail -1)
   echo "$line"
   journey_write_ok "Stream closed by payer (vault_id=$VAULT_ID stream_id=$STREAM_ID)" "$line"
   echo "Submitted at chain height $h0"
   ```

   Wait until `last_block` is greater than `$h0`, then confirm the state change:

   ```bash
   sync_to_chain
   logoscore call payment_streams_module chainAction getStreamStatus \
     "{\"owner\":\"$PAYER\",\"vault_id\":$VAULT_ID,\"stream_id\":$STREAM_ID}"
   ```

   - Proceed only once the read shows `stream_state` `2` (Closed). If the expected state has not appeared after about one minute (several blocks), the close was likely dropped — re-run the write block.

1. Claim the accrued tokens as the payee and confirm inclusion:

   ```bash
   h0=$(last_block)
   line=$(logoscore call payment_streams_module chainAction claim \
     "{\"owner\":\"$PAYER\",\"provider\":\"$PAYEE\",\"vault_id\":$VAULT_ID,\"stream_id\":$STREAM_ID}" | tail -1)
   echo "$line"
   journey_write_ok "Payee claimed accrued tokens" "$line"
   echo "Submitted at chain height $h0"
   ```

   Wait until `last_block` is greater than `$h0`, then confirm the payee balance has increased:

   ```bash
   sync_to_chain
   payee_bal=$(chain_balance "$PAYEE"); payee_bal=${payee_bal:-0}
   echo "Payee on-chain balance: $payee_bal"
   ```

   - Proceed only once the payee balance reflects the claimed payout. `claim` is signed by the payee. If the balance has not changed after about one minute (several blocks), the claim was likely dropped — re-run the write block.

## Step 7: Confirm and shut down

Confirm the final stream status and payee balance, then stop the daemon and exit the journey shell.

1. Confirm the final state:

   ```bash
   sync_to_chain
   logoscore call payment_streams_module chainAction getStreamStatus \
     "{\"owner\":\"$PAYER\",\"vault_id\":$VAULT_ID,\"stream_id\":$STREAM_ID}"
   payee_bal=$(chain_balance "$PAYEE"); payee_bal=${payee_bal:-0}
   echo "Payee on-chain balance: $payee_bal"
   journey_ok "Payment stream walkthrough complete (payee balance $payee_bal)"
   ```

   - After Step 6 (Close), `stream_state` is `2` (Closed). After the claim, the accrued tokens appear in the payee's on-chain balance.

1. Stop the daemon and exit the journey shell:

   ```bash
   logoscore call logos_execution_zone close 2>/dev/null || true
   logoscore stop
   journey_ok "logoscore stopped; exit the journey shell when ready"
   exit
   ```

   - `logoscore stop` stops the daemon started in Step 2. `exit` leaves the Nix journey shell. Wallet files remain under `$WALLET_HOME` unless you run `./scripts/user-journey-reset.sh` before the next walkthrough.

## Troubleshooting payment streams

### Why do `logoscore call` outputs include verbose `[logos_execution_zone]` lines?

The `logoscore()` shell wrapper from Step 1 is not active in this terminal. Re-run the session-variables block (Step 1) to restore the wrapper, or use `command logoscore -v …` to debug.

### Why does the daemon fail with `cannot open fixture manifest: fixtures/localnet.json`?

`FIXTURE_MANIFEST` is pointing at the localnet fixture instead of the testnet one. Run `export FIXTURE_MANIFEST="$REPO_ROOT/fixtures/testnet-module.json"` and re-run Step 2. The journey shell sets this automatically.

### Why does `load-module` fail with a module variant error?

The installed module variant does not match the running `logoscore`. Run `./scripts/user-journey-reset.sh`, re-enter the shell with `./scripts/user-journey-shell.sh`, then re-run `./scripts/user-journey-install-modules.sh` from Step 1.

### Why does a `logoscore call logos_execution_zone` method fail with an empty `$PAYER` or `$PAYEE`?

`logos_execution_zone` is not loaded in the daemon — only `capability_module` loads automatically. Run the second block of Step 2 (`load-module logos_execution_zone`, `load-module payment_streams_module`, open wallet), then re-run Step 3.

### Why does `getVaultStatus` or `getStreamStatus` return `account data missing` after a successful write?

The transaction has not been included in a block yet. Wait until `last_block` returns a height greater than the submission height `$h0` printed by the write block, then re-run the read. If the expected state has not appeared after about one minute (several blocks), the transaction was likely dropped by the sequencer — re-run the write block. If the state appears but is wrong, the transaction was included but reverted — stop and debug before continuing.

### Why does `initializeVault` fail for vault 0?

`$PAYER` was reused from an earlier run and vault 0 already exists. Run `export VAULT_ID=1` and retry Step 4, or run `./scripts/user-journey-reset.sh` to start fresh with new accounts in Step 3.

### Why does the pinata claim have no effect on the balance?

`LEE_WALLET_HOME_DIR` is not set to `$WALLET_HOME`, or the in-process wallet was not closed before the standalone `wallet` binary ran. Confirm `LEE_WALLET_HOME_DIR="$WALLET_HOME"` and re-run Step 3 with the `logoscore call logos_execution_zone close` line before the pinata loop.

### What are the key terms and JSON field names used in this procedure?

| Term | JSON / wire | Meaning |
|---|---|---|
| Payer | `signer` on writes; `owner` on reads and `claim` | Vault owner; closes the stream in this flow |
| Payee | `provider` on `createStream` and `claim` | Recipient; claims after close |
| Vault | `vault_id` | Holds deposits and allocations |
| Stream | `stream_id` | Pays payee at `rate` up to `allocation` |
| `*_lo` / `*_hi` | writes and `getStreamStatus` | 128-bit amount as two uint64s: `lo + (hi << 64)`. Values here fit in `*_lo` with `*_hi` = 0 |
| `accrued_*`, `unaccrued_*` | `getStreamStatus` | Claimable vs not-yet-time-accrued allocation |
| `stream_state` | 0 Active, 1 Paused, 2 Closed | |
| `MIN_ACCRUED` | (shell only) | Minimum `accrued_lo` before close; token units, not seconds |
| Authenticated transfer (AT) | `wallet auth-transfer init` / `register_public_account` | Lets public accounts spend tokens; required before deposit and stream writes |
