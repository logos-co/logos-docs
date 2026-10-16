---
title: Run a Logos delivery node with libp2p service discovery
doc_type: procedure
product: messaging
topics: [messaging, peer-discovery]
steps_layout: sectioned
authors: NagyZoltanPeter, kashepavadan
owner: logos
doc_version: 1
slug: run-logos-delivery-node-with-libp2p-service-discovery
sidebar_position: 3
---

# Run a Logos delivery node with libp2p service discovery

#### Start a Logos Delivery node on the logos.dev network that advertises itself and finds other delivery nodes through the shared libp2p module.

:::tip[Version]
This document is accurate for **Testnet v0.3.0**.
:::

This procedure shows how to run a [Logos Delivery](../../get-started/glossary.md#logos-delivery) node that hands [peer discovery](../../get-started/glossary.md#peer-discovery) to `libp2p_module`, the libp2p host that Logos [modules](../../get-started/glossary.md#module) share. Instead of running its own discovery, the node advertises the `/logos/delivery` service on one Kademlia DHT and looks up other delivery nodes through it. It is intended for node operators and module developers who want to try plugin-hosted discovery on the `logos.dev` network.

You use `logosctl` to run the daemon that hosts the modules, then install and load `delivery_module` 0.3.2 with `libp2p_module` 1.1.0, create a node with the `pluginKadDiscovery` setting turned on, and confirm that it finds other delivery nodes.

The node does not survive a daemon restart, and without a `nodekey` in its config it gets a new identity on every start.

:::info[Prerequisites]

- A supported OS:
   - macOS (Apple Silicon)
   - Linux (x86-64 or aarch64)
   - Windows is not supported: `libp2p_module` has no Windows build.
- `curl`, `tar`, and `jq`
- Network access to `github.com` for the release and catalogue downloads, and outbound TCP to the `logos.dev` entry nodes on port `30303`
- About 1 GB of free disk space

:::

## What to expect

- You can run a `delivery_module` node on `logos.dev` that uses `libp2p_module` for service discovery.
- You can confirm from a trace file that discovery runs on `libp2p_module` and repeats every 60 seconds.
- You can list the other delivery nodes your node discovered through the DHT.

## Step 1: Download `logosctl`

Run every command in this procedure in one shell, from one working directory.

1. Create a working directory and change into it:

   ```bash
   mkdir -p ~/logos-disco && cd ~/logos-disco
   ```

1. Download `logosctl` 0.3.2 for your platform. Set `PLAT` to one of `aarch64-macos`, `x86_64-linux`, or `aarch64-linux`:

   ```bash
   PLAT=aarch64-macos
   curl -fsSL https://github.com/logos-co/logos-logoscore-cli/releases/download/0.3.2/logosctl-$PLAT.tar.gz | tar xz
   ```

1. Point `LOGOSCTL` at the binary:

   - On macOS, the archive holds a `bin/`, `lib/`, and `modules/` directory. Run the binary where it was unpacked; it finds its libraries and bundled modules relative to its own path:

     ```bash
     LOGOSCTL=$PWD/logosctl-$PLAT/bin/logosctl
     ```

   - On Linux, the archive holds a single AppImage. Unpack it, which avoids needing FUSE, and use its `AppRun`:

     ```bash
     ./logosctl-*.AppImage --appimage-extract >/dev/null
     LOGOSCTL=$PWD/squashfs-root/AppRun
     ```

1. Check the version:

   ```bash
   $LOGOSCTL --version
   ```

   **Expected result:** `logosctl version 0.3.2`.

1. Set the session directory. Every `logosctl` command in this shell uses it to hold the daemon's state, its logs, and the installed modules:

   ```bash
   export LOGOSCTL_CONFIG_DIR=$PWD/session
   ```

## Step 2: Start the daemon

The daemon passes its environment to the modules it hosts, so set any module variables on the `daemon start` command.

1. Start the daemon with a discovery trace file:

   ```bash
   LD_DISCO_TRACE=$PWD/disco.trace \
     $LOGOSCTL daemon start --detach
   ```

   - `LD_DISCO_TRACE` is optional. When set, `delivery_module` writes every call it makes to `libp2p_module` to that file, which you read in [Step 5](#step-5-check-that-discovery-runs-on-libp2p_module).

   **Expected result:** `Daemon started (pid N)` and the path of its log, `session/logs/daemon.log`. The command returns once the daemon is ready.

## Step 3: Install and load the modules

1. Refresh the [catalogue](../../get-started/glossary.md#catalogue):

   ```bash
   $LOGOSCTL catalog refresh
   ```

   **Expected result:** `{"success":true}`.

1. Install the [delivery module](../../get-started/glossary.md#delivery-module) from the official catalogue, together with its optional dependencies:

   ```bash
   $LOGOSCTL package install delivery_module --yes
   ```

   **Expected result:** `"status":"ok"`, with `"installed":["delivery_module","libp2p_module","liblogos_lez_rln_module","liblogos_rln_module"]`. The RLN modules are installed but stay unused, because `logos.dev` runs without RLN.

1. Load the delivery module:

   ```bash
   $LOGOSCTL module load delivery_module
   ```

   **Expected result:** `"status":"ok"`, with `libp2p_module`, `liblogos_rln_module`, and `liblogos_lez_rln_module` listed in `"dependencies_loaded"`, in any order.

## Step 4: Create and start the delivery node

1. Capture the node's events in the background. The watcher only sees events emitted after it attaches, so start it first:

   ```bash
   $LOGOSCTL --json watch delivery_module >> events.jsonl 2>&1 &
   ```

1. Write the node config:

   ```bash
   cat > node.json <<'EOF'
   {"preset": "logos.dev", "messagingOverrides": {"pluginKadDiscovery": true}}
   EOF
   ```

   | Field | Purpose |
   |:------|:--------|
   | `preset` | `logos.dev` brings the network settings (cluster, sharding, entry nodes) and the DHT bootstrap peers. |
   | `messagingOverrides` | Per-layer settings. Keep extra keys inside it: a bare top-level key switches parsing to the legacy flat shape and the preset is ignored. |
   | `messagingOverrides.pluginKadDiscovery` | `true` hands service discovery to `libp2p_module`. Leave it out to run the node's internal discovery, with no `libp2p_module` needed. |
   | `messagingOverrides.kad-bootstrap-node` | Optional. Extra DHT bootstrap peers, added to those the preset brings, as full multiaddrs ending in `/p2p/<peerId>`. |
   | `messagingOverrides.kad-service-lookup-interval` | Optional. Seconds between `/logos/delivery` lookups. Default `60`. |
   | `messagingOverrides.kad-random-lookup-interval` | Optional. Seconds between random DHT walks. Default `0` (off). |
   | `messagingOverrides.tcp-port`, `messagingOverrides.discv5-udp-port` | Optional. Ports of the delivery node itself; the OS assigns them when unset. |

1. Create the node:

   ```bash
   $LOGOSCTL --json call delivery_module createNode @$PWD/node.json
   ```

   **Expected result:** `"success":true`.

1. Start the node:

   ```bash
   $LOGOSCTL --json call delivery_module start
   ```

   - `start` returns at once, always with `"success":true`. The node comes up in the background and reports the outcome as an event.

1. Wait about 15 seconds for the node to come up and run its first lookup, then check its events:

   ```bash
   sleep 15
   grep -E 'nodeStarted|connectionStateChanged' events.jsonl
   ```

   **Expected result:**

   ```text
   {"event":"connectionStateChanged","data":{"arg0":"PartiallyConnected",...}}
   {"event":"nodeStarted","data":{"arg0":true,"arg1":"",...}}
   {"event":"connectionStateChanged","data":{"arg0":"Connected",...}}
   ```

   - A `nodeStarted` event with `"arg0":false` carries the reason in `arg1` and is followed by `nodeStopped`: the node has stopped itself. See [Troubleshooting](#troubleshooting-libp2p-service-discovery).

## Step 5: Check that discovery runs on libp2p_module

1. Read the trace file:

   ```bash
   cat disco.trace
   ```

   **Expected result:**

   ```text
   libp2p createNode        OK  bootstrapNodes=N
   libp2p backend ready
   discoStartAdvertising  OK             key=/logos/delivery ...
   discoRegisterInterest  OK             key=/logos/delivery
   discoLookup            OK             key=/logos/delivery records=N peers=[...]
   ```

   - The first lookup runs a few seconds after `start`, then every 60 seconds.
   - `peers=[...]` shows the last 8 characters of each [peer ID](../../get-started/glossary.md#peer-id), and includes your node's own record.

## Step 6: List the discovered delivery nodes

1. Look up the `/logos/delivery` service and filter out your own node:

   ```bash
   ME=$($LOGOSCTL --json call delivery_module getNodeInfo MyPeerId | jq -r '.result.value')
   $LOGOSCTL --json call libp2p_module discoLookup /logos/delivery "" \
     | jq --arg me "$ME" '[.result.value[] | select(.peerId != $me) | .peerId]'
   ```

   **Expected result:** a non-empty array of peer IDs: the `logos.dev` fleet's delivery nodes, and any other node running this procedure. Each record in `.result.value` carries `peerId`, `addrs`, `seqNo`, and `services`.

1. Confirm the node also joined [Relay](../../get-started/glossary.md#relay) through the discovery built into the preset:

   ```bash
   $LOGOSCTL --json call delivery_module getNodeInfo Metrics | jq -r '.result.value' \
     | grep -E '^logos_delivery_connected_peers\{.*relay'
   ```

   **Expected result:** the `direction="Out"` value is above `0`.

1. Stop the daemon when you're finished:

   ```bash
   $LOGOSCTL daemon stop
   ```

   - This unloads the modules. The installed packages stay in `session/`. To run the node again, start the daemon, then repeat `module load`, the event watcher, `createNode`, and `start`.

## Troubleshooting libp2p service discovery

### `nodeStarted` reports `createNode: expected a result object, got null`

The installed `libp2p_module` is older than this `delivery_module` needs; version 1.0.0 lacks the API the delivery module configures it through. `disco.trace` shows `libp2p createNode REFUSED`, and the node stops itself. Run `$LOGOSCTL package install libp2p_module --yes`, restart the daemon, and repeat [Step 3](#step-3-install-and-load-the-modules) and [Step 4](#step-4-create-and-start-the-delivery-node).

### `nodeStarted` reports `libp2p_module is not available (not installed or not loaded)`

`libp2p_module` is not installed: `module load delivery_module` reported it under `optional_skipped` with reason `not_installed`. The node stops 15 to 20 seconds after `start`. Install it as in the previous entry, or remove `pluginKadDiscovery` from `node.json` to run internal discovery.

### `jq` prints `Cannot iterate over null` or `disco.trace` does not exist yet

The checks ran before the node came up. Wait a few seconds after `start` and run them again.

### `disco.trace` stays empty

`LD_DISCO_TRACE` was not set on the `daemon start` command; the modules only see the daemon's environment. Stop the daemon and start it again with the variable set.

### Other nodes find this node's record but cannot dial it

`libp2p_module` listens only on `/ip4/127.0.0.1/tcp/0` by default, so your node can look others up but they cannot reach its discovery host. Set a reachable interface and a fixed port in `LIBP2P_MODULE_CONFIG` on the `daemon start` command, as inline JSON or a path to a JSON file:

```bash
LIBP2P_MODULE_CONFIG='{"addrs":["/ip4/0.0.0.0/tcp/45000"],"transport":"tcp","maxConnections":100}' \
LD_DISCO_TRACE=$PWD/disco.trace \
  $LOGOSCTL daemon start --detach
```

`delivery_module` always sets `bootstrapNodes`, `mountKad`, and `mountServiceDiscovery` itself, overriding any values in this variable.

### `package install` can't find `delivery_module` or `libp2p_module`

The session's catalogue index is stale. Run `$LOGOSCTL catalog refresh` and try again.

### Every command fails with `no daemon`

The command isn't using the daemon's session. Check that `LOGOSCTL_CONFIG_DIR` and `TMPDIR` match the ones the daemon was started with; the daemon's local socket lives in `TMPDIR`.

### Logs and trace files contain identifying data

`session/logs/daemon.log` and the `LD_DISCO_TRACE` file contain peer IDs and IP addresses. Redact them before attaching either to a public issue.

### Known constraints

- Windows is not supported.
- Kademlia through `libp2p_module` is the only plugin discovery backend.
- Docker Compose deployments are not covered by this procedure.
