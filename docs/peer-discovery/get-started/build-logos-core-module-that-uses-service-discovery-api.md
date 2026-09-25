---
title: Build a Logos Core module that uses the Service Discovery API
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: gmelodie, kashepavadan
owner: logos
doc_version: 1
slug: build-logos-core-module-that-uses-service-discovery-api
sidebar_position: 5
---

# Build a Logos Core module that uses the Service Discovery API

#### Get started with typed, service-keyed peer lookups in a live Logos network.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

Applications on the Logos network need a protocol-agnostic way to find peers offering specific services—[mix](../../get-started/glossary.md#mix) nodes, relay nodes, storage providers—at runtime without hard-coding topology or peer lists. The Service Discovery API enables any Logos Core [module](../../get-started/glossary.md#module) to perform typed, service-keyed peer lookups that work from lightweight client nodes that do not participate in DHT routing, unblocking any app that needs to wire itself into a live Logos network service. This procedure covers how to write and run a Logos Core module that calls the `libp2p_module` Service Discovery API to advertise a named service to the network and discover other peers offering that same service.

:::info[Prerequisites]

- A supported OS:
    - Linux: Ubuntu 22.04+
    - macOS: 14+
- 2 GB RAM (sufficient for a local two-module test)
- **Nix** with flakes enabled.
   - Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

   ```bash
   mkdir -p ~/.config/nix
   echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
   ```
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.2.3) installed.
   - Install it by running `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh | sudo sh`
:::

## What to expect

- You can advertise a named service from a Logos Core module and discover peers offering the same service via the Kad-DHT, without hard-coding peer addresses.
- You can verify the full discovery flow locally across three `logosctl` daemon instances, each with its own session and listen port.
- You have a reusable module scaffold with typed `disco*` wrappers that you can extend for production service types.

## Step 1: Smoke-test the bundled example binary (Optional)

Build and run the self-contained two-node demo to confirm the module and its C bindings are working before writing your own module.

1. Clone the repository and enter the project directory:

   ```sh
   git clone https://github.com/logos-co/logos-libp2p-module
   cd logos-libp2p-module
   ```

1. Build the module:

   ```sh
   nix build -L
   ```

   :::info
   The first-run Nix build can take 5–20 minutes to fetch dependencies; subsequent builds are cached. Estimated total time is 15–25 minutes.
   :::
   
