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
sidebar_position: 3
---

# Run a Mix network of storage nodes

#### Stand up a local Mix network and download a file through it, with the content lookup anonymised.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

This procedure stands up a small local [Mix](../concepts/mix.md) network using `logosctl`: six [Logos Storage Module](https://github.com/logos-co/logos-storage-module/) nodes on one machine—four Mix relays wired around a bootstrap node, plus two storage nodes that route their DHT lookups through the relays. At the end, one storage node uploads a file and the other downloads it with the lookup tunnelled over Mix.

:::info[Prerequisites]

- A supported OS:
    - Linux
    - Mac OS (should work, but not tested)
- `jq` on your `PATH`.
    - To verify, run: `jq --version`
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.2.3-rc.1) installed.
   - Install it by running `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh | sh`
:::


## What to expect

- You can run several `logosctl` daemons side by side, each in its own session (`--config-dir`).
- You can set up a private Mix network and configure storage nodes to anonymise their lookups through it.
- You can exchange a file between two storage nodes and verify the content lookup was tunnelled over Mix.

## Download and install the storage module

All six nodes below share one already-unpacked copy of `storage_module`, installed once into a throwaway session. Each node's daemon is then pointed at that directory with `--modules-dir`, so there's no need to repeat the install per node.

1.  Start a throwaway session and install the storage module package into it. Package installs are handled by a module bundled inside the daemon, so the daemon has to be running first:

    ```sh
    logosctl daemon start --detach --config-dir ./install-session
    logosctl --config-dir ./install-session catalog refresh
    logosctl --config-dir ./install-session package install storage_module --version 2.1.2 --yes
    ```

1.  Confirm the module landed, then stop this session—its only job was the install:

    ```sh
    logosctl --config-dir ./install-session package ls
    logosctl --config-dir ./install-session daemon stop
    ```

    The package is now unpacked under `./install-session/modules/storage_module/`.

## Launch the bootstrap Mix node (node 1)

The first node is the bootstrap node: the other nodes use it to join the Mix network.

1.  Write node 1's configuration. It uses `"mix-enabled": true` and `"no-bootstrap-node": true` because it is the bootstrap node. Paths are absolute (`$(pwd)`) because each module runs in its own process:

    ```sh
    mkdir -p "$(pwd)/storage-data/node-1"
    cat > config-1.json <<EOF
    {
      "log-level": "DEBUG",
      "data-dir": "$(pwd)/storage-data/node-1",
      "log-file": "$(pwd)/storage-data/node-1/storage.log",
      "nat": "extip:127.0.0.1",
      "disc-port": 9091,
      "listen-port": 8081,
      "mix-enabled": true,
      "no-bootstrap-node": true
    }
    EOF
    ```

1.  Start a `logosctl` daemon for node 1, detached, with its own session and pointed at the shared module directory. Its logs go to `./logosctl-1/logs/daemon.log`, so there's no need to redirect output by hand:

    ```sh
    logosctl daemon start --detach --config-dir ./logosctl-1 --modules-dir ./install-session/modules
    ```

1.  Load the module, initialise it, and start the node:

    ```sh
    logosctl --config-dir ./logosctl-1 module load storage_module
    logosctl --config-dir ./logosctl-1 call storage_module init @config-1.json
    logosctl --config-dir ./logosctl-1 call storage_module start
    # Wait a few seconds for the node to start
    ```

1.  Read node 1's SPR out of `debug` and save it: the other nodes use this value as their `bootstrap-node` (see [Connectivity](../concepts/connectivity.md)):

    ```sh
    logosctl --config-dir ./logosctl-1 call storage_module debug \
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
      "nat": "extip:127.0.0.1",
      "disc-port": $((9090 + id)),
      "listen-port": $((8080 + id)),
      "mix-enabled": true,
      "bootstrap-node": ["$BOOTSTRAP"]
    }
    EOF
    done
    ```

1.  Start one daemon per node, each detached with its own session, pointed at the shared module directory:

    ```sh
    for id in 2 3 4; do
      logosctl daemon start --detach --config-dir ./logosctl-$id --modules-dir ./install-session/modules
    done
    ```

1.  Load the module, initialise from each config, and start each node:

    ```sh
    for id in 2 3 4; do
      logosctl --config-dir ./logosctl-$id module load storage_module
      logosctl --config-dir ./logosctl-$id call storage_module init @config-$id.json
      logosctl --config-dir ./logosctl-$id call storage_module start
    done
    # Wait a few seconds for the nodes to start
    ```

