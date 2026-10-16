---
title: Build a Logos module that sends chat messages over the mix network
doc_type: procedure
product: messaging
topics: [messaging, mixnet]
steps_layout: sectioned
authors: Ivansete-status, kashepavadan
owner: logos
doc_version: 1
slug: build-logos-module-that-sends-messages-over-mix
sidebar_position: 2
---

# Build a Logos module that sends chat messages over the mix network

#### Write a minimal Logos module that creates a mix-routed delivery node, hands it to the Chat module, and echoes incoming messages so that every send is onion-routed.

:::tip[Version]
This document is accurate for **Testnet v0.3.0**.
:::

This procedure shows how to build a minimal Logos [module](../../get-started/glossary.md#module) that brings up a [Logos Delivery](../../get-started/glossary.md#logos-delivery) node with sender anonymity turned on, hands that node to `chat_module`, and replies to incoming messages. Sender anonymity is one config key on the Messaging API: when the module creates the node with `anonymityLevel` set to `Required`, every send is onion-routed over the [mix](../../get-started/glossary.md#mix) network, with no forked client and no transport code of its own. It is intended for module developers who want anonymous messaging in their own code.

You scaffold the module with [`logos-module-builder`](../../get-started/glossary.md#logos-module-builder) 0.3.1, declare [`delivery_module`](https://github.com/logos-co/logos-delivery-module) and [`chat_module`](https://github.com/logos-co/logos-chat-module) v0.3.0 as dependencies, build it, and run it in `logosctl`. For the full delivery and chat APIs, see [Use the Logos Delivery module API from an app](../delivery/use-logos-delivery-module-api-from-app.md) and [Build a Logos module that uses the Chat module API](./build-logos-module-that-uses-chat-module-api.md).

:::info[Prerequisites]

- A supported OS:
   - Linux
   - macOS
- **Nix** with flakes enabled.
   - Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

   ```bash
   mkdir -p ~/.config/nix
   echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
   ```
- `jq`
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.3.2) installed.
   - Install it by running `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh | sudo sh`
- Outbound access to the `logos.test` network on TCP `30303`, and HTTPS access to the key-package registry at `https://devnet.chat-kc.logos.co`

:::

## What to expect

- You can build a module whose every send goes over the mix network, from one `createNode` call.
- You can hand the mix-enabled delivery node to `chat_module` so that chat messages inherit sender anonymity.
- You can confirm from the host's log that each send is routed through three mix nodes before it is published.

## Step 1: Scaffold the module

1. Create and enter the project directory:

   ```bash
   mkdir mixhello && cd mixhello
   ```

1. Initialise from the default `minimal-module` template:

   ```bash
   nix flake init -t github:logos-co/logos-module-builder/0.3.1
   ```

1. Initialise a Git repository and stage the generated files:

   ```bash
   git init && git add -A
   ```

   - The template is a working module named `minimal`. Keep the name: it is referenced in `metadata.json`, `CMakeLists.txt`, and the `src/minimal_impl.*` files, which must all match.

## Step 2: Declare the delivery and chat modules as dependencies

The flake input names must match the dependency names in `metadata.json`. `logos-module-builder` turns each dependency into a typed caller that your code reaches through `modules()`.

1. In `metadata.json`, replace the empty `dependencies` array:

   ```json
   "dependencies": [
     { "name": "delivery_module", "version": ">=0.3.0" },
     { "name": "chat_module", "version": ">=0.3.0" }
   ],
   ```

1. In `flake.nix`, pin `chat_module` to its release, take `delivery_module` from it, and pass both through with `flakeInputs = inputs`:

   ```nix
   inputs = {
     # Follow chat_module's own builder so the codegen matches its release.
     logos-module-builder.follows = "chat_module/logos-module-builder";
     chat_module.url = "github:logos-co/logos-chat-module/v0.3.0";
     # Build against the delivery_module that chat_module v0.3.0 is built against.
     delivery_module.follows = "chat_module/logos-delivery-module";
   };

   outputs = inputs@{ logos-module-builder, ... }:
     logos-module-builder.lib.mkLogosModule {
       src = ./.;
       configFile = ./metadata.json;
       flakeInputs = inputs;
     };
   ```

## Step 3: Write the module

The whole module is one entry point, `start()`. It creates the node with mix, hands it to chat, and answers whatever arrives.

1. In `src/minimal_impl.h`, declare `start()` alongside the template's public methods:

   ```cpp
   /// Brings up a mix-routed delivery node, hands it to chat, and echoes incoming messages.
   std::string start();
   ```

1. In `src/minimal_impl.cpp`, include the generated umbrella header and implement `start()`:

   ```cpp
   #include "logos_sdk.h"   // generated umbrella: modules() and the dependency types

   std::string MinimalImpl::start()
   {
       auto& delivery = modules().delivery_module;

       // `anonymityLevel: Required` routes every send over mix and never falls back.
       auto created = delivery.createNode(
           R"({"mode":"Core","preset":"logos.test",)"
           R"("messagingOverrides":{"anonymityLevel":"Required"}})");
       if (!created.success) return "createNode failed: " + created.error;

       auto started = delivery.start();
       if (!started.success) return "start failed: " + started.error;

       // Empty config: chat adopts the node created above, so its own node
       // config is never used.
       auto init = modules().chat_module.init(ChatModule::ChatConfig{});
       if (!init.success) return "chat init failed: " + init.error;

       // `Required` has no fallback, so a propagated message went over mix.
       delivery.onMessagePropagated(
           [](std::string, std::string messageHash, int64_t) { /* went over mix */ });

       // Reply to whatever arrives: the send half of the chat API, from code.
       modules().chat_module.onMessage_received(
           [this](std::string convoId, std::string content, int64_t, std::string) {
               modules().chat_module.send_message(convoId, "echo: " + content);
           });

       return "started on logos.test";
   }
   ```

   Only `createNode` is configured, and only with these keys:

   | Key | Values | This procedure |
   |:----|:-------|:---------------|
   | `mode` | `Core`, `Edge` | `Core` |
   | `preset` | `logos.dev`, `logos.test` | `logos.test` |
   | `messagingOverrides.anonymityLevel` | `None`, `Preferred`, `Required` | `Required` |

   `anonymityLevel` decides whether a send is onion-routed through three mix hops to an exit node that publishes it, so that neither the recipient nor the network can link the message back to you:

   | Level | What a send does |
   |:------|:-----------------|
   | `None` | Published directly; mix is not mounted. This is the default. |
   | `Preferred` | Sent over mix when a mix path is available, otherwise sent directly. |
   | `Required` | Sent over mix only. With no mix path the send fails; it never falls back. |

   - Use `Required`: it is the only level under which a delivered message is necessarily an anonymous one. The level is fixed at `createNode` and can't be changed on a running node.

## Step 4: Build the module

1. Build the module as a portable `.lgx` [package](../../get-started/glossary.md#package):

   ```bash
   nix build '.#lgx-portable'
   ```

   **Expected result:** an `.lgx` file in `result/`.

   - Build `lgx-portable`, not `lgx`: the `lgx` output is a development build that `logosctl package install` rejects.

## Step 5: Run the module and send over mix

From here on, every send goes over mix: `delivery_module.send`, `chat_module.send_message`, and anything built on them. There is no mix-specific call site and no second API to learn.

1. Start the `logosctl` daemon:

   ```bash
   logosctl daemon start
   ```

1. In a new terminal window with the same user, refresh the [catalogue](../../get-started/glossary.md#catalogue) and install the dependencies and your module:

   ```bash
   logosctl catalog refresh
   logosctl package install delivery_module chat_module --yes
   logosctl package install result/*.lgx --yes
   ```

1. Load your module and call `start` once:

   ```bash
   logosctl module load minimal
   logosctl call minimal start
   ```

   **Expected result:** `started on logos.test`.

1. Send a message. Any send works; this one goes straight through the delivery node that your module created:

   ```bash
   printf '%s' "hello over mix" > payload.arg
   logosctl --json call delivery_module send /my-app/1/hello/proto @$PWD/payload.arg
   ```

   - Messages that other chat instances send to your module's conversations are echoed back with `chat_module.send_message`, and those replies go over mix too.

1. Check the host's log for the mix route:

   ```bash
   grep -E "via Mix|Selected mix node" ~/.logosctl/logs/daemon.log
   ```

   **Expected result:** each send is onion-routed, with one path selection per hop, then the send confirmed:

   ```text
   DBG Trying message delivery via Mix   topics="send service mix processor" requestId=… msgHash=0x…
   DBG Selected mix node:                indexInPath=0 peerId=16U*VpJprH
   DBG Selected mix node:                indexInPath=1 peerId=16U*P1S397
   DBG Selected mix node:                indexInPath=2 peerId=16U*T3UNSE
   DBG Message propagated via Mix        topics="send service mix processor" requestId=…
   ```

   - A send that never reaches `Message propagated via Mix` did not go out: with `Required` there is no direct-send fallback.

## Troubleshooting the mix module

### `start` returns `createNode failed: Context already initialized`

The delivery node already exists: `start` was called twice, or another module created it. Create one node per host process, and call `start` once per instance.

### Sends fail for the first minute or two

`Required` needs a mix pool of at least four mix nodes, plus an exit node that serves [light push](../../get-started/glossary.md#light-push). Wait for the pool to fill, then resend.
