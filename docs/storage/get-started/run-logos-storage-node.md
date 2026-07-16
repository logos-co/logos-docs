---
title: Run a Logos storage node
doc_type: procedure
product: storage
topics:
  - storage
  - node
steps_layout: flat
authors: gmega, kashepavadan, arnaud
owner: logos
doc_version: 1
slug: run-logos-storage-node
sidebar_position: 1
---

# Run a Logos storage node

#### Get started running a Logos storage node and uploading your first file to the Logos network.

This procedure covers how to build and run the [Logos Storage Module](https://github.com/logos-co/logos-storage-module/), connect it to the testnet bootstrap nodes, publish a file, and verify that the file can be downloaded. It is intended for node operators on testnet v0.2 who want to contribute storage capacity to the Logos network.

Before you start, make sure you have the following:

- Linux (tested on Ubuntu 22.04)
- **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

    ```bash
    mkdir -p ~/.config/nix
    echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
    ```
-   [`logoscore`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.2.0), and [`lgpm`](https://github.com/logos-co/logos-package-manager/releases/tag/0.2.0) installed. To install these tools, use the `install-node-tools.sh` helper script:

    ```bash
    curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-node-tools.sh | sh
    export PATH="$PWD/bin:$PATH"
    ```
- `jq` on your `PATH` — used to pull the uploaded [CID](https://docs.logos.co/get-started/glossary#cid) out of the manifests JSON. Verify: `jq --version`

## What to expect

- You can connect a [Logos Storage](https://docs.logos.co/get-started/glossary#logos-storage) node to the testnet and have it listed among the bootstrap peers.
- You can publish a file to the network and retrieve a content address to share with other nodes.
- You can download the file back from the network and confirm it lands on disk.

## Build and install the storage module

1.  Build the [module](https://docs.logos.co/get-started/glossary#module) package with Nix:

    ```sh
    nix build 'github:logos-co/logos-storage-module/v2.0.1#lgx-portable' -o storage-lgx
    ```

    - This produces a `.lgx` package in `./storage-lgx/`.

    {% hint style="info" %}

    Use the `#lgx-portable` output: it declares the standard platform variant (e.g. `linux-amd64`) that the release build of `lgpm` accepts. The plain `#lgx` output produces a `-dev` variant that only a source-built `lgpm` can install.

    {% endhint %}

    :::info
    The initial Nix build takes 15–20 minutes on first run. Subsequent builds use the Nix cache and complete in seconds.
    :::

2.  Install the package into a local modules directory using `lgpm`. The package is a local build and is unsigned, so pass `--allow-unsigned`:

    ```sh
    mkdir -p modules
    lgpm --modules-dir ./modules --allow-unsigned install --file storage-lgx/*.lgx
    ```
3.  Confirm the module landed:

    ```sh
    lgpm --modules-dir ./modules list
    # storage_module appears in the listing
    ```

## Start the daemon and load the storage module

Run `logoscore` with the modules directory, then load and initialise the [storage module](https://docs.logos.co/get-started/glossary#storage-module) against the testnet config.

Several module calls in this procedure are **asynchronous**: the call returns `"result":true` as soon as the command is accepted, and the real outcome is delivered later as an event (`storageStart`, `storageUploadDone`, `storageDownloadDone`, `storageRemoveDone`). These events are emitted to event subscribers (such as the Storage UI); the `logoscore call` client does not subscribe to them, so they do **not** appear in `logs.txt`. Each step below instead waits briefly and confirms the outcome with a follow-up query (for example `manifests` or `exists`).

1.  Start the `logoscore` daemon in background mode, capturing its output:

    ```sh
    logoscore -D -m ./modules > logs.txt 2>&1 &
    ```

    - The client subcommands below connect to this running process via the config written under `~/.logoscore/`.
2.  Verify the daemon is running:

    ```sh
    logoscore status
    ```
3.  Confirm the storage module was discovered:

    ```sh
    logoscore list-modules
    # storage_module appears in the list
    ```
4.  Load the storage module and confirm it reports `loaded`:

    ```sh
    logoscore load-module storage_module
    logoscore status
    # storage_module now shows "status":"loaded"
    ```

    - To see every method the module exposes (the same methods you can `call`), run `logoscore module-info storage_module`.
5.  Create the storage config. Use **absolute** paths: in daemon mode the module runs as its own process, whose working directory is not the one you are typing in, so relative paths resolve to the wrong place. The `$(pwd)` in the heredoc takes care of it:

    ```sh
    mkdir -p "$(pwd)/storage-data"
    cat > config.json <<EOF
    {
      "data-dir": "$(pwd)/storage-data",
      "log-level": "DEBUG",
      "log-file": "$(pwd)/storage-data/storage.log",
      "nat": "none"
    }
    EOF
    ```

    - With `"nat": "none"` the node announces the machine's own IP as-is: it can download from the network but is not reachable from the internet from behind a router. To make it reachable, use `"nat": "upnp"` or `"nat": "extip:<your-public-IP>"` with the ports forwarded: see [Connectivity](../concepts/connectivity.md).

    - `config.json` includes the following fields:

    | Field       | Purpose                            |
    | ----------- | ---------------------------------- |
    | `data-dir`  | Storage repository path (absolute) |
    | `log-level` | Log verbosity                      |
    | `log-file`  | Node log destination (absolute)    |
    | `nat`       | Public IP advertisement mode — see [Connectivity](../concepts/connectivity.md) |

    - Every omitted key keeps its default: the node joins the `logos.test` network preset (which provides the testnet bootstrap settings), binds discovery to the default UDP port `8090`, and picks a random TCP `listen-port`.
    - For a public, reachable node, set fixed `listen-port` (TCP) and `disc-port` (UDP) values and a `nat` mode that announces your address: see [Connectivity](../concepts/connectivity.md).

6.  Initialise the storage module with the testnet configuration. `init` is synchronous and returns `true` on success (the `@config.json` syntax loads the file's contents as the argument):

    ```sh
    logoscore call storage_module init @config.json
    ```
7.  Start the node. `start` is asynchronous: the return value only confirms the command was accepted; completion is signalled later by the `storageStart` event (delivered to event subscribers, not written to `logs.txt`):

    ```sh
    logoscore call storage_module start
    # Wait few seconds to start
    ```
8.  Inspect the running node with `debug`. It returns the node's identity: its `id` (peer ID) and its `spr`, the signed record other nodes use to connect to you (see [Connectivity](../concepts/connectivity.md)):

    ```sh
    logoscore call storage_module debug
    ```

## Publish and download a file

Once the node is running and connected to the testnet, publish a file and verify the round-trip.

1.  Create a file to publish:

    ```sh
    echo "Hello world from Logos Storage" > "$(pwd)/hello.txt"
    ```

2.  Upload the file to the network with `uploadUrl`. It takes an **absolute** path and a chunk size in bytes, and returns immediately; the upload runs in the background and completes with a `storageUploadDone` event:

    ```sh
    logoscore call storage_module uploadUrl "$(pwd)/hello.txt" 65536
    ```

    :::info
    The default chunk size is 65536.
    :::

2.  After a second, extract the content ID (CID) from the first `manifests` entry:

3.  Extract the content ID (CID) from the first `manifests` entry:

    ```sh
    # Wait a second for the upload to complete first
    logoscore call storage_module manifests \
       | jq -er '.result.value[0].cid' > cid.txt
    ```
4.  Download the file back from local storage with `downloadToUrl`. It takes the CID, an **absolute** destination path, a `local` flag, and a chunk size in bytes. With `local` set to `true`, the download reads the blocks straight back out of this node's own repository. Like `uploadUrl` it runs in the background and completes with a `storageDownloadDone` event:

    ```sh
    logoscore call storage_module downloadToUrl "$(cat cid.txt)" "$(pwd)/hello-destination.txt" true 65536
    ```

    - The `local` flag reads only from locally cached data when set to `true`; `false` fetches from the network.

5.  Confirm the downloaded file is present at the destination path and matches the original. You can also check the content is in local storage by CID:

    ```sh
    # Confirm the download is a byte-for-byte copy of the original (both files are static):
    diff "$(pwd)/hello.txt" "$(pwd)/hello-destination.txt" && echo "match"
    # And confirm the content is in local storage by CID:
    logoscore call storage_module exists "$(cat cid.txt)"
    # returns true
    ```

## Remove content and shut everything down

To clear your local storage, destroy the storage node, and stop the daemon, follow the steps below.

1.  Remove content from local storage by its CID. `remove` returns immediately; the outcome arrives as a `storageRemoveDone` event:

    ```sh
    logoscore call storage_module remove "$(cat cid.txt)"
    ```
2.  Confirm the content is gone:

    ```sh
    # Wait a second for the removal to complete first
    logoscore call storage_module exists "$(cat cid.txt)" | jq '.result.value'
    # false
    ```
3.  Stop the storage node. `stop` is asynchronous like `start`; completion is signalled by a `storageStop` event (delivered to event subscribers, not written to `logs.txt`). The node can be started and stopped multiple times:

    ```sh
    logoscore call storage_module stop
    # Wait a few seconds for the node to stop before destroying it
    ```
4.  Destroy the storage context. `destroy` is synchronous and must be called after the node is stopped:

    ```sh
    logoscore call storage_module destroy
    ```
5.  Stop the daemon and confirm it has exited:

    ```sh
    logoscore stop
    # Wait 5 seconds
    logoscore status
    # reports "status":"not_running"
    ```

## Troubleshooting Logos Storage

Connectivity problems (downloads timing out from another machine, no peers, unreachable node) are covered in the [FAQ](faq.md) and in [Connectivity](../concepts/connectivity.md).
