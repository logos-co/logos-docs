---
title: Build a CLI app that uses the Storage API
doc_type: procedure
product: storage
topics: [storage]
steps_layout: sectioned
authors: giuliano, kashepavadan
owner: logos
doc_version: 1
slug: build-cli-app-that-uses-storage-api
sidebar_position: 1
---

# Build a CLI app that uses the Storage API

#### Wrap the Storage module API in a simple synchronous CLI interface.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

The [Storage Module API](https://logos-co.github.io/logos-storage-module/latest/api_reference.html) offers a comprehensive way to access the Storage module, but can be inconveniently complex for CLI access. This tutorial builds a wrapper [module](https://docs.logos.co/get-started/glossary#module)—a separate module that depends on Logos Storage and exposes a simpler, synchronous interface over it. It is intended for developers building custom Logos modules who want a straightforward CLI-style interface instead of working with the Storage module's asynchronous API directly.

:::info[Prerequisites]
- A supported OS
    - Linux
    - Mac OS (should work, but not tested)
- **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

  ```bash
  mkdir -p ~/.config/nix
  echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
  ```

- **Git**
- The Logos tooling suite:
    - [`logoscore`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.2.2) (the Logos runtime);
    - [`lgpd`](https://github.com/logos-co/logos-package-downloader/releases/tag/0.2.1) (the Logos package downloader);
    - [`lgpm`](https://github.com/logos-co/logos-package-manager/releases/tag/0.2.1) (the Logos package manager).

  You can obtain those by running:

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

- You can scaffold a Logos module that wraps the Storage module's asynchronous API in a synchronous interface.
- You can publish a local file to the Logos Storage network with a single `storage_cli publish` command.
- You can download a file from the network with a single `storage_cli download` command.

## Step 1: Scaffold the module project

1.  Use the Logos module builder template to scaffold a new module project:

    ```bash
    mkdir ./storage_cli
    cd ./storage_cli
    nix flake init -t github:logos-co/logos-module-builder/0.2.0
    ```

## Step 2: Configure the module metadata, flake, and CMake files

1.  Replace the contents of `metadata.json` with the following. It declares a dependency on `storage_module` and sets `concurrency` so the module's calls run off the main event loop:

    ```json showLineNumbers
    {
      "name": "storage_cli",
      "display_name": "Simple Storage CLI",
      "version": "1.0.0",
      "type": "core",
      "interface": "universal",
      "category": "example",
      "description": "A simple CLI frontend module to Logos Storage",
      "main": "storage_cli_plugin",
      "dependencies": ["storage_module"],
      "concurrency": "multi",
      "nix": {
        "packages": {
          "build": [],
          "runtime": []
        },
        "external_libraries": [],
        "cmake": {
          "find_packages": [],
          "extra_sources": [],
          "extra_include_dirs": [],
          "extra_link_libraries": []
        }
      }
    }
    ```

    - `"dependencies": ["storage_module"]` declares that this module depends on the Storage module.
    - `"concurrency": "multi"` runs the request handler on a thread separate from the single-threaded event loop, which makes it easier to turn the asynchronous Storage API calls into synchronous ones later.

1.  Delete the generated placeholder implementation, since you'll provide your own:

    ```bash
    rm src/minimal_impl.{h,cpp}
    ```

1.  Edit the generated `flake.nix` to add the Storage module as an input:

    ```nix
    inputs = {
      # Replace the line:
      #   logos-module-builder.url = "github:logos-co/logos-module-builder";
      # with:
      logos-module-builder.url = "github:logos-co/logos-module-builder/0.2.0";
      # and add this:
      storage_module.url = "github:logos-co/logos-storage-module/v2.1.2";
    };
    ```

1.  Edit `CMakeLists.txt` to reference the new source file names. Replace `logos_module` with:

    ```cmake
    # Define the module. The generated glue is compiled automatically.
    logos_module(
        NAME ${MODULE_NAME}
        SOURCES
            src/storage_cli_impl.h
            src/storage_cli_impl.cpp
    )
    ```

## Step 3: Define the module interface

1.  Create `src/storage_cli_impl.h` with the following interface. It declares two operations—`publish` and `download`—both of which return a [`StdLogosResult`](https://github.com/logos-co/logos-cpp-sdk/tree/95d7b3a9c5ef845bdc31f12f1d8222a12eda916d#logosresult) ([result type](https://en.wikipedia.org/wiki/Result_type)), and overrides `onContextReady`, a [Logos C++ SDK](https://github.com/logos-co/logos-cpp-sdk) hook called when the module is loaded:

    ```cpp showLineNumbers
    // storage_cli_impl.h
    #pragma once

    #include <logos_module_context.h>
    #include <logos_result.h>
    #include <string>

    /**
     * A synchronous, CLI-shaped facade over the asynchronous `storage_module`.
     */
    class StorageCliImpl : public LogosModuleContext {
    public:
      /**
       * Uploads a file to the local node.
       */
      StdLogosResult publish(const std::string &input);
      /**
       * Downloads a file from the network onto the specified local path.
       */
      StdLogosResult download(const std::string &cid, const std::string &output);

    protected:
      /// Starts (and configures) the storage node when the module is loaded.
      void onContextReady() override;
    };
    ```

## Step 4: Set up shared state and helper functions

The rest of the implementation goes in `src/storage_cli_impl.cpp`. Add the file's includes, then the shared state and small helper functions the rest of the module will use.

1.  Start `src/storage_cli_impl.cpp` with its header and includes. `nlohmann/json` ships with the Logos SDK, so you don't need to install it separately:

    ```cpp showLineNumbers
    // storage_cli_impl.cpp
    #include "storage_cli_impl.h"
    #include "logos_sdk.h"

    #include <algorithm>
    #include <cstdint>
    #include <filesystem>
    #include <functional>
    #include <future>
    #include <iostream>
    #include <mutex>
    #include <system_error>
    #include <nlohmann/json.hpp>

    using nlohmann::json;
    ```

1.  Open an anonymous namespace and define the node configuration and transfer chunk size:

    ```cpp showLineNumbers=17
    namespace {

    constexpr const char *kNodeConfig = R"({
        "log-level": "INFO",
        "nat": "auto",
        "data-dir": "/tmp/logos-storage",
        "network": "logos.test"
    })";

    constexpr int64_t kChunkSize = 65536;
    ```

1.  Add standard C++ [promises](https://en.cppreference.com/cpp/thread/promise) to make the `publish`/`download` operations synchronous and a [mutex](https://en.cppreference.com/cpp/thread/mutex) to serialise these operations:

    ```cpp showLineNumbers=28
    // We'll use two promises: one for synchronising node startup, and another for
    // upload/download operation results.
    std::promise<bool> gStarted;
    // The start future is potentially called by several different threads, so we
    // need a shared future.
    std::shared_future<bool> gStartedFut = gStarted.get_future().share();
    // gResult is initialised during an asynchronous operation dispatch, set in
    // the callback once, and consumed by the dispatcher exactly once, so we can
    // use a regular future.
    std::promise<std::string> gResult;
    // Serialises upload/download operations.
    std::mutex gOpLock;

    int64_t gTransferBytes = 0;
    int64_t gTransferTotal = 0;
    ```

    - `gTransferTotal` and `gTransferBytes` track the progress of the single `publish`/`download` operation this module allows to run at a time.

1.  Add helper functions for printing transfer progress and for parsing JSON payloads returned by the Storage module:

    ```cpp showLineNumbers=44
    void echo(const std::string &line, bool endline = true) {
      std::cout << line;
      if (endline) {
        std::cout << '\n';
      }
      std::cout.flush();
    }

    void printProgress() {
      if (gTransferTotal == 0) {
        echo(" " + std::to_string(gTransferBytes) + " bytes");
        return;
      }
      int64_t completed = std::min(gTransferBytes, gTransferTotal);
      echo("  " + std::to_string(completed * 100 / gTransferTotal) + "% (" +
           std::to_string(completed) + " of " + std::to_string(gTransferTotal) +
           " bytes)");
    }

    json parsePayload(const std::string &payload) {
      json j = json::parse(payload, nullptr, false);
      if (j.is_discarded()) {
        echo("Failed to parse payload: " + payload);
        return {};
      }
      return j;
    }
    ```

## Step 5: Implement the synchronous transfer helper

1.  Add the `onProgress` and `onDone` callbacks. The Storage module invokes these as the [`uploadUrl`](https://logos-co.github.io/logos-storage-module/latest/api_reference.html#_CPPv4N17StorageModuleImpl9uploadUrlERKNSt6stringE7int64_t) operation progresses and the [`downloadToUrl`](https://logos-co.github.io/logos-storage-module/latest/api_reference.html#_CPPv4N17StorageModuleImpl13downloadToUrlERKNSt6stringERKNSt6stringEb7int64_t) operation completes, respectively:

    ```cpp showLineNumbers=72
    void onProgress(const std::string &payload) {
      gTransferBytes += parsePayload(payload).value("bytes", int64_t{0});
      printProgress();
    }

    void onDone(const std::string &payload) { gResult.set_value(payload); }
    ```

1.  Add `syncTransferOp`, the helper that turns an asynchronous Storage operation into a synchronous one—this is the core of the module:

    ```cpp showLineNumbers=79
    StdLogosResult syncTransferOp(const std::string &what, int64_t total,
                                  const std::function<StdLogosResult()> &op) {
      echo("Waiting for node to start.");
      if (!gStartedFut.get()) {
        return StdLogosResult{
            .success = false, .value = {}, .error = "Node start failed"};
      }
      echo("Node is started, attempting to run " + what + " operation.");

      // This will block attempts to run multiple operations at once.
      // This is not a limitation in storage but of our state tracking.
      std::scoped_lock lock(gOpLock);

      gResult = std::promise<std::string>();
      gTransferBytes = 0;
      gTransferTotal = total;

      // Actually sends the operation to Storage.
      StdLogosResult started = op();
      if (!started.success) {
        return started;
      }

      const std::string result = gResult.get_future().get();
      const json payload = parsePayload(result);
      return StdLogosResult{.success = payload.value("success", false),
                            .value = payload,
                            .error = ""};
    }
    } // namespace
    ```

    - Lines 81-85 wait on the `gStartedFut` promise, which is set once the node has started.
    - Line 90 acquires `gOpLock` so two `syncTransferOp` calls can't run concurrently.
    - Lines 92-94 reset the result promise and progress counters
    - Line 97 dispatches the operation via `op()`, and blocks on the result promise, which is fulfilled by the `onDone` callback above once the operation completes.
    - Lines 103-106 parse and return the result.

## Step 6: Implement the context hook and the public operations

1.  Implement `onContextReady`, which registers the Storage module's callbacks and starts the Storage node:

    ```cpp showLineNumbers=111
    void StorageCliImpl::onContextReady() {
      StorageModule &storage = modules().storage_module;

      storage.onStorageStart([](const std::string &payload) {
        const json j = parsePayload(payload);
        echo("Node started with result: " + j.dump());
        gStarted.set_value(j.value("success", false));
      });

      storage.onStorageUploadProgress(&onProgress);
      storage.onStorageDownloadProgress(&onProgress);
      storage.onStorageUploadDone(&onDone);
      storage.onStorageDownloadDone(&onDone);

      echo("starting storage node (data-dir /tmp/logos-storage, network "
           "logos.test)...");

      if (!storage.init(kNodeConfig)) {
        echo("failed to initialise storage module. We'll assume it has already "
             "been initialised.");
        gStarted.set_value(true);
        return;
      }
      if (!storage.start()) {
        echo("node start was rejected. We'll assume it has already been started.");
        gStarted.set_value(true);
      }
    }
    ```

    :::note
    `onContextReady` assumes that a failure to dispatch `init` or `start` means the module was already initialised or started, since there's no API to distinguish that case from a genuine failure. Avoid reloading this module; if you do, restart the whole node instead.
    :::

1.  Implement `publish`, which uploads a local file:

    ```cpp showLineNumbers=140
    StdLogosResult StorageCliImpl::publish(const std::string &input) {
      std::error_code ec;
      const std::filesystem::path path = std::filesystem::absolute(input, ec);
      const auto size = static_cast<int64_t>(std::filesystem::file_size(path, ec));
      if (ec) {
        echo("upload failed: cannot read " + input + " (" + ec.message() + ")");
        return {.success = false, .value = {}, .error = ec.message()};
      }

      echo("uploading " + path.string() + " (" + std::to_string(size) + " bytes)");

      return syncTransferOp("upload", size, [&] {
        return modules().storage_module.uploadUrl(path.string(), kChunkSize);
      });
    }
    ```

1.  Implement `download`, which downloads a file by its CID onto local disk:

    ```cpp showLineNumbers=156
    StdLogosResult StorageCliImpl::download(const std::string &cid,
                                            const std::string &output) {
      std::error_code ec;
      const std::filesystem::path path = std::filesystem::absolute(output, ec);
      if (ec) {
        echo("download failed: bad output path " + output + " (" + ec.message() +
             ")");
        return {.success = false, .value = {}, .error = ec.message()};
      }

      echo("Downloading " + cid + " to " + path.string());

      return syncTransferOp("download", 0, [&] {
        return modules().storage_module.downloadToUrl(cid, path.string(), false,
                                                      kChunkSize);
      });
    }
    ```

## Step 7: Build your module

1.  Build the module:

    ```bash
    nix build '.#lgx-portable'
    ```

    - **Expected result:** an `.lgx` package appears under the `result` folder:

      ```bash
      $ ls result
      logos-storage_cli-module-lib.lgx
      ```

## Step 8: Download and install the Storage module

The Storage module is a dependency of your module, so install it before loading your own.

1.  Download the Storage module package:

    ```bash
    lgpd --version 2.1.2 download storage_module -o .
    ```

1.  Install it:

    ```bash
    lgpm install --file ./storage_module-2.1.2.lgx --modules-dir ./modules
    ```

## Step 9: Install your module

1.  Install your module package:

    ```bash
    lgpm install --file ./result/logos-storage_cli-module-lib.lgx --modules-dir ./modules
    ```

## Step 10: Start the Logos daemon

1.  In a new terminal, start `logoscore`:

    ```bash
    # Make sure to export the PATH and navigate to the correct repository in the new terminal window
    export PATH="$PWD/bin:$PATH"
    cd ./storage_cli

    logoscore -D --config-dir ./config-dir -m ./modules
    ```

    - The daemon prints its logs to the terminal. You can also run it as a background process and redirect logs if you prefer.

## Step 11: Load the CLI module

1.  Confirm both modules are installed:

    ```bash
    logoscore --config-dir ./config-dir status
    ```

    - **Expected result:**

      ```text
      Logoscore Daemon
        Status:       running
        PID:          405049
        Uptime:       0s
        Version:      v1.0.0

      Modules: 1 loaded, 0 crashed, 2 not loaded
        storage_module     v2.1.2  not_loaded  -
        storage_cli        v1.0.0  not_loaded  -
        capability_module  v1.0.0  loaded      14s
      ```

1.  Load the CLI module:

    ```bash
    logoscore --config-dir ./config-dir load-module storage_cli
    ```

    - **Expected result:**

      ```text
      Loaded module: storage_cli (v1.0.0)
        Dependencies loaded: storage_module
      ```

## Step 12: Publish a file

1.  Create a sample file and publish it with the CLI module:

    ```bash
    echo "Hello, World!" > hello.txt
    logoscore --config-dir ./config-dir call storage_cli publish ./hello.txt
    ```

    - **Expected result:**

      ```json
      {
        "error": null,
        "success": true,
        "value": {
          "cid": "zDvZRwzm9g47yb761bU9ZRsteTiAxgTdgKz81NndDu5ESgmGfYWZ",
          "sessionId": "0",
          "success": true
        }
      }
      ```

    - Because the `onProgress` callback runs inside the daemon process, progress logs appear in the daemon's terminal, not here. For a small file like this, progress is a single line:

      ```text
      [2026-08-19 18:58:13.540] [out] [storage_cli]   100% (13 of 13 bytes)
      ```

## Step 13: Download a file

1.  Download [Farewell to Westphalia](https://logos.co/book/farewell-to-westphalia-foss-edition.pdf) from the Storage network by its CID:

    ```bash
    logoscore --config-dir ./config-dir call storage_cli download zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ ./farewell-to-westphalia.pdf
    ```

    This may take a little while.

    - **Expected result:**

      ```json
      {
        "error": null,
        "success": true,
        "value": {
          "sessionId": "zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ",
          "success": true
        }
      }
      ```

    - The daemon logs show the download progressing, e.g.:

      ```text
      [2026-08-19 19:04:53.920] [out] [storage_cli] [storage_cli] Downloading zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ to /home/giuliano/logos-v0.2.1/./farewell-to-westphalia.pdf
      [2026-08-19 19:04:53.920] [out] [storage_cli] Waiting for node to start.
      [2026-08-19 19:04:53.920] [out] [storage_cli] Node is started.
      [2026-08-19 19:04:53.922] [out] [storage_cli]  65536 bytes
      [2026-08-19 19:04:53.922] [out] [storage_cli]  131072 bytes
      ...
      [2026-08-19 19:04:53.928] [out] [storage_cli]  2228224 bytes
      [2026-08-19 19:04:53.928] [out] [storage_cli]  2276462 bytes
      ```

You may now stop the daemon, or leave it running and use it for other operations.
