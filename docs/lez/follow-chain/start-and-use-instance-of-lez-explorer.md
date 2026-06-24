---
title: Start and use an instance of the LEZ Explorer
doc_type: procedure
product: lez
topics: lez
steps_layout: flat
authors: arjentix, kashepavadan
owner: logos
doc_version: 1
slug: start-and-use-instance-of-lez-explorer
---

# Start and use an instance of the LEZ Explorer

#### Get a clear view of on-chain activity including blocks, transactions, and accounts.

The LEZ Explorer lets you inspect the state of the Logos Execution Zone in real time. This procedure walks you through starting all required services locally and using the Explorer UI to browse blocks, search transactions, and look up account balances. It is intended for developers working on testnet v0.2 who want to verify on-chain state or test wallet interactions.

{% hint style="info" %}
Live block updates are not implemented. Refresh the page manually to see new blocks after they are produced.
{% endhint %}

Before you start, make sure you have the following:

- Linux or macOS operating system
- [Docker](https://docs.docker.com/get-docker/), [Rust toolchain](https://www.rust-lang.org/tools/install), and `cargo` installed
- [`cargo-leptos`](https://crates.io/crates/cargo-leptos) installed
- [`just`](https://github.com/casey/just) installed
- A local clone of the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone/)
- A running instance of an [LEZ Indexer](./run-lez-indexer.md)

## What to expect

- You can browse all committed blocks and click through to inspect individual block details.
- You can search for transactions and accounts and view their current state and balances.

## Start the LEZ Explorer

1. Navigate to your local clone of the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone/).

1. In a new terminal window, start the LEZ Explorer:

   ```bash
   just run-explorer
   ```

   {% hint style="info" %}
   By default, the LEZ Explorer connects to the LEZ Indexer at `http://localhost:8779`. Set the `INDEXER_RPC_URL` environment variable or pass `--indexer-rpc-url` to use a different address.
   {% endhint %}

1. Open `http://localhost:3000/` in your browser.

   You will see a **No blocks found** message initially:

   ![No blocks found screen](./start-and-use-instance-of-lez-explorer/no_blocks_found.png)

   After approximately one minute, refresh the page. Blocks will appear:

   ![Blocks visible after refresh](./start-and-use-instance-of-lez-explorer/updated_page.png)

## Browse blocks, transactions, and accounts

1. Click any block in the list to view its details.

   ![Block detail view](./start-and-use-instance-of-lez-explorer/block_details.png)

1. Use the search bar to look up a block, transaction, or account by ID.

   ![Transaction search result](./start-and-use-instance-of-lez-explorer/transaction_details.png)

   ![Account detail view](./start-and-use-instance-of-lez-explorer/account_details.png)

## Troubleshooting LEZ Explorer

### Why does the Explorer show "No blocks found" after startup?

Block production takes up to one minute after the stack starts. Refresh the page manually; live updates are not yet implemented.

### Why does LEZ Explorer fail to load block data?

Confirm that the LEZ Indexer is running and reachable. By default, the Explorer connects to `http://localhost:8779`. Check that `just run-indexer` is active in its terminal and that no firewall rule is blocking port `8779`.
