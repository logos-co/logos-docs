---
title: Swap ETH and LEZ tokens in Logos Basecamp
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: [danisharora099]
owner: logos
doc_version: 1
slug: swap-eth-and-lez-tokens-in-logos-basecamp
sidebar_position: 3
---

# Swap ETH and LEZ tokens in Logos Basecamp

#### Install the atomic swap app from a catalogue URL and trade Sepolia ETH for LEZ testnet tokens with a counterparty you never have to trust.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

The atomic swap app is a Logos [Basecamp](../get-started/glossary.md#basecamp) app that trades tokens across two unrelated chains without an exchange, a bridge, or an escrow agent. This procedure takes you from a fresh Basecamp install to a completed swap against a live counterparty that Logos operates, ending with a receipt you can check on both chains' block explorers.

You install this app from a [catalogue](../get-started/glossary.md#catalogue) URL rather than building it. There's no repository to clone, no Nix, and no local chain. Version `0.4.4` also sets up both of your accounts inside the app: a guided **Setup** tab generates your Ethereum key, then creates, initialises, and funds your [LEZ](../get-started/glossary.md#lez) [account](../get-started/glossary.md#account) in [Step 2](#step-2-set-up-your-accounts). Nothing in this journey needs a command line.

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
- A small amount of **Sepolia ETH**, sent to the throwaway Ethereum address the app generates for you in [Step 2](#step-2-set-up-your-accounts). The trade itself costs `0.00001` ETH, so roughly `0.01` Sepolia ETH covers it and the gas comfortably.
    - You can obtain Sepolia ETH from any [public Sepolia faucet](https://ethereum.org/en/developers/docs/networks/). Most faucets just ask for the destination address, so you don't need a separate wallet app.
:::

## What to expect

- You can add a third-party catalogue to Basecamp and install an app from it.
- You can use the app's guided **Setup** tab to generate an Ethereum key and to create, initialise, and fund a LEZ account, with no command line and no hand-copied keys.
- You can take a live offer and complete a real cross-chain swap on public test networks.
- You can verify both legs of your swap independently on two block explorers.

## Step 1: Add the catalogue and install the app

Basecamp arrives with the official Logos catalogue configured, and it merges that built-in catalogue with any you add yourself. The atomic swap app is published from its own repository, so you add its catalogue first. A catalogue is a small JSON file naming an index of packages, and Basecamp re-reads it whenever the index changes.

1. In the sidebar, click **Package Manager**, then click **Manage Repositories** in the toolbar.

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

    **Expected:** two packages from the new repository, `swap` and `swap_ui`, both shown as **ETH ↔ LEZ Atomic Swap**, one of type `core` and one of type `ui_qml`.

1. Install `swap` first, then install `swap_ui`.

    Each opens an **Install Package?** dialogue listing any dependency changes. Confirm with **Install** and wait for the row's **Action** column to read **INSTALLED**.

    :::warning
    Install `swap` before `swap_ui`. The UI package declares a dependency on the backend, and taking them the other way round leaves the interface with no backend to talk to.
    :::

1. Restart Basecamp, then open **ETH ↔ LEZ Atomic Swap** from the sidebar.

    **Expected:** a row of six tabs across the top: **Market**, **Swap**, **History**, **Sell**, **Refund**, and **Setup**. Along the top you also get live `ETH` and `LEZ` balances and a status chip that settles on `Connected · <n> peers` once the app finds peers.

    On a fresh install, with nothing configured yet, the app opens on the **Setup** tab for you. That's the next step.

:::info
The catalogue is saved in your Basecamp settings and survives restarts. You add it once.
:::

## Step 2: Set up your accounts

A swap needs two identities: an Ethereum key to sign your Sepolia transactions, and an initialised LEZ account to receive your tokens. Version `0.4.4` builds both for you in the **Setup** tab—no command line, and no copying a raw private key between apps. Every field the tab fills is an ordinary **Config** field underneath, so nothing here is hidden from you.

On a fresh install the app opens on the **Setup** tab automatically. You can also reach it any time from the **Setup** tab at the right-hand end of the tab row.

:::info
The Ethereum key the app generates is a fresh, throwaway key. Fund it with Sepolia test ETH only, and never treat it as a wallet for real funds.
:::

1. Open the **Setup** tab.

    **Expected:** a page headed **Get set up**, subtitled `Four steps. No keys to type.`, with four numbered cards—**1. Ethereum key**, **2. LEZ account**, **3. Fund LEZ**, and **4. Get test ETH**. Each card's border turns green and its header gains a `done` label as you complete it.

1. Under **1. Ethereum key**, click **Generate a key**.

    **Expected:** the card shows `done` and displays **Your address** followed by a new `0x…` address, with a copy button beside it. The app stores the matching private key for you; you never see or paste it.

1. Send Sepolia ETH to that address from a public faucet.

    This is the one part that has to happen outside the app, because only you can fund your Ethereum address. It's the LEZ side, not this one, that the app funds for you in the next two cards, so you can send the Sepolia ETH now or while the LEZ funding runs. You'll need it before you take an offer in [Step 4](#step-4-take-a-live-offer).

    :::info
    Use the copy button beside the address to copy it exactly. Card **4. Get test ETH** also links a
    public Sepolia faucet and offers a **Copy faucet link** button.
    :::

1. Under **2. LEZ account**, click **Create an account**.

    **Expected:** the card shows `done` and displays **Your account** followed by your new [account](../get-started/glossary.md#account) ID. Nothing is on-chain yet—creating the account is local, and the next card is what puts it on-chain.

1. Under **3. Fund LEZ**, click **Add funds**.

    **Expected:** a status line appears with a live seconds counter. It initialises your account on-chain, then claims `150` LEZ from the [Piñata](../get-started/glossary.md#piñata) faucet. Each phase needs a proof-of-work solve and an on-chain commit, and testnet blocks can be a minute or more apart, so the counter keeps moving to show it isn't stuck. When it finishes, the card shows `done`, the button becomes **Add more**, and the status reads `LEZ funded - 150 LEZ - 1 claim confirmed`.

:::info
The **Add funds** button initialises the account for you, so you can't forget to. That matters because an uninitialised LEZ account is the most confusing failure in this app: the sequencer silently discards transactions that reference an account it has never seen initialised, so a swap simply stalls rather than failing. If a swap ever does nothing at all, re-running **Add funds** re-checks the initialisation.
:::

## Step 3: Confirm your configuration

Version `0.4.4` has no **Config** tab: the network endpoints ship pre-filled and the **Setup** tab
writes your keys for you, so there is nothing to enter by hand. Use the values in
[Networks and addresses](#networks-and-addresses) to check what the app is using.

1. Open the **Market** tab and click any offer.

1. In the detail pane on the right, confirm **ETH contract** reads `0x351B0E…0A5FAF` and
   **LEZ program** reads `9eb88f5…0ed702`. Both rows have copy buttons if you want to compare them
   in full.

1. Confirm the header shows your `ETH` and `LEZ` balances and the status chip reads
   `Connected · <n> peers`, and that the board's own chip reads `Ready to trade`.

:::info
The contract at `0x351B0EA07739FA9F6769213927D7836a790A5FAF` is version 2 of the Ethereum HTLC. Earlier builds of this app pointed at a version 1 contract at `0x8636Fe66DFee166589a913140f14d5F57394834A`, which is still deployed and still responds. It's written out in full here so you can check character by character that you aren't on it, because the two are easy to confuse and the failure is unhelpful. Version 1 has no `INTERFACE_VERSION` function, so the app's compatibility check reverts against it and swaps don't start.
:::

## Step 4: Take a live offer

Logos runs a maker on this testnet. It publishes offers and waits for someone to take them, which is what lets you complete this journey without a second machine and a friend.

1. Open the **Market** tab.

    **Expected:** a live tape with the columns `OFFER`, `RATE LEZ/ETH`, `SELLER`, `AGE`, and `EXPIRES`, and a `next scan` progress bar that rescans every few seconds.

    When our maker is online, it advertises `10 LEZ` for `0.00001 ETH`, and that's the offer the rest of this step follows. The board can also be legitimately empty, because offers are live broadcasts rather than stored listings. If you see no offers, work through [The Market tab is empty](#the-market-tab-is-empty) and come back.

1. Click the offer.

    **Expected:** a detail pane on the right reading **Buy 10 LEZ** `for 0.00001 ETH`, listing the maker's addresses, the hashlock, and both HTLC identifiers. You're buying the LEZ and paying the ETH.

1. Click **Accept—buy 10 LEZ**.

    If the button is disabled, the app shows why immediately beneath it, for example that the offer has expired.

1. Switch to the **Swap** tab and watch it run.

    **Expected:** the progress stepper ticks through `Generate Preimage`, `Lock ETH`, `ETH Locked`, `Wait for LEZ Lock`, `LEZ Lock Detected`, `Verify LEZ Escrow`, `LEZ Escrow Verified`, `Claim LEZ`, and `LEZ Claimed`. It usually takes one to three minutes, most of it waiting on Sepolia confirmations.

1. Click **Refresh** in the header and confirm your `LEZ` balance rose by `10`.

:::info
Offers are live announcements, not stored listings. Nothing retains them, so the **Market** tab can only show what a maker is broadcasting at that moment. The board says as much under the tape: `Offers are advertisements — a swap completes only if the seller is still online.`
:::

## Step 5: Read your receipt and verify it

Every finished swap writes a receipt recording both legs, so you can check the trade against the two chains instead of taking the app's word for it. Receipts persist across restarts.

1. Open the **History** tab and click your swap, then **Receipt ▾**.

    **Expected:** a card headed `SWAP COMPLETED` with the hero line **Bought 10 LEZ**, followed by labelled rows including **Hashlock**, **Preimage**, **ETH lock tx**, **LEZ claim tx**, **ETH HTLC contract**, and both time locks. The preimage stays masked behind a **Reveal** toggle.

1. On the **ETH lock tx** row, click **Copy explorer link**, then paste the link into your browser.

    **Expected:** the button confirms `Explorer link copied`, and Etherscan shows a successful transaction against the HTLC contract. The URL looks like `https://sepolia.etherscan.io/tx/0x…`.

1. Do the same on the **LEZ claim tx** row.

    **Expected:** the LEZ explorer shows the matching claim. The URL looks like `https://explorer.testnet.lez.logos.co/transaction/` followed by a 64-character hash with no `0x` prefix.

1. Compare the **Hashlock** on the receipt with the hashlock the offer advertised in [Step 4](#step-4-take-a-live-offer).

    They match, which is the point. The same hash bound both locks, and the preimage now published on the LEZ chain is what released both.

:::warning
A Basecamp app can't open your browser for you. Logos app interfaces run inside a sandboxed QML engine that silently ignores requests to open an external URL, as reported in [eth-lez-atomic-swaps#84](https://github.com/logos-co/eth-lez-atomic-swaps/issues/84). That's why the receipt offers **Copy value** and **Copy explorer link** buttons instead of clickable links, and why every instruction here says to paste the link into your browser yourself.
:::

Two rows are deliberately copy-only, with no explorer link. **ETH swap ID (lock)** is an identifier internal to the contract rather than a transaction hash, and **LEZ HTLC program** names a [program](../get-started/glossary.md#program) rather than a transaction. Keep the swap ID anyway. It's what the **Refund** tab asks for if a later swap stalls.

## Step 6: Send feedback

This app is a testnet preview, and the quickest way to improve it is to report what you hit.

On any receipt, click **Copy feedback link** and paste it into your browser. It opens a pre-structured feedback form on the app repository. Then click **Copy safe evidence** and paste that into the form. It gathers the hashes, addresses, and versions needed to trace your swap on both chains, and it deliberately leaves out your keys and preimage.

If you never got as far as a receipt, [open an issue](https://github.com/logos-co/eth-lez-atomic-swaps/issues/new) describing what you expected and what happened instead, with your platform and the `swap` and `swap_ui` versions from the **Package Manager**.

## Troubleshooting

### The app doesn't appear after installing it

Restart Basecamp. A newly installed app reaches the sidebar only after a restart. If it's still missing, check your platform: the catalogue publishes `darwin-arm64`, `linux-amd64`, and `linux-arm64` builds only, and Basecamp installs nothing at all on a platform with no matching build, which is what happens on Intel macOS.

### The Market tab is empty

Read the empty state, because it names the cause. A message about finishing setup means the **Setup** tab has not completed, so the app never subscribed to anything. `Connecting to the swap network…` means the app hasn't found a delivery peer yet, which usually resolves on its own within a minute. `No offers on the board yet` means you're connected and configured, and the maker is simply offline for the moment. Wait a few minutes and let the board rescan. Because nothing retains offers, the tab can only ever show what's being broadcast right now.

### The app can't connect to Ethereum

The bundled **RPC URL** begins with `wss://`, not `https://`. The app opens a WebSocket subscription to watch for lock and claim events, and an `https://` endpoint fails at that point even though it's perfectly valid for ordinary calls. The field's own hint says the same thing.

### The swap does nothing and no error appears

Your LEZ account is almost certainly uninitialised. The sequencer discards transactions for an account it has never seen initialised and returns no error, so the app has nothing to report. Open the **Setup** tab from [Step 2](#step-2-set-up-your-accounts) and click **Add more** again—it re-checks the on-chain initialisation and tops the balance back up. Confirm the balance is genuinely positive before retrying.

### The Swap tab reports `ETH lock rejected`

The maker refuses a lock that doesn't leave it enough time to respond, and the Ethereum contract enforces its own floor of 300 seconds. Your Ethereum deadline has to sit comfortably beyond the LEZ one, not just after it. This shows up when a swap is started against an offer that's nearly expired, so take a freshly published one. The maker keeps waiting rather than failing, so your **Swap** tab appears to stall.

### There isn't enough LEZ in the account

Open the **Setup** tab from [Step 2](#step-2-set-up-your-accounts) and click **Add more** again. Each run claims `150` LEZ from the Piñata faucet, so repeat it until the balance covers what you need.

### A swap stopped halfway and the funds are still locked

This is the case the time locks exist for, and no funds are at risk. Copy **ETH swap ID (lock)** from the receipt in the **History** tab, open the **Refund** tab, paste it into the **Swap ID** field under **ETH refund**, and click **Refund ETH** once your deadline has passed. The contract enforces that deadline, so an early attempt fails outright rather than passing silently. Reclaiming returns your ETH in full, less gas.

## Next steps

- [Install and load a module in Logos Basecamp](./install-and-load-a-module-in-logos-basecamp.md) explains how Basecamp packages, installs, and loads the [modules](../get-started/glossary.md#module) this app is built from.
- [Initiate native token transfers on the LEZ with the wallet UI](../lez/get-started/run-lez-wallet-ui-and-initiate-native-token-transfers.md) covers moving the LEZ tokens you just received.

To build the app from source, or run a swap headlessly from the command line, see the [eth-lez-atomic-swaps README](https://github.com/logos-co/eth-lez-atomic-swaps/blob/master/README.md).
