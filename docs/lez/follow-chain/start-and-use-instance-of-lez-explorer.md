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

The [LEZ](https://docs.logos.co/get-started/glossary#lez) Explorer lets you inspect the state of the [Logos Execution Zone](https://docs.logos.co/get-started/glossary#logos-execution-zone) in real time. This procedure walks you through starting all required services locally and using the Explorer UI to browse blocks, search transactions, and look up [account](https://docs.logos.co/get-started/glossary#account) balances. It is intended for developers working on testnet v0.2 who want to verify on-chain state or test wallet interactions.

{% hint style="info" %}
If you don't want to run your own LEZ explorer instance, navigate to the [public LEZ explorer](https://explorer.testnet.lez.logos.co/).
{% endhint %}

Before you start, make sure you have the following:

- Linux or macOS operating system
- [Docker](https://docs.docker.com/get-docker/), [Rust toolchain](https://www.rust-lang.org/tools/install), and `cargo` installed
- [`cargo-leptos`](https://crates.io/crates/cargo-leptos) installed
- [`just`](https://github.com/casey/just) installed
- A local clone of the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone/)
- A running instance of an [LEZ Indexer](run-lez-indexer.md)

## What to expect

- You can browse all committed blocks and click through to inspect individual block details.
- You can search for transactions and accounts and view their current state and balances.

## Start the LEZ Explorer

1. Navigate to your local clone of the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone/).
2.  In a new terminal window, start the LEZ Explorer:

    ```bash
    just run-explorer
    ```

    <div data-gb-custom-block data-tag="hint" data-style="info" class="hint hint-info"><p>By default, the LEZ Explorer connects to the LEZ Indexer at <code>http://localhost:8779</code>. Set the <code>INDEXER_RPC_URL</code> environment variable or pass <code>--indexer-rpc-url</code> to use a different address.</p></div>
3.  Open `http://localhost:3000/` in your browser.

    You will see a **No blocks found** message initially:

    ![No blocks found screen](../.gitbook/assets/no_blocks_found.png)

    After approximately one minute, refresh the page. Blocks will appear:

    ![Blocks visible after refresh](../.gitbook/assets/updated_page.png)

## Browse blocks, transactions, and accounts

1.  Click any block in the list to view its details.

    ![Block detail view](../.gitbook/assets/block_details.png)
2.  Use the search bar to look up a block, transaction, or account by ID.

    ![Transaction search result](../.gitbook/assets/transaction_details.png)

    ![Account detail view](../.gitbook/assets/account_details.png)

## Troubleshooting LEZ Explorer

### Why does the Explorer show "No blocks found" after startup?

Block production takes up to one minute after the stack starts. Refresh the page manually; live updates are not yet implemented.

### Why does LEZ Explorer fail to load block data?

Confirm that the LEZ Indexer is running and reachable. By default, the Explorer connects to `http://localhost:8779`. Check that `just run-indexer` is active in its terminal and that no firewall rule is blocking port `8779`.
