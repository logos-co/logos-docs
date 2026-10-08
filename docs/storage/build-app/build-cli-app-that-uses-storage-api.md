---
title: Build a CLI app that uses the Storage API
doc_type: procedure
product: storage
topics: [storage]
steps_layout: sectioned
authors: giuliano, kashepavadan
owner: logos
doc_version: 2
slug: build-cli-app-that-uses-storage-api
sidebar_position: 1
---

# Build a CLI app that uses the Storage API

#### Wrap the Storage module API in a simple synchronous CLI interface.

:::tip[Version]
This document is accurate for **Testnet v0.3.0**.
:::

This tutorial uses **Storage module v3.0.2**, **Logos module builder 0.3.2**, and `logosctl 0.3.2`.

The [Storage Module API](https://logos-co.github.io/logos-storage-module/latest/api_reference.html) offers a comprehensive way to access the Storage module, but can be inconveniently complex for CLI access. This tutorial builds a wrapper [module](../../get-started/glossary.md#module)—a separate module that depends on [Logos Storage](../../get-started/glossary.md#logos-storage) and exposes a simpler, synchronous interface over it. It is intended for developers building custom Logos modules who want a straightforward CLI-style interface instead of working with the Storage module's asynchronous API directly.

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
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.3.2) installed.
   - Install it by running `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh | sudo sh`
:::

## What to expect

- You can scaffold a Logos module that wraps the Storage module's asynchronous API in a synchronous interface.
- You can publish a local file to the Logos Storage network with a single `storage_cli publish` command.
- You can download a file from the network with a single `storage_cli download` command.

## Step 1: Scaffold the module project

Use the Logos module builder template to scaffold a new module project:

```bash
mkdir ./storage_cli
cd ./storage_cli
git init
nix flake init -t github:logos-co/logos-module-builder/0.3.2
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

1.  Replace the generated `flake.nix` with the following pinned inputs:

    ```nix
    {
      inputs = {
        logos-module-builder.url = "github:logos-co/logos-module-builder/0.3.2";
        storage_module.url = "github:logos-co/logos-storage-module/v3.0.2";
      };

      # ...
    }
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

