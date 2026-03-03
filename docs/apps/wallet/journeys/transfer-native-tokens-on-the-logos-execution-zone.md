---
title: Transfer native tokens on the Logos Execution Zone
doc_type: procedure
product: LEZ
topics: LEZ
steps_layout: flat
authors: cheny0, jorge-campo, moudyellaz
owner: logos
doc_version: 1
slug: transfer-native-tokens-on-the-logos-execution-zone
---

# Transfer native tokens on the Logos Execution Zone

#### Use the wallet CLI to send native tokens to public and private accounts.

> [!IMPORTANT]
>
> This page should be accurate for the specific version referenced in this doc, but it may not have been run end-to-end as written. Expect minor gaps (for example, missing environment details) and be prepared to troubleshoot. We are actively working to complete and verify this content.

> [!NOTE]
>
>  - **Permissions**: No special permissions required.
>  - **Product**: Logos Execution Zone wallet CLI.

The Logos Execution Zone (LEZ) is a programmable blockchain that cleanly separates public and private state while keeping them fully interoperable. It's a component of the [Logos project](https://github.com/logos-co/logos-docs/blob/main/README.md). You can use the wallet CLI to invoke LEZ's authenticated-transfers program to transfer native tokens between public and private accounts.

On LEZ, public and private accounts differ in where their state lives and how transfers update that state.

- Public accounts
    - Live on-chain.
    - Identified by a 32-byte account ID derived from the public key
    - The private key signs transactions and authorizes program executions. 

- Transfers between public accounts
    - Validators execute the authenticated-transfers program transparently.
    - The public state (the on-chain map from public account IDs to their account states) is updated in place by debiting the sender's public account and crediting the recipient's public account.

- Private accounts
    - Structurally identical to public accounts, but their values are stored off-chain. 
    - Use two keypairs: nullifier keys for privacy-preserving executions and viewing keys for encrypting and decrypting values. 
    - The private account ID is derived from the nullifier public key. 
    - Anyone can initialize private accounts, but once initialized they can only be modified by the owner's keys.

- Transfers involving any private account
    - The execution is privacy-preserving. 
    - The transfer generates a zero-knowledge proof of correct execution locally, and submits the proof for validators to verify. Each update to the private state produces a new commitment (a 32-byte, hash-like binding to the actual values), and the previous commitment is marked as spent via a nullifier set so only the latest version can be used, while the actual private values remain local to the account owner.
    - Any public accounts involved are still updated visibly on-chain.

> [!CAUTION]
>
> Transfers are irreversible. Double-check all details before proceeding.

Before you begin, ensure that you have the following:

