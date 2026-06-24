---
title: Run an LEZ Indexer
doc_type: procedure
product: lez
topics: lez
steps_layout: flat
authors: Pravdyvy, kashepavadan
owner: logos
doc_version: 1
slug: run-lez-indexer
---

# Run an LEZ Indexer

#### Get started with the LEZ Indexer and query finalized LEZ state over HTTP RPC.

The LEZ Indexer is a service that reads the finalized LEZ state from the Logos Blockchain node and exposes it over an HTTP RPC interface. Any application can use this interface to query blocks, transactions, and account state. This procedure walks you through running an LEZ Indexer locally alongside its dependencies, verifying it is indexing blocks, and querying account state through the RPC.

Before you start, make sure you have the following:

- Linux or macOS operating system
- [Docker](https://docs.docker.com/get-docker/) installed
- Rust 1.94.0 and `cargo` installed
- [`just`](https://github.com/casey/just) installed
- A local clone of the [LEZ repository](https://github.com/logos-blockchain/logos-execution-zone) and [wallet](../get-started/connect-wallet-cli-to-lez-testnet.md) set up
- A running [Logos Blockchain node](../../blockchain/get-started/run-a-logos-blockchain-node-from-cli.md) (if not deploying locally)
- Port `8779` free on your machine

## What to expect

- You can query finalized LEZ blockchain state including blocks, transactions, and accounts via HTTP RPC on `http://localhost:8779`.
- You have a running local stack with the Logos Blockchain node, LEZ Sequencer, and LEZ Indexer coordinated through `just` commands.
- You can verify indexer health and confirm it is progressing by calling the `getLastFinalizedBlockId` and `checkHealth` RPC methods.

## Start the LEZ stack and run the indexer

The indexer depends on the Logos Blockchain Node and benefits from an LEZ Sequencer running alongside it. For a local deployment, start each service in its own terminal.

1. In the LEZ repository, run `just clean` to remove any leftover artifacts from previous runs.

1. Replace the default value of `bedrock_config.addr` in `lez/indexer/service/configs/debug/indexer_config.json` with your Logos Blockchain endpoint and replace the default `channel_id` there with the LEZ's channel ID (ADD HERE IMPORTANT).

   For a local deployment, run the following commands in two separate terminal windows:

   ```sh
   # Run node, in terminal 1
   just run-bedrock
   ```

   ```sh
   # Terminal 2
   just run-sequencer
   ```

   - Test configs are located [here for the node](https://github.com/logos-blockchain/logos-execution-zone/tree/main/bedrock) and [here for the sequencer](https://github.com/logos-blockchain/logos-execution-zone/blob/main/lez/sequencer/service/configs/debug/sequencer_config.json).

1. In a third terminal window, start the LEZ Indexer:

   ```sh
   just run-indexer
   ```

   The indexer binds to `ws://localhost:8779` by default. At startup, you will see:

   ```
   [2026-06-18T14:21:59Z INFO  indexer_service] Starting Indexer Service RPC server on 0.0.0.0:8779
   [2026-06-18T14:21:59Z INFO  indexer_core] Starting indexer from beginning of channel
   ```

   The indexer then listens for block finalizations.

## Verify the indexer is progressing

1. Call `getLastFinalizedBlockId` to confirm the indexer is receiving blocks:

   ```sh
   curl -X POST http://localhost:8779 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"getLastFinalizedBlockId","params":[],"id":1}'
   ```

   You will receive a response similar to:

   ```sh
   {"jsonrpc":"2.0","id":1,"result":15}
   ```

   The `result` value should increase each time you repeat the call.

1. Run the health check to confirm the indexer can reconstruct the full state from the database:

   ```sh
   curl -X POST http://localhost:8779 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"checkHealth","params":[],"id":1}'
   ```

   A healthy indexer returns:

   ```sh
   {"jsonrpc":"2.0","id":1,"result":null}
   ```

   {% hint style="info" %}
   `checkHealth` reconstructs the full LEZ state from the database and can produce heavy disk usage. Run it sparingly.
   {% endhint %}

## Query account state using the wallet and RPC

1. In a fourth terminal window, query an account state by calling `getAccount` with the account ID:

   ```sh
   curl -X POST http://localhost:8779 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"getAccount","params":{"account_id":"2RHZhw9h534Zr3eq2RGhQete2Hh667foECzXPmSkGni2"},"id":1}'
   ```

   You will receive a response similar to:

   ```sh
   {"jsonrpc":"2.0","id":1,"result":{"program_owner":"FeYNA4PVvs1SsSuECrmQNnJqtB1jA6CbVBBSVGos7qcu","balance":20000,"data":"","nonce":1}}
   ```

1. Run `just run-wallet --help` to see all available wallet commands.

## Frequently asked questions

### Why is there a delay between sending a transaction and seeing it in the indexer?

The delay is caused by Logos Blockchain's block finality time. The indexer only processes finalized blocks from the L1 node, so transactions sent through the sequencer are not visible until the corresponding block is finalized. This is expected behavior.

### How do I change the indexer configuration?

The indexer config is located at [lez/indexer/service/configs/indexer_config.json](https://github.com/logos-blockchain/logos-execution-zone/blob/main/lez/indexer/service/configs/indexer_config.json). Two fields control connectivity:

- `bedrock_config` — the HTTP address of the Logos Blockchain node.
- `channel_id` — the channel that LEZ Sequencer writes into. This must match the sequencer you are using.
