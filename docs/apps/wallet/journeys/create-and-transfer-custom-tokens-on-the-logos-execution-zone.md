---
title: Create and transfer custom tokens on the Logos Execution Zone
doc_type: procedure
product: lez
topics: lez
steps_layout: flat
authors: cheny0, jorge-campo, moudyellaz
owner: logos
doc_version: 1
slug: create-and-transfer-custom-tokens-on-the-logos-execution-zone
---

# Create and transfer custom tokens on the Logos Execution Zone

#### Use the wallet CLI to create custom tokens and transfer them between public and private accounts.

> [!IMPORTANT]
>
> This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. We are actively working to complete and verify this content.

> [!NOTE]
>
> - **Permissions**: No special permissions required.
> - **Product**: Logos Execution Zone wallet CLI.

The Logos Execution Zone (LEZ) is a programmable blockchain that cleanly separates public and private state while keeping them fully interoperable. It's a component of the [Logos project](https://github.com/logos-co/logos-docs/blob/main/README.md). You can use the wallet CLI to invoke LEZ's token program to create and transfer custom tokens between [public and private accounts](./transfer-native-tokens-on-the-logos-execution-zone.md) on LEZ.

The token program is a built-in LEZ program that provides standard token functionality, including defining new token assets and transferring balances. It uses a single shared program rather than requiring a separate contract deployment for each token. The token program is privacy-agnostic. You use the same instructions whether execution is public (on-chain) or privacy-preserving (off-chain with a zero-knowledge proof). The protocol decides the execution mode, and the token logic is unchanged.

Token program accounts fall into two types:

- Token definition account
  - Each token has exactly one token definition account.
  - It defines the token globally (the “token type”).
  - Its address is the token identifier (similar to a mint address). 
  - The token program owns it. 
  - It stores metadata including the token name and total supply.
  - It can be public or private.

- Token holding account
  - Each token can have multiple token holding accounts.
  - Any account that holds a balance of a token is a token holding account for that token.
  - It stores the token definition ID and the balance the account currently controls.
  - The token program owns it.
  - Only the token program can modify it. Modifications happen through token program executions authorized by the account’s keys.
  - It can be public or private.

> [!CAUTION]
>
> Transfers are irreversible. Double-check all details before proceeding.

Before you begin, ensure that you have the following:

- The [LEZ sequencer running in standalone mode](./quickstart-for-the-logos-execution-zone-wallet.md#step-2-start-the-lez-sequencer-in-standalone-mode) on your computer
- The [Wallet CLI installed](./quickstart-for-the-logos-execution-zone-wallet.md#step-1-set-up-the-wallet-binary-prerequisites-and-build-the-wallet) on your computer

## What to expect

- The token program can move balances between token holding accounts. 
- If the recipient account is uninitialized, the token program will automatically claim it. After initialization, only the token program can modify the account.
- You can transfer custom tokens to any uninitialized public or private account. Once the account is initialized, it can only receive tokens of the same definition ID. (A token holding account stores the balance for exactly one token definition ID.)

> [!NOTE]
>
> Currently, it's impossible to change the token name or total supply after you create the token.

## Step 1: Create a token

1. Create two new, uninitialized accounts: one token definition account and one token holding account to receive the total supply. Both accounts can be public or private, depending on your needs.

    - Public account:

    ```sh
    wallet account new public
    ```

    - Private account:

    ```sh
    wallet account new private
    ```

   If you create a public account, the output is the account ID. If you create a private account, the output includes the account ID, nullifier public key (`npk`), and viewing public key (`vpk`).

> [!NOTE]
> 
> Your account keys and data are stored in the local file `$HOME/.nssa/wallet/storage.json`.

1. Use the `wallet account ls` command to confirm the accounts are created successfully. You should see a list showing all of your accounts.

    ```sh
    wallet account ls
    ```

1. Create the token using the token definition account and token holding account you just created. Replace `NAME` with your token name, `AMOUNT` with the total supply, `ACCOUNT-TYPE` with the type of the account (public or private), and `ACCOUNT-ID` with the appropriate account IDs.

    ```sh
    wallet token new \
    --name NAME \
    --total-supply AMOUNT \
    --definition-account-id ACCOUNT-TYPE/ACCOUNT-ID \
    --supply-account-id ACCOUNT-TYPE/ACCOUNT-ID
    ```

  For example,

    ```sh
    wallet token new \
    --name TOKENA \
    --total-supply 1337 \
    --definition-account-id Public/4X9kAcnCZ1Ukkbm3nywW9xfCNPK8XaMWCk3zfs1sP4J7 \
    --supply-account-id Public/9RRSMm3w99uCD2Jp2Mqqf6dfc8me2tkFRE9HeU2DFftw
    ```

1. Use the `wallet account get` command to check the status of the token definition account and token holding account. You can see their account types and the token metadata.

    ```sh
    wallet account get --account-id ACCOUNT-TYPE/ACCOUNT-ID
    ```

  The output for the definition account and holding account looks like the following, respectively:

    ```text
    Definition account owned by token program
    {"Fungible":{"name":"TOKENA","total_supply":1337,"metadata_id":null}}
    ```

    ```text
    Holding account owned by token program
    {"Fungible":{"definition_id":"4X9kAcnCZ1Ukkbm3nywW9xfCNPK8XaMWCk3zfs1sP4J7","balance":1337}}
    ```

> [!TIP]
>
> When checking the status of a private account, the `wallet account get` command doesn't query the network. It works offline because private account data lives only in your wallet storage. Other users cannot read your private balances using this command and your private account ID.

### Step 2: Transfer tokens

When transferring custom tokens using the `wallet token send` command, you specify the sender and recipient accounts with the account IDs. Both accounts can be public or private, but they must have the same token definition ID.

> [!NOTE]
>
> Transfers involving private accounts may take a few minutes because the wallet needs to generate a local proof. 

1. Use the `wallet token send` command to transfer custom tokens. Replace `ACCOUNT-TYPE` with the type of the account (public or private) and `TOKEN-AMOUNT` with the amount of tokens to transfer.

    ```sh
    wallet token send \
        --from ACCOUNT-TYPE/SENDER-ACCOUNT-ID \
        --to ACCOUNT-TYPE/RECIPIENT-ACCOUNT-ID \
        --amount TOKEN-AMOUNT
    ```

  For example, to transfer 1000 tokens from a private token holding account to a public recipient account, run:

    ```sh
    wallet token send \
      --from Private/HMRHZdPw4pbyPVZHNGrV6K5AA95wACFsHTRST84fr3CF \
      --to Public/88f2zeTgiv9LUthQwPJbrmufb9SiDfmpCs47B7vw6Gd6 \
      --amount 1000
    ```

1. Use the `wallet account get` command to check the status of the sender and recipient accounts. You can see the updated token balances.

    ```sh
    wallet account get --account-id ACCOUNT-TYPE/ACCOUNT-ID
    ```

  The output looks like this:

    ```text
    Holding account owned by token program
    {"Fungible":{"definition_id":"4X9kAcnCZ1Ukkbm3nywW9xfCNPK8XaMWCk3zfs1sP4J7","balance":1000}}
    ```

> [!TIP]
>
> You can also use the `wallet account ls -l` command to check the balances of all your accounts at once.
