---
title: Trade tokens on the LEZ AMM program
doc_type: procedure
product: blockchain
topics: [AMM, LEZ, SPEL]
steps_layout: sectioned
authors: 0x-r4bbit, kashepavadan
owner: logos
doc_version: 1
slug: trade-tokens-on-lez-amm-program
sidebar_position: 2
---

# Trade tokens on the LEZ AMM program

#### Use the SPEL CLI to deploy an AMM, create a pool, swap tokens, and publish a TWAP price on LEZ testnet v0.2.

This procedure explains how developers and node operators deploy and drive the automated market maker (AMM) program on the Logos Execution Zone (LEZ), from building the on-chain programs through swapping tokens and publishing a TWAP oracle price, all using the [SPEL CLI](https://github.com/logos-co/spel). The AMM is one of the essential launch-day applications for Logos, since it enables on-chain trading and supplies the price data that on-chain oracles rely on. Follow this procedure on LEZ testnet v0.2 whenever you need to stand up a pool from scratch, execute a swap, or publish a fresh price to the TWAP oracle.

**Before you start**, make sure you have the following:

- Docker
- [A funded LEZ wallet](../get-started/lez-quickstart)
- [RISC0 installed](https://dev.risczero.com/api/zkvm/install)

## What to expect

- You can build, deploy, and initialize the AMM, TWAP oracle, and token programs on LEZ testnet.
- You can create a liquidity pool and swap between two tokens using the SPEL CLI.
- You can publish a TWAP price that on-chain oracles can consume.

## Step 1: Install `spel`

`spel` is a developer CLI tool used to help build programs that run on the LEZ.

1. Install `spel`.

   ```bash
   git clone https://github.com/logos-co/spel.git
   cd spel
   cargo install --path spel-cli  # installs as "spel"
   ```

## Step 2: Prepare your wallet

This task uses the [LEZ Wallet CLI](https://github.com/logos-blockchain/logos-execution-zone/tree/main/lez/wallet) to point your tooling at the [LEZ Sequencer](https://github.com/logos-blockchain/logos-execution-zone/tree/main/lez/sequencer/service) and to create the accounts the rest of this procedure reuses.

1. Export your wallet home directory in every shell you use.

   ```bash
   export LEE_WALLET_HOME_DIR="$HOME/.lee/wallet"
   ```

1. Set your wallet's sequencer address to the testnet endpoint.

   ```bash
   wallet config set sequencer_addr https://testnet.lez.logos.co/
   ```

## Step 3: Build and deploy the AMM programs

Build and deploy the `token`, `twap_oracle`, and `amm` programs from the [lez-programs](https://github.com/logos-blockchain/lez-programs/tree/main) repository, then record each program's ProgramId; you need all three before you can initialize the AMM.

:::warning
Recompiling a guest changes its ProgramId, and every PDA derived from that ProgramId changes too. If you rebuild the AMM, recompute all AMM PDAs and rerun `initialize` — never reuse old values.
:::

1. Clone the lez-programs repository and navigate to it.

   ```bash
   git clone https://github.com/logos-blockchain/lez-programs.git
   cd lez-programs
   ```

1. Build and deploy each program (order doesn't matter for deploy).

   ```bash
   cargo risczero build --manifest-path programs/token/methods/guest/Cargo.toml
   cargo risczero build --manifest-path programs/twap_oracle/methods/guest/Cargo.toml
   cargo risczero build --manifest-path programs/amm/methods/guest/Cargo.toml

   wallet deploy-program programs/token/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/token.bin
   wallet deploy-program programs/twap_oracle/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/twap_oracle.bin
   wallet deploy-program programs/amm/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/amm.bin
   ```

1. Record each program's ProgramId.

   ```bash
   spel -- program-id programs/token/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/token.bin
   spel -- program-id programs/twap_oracle/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/twap_oracle.bin
   spel -- program-id programs/amm/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/amm.bin
   ```

   - `spel program-id` prints both the decimal limbs and the 64-char ImageID hex; both forms work with `spel` and the `*_pdas` helpers.

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

1. Record the generated account IDs:

   ```bash
   wallet account list
   ```

   - Use the listed ids instead of the `<DEF_*>`, `<HOLDING_*>`, and `<USER_HOLDING_LP>` placeholders in later steps.

1. Create both tokens' definition and holding accounts.

   ```bash
   spel --idl artifacts/token-idl.json \
        --program programs/token/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/token.bin \
        -- new-fungible-definition \
        --name "TOKEN A" --total-supply 1000000000000000000000 \
        --definition-target-account <DEF_A> \
        --holding-target-account <HOLDING_A>


   spel --idl artifacts/token-idl.json \
        --program programs/token/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/token.bin \
        -- new-fungible-definition \
        --name "TOKEN B" --total-supply 1000000000000000000000 \
        --definition-target-account <DEF_B> \
        --holding-target-account <HOLDING_B>
   ```

   - `<DEF_A>` and `<DEF_B>` become the token-definition accounts; `<HOLDING_A>` and `<HOLDING_B>` receive the total supply of each token.

1. Inspect a holding or definition to confirm it was created correctly.

   ```bash
   spel --idl artifacts/token-idl.json -- inspect <HOLDING_A> --type TokenHolding
   spel --idl artifacts/token-idl.json -- inspect <DEF_A>     --type TokenDefinition
   ```

## Step 5: Derive PDAs and initialise the AMM

AMM PDAs use a SHA-256 seed scheme, so derive them with the program's own `*_pdas` helper rather than `spel pda`.

1. Derive the AMM config PDA with the full set of pool PDAs. Use the ProgramIDs derived in [Step 3](#step-3-build-and-deploy-the-amm-programs).

   ```bash
   # config + all pool PDAs:
   cargo run -q -p amm_program --example amm_pdas -- \
     "<AMM_PROGRAM_ID>" "<TWAP_PROGRAM_ID>" "<DEF_A>" "<DEF_B>"
   ```

   - This command prints the `<CONFIG_PDA>`, `<POOL_PDA>`, `<VAULT_A_PDA>`, `<VAULT_B_PDA>`, `<POOL_DEFINITION_LP_PDA>`, `<LP_LOCK_HOLDING_PDA>`, and `<CURRENT_TICK_PDA>`.

1. Select any of your accounts to be `<AUTHORITY>` — the admin who can later call `update_config`.

1. Initialise the AMM using the config PDA and the token/TWAP ProgramIds from [Step 3](#step-3-build-and-deploy-the-amm-programs).

   ```bash
   spel --idl artifacts/amm-idl.json \
        --program programs/amm/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/amm.bin \
        -- initialize \
        --config <CONFIG_PDA> \
        --token-program-id <TOKEN_PROGRAM_ID> \
        --twap-oracle-program-id <TWAP_PROGRAM_ID> \
        --authority <AUTHORITY>
   ```

   - Run this once per deployment; add `--dry-run` to preview first.

## Step 6: Create a pool and verify it

Create a pool from your two token definitions, then confirm its reserves and fee tier.

1. Provide three holding accounts you own. These include your token A and B holding accounts, which must hold at least the `<AMOUNT_A>` and `<AMOUNT_B>` deposit amounts, as well as the `<USER_HOLDING_LP>` account to receive the LP tokens.

1. Create the pool with `new-definition`.

   ```bash
   spel --idl artifacts/amm-idl.json \
        --program programs/amm/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/amm.bin \
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
        --fees 1 \
        --deadline 18446744073709551615
   ```

   - Deposit amounts must satisfy `isqrt(token_a_amount * token_b_amount) > 1000`; `fees` must be `1`, `5`, `30`, or `100` bps; `deadline` is a future millisecond timestamp (or `18446744073709551615` to ignore it).
   - The clock account never changes, and is always `4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU`.

1. Verify the pool's reserves and fee tier.

   ```bash
   spel --idl artifacts/amm-idl.json -- inspect <POOL_PDA> --type PoolDefinition
   ```

   - Check `reserve_a`/`reserve_b`, `liquidity_pool_supply`, and `fees`.

## Step 7: Swap tokens and record a price tick

Initiate a swap between your two tokens, then feed the resulting price tick into the TWAP oracle so it can be published later.

1. Derive and create a TWAP `price-observations` account for a time window before your first swap.

   ```bash
   cargo run -q -p twap_oracle_program --example twap_oracle_pdas -- \
     "<TWAP_PROGRAM_ID>" <POOL_PDA> <WINDOW_DURATION>
   # prints current_tick_account, price_observations, oracle_price_account
   ```

   - This will print `<CURRENT_TICK_PDA>`, `<PRICE_OBSERVATIONS_PDA>`, and `<ORACLE_PRICE_ACCOUNT_PDA>`.

   ```bash
   spel --idl artifacts/amm-idl.json \
        --program programs/amm/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/amm.bin \
        -- create-price-observations \
        --config <CONFIG_PDA> \
        --pool <POOL_PDA> \
        --current-tick-account <CURRENT_TICK_PDA> \
        --price-observations <PRICE_OBSERVATIONS_PDA> \
        --clock 4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU \
        --window-duration <WINDOW_DURATION>
   ```

   - This instruction is permissionless — no signers needed.
   - `window_duration` is in milliseconds (24h = `86400000`); each window gets its own account.

   :::info
   To verify, run the following:
   ```bash
   spel --idl artifacts/twap_oracle-idl.json -- inspect <PRICE_OBSERVATIONS_PDA> --type PriceObservations
   ```
   :::

1. Execute a swap between your two tokens with `swap-exact-input`.

   ```bash
   spel --idl artifacts/amm-idl.json \
        --program programs/amm/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/amm.bin \
        -- swap-exact-input \
        --config <CONFIG_PDA> \
        --pool <POOL_PDA> \
        --vault-a <VAULT_A_PDA> \
        --vault-b <VAULT_B_PDA> \
        --user-input-holding <USER_HOLDING_A> \
        --user-output-holding <USER_HOLDING_B> \
        --current-tick-account <CURRENT_TICK_PDA> \
        --clock 4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU \
        --swap-amount-in <AMOUNT_IN> \
        --min-amount-out <MIN_OUT> \
        --deadline 18446744073709551615
   ```

   - The swap direction is set by which holding you pass as `--user-input-holding`

   :::info
   To verify, run the following:
   ```bash
   spel --idl artifacts/amm-idl.json -- inspect <POOL_PDA> --type PoolDefinition
   ```
   :::

1. Record the fresh tick into the `price-observations` account.

   ```bash
   spel --idl artifacts/twap_oracle-idl.json \
        --program programs/twap_oracle/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/twap_oracle.bin \
        -- record-tick \
        --price-observations <PRICE_OBSERVATIONS_PDA> \
        --current-tick-account <CURRENT_TICK_PDA> \
        --clock 4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU \
        --price-source-id <POOL_PDA> \
        --window-duration <WINDOW_DURATION>
   ```

   - Run this after a swap, so `current_tick_account` holds a fresh tick.
   - `--window-duration` must match the value used when you created the observations account.

   :::info
   To verify the update, run the following:
   ```bash
   spel --idl artifacts/twap_oracle-idl.json -- inspect <PRICE_OBSERVATIONS_PDA> --type PriceObservations
   ```
   :::

## Step 8: Publish an oracle price

Create the oracle's price account once, then publish the TWAP so downstream consumers can read it.

1. Derive and create the oracle price account (once per pool).

   ```bash
   cargo run -q -p twap_oracle_program --example twap_oracle_pdas -- \
     "<TWAP_PROGRAM_ID>" <POOL_PDA> <WINDOW_DURATION>

   spel --idl artifacts/amm-idl.json \
        --program programs/amm/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/amm.bin \
        -- create-oracle-price-account \
        --config <CONFIG_PDA> \
        --pool <POOL_PDA> \
        --oracle-price-account <ORACLE_PRICE_ACCOUNT_PDA> \
        --clock 4BdcjoXkq786TMWcBGGHqcxeLYMZmn17rL4eM9ZyRWNU \
        --window-duration <WINDOW_DURATION>
   ```

1. Publish the price. This requires at least two recorded observations (the first is seeded on creation, the second comes from a recorded tick).

   ```bash
   spel --idl artifacts/twap_oracle-idl.json \
        --program programs/twap_oracle/methods/guest/target/riscv32im-risc0-zkvm-elf/docker/twap_oracle.bin \
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
   spel --idl artifacts/twap_oracle-idl.json -- inspect <ORACLE_PRICE_ACCOUNT_PDA> --type OraclePriceAccount
   ```

## Troubleshooting AMM program deployment

### PDAs stop matching after a rebuild

Recompiling any program changes its ProgramId, and every PDA derived from that ProgramId changes with it (config, pool, vaults, LP definition, LP lock, current tick). After any AMM rebuild, redo the PDA-derivation, initialization, and pool-creation steps rather than reusing old values.

### `spel` rejects an `account_id` argument

`account_id` arguments must be passed as bare base58 or `0x`-prefixed hex. Strip the wallet's `account_id(...)` display wrapper before passing an id to spel.

### `spel pda` returns the wrong address

`spel pda` pads raw bytes, but the AMM's `*_core` crates derive PDAs with a SHA-256 seed scheme. Always use the committed `examples/*_pdas` helper for the relevant program instead of `spel pda`.

### `new-definition` fails on `user_holding_lp`'s signature

`user_holding_lp` must be a signer for `new-definition`, so it needs to be a fresh keypair account you hold. For `add_liquidity`, an existing holding works without a signature, since the LP definition already exists at that point.

### A swap fails because a holding isn't signed

`swap-exact-input` and `swap-exact-output` mark both `user-holding-a` and `user-holding-b` as signers, even though only the input side is debited — the input side is chosen at runtime, so both must be signed.

### `spel` and `wallet` point at different networks

Deploying and running spel from different shells with different `LEE_WALLET_HOME_DIR` values points them at different networks and keys. Export the same value in every shell you use for this procedure.