1.  Verify the network is up: every node must report a non-empty identity (`id` and `spr`) through `debug`:

    ```sh
    for id in 1 2 3 4; do
      started_up=$(logosctl --config-dir ./logosctl-$id call storage_module debug \
        | jq -e '(.result.value.id // "") != "" and (.result.value.spr // "") != ""')
      if [ "$started_up" = "true" ]; then
        echo "Node $id is up"
      else
        echo "Node $id is down"
      fi
    done
    # You should see "Node X is up" for all nodes from 1 to 4
    ```

## Build the Mix relay pool

The storage nodes need two files to use the Mix relays:

- `mix-pool.json`: the relays' [peer IDs](../../get-started/glossary.md#peer-id), multiaddrs, mix and libp2p public keys.
- `mix-proxies.json`: the relays' TCP SPRs.

Since this is a local network, every relay is reachable at `127.0.0.1` on its fixed `listen-port` (`808<id>`), so the pool `multiAddr` is built from that rather than from the announced addresses.

1.  Save the debug output of each relay to `debug-<id>.json` to make the data extraction easier:

    ```sh
    for id in 1 2 3 4; do
      logosctl --config-dir ./logosctl-$id call storage_module debug > debug-$id.json
    done
    ```

1.  Assemble `mix-pool.json`. `debug` already returns `peerId`, `mixPubKey` and `libp2pPubKey` in exactly the form the pool wants:

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

1.  Collect the relays' proxy SPRs (`providerRecord`) into a JSON array:

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
      "nat": "extip:127.0.0.1",
      "mix-enabled": true,
      "bootstrap-node": ["$BOOTSTRAP"],
      "dht-mix-proxy": $PROXIES,
      "mix-pool": "$(pwd)/mix-pool.json"
    }
    EOF
    done
    ```

1.  Start one daemon per storage node, each detached with its own session, pointed at the shared module directory:

    ```sh
    for id in 5 6; do
      logosctl daemon start --detach --config-dir ./logosctl-$id --modules-dir ./install-session/modules
    done
    ```

1.  Load the module, initialise from each config, and start each node:

    ```sh
    for id in 5 6; do
      logosctl --config-dir ./logosctl-$id module load storage_module
      logosctl --config-dir ./logosctl-$id call storage_module init @config-$id.json
      logosctl --config-dir ./logosctl-$id call storage_module start
    done
    # Wait a few seconds for the nodes to start
    ```

1.  Verify the storage nodes are up:

    ```sh
    for id in 5 6; do
      logosctl --config-dir ./logosctl-$id call storage_module debug \
        | jq -e '(.result.value.id // "") != "" and (.result.value.spr // "") != ""'
    done
    ```

## Upload from one node, download through Mix

Node 5 seeds a file, and node 6 downloads it with `local=false` to force a network lookup—the lookup that Mix hides.

1.  Create a small file and upload it through node 5:

    ```sh
    echo "Hello through Mix from the storage doc-test." > hello.txt
    logosctl --config-dir ./logosctl-5 call storage_module uploadUrl "$(pwd)/hello.txt" 65536
    ```

1.  The upload runs in the background; give it a moment, then read the [CID](../../get-started/glossary.md#cid) of the stored manifest from node 5:

    ```sh
    logosctl --config-dir ./logosctl-5 call storage_module manifests \
      | jq -er '.result.value[0].cid' > cid.txt
    ```

1.  Download the CID through node 6:

    ```sh
    logosctl --config-dir ./logosctl-6 call storage_module downloadToUrl "$(cat cid.txt)" "$(pwd)/downloaded.txt" false 65536
    # Wait a few seconds for the download to complete
    ```

1.  Confirm the lookup was tunnelled through Mix: node 6's log records the relay selection (SURB):

    ```sh
    grep "Selected mix node for surbs" storage-data/node-6/storage.log logosctl-6/logs/daemon.log
    ```

1.  Verify the round-trip: the downloaded file matches what node 5 uploaded:

    ```sh
    cat downloaded.txt
    # Hello through Mix from the storage doc-test.
    ```

## Shut the network down

1.  For each node: stop the libp2p node, destroy the storage context, and stop the daemon. The `|| true` lets the loop continue past a node that is already gone:

    ```sh
    for id in 1 2 3 4 5 6; do
      logosctl --config-dir ./logosctl-$id call storage_module stop || true
      logosctl --config-dir ./logosctl-$id call storage_module destroy || true
      logosctl --config-dir ./logosctl-$id daemon stop || true
    done
    ```

1.  Confirm the daemons have stopped:

    ```sh
    ps aux | grep logosctl | grep -v 'grep' | wc -l
    # Should print "0"
    ```
