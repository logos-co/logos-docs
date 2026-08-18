---
title: Register an RLN membership from Basecamp
doc_type: procedure
product: lez
topics: [lez, rln]
steps_layout: sectioned
authors: adklempner, kashepavadan
owner: logos
doc_version: 1
slug: register-rln-membership-from-basecamp
---

# Register an RLN membership from Basecamp

#### Get started acquiring an RLN membership on the LEZ testnet.

This procedure covers how to install the RLN Membership app in Logos Basecamp from released binaries and use its guided wizard to register a membership on the LEZ testnet. It is intended for anyone who wants to try acquiring an RLN membership for participating in DoS-protected networks on the Logos stack, using an auto-provisioned, faucet-funded wallet.

:::info[Prerequisites]

- [Logos Basecamp installed](../../basecamp/install-logos-basecamp.md).
- Network access to the testnet sequencer [`https://testnet.lez.logos.co/`](https://testnet.lez.logos.co/).
- Approximately 1 GB free disk for the Basecamp app and the downloaded module bundles.
:::

## What to expect

- You can install Basecamp from a release binary and add the RLN module registry without building anything from source.
- You can register a new RLN membership through a guided wizard that syncs your wallet, claims faucet funds, and confirms registration automatically.
- You can verify your membership's state, leaf index, and registration transaction, and look it up in the block explorer.

## Step 1: Install the RLN Membership app

Add the RLN module registry, then install the app with its dependencies from both the registry and the official catalogue.

1. In Basecamp's **Package Manager**, click **Manage Repositories** (top-right) to open **Settings › Package Repositories**.

1. Under **Add a repository**, paste the registry URL and click **Add**:

   ```text
   https://github.com/logos-co/logos-rln-modules/releases/download/index/logos-repo.json
   ```
   - The repository lists as **Logos RLN Membership** with eight packages.

1. Find **RLN Membership** in the list and click **Install**. In the **Install Package?** dialog, review the listed dependency changes and click **Install** to confirm.

   - The single confirmation installs the dependencies and the app itself, downloading about 300 MB. Wait for the **RLN Membership** row to read **INSTALLED** before moving on; if it still offers **INSTALL**, click it once more.

1. Open **RLN Membership** from the sidebar, restarting Basecamp first if it isn't there yet.

   - If the row shows **RETRY**, the install has still succeeded — restart and check the sidebar before retrying.

## Step 2: Register a membership

Open the RLN Membership app and complete the guided wizard to register a new membership.

:::info
The **Registering** screen runs two unattended waits: a first-run chain sync (a few minutes at most for a fresh wallet, depending on how far the testnet chain head has advanced) and, after the faucet claim, a registration confirmation poll (about 1–3 minutes, capped at 300 seconds). Both are expected.
:::

1. In the sidebar, click **RLN Membership**, then click **Get started** on the welcome screen.

1. On **Choose a password**, enter a password in both fields and click **Continue**.

   - The password protects the auto-provisioned wallet on this device. **Continue** stays disabled until both entries match.

1. Watch the progress bar advance through **Syncing**, **Claiming**, and **Registering**.

   - If the wizard stalls at the start of **Syncing**, or shows "Cannot discover the chain head — is the sequencer reachable?", retry — relaunch the app if needed. The wizard resumes where it left off, and the second attempt typically proceeds.
   - If **Get more tokens** appears, the faucet claim timed out after its 180-second budget. Click the offered button to retry.

   - The app lands on **"You're in!"** with your new membership shown below once registration completes.

## Step 3: Verify the membership

Open the membership's detail view to confirm its state, then look up the registration transaction in the block explorer.

1. Tap the membership pill to open its detail view.

   - Expect to see state **Active**, a leaf index, your copyable membership id, and the registration transaction.

1. Copy the transaction hash and look it up at [the testnet explorer](https://explorer.testnet.lez.logos.co/), whose transaction route is `https://explorer.testnet.lez.logos.co/transaction/<hash>`.

   - Paste the hash exactly as **Copy** returns it. The explorer expects the bare hash; a `0x` prefix returns `Invalid transaction hash`.
   - The explorer's indexer runs well behind the chain head, so a just-registered transaction can return `Transaction not found` for hours. Your registration is already confirmed in the app, so treat this lookup as optional later confirmation rather than a step to wait on.
   - In the app's detail view, expect membership state **Active**, a leaf index assigned, and rate limit `300`.

## Frequently asked questions

### Why does the wizard stall at the start of Syncing?

The sequencer was briefly unreachable when the wizard checked for the chain head. Retry, relaunching the app if needed — the wizard resumes from where it left off, and the second attempt typically succeeds.

### Why does the Registering screen take several minutes?

A fresh wallet needs a first-run chain sync, which takes anywhere from under a minute to a few minutes depending on how far the testnet chain head has advanced. After the faucet claim, the app polls for registration confirmation for up to 300 seconds. Both waits are expected and the progress bar advances as they proceed.

### Why does "Get more tokens" appear during the wizard?

The faucet claim has a 180-second budget. If it times out, click the offered button to retry the claim.