1. Build the service discovery tutorial from the root project and run it. The Nix development shell provides the C-binding header and library, so nothing needs to be copied into `./lib`:

   ```sh
   nix develop --command bash -c 'cmake -B build -S . && cmake --build build --target tutorial_9_service_discovery -j'
   nix develop --command ./build/tutorial/tutorial_9_service_discovery
   ```

   Expected output (between the node's log lines):

   ```
   === Tutorial 9: Service Discovery ===

   Bootstrap node started: 12D3KooW...
   Advertiser connected to bootstrap
   Discoverer connected to bootstrap

   Advertiser advertising: "demo-chat-service"
   Advertising started
   Discoverer registering interest in "demo-chat-service"
   Discoverer looking up "demo-chat-service"...
   Discoverer found 1 provider(s):
     Peer: 12D3KooW...
       Service: demo-chat-service (data: version=1.0;capacity=100)

   Random lookup by advertiser...
   Found 2 random peer(s):
   ...
   === Tutorial 9 Complete ===
   ```

   - [Peer IDs](../../get-started/glossary.md#peer-id) are non-deterministic across runs.

   :::info
   The tutorial runs a bootstrap node plus an advertiser and a discoverer, so the discoverer finds the advertiser through the DHT—a successful run prints `found 1 provider(s)`. Exact peer counts and IDs vary per run.
   :::

## Step 2: Scaffold the new Logos Core module

Run the scaffold tool from the parent directory to generate the module skeleton, then declare the `libp2p_module` dependency.

1. From the parent directory, scaffold the module:

   ```sh
   cd ..
   nix run github:logos-co/logos-dev-boost -- init my_service_module --type module
   cd logos-my-service-module
   ```

   - The scaffold tool prefixes the output directory with `logos-`, producing `logos-my-service-module`.

1. Replace the contents of `metadata.json` with the following to declare the `libp2p_module` dependency:

   ```json
   {
     "name": "my_service_module",
     "version": "1.0.0",
     "description": "Service discovery demo module",
     "type": "core",
     "interface": "universal",
     "main": "my_service_module_plugin",
     "dependencies": ["libp2p_module"]
   }
   ```

1. Replace the contents of `src/my_service_module_impl.h` with the following:

   ```cpp
   // my_service_module_impl.h — inherit LogosModuleContext:
   #pragma once
   #include <string>
   #include "logos_module_context.h"

   class MyServiceModuleImpl : public LogosModuleContext {
   public:
       std::string startDiscovery();
       std::string getPeerInfo();
       std::string advertise(const std::string& serviceId, const std::string& serviceData);
       std::string discover(const std::string& serviceId);
       std::string stopDiscovery();
   };
   ```

1. Replace the contents of `src/my_service_module_impl.cpp` with the following:

   ```cpp
   #include "my_service_module_impl.h"
   #include "logos_sdk.h"   // generated; defines: struct LogosModules { Libp2pModule libp2p_module; };
   #include <thread>
   #include <chrono>

   std::string MyServiceModuleImpl::startDiscovery() {
       auto r = modules().libp2p_module.start();
       if (!r.success) return "start failed: " + r.error;
       auto r2 = modules().libp2p_module.discoStart();
       if (!r2.success) return "discoStart failed: " + r2.error;
       return "discovery started";
   }

   // Returns this node's own peer record (peerId + listen addrs). Use it on a
   // bootstrap node to obtain the peerId/addr that other instances bootstrap against.
   std::string MyServiceModuleImpl::getPeerInfo() {
       auto r = modules().libp2p_module.peerInfo();
       if (!r.success) return "peerInfo failed: " + r.error;
       return r.value.is_string() ? r.value.get<std::string>() : r.value.dump();
   }

   std::string MyServiceModuleImpl::advertise(const std::string& serviceId,
                                              const std::string& serviceData) {
       // discoStartAdvertising takes serviceId, serviceData and an optional
       // base64 advertisement (a signed XPR); "" lets the module build it.
       auto r = modules().libp2p_module.discoStartAdvertising(serviceId, serviceData, "");
       if (!r.success) return "advertise failed: " + r.error;
       return "advertising " + serviceId;
   }

   std::string MyServiceModuleImpl::discover(const std::string& serviceId) {
       auto r = modules().libp2p_module.discoRegisterInterest(serviceId);
       if (!r.success) return "registerInterest failed: " + r.error;
       std::this_thread::sleep_for(std::chrono::milliseconds(500));
       // "" serviceData = match any advertisement of this serviceId.
       auto r2 = modules().libp2p_module.discoLookup(serviceId, "");
       if (!r2.success) return "lookup failed: " + r2.error;
       return r2.value.is_string() ? r2.value.get<std::string>() : r2.value.dump();
   }

   std::string MyServiceModuleImpl::stopDiscovery() {
       auto r = modules().libp2p_module.discoStop();
       if (!r.success) return "discoStop failed: " + r.error;
       auto r2 = modules().libp2p_module.stop();
       if (!r2.success) return "stop failed: " + r2.error;
       return "discovery stopped";
   }
   ```

1. Add `libp2p_module` as a flake input in `flake.nix`:

   ```nix
   inputs = {
     logos-module-builder.url = "github:logos-co/logos-module-builder";
     libp2p_module.url  = "github:logos-co/logos-libp2p-module";
   };
   ```

   :::info
   For local development, override`flake.nix` at build time:

   ```bash
   nix build --override-input libp2p_module path:../logos-libp2p-module
   ```
   :::

## Step 3: Build both modules

The `.#install-portable` target runs `lgpm` internally and produces the directory structure `logosctl` requires. You only write `metadata.json`; the install target generates `manifest.json`, `variant`, and co-locates all `.so` files automatically. Use `install-portable`, not `install`: `.#install` produces a development build (variant `linux-amd64-dev`) that the released `logosctl` skips with `was installed for variant 'linux-amd64-dev' which is not supported on this platform`, and `module load` then fails with `MODULE_LOAD_FAILED`.

1. In `logos-my-service-module`, initialise a Git repository and run the install build:

   ```sh
   git init && git add -A
   nix build .#install-portable -L
   ```

   This produces:

   ```
   result/modules/my_service_module/
     ├── manifest.json
     ├── variant
     └── my_service_module_plugin.so
   ```

1. In `logos-libp2p-module`, run the install build:

   ```sh
   cd ../logos-libp2p-module
   nix build .#install-portable -L
   ```

   This produces:

   ```
   result/modules/libp2p_module/
     ├── manifest.json
     ├── variant
     ├── libp2p_module_plugin.so
     ├── liblibp2p.so
     └── …                        # bundled runtime libraries (OpenSSL, Boost, TinyCBOR)
   ```

   - `liblibp2p.so` is co-located automatically so the `$ORIGIN` RUNPATH resolves at runtime.

## Step 4: Load the modules and verify the single-node flow

1. Return to `logos-my-service-module` and pin a known, fixed listen address via the `LIBP2P_MODULE_CONFIG` environment variable:

   ```sh
   cd ../logos-my-service-module
   export LIBP2P_MODULE_CONFIG='{"addrs":["/ip4/127.0.0.1/tcp/9000"]}'
   ```

1. Start the daemon, detached so this terminal stays free, pointing at both module directories:

   ```sh
   printf 'modules_dirs:\n  - %s\n  - %s\n' \
     "$(cd ../logos-libp2p-module/result/modules && pwd)" "$(pwd)/result/modules" \
     | logosctl daemon config set -
   logosctl daemon start --detach
   ```

1. Load both modules:

   ```sh
   logosctl module load libp2p_module
   logosctl module load my_service_module
   ```

1. Drive the discovery lifecycle and verify each call returns immediately:

   ```sh
   logosctl call my_service_module startDiscovery
   # → discovery started

   logosctl call my_service_module getPeerInfo
   # → {"addrs":["/ip4/127.0.0.1/tcp/9000"],"peerId":"12D3KooW…"}

   logosctl call my_service_module advertise myservice/v1 version=1
   # → advertising myservice/v1

   logosctl call my_service_module discover myservice/v1
   # → [{"addrs":["/ip4/127.0.0.1/tcp/9000"],"peerId":"12D3KooW…",…}]   (single node: only its own advertisement)

   logosctl call my_service_module stopDiscovery
   # → discovery stopped
   ```

   - With a single node, `discover` returns only this node's own advertisement. `getPeerInfo` prints this node's `peerId` and listen address, which you need in [Step 5](#step-5-run-three-node-local-discovery) to bootstrap other instances.

1. Shut down the daemon:

   ```sh
   logosctl daemon stop
   ```

## Step 5: Run three-node local discovery

Run three `logosctl` daemon instances on one machine to see the Service Discovery API work: a bootstrap node, an advertiser, and a discoverer. The advertiser and discoverer are configured only with the bootstrap node as their bootstrap node—when the discoverer's lookup returns the advertiser's peer record, the advertisement provably travelled through the DHT, not over a direct A↔B link.

Each daemon needs its own session (`--config-dir`) and `LIBP2P_MODULE_CONFIG` with a distinct listen port as separate sessions are what let three independent instances coexist on one machine. Run each block in a separate terminal window.

1. In **Terminal 1**, start the bootstrap node:

   ```sh
   cd ../logos-my-service-module
   export LIBP2P_MODULE_CONFIG='{"addrs":["/ip4/127.0.0.1/tcp/9000"]}'
   printf 'modules_dirs:\n  - %s\n  - %s\n' \
     "$(cd ../logos-libp2p-module/result/modules && pwd)" "$(pwd)/result/modules" \
     | logosctl --config-dir ~/.logosctl-bootstrap daemon config set -
   logosctl daemon start --detach --config-dir ~/.logosctl-bootstrap
   logosctl --config-dir ~/.logosctl-bootstrap module load libp2p_module
   logosctl --config-dir ~/.logosctl-bootstrap module load my_service_module
   logosctl --config-dir ~/.logosctl-bootstrap call my_service_module startDiscovery
   logosctl --config-dir ~/.logosctl-bootstrap call my_service_module getPeerInfo
   # → note the "peerId" value; the bootstrap node listens on /ip4/127.0.0.1/tcp/9000
   ```

   - Copy the bootstrap node's `peerId` from the `getPeerInfo` output. Substitute it for `<BOOTSTRAP_PEER_ID>` in the next two terminals.

1. In **Terminal 2**, start the advertiser:

   ```sh
   cd ../logos-my-service-module
   export LIBP2P_MODULE_CONFIG='{"addrs":["/ip4/127.0.0.1/tcp/9001"],"bootstrapNodes":[{"peerId":"<BOOTSTRAP_PEER_ID>","addrs":["/ip4/127.0.0.1/tcp/9000"]}]}'
   printf 'modules_dirs:\n  - %s\n  - %s\n' \
     "$(cd ../logos-libp2p-module/result/modules && pwd)" "$(pwd)/result/modules" \
     | logosctl --config-dir ~/.logosctl-advertiser daemon config set -
   logosctl daemon start --detach --config-dir ~/.logosctl-advertiser
   logosctl --config-dir ~/.logosctl-advertiser module load libp2p_module
   logosctl --config-dir ~/.logosctl-advertiser module load my_service_module
   logosctl --config-dir ~/.logosctl-advertiser call my_service_module startDiscovery
   logosctl --config-dir ~/.logosctl-advertiser call my_service_module advertise myservice/v1 version=1
   ```

1. In **Terminal 3**, start the discoverer and look up the service:

   ```sh
   cd ../logos-my-service-module
   export LIBP2P_MODULE_CONFIG='{"addrs":["/ip4/127.0.0.1/tcp/9002"],"bootstrapNodes":[{"peerId":"<BOOTSTRAP_PEER_ID>","addrs":["/ip4/127.0.0.1/tcp/9000"]}]}'
   printf 'modules_dirs:\n  - %s\n  - %s\n' \
     "$(cd ../logos-libp2p-module/result/modules && pwd)" "$(pwd)/result/modules" \
     | logosctl --config-dir ~/.logosctl-discoverer daemon config set -
   logosctl daemon start --detach --config-dir ~/.logosctl-discoverer
   logosctl --config-dir ~/.logosctl-discoverer module load libp2p_module
   logosctl --config-dir ~/.logosctl-discoverer module load my_service_module
   logosctl --config-dir ~/.logosctl-discoverer call my_service_module startDiscovery
   logosctl --config-dir ~/.logosctl-discoverer call my_service_module discover myservice/v1
   ```

   Expected output:

   ```json
   {"method":"discover","module":"my_service_module",
    "result":"[{\"addrs\":[\"/ip4/127.0.0.1/tcp/9001\"],\"peerId\":\"<ADVERTISER_PEER_ID>\",\"seqNo\":1536,\"services\":[{\"data\":\"dmVyc2lvbj0x\",\"id\":\"myservice/v1\"}]}]",
    "status":"ok"}
   ```

   - The returned `peerId` is the advertiser's, and `addrs` shows its listen port (`9001`), even though the discoverer only knew about the bootstrapping node. The `services` entry carries the `serviceData` that the advertiser published, base64-encoded (`dmVyc2lvbj0x` is `version=1`).

   :::info
   A first `discover` returning `[]` means the advertisement has not yet propagated. Repeat the call after a few seconds.
   :::

1. Tear down all three daemons:

   ```sh
   for D in bootstrap advertiser discoverer; do
     logosctl --config-dir ~/.logosctl-$D call my_service_module stopDiscovery
     logosctl --config-dir ~/.logosctl-$D daemon stop
   done
   ```

## Troubleshooting service discovery

### Why does `discover` return `[]` even after waiting?

The Kad-DHT needs a few seconds to propagate the advertisement from the advertiser through the bootstrap node to the discoverer. Repeat `logosctl --config-dir ~/.logosctl-discoverer call my_service_module discover myservice/v1` after 5–10 seconds. If it still returns empty, confirm that the advertiser's `advertise` call succeeded and that both the advertiser and the discoverer share the same `<BOOTSTRAP_PEER_ID>` for the bootstrap node.
