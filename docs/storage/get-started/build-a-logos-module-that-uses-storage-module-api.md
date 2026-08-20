---
title: Building a simple Logos app on the Storage module API
doc_type: procedure
product: storage
steps_layout: sectioned
authors: giuliano
owner: logos
doc_version: 1
slug: building-a-simple-logos-app-on-the-storage-module-api
sidebar_position: 1
---

# Building a CLI app on the Storage API

The [Storage Module API](https://logos-co.github.io/logos-storage-module/latest/api_reference.html) offers a comprehensive way to access the Storage module, but can be inconveniently complex for CLI access. In this tutorial, we will build a wrapper module over Storage; or rather, a separate module which uses Storage, and exposes a simpler interface.

:::info[Prerequisites]
- A supported OS
    - Linux
    - Mac OS (should work, but not tested)
- **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

  ```bash
  mkdir -p ~/.config/nix
  echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
  ```

  Verify: `nix flake --help >/dev/null 2>&1 && echo "Flakes enabled"`

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

At the end of this tutorial, you will have learned how to build a module on top of the Storage API which:

* connects to the Logos testnet;
* allows you to publish a file with:
  ```bash
  logoscore call storage_cli publish /path/to/file
  ```
* allows you to download a file with:
  ```bash
  logoscore call storage_cli download <file_cid> /path/to/download
  ```

## Step 1: Create the basic elements

We will use the Logos module builder for this:

```bash
mkdir ./storage_cli
cd ./storage_cli
nix flake init -t github:logos-co/logos-module-builder/0.2.0
```

## Step 2: Modify the `metadata.json` and CMake configuration

```json showLineNumbers
{
  "name": "storage_cli",
  "display_name": "Simple Storage CLI",
  "version": "1.0.0",
  "type": "core",
  "interface": "universal",
  "category": "example",
  "description": "A simple CLI frontend module to Logos module",
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

Apart from the plugin's name and description, we've added `"dependencies": ["storage_module"],` to indicate that this module depends on the Storage module, and `"concurrency": "multi"` so that the Logos request handler runs the calls on a thread that is separate from the single-threaded event loop -- this will make our lives "easier" when we try to turn the asynchronous Storage API calls into synchronous ones.

You should also delete the generated `src/minimal_impl.{h,cpp}` as we will be rolling out our own:

```bash
rm src/minimal_impl.{h,cpp}
```

and, finally, you should update your CMakeLists.txt file to include the correct file names. You should edit your `CMakeLists.txt` file and replace the part that contains:

```cmake
# Define the module. The generated glue is compiled automatically.
logos_module(
    NAME ${MODULE_NAME}
    SOURCES
        src/minimal_impl.h
        src/minimal_impl.cpp
)
```

with:

```cmake
# Define the module. The generated glue is compiled automatically.
logos_module(
    NAME ${MODULE_NAME}
    SOURCES
        src/storage_cli_impl.h
        src/storage_cli_impl.cpp
)
```

## Step 3: Define the interface

Next, we will define our module's interface. Create a file named `src/storage_cli_impl.h` with the following in it:

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

This has the two simple operations we want to have: `publish` which publishes a file, `download` which downloads an existing file onto our local disk. Apart from the unsurprising operation names and parameters, two things are worth noting:

1. operations return a [StdLogosResult](https://github.com/logos-co/logos-cpp-sdk/tree/95d7b3a9c5ef845bdc31f12f1d8222a12eda916d#logosresult), which is a [result type](https://en.wikipedia.org/wiki/Result_type);
1. we declare an override to `onContextReady`, which is a [Logos C++ SDK](https://github.com/logos-co/logos-cpp-sdk) hook that gets called when the module is loaded.

## Step 4: Main implementation

The implementation should go in a file named `src/storage_cli_impl.cpp`. At the beginning, include the header we defined before, as well as other headers we need:

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

Note that `nlohmann/json` (included in line 9) ships with the Logos SDK, so we don't need to install it separately. Next, we open our namespace and define some constants - namely, the configuration we will be using for our node and the chunk size for transfer operations.

```cpp showLineNumbers=12
namespace {

constexpr const char *kNodeConfig = R"({
    "log-level": "INFO",
    "nat": "auto",
    "data-dir": "/tmp/logos-storage",
    "network": "logos.test"
})";

constexpr int64_t kChunkSize = 65536;

```

The Storage module exposes mostly asynchronous API calls, and those are not convenient for CLIs in which the user expects the operation to be complete once control returns to the terminal. Our plan, therefore, is to make both `publish` and `download` fully synchronous. We will rely on standard C++ [promises](https://en.cppreference.com/cpp/thread/promise) to do that. We will also use a [mutex](https://en.cppreference.com/cpp/thread/mutex) to serialize `publish/download` operations and keep our bookkeeping simple:

```cpp showLineNumbers=23
// We'll use two promises: one for synchronizing node startup, and another for
// upload/download operation results.
std::promise<bool> gStarted;
// The start future is potentially called by several different threads, so we
// need a shared future.
std::shared_future<bool> gStartedFut = gStarted.get_future().share();
// gResult is initialized during an asynchronous operation dispatch, set in
// the callback once, and consumed by the dispatcher exactly once, so we can
// use a regular future.
std::promise<std::string> gResult;
// Serializes upload/download operations.
std::mutex gOpLock;

int64_t gTransferBytes = 0;
int64_t gTransferTotal = 0;

