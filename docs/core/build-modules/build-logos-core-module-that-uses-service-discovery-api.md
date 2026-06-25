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
---

# Build a Logos Core module that uses the Service Discovery API

#### Get started with typed, service-keyed peer lookups in a live Logos network.

Applications on the Logos network need a protocol-agnostic way to find peers offering specific services — mix nodes, relay nodes, storage providers — at runtime without hard-coding topology or peer lists. The Service Discovery API enables any Logos Core module to perform typed, service-keyed peer lookups that work from lightweight client nodes that do not participate in DHT routing, unblocking any app that needs to wire itself into a live Logos network service. This procedure covers how to write and run a Logos Core module that calls the `libp2p_module` Service Discovery API to advertise a named service to the network and discover other peers offering that same service.

Before you start, make sure you have the following:

- Linux (Ubuntu 22.04+) or macOS 14+
- **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

  ```bash
  mkdir -p ~/.config/nix
  echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
  ```
- 2 GB RAM (sufficient for a local two-module test)

## What to expect

- You can advertise a named service from a Logos Core module and discover peers offering the same service via the Kad-DHT, without hard-coding peer addresses.
- You can verify the full discovery flow locally across three `logoscore` daemon instances, each with its own config directory and listen port.
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

   {% hint style="info" %}
   The first-run Nix build can take 5–20 minutes to fetch dependencies; subsequent builds are cached. Estimated total time is 15–25 minutes.
   {% endhint %}
   
1. Vendor the C-binding header and shared library that `logos_module()` expects in `./lib`:

   ```sh
   CBIND=$(find /nix/store -maxdepth 4 -name libp2p.h -path '*cbind*' | head -1 | xargs dirname)
   mkdir -p lib
   cp "$CBIND/libp2p.h" lib/
   find /nix/store -name libp2p.so -path '*cbind*' -exec cp {} lib/ \;
   ```

1. Build the example target from the root project and run it:

   ```sh
   nix develop --command bash -c 'cmake -B build -S . && cmake --build build --target example_service_discovery -j'
   ./build/examples/example_service_discovery
   ```

   Expected output:

   ```
   Starting nodes...
   Node A: starting advertising demo-service
   Node B: registering interest in demo-service
   Node B: looking up demo-service
   Node B found 0 peer(s) advertising demo-service
   Node A: random lookup
   Random lookup returned 0 peer(s)
   Node B: unregistering interest in demo-service
   Node A: stopping advertising demo-service
   Done
   ```

   - Peer IDs are non-deterministic across runs.

   {% hint style="info" %}
   "found 0 peer(s)" is expected for a two-node local run with no DHT bootstrap peers configured.
   {% endhint %}

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
       // discoStartAdvertising requires BOTH serviceId and serviceData.
       auto r = modules().libp2p_module.discoStartAdvertising(serviceId, serviceData);
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

   {% hint style="info" %}
   For local development, override`flake.nix` at build time:

   ```bash
   nix build --override-input libp2p_module path:../logos-libp2p-module
   ```
   {% endhint %}

## Step 3: Build both modules

The `.#install` target runs `lgpm` internally and produces the directory structure `logoscore` requires. You only write `metadata.json`; the install target generates `manifest.json`, `variant`, and co-locates all `.so` files automatically.

1. In `logos-my-service-module`, initialize a Git repository and run the install build:

   ```sh
   git init && git add -A
   nix build .#install -L
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
   nix build .#install -L
   ```

   This produces:

   ```
   result/modules/libp2p_module/
     ├── manifest.json
     ├── variant
     ├── libp2p_module_plugin.so
     └── libp2p.so
   ```

   - `libp2p.so` is co-located automatically so the `$ORIGIN` RUNPATH resolves at runtime.

## Step 4: Load the modules and verify the single-node flow

1. Return to `logos-my-service-module` and pin a known, fixed listen address via the `LIBP2P_MODULE_CONFIG` environment variable:

   ```sh
   cd ../logos-my-service-module
   export LIBP2P_MODULE_CONFIG='{"addrs":["/ip4/127.0.0.1/tcp/9000"]}'
   ```

1. Start the daemon in the background, pointing at both module directories:

   ```sh
   logoscore -D \
     -m ../logos-libp2p-module/result/modules \
     -m ./result/modules &
   ```

1. Load both modules:

   ```sh
   logoscore load-module libp2p_module
   logoscore load-module my_service_module
   ```

1. Drive the discovery lifecycle and verify each call returns immediately:

   ```sh
   logoscore call my_service_module startDiscovery
   # → discovery started

   logoscore call my_service_module getPeerInfo
   # → {"peerId":"16Uiu2…","addrs":["/ip4/127.0.0.1/tcp/9000"]}

   logoscore call my_service_module advertise myservice/v1 version=1
   # → advertising myservice/v1

   logoscore call my_service_module discover myservice/v1
   # → []   (single node: no second advertiser)

   logoscore call my_service_module stopDiscovery
   # → discovery stopped
   ```

   - `discover` returning `[]` is expected with a single node. `getPeerInfo` prints this node's `peerId` and listen address, which you need in [Step 5](#step-5-run-three-node-local-discovery) to bootstrap other instances.

1. Shut down the daemon:

   ```sh
   logoscore stop
   ```

