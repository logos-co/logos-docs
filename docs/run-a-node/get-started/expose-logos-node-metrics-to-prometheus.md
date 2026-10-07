---
title: Expose Logos node metrics to Prometheus
doc_type: procedure
product: core
topics: [node, core, monitoring]
steps_layout: sectioned
authors:
owner: logos
doc_version: 1
slug: /run-a-node/expose-node-metrics
sidebar_position: 2
---

# Expose Logos node metrics to Prometheus

#### Serve the storage and delivery metrics of a running Logos node on one OpenMetrics endpoint and scrape it with Prometheus.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

This procedure covers adding the `openmetrics` [module](../../get-started/glossary.md#module) to a [Logos node](../../get-started/glossary.md#logos-node) and pointing [Prometheus](https://prometheus.io/) at it. `openmetrics` runs a small HTTP server inside the node. On every scrape, it asks each module you list for its metrics and returns them as one [OpenMetrics](https://prometheus.io/docs/specs/om/open_metrics_spec/) document, with a `module` label on every series. It is intended for node operators who want dashboards and alerts for a node they already run.

The steps continue from [Run a Logos node with blockchain, storage, and delivery](./run-logos-node-blockchain-storage-delivery.md) and use the same `logos` user, paths, and `logosctl` session.

:::info[Prerequisites]

- A Logos node set up with [Run a Logos node with blockchain, storage, and delivery](./run-logos-node-blockchain-storage-delivery.md), with the daemon running and the storage and delivery modules started.
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.3.2) installed.
- A [Prometheus](https://prometheus.io/docs/prometheus/latest/installation/) server that can reach the node over TCP, on the same host or on your private network.
:::

## What to expect

- You can scrape storage and delivery metrics from a single `/metrics` endpoint on the node.
- You can see the node as a healthy target in Prometheus and query its series by `module` label.
- You can keep the endpoint private and bring it back automatically after the node restarts.

## Step 1: Install the `openmetrics` module

Install the module into the running node. As root, open a shell as the `logos` user, and run every `logosctl` command in this procedure from it:

```sh
runuser -u logos -- env HOME=/var/lib/logos-node bash
```

1. Install the pinned `openmetrics` package from the module [catalogue](../../get-started/glossary.md#catalogue):

   ```sh
   logosctl package install openmetrics \
   --version 0.1.2 \
   --root-hash 15b22b2020bf83f775b6d55f2e62ceb85582d1720c5d56099b8edd33928a13bb \
   --yes
   ```

   - The running node picks up the new package without a restart.

1. Load the module:

   ```sh
   logosctl module load openmetrics
   ```

   - The output must include `"module":"openmetrics","status":"ok"`.

## Step 2: Start the metrics endpoint

Tell `openmetrics` which port to listen on and which modules to collect from.

1. Create the endpoint configuration:

   ```sh
   mkdir -p /var/lib/logos-node/openmetrics
   cd /var/lib/logos-node/openmetrics
   cat > config.json <<'EOF'
   {
     "port": 9464,
     "modules": [
       "storage_module",
       { "name": "delivery_module", "format": "text" }
     ]
   }
   EOF
   ```

   | Field | Purpose |
   |-------|---------|
   | `port` | TCP port of the HTTP server. Pick a free port; `9090` is the default port of Prometheus itself |
   | `modules` | Modules to collect from on each scrape |
   | `modules[].name` | Module name, as shown by `logosctl module ls --loaded` |
   | `modules[].format` | `data` (the default, also used for a bare name) or `text` for modules that already produce OpenMetrics text |

   - `storage_module` returns structured metrics, so a bare name is enough.
   - `delivery_module` returns OpenMetrics text and needs `"format": "text"`. Listed as a bare name, it contributes no metrics.
   - `blockchain_module` does not expose metrics yet, so it is not listed.

1. Start the endpoint:

   ```sh
   logosctl call openmetrics start @config.json
   ```

   - `"result":1` means the server is listening. `"result":0` means it did not start; see [Troubleshooting](#troubleshooting).

1. Confirm it is serving:

   ```sh
   logosctl call openmetrics getInfo
   ```

   - The result must contain `\"running\":true` and `\"port\":9464`.

## Step 3: Check the endpoint

1. Check that the server answers:

   ```sh
   curl http://127.0.0.1:9464/health
   ```

   - The response is `ok`.

1. Fetch the metrics:

   ```sh
   curl -s http://127.0.0.1:9464/metrics | grep -E 'libp2p_peers|kad_routing_table_peers|repostore_bytes_used'
   ```

   - **Expected result:** gauges from both modules, each tagged with the module that reported it. Your values differ:

   ```text
   # HELP libp2p_peers total connected peers
   # TYPE libp2p_peers gauge
   libp2p_peers{module="delivery_module"} 15.0
   # HELP logos_storage_kad_routing_table_peers total peers in routing table
   # TYPE logos_storage_kad_routing_table_peers gauge
   logos_storage_kad_routing_table_peers{module="storage_module"} 21.0
   # HELP logos_storage_repostore_bytes_used storage repostore bytes used
   # TYPE logos_storage_repostore_bytes_used gauge
   logos_storage_repostore_bytes_used{module="storage_module"} 31522926.0
   ```

   - The full document holds a few hundred metric families and ends with `# EOF`. Storage metrics start with `logos_storage_` and delivery metrics with `logos_delivery_`. The delivery module also reports its libp2p, discovery, and mix network metrics.
   - A module that is not running, or that fails to answer, is left out of the scrape. The other modules are still reported.

## Step 4: Keep the endpoint private

The metrics server listens on all network interfaces, not only on `127.0.0.1`. The metrics reveal peer counts, traffic, and storage use, so expose the port only to your Prometheus server.

1. Confirm the listening address:

   ```sh
   ss -lntp | grep ':9464'
   ```

   - The output shows `0.0.0.0:9464`.

1. Make sure the host firewall does not open port `9464/tcp` to the internet. If Prometheus runs on another host, allow only that host. For example, with `ufw`, replace `<prometheus-ip>` with the address of your Prometheus server:

   ```sh
   sudo ufw allow from <prometheus-ip> to any port 9464 proto tcp
   ```

   - Run this from an account with `sudo` access, not from the `logos` user shell.

## Step 5: Scrape the node with Prometheus

1. Add a scrape job for the node to your Prometheus configuration (`prometheus.yml`). Replace `<node-address>` with `127.0.0.1` if Prometheus runs on the node, or with the node's private address otherwise:

   ```yaml
   scrape_configs:
     - job_name: logos-node
       scrape_interval: 15s
       static_configs:
         - targets: ["<node-address>:9464"]
   ```

1. Reload or restart Prometheus so it reads the new job.

1. Check that Prometheus scrapes the node. In the Prometheus UI, open **Status > Target health**, or query the API from the Prometheus host (default port `9090`):

   ```sh
   curl -s --get http://127.0.0.1:9090/api/v1/query --data-urlencode 'query=up{job="logos-node"}'
   ```

   - The `logos-node` target is up, and the query returns the value `"1"`.

1. Query the node's series, for example the number of series each module reports:

   ```text
   count by (module) ({job="logos-node"})
   ```

   - The result lists `storage_module` and `delivery_module`. A few series without a `module` label, such as `up`, are added by Prometheus itself.

## Step 6: Start the endpoint with the node

The endpoint does not persist across restarts: when the node daemon restarts, the `openmetrics` module is unloaded and the server stops.

1. If you run the node with the [systemd service](./run-logos-node-blockchain-storage-delivery.md#optional-run-the-node-unattended-with-systemd), add these commands to the module bootstrap script, after the storage and delivery modules start:

   ```sh
   logosctl module load openmetrics
   logosctl call openmetrics start @/var/lib/logos-node/openmetrics/config.json
   ```

   - Collection only reports modules that are running, so start `openmetrics` after the modules it scrapes.

1. To stop the endpoint without stopping the node, run:

   ```sh
   logosctl call openmetrics stop
   ```

## Troubleshooting

### `logosctl call openmetrics start` returns `"result":0`

The server did not start. The usual causes are:

- The server is already running. Check with `logosctl call openmetrics getInfo`, and run `logosctl call openmetrics stop` before starting it with a new configuration.
- Another process holds the port. Check with `ss -lntp | grep ':9464'`, then pick a free `port` in `config.json`.
- `config.json` is not valid JSON, or `port` is missing or outside `1`–`65535`.

### A module's metrics are missing from `/metrics`

- Check that the module is loaded and started with `logosctl module ls --loaded` and the module's own status call, for example `logosctl call storage_module isRunning`.
- Check that `delivery_module` is listed with `"format": "text"`. As a bare name it contributes no metrics.
- `blockchain_module` does not expose metrics in Testnet v0.3. To monitor blockchain sync, use `logosctl call blockchain_module get_cryptarchia_info`.
