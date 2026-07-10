---
title: Run a Mix network of storage nodes
doc_type: procedure
product: storage
topics:
  - storage
  - mix
  - node
steps_layout: flat
authors: arnaud
owner: logos
doc_version: 1
slug: run-mix-network-of-storage-nodes
---

# Run a Mix network of storage nodes

#### Stand up a local Mix network and download a file through it, with the content lookup anonymized.

This procedure stands up a small local [Mix](../concepts/mix.md) network using `logoscore`: six [Logos Storage Module](https://github.com/logos-co/logos-storage-module/) nodes on one machine — four Mix relays wired around a bootstrap node, plus two storage nodes that route their DHT lookups through the relays. At the end, one storage node uploads a file and the other downloads it with the lookup tunnelled over Mix.

Before you start, make sure you have the following:

- Linux or macOS
- **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

    ```bash
    mkdir -p ~/.config/nix
    echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
    ```
-   The [`logoscore`](https://github.com/logos-co/logos-logoscore-cli) daemon CLI and the [`lgpm`](https://github.com/logos-co/logos-package-manager) package manager, built from their flakes:

    ```bash
    nix build 'github:logos-co/logos-logoscore-cli' --out-link ./logos
    nix build 'github:logos-co/logos-package-manager#cli' -o lgpm
    export PATH="$PWD/logos/bin:$PWD/lgpm/bin:$PATH"
    ```

    These commands create the `./logos` and `./lgpm` links in the current directory: run them in the same working directory as the rest of this procedure (the module seeding step below copies from `./logos/modules/`).
- `jq` on your `PATH` — used to read each node's identity out of the `debug` JSON. Verify: `jq --version`

## What to expect

- You can run several `logoscore` daemons side by side with separate `--config-dir`s.
- You can set up a private Mix network and configure storage nodes to anonymize their lookups through it.
- You can exchange a file between two storage nodes and verify the content lookup was tunnelled over Mix.

## Build and install the storage module

1.  Build the [module](https://docs.logos.co/get-started/glossary#module) package with Nix:

    ```sh
    nix build 'github:logos-co/logos-storage-module/v2.0.1#lgx' -o storage-lgx
    ```

    - This produces a `logos-storage_module-module-lib.lgx` package in `./storage-lgx/`.

    :::info
    The initial Nix build takes 15–20 minutes on first run. Subsequent builds use the Nix cache and complete in seconds.
    :::

2.  Seed the modules directory with the bundled capability module. `storage_module` is loaded through the host's capability layer, so the modules directory also needs the `capability_module` that ships with `logoscore`:

    ```sh
    mkdir -p modules
    cp -RL ./logos/modules/. ./modules/
    ```
3.  Install the package into the modules directory using `lgpm`. The package is a local build and is unsigned, so pass `--allow-unsigned`. All six daemons share this one modules directory:

    ```sh
    lgpm --modules-dir ./modules --allow-unsigned install --file storage-lgx/*.lgx
    ```
4.  Confirm the module landed:

    ```sh
    lgpm --modules-dir ./modules list
    # storage_module appears in the listing
    ```

## Launch the bootstrap Mix node (node 1)

The first node is the bootstrap node: the other nodes use it to join the Mix network.

1.  Write node 1's configuration. It uses `"nat": "none"` to avoid port mapping attempts on the local network, `"mix-enabled": true`, and `"no-bootstrap-node": true` because it is the bootstrap node. Paths are absolute (`$(pwd)`) because each module runs in its own process:

    ```sh
    mkdir -p "$(pwd)/storage-data/node-1"
    cat > config-1.json <<EOF
    {
      "log-level": "DEBUG",
      "data-dir": "$(pwd)/storage-data/node-1",
      "log-file": "$(pwd)/storage-data/node-1/storage.log",
      "disc-port": 9091,
      "listen-port": 8081,
      "nat": "none",
      "mix-enabled": true,
      "no-bootstrap-node": true
    }
    EOF
    ```
2.  Start a `logoscore` daemon for node 1 in the background, with its own config directory and its output captured:

    ```sh
    logoscore --config-dir=./logoscore-1 -D -m ./modules > logs-1.txt &
    # Wait a few seconds for the daemon to come up
    ```
3.  Load the module, initialise it, and start the node:

    ```sh
    logoscore --config-dir=./logoscore-1 load-module storage_module
    logoscore --config-dir=./logoscore-1 call storage_module init @config-1.json
    logoscore --config-dir=./logoscore-1 call storage_module start
    # Wait a few seconds for the node to start
    ```
4.  Read node 1's SPR out of `debug` and save it: the other nodes use this value as their `bootstrap-node` (see [Connectivity](../concepts/connectivity.md)):

    ```sh
    logoscore --config-dir=./logoscore-1 call storage_module debug \
      | jq -er '.result.value.spr' > bootstrap-spr.txt
    ```

## Launch the remaining Mix relays (nodes 2–4)

Nodes 2, 3 and 4 are identical to node 1, except that they join through node 1's SPR as their `bootstrap-node`.

1.  Write the configs for nodes 2–4, with per-node ports and data dirs:

    ```sh
    BOOTSTRAP=$(cat bootstrap-spr.txt)
    for id in 2 3 4; do
      mkdir -p "$(pwd)/storage-data/node-$id"
      cat > "config-$id.json" <<EOF
    {
      "log-level": "DEBUG",
      "data-dir": "$(pwd)/storage-data/node-$id",
      "log-file": "$(pwd)/storage-data/node-$id/storage.log",
      "disc-port": $((9090 + id)),
      "listen-port": $((8080 + id)),
      "nat": "none",
      "mix-enabled": true,
      "bootstrap-node": ["$BOOTSTRAP"]
    }
    EOF
    done
    ```
2.  Start one daemon per node, each with its own `--config-dir`:

    ```sh
    for id in 2 3 4; do
      logoscore --config-dir=./logoscore-$id -D -m ./modules > logs-$id.txt &
    done
    # Wait a few seconds for the daemons to come up
    ```
3.  Load the module, initialise from each config, and start each node:

    ```sh
    for id in 2 3 4; do
      logoscore --config-dir=./logoscore-$id load-module storage_module
      logoscore --config-dir=./logoscore-$id call storage_module init @config-$id.json
      logoscore --config-dir=./logoscore-$id call storage_module start
    done
    # Wait a few seconds for the nodes to start
    ```
4.  Verify the network is up: every node must report a non-empty identity (`id` and `spr`) through `debug`:

    ```sh
    for id in 1 2 3 4; do
      logoscore --config-dir=./logoscore-$id call storage_module debug \
        | jq -e '(.result.value.id // "") != "" and (.result.value.spr // "") != ""'
    done
    ```

## Build the Mix relay pool

The storage nodes need two files to use the Mix relays:

- `mix-pool.json`: the relays' peer IDs, multiaddrs, mix and libp2p public keys.
- `mix-proxies.json`: the relays' TCP SPRs.

Since this is a local network, every relay is reachable at `127.0.0.1` on its fixed `listen-port` (`808<id>`), so the pool `multiAddr` is built from that rather than from the announced addresses.

1.  Save the debug output of each relay to `debug-<id>.json` to make the data extraction easier:

    ```sh
    for id in 1 2 3 4; do
      logoscore --config-dir=./logoscore-$id call storage_module debug > debug-$id.json
    done
    ```
2.  Assemble `mix-pool.json`. `debug` already returns `peerId`, `mixPubKey` and `libp2pPubKey` in exactly the form the pool wants:

    ```sh
    for id in 1 2 3 4; do
      ADDR="/ip4/127.0.0.1/tcp/$((8080 + id))"
      jq --arg ma "$ADDR" '{
          peerId: .result.value.id,
          multiAddr: $ma,
          mixPubKey: .result.value.mixPubKey,
          libp2pPubKey: .result.value.libp2pPubKey
        }' debug-$id.json
    done | jq -s '{version: 1, relays: .}' > mix-pool.json
    ```
3.  Collect the relays' proxy SPRs (`providerRecord`) into a JSON array:

    ```sh
    jq -s -c '[.[].result.value.providerRecord]' debug-*.json > mix-proxies.json
    ```

## Start the storage nodes (5 and 6)

The four nodes so far are the Mix relays. Now add the storage nodes that actually use them: their config is the same, plus the `dht-mix-proxy` list and the `mix-pool` path built in the previous section.

1.  Write the storage node configs:

    ```sh
    BOOTSTRAP=$(cat bootstrap-spr.txt)
    PROXIES=$(cat mix-proxies.json)
    for id in 5 6; do
      mkdir -p "$(pwd)/storage-data/node-$id"
      cat > "config-$id.json" <<EOF
    {
      "log-level": "DEBUG",
      "data-dir": "$(pwd)/storage-data/node-$id",
      "log-file": "$(pwd)/storage-data/node-$id/storage.log",
      "disc-port": $((9090 + id)),
      "listen-port": $((8080 + id)),
      "nat": "none",
      "mix-enabled": true,
      "bootstrap-node": ["$BOOTSTRAP"],
      "dht-mix-proxy": $PROXIES,
      "mix-pool": "$(pwd)/mix-pool.json"
    }
    EOF
    done
    ```
2.  Start one daemon per storage node:

    ```sh
    for id in 5 6; do
      logoscore --config-dir=./logoscore-$id -D -m ./modules > logs-$id.txt &
    done
    # Wait a few seconds for the daemons to come up
    ```
3.  Load the module, initialise from each config, and start each node:

    ```sh
    for id in 5 6; do
      logoscore --config-dir=./logoscore-$id load-module storage_module
      logoscore --config-dir=./logoscore-$id call storage_module init @config-$id.json
      logoscore --config-dir=./logoscore-$id call storage_module start
    done
    # Wait a few seconds for the nodes to start
    ```
4.  Verify the storage nodes are up:

    ```sh
    for id in 5 6; do
      logoscore --config-dir=./logoscore-$id call storage_module debug \
        | jq -e '(.result.value.id // "") != "" and (.result.value.spr // "") != ""'
    done
    ```

## Upload from one node, download through Mix

Node 5 seeds a file, and node 6 downloads it with `local=false` to force a network lookup — the lookup that Mix hides.

1.  Create a small file and upload it through node 5:

    ```sh
    echo "Hello through Mix from the storage doc-test." > hello.txt
    logoscore --config-dir=./logoscore-5 call storage_module uploadUrl "$(pwd)/hello.txt" 65536
    ```
2.  The upload runs in the background; give it a moment, then read the CID of the stored manifest from node 5:

    ```sh
    logoscore --config-dir=./logoscore-5 call storage_module manifests \
      | jq -er '.result.value[0].cid' > cid.txt
    ```
3.  Download the CID through node 6:

    ```sh
    logoscore --config-dir=./logoscore-6 call storage_module downloadToUrl "$(cat cid.txt)" "$(pwd)/downloaded.txt" false 65536
    # Wait a few seconds for the download to complete
    ```
4.  Confirm the lookup was tunnelled through Mix: node 6's log records the relay selection (SURB):

    ```sh
    grep "Selected mix node for surbs" storage-data/node-6/storage.log logs-6.txt
    ```
5.  Verify the round-trip: the downloaded file matches what node 5 uploaded:

    ```sh
    cat downloaded.txt
    # Hello through Mix from the storage doc-test.
    ```

## Shut the network down

1.  For each node: stop the libp2p node, destroy the storage context, and stop the daemon. The `|| true` lets the loop continue past a node that is already gone:

    ```sh
    for id in 1 2 3 4 5 6; do
      logoscore --config-dir=./logoscore-$id call storage_module stop || true
      logoscore --config-dir=./logoscore-$id call storage_module destroy || true
      logoscore --config-dir=./logoscore-$id stop || true
    done
    ```
2.  Confirm the daemons have stopped:

    ```sh
    logoscore --config-dir=./logoscore-1 status
    # reports "status":"not_running"
    ```