## Step 5: Run three-node local discovery

Run three `logoscore` daemon instances on one machine to see the Service Discovery API work: a bootstrap node, an advertiser, and a discoverer. The advertiser and discoverer are configured only with the bootstrap node as their bootstrap node — when the discoverer's lookup returns the advertiser's peer record, the advertisement provably travelled through the DHT, not over a direct A↔B link.

Each daemon needs its own `--config-dir` and `LIBP2P_MODULE_CONFIG` with a distinct listen port. Run each block in a separate terminal window.

1. In **Terminal 1**, start the bootstrap node:

   ```sh
   cd ../logos-my-service-module
   export LIBP2P_MODULE_CONFIG='{"addrs":["/ip4/127.0.0.1/tcp/9000"]}'
   logoscore -D --config-dir ~/.logoscore-bootstrap \
     -m ../logos-libp2p-module/result/modules -m ./result/modules &
   logoscore --config-dir ~/.logoscore-bootstrap load-module libp2p_module
   logoscore --config-dir ~/.logoscore-bootstrap load-module my_service_module
   logoscore --config-dir ~/.logoscore-bootstrap call my_service_module startDiscovery
   logoscore --config-dir ~/.logoscore-bootstrap call my_service_module getPeerInfo
   # → note the "peerId" value; the bootstrap node listens on /ip4/127.0.0.1/tcp/9000
   ```

   - Copy the bootstrap node's `peerId` from the `getPeerInfo` output. Substitute it for `<BOOTSTRAP_PEER_ID>` in the next two terminals.

1. In **Terminal 2**, start the advertiser:

   ```sh
   cd ../logos-my-service-module
   export LIBP2P_MODULE_CONFIG='{"addrs":["/ip4/127.0.0.1/tcp/9001"],"bootstrapNodes":[{"peerId":"<BOOTSTRAP_PEER_ID>","addrs":["/ip4/127.0.0.1/tcp/9000"]}]}'
   logoscore -D --config-dir ~/.logoscore-advertiser \
     -m ../logos-libp2p-module/result/modules -m ./result/modules &
   logoscore --config-dir ~/.logoscore-advertiser load-module libp2p_module
   logoscore --config-dir ~/.logoscore-advertiser load-module my_service_module
   logoscore --config-dir ~/.logoscore-advertiser call my_service_module startDiscovery
   logoscore --config-dir ~/.logoscore-advertiser call my_service_module advertise myservice/v1 version=1
   ```

1. In **Terminal 3**, start the discoverer and look up the service:

   ```sh
   cd ../logos-my-service-module
   export LIBP2P_MODULE_CONFIG='{"addrs":["/ip4/127.0.0.1/tcp/9002"],"bootstrapNodes":[{"peerId":"<BOOTSTRAP_PEER_ID>","addrs":["/ip4/127.0.0.1/tcp/9000"]}]}'
   logoscore -D --config-dir ~/.logoscore-discoverer \
     -m ../logos-libp2p-module/result/modules -m ./result/modules &
   logoscore --config-dir ~/.logoscore-discoverer load-module libp2p_module
   logoscore --config-dir ~/.logoscore-discoverer load-module my_service_module
   logoscore --config-dir ~/.logoscore-discoverer call my_service_module startDiscovery
   logoscore --config-dir ~/.logoscore-discoverer call my_service_module discover myservice/v1
   ```

   Expected output:

   ```json
   {"method":"discover","module":"my_service_module",
    "result":"[{\"addrs\":[\"/ip4/127.0.0.1/tcp/9001\"],\"peerId\":\"<ADVERTISER_PEER_ID>\",\"seqNo\":1536,\"services\":[{\"data\":\"version=1\",\"id\":\"myservice/v1\"}]}]",
    "status":"ok"}
   ```

   - The returned `peerId` is the advertiser's, and `addrs` shows its listen port (`9001`), even though the discoverer only knew about the bootstrapping node. The `services` entry carries the `serviceData` (`version=1`) that A advertised.

   {% hint style="info" %}
   A first `discover` returning `[]` means the advertisement has not yet propagated. Repeat the call after a few seconds.
   {% endhint %}

1. Tear down all three daemons:

   ```sh
   for D in bootstrap advertiser discoverer; do
     logoscore --config-dir ~/.logoscore-$D call my_service_module stopDiscovery
     logoscore --config-dir ~/.logoscore-$D stop
   done
   ```

## Troubleshooting service discovery

### Why does `discover` return `[]` even after waiting?

The Kad-DHT needs a few seconds to propagate the advertisement from the advertiser through the bootstrap node to the discoverer. Repeat `logoscore --config-dir ~/.logoscore-discoverer call my_service_module discover myservice/v1` after 5–10 seconds. If it still returns empty, confirm that the advertiser's `advertise` call succeeded and that both the advertiser and the discoverer share the same `<BOOTSTRAP_PEER_ID>` for the bootstrap node.

### Why does a `logoscore call` hang with a timeout error?

You may be using the one-shot `-c "module.method()"` or `--quit-on-finish` form instead of the `logoscore call` subcommand. The one-shot client does not await async lifecycle calls such as `start()`, which causes a spurious `Timeout waiting for …` before the node finishes starting up. Use `logoscore call my_service_module <method>` for all lifecycle and discovery calls.