Create `src/storage_cli_impl.h` with the following interface. It declares two operations—`publish` and `download`—both of which return a [`StdLogosResult`](https://github.com/logos-co/logos-cpp-sdk/tree/95d7b3a9c5ef845bdc31f12f1d8222a12eda916d#logosresult) ([result type](https://en.wikipedia.org/wiki/Result_type)), and overrides `onContextReady`, a [Logos C++ SDK](https://github.com/logos-co/logos-cpp-sdk) hook called when the module is loaded:

```cpp showLineNumbers
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
   * Uploads a file to the local node and returns the completion result.
   */
  StdLogosResult publish(const std::string &input);
  /**
   * Downloads a file from the network onto the specified local path.
   * Returns the completion result.
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

    ```cpp showLineNumbers=16
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

    ```cpp showLineNumbers=27
    // We'll use two promises: one for synchronising node startup, and another for
    // upload/download operation results.
    std::promise<bool> gStarted;
    // The start future is potentially called by several different threads, so we
    // need a shared future.
    std::shared_future<bool> gStartedFut = gStarted.get_future().share();
    // A rejected start can also emit a completion event. Resolve startup only once.
    std::once_flag gStartedOnce;
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

    ```cpp showLineNumbers=45
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
      if (!j.is_object()) {
        echo("Failed to parse payload: " + payload);
        return json::object();
      }
      return j;
    }
    ```

## Step 5: Implement the synchronous transfer helper

1.  Add the `onProgress` and `onDone` callbacks. Both [`uploadUrl`](https://logos-co.github.io/logos-storage-module/latest/api_reference.html#_CPPv4N17StorageModuleImpl9uploadUrlERKNSt6stringE7int64_tb) and [`downloadToUrl`](https://logos-co.github.io/logos-storage-module/latest/api_reference.html#_CPPv4N17StorageModuleImpl13downloadToUrlERKNSt6stringERKNSt6stringEb7int64_tbb) report progress and completion through these callbacks. Progress events contain a byte increment and the total size. `onStarted` resolves the startup promise once, regardless of the result:

    ```cpp showLineNumbers=73
    void onProgress(const std::string &payload) {
      const json j = parsePayload(payload);
      gTransferBytes += j.value("bytes", int64_t{0});
      gTransferTotal = j.value("total", gTransferTotal);
      printProgress();
    }

    void onDone(const std::string &payload) { gResult.set_value(payload); }

    void onStarted(bool success) {
      std::call_once(gStartedOnce, [success] { gStarted.set_value(success); });
    }
    ```

1.  Add `syncTransferOp`, the helper that turns an asynchronous Storage operation into a synchronous one - this is the core of the module:

    ```cpp showLineNumbers=86
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
      const bool success = payload.value("success", false);
      return StdLogosResult{.success = success,
                            .value = payload,
                            .error = success ? "" : payload.value("error", "Transfer failed")};
    }

    } // namespace
    ```

    - `gStartedFut` waits until node startup succeeds or fails.
    - `gOpLock` serialises transfers because this example shares one result promise and progress counters.
    - The helper resets that state, dispatches `op()`, and waits for `onDone` to fulfil the result promise.
    - The returned result includes the completion payload and any transfer error.

## Step 6: Implement the context hook and the public operations

1.  Implement `onContextReady`, which registers the Storage module's callbacks and starts the Storage node:

    ```cpp showLineNumbers=119
    void StorageCliImpl::onContextReady() {
      StorageModule &storage = modules().storage_module;

      storage.onStorageStart([](const std::string &payload) {
        const json j = parsePayload(payload);
        echo("Node started with result: " + j.dump());
        onStarted(j.value("success", false));
      });

      storage.onStorageUploadProgress(&onProgress);
      storage.onStorageDownloadProgress(&onProgress);
      storage.onStorageUploadDone(&onDone);
      storage.onStorageDownloadDone(&onDone);

      echo("starting storage node (data-dir /tmp/logos-storage, network "
           "logos.test)...");

      if (storage.isRunning()) {
        onStarted(true);
        return;
      }
      if (!storage.init(kNodeConfig)) {
        echo("failed to initialise storage module");
        onStarted(false);
        return;
      }
      if (!storage.start()) {
        echo("node start was rejected");
        onStarted(false);
      }
    }
    ```

    :::note
    * To make the code in this tutorial simpler, failed initialisation or a rejected start make all subsequent transfers return `Node start failed`. You will need to reload the module to try again.
    * The Storage module stores its configuration in `~/.logos_storage/config.json`.
    :::

1.  Implement `publish`, which uploads a local file. The final `true` argument to `uploadUrl` enables advertising and serving the file to peers:

    ```cpp showLineNumbers=151
    StdLogosResult StorageCliImpl::publish(const std::string &input) {
      // Paths are resolved relative to the daemon process. Callers
      // should use absolute paths.
      std::error_code ec;
      const std::filesystem::path path = std::filesystem::absolute(input, ec);
      if (ec) {
        return {.success = false, .value = {}, .error = ec.message()};
      }
      const auto size = static_cast<int64_t>(std::filesystem::file_size(path, ec));
      if (ec) {
        echo("upload failed: cannot read " + input + " (" + ec.message() + ")");
        return {.success = false, .value = {}, .error = ec.message()};
      }

      echo("uploading " + path.string() + " (" + std::to_string(size) + " bytes)");

      return syncTransferOp("upload", size, [&] {
        return modules().storage_module.uploadUrl(path.string(), kChunkSize, true);
      });
    }
    ```

1.  Implement `download`, which downloads a file by its [CID](../../get-started/glossary.md#cid) onto local disk. The last two arguments to `downloadToUrl` select a direct download; i.e, not using the [Logos mix network](../concepts/mix.md) (`isPrivate=false`), and enable advertising and serving the downloaded data (`advertise=true`); i.e, your node will actively replicate and serve it:

    ```cpp showLineNumbers=171
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
                                                      kChunkSize, false, true);
      });
    }
    ```

## Step 7: Build your module

Build the module:

```bash
git add flake.nix metadata.json CMakeLists.txt src
nix build '.#lgx-portable'
git add flake.lock
```

- **Expected result:** an `.lgx` package appears under the `result` folder:

  ```bash
  $ ls result
  logos-storage_cli-module-lib.lgx
  ```

## Step 8: Start the Logos daemon

Package installs are handled by a module bundled inside the daemon, so the daemon has to be running before you install anything.

From the `storage_cli` project directory you have been working in since Step 1, start `logosctl`, using a project-local session so installed modules and daemon logs stay under `./config-dir`. The example stores file data separately in `/tmp/logos-storage`:

```bash
logosctl daemon start --detach --config-dir ./config-dir
```

## Step 9: Install the Storage module and your module

The Storage module is a dependency of your module, so install it first.

1.  Refresh the [catalogue](../../get-started/glossary.md#catalogue) and install the Storage module package by name:

    ```bash
    logosctl --config-dir ./config-dir catalog refresh
    logosctl --config-dir ./config-dir package install storage_module --version 3.0.2 --yes
    ```

1.  Install your own module package from the local `.lgx` file:

    ```bash
    logosctl --config-dir ./config-dir package install --file ./result/logos-storage_cli-module-lib.lgx --yes
    ```

    - Without `--yes`, `package install` asks for confirmation (`Proceed? [y/N]`), and fails with `Refusing to proceed without confirmation` when it cannot prompt (for example, in a script).

    - `package install` re-scans and unpacks into the session's own `modules/` directory (`./config-dir/modules/` here), so the daemon picks up both modules immediately—no restart needed.

## Step 10: Load the CLI module

1.  Confirm both modules are installed:

    ```bash
    logosctl --config-dir ./config-dir daemon status
    ```

    - **Expected result:**

      ```text
      Logosctl Daemon
        Status:       running
        PID:          405049
        Uptime:       0s
        Version:      v1.0.0

      Modules: 5 loaded, 0 crashed, 1 not loaded
        storage_cli         v1.0.0  not_loaded  -
        package_manager     v1.0.0  loaded      13s
        storage_module      v3.0.2  loaded      1s
        package_downloader  v1.0.0  loaded      13s
        modules_state       v0.1.0  loaded      13s
        capability_module   v1.0.0  loaded      13s
      ```

1.  Load the CLI module:

    ```bash
    logosctl --config-dir ./config-dir module load storage_cli
    ```

    - **Expected result:**

      ```text
      Loaded module: storage_cli (v1.0.0)
      ```

## Step 11: Publish a file

Create a sample file and publish it with the CLI module. Pass absolute paths because the daemon will otherwise resolves file paths relative to its own working directory:

```bash
echo "Hello, World!" > hello.txt
logosctl --config-dir ./config-dir call storage_cli publish "$PWD/hello.txt"
```

- **Expected result:**

  ```json
  {
    "error": null,
    "success": true,
    "value": {
      "cid": "zDvZRwzkx14BXkvr6MBpY7e29GgP3QBYM671u1P1kiLGYxt2iyHA",
      "sessionId": "0",
      "success": true
    }
  }
  ```

- Because the `onProgress` callback runs inside the daemon process, progress logs appear in the daemon's own log file (`./config-dir/logs/daemon.log`), not here. For a small file like this, progress is a single line:

  ```text
  [2026-08-19 18:58:13.540] [out] [storage_cli]   100% (14 of 14 bytes)
  ```

- You can share the CID that appears after your call to `publish` with other people, and they should be able to download it like we describe in the next step.

## Step 12: Download a file

Download [Farewell to Westphalia](https://logos.co/book/farewell-to-westphalia-foss-edition.pdf) from the Storage network by its CID:

```bash
logosctl --config-dir ./config-dir call storage_cli download zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ "$PWD/farewell-to-westphalia.pdf"
```

This may take a little while. On a node that has just started, the first attempts can fail after about 20 seconds, with `call to 'storage_cli.download' timed out after 20000ms`, `"error":"expected a result object, got null"`, or `RPC_FAILED`, because the node is still looking up the file's manifest on the network. A CLI timeout does not cancel the transfer. Check `./config-dir/logs/daemon.log` and wait for the pending operation to finish before retrying. If it remains stuck, stop and restart the daemon, then load `storage_cli` again.

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

- The daemon logs show download progress, including the total size:

  ```text
  [2026-10-08 15:41:51.980] [out] [storage_cli] Downloading zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ to /path/to/storage_cli/farewell-to-westphalia.pdf
  [2026-10-08 15:41:51.980] [out] [storage_cli] Waiting for node to start.
  [2026-10-08 15:41:51.980] [out] [storage_cli] Node is started, attempting to run download operation.
  [2026-10-08 15:41:51.993] [out] [storage_cli]   2% (65536 of 2276462 bytes)
  ...
  [2026-10-08 15:41:52.005] [out] [storage_cli]   100% (2276462 of 2276462 bytes)
  ```

The public download should produce a 2,276,462-byte PDF.

:::tip
Try uploading different files and sharing their `CIDs` with other network participants if you know anyone. They should be able to download them.
 :::

You may now stop the daemon (`logosctl --config-dir ./config-dir daemon stop`), or leave it running and use it for other operations.