- The [LEZ sequencer running in standalone mode](./quickstart-for-the-logos-execution-zone-wallet.md#step-2-start-the-lez-sequencer-in-standalone-mode) on your computer
- The [Wallet CLI installed](./quickstart-for-the-logos-execution-zone-wallet.md#step-1-set-up-the-wallet-binary-prerequisites-and-build-the-wallet) on your computer

## What to expect

- The authenticated-transfers program manages native token transfers and enforces authenticated debits. When making transfers, you use the wallet CLI to interact with the program.
- You can initialize accounts by sending tokens to them. The authenticated-transfers program claims any uninitialized account used in a transfer.
- You can transfer native tokens to public accounts and verify balances on-chain.
- Your private account balances are in your local wallet storage and rely on zero-knowledge proofs for privacy.

## Step 1: Create and fund a sender account

1. Create a public account or private account according to your needs.

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

2. Use the `wallet account ls` command to confirm the accounts are created successfully. You should see a list showing all of your accounts.

    ```sh
    wallet account ls
    ```

3. Initialize the sender account. Replace `ACCOUNT-TYPE` with the type of the sender account (public or private) and `ACCOUNT-ID` with the account ID you want to initialize.

    ```sh
    wallet auth-transfer init --account-id ACCOUNT-TYPE/ACCOUNT-ID
    ```

    For example, to initialize the public account with ID `Ev1JprP9BmhbFVQyBcbznU8bAXcwrzwRoPTetXdQPAWS`, you run:
        
    ```sh
    wallet auth-transfer init --account-id Public/Ev1JprP9BmhbFVQyBcbznU8bAXcwrzwRoPTetXdQPAWS
    ```

> [!NOTE]
>
> New accounts are created in an uninitialized state, which means no program on LEZ owns them yet. Any program can claim and own an uninitialized account. After initialization, only the owning program can modify the account.
>
> The only exception is native token credits: any program can credit native tokens to any account, but only the owning program can debit native tokens.

4. Fund the sender account using the Testnet Piñata program. Your account receives 150 tokens every time you fund it.

    ```sh
    wallet pinata claim --to ACCOUNT-TYPE/ACCOUNT-ID
    ```

5. Confirm your account balance after funding using the `wallet account get` command:

    ```sh
    wallet account get --account-id ACCOUNT-TYPE/ACCOUNT-ID
    ```

    The output looks like this:

    ```text
    Account owned by authenticated-transfer program
    {..."balance":150...}
    ```

## Step 2: Transfer tokens

When transferring native tokens using the `wallet auth-transfer send` command, you specify the sender account with its account ID.

There are two ways to specify the recipient account depending on the account type:

- [Method 1: Use the recipient account ID](#method-1-transfer-tokens-using-the-recipient-account-id)
- [Method 2: Use the recipient account `npk` and `vpk`](#method-2-transfer-tokens-using-the-recipient-account-npk-and-vpk)

With the recipient account ID, you can transfer native tokens across the following account types:

- Public → public (yours or someone else's)
- Private → public (yours or someone else's)
- Public → your private
- Private → your private

> [!NOTE]
>
> Transfers involving private accounts may take a few minutes because the wallet needs to generate a local proof. 

With the `npk` and `vpk` of the recipient account, you can transfer native tokens across the following account types:

- Public → uninitialized private (someone else's)
- Private → uninitialized private (someone else's)

> [!NOTE]
>
> Currently, only uninitialized private accounts can be modified without authorization. Sending funds to initialized private accounts is not possible because only the owner can modify them.

### Method 1: Transfer tokens using the recipient account ID

Use the `wallet auth-transfer send` to transfer tokens. Replace `ACCOUNT-TYPE` with the type of the account (public or private) and `TOKEN-AMOUNT` with the amount of tokens to transfer.

    ```sh
    wallet auth-transfer send \
        --from ACCOUNT-TYPE/SENDER-ACCOUNT-ID \
        --to ACCOUNT-TYPE/RECIPIENT-ACCOUNT-ID \
        --amount TOKEN-AMOUNT
    ```

For example, to transfer 17 tokens from the public account with ID `Ev1JprP9BmhbFVQyBcbznU8bAXcwrzwRoPTetXdQPAWS` to the private account with ID `HacPU3hakLYzWtSqUPw6TUr8fqoMieVWovsUR6sJf7cL`, you run:

    ```sh
    wallet auth-transfer send \
        --from Public/Ev1JprP9BmhbFVQyBcbznU8bAXcwrzwRoPTetXdQPAWS \
        --to Private/HacPU3hakLYzWtSqUPw6TUr8fqoMieVWovsUR6sJf7cL \
        --amount 17
    ```

### Method 2: Transfer tokens using the recipient account `npk` and `vpk`

When transferring someone else's private account, you need their account `npk` (nullifier public key)and `vpk` (viewing public key) instead of the account ID because LEZ uses the `npk`  to confirm the ownership of the private account, and `vpk` to verify transactions without revealing the account owner. These keys do not expose sensitive information and allow others to verify transaction validity.

> [!TIP]
>
> Check your account `npk` and `vpk` using the `wallet account get --account-id ACCOUNT-TYPE/ACCOUNT-ID` command.

1. Use the `wallet auth-transfer send` to transfer tokens to another user's private account. Replace `ACCOUNT-TYPE` with the type of the sender account (public or private) and `TOKEN-AMOUNT` with the amount of tokens to transfer.

    ```sh
    wallet auth-transfer send \
        --from ACCOUNT-TYPE/SENDER-ACCOUNT-ID \
        --to-npk RECIPIENT-NPK \
        --to-vpk RECIPIENT-VPK \
        --amount TOKEN-AMOUNT
    ```

2. Once the transaction is accepted, run the following command to scan the chain for encrypted values in the transaction and update the local state accordingly.

    ```sh
    wallet account sync-private
    ```

## Step 3: Verify the transfer

Confirm the transfer by checking the balances of both accounts using the `wallet account get` command.

    ```sh
    wallet account get --account-id ACCOUNT-TYPE/ACCOUNT-ID
    ```

For example, to check the balance of the private account with ID `HacPU3hakLYzWtSqUPw6TUr8fqoMieVWovsUR6sJf7cL`, you run:

    ```sh
    wallet account get --account-id Private/HacPU3hakLYzWtSqUPw6TUr8fqoMieVWovsUR6sJf7cL
    ```

The output looks like this:

    ```text
    Account owned by authenticated-transfer program
    {..."balance":BALANCE-AMOUNT...}
    ```

> [!TIP]
>
> When checking the balance of a private account, the `wallet account get` command doesn't query the network. It works offline because private account data lives only in your wallet storage. Other users cannot read your private balances using this command and your private account ID.

> [!TIP]
>
> You can also use the `wallet account ls -l` command to check the balances of all your accounts at once.

## Troubleshooting

### Symptom 

The wallet command panics and fails during proof generation with an assertion error when you try to send native tokens to an initialized private account.

The error message looks like this:

```text
thread 'main' panicked at .../privacy_preserving_circuit.rs:394:13:
assertion `left == right` failed: Found new private account with non default values
  left: Account { ... }
  right: Account { ... }
...
called `Result::unwrap()` on an `Err` value: CircuitProvingError("Guest panicked: assertion `left == right` failed: Found new private account with non default values ...")
```

### Explanation

The transfer fails because the privacy-preserving circuit expects the recipient private account to be uninitialized (default state), but an initialized private account already contains non-default values and can only be modified by its owner.
