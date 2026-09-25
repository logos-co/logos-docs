---
title: Create and transfer custom tokens on the Logos Execution Zone
doc_type: procedure
product: lez
topics: lez
steps_layout: flat
authors: cheny0, jorge-campo, moudyellaz, kashepavadan
owner: logos
doc_version: 2
slug: create-and-transfer-custom-tokens-on-the-logos-execution-zone
sidebar_position: 2
---

# Create and transfer custom tokens on the Logos Execution Zone

#### Use the wallet and SPEL CLIs to create custom tokens, transfer them, mint or burn supply, and rotate the mint authority.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

The Logos Execution Zone ([LEZ](../../get-started/glossary.md#lez)) is a programmable blockchain that cleanly separates public and private state while keeping them fully interoperable. LEZ's [token program](../../get-started/glossary.md#token-program) is a single, shared [program](../../get-started/glossary.md#program) that creates and manages custom tokens—there's no separate contract deployment per token. You drive it with the [SPEL CLI](https://github.com/logos-co/spel) (`spel`), which sends the program's instructions directly, and the `wallet` CLI, which creates and lists the accounts those instructions use.

Token program accounts fall into three types:

- [Token definition account](../../get-started/glossary.md#token-definition-account)
  - Each token has exactly one token definition account.
  - It defines the token globally: its name, total supply, optional metadata reference, and optional mint authority.
  - Its address is the token identifier (similar to a mint address).
- [Token holding account](../../get-started/glossary.md#token-holding-account)
  - Any [account](../../get-started/glossary.md#account) that holds a balance of a token is called a token holding account for that token.
  - Each token can have multiple token holding accounts.
- Token metadata account
  - Created alongside a non-fungible token's definition to hold its standard, URI, and creators.

:::danger
Transfers, mints, and burns are irreversible, and renouncing the mint authority can never be undone. Double-check all details before submitting a transaction.
:::

:::info[Prerequisites]
- An [LEZ CLI wallet](../get-started/run-lez-wallet-via-cli.md) set up and funded.
- The token program's IDL. It's committed at `artifacts/token-idl.json` in the [`lez-programs`](https://github.com/logos-blockchain/lez-programs) repository, so cloning the repository is enough—you don't need to build anything to get it.
:::

## What to expect

- You can create a fungible token with a fixed supply, a self-managed mint authority, or a mint authority delegated to another account.
- You can transfer, mint, and burn tokens, and rotate or permanently renounce a token's mint authority.
- You can inspect any token definition, holding, or metadata account to confirm the result of an instruction.

## Step 1: Install `spel`

`spel` is a developer CLI tool used to help build and drive programs that run on the LEZ.

1. Install `spel`.

   ```bash
   git clone https://github.com/logos-co/spel.git
   cd spel
   cargo install --path spel-cli  # installs as "spel"
   ```

## Step 2: Create a fungible token

Creating a token creates its [token definition account](../../get-started/glossary.md#token-definition-account) and its first [token holding account](../../get-started/glossary.md#token-holding-account), credited with the full total supply, in one instruction. Both target accounts must be fresh (never written to) and must be accounts your wallet holds the keys for.

1. Create two accounts: one for the token definition, one for the first holding.

   ```sh
   wallet account new public --label "Token A Definition"
   wallet account new public --label "Token A Holding"
   ```

1. Confirm the accounts were created, and note their ids.

   ```sh
   wallet account list
   ```

   - The listing shows each account's label and base58 id, for example `Public/CER21z16YgmWr3aN8FEHsrmfm2iRfQiwZTac3FQa21US [Token A Definition]`. Use those ids wherever this procedure refers to `<DEF>`, `<HOLDING>`, or `<AUTHORITY>`.

1. Create the token with `new-fungible-definition`, replacing `<TOKEN_PROGRAM_ID>` with the current testnet token program's ProgramId from [DEPLOYMENTS.md](https://github.com/logos-blockchain/lez-programs/blob/main/DEPLOYMENTS.md).

   ```sh
   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- new-fungible-definition \
        --name "TOKEN A" \
        --total-supply 1000000000000000000000 \
        --definition-target-account <DEF> \
        --holding-target-account <HOLDING> \
        --mint-authority <AUTHORITY>
   ```

   - `--total-supply` is a `u128` in **base units**—the token program stores no decimals field, so `1000000000000000000000` is 1000 whole tokens only if your UI assumes 18 decimals.
   - `--mint-authority` is always required (`spel` has no optional flags) and decides the token's supply model:

     | Value | Meaning |
     |---|---|
     | `<DEF>` (the definition's own id) | Self authority—mint later with `mint` ([Step 5](#step-5-mint-more-supply)), signing as the definition account. |
     | Another account id | External authority—mint later with `mint-with-authority` ([Step 5](#step-5-mint-more-supply)), signing as that account. |
     | `none` | Fixed supply—minting is permanently rejected. |

   - An all-zero authority id is rejected. Both target accounts must be fresh—re-running the command against the same accounts fails.

1. Confirm the definition and holding were created correctly.

   ```sh
   spel --idl artifacts/token-idl.json inspect <DEF>     --type TokenDefinition
   spel --idl artifacts/token-idl.json inspect <HOLDING> --type TokenHolding
   ```

## Step 3: Give someone a holding

Before an account can receive a transfer or a mint, it needs an initialised [token holding account](../../get-started/glossary.md#token-holding-account) for that token's definition. `initialize-account` creates an empty holding—`Fungible { balance: 0 }` for a fungible definition.

1. Create the account that will hold the token.

   ```sh
   wallet account new public --label "Token A Holding (Bob)"
   ```

1. Initialise it against the token's definition.

   ```sh
   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- initialize-account \
        --definition-account <DEF> \
        --account-to-initialize <NEW_HOLDING>
   ```

   - `<DEF>` is read-only here and isn't signed—anyone can initialise a holding for any definition, as long as they sign the new holding account.
   - The definition must be owned by the token program build you're using, or the call is rejected.

## Step 4: Transfer

`transfer` moves a balance between two holdings of the **same** definition. `spel` signs the sender; the recipient is only written to, so it must already be initialised ([Step 3](#step-3-give-someone-a-holding))—a fresh account's claim can't be authorised here because `transfer` never collects the recipient's signature.

1. Transfer tokens from a holding you own to an already-initialised recipient holding of the same definition.

   ```sh
   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- transfer \
        --sender <SENDER_HOLDING> \
        --recipient <RECIPIENT_HOLDING> \
        --amount-to-transfer <AMOUNT>
   ```

   - `<SENDER_HOLDING>` must be a holding you own, with a balance ≥ `<AMOUNT>`.
   - `<RECIPIENT_HOLDING>` must already be initialised and belong to the same token definition as the sender, or the transfer is rejected.

1. Confirm the recipient's new balance.

   ```sh
   spel --idl artifacts/token-idl.json inspect <RECIPIENT_HOLDING> --type TokenHolding
   ```

## Step 5: Mint more supply

Minting adds to both the holding's balance and the definition's total supply. It's fungible-only, and which instruction you use depends on where the definition's mint authority lives ([Step 2](#step-2-create-a-fungible-token)). The target holding must already be initialised—it isn't a signer, so a fresh account can't be claimed by a mint.

### Option A—Self authority

Use this when the definition's stored mint authority **is the definition account itself**.

1. Mint, signing with the definition account.

   ```sh
   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- mint \
        --definition-account <DEF> \
        --user-holding-account <HOLDING> \
        --amount-to-mint <AMOUNT>
   ```

### Option B—External authority

Use this when a **separate account** holds the mint authority—the normal case when you passed a distinct `--mint-authority` at creation, or rotated it later ([Step 6](#step-6-rotate-or-renounce-the-mint-authority)).

1. Mint, signing with the authority account.

   ```sh
   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- mint-with-authority \
        --definition-account <DEF> \
        --user-holding-account <HOLDING> \
        --authority-account <AUTHORITY> \
        --amount-to-mint <AMOUNT>
   ```

Using the variant that doesn't match where the authority actually lives fails with `signer is not the current authority`, even if you hold the right key. A revoked (`none`) authority rejects both variants with `authority revoked, supply is fixed`.

## Step 6: Rotate or renounce the mint authority

Rotating or renouncing follows the same self-vs-external split as minting, and is fungible-only.

### Option A—Current authority is the definition account

1. Set a new authority, signing with the definition account.

   ```sh
   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- set-authority \
        --definition-account <DEF> \
        --new-authority <NEW_AUTHORITY>
   ```

### Option B—Current authority is a separate account

1. Set a new authority, signing with the current authority account.

   ```sh
   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- set-authority-with-authority \
        --definition-account <DEF> \
        --authority-account <CURRENT_AUTHORITY> \
        --new-authority <NEW_AUTHORITY>
   ```

:::danger
Passing `--new-authority none` **permanently renounces** minting—the supply becomes fixed and no later rotation is possible. There is no undo.
:::

1. Confirm the new authority.

   ```sh
   spel --idl artifacts/token-idl.json inspect <DEF> --type TokenDefinition
   ```

## Step 7: Burn

`burn` destroys supply from a holding you own. The holding signs; the definition is written but not signed, so any holder can burn their own tokens without the issuer's involvement, and burning is **not** gated on the mint authority—even a renounced, fixed-supply token can still shrink.

1. Burn from a holding you own.

   ```sh
   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- burn \
        --definition-account <DEF> \
        --user-holding-account <HOLDING> \
        --amount-to-burn <AMOUNT>
   ```

   - Burning more than the holding's balance is rejected.

## Step 8: NFTs

A non-fungible token is a definition with a `printable_supply` plus a metadata account. Its first holding is an `NftMaster`; each print carves an `NftPrintedCopy` out of it. `print_balance` reserves one unit for the master itself, so a `printable_supply` of `N` yields `N − 1` printable copies.

:::warning
`spel` cannot currently create NFT (or metadata-bearing fungible) definitions—`new-definition-with-metadata` takes two structured arguments that `spel` has no way to encode. This holds for both CLI v0.5.0 and v0.6.0. Until it's supported, create these definitions programmatically; see `token_program::new_definition::new_definition_with_metadata` and the integration tests in `programs/integration_tests/tests/token.rs` in the [`lez-programs`](https://github.com/logos-blockchain/lez-programs) repository. Everything below works over the CLI against a definition created that way.
:::

1. Print a copy. Both the master holding and the fresh printed-copy account must sign; the printed target must be fresh—`print-nft` claims it itself, so don't pre-initialise it.

   ```sh
   wallet account new public --label "NFT copy #1"
   ```

   ```sh
   spel --idl artifacts/token-idl.json \
        --program <TOKEN_PROGRAM_ID> \
        -- print-nft \
        --master-account <NFT_MASTER_HOLDING> \
        --printed-account <NEW_COPY_HOLDING>
   ```

   - Each print decrements the master's `print_balance` by 1. Printing requires `print_balance > 1`, so the last unit can never be printed.

1. Move a printed copy. Initialise a slot for the recipient against the NFT definition ([Step 3](#step-3-give-someone-a-holding))—it produces an un-owned `NftPrintedCopy`—then transfer `1` ([Step 4](#step-4-transfer)).

   ```sh
   spel --idl artifacts/token-idl.json --program <TOKEN_PROGRAM_ID> \
        -- initialize-account --definition-account <NFT_DEF> --account-to-initialize <RECIPIENT_SLOT>

   spel --idl artifacts/token-idl.json --program <TOKEN_PROGRAM_ID> \
        -- transfer --sender <MY_COPY> --recipient <RECIPIENT_SLOT> --amount-to-transfer 1
   ```

1. Transfer a master. This is only meaningful into an existing `NftMaster` holding sitting at `print_balance: 0`, with the transferred amount equal to the sender's whole `print_balance`. `initialize-account` always produces a printed-copy slot, never a master, so in practice a master can only move to an account that previously gave one away—plan master ownership at creation time.

## Step 9: Inspect a token account

Any token account can be read back at any time, with no signing and no transaction submitted.

```sh
spel --idl artifacts/token-idl.json inspect <DEF>      --type TokenDefinition
spel --idl artifacts/token-idl.json inspect <HOLDING>  --type TokenHolding
spel --idl artifacts/token-idl.json inspect <METADATA> --type TokenMetadata
```

`--type` must match the account's actual shape—decoding a holding as a definition fails. A holding's `definition_id` field is how you find the token it belongs to.

## Troubleshooting

### `Token definition must be owned by token program`

The token definition was created by a different build of the token program than the one you're calling. Recompiling the token program changes its ProgramId, and tokens created by an older build stay owned by it—recreate the token against the build you're currently using.

### A transfer or mint rejects a fresh recipient account

Neither `transfer` nor `mint` marks its recipient/holder as a signer, so the claim of a fresh account can't be authorised. Run `initialize-account` on the recipient first ([Step 3](#step-3-give-someone-a-holding)). `print-nft` is the one exception—its printed target *is* a signer, so it must be fresh and must not be pre-initialised.

### `Option` or account arguments are rejected as missing

`spel` has no optional arguments. `--mint-authority` and `--new-authority` must always be passed—use the literal `none` for a fixed-supply token or a renounced authority. Similarly, there's no optional-account mechanism, which is why authority operations are split into `mint`/`mint-with-authority` and `set-authority`/`set-authority-with-authority`; using the variant that doesn't match where the authority lives fails with `signer is not the current authority`, even when you hold the right key.

### `--dry-run` submits the transaction anyway

`--dry-run` is a global flag and only works **before** the `--` separator: `spel --idl … --program … --dry-run -- transfer …` resolves and prints the transaction without submitting it. Placed after the instruction name, it's silently ignored and the transaction **is** submitted.

### `spel` rejects an account id argument

Account ids must be passed as bare base58 or `0x`-prefixed hex. Strip the wallet's `account_id(...)` display wrapper before passing an id to `spel`.
