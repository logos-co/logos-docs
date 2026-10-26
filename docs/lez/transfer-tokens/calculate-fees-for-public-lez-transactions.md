---
title: Calculate the fees for public LEZ transactions
doc_type: procedure
product: lez
topics: [lez, fees, gas, wallet]
steps_layout: sectioned
authors: erhant, kashepavadan
owner: logos
doc_version: 1
slug: calculate-fees-for-public-lez-transactions
sidebar_position: 4
---

# Calculate the fees for public LEZ transactions

#### Send public transactions on a local LEZ sequencer and work out what each one reserved, paid, and got refunded.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

Every [public](../../get-started/glossary.md#public-account) transaction you submit to the [Logos Execution Zone](../../get-started/glossary.md#logos-execution-zone) (LEZ) carries a signed fee declaration. The sequencer rejects a transaction without one instead of running it for free. The declaration names a payer, which must be one of the transaction's signers, along with a gas limit, a tip, and a maximum fee. The LEZ wallet builds it for you on every public transaction.

The fee has two parts, each priced by its own per-block base fee: execution gas for the [program](../../get-started/glossary.md#program) cycles a transaction uses, and storage gas for its serialised size in bytes. The sequencer first holds a reserve from the payer that covers the whole gas limit. It then runs the transaction metered under that limit and refunds the part it didn't use:

```text
reserve = gas_limit × base_fee_exec + tx_bytes × base_fee_stor + tip
actual  = min(cycles, gas_limit) × base_fee_exec + tx_bytes × base_fee_stor + tip
refund  = reserve − actual
```

A transaction that reverts stays in the block and still pays: up to the point of the revert for a clean non-zero exit, or the full gas limit for a panic or out-of-gas.

This procedure runs a standalone sequencer on your machine, sends a native transfer and two [token program](../../get-started/glossary.md#token-program) calls, and derives each fee from the payer's balance. It's intended for wallet and app developers who need to size balances, choose gas limits, and explain charges to their users. The standalone sequencer mocks the Logos Blockchain layer and applies the same fee rules as the Testnet v0.3 zone.

:::info[Prerequisites]

- A supported OS:
   - Linux
   - macOS
- Build dependencies for the LEZ repository:
   - On Ubuntu or Debian:

     ```bash
     sudo apt install build-essential clang libclang-dev libssl-dev pkg-config libpcsclite-dev
     ```

   - On macOS:

     ```bash
     xcode-select --install
     brew install pkg-config openssl
     ```

- [Rust](https://www.rust-lang.org/tools/install), installed with `rustup`. The repository's `rust-toolchain.toml` selects Rust 1.98.1 for you.
- The Risc0 toolchain:

   ```bash
   curl -L https://risczero.com/install | bash
   rzup install
   ```

- [`just`](https://github.com/casey/just), `curl`, and `git`.
- About 30 minutes, most of it for the first release build.

:::

## What to expect

- You can work out the reserve, the charge, and the refund of a public transaction from its gas limit, its size, and the current base fees.
- You can tell a transaction that pays storage gas only from one that also pays execution gas.
- You can see a reverted transaction get charged without changing any state, and fix it by raising the gas limit.

## Step 1: Start a local sequencer

The standalone sequencer runs a local zone with no Logos Blockchain node and no Docker. Its debug genesis funds two test accounts, so you need no tokens.

1. Clone the LEZ repository and check out the `v0.3.0` release:

   ```bash
   git clone https://github.com/logos-blockchain/logos-execution-zone
   cd logos-execution-zone
   git checkout v0.3.0
   ```

   - Use `v0.3.0` even though the Testnet v0.3 zone runs `v0.3.1`. The fee rules are the same in both, but `v0.3.1` removed the wallet's `token` commands that Steps 5 to 7 use.

1. Start the sequencer. It stays in the foreground, serves RPC on port `3040`, and produces a block every 15 seconds:

   ```bash
   RISC0_DEV_MODE=1 just run-sequencer-standalone
   ```

   The first run builds the sequencer in release mode, which takes several minutes.

   **Expected result:** the log shows the RPC server starting, then a new block every 15 seconds:

   ```text
   INFO  sequencer_rpc_server_actor::actor] Starting RPC Server on 0.0.0.0:3040
   INFO  sequencer_core] Publishing block 2 on pin <msg-id>
   ```

   - `RISC0_DEV_MODE=1` skips proof generation and verification. Use it on a local chain only.

Run every command in the following steps in a second terminal, from the repository root.

## Step 2: Read the current base fees

1. Ask the sequencer for its fee state:

   ```bash
   curl -s -X POST http://127.0.0.1:3040 -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"getFeeState","params":[]}'
   ```

   **Expected result:**

   ```json
   {"jsonrpc":"2.0","id":1,"result":{"height":2,"base_fee_exec":8,"base_fee_stor":8,"next_base_fee_exec_floor":8,"next_base_fee_exec_ceiling":9,"next_base_fee_stor_floor":8,"next_base_fee_stor_ceiling":9,"max_gas_exec":10000000,"max_gas_stor":1000000}}
   ```

   | Field | Meaning |
   |:---|:---|
   | `height` | The block the quote applies to. |
   | `base_fee_exec` | Price of one cycle of execution gas. Starts at the minimum of `8`. |
   | `base_fee_stor` | Price of one byte of storage gas. Starts at the minimum of `8`. |
   | `next_base_fee_*_floor`, `next_base_fee_*_ceiling` | The range each base fee can move to in the next block. It moves by at most 12.5% per block, and by at least `1` when the previous block was above its target. |
   | `max_gas_exec` | Execution gas a block can hold, `10000000` cycles. A transaction's gas limit can't exceed it. |
   | `max_gas_stor` | Storage gas a block can hold, `1000000` bytes. |

   Each block targets half of its maximum. A busier block raises the base fee for the next one and a quieter block lowers it, never below `8`. On an idle local chain both stay at `8`, which keeps the arithmetic in the next steps exact.

## Step 3: Import the funded test accounts

1. Import the two accounts that the debug genesis funds:

   ```bash
   just wallet-import-test-accounts
   ```

   The first wallet command builds the wallet, asks you to set a password, and prints a recovery phrase for the new local wallet.

   **Expected result:** the command lists both accounts:

   ```text
   Public/2RHZhw9h534Zr3eq2RGhQete2Hh667foECzXPmSkGni2
   Public/CbgR6tj5kWx5oziiFptM7jMvrQeYY3Mzaao6ciuhSr2r
   ```

   `CbgR6tj5…` starts with a balance of `10000000000000` and `2RHZhw9h…` with `20000000000000`.

## Step 4: Calculate the fee of a native transfer

A native transfer meters no execution gas, so it pays storage gas only. The wallet still reserves the full gas limit up front.

1. Send 100 from `CbgR6tj5…` to `2RHZhw9h…`:

   ```bash
   just run-wallet auth-transfer send \
     --from Public/CbgR6tj5kWx5oziiFptM7jMvrQeYY3Mzaao6ciuhSr2r \
     --to Public/2RHZhw9h534Zr3eq2RGhQete2Hh667foECzXPmSkGni2 --amount 100
   ```

   **Expected result:** the wallet prints the transaction hash, the block that includes it, and the transaction data, which contains the fee declaration the wallet built:

   ```text
   Transaction is included in block 3
   ... fee: Some(FeeDeclaration { payer: CbgR6tj5kWx5oziiFptM7jMvrQeYY3Mzaao6ciuhSr2r, gas_limit: 2000000, tip: 0, max_fee: 134400000 }) ...
   ```

   | Field | Value the wallet sets |
   |:---|:---|
   | `payer` | The first funded signing account of the transaction, here the sender. |
   | `gas_limit` | The wallet's `gas_limit` setting, `2000000` by default. |
   | `tip` | Always `0`. |
   | `max_fee` | `(gas_limit + 100000) × 64`, which is `134400000` at the default gas limit. It caps the reserve, not the charge, and assumes a base fee of at most `64`. |

1. Read the sender's balance:

   ```bash
   just run-wallet account get --account-id Public/CbgR6tj5kWx5oziiFptM7jMvrQeYY3Mzaao6ciuhSr2r
   ```

   **Expected result:**

   ```text
   Balance 9999999996932, nonce 1
   ```

1. Work out the fee from the balance change. The wallet and the sequencer don't report it anywhere else:

   ```text
   fee     = 10000000000000 − 100 − 9999999996932 = 2968
           = 371 tx bytes × 8
   reserve = 2000000 × 8 + 371 × 8 = 16002968
   refund  = 16002968 − 2968      = 16000000
   ```

   The sender paid only for the 371 bytes of the transaction, but needed to hold over 16 million for the reserve.

## Step 5: Calculate the fee of a program call

A token program call runs guest code, so it pays execution gas for its cycles on top of storage gas. The payer must hold the reserve, and a new account holds nothing, so fund it first.

1. Create the token definition and supply accounts:

   ```bash
   just run-wallet account new public --label tokdef
   just run-wallet account new public --label toksupply
   ```

1. Fund the definition account, which pays for creating the token:

   ```bash
   just run-wallet auth-transfer send \
     --from Public/CbgR6tj5kWx5oziiFptM7jMvrQeYY3Mzaao6ciuhSr2r \
     --to tokdef --amount 100000000
   ```

1. Create a token with a supply of 1000:

   ```bash
   just run-wallet token new --definition-account-id tokdef \
     --supply-account-id toksupply --name DOC --total-supply 1000
   ```

1. Read the definition account's balance:

   ```bash
   just run-wallet account get --account-id tokdef
   ```

   **Expected result:**

   ```text
   Balance 99746000, nonce 1
   ```

   The fee is `100000000 − 99746000 = 254000`, which is `31750` gas at a base fee of `8`. That gas is the cycles the token program ran plus the transaction's bytes.

## Step 6: Watch a reverted transaction get charged

A transaction that runs out of gas reverts but stays in the block. The payer is charged the full gas limit plus storage, and the payer's nonce advances. No other state changes.

1. Fund the supply account, which pays for the token transfers in this step and the next:

   ```bash
   just run-wallet auth-transfer send \
     --from Public/CbgR6tj5kWx5oziiFptM7jMvrQeYY3Mzaao6ciuhSr2r \
     --to toksupply --amount 50000000
   ```

1. Create an account to receive the token:

   ```bash
   just run-wallet account new public --label holder
   ```

1. Lower the wallet's gas limit far below what a token transfer needs:

   ```bash
   just run-wallet config set gas_limit 1000
   ```

1. Send one token to the new account:

   ```bash
   just run-wallet token send --from toksupply --to holder --amount 1
   ```

   **Expected result:** the wallet prints `Transaction is included in block <n>`, even though the transfer reverted. The wallet doesn't report reverts.

1. Read the supply account, including its token holding:

   ```bash
   just run-wallet account get --scope all --account-id toksupply
   ```

   **Expected result:**

   ```text
   Balance 49988768, nonce 2
   Token program holding record
   {"Fungible":{"definition_id":"<tokdef-id>","balance":1000}}
   ```

   The token balance is still `1000`, so nothing moved, but the account paid `50000000 − 49988768 = 11232`. That's `(1000 gas limit + 404 tx bytes) × 8`, and the nonce went from `1` to `2`.

## Step 7: Retry with the default gas limit

1. Restore the default gas limit:

   ```bash
   just run-wallet config set gas_limit 2000000
   ```

1. Send the token again:

   ```bash
   just run-wallet token send --from toksupply --to holder --amount 1
   ```

1. Read the supply account:

   ```bash
   just run-wallet account get --scope all --account-id toksupply
   ```

   **Expected result:**

   ```text
   Balance 49708872, nonce 3
   Token program holding record
   {"Fungible":{"definition_id":"<tokdef-id>","balance":999}}
   ```

   The transfer succeeded and cost `49988768 − 49708872 = 279896`, which is `(34583 cycles + 404 tx bytes) × 8`. It used only part of its 2,000,000 gas limit, and the wallet refunded the rest.

1. Check the total that the genesis account paid across this procedure:

   ```bash
   just run-wallet account get --account-id Public/CbgR6tj5kWx5oziiFptM7jMvrQeYY3Mzaao6ciuhSr2r
   ```

   **Expected result:**

   ```text
   Balance 9999849990996, nonce 3
   ```

   The account sent `100`, `100000000`, and `50000000`, and paid `2968` in fees for each of the three native transfers.

:::warning
The imported private keys are public test keys from the debug configuration, so never use them outside a local chain. The sequencer's RPC has no authentication and listens on all interfaces. On a shared network, start it with `RISC0_DEV_MODE=1 just run-sequencer-standalone --listen-address 127.0.0.1`.
:::

## Troubleshooting

### Step 1 panics with `Failed to execute genesis transaction: ProgramExecutionFailed("No such file or directory (os error 2)")`

`r0vm`, the Risc0 zkVM the guest programs run in, is not installed or not on `PATH`. The build succeeds without it and only the genesis execution fails, so this appears after the full release build. Run `r0vm --version` - it should report `risc0-r0vm 3.0.5`, matching the `risc0-zkvm` version the repository pins. If the command is missing, run `rzup install` again and make sure `~/.risc0/bin` is on your `PATH`.

### The wallet prints `Incorrect fee`

The sequencer refused the transaction at admission, and the payer's nonce didn't advance. The error gives no further detail. The usual causes are:

- The payer's balance is below the reserve. At the default gas limit and base fees the reserve is about 16,003,000, even for a transfer whose fee is 2,968. Fund the payer above the reserve, or lower the gas limit with `just run-wallet config set gas_limit <n>`.
- The gas limit is above `10000000`, the most execution gas a block can hold. Lower it.
- `max_fee` is below the reserve, which happens when base fees climb above `64`. The wallet doesn't let you set `max_fee` yet.

A different error, `Can not pay for operation`, comes from the wallet's own check that the sender holds less than the amount it's sending.

### A transaction is included but nothing changed

The wallet printed `Transaction is included in block <n>`, the payer's balance dropped and its nonce advanced, but the expected state change is missing. The transaction reverted, most often because its gas limit was too low. Raise the limit with `just run-wallet config set gas_limit <n>` and send the transaction again.

### Token balances are missing from `account get`

`account get` shows only the native `Balance` and `nonce` by default. Add `--scope all` to include program state such as token holdings.

### Known constraints

- Private transactions don't pay fees yet.
- The wallet always sets `tip` to `0` and derives `max_fee` from the gas limit. Neither is settable from the CLI yet.
- There is no gas estimation or dry run. Pick a gas limit from experience, or start at the default and lower it.
- Neither the wallet nor the indexer reports the fee a transaction paid. Explorers show only the declared values. Derive the fee from the payer's balance change, as this procedure does.
- Native transfers and program deployment pay storage gas only.
