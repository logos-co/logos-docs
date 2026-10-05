---
title: Run a Logos Blockchain node on the public testnet from the CLI
doc_type: procedure
product: blockchain
topics: blockchain
steps_layout: sectioned
authors: kashepavadan, davidrusu
owner: logos
doc_version: 1
slug: run-a-logos-blockchain-node-from-cli
sidebar_position: 3
---

# Run a Logos Blockchain node on the public testnet from the CLI

#### Start a node and verify runtime and consensus signals.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

With this tutorial, you will install the [Logos Blockchain](../../get-started/glossary.md#logos-blockchain) node, connect to the public testnet, and verify that your node is running. The Logos Blockchain is the blockchain component of the Logos technology stack, providing a privacy-preserving and censorship-resistant framework for decentralised applications. This procedure is for node operators setting up a node for the first time.

:::info[Prerequisites]

- A supported OS:
    - Linux x86_64
    - macOS aarch64 (recent versions)
    - Raspberry Pi 5 with [Raspberry Pi OS](https://www.raspberrypi.com/software/)
- glibc version 2.39 or later (Linux only)
- FUSE, required by the `logosctl` AppImage (Linux only). On Debian/Ubuntu: `sudo apt install fuse libfuse2t64`. Without it, `logosctl` fails with `No suitable fusermount binary found on the $PATH`.
- On x86_64, a CPU with ADX instruction support: Intel Broadwell or later, or any AMD Zen. On virtual machines, configure the hypervisor to pass through host CPU features. Generic CPU models such as `kvm64` and `qemu64` hide ADX and cause the blockchain module to crash with `signal 4`.
- 2 Core CPU, 2Ghz. Modern multi-core processor.
- Minimal RAM (1 Gb).
- SSD with 100+ GB free with ability to expand storage on demand.
- Relatively reliable network connection. 1Mbps of free bandwidth.
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.3.1) installed.
   - Install it by running `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh | sudo sh`
:::

## What to expect

- You can install the node binary, generate a configuration, and join the public testnet.
- You can verify that your node is syncing and connected to peers using the local API.
- You can mine test tokens and automatically participate in the consensus lottery once your stake matures.

## Step 1: Load the Logos Blockchain module

Download the Logos Blockchain [module](../../get-started/glossary.md#module) from the [catalogue](../../get-started/glossary.md#catalogue), then load it in `logosctl`.

1.  Start `logosctl`:

    ```sh
    logosctl daemon start
    ```

1.  In a new terminal window with the same user, refresh the official module catalogue:

    ```sh
    logosctl catalog refresh
    ```

1.  Install the Logos Blockchain module package version 0.2.4. The root hash ensures you select the published package identity that exactly matches the pinned version:

    ```sh
    logosctl package install blockchain_module \
    --version 0.2.4 \
    --yes
    ```

    :::note
    Individual module package versions (for example, Blockchain module version 0.2.4) are pinned independently and do not necessarily match the testnet version number (0.2.1).
    :::

1.  Load the Logos Blockchain module:

    ```bash
    logosctl module load blockchain_module
    ```

    - A `module load` sent before the daemon is ready fails with an RPC or missing client config error. If that happens, check `logosctl status` again and retry.

## Step 2: Configure and start the node

The `generate_user_config` subcommand generates a user configuration that includes per-node settings such as keys, ports, and peer addresses, along with fresh cryptographic keys and an auto-detected public IP.

:::info
Make sure to use the current bootstrap peer addresses in the [Logos Blockchain Node release notes](https://github.com/logos-blockchain/logos-blockchain/releases/latest) for your selected release.
:::

1.  Generate your `user_config.yaml` and `keystore.yaml` files (written to `$HOME`) by running `generate_user_config` with the bootstrap peer addresses. For example, for release 0.2.4:

    ```sh
    logosctl call blockchain_module generate_user_config '{
        "initial_peers": [
            "/ip4/65.109.51.37/udp/3000/quic-v1/p2p/12D3KooWFrouXfmrR4nsLMtE7wu15DoMJ6VtoUtHinREZCvbWHar",
            "/ip4/65.109.51.37/udp/3001/quic-v1/p2p/12D3KooWJRGau8M1rjT7R5e4YYsgdFhsMX35nRDtMwCDjxQkXAHz",
            "/ip4/65.109.51.37/udp/3002/quic-v1/p2p/12D3KooWQXJavMDTRscjauFSgVAB1VLB6Rzpy2uY5SU9Tk7927tb",
            "/ip4/65.109.51.37/udp/50001/quic-v1/p2p/12D3KooWSQc7CcGtvWDPF1yCbBthFnQjprfCVHmfmNDUrSmqQsU1"
        ]
    }'

    chmod 600 user_config.yaml keystore.yaml
    ```

    :::info
    `user_config.yaml` contains node-local wallet and key-management configuration. Keep it private, restrict file permissions, and do not publish it. Generate a fresh file for each node.
    :::

    - Important fields in `user_config.yaml` include:

    | Field | Purpose | Guidance |
    |-------|---------|----------|
    | `network.initial_peers` | Bootstrap peers | Use the current network document |
    | `network.port` | Public UDP P2P port | Keep aligned with firewall/NAT, normally `3000` |
    | `api.listen_address` | Local API bind | Keep private, normally `127.0.0.1:8080`. Edit the file if you want to change the port |
    | `state.base_folder` | State directory | Use a persistent local path |
    | logger filters | Log verbosity | Use `INFO` for unattended operation |

1.  Start the node:

    ```sh
    logosctl call blockchain_module start "$HOME/user_config.yaml" ""
    ```

    - The second argument is intentionally an empty string; the blockchain module no longer requires a downloaded `deployment.yaml` file.

    :::info
    The Logos Blockchain node does not currently support dynamic wallet key management. To add new keys you must manually edit `user_config.yaml` and restart the node. If the node is restarted while [bootstrapping](../../get-started/glossary.md#bootstrapping), it does not save sync progress and restarts from the beginning.
    :::

## Step 3: Verify that your node is running and connected to peers

Wait for your node to finish syncing and reach `Online` mode before mining. Pipe the `get_cryptarchia_info` command through `jq .` to format JSON output.

1.  Check the consensus state. The `logosctl` call and the node's HTTP endpoint return the same data in slightly different shapes.

    ```sh
    logosctl call blockchain_module get_cryptarchia_info | jq -r .result.value | jq .
    ```

    Example response (the `logosctl` call returns a flat object with a `mode` field):

    ```json
    {
      "lib": "3d0c...4e6d",
      "lib_slot": 0,
      "tip": "f44d...e2f5",
      "slot": 70899,
      "height": 120,
      "mode": "Bootstrapping"
    }
    ```

    Alternatively, send a request directly to your node port:

    ```sh
    curl -s http://localhost:8080/cryptarchia/info | jq .
    ```

    Example response (the HTTP endpoint nests the fields under `cryptarchia_info`, names the status field `state`, and adds a top-level `phase`):

    ```json
    {
      "cryptarchia_info": {
        "lib": "3d0c...4e6d",
        "lib_slot": 0,
        "tip": "f44d...e2f5",
        "slot": 70899,
        "height": 120,
        "state": "Bootstrapping"
      },
      "phase": "ProlongedBootstrapPeriod"
    }
    ```

    - The status field (`mode` from the `logosctl` call, `state` from the HTTP endpoint) starts as `Bootstrapping` while syncing and transitions to `Online` once caught up.
    - Confirm `slot` and `height` are increasing. `height` counts confirmed blocks; `slot` counts elapsed time intervals, with a new block expected roughly every 10 seconds.

1.  Check peer connectivity:

    ```sh
    curl -s http://localhost:8080/network/info | jq .
    ```

    Example response:

    ```json
    {
      "listen_addresses": ["/ip4/127.0.0.1/udp/3001/quic-v1"],
      "peer_id": "12D3...fuS2",
      "connected_peers": ["12D3...Mxu1", "12D3...sbD3"],
      "discovered_peers": ["12D3...Mxu1", "12D3...sbD3"],
      "n_peers": 16,
      "n_connections": 19,
      "n_discovered_peers": 18,
      "n_pending_connections": 0
    }
    ```

    - Confirm `n_peers` is greater than `0`.

1. After 30–60 seconds, run the `get_cryptarchia_info` command again and confirm `slot` and `height` have increased.

1. Wait until `mode` transitions to `Online` before continuing. Bootstrapping should take approximately 1 hour.

## Step 4: Mine tokens to fund your node

A synced node validates the chain but does not propose blocks until its wallet holds stake. You fund it by mining. The `user_config.yaml` generated in [Step 2](#step-2-configure-and-start-the-node) includes a `pow` section that automatically claims mined rewards into your node's `PoWClaim` key.

:::warning
Do not call `pow_status` before the node is `Online`. In blockchain module `0.3.0` the call never returns, and every later `logosctl call blockchain_module` command fails with `RPC call failed` until you restart the daemon with `logosctl daemon stop`.
:::

1.  After your node reaches `Online` mode, start mining:

    ```sh
    logosctl call blockchain_module pow_start_mining
    ```

    - Mining is off by default and does not persist across restarts. Run `pow_start_mining` again after every restart.
    - Auto-claim starts automatically. You do not need to call `pow_start_auto_claim`.

1.  Check the mining and auto-claim status:

    ```sh
    logosctl call blockchain_module pow_status | jq -r .result.value | jq .
    ```

    - `is_mining` is `true`, and the `balance` of the auto-claim target grows as auto-claim collects rewards. The target's `public_key` is your `PoWClaim` key.

1.  Check the balance of your `PoWClaim` key. Replace `<your-powclaim-key>` with the `public_key` from the previous step:

    ```sh
    curl -s http://localhost:8080/wallet/<your-powclaim-key>/balance | jq .
    ```

1.  Mining uses CPU for as long as it runs. Once you have enough funds, stop it:

    ```sh
    logosctl call blockchain_module pow_stop_mining
    ```

:::info
Your tokens become eligible for consensus after 3.5 hours. Confirm that your node is participating by checking that `mode` remains `Online` and `height` continues to increase.

Block proposal is probabilistic. Your node will not propose on every [slot](../../get-started/glossary.md#slot); participation depends on your stake relative to total active stake in the network.
:::

## Step 5: Claim leader rewards

Each block your node proposes mints a **leader-reward voucher**. On a CLI node, vouchers are not credited automatically; you claim them to turn them into spendable balance.

Run this step only once your node reports `mode: Online` ([Step 3](#step-3-verify-that-your-node-is-running-and-connected-to-peers)) and your stake has matured. The chain-leader service is not available while the node is still `Bootstrapping`, and `leader_claim` fails there with an unrelated error rather than the response shown below.

1.  Check what is currently claimable. The `value` field is a JSON string, so extract and re-parse it:

    ```sh
    logosctl call blockchain_module wallet_get_claimable_vouchers | jq -r .result.value | jq .
    ```

    Example response:

    ```json
    {
      "tip": "e5f28df8...9153e",
      "vouchers": []
    }
    ```

1.  Claim an available voucher:

    ```sh
    logosctl call blockchain_module leader_claim
    ```

    On success the call returns `success: true` with the claim transaction hash in `value`. When there is nothing to claim, it returns:

    ```json
    {
      "method": "leader_claim",
      "module": "blockchain_module",
      "result": {
        "error": "Failed to claim leader rewards: Chain leader service error: Wallet API error: No claimable voucher found",
        "success": false,
        "value": null
      },
      "status": "ok"
    }
    ```

:::info
`leader_claim` claims **one** voucher per call. To drain several, check `wallet_get_claimable_vouchers` and call `leader_claim` once per listed voucher, pausing a few seconds between calls to avoid a burst of failures.

A voucher becomes claimable only once it is provable against the current tip, so a claim can be a temporary no-op (`No claimable voucher found`) shortly after a block is led; retry on the next check. `leader_claim` currently returns only the transaction hash, not the voucher it consumed or the fee paid.

Distinguish the two failure shapes. A reply with `"status": "ok"` and `result.success: false` means the node answered and had nothing to claim. A reply with `"status": "error"` and no `result` object means the call never reached the chain-leader service: either it timed out (`call to 'blockchain_module.leader_claim' timed out after 20000ms`) or the service is not running yet (`Failed to establish connection to chain-leader-service`). Both of the latter mean the node is not `Online` yet; re-check [Step 3](#step-3-verify-that-your-node-is-running-and-connected-to-peers) rather than retrying the claim.
:::

## Troubleshooting the Logos Blockchain node

### `logosctl call` fails with `RPC call failed`?

An error such as:

```
{"code":"RPC_FAILED","message":"callModuleMethod('blockchain_module','generate_user_config') RPC call failed.","status":"error"}
```

means the `logosctl` daemon isn't reachable, or the module isn't loaded. Run `logosctl daemon status` to tell the cases apart: it reports the daemon state, `running` or `not_running`, and the status of each module, `loaded`, `not_loaded`, or `crashed`. Restart the daemon if needed, then load the module:

```bash
logosctl daemon start --detach
logosctl module load blockchain_module

logosctl daemon status
```

If the module shows `not_loaded` again after a successful `load-module`, or calls keep failing, check the daemon output for a module crash:

```
[critical] [logos] [blockchain_module] FATAL: module 'blockchain_module' crashed (signal 4).
```

`signal 4` is an illegal-instruction fault. One known cause: the blockchain module requires a CPU with ADX support. Run `grep -c adx /proc/cpuinfo` to check. An output of `0` means the CPU, or the CPU model of the VM, lacks ADX. On physical hardware, the module needs an Intel Broadwell or later, or an AMD Zen CPU. On a virtual machine, set the CPU model to pass through host features, for example `host` in QEMU and Proxmox.

If the count is greater than `0`, the crash has a different cause. Collect the complete `FATAL` lines from the daemon output, including the backtrace addresses, together with the last lines of the newest node log file in the directory where the daemon runs, and report them to the Logos team.

Loaded modules don't persist across daemon restarts, so always re-run `load-module` after restarting the daemon. A `METHOD_FAILED` error such as `Call to blockchain_module.<method> failed.` means the daemon is reachable but the call itself failed. The most common causes are a module that isn't loaded or a missing required argument, such as calling `generate_user_config` without the JSON `initial_peers` argument.

### How do I look up a transaction on the testnet explorer?

Open `https://testnet.blockchain.logos.co/web/explorer/transactions/<TX_HASH>`, replacing `<TX_HASH>` with the transaction hash. The [testnet explorer](https://testnet.blockchain.logos.co/web/explorer/) home page has no search box for transaction hashes, and searching by address is not supported.

### My wallet balance is not updating after mining?

If the balance endpoint returns `404` with `The requested address could not be found in the wallet`, your node hasn't yet synced past the block containing the claim transaction. Funded addresses aren't visible while the node is still `Bootstrapping`. Wait for the node to reach `Online` mode and check again. If `pow_status` shows `is_mining` as `false`, run `pow_start_mining` again: mining stops when the node restarts.