```

We'll use `gTransferTotal` and `gTransferBytes` to keep track of the progress of the (single) `publish`/`download` operations we allow to run at a time. Next, we define helpers for printing `publish`/`download` progress, and for parsing the JSON payloads we get from the Storage module:

```cpp showLineNumbers=39
void echo(const std::string &line, bool endline = true) {
  std::cout << "[storage_cli] " << line;
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

We also define `onDone` and `onProgress` callbacks, which will be invoked by the Storage module's [uploadUrl](https://logos-co.github.io/logos-storage-module/latest/api_reference.html#_CPPv4N17StorageModuleImpl9uploadUrlERKNSt6stringE7int64_t) and [downloadToUrl](https://logos-co.github.io/logos-storage-module/latest/api_reference.html#_CPPv4N17StorageModuleImpl13downloadToUrlERKNSt6stringERKNSt6stringEb7int64_t) operations as they complete or make progress, respectively:

```cpp showLineNumbers=67
void onProgress(const std::string &payload) {
  gTransferBytes += parsePayload(payload).value("bytes", int64_t{0});
  printProgress();
}

void onDone(const std::string &payload) { gResult.set_value(payload); }

```

Next, comes the implementation of our "transfer helper" - a function that handles the common logic for both publish and download operations, and is perhaps the most important part of our module:

```cpp  showLineNumbers=74
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

  // Storage has its own internal op timeout so I don't need one here.
  const std::string result = gResult.get_future().get();
  const json payload = parsePayload(result);
  return StdLogosResult{.success = payload.value("success", false),
                        .value = payload,
                        .error = ""};
}
```

It is worth analysing what it does: lines 76-80 wait on the `gStarted` promise, which is set when the node starts. Line 85 acquires the operation lock and effectively blocks two `syncTransferOp` calls from running concurrently beyond that point. Lines 87-89 set up the state for the operations by clearing the completion counters and resetting the result promise.

Line 92 actually sends the operation to the Storage module and, if the operation dispatches successfully (line 93), it proceeds to wait on the promise that will be set by the `onDone` callback shown in the previous listing when the operation completes. Finally, once the operation completes, Lines 99-102 extract the result and return it.

The final part of our implementation contains the operations themselves (which invoke the `syncTransferOp` helper above), the missing callbacks, and the implementation for the `onContextReady` hook:

```cpp showLineNumbers=104
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
    echo("failed to initialize storage module. We'll assume it has already "
         "been initialized.");
    gStarted.set_value(true);
    return;
  }
  if (!storage.start()) {
    echo("node start was rejected. We'll assume it has already been started.");
    gStarted.set_value(true);
  }
}

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

The implementation is mostly straightforward: we use `onContextReady` to initialize the Storage module if not already, and the download and upload operations are thin wrappers on `syncTransferOp` that invoke the appropriate Storage module API and deal with input and output files.

Note that we assume, in lines 121-130, that failures in dispatching `init` or `start` mean that the module has already been initialized/started. The reality is that we do not know and have no simple API to query that, so we cannot distinguish between "already initialized/started" and "failed to initialize/started". The safest approach is to not reload this module, or to reinitialize the whole node in case you do.

## Step 5: Building your module

Once you have implemented the module, you can build and run it using the Logos tooling suite. To build your module, run:

```bash
nix build '#lgx-portable'
```

Assuming the build goes well, you should see, under the `result` folder:

```bash
$ ls result
logos-storage_cli-module-lib.lgx
```

## Step 6: Download and install the Storage module

The Storage module is a dependency, and you should download and install it using the Logos tools:

```bash
lgpd --version 2.1.2 download storage_module -o .
lgpm install --file ./storage_module-2.1.2.lgx --modules-dir ./modules
```

## Step 7: Install your module

Next, you can install your own module:

```bash
lgpm install --file ./result/logos-storage_cli-module-lib.lgx --modules-dir ./modules
```

## Step 8: Start the Logos daemon

Start a new terminal, and run:

```bash
logoscore -D --config-dir ./config-dir -m ./modules
```

The logos daemon will start, and will print its logs on the terminal. You can also run this as a background process and redirect logs if you prefer.

## Step 9: Load the CLI module

Check that the modules are installed correctly by issuing:

```bash
$ logoscore --config-dir ./config-dir status
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

Now load the CLI module:

``` bash
$ logoscore --config-dir ./config-dir load-module storage_cli

Loaded module: storage_cli (v1.0.0)
  Dependencies loaded: storage_module
```

## Step 10: Publish a file

Let's use the CLI to publish a file:

```bash
$ echo "Hello, World!" > hello.txt
$ logoscore --config-dir ./config-dir call storage_cli publish ./hello.txt
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

Because the `onProgress` callback is invoked in the module, the progress logs will show up in the daemon terminal. This is a small file, so progress is a single line:

```text
[2026-08-19 18:58:13.540] [out] [storage_cli]   100% (13 of 13 bytes)
```

## Step 11: Download a file

Let's use the CLI to download the [Logos book](https://logos.co/book/farewell-to-westphalia-foss-edition.pdf), which is available in the Storage network:

```bash
logoscore --config-dir ./config-dir call storage_cli download zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ ./farewell-to-westphalia.pdf
```

This should take a little while, and then print:

```bash
{
  "error": null,
  "success": true,
  "value": {
    "sessionId": "zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ",
    "success": true
  }
}
```

In the daemon logs, you should see the download progressing, e.g.:

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

You can now stop the daemon or just leave it running and use it for other operations.