---
title: Run a Logos storage node
doc_type: procedure
product: storage
topics:
  - storage
  - node
steps_layout: flat
authors: gmega, kashepavadan
owner: logos
doc_version: 1
slug: run-logos-storage-node
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
    nix build 'github:logos-co/logos-storage-module/v2.0.1#lgx' -o storage-lgx
    ```

    - This produces a `logos-storage_module-module-lib.lgx` package in `./storage-lgx/`.

    <div data-gb-custom-block data-tag="hint" data-style="info" class="hint hint-info"><p>The initial Nix build takes 15–20 minutes on first run. Subsequent builds use the Nix cache and complete in seconds.</p></div>
2.  Install the package into a local modules directory using `lgpm`:

    ```sh
    lgpm --modules-dir ./modules install --file storage-lgx/*.lgx
    ```

## Start the daemon and load the storage module

Run `logoscore` with the modules directory, then load and initialise the [storage module](https://docs.logos.co/get-started/glossary#storage-module) against the testnet config.

1.  Start the `logoscore` daemon in background mode:

    ```sh
    logoscore -D -m ./modules
    ```
2.  Verify the daemon is running:

    ```sh
    logoscore status
    ```
3.  Create the storage config:

    ```sh
    mkdir -p storage-data
    cat > config.json <<EOF
    {
      "data-dir": "./storage-data",
      "log-level": "INFO",
      "listen-ip": "0.0.0.0",
      "listen-port": 8091,
      "disc-port": 8090,
      "nat": "extip:<public-ip>",
      "network": "logos.test"
    }
    EOF
    ```

    - `config.json` includes the following fields:

    | Field         | Purpose                      |
    | ------------- | ---------------------------- |
    | `data-dir`    | Storage repository path      |
    | `log-level`   | Log verbosity                |
    | `listen-ip`   | Local TCP bind address       |
    | `listen-port` | Public TCP libp2p port       |
    | `disc-port`   | Public UDP discovery port    |
    | `nat`         | Public IP advertisement mode |
    | `network`     | Storage network preset       |

    - Use fixed `listen-port` and `disc-port`; do not leave public nodes on random ports.
    - The `logos.test` preset provides the storage bootstrap settings.

    <div data-gb-custom-block data-tag="hint" data-style="info" class="hint hint-info"><p>To run storage with <a href="https://docs.logos.co/get-started/glossary#mix">mix</a> support, generate the config from the published mix bootstrap data:</p><pre class="language-sh"><code class="lang-sh">cat > make-mix-storage-config.sh &#x3C;&#x3C;'EOF'
    #!/usr/bin/env bash
    set -e

    data_dir=${1:-"./logos-storage-data"}
    udp_spr_json=$(curl -s https://logos-storage-network.fra1.digitaloceanspaces.com/v0.2/udp-sprs.json)
    tcp_spr_json=$(curl -s https://logos-storage-network.fra1.digitaloceanspaces.com/v0.2/tcp-sprs.json)

    wget https://logos-storage-network.fra1.digitaloceanspaces.com/v0.2/mix-pool.json
    mp_path=$(realpath "./mix-pool.json")

    cat &#x3C;&#x3C;JSON
    {
      "nat": "any",
      "log-level": "DEBUG",
      "mix-enabled": true,
      "listen-port": 8080,
      "disc-port": 8090,
      "bootstrap-node": $udp_spr_json,
      "dht-mix-proxy": $tcp_spr_json,
      "data-dir": "${data_dir}",
      "mix-pool": "${mp_path}"
    }
    JSON
    EOF

    chmod 755 make-mix-storage-config.sh
    ./make-mix-storage-config.sh > config.json
    </code></pre></div>
4.  Load the storage module, initialise it with the testnet configuration, and start it:

    ```sh
    logoscore load-module storage_module
    logoscore call storage_module init @config.json
    logoscore call storage_module start
    ```

    -   If using the mix config, also enable private queries and verify with a test download:

        ```sh
        logoscore call storage_module togglePrivateQueries true
        logoscore call storage_module downloadToUrl zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ ./farewell-to-westphalia.pdf false 65536
        ```

## Publish and download a file

Once the node is running and connected to the testnet, publish a file and verify the round-trip.

1.  Upload a file to the network with `uploadUrl`:

    ```sh
    logoscore call storage_module uploadUrl <file-path-or-url> <chunk-size-in-bytes>
    ```

    <div data-gb-custom-block data-tag="hint" data-style="info" class="hint hint-info"><p>The default chunk size is 65536.</p></div>
2.  After a second, extract the content ID (CID) from the first `manifests` entry:

    ```sh
    sleep 1

    logoscore call storage_module manifests \
       | jq -er '.result.value[0].cid' > cid.txt
    ```
3.  Download the file back from the network with `downloadToUrl`. You need the CID for this step.

    ```sh
    logoscore call storage_module downloadToUrl "$(cat cid.txt)" <destination-path> false <chunk-size-in-bytes>
    ```

    - `downloadToUrl` takes a `local` flag which reads only from locally cached data if set to `true`.
4. Confirm the downloaded file is present at `<output-path>` and matches the original.

## Remove content and destroy the storage node

To clear your local storage and destroy the storage node, follow the steps below.

1.  Remove content from local storage by its CID:

    ```sh
    logoscore call storage_module remove "$(cat cid.txt)"
    ```
2.  Confirm content is gone:

    ```sh
    sleep 1

    logoscore call storage_module exists "$(cat cid.txt)"
    # should return false
    ```
3.  Stop the storage node:

    ```sh
    logoscore call storage_module stop
    ```
4.  Wait a bit and destroy the entire storage context:

    ```sh
    sleep 2

    logoscore call storage_module destroy
    ```

## Troubleshooting Logos Storage

### Why does `downloadToUrl` time out when downloading from a different machine?

NAT is blocking the peer connection. When running multiple nodes across machines, the external IP and port mapping must be configured in `config.json`. See the NAT section of the [Logos Storage Module documentation](https://logos-co.github.io/logos-storage-module/latest/) for guidance.
