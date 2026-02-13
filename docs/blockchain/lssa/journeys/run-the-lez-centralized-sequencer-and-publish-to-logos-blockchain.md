# Run the LEZ centralized sequencer and publish to Logos Blockchain

Applies to: https://github.com/logos-blockchain/lssa@main (Bedrock node image: ghcr.io/logos-blockchain/logos-blockchain@sha256:000982e751dfd346ca5346b8025c685fc3abc585079c59cde3bde7fd63100657)  
Runtime target: local (Docker Compose “all-in-one” stack that runs Bedrock + sequencer + indexer + explorer)  
Last checked: 2026-02-13  
Status: Stub  
Owner: @moudyellaz  
Tracking: https://github.com/logos-co/logos-docs/issues/172 (Testnet v0.1 – Docs in scope.xlsx: journey #7)  

## Outcome + value

- Outcome (end goal): Run the LEZ centralized sequencer locally, accept transactions, and publish LEZ blocks to a local Logos Blockchain (Bedrock) node.
- Why it matters: Demonstrates the Testnet v0.1 “centralized sequencer → settle on Logos Blockchain” pipeline end-to-end (sequencing, settlement, indexing, and block viewing).

## Audience

- developer
- tester

## Prerequisites

- OS: UNKNOWN (examples assume a Unix-like environment; Docker path should work anywhere Docker runs)
- Dependencies:
  - Docker Engine + Docker Compose v2 (you can run `docker compose ...`)
  - Git
  - Optional (only if you build/run wallet from source): Rust toolchain + Cargo
- Accounts/keys:
  - For local testing, use the sample wallet config in `wallet/configs/debug/` (no external keys required).
- Network/chain (local endpoints):
  - Bedrock (Logos Blockchain node): http://localhost:18080
  - Sequencer JSON-RPC: http://localhost:3040
  - Indexer JSON-RPC: http://localhost:8779
  - Explorer UI: http://localhost:8080
- Other:
  - Docker disk space: lssa README recommends Docker `defaultKeepStorage` ≥ 25GB when building images locally (otherwise builds/pulls may fail or be painfully slow).

## Hardware requirements

- Target devices: x86_64 computer (RPi/ARM support UNKNOWN)
- Minimum: UNKNOWN
- Recommended: UNKNOWN
- Storage profile: UNKNOWN (expect Docker images + volumes to grow; exact growth UNKNOWN)

## Configuration

- Env vars:
  - `NSSA_WALLET_HOME_DIR=$(pwd)/wallet/configs/debug` — tells the local wallet CLI where to read `wallet_config.json` (and where it stores `storage.json`)
  - `RUST_LOG=...` — optional; enables more verbose logs for Rust binaries (purpose: debugging)
  - `RISC0_DEV_MODE=1` — used in repo examples for faster local proving/dev-mode when running components outside Docker (exact necessity for Docker path: UNKNOWN)

- Flags:
  - `docker compose up --build` — start the local stack (build images on first run)
  - `cargo run -p wallet -- <subcommand>` — run the wallet CLI from the workspace

- Config file keys:
  - `configs/docker-all-in-one/sequencer/sequencer_config.json`
    - `port=3040` — sequencer JSON-RPC port
    - `bedrock_config.node_url=http://logos-blockchain-node-0:18080` — where sequencer publishes blocks
    - `bedrock_config.channel_id=0101...0101` — inscription channel the sequencer writes to
    - `indexer_rpc_url=ws://indexer_service:8779` — websocket endpoint the sequencer uses to connect to the indexer RPC service
  - `configs/docker-all-in-one/indexer/indexer_config.json`
    - `bedrock_client_config.addr=http://logos-blockchain-node-0:18080` — where the indexer reads finalized blocks from
    - `channel_id=0101...0101` — inscription channel the indexer reads from
  - `wallet/configs/debug/wallet_config.json`
    - `sequencer_addr=http://127.0.0.1:3040` — wallet sends transactions to the local sequencer

- Default endpoints/ports:
  - `18080/tcp` — Bedrock node RPC (host-mapped in docker-compose.override)
  - `3040/tcp` — sequencer JSON-RPC (host-mapped)
  - `8779/tcp` — indexer JSON-RPC (host-mapped)
  - `8080/tcp` — explorer UI (host-mapped)

## Steps (happy path)

1. Clone and enter the repo:

   ```sh
   git clone https://github.com/logos-blockchain/lssa
   cd lssa
   ```

2. Start the full local stack:

   ```sh
   docker compose up --build
   ```

3. Confirm the sequencer RPC is reachable:

   ```sh
   curl http://localhost:3040 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"hello","params":{},"id":1}'
   ```

4. Confirm the indexer RPC is reachable:

   ```sh
   curl http://localhost:8779 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"get_schema","params":{},"id":1}'
   ```

5. Build and run the wallet CLI (local testing):

   ```sh
   export NSSA_WALLET_HOME_DIR="$(pwd)/wallet/configs/debug"
   cargo run -p wallet -- account list --long
   ```

6. (If needed) initialize Authenticated Transfer program accounts (choose a Public/<...> account_id you own):

   ```sh
   cargo run -p wallet -- auth-transfer init --account_id Public/<YOUR-ACCOUNT-ID>
   ```

7. Send a transfer transaction (public → public):

   ```sh
   cargo run -p wallet -- auth-transfer send \
     --from Public/<FROM-ACCOUNT-ID> \
     --to Public/<TO-ACCOUNT-ID> \
     --amount 1
   ```

