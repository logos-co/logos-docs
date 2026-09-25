---
title: Swap ETH and LEZ tokens in Logos Basecamp
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: [danisharora099]
owner: logos
doc_version: 1
slug: atomic-swaps-poc
sidebar_position: 3
---

# Swap ETH and LEZ tokens in Logos Basecamp

#### Install the atomic swap app from a catalogue URL and trade Sepolia ETH for LEZ testnet tokens with a counterparty you never have to trust.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

The atomic swap app is a Logos [Basecamp](../get-started/glossary.md#basecamp) app that trades tokens across two unrelated chains without an exchange, a bridge, or an escrow agent. This procedure takes you from a fresh Basecamp install to a completed swap against a live counterparty that Logos operates, ending with a receipt you can check on both chains' block explorers.

You install this app from a [catalogue](../get-started/glossary.md#catalogue) URL rather than building it. There's no repository to clone, no Nix, and no local chain. The app also sets up both of your accounts for you: a guided **Setup** tab generates your Ethereum key, then creates and activates your [LEZ](../get-started/glossary.md#lez) [account](../get-started/glossary.md#account), and finishes by pointing you at a faucet for the Sepolia gas it can't fetch on your behalf, all in [Step 2](#step-2-set-up-your-accounts). You don't need to hold any LEZ before you start, because buying LEZ is what this app is for. Nothing in this journey needs a command line.

## Networks and addresses

The app ships with these values already filled in. They're listed here so you can check them, and so you can restore one if you change it by mistake.

| Setting | Value |
|:--|:--|
| Catalogue URL | `https://raw.githubusercontent.com/logos-co/eth-lez-atomic-swaps/master/logos-repo.json` |
| Ethereum RPC | `wss://ethereum-sepolia-rpc.publicnode.com` |
| Ethereum HTLC contract, on Sepolia | `0x351B0EA07739FA9F6769213927D7836a790A5FAF` |
| LEZ sequencer | `https://testnet.lez.logos.co` |
| LEZ HTLC program | `9eb88f51aae87a58fb74b8d2dc7327b39333585e63280e3f9cf8d86dac0ed702` |
| Ethereum explorer | `https://sepolia.etherscan.io/tx/<TX_HASH>` |
| LEZ explorer | `https://explorer.testnet.lez.logos.co/transaction/<TX_HASH>` |

:::warning
The Ethereum RPC must use the `wss://` scheme. The app subscribes to contract events over a WebSocket, so an `https://` URL fails to connect even though the same host serves ordinary calls happily.
:::

## How an atomic swap works

A swap is a trade between two people who have no reason to trust each other. One holds LEZ testnet tokens, the other holds Sepolia ETH, and neither wants to send first. An atomic swap removes that problem: either both transfers happen, or neither does.

The mechanism is a hash time-locked contract, or HTLC. Your app invents a random secret, called a preimage, and locks your ETH in a contract on Sepolia that releases only to whoever presents that secret. Your counterparty sees the lock and makes a matching lock of their LEZ against the *hash* of the same secret. You then claim their LEZ, which publishes the secret on the LEZ chain as a side effect. Your counterparty reads it there and uses it to claim your ETH. Both legs settle, and neither of you ever handed over funds on trust.

The time locks make the failure case safe. Each lock carries a deadline, and yours is deliberately the longer of the two, so you always have time to react to whatever your counterparty does. If they vanish after you lock, nothing is lost. You wait for your deadline to pass and take your own funds back from the **Refund** tab. In the offer you'll take below, the LEZ side expires after 20 minutes and your Ethereum side after 40.

:::info[Prerequisites]

- [Basecamp installed and running](./install-logos-basecamp.md).
- Internet access.
- A small amount of **Sepolia ETH**, sent to the throwaway Ethereum address the app generates for you in [Step 2](#step-2-set-up-your-accounts). The trade itself costs `0.00001` ETH, so roughly `0.01` Sepolia ETH covers it and the gas comfortably. The app can activate your LEZ account for you but cannot fund your Ethereum side, so this part is genuinely required: without it you cannot complete a swap.
    - **Setup** offers `https://sepolia-faucet.pk910.de/` for this, and any other [public Sepolia faucet](https://ethereum.org/en/developers/docs/networks/) works too. Most faucets just ask for the destination address, so you don't need a separate wallet app.
- **No LEZ.** You don't need any to take the offer in this procedure: the LEZ network charges no fees, so a buyer can start from an empty LEZ balance and acquire LEZ from the market. Selling LEZ is the case that needs a balance up front, and [Get test LEZ without trading](#get-test-lez-without-trading) covers it.
:::

## What to expect

- You can add a third-party catalogue to Basecamp and install an app from it.
- You can use the app's guided **Setup** tab to generate an Ethereum key, to create and activate a LEZ account, and to get that Ethereum key funded, with no command line and no hand-copied keys.
- You can take a live offer and complete a real cross-chain swap on public test networks.
- You can verify both legs of your swap independently on two block explorers.

## Step 1: Add the catalogue and install the app

Basecamp arrives with the official Logos catalogue configured, and it merges that built-in catalogue with any you add yourself. The atomic swap app is published from its own repository, so you add its catalogue first. A catalogue is a small JSON file naming an index of packages, and Basecamp re-reads it whenever the index changes.

1. In the sidebar, click **Package Manager**, then click **Repositories** in the toolbar.

    This opens **Settings** at the **Package Repositories** page, which lists the repositories you're drawing packages from.

1. Under **Add a repository**, paste this URL into the field and click **Add**:

    ```text
    https://raw.githubusercontent.com/logos-co/eth-lez-atomic-swaps/master/logos-repo.json
    ```

    **Expected:** a repository named **ETH ↔ LEZ Atomic Swaps** joins the list, alongside the built-in one marked `Default`. No restart is needed. Basecamp re-reads the catalogue as soon as the repository is added.

    :::info
    If the new row shows an `Unreachable` badge, the URL is wrong or your network blocked the request. Click **Refresh** to retry. The field expects the URL of a `logos-repo.json` index, not a link to the repository's web page.
    :::

1. Go back to **Package Manager** and search for `swap`.

    **Expected:** two packages from the new repository, `swap` and `swap_ui`, both shown as **ETH ↔ LEZ Atomic Swap** and both at the same version. The catalogue always serves the current release, so take whatever version it offers rather than looking for a particular number.

1. Install `swap` first, then install `swap_ui`.

    Each opens an **Add Application** window listing **Required Packages**. Confirm with **Install** and wait for the stage label to reach `Installed`.

    :::warning
    Install `swap` before `swap_ui`. The UI package declares a dependency on the backend, and taking them the other way round leaves the interface with no backend to talk to.
    :::

1. Restart Basecamp, then open **ETH ↔ LEZ Atomic Swap** from the sidebar.

    **Expected:** a row of six tabs across the top: **Market**, **Swap**, and **History**, then, after a divider, **Sell**, **Refund**, and **Setup**. Beneath the tabs runs a strip with your `ETH` and `LEZ` addresses and balances, which keep themselves up to date, and a connection chip that settles on `Connected` once the app finds a peer, gaining a peer count—`Connected · 1 peer` and up—as it counts them.

    On a fresh install, with nothing configured yet, the app opens on the **Setup** tab for you. That's the next step.

:::info
The catalogue is saved in your Basecamp settings and survives restarts. You add it once.
:::

## Step 2: Set up your accounts

A swap needs two identities: an Ethereum key to sign your Sepolia transactions, and an activated LEZ account to receive your tokens. Setup doesn't hand you LEZ, and doesn't need to: you buy that on the **Market** tab in [Step 4](#step-4-take-a-live-offer). The app builds both identities for you in the **Setup** tab, with no command line and no copying a raw private key between apps. Every field the tab fills is an ordinary configuration field underneath, listed in the tab's own **Advanced settings** section, so nothing here is hidden from you.

On a fresh install the app opens on the **Setup** tab automatically. You can also reach it any time from the **Setup** tab at the right-hand end of the tab row.

:::info
The Ethereum key the app generates is a fresh, throwaway key. Fund it with Sepolia test ETH only, and never treat it as a wallet for real funds.
:::

1. Open the **Setup** tab.

    **Expected:** a page headed **Get set up**, subtitled `Four steps, then you're trading. No keys to type.`, with four numbered sections: **1. Ethereum key**, **2. LEZ account**, **3. Activate your LEZ account**, and **4. Get test ETH**. Each section's border turns green and its heading gains a `done` marker as you complete it.

    Below them sits an unnumbered **Start trading** card. It isn't a step, because it asks nothing of you; it's the handoff to the market, and it stays dimmed until the four above it are done. Two collapsed sections follow it: **Get test LEZ without trading**, described in [Get test LEZ without trading](#get-test-lez-without-trading) below, and **Advanced settings**, checked in [Step 3](#step-3-confirm-your-configuration).

1. Under **1. Ethereum key**, click **Generate a key**.

    **Expected:** the section shows `done` and displays **Your address** followed by a new `0x…` address, with a copy button beside it. The app writes the matching private key straight into your configuration; you never see or paste it.

1. Under **2. LEZ account**, click **Create an account**.

    **Expected:** the section shows `done` and displays **Your account** followed by your new [account](../get-started/glossary.md#account) ID. Nothing has reached the network yet. Creating the account is local, and the next section is what registers it.

1. Under **3. Activate your LEZ account**, click **Activate account**.

    Activation registers your account on the LEZ network so it can receive the tokens you buy. It's free, it's a single transaction, and it's the one step a buyer can't skip. It doesn't give you any LEZ and doesn't need to: you get that from the market in [Step 4](#step-4-take-a-live-offer).

    **Expected:** the button changes to **Activating…** and a status line appears with a live seconds counter, reading `Setting up your account on the network…` and then saying it's waiting for the network to confirm. Test-network blocks can be a minute or more apart, so the counter keeps moving to show it isn't stuck. When it finishes, the section shows `done`, the status line reads `Account set up on the network`, and the button becomes **Check again**.

1. Under **4. Get test ETH**, copy the address shown under **Send it here** and send Sepolia ETH to it.

    This is the one part that has to happen outside the app, because only you can fund your Ethereum address. The section names a faucet, `https://sepolia-faucet.pk910.de/`, behind a **Copy faucet link** button; Basecamp can't open it for you, so paste it into your browser yourself. Any other public Sepolia faucet works just as well.

    **Expected:** while you wait, the section reads `Watching for it… you don't need to do anything.` and polls for the balance on its own. Once the ETH lands it shows `done` and a line reading `Arrived —` followed by the amount.

1. Under **Start trading**, click **Go to Market**.

    The button only enables once both **3. Activate your LEZ account** and **4. Get test ETH** are done, because a swap needs an activated account for the LEZ to land in and Sepolia ETH to pay the gas with. Until then the card tells you so: `Once you've activated your LEZ account (step 3) and test-ETH has landed, this is where you head to the market.`

:::info
Activation gets a step of its own because a LEZ account that was never activated is the most confusing failure in this app: the sequencer silently discards transactions that reference an account it has never seen initialised, so a swap simply stalls rather than failing. The app doesn't remember between launches whether your account is registered, so it always asks the network rather than guessing. If you set this account up in an earlier session, press **Activate account** anyway. It checks first and confirms in about a second without sending anything, and the same is true of **Check again** afterwards, which is the button to press if a swap ever does nothing at all.
:::

### Get test LEZ without trading

Below **Start trading**, the **Setup** tab carries a collapsed section labelled **Get test LEZ without trading**. It's a secondary path rather than one of the four steps, and you can finish this whole procedure without opening it.

You don't need it to buy LEZ. Buying is what the app is for: you pay Sepolia ETH on the **Market** tab and the LEZ arrives. An empty LEZ balance is fine, because the LEZ network charges no fees.

You do need it to *sell* LEZ, because a sell offer has to be backed by LEZ you already hold, and on a test network the only other source is the [Piñata](../get-started/glossary.md#piñata) faucet. Expand the section and click **Claim test LEZ** to claim up to `150` LEZ per run. Each claim solves a small proof-of-work puzzle and then waits for the network, so it can take a few minutes, and the collapsed header carries a `claiming…`, `claimed`, or `claim failed` badge so folding the section away never loses track of one. A claim needs the account from **2. LEZ account** to arrive in, and it changes none of the numbered steps.

## Step 3: Confirm your configuration

**Advanced settings**, at the foot of the **Setup** tab, holds every endpoint, address, and key the app uses, grouped under **Ethereum**, **LEZ**, **Swap Parameters**, and **Developer**. It is the former **Config** tab, folded into **Setup** so there is one place to set the app up rather than two. After the guided sections above it, the key fields are already filled and the network values ship pre-filled, so this step is a check rather than a data-entry exercise. You can skip it and still complete a swap; it's here so you can see what **Setup** did and confirm nothing is off.

1. Open the **Setup** tab and expand **Advanced settings**.

1. Under **Ethereum**, confirm **RPC URL** is `wss://ethereum-sepolia-rpc.publicnode.com` and **HTLC Contract Address** is `0x351B0EA07739FA9F6769213927D7836a790A5FAF`.

1. Still under **Ethereum**, confirm **Private Key** and **Recipient Address** are populated. The guided sections filled both from the key they generated in [Step 2](#step-2-set-up-your-accounts). **Recipient Address** is where your bought tokens' counterpart settles, so it's the address belonging to that same key.

1. Under **LEZ**, confirm **Sequencer URL** is `https://testnet.lez.logos.co` and **HTLC Program ID** is `9eb88f51aae87a58fb74b8d2dc7327b39333585e63280e3f9cf8d86dac0ed702`.

1. Still under **LEZ**, confirm **Signing Key** is populated. The guided sections filled it from the LEZ account they created in [Step 2](#step-2-set-up-your-accounts).

    Leave **Wallet Home**, **Wallet Account ID**, and **Sell to one buyer only (optional)** empty. The app authenticates to the LEZ with the signing key, so the wallet fields aren't needed. **Sell to one buyer only (optional)** is a seller-side setting—the one account you'd allow to take your offers—and buying doesn't need it. **Wallet Home**'s placeholder, `.scaffold/wallet`, is a path from the app's development setup that doesn't exist on a machine that installed from the catalogue.

1. Leave **Swap Parameters** alone.

    These set the terms of offers you'd publish as a seller. When you take someone else's offer, the amounts and time locks come from that offer instead.

1. Leave **Developer** alone too.

    Its two buttons load credentials from a `.env` file next to a source checkout, which a catalogue install doesn't have.

**Expected:** no red text under any field, and the **Market** tab's readiness chip reads `Ready to trade`. There's no save button. The app validates and saves as you type.

If a field is wrong, the app says so directly underneath it, with messages like `Required`, `Must be a 20-byte ETH address`, or `Must be a 32-byte hex program ID`. Fix those before continuing, because the app refuses to start a swap while any remain.

:::info
The contract at `0x351B0EA07739FA9F6769213927D7836a790A5FAF` is version 2 of the Ethereum HTLC. Earlier builds of this app pointed at a version 1 contract at `0x8636Fe66DFee166589a913140f14d5F57394834A`, which is still deployed and still responds. It's written out in full here so you can check character by character that you aren't on it, because the two are easy to confuse and the failure is unhelpful. Version 1 has no `INTERFACE_VERSION` function, so the app's compatibility check reverts against it and swaps don't start. If you've used this app before, replace the address with the one above.
:::

## Step 4: Take a live offer

Logos runs a maker on this testnet. It publishes offers and waits for someone to take them, which is what lets you complete this journey without a second machine and a friend.

1. Open the **Market** tab.

    **Expected:** a header reading `LIVE MARKET` with a count of the offers on the board, and a live tape with the columns `OFFER`, `RATE LEZ/ETH`, `SELLER`, `AGE`, and `EXPIRES`. A `next scan` bar beside the header drains between scans; the board rescans every two seconds by default.

    When our maker is online, it advertises `10 LEZ` for `0.00001 ETH`, and that's the offer the rest of this step follows. The board can also be legitimately empty, because offers are live broadcasts rather than stored listings. If you see no offers, work through [The Market tab is empty](#the-market-tab-is-empty) and come back.

1. Click the offer.

    **Expected:** a detail pane on the right reading **Buy 10 LEZ** `for 0.00001 ETH`, with the rate beneath it, then both time locks and the rows **Seller ETH address**, **Seller LEZ account**, **Hashlock**, **LEZ program**, and **ETH contract**. You're buying the LEZ and paying the ETH.

1. Click the button reading `Accept — buy 10 LEZ`.

    If the button is disabled, the app shows why immediately beneath it, such as `Finish setting up first — open Setup` or `This offer has expired`.

1. Switch to the **Swap** tab and watch it run.

    **Expected:** the progress stepper ticks through `Generate your secret`, `Lock your ETH`, `Your ETH is locked`, `Wait for the seller`, `Seller locked their LEZ`, `Check the escrow`, `Escrow checks out`, `Claim your LEZ`, and `LEZ claimed`. It usually takes one to three minutes, most of it waiting on Sepolia confirmations.

1. Confirm the `LEZ` balance in the strip beneath the tabs has risen by `10`. It refreshes itself, so there's nothing to click.

:::info
Offers are live announcements, not stored listings. Nothing retains them, so the **Market** tab can only show what a maker is broadcasting at that moment. The board says as much under the tape: `Offers are advertisements — a swap completes only if the seller is still online.`
:::

## Step 5: Read your receipt and verify it

Every finished swap writes a receipt recording both legs, so you can check the trade against the two chains instead of taking the app's word for it. Receipts persist across restarts.

1. Open the **History** tab and click your swap, then **Receipt ▾**.

    **Expected:** a card headed `SWAP COMPLETED` with the hero line **Bought 10 LEZ**, followed by labelled rows including **Hashlock**, **Preimage**, **ETH lock tx**, **LEZ claim tx**, **ETH HTLC contract**, and both time locks. The preimage stays masked behind a **Reveal** toggle.

1. On the **ETH lock tx** row, click the **↗** button, which copies a block-explorer link, then paste that link into your browser.

    **Expected:** the button becomes a **✓**, and Etherscan shows a successful transaction against the HTLC contract. The URL looks like `https://sepolia.etherscan.io/tx/0x…`.

1. Do the same on the **LEZ claim tx** row.

    **Expected:** the LEZ explorer shows the matching claim. The URL looks like `https://explorer.testnet.lez.logos.co/transaction/` followed by a 64-character hash with no `0x` prefix.

1. Compare the **Hashlock** on the receipt with the hashlock the offer advertised in [Step 4](#step-4-take-a-live-offer).

    They match, which is the point. The same hash bound both locks, and the preimage now published on the LEZ chain is what released both.

:::warning
A Basecamp app can't open your browser for you. Logos app interfaces run inside a sandboxed QML engine that silently ignores requests to open an external URL, as reported in [eth-lez-atomic-swaps#84](https://github.com/logos-co/eth-lez-atomic-swaps/issues/84). That's why every row on the receipt carries copy buttons instead of clickable links—**⧉** for the value itself, **↗** for a block-explorer link—and why every instruction here says to paste the link into your browser yourself.
:::

Two rows are deliberately copy-only, with no explorer link. **ETH swap ID (lock)** is an identifier internal to the contract rather than a transaction hash, and **LEZ HTLC program** names a [program](../get-started/glossary.md#program) rather than a transaction. Keep the swap ID anyway. It's what the **Refund** tab asks for if you ever have to claim back a swap this install has no record of.

## Step 6: Send feedback

This app is a testnet preview, and the quickest way to improve it is to report what you hit.

On any receipt, click **Copy feedback link** and paste it into your browser. It opens a pre-structured feedback form on the app repository. Then click **Copy safe evidence** and paste that into the form. It gathers the chain ID, the transaction hashes, and the explorer links needed to trace your swap on both chains, and it deliberately leaves out your keys, your preimage, the hashlock, and your addresses.

If you never got as far as a receipt, [open an issue](https://github.com/logos-co/eth-lez-atomic-swaps/issues/new) describing what you expected and what happened instead, with your platform and the `swap` and `swap_ui` versions from the **Package Manager**.

## Troubleshooting

### The app doesn't appear after installing it

Restart Basecamp. A newly installed app reaches the sidebar only after a restart. If it's still missing, check your platform: the catalogue publishes `darwin-arm64`, `linux-amd64`, and `linux-arm64` builds only, and Basecamp installs nothing at all on a platform with no matching build, which is what happens on Intel macOS.

### The Market tab is empty

Read the empty state, because it names the cause. `Finish network setup to browse` means your configuration isn't valid yet, so the app never subscribed to anything. `Connecting to the swap network…` means the app hasn't found a delivery peer yet, which usually resolves on its own within a minute. `No offers on the board yet` means you're connected and configured, and the maker is simply offline for the moment. `Connected, but nobody else is` means the opposite problem: you're on the swap network but attached to no peers, so no offer can reach you—it usually clears on its own, and if it doesn't, check for a module update in Basecamp and restart it. Wait a few minutes and let the board rescan. Because nothing retains offers, the tab can only ever show what's being broadcast right now.

### The app can't connect to Ethereum

Check **RPC URL** begins with `wss://` and not `https://`. The app opens a WebSocket subscription to watch for lock and claim events, and an `https://` endpoint fails at that point even though it's perfectly valid for ordinary calls. The field's own hint says the same thing.

### The swap does nothing and no error appears

Your LEZ account almost certainly isn't activated. The sequencer discards transactions for an account it has never seen initialised and returns no error, so the app has nothing to report. Open the **Setup** tab from [Step 2](#step-2-set-up-your-accounts) and press the button under **3. Activate your LEZ account** again. It re-checks the registration against the network, and confirms in about a second if the account was already fine.

### The swap stalls on `Wait for the seller`

The maker refuses a lock that doesn't leave it enough time to respond, and the Ethereum contract enforces its own floor of 300 seconds. Your Ethereum deadline has to sit comfortably beyond the LEZ one, not just after it. This shows up when a swap is started against an offer that's nearly expired, so take a freshly published one. The maker keeps waiting rather than reporting a failure, so your **Swap** tab appears to stall instead of showing an error.

### There isn't enough LEZ in the account

Check first that this is really your problem. Taking an offer needs no LEZ at all, so if you're following this page as a buyer, an empty balance isn't what's stopping you. If you're publishing sell offers instead, expand **Get test LEZ without trading** on the **Setup** tab and click **Claim test LEZ**. Each run claims up to `150` LEZ from the Piñata faucet, so repeat it until the balance covers what you need.

### Setup shows a `Fund LEZ` step instead

You're on an older build, or on one launched with the developer override that restores the previous screens. Up to `swap_ui` `0.4.5`, step 3 both activated the account and claimed `150` LEZ from the faucet, and **Start trading** was numbered as a fifth step. That flow still works, and everything else on this page still applies to it, but the faucet claim is no longer part of getting set up. Update `swap` and `swap_ui` from the **Package Manager** to get the four-step flow this page describes.

### A swap stopped halfway and the funds are still locked

This is the case the time locks exist for, and no funds are at risk. Open the **Refund** tab: a **Ready to claim back** card carries the **Hashlock** and **Swap ID** from your most recent swap, already filled in, so click **Get my ETH back** once your deadline has passed. For an older swap, expand **Enter a refund by hand (advanced)**, copy **ETH swap ID (lock)** from its receipt in the **History** tab, and paste it into **Swap ID** under **Get ETH back**. The contract enforces the deadline, so an early attempt fails outright rather than passing silently. Reclaiming returns your ETH in full, less gas.

## Next steps

- [Install and load a module in Logos Basecamp](./install-and-load-a-module-in-logos-basecamp.md) explains how Basecamp packages, installs, and loads the [modules](../get-started/glossary.md#module) this app is built from.
- [Initiate native token transfers on the LEZ with the wallet UI](../lez/get-started/run-lez-wallet-ui-and-initiate-native-token-transfers.md) covers moving the LEZ tokens you just received.

To build the app from source, or run a swap headlessly from the command line, see the [eth-lez-atomic-swaps README](https://github.com/logos-co/eth-lez-atomic-swaps/blob/master/README.md).
