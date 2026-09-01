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

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

This procedure covers how to build and run the [Logos Storage Module](https://github.com/logos-co/logos-storage-module/), connect it to the testnet bootstrap nodes, publish a file, and verify that the file can be downloaded. It is intended for node operators on testnet v0.2 who want to contribute storage capacity to the Logos network.

:::info[Prerequisites]

- A supported OS:
    - Linux
    - Mac OS (should work, but not tested)
- `jq` on your `PATH`.
    - To verify, run: `jq --version`
- The Logos tool suite:
    - [`logoscore`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.2.2) (the Logos runtime);
    - [`lgpd`](https://github.com/logos-co/logos-package-downloader/releases/tag/0.2.1) (the Logos package downloader);
    - [`lgpm`](https://github.com/logos-co/logos-package-manager/releases/tag/0.2.1) (the Logos package manager).

  You can obtain them by running:

    ```bash
    # Export those first or the script will fetch the latest version, which might not
    # work with this tutorial
    export LGPM_TAG=0.2.1
    export LGPD_TAG=0.2.1
    export LOGOSCORE_TAG=0.2.2

    curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-node-tools.sh | sh
    export PATH="$PWD/bin:$PATH"
    ```
:::

## What to expect

In this tutorial, you will:

- Connect a [Logos Storage](../../get-started/glossary.md#logos-storage) node to the testnet.
- Publish a file to the network.
- Download an existing file - the Logos book, [Farewell to Westphalia](https://logos.co/book) - from the Logos storage network.

## Download and install the storage module

1.  Download the storage module:

    ```sh
    mkdir -p storage-lgx
    lgpd download storage_module --version 2.1.2 -o storage-lgx
    ```

    This should download an `lgx` file in the `storage-lgx` folder.

1.  Install the package using `lgpm`.

    ```sh
    mkdir -p modules
    lgpm --modules-dir ./modules install --file storage-lgx/*.lgx
    ```

1.  Confirm the module landed:

    ```sh
    lgpm --modules-dir ./modules list
    Found 1 installed module(s):

    NAME                           VERSION         TYPE       CATEGORY
    ----------------------------------------------------------------------
    storage_module                 2.1.2           core       protocol
    ```

## Start the daemon and load the storage module

Run `logoscore` with the modules directory, then load and initialise the storage module.

Several module calls in this procedure are **asynchronous**: the call returns `"result":true` as soon as the command is accepted, and the real outcome is delivered later as an event (`storageStart`, `storageUploadDone`, `storageDownloadDone`, `storageRemoveDone`, `storageDownloadManifestDone`). These events are emitted to event subscribers (such as the Storage UI); the `logoscore call` client does not subscribe to them, so they do **not** appear in `logs.txt`. Each step below instead waits briefly and confirms the outcome with a follow-up query (for example `manifests` or `exists`).

1.  Start the `logoscore` daemon in background mode, capturing its output:

    ```sh
    logoscore -D -m ./modules > logs.txt 2>&1 &
    ```

    - The client subcommands below connect to this running process via the config written under `~/.logoscore/`.

1.  Verify the daemon is running:

    ```sh
    logoscore status

    # Logoscore Daemon
    #   Status:       running
    #   PID:          148188
    #   Uptime:       0s
    #   Version:      v1.0.0
    #
    # Modules: 1 loaded, 0 crashed, 1 not loaded
    #   storage_module     v2.1.2  not_loaded  -
    #   capability_module  v1.0.0  loaded      2m
    ```

    - `logoscore` prints this table when it is attached to a terminal and JSON when its output is
      piped or redirected. Pass `--human` or `--json` to force either one.

1.  Load the storage module and confirm it reports `loaded`:

    ```sh
    logoscore load-module storage_module
    # Loaded module: storage_module (v2.1.2)

    logoscore status
    # ...
    # Modules: 2 loaded, 0 crashed, 0 not loaded
    #   storage_module     v2.1.2  loaded      0s
    #   capability_module  v1.0.0  loaded      2m
    ```

    - To see every method the module exposes (the same methods you can `call`), run `logoscore module-info storage_module`.

1.  Create a minimal storage config. Use **absolute** paths: in daemon mode the module runs as its own process, whose working directory is not the one you are typing in, so relative paths resolve to the wrong place. The `$(pwd)` in the heredoc takes care of it:

    ```sh
    mkdir -p "$(pwd)/storage-data"
    cat > config.json <<EOF
    {
        "data-dir": "$(pwd)/storage-data",
        "log-file": "$(pwd)/storage-data/storage.log"
    }
    EOF
    ```

    - `config.json` includes the following fields:

    | Field | Purpose |
    |-------|---------|
    | `data-dir` | Storage repository path (absolute) |
    | `log-file` | Node log destination (absolute) |

    - The default settings for Logos storage should be enough to get your node properly connected onto the Logos testnet. In case you want more control over port allocation, or want to learn more about how Logos storage operates, see [Connectivity](../concepts/connectivity.md).

    :::tip
    If you plan on running a node for longer, consider helping the network by setting up port mapping on your router (see [Connectivity](../concepts/connectivity.md) for details).
    :::

1.  Initialise the storage module. `init` is synchronous and returns `true` on success (the `@config.json` syntax loads the file's contents as the argument):

    ```sh
    logoscore call storage_module init @config.json
    ```

1.  Start the node. `start` is asynchronous: the return value only confirms the command was accepted; completion is signalled later by the `storageStart` event (delivered to event subscribers, not written to `logs.txt`):

    ```sh
    logoscore call storage_module start
    # Wait few seconds to start
    ```

1.  Inspect the running node with `debug`. It returns a lot of information about the node, including its `id` ([peer ID](../../get-started/glossary.md#peer-id)) and its `spr`, the signed record other nodes use to connect to you (see [Connectivity](../concepts/connectivity.md)):

    ```sh
    logoscore call storage_module debug | jq .result.value.id
    # "16Uiu2HAmMA4NuQoCHz9p7jUskVjDd8WncwG3p6qBNnhnftUE5Q9C" # Your peer ID
    logoscore call storage_module debug | jq .result.value.spr
    # "spr:CiUIAhIhA35P5KZosVyfWTfIHBVtC_PtI ... H9gX-vA" # Your SPR
    ```

## Publish a file

We will now publish a file to the Logos storage network. We create a simple file just for this tutorial, but you could publish any file you'd like.

1.  Create a file to publish:

    ```sh
    echo "Hello world from Logos Storage" > "$(pwd)/hello.txt"
    ```

1.  Upload the file to the network with `uploadUrl`. It takes an **absolute** path and a chunk size in bytes, and returns immediately; the upload runs in the background and completes with a `storageUploadDone` event:

    ```sh
    logoscore call storage_module uploadUrl "$(pwd)/hello.txt" 65536
    ```

    :::info
    The default chunk size is 65536.
    :::

1.  Extract the content ID ([CID](../../get-started/glossary.md#cid)) from the first `manifests` entry:

    ```sh
    # Wait a second for the upload to complete first
    logoscore call storage_module manifests \
       | jq -er '.result.value[0].cid' > cid.txt
    ```

## Download Farewell to Westphalia

We will now download the Logos book, [Farewell to Westphalia](https://logos.co/book), from the Logos storage network.

1. We will use `downloadToUrl` to download the file from the network and place it into your local disk. It takes the CID, an **absolute** destination path, a `local` flag, and a chunk size in bytes. We set `local` to `false` as this file is not currently available in your node. Like `uploadUrl` it runs in the background and completes with a `storageDownloadDone` event:

    ```sh
    CID="zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ"
    logoscore call storage_module downloadToUrl "$CID" "$(pwd)/farewell-to-westphalia.pdf" false 65536
    ```

    :::tip
    The `local` flag reads only from locally cached data when set to `true`; `false` fetches from the network.
    :::

1.  Wait for a while for the file to download. After a few seconds, check if the downloaded file is present at the destination path. You should try to open the pdf, and it should contain the whole book.

    ```sh
    shasum "$(pwd)/farewell-to-westphalia.pdf"
    # 2c6b4dc8e8e4dae336b87b9922c38f3c94217872  farewell-to-westphalia.pdf
    ```

## Remove content and shut everything down

To clear your local storage, destroy the storage node, and stop the daemon, follow the steps below.

1.  Remove content from local storage by its CID. `remove` returns immediately; the outcome arrives as a `storageRemoveDone` event:

    ```sh
    # Deletes the first file we uploaded.
    logoscore call storage_module remove "$(cat cid.txt)"
    # Deletes the Farewell to Westphalia book.
    logoscore call storage_module remove "zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ"
    ```

1.  Confirm the content is gone:

    ```sh
    # Wait a second for the removal to complete first
    logoscore call storage_module exists "$(cat cid.txt)" | jq '.result.value'
    logoscore call storage_module exists "zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ" | jq '.result.value'
    # false
    ```

1.  Stop the storage node. `stop` is asynchronous like `start`; completion is signalled by a `storageStop` event (delivered to event subscribers, not written to `logs.txt`). The node can be started and stopped multiple times:

    ```sh
    logoscore call storage_module stop
    # Wait a few seconds for the node to stop before destroying it
    ```

1.  Destroy the storage context. `destroy` is synchronous and must be called after the node is stopped:

    ```sh
    logoscore call storage_module destroy
    ```

1.  Stop the daemon and confirm it has exited:

    ```sh
    logoscore stop
    # Wait 5 seconds
    logoscore status
    # Logoscore Daemon
    #   Status:       not_running
    ```

## Troubleshooting Logos Storage

Connectivity problems (downloads timing out from another machine, no peers, unreachable node) are covered in the [Troubleshooting](troubleshooting.md) and [Connectivity](../concepts/connectivity.md) pages.