8. Verify blocks were indexed from Bedrock (this is your “published to Logos Blockchain” signal):

   ```sh
   curl http://localhost:8779 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"getBlocks","params":[0,10],"id":1}'
   ```

## Expected outputs

- After step 2: Docker containers are running and logs are streaming; you can reach:

  - Explorer UI at [http://localhost:8080](http://localhost:8080)
  - Sequencer RPC at [http://localhost:3040](http://localhost:3040)
  - Indexer RPC at [http://localhost:8779](http://localhost:8779)
- After step 3: JSON-RPC response (HTTP 200) from the sequencer (exact payload UNKNOWN).
- After step 5: a list of wallet-owned accounts; with `--long` you should see detailed account info (exact formatting UNKNOWN).
- After step 7: the wallet prints a transaction hash/identifier or a success indicator (exact output UNKNOWN).
- After step 8: JSON-RPC response where `result` is a list (expected to be non-empty once blocks are finalized and indexed).

## Verify

- Command:

  ```sh
  curl http://localhost:8779 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"getBlocks","params":[0,10],"id":1}'
  ```

- Expected:

  ```sh
  - HTTP 200 JSON-RPC response
  - "result" is present and contains one or more blocks (after you have sent at least one transaction)
  ```

## Troubleshooting (top 3-5)

- Symptom: `docker compose up --build` fails partway through image build/pull, or repeatedly evicts layers.
  Cause: Docker storage budget too small.
  Fix/workaround: Increase Docker’s storage budget; lssa README recommends `defaultKeepStorage` ≥ 25GB.

- Symptom: `curl http://localhost:3040 ... hello` fails / connection refused.
  Cause: sequencer container not up yet, crashed, or port 3040 already in use on the host.
  Fix/workaround: Check container status/logs; free the port or adjust host port mapping.

- Symptom: Wallet fails with “Could not fetch config path” / “wallet_config.json not found”.
  Cause: `NSSA_WALLET_HOME_DIR` is unset or points to the wrong directory.
  Fix/workaround: `export NSSA_WALLET_HOME_DIR="$(pwd)/wallet/configs/debug"` and ensure `wallet_config.json` exists there.

- Symptom: `getBlocks` returns an empty list even after sending a transaction.
  Cause: Settlement/indexing lag, or sequencer is producing blocks but not settling, or blocks haven’t finalized/indexer hasn’t caught up yet.
  Fix/workaround: Wait briefly, send another transaction, then retry `getBlocks`. If still empty, inspect indexer + bedrock logs.

- Symptom: Manual setup instructions mention a Logos Blockchain config file you can’t find.
  Cause: lssa README manual path appears outdated relative to current Logos Blockchain repo layout.
  Fix/workaround: Use the Docker all-in-one path until the manual path is updated/verified.

## Limits (for Testnet v0.1)

- Not supported:

  - Decentralized sequencing (this journey is explicitly for a centralized sequencer)
  - Other v0.1 limitations: UNKNOWN
- Known issues/sharp edges:

  - UNKNOWN (add links to issues/PRs once identified)

## References (links)

- Existing sources:

  - [https://roadmap.logos.co/testnets/v01](https://roadmap.logos.co/testnets/v01)
  - [https://roadmap.logos.co/blockchain/roadmap/lssa_sovereign_rollup](https://roadmap.logos.co/blockchain/roadmap/lssa_sovereign_rollup)
  - [https://github.com/logos-blockchain/lssa](https://github.com/logos-blockchain/lssa) (README and configs)
  - [https://github.com/logos-co/logos-docs/issues/172](https://github.com/logos-co/logos-docs/issues/172)
  - Key repo files (raw):

    - [https://raw.githubusercontent.com/logos-blockchain/lssa/main/README.md](https://raw.githubusercontent.com/logos-blockchain/lssa/main/README.md)
    - [https://raw.githubusercontent.com/logos-blockchain/lssa/main/docker-compose.override.yml](https://raw.githubusercontent.com/logos-blockchain/lssa/main/docker-compose.override.yml)
    - [https://raw.githubusercontent.com/logos-blockchain/lssa/main/configs/docker-all-in-one/sequencer/sequencer_config.json](https://raw.githubusercontent.com/logos-blockchain/lssa/main/configs/docker-all-in-one/sequencer/sequencer_config.json)
    - [https://raw.githubusercontent.com/logos-blockchain/lssa/main/configs/docker-all-in-one/indexer/indexer_config.json](https://raw.githubusercontent.com/logos-blockchain/lssa/main/configs/docker-all-in-one/indexer/indexer_config.json)
    - [https://raw.githubusercontent.com/logos-blockchain/lssa/main/indexer/service/rpc/src/lib.rs](https://raw.githubusercontent.com/logos-blockchain/lssa/main/indexer/service/rpc/src/lib.rs)
    - [https://raw.githubusercontent.com/logos-blockchain/lssa/main/wallet/configs/debug/wallet_config.json](https://raw.githubusercontent.com/logos-blockchain/lssa/main/wallet/configs/debug/wallet_config.json)
- Optional:

  - [https://github.com/logos-blockchain/logos-blockchain](https://github.com/logos-blockchain/logos-blockchain) (manual node setup; exact file mapping to lssa README is currently UNKNOWN)
