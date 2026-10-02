---
title: Trade tokens on the LEZ AMM program
doc_type: procedure
product: blockchain
topics: [AMM, LEZ, SPEL]
steps_layout: sectioned
authors: 0x-r4bbit, kashepavadan
owner: logos
doc_version: 2
slug: trade-tokens-on-lez-amm-program
sidebar_position: 2
---

# Trade tokens on the LEZ AMM program

#### Use the SPEL CLI and the already-deployed testnet programs to create a pool, swap tokens, and publish a TWAP price on LEZ testnet v0.2.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

This procedure explains how developers and node operators drive the automated market maker (AMM) [program](../../get-started/glossary.md#program) on the [Logos Execution Zone](../../get-started/glossary.md#logos-execution-zone) ([LEZ](../../get-started/glossary.md#lez)), from creating your own token definitions through creating a pool, swapping tokens, and publishing a TWAP oracle price, all using the [SPEL CLI](https://github.com/logos-co/spel) against the AMM, TWAP oracle, and [token programs](../../get-started/glossary.md#token-program) already deployed on testnet. The AMM is one of the essential launch-day applications for Logos, since it enables on-chain trading and supplies the price data that on-chain oracles rely on. Follow this procedure on LEZ testnet v0.2 whenever you need to stand up a pool from scratch, execute a swap, or publish a fresh price to the TWAP oracle.

:::info[Prerequisites]

- An [LEZ CLI wallet](../get-started/run-lez-wallet-via-cli.md) set up and funded.
- A Rust toolchain with `cargo`, to run the PDA-derivation helpers in [Step 5](#step-5-derive-the-amm-pdas).
:::

## What to expect

- You can create your own token definitions and a liquidity pool using the AMM program already deployed on LEZ testnet.
- You can swap between two tokens using the SPEL CLI and verify the pool's reserves change.
- You can publish a TWAP price that on-chain oracles can consume.

## Step 1: Install `spel`

`spel` is a developer CLI tool used to help build and drive programs that run on the LEZ.

1. Install `spel`.

   ```bash
   git clone https://github.com/logos-co/spel.git
   cd spel
   cargo install --path spel-cli  # installs as "spel"
   ```

## Step 2: Prepare your wallet

This task uses the [LEZ Wallet CLI](https://github.com/logos-blockchain/logos-execution-zone/tree/main/lez/wallet) to point your tooling at the [LEZ Sequencer](https://github.com/logos-blockchain/logos-execution-zone/tree/main/lez/sequencer/service) and to create the [accounts](../../get-started/glossary.md#account) the rest of this procedure reuses.

1. Export your wallet home directory in every shell you use.

   ```bash
   export LEE_WALLET_HOME_DIR="$HOME/.lee/wallet"
   ```

1. Set your wallet's sequencer address to the testnet endpoint.

   ```bash
   wallet change-network testnet
   ```

## Step 3: Get the `lez-programs` artifacts

The AMM, TWAP oracle, and token programs are already deployed on testnet, so you don't need to build or deploy anything yourself. You still need two things from the [`lez-programs`](https://github.com/logos-blockchain/lez-programs) repository: the committed IDL files that `spel` needs to encode instructions, and the PDA-derivation helper used in [Step 5](#step-5-derive-the-amm-pdas).

1. Clone the repository.

   ```bash
   git clone https://github.com/logos-blockchain/lez-programs.git
   cd lez-programs
   ```

   - The IDLs you'll pass to `--idl` below (`artifacts/amm-idl.json`, `artifacts/token-idl.json`, `artifacts/twap_oracle-idl.json`) are already committed under `artifacts/`.

1. Look up the current testnet ProgramIds in [DEPLOYMENTS.md](https://github.com/logos-blockchain/lez-programs/blob/main/DEPLOYMENTS.md) and note the `token`, `amm`, and `twap_oracle` values—you'll pass these as `--program` throughout this procedure, in place of `<TOKEN_PROGRAM_ID>`, `<AMM_PROGRAM_ID>`, and `<TWAP_PROGRAM_ID>`.

   :::warning
   If the testnet deployment is ever redeployed, every ProgramId in DEPLOYMENTS.md changes, and every PDA derived from those ProgramIds changes with it (config, pool, vaults, LP definition, LP lock, current tick). Always re-derive PDAs from the ProgramIds you're currently using rather than reusing old values.
   :::

## Step 4: Create two token definitions

Use `spel` to create the two fungible tokens your pool will hold.

1. Create two public LEZ accounts for each token, as well as an additional account to hold liquidity provider (LP) tokens, using `wallet`.

   ```bash
   wallet account new public --label "Token A Definition"
   wallet account new public --label "Token A Holding"

   wallet account new public --label "Token B Definition"
   wallet account new public --label "Token B Holding"

   wallet account new public --label "User Holding LP"
   ```

1. Record the generated account IDs.

   ```bash
   wallet account list
   ```

   - Use the listed ids instead of the `<DEF_*>`, `<HOLDING_*>`, and `<USER_HOLDING_LP>` placeholders in later steps.

1. Create both tokens' definition and holding accounts.

   ```bash
   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- new-fungible-definition \
        --name "TOKEN A" --total-supply 1000000000000000000000 \
        --definition-target-account <DEF_A> \
        --holding-target-account <HOLDING_A> \
        --mint-authority none

   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- new-fungible-definition \
        --name "TOKEN B" --total-supply 1000000000000000000000 \
        --definition-target-account <DEF_B> \
        --holding-target-account <HOLDING_B> \
        --mint-authority none
   ```

   - `<DEF_A>` and `<DEF_B>` become the [token-definition accounts](../../get-started/glossary.md#token-definition-account); `<HOLDING_A>` and `<HOLDING_B>` receive the total supply of each token.
   - `--mint-authority none` gives each token a fixed supply. Pass an account id instead if you want to be able to mint more of a token later—see [Create and transfer custom tokens on the Logos Execution Zone](../transfer-tokens/create-and-transfer-custom-tokens-on-the-logos-execution-zone.md#step-2-create-a-fungible-token).

1. Inspect a holding or definition to confirm it was created correctly.

   ```bash
   spel --idl artifacts/token-idl.json inspect <HOLDING_A> --type TokenHolding
   spel --idl artifacts/token-idl.json inspect <DEF_A>     --type TokenDefinition
   ```

## Step 5: Derive the AMM PDAs

AMM PDAs use a SHA-256 seed scheme, so derive them with the program's own `*_pdas` helper rather than `spel pda`, which pads raw bytes and returns the wrong address for this program.

1. Derive the AMM config PDA with the full set of pool PDAs, using the ProgramIds from [Step 3](#step-3-get-the-lez-programs-artifacts).

   ```bash
   # config + all pool PDAs:
   cargo run -q -p amm_program --example amm_pdas -- \
     "<AMM_PROGRAM_ID>" "<TWAP_PROGRAM_ID>" "<DEF_A>" "<DEF_B>"
   ```

   - This command prints the `<CONFIG_PDA>`, `<POOL_PDA>`, `<VAULT_A_PDA>`, `<VAULT_B_PDA>`, `<POOL_DEFINITION_LP_PDA>`, `<LP_LOCK_HOLDING_PDA>`, and `<CURRENT_TICK_PDA>`.
   - [DEPLOYMENTS.md](https://github.com/logos-blockchain/lez-programs/blob/main/DEPLOYMENTS.md) lists the equivalent PDAs already derived for the live testnet TKA/TKB pool—useful as a worked example to sanity-check the shape of this command's output, but not reusable here, since your `<DEF_A>`/`<DEF_B>` are different token definitions.

1. Select any of your accounts to be `<AUTHORITY>`—the admin who can later call `update_config` or withdraw protocol fees ([Step 14](#step-14-admin-withdraw-protocol-fees)).

## Step 6: Initialise the AMM

Pick an `<OWNER>` account you control that **signs** `initialize`—its id and the `<NONCE>` together form the instance namespace, and `[0;32]` (64 zero hex characters) is the default instance. Choose the instance-wide `<SWAP_FEE_BPS>` (basis points, any value below `10000` = 100%; for example `1`) and `<PROTOCOL_FEE_BPS>` (the fraction *of that swap fee* diverted to the protocol, in bps of the swap fee; `0` = none, up to `10000` = 100% of the swap fee). Both fees are set **once here** and apply to every pool in the namespace—they are not set per-pool.

1. Initialise the AMM using the config PDA from [Step 5](#step-5-derive-the-amm-pdas) and the token/TWAP ProgramIds from [Step 3](#step-3-get-the-lez-programs-artifacts).

   ```bash
   spel --idl artifacts/amm-idl.json \
        --program <AMM_PROGRAM_ID> \
        -- initialize \
        --owner <OWNER> \
        --config <CONFIG_PDA> \
        --nonce 0000000000000000000000000000000000000000000000000000000000000000 \
        --token-program-id <TOKEN_PROGRAM_ID> \
        --twap-oracle-program-id <TWAP_PROGRAM_ID> \
        --authority <AUTHORITY> \
        --swap-fee-bps <SWAP_FEE_BPS> \
        --protocol-fee-bps <PROTOCOL_FEE_BPS>
   ```

   - `owner` signs and is claimed by the AMM on first use, so use a fresh, dedicated account. `config` is `init` but **not** a signer—the guest claims it as a PDA.
   - Run this once per `(owner, nonce)` instance. Add `--dry-run` to preview first.

## Step 7: Create a pool

Create a pool from your two token definitions.

1. Provide three holding accounts you own. These include your token A and B holding accounts, which must hold at least the `<AMOUNT_A>` and `<AMOUNT_B>` deposit amounts, as well as the `<USER_HOLDING_LP>` account to receive the LP tokens.

1. Create the pool with `new-definition`.

   ```bash
   spel --idl artifacts/amm-idl.json \
        --program <AMM_PROGRAM_ID> \
        -- new-definition \
        --config <CONFIG_PDA> \
        --pool <POOL_PDA> \
        --vault-a <VAULT_A_PDA> \
        --vault-b <VAULT_B_PDA> \
        --pool-definition-lp <POOL_DEFINITION_LP_PDA> \
        --lp-lock-holding <LP_LOCK_HOLDING_PDA> \
        --user-holding-a <USER_HOLDING_A> \
        --user-holding-b <USER_HOLDING_B> \
        --user-holding-lp <USER_HOLDING_LP> \
        --current-tick-account <CURRENT_TICK_PDA> \
        --clock 4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU \
        --token-a-amount <AMOUNT_A> \
        --token-b-amount <AMOUNT_B> \
        --deadline 18446744073709551615
   ```

   - Deposit amounts must satisfy `isqrt(token_a_amount * token_b_amount) > 1000`; `deadline` is a future millisecond timestamp (or `18446744073709551615` to ignore it). There's no `--fees` argument—the swap fee is instance-wide, set in [Step 6](#step-6-initialise-the-amm).
   - The clock account never changes, and is always `4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU`.
   - `spel` signs `user-holding-a`, `user-holding-b`, and `user-holding-lp`—your wallet must hold all three keys.

## Step 8: Verify the pool

1. Verify the pool's reserves and fee tier.

   ```bash
   spel --idl artifacts/amm-idl.json inspect <POOL_PDA> --type PoolDefinition
   ```

   - Check `reserve_a`/`reserve_b` and `liquidity_pool_supply`.

## Step 9: Create a TWAP price-observations account

Derive and create a TWAP `price-observations` account for a time window before your first swap.

1. Derive the observations PDA.

   ```bash
   cargo run -q -p twap_oracle_program --example twap_oracle_pdas -- \
     "<TWAP_PROGRAM_ID>" <POOL_PDA> <WINDOW_DURATION>
   # prints current_tick_account, price_observations, oracle_price_account
   ```

   - `window_duration` is in milliseconds (24 h = `86400000`); each window gets its own account.

1. Create the observations account.

   ```bash
   spel --idl artifacts/amm-idl.json \
        --program <AMM_PROGRAM_ID> \
        -- create-price-observations \
        --config <CONFIG_PDA> \
        --pool <POOL_PDA> \
        --current-tick-account <CURRENT_TICK_PDA> \
        --price-observations <PRICE_OBSERVATIONS_PDA> \
        --clock 4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU \
        --window-duration <WINDOW_DURATION>
   ```

   - This instruction is permissionless—no signers needed.

   :::info
   To verify, run the following:
   ```bash
   spel --idl artifacts/twap_oracle-idl.json inspect <PRICE_OBSERVATIONS_PDA> --type PriceObservations
   ```
   :::

## Step 10: Swap tokens

Initiate a swap between your two tokens with `swap-exact-input`. `--token-definition-id-in` picks the direction—pass the definition id of the token you're spending.

1. Execute a swap.

   ```bash
   spel --idl artifacts/amm-idl.json \
        --program <AMM_PROGRAM_ID> \
        -- swap-exact-input \
        --config <CONFIG_PDA> \
        --pool <POOL_PDA> \
        --vault-a <VAULT_A_PDA> \
        --vault-b <VAULT_B_PDA> \
        --user-holding-a <USER_HOLDING_A> \
        --user-holding-b <USER_HOLDING_B> \
        --current-tick-account <CURRENT_TICK_PDA> \
        --clock 4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU \
        --protocol-fee-holding <PROTOCOL_FEE_PDA_FOR_INPUT_TOKEN> \
        --swap-amount-in <AMOUNT_IN> \
        --min-amount-out <MIN_OUT> \
        --token-definition-id-in <DEF_OF_INPUT_TOKEN> \
        --deadline 18446744073709551615
   ```

   - `--token-definition-id-in`: `<DEF_A>` ⇒ A→B; `<DEF_B>` ⇒ B→A.
   - `--protocol-fee-holding`: the protocol-fee PDA **for the input token**: `protocol_fee_a` when spending A, `protocol_fee_b` when spending B (from [Step 5](#step-5-derive-the-amm-pdas)'s output). The swap diverts `protocol_fee_bps` of the fee here, creating the account on first use; pass it even when the instance's protocol fee is `0`.
   - `--swap-amount-in` must be ≤ the input holding's balance; `--min-amount-out` is the slippage floor (`1` accepts any nonzero output).
   - `spel` signs **both** `user-holding-a` and `user-holding-b`—the input side is dynamic, so both are marked as signers even though only the input side is debited. `swap-exact-output` uses the same account set with `--exact-amount-out`/`--max-amount-in` instead.

   :::info
   To verify, run the following:
   ```bash
   spel --idl artifacts/amm-idl.json inspect <POOL_PDA> --type PoolDefinition
   ```
   :::

## Step 11: Record a price tick

Record the fresh tick from [Step 10](#step-10-swap-tokens)'s swap into the `price-observations` account.

1. Run this after a swap, so `current_tick_account` holds a fresh tick.

   ```bash
   spel --idl artifacts/twap_oracle-idl.json \
        --program <TWAP_PROGRAM_ID> \
        -- record-tick \
        --price-observations <PRICE_OBSERVATIONS_PDA> \
        --current-tick-account <CURRENT_TICK_PDA> \
        --clock 4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU \
        --price-source-id <POOL_PDA> \
        --window-duration <WINDOW_DURATION>
   ```

   - `--window-duration` must match the value used when you created the observations account in [Step 9](#step-9-create-a-twap-price-observations-account).

   :::info
   To verify the update, run the following:
   ```bash
   spel --idl artifacts/twap_oracle-idl.json inspect <PRICE_OBSERVATIONS_PDA> --type PriceObservations
   ```
   :::

## Step 12: Create the oracle price account

Create the oracle's price account once per pool, before you can publish to it.

1. Derive and create the oracle price account.

   ```bash
   cargo run -q -p twap_oracle_program --example twap_oracle_pdas -- \
     "<TWAP_PROGRAM_ID>" <POOL_PDA> <WINDOW_DURATION>

   spel --idl artifacts/amm-idl.json \
        --program <AMM_PROGRAM_ID> \
        -- create-oracle-price-account \
        --config <CONFIG_PDA> \
        --pool <POOL_PDA> \
        --oracle-price-account <ORACLE_PRICE_ACCOUNT_PDA> \
        --clock 4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU \
        --window-duration <WINDOW_DURATION>
   ```

   - Permissionless, and `init`, so run it once per `(pool, window)`.

## Step 13: Publish an oracle price

Compute the TWAP from the observations ring buffer and publish it. This needs at least two recorded observations—the first is seeded on creation ([Step 9](#step-9-create-a-twap-price-observations-account)), the second comes from the recorded tick ([Step 11](#step-11-record-a-price-tick)); with fewer than two, `publish-price` is a silent no-op.

1. Publish the price.

   ```bash
   spel --idl artifacts/twap_oracle-idl.json \
        --program <TWAP_PROGRAM_ID> \
        -- publish-price \
        --price-observations <PRICE_OBSERVATIONS_PDA> \
        --oracle-price-account <ORACLE_PRICE_ACCOUNT_PDA> \
        --current-tick-account <CURRENT_TICK_PDA> \
        --clock 4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU \
        --price-source-id <POOL_PDA> \
        --window-duration <WINDOW_DURATION>
   ```

   - Re-run any time to refresh the published TWAP.

1. Verify the published price and timestamp.

   ```bash
   spel --idl artifacts/twap_oracle-idl.json inspect <ORACLE_PRICE_ACCOUNT_PDA> --type OraclePriceAccount
   ```

## Step 14: (Admin) Withdraw protocol fees

If the instance was initialised with `--protocol-fee-bps > 0` ([Step 6](#step-6-initialise-the-amm)), each swap diverts that fraction of the swap fee (in the input token) into the per-`(config, token)` protocol-fee PDA (`protocol_fee_a`/`protocol_fee_b` from [Step 5](#step-5-derive-the-amm-pdas)). Only the config's `authority`, set at initialisation, can move them out.

1. Inspect the accrued balance first—it's an ordinary token holding.

   ```bash
   spel --idl artifacts/token-idl.json inspect <PROTOCOL_FEE_PDA> --type TokenHolding
   ```

1. Withdraw `<AMOUNT>` (raw base units) of that token to `<DESTINATION>`, an already-initialised holding of the same token—see [Give someone a holding](../transfer-tokens/create-and-transfer-custom-tokens-on-the-logos-execution-zone.md#step-3-give-someone-a-holding) if you need to initialise one first.

   ```bash
   spel --idl artifacts/amm-idl.json \
        --program <AMM_PROGRAM_ID> \
        -- withdraw-protocol-fees \
        --config <CONFIG_PDA> \
        --protocol-fee-holding <PROTOCOL_FEE_PDA> \
        --destination <DESTINATION> \
        --authority <AUTHORITY> \
        --amount <AMOUNT>
   ```

   - `authority` signs and must equal the config's stored `authority`.
   - `protocol-fee-holding` selects the token via its own definition, so one call drains one token—repeat per token.

## Troubleshooting AMM program deployment

### PDAs stop matching a fresh derivation

Every PDA is a function of the ProgramIds and definitions you derive it from. If the testnet deployment is redeployed, its ProgramIds in [DEPLOYMENTS.md](https://github.com/logos-blockchain/lez-programs/blob/main/DEPLOYMENTS.md) change, and every PDA derived from them changes too (config, pool, vaults, LP definition, LP lock, current tick). Always re-derive PDAs from the ProgramIds and definitions you're currently using rather than reusing old values.

### `spel` rejects an `account_id` argument

`account_id` arguments must be passed as bare base58 or `0x`-prefixed hex. Strip the wallet's `account_id(...)` display wrapper before passing an id to `spel`.

### `spel pda` returns the wrong address

`spel pda` pads raw bytes, but the AMM's `*_core` crates derive PDAs with a SHA-256 seed scheme. Always use the committed `examples/*_pdas` helper for the relevant program instead of `spel pda`.

### `new-definition` fails on `user_holding_lp`'s signature

`user_holding_lp` must be a signer for `new-definition`, so it needs to be a fresh keypair account you hold. For `add_liquidity`, an existing holding works without a signature, since the LP definition already exists at that point.

### A swap fails because a holding isn't signed

`swap-exact-input` and `swap-exact-output` mark both `user-holding-a` and `user-holding-b` as signers, even though only the input side is debited—the input side is chosen at runtime, so both must be signed.

### `spel` and `wallet` point at different networks

Deploying and running spel from different shells with different `LEE_WALLET_HOME_DIR` values points them at different networks and keys. Export the same value in every shell you use for this procedure.
