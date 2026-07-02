---
title: Build a Logos module that uses the Chat module API
doc_type: procedure
product: messaging
topics: chat
steps_layout: sectioned
authors: kashepavadan, igor-sirotin
owner: logos
doc_version: 1
slug: build-logos-module-that-uses-chat-module-api
---

# Build a Logos module that uses the Chat module API

#### Get started with private 1:1 end-to-end encrypted messaging in your own Logos module.

This procedure covers how to build a Logos module that calls the [logos-chat-module](https://github.com/logos-co/logos-chat-module) API (tag `v0.1.2`) to exchange introduction bundles, open private 1:1 conversations, and send and receive end-to-end encrypted messages on the Logos network. It is intended for application developers who want to integrate private messaging without taking direct dependencies on `liblogoschat` or `logos-delivery`.

{% hint style="info" %}
Identity, conversations, and message history persist in the instance directory you pass to `init()` (`identity.db` + `history.json`). Restarting an instance against the same directory restores its identity and conversations.
{% endhint %}

Before you start, make sure you have the following:

- Linux or macOS
- **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

  ```bash
  mkdir -p ~/.config/nix
  echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
  ```
- Network access so that two instances can reach each other
- An understanding of [Logos modules](../../core/build-modules/build-a-logos-cpp-ui-module.md)

## What to expect

- You can initialise a chat client, connect to the Logos network, and exchange end-to-end encrypted messages with another instance.
- You can open a private 1:1 conversation by exchanging introduction bundles out of band and calling `create_conversation` from the initiating side.
- You can integrate the full chat lifecycle — init, subscribe to events, create bundle, open conversation, send, shut down — into any Logos C++ module.

## Step 1: Scaffold a new Logos module

Scaffold a new module using [`logos-module-builder`](https://github.com/logos-co/logos-module-builder). For a full walkthrough, see the [Build a Logos C++ UI module](../../core/build-modules/build-a-logos-cpp-ui-module.md) tutorial.

1. Create and enter the project directory:

   ```bash
   mkdir your-module-name && cd your-module-name
   ```

1. Initialise from the template:

   ```bash
   nix flake init -t github:logos-co/logos-module-builder/tutorial-v3#ui-qml-backend
   ```

1. Initialise a Git repository and stage all generated files:

   ```bash
   git init && git add -A
   ```

1. Remove the template's example sources. The scaffolded template includes `ui_example` files with mismatched class names and IIDs; leaving them causes build errors or plugin-load failures at runtime:

   ```bash
   rm -f src/ui_example.rep src/ui_example_interface.h src/ui_example_plugin.h src/ui_example_plugin.cpp
   ```

## Step 2: Declare `chat_module` as a dependency

Add `chat_module` to both `metadata.json` and `flake.nix`, pinning to the released tag so your app stays stable as the module's API evolves.

{% hint style="info" %}
The flake input name (`chat_module`) must match the dependency name in `metadata.json`. `logos-module-builder` automatically generates the typed `chat_module` wrapper at build time.
{% endhint %}

1. In `metadata.json`, add `chat_module` and `delivery_module` to the dependencies array and reuse `chat_module`'s bundled `delivery_module` contract:

   ```json
   {
     "name": "my_app",
     "dependencies": ["chat_module", "delivery_module"],
     "dependency_overrides": {
       "delivery_module": {
         "input": "chat_module",
         "file": "rust-lib/deps/delivery_module.lidl"
       }
     },
     ...
   }
   ```

2. In `flake.nix`, pin `chat_module` and its transport dependency `delivery_module`, then map the delivery input to the `delivery_module` dependency so the builder can resolve its runtime:

   ```nix
   inputs = {
     logos-module-builder.url = "github:logos-co/logos-module-builder";
     # Pin chat_module to the released tag so its API can't shift under `nix flake update`.
     chat_module.url = "github:logos-co/logos-chat-module/v0.1.2";
     # chat_module reaches delivery over IPC, but the builder still needs delivery's
     # runtime build from a matching flake input. Pin the v0.1.3 tag: it carries the
     # zerokit/RLN nix-build fix that earlier delivery tags (≤ v0.1.2) lack.
     logos-delivery-module.url = "github:logos-co/logos-delivery-module/v0.1.3";
   };

   outputs = inputs@{ logos-module-builder, logos-delivery-module, ... }:
     logos-module-builder.lib.mkLogosQmlModule {
       src = ./.;
       configFile = ./metadata.json;
       # Map the delivery input to the `delivery_module` dependency name.
       flakeInputs = { delivery_module = logos-delivery-module; } // inputs;
     };
   ```

{% hint style="info" %}
The `dependency_overrides` entry above only points the builder at delivery's `.lidl` contract for code generation — it does **not** supply delivery's runtime build. The builder resolves each `metadata.json` dependency's runtime from a matching flake input, so `delivery_module` needs the `logos-delivery-module` input, mapped in via `flakeInputs`. Without it, `nix build` cannot resolve `delivery_module`. This mirrors how [`logos-chat-ui`](https://github.com/logos-co/logos-chat-ui/blob/v0.1.2/flake.nix) wires the two modules together.
{% endhint %}

## Step 3: Initialise `LogosModules` and subscribe to events

In your module's `initLogos()` function, construct `LogosModules` with the provided `LogosAPI*` and subscribe to all push events before calling `init()`. Subscribing first ensures you do not miss early events or the first incoming messages.

1. Initialise `LogosModules` in `initLogos()`:

   ```cpp
   #include "logos_sdk.h"   // generated umbrella — exposes LogosModules

   // In your plugin class:
   //   LogosModules* m_logos = nullptr;

   void MyPlugin::initLogos(LogosAPI* api) {
       m_logos = new LogosModules(api);
       // m_logos->chat_module is now the typed wrapper for the Logos Chat module.
   }
   ```

1. Subscribe to the module's push events. Each handler receives the event's positional arguments in the order declared in `chat_module.lidl`:

   ```cpp
   auto& chat = m_logos->chat_module;

   // A new message arrived in a conversation.
   chat.on("message_received", [](const QVariantList& a) {
       // a[0]: QString convo_id, a[1]: QString content, a[2]: qint64 timestamp_ms
   });
   // One of your own messages was recorded/sent.
   chat.on("message_sent", [](const QVariantList& a) {
       // a[0]: convo_id, a[1]: content, a[2]: timestamp_ms
   });
   // A conversation was created — incoming from a peer, or your own outgoing one.
   chat.on("conversation_created", [](const QVariantList& a) {
       // a[0]: QString convo_id, a[1]: bool is_outgoing, a[2]: QString peer_label
   });
   chat.on("conversation_updated", [](const QVariantList& a) { /* a[0]: convo_id */ });
   chat.on("conversation_deleted", [](const QVariantList& a) { /* a[0]: convo_id */ });
   // Delivery/connection state changed — drives your "connected" indicator.
   chat.on("delivery_state_changed", [](const QVariantList& a) {
       // a[0]: QString delivery_state ("initialising" | "online" | "stopped" | "error")
       // a[1]: QString detail
   });
   ```

   See [`rust-lib/chat_module.lidl`](https://github.com/logos-co/logos-chat-module/blob/v0.1.2/rust-lib/chat_module.lidl) for the exact argument list of every method and event.

## Step 4: Drive the chat lifecycle

Status-bearing methods return their result **synchronously** as a `LogosResult`.
   - `res.success` tells you whether the call succeeded;
   - `res.getError<QString>()` carries the failure reason;
   - `res.getValue<QString>()` carries the returned value (for example, the intro bundle).

Ongoing activity — incoming messages, new conversations, delivery-state changes — arrives **asynchronously** through the push events you subscribed to in Step 3.

{% hint style="info" %}
`init()` starts delivery asynchronously, so the client is not connected the moment `init()` returns. Watch `delivery_state_changed` for the `online` state before creating conversations or sending messages.
{% endhint %}

`init()` takes the instance directory, a delivery preset, and a TCP port:

| Parameter | Type | Notes |
|---|---|---|
| `instance_path` | string | Directory for this instance's persistent state. Use a distinct directory per instance to run several side by side. |
| `delivery_preset` | string | Network preset for the delivery node. Use `logos.test` to reach the Logos test network. Must match across all participants. |
| `tcp_port` | int | Logos Delivery TCP port. `0` picks a random port. |

1. Initialise the chat client:

   ```cpp
   const LogosResult res = m_logos->chat_module.init("/path/to/instance", "logos.test", 0);
   if (!res.success) {
       qWarning() << "init failed:" << res.getError<QString>();
       return;
   }
   // init succeeded; delivery connects asynchronously.
   // Wait for delivery_state_changed with state == "online" before creating conversations.
   ```

2. Read (or set) your identity:

   ```cpp
   const QString myId = m_logos->chat_module.get_installation_name();
   // Optionally choose a name: m_logos->chat_module.set_installation_name("alice");
   ```

3. Create and share your introduction bundle:

   ```cpp
   const LogosResult bundle = m_logos->chat_module.create_intro_bundle();
   if (bundle.success) {
       const QString myBundle = bundle.getValue<QString>();
       // share `myBundle` out of band (the recipient pastes it — see Step 6)
   }
   ```

   {% hint style="warning" %}
   Each introduction bundle is **single-use** — it can open exactly one conversation. Generate a fresh bundle with `create_intro_bundle()` for every new contact you want to be able to reach you.
   {% endhint %}

4. Open a private conversation as the initiator, or receive one as the recipient:

   ```cpp
   // content is plain text — no encoding required.
   const LogosResult res = m_logos->chat_module.create_conversation(peerBundle, "Hello!");
   // On success a conversation_created event (is_outgoing == true) fires with the new convo_id.
   ```

   - The initiator calls `create_conversation` with the peer's intro bundle and a plain-text opening message.
   - The recipient does not call anything; a `conversation_created` push event arrives automatically, followed by a `message_received` event.

5. Send and receive messages:

   ```cpp
   m_logos->chat_module.send_message(convoId, "How are you?");
   // On success a message_sent event fires locally; the peer receives a message_received event.
   ```

   - Message content is plain text in both directions — the module handles encoding and end-to-end encryption on the wire.

6. Read history and conversation state at any time (synchronous reads):

   ```cpp
   const QVariantList convos = m_logos->chat_module.list_conversations();  // [Conversation]
   const QVariantList msgs   = m_logos->chat_module.get_messages(convoId); // [Message]
   const QVariantMap  st     = m_logos->chat_module.status().toMap();      // { convo_count, delivery_state, detail }
   ```

   {% hint style="warning" %}
   Do not make a synchronous module read (`list_conversations`, `get_messages`, `status`) from *inside* an event handler — it re-enters the IPC replica while its read notifier is disabled and stalls until the call times out. Defer the read to the next event-loop turn instead (see `deferToEventLoop` in [`logos-chat-ui`](https://github.com/logos-co/logos-chat-ui/blob/v0.1.2/src/ChatBackend.cpp)).
   {% endhint %}

7. Shut down cleanly:

   ```cpp
   m_logos->chat_module.shutdown();   // disconnects and tears the client down
   ```

## Step 5: Build and run

1. Build the module:

   ```sh
   nix build
   ```

1. Preview the module using `logos-standalone-app` (for `ui_qml` modules):

   ```sh
   nix run                # preview via logos-standalone-app (for ui_qml modules)
   nix build .#lgx        # package as .lgx for installation into logos-basecamp
   ```

## Step 6: Verify a two-instance exchange

A chat is only proven end to end when a message travels between two running instances. Start two copies of your module — each with its own `instance_path` and `tcp_port` — and confirm a message lands as a `message_received` event.

1. Start both instances and wait until each reports `delivery_state == "online"` via `delivery_state_changed`.
1. In instance A, call `create_intro_bundle()` and share the returned bundle out of band (copy it into instance B).
1. In instance B, call `create_conversation(bundleFromA, "Hello from B")`. Instance A receives a `conversation_created` event (`is_outgoing == false`) followed by a `message_received` event carrying `"Hello from B"`.
1. In instance A, reply with `send_message(convoId, "Hi B")`. Instance B receives the matching `message_received` event.

Seeing the `message_received` events on both sides confirms the full round trip: identity, intro-bundle exchange, conversation setup, and end-to-end encrypted delivery.

## Troubleshooting the Logos Chat module

### Why does a method fail?

The method returns a `LogosResult` with `success == false` and a reason in `getError<QString>()`. The most common cause is calling a conversation or message method before `init()` succeeded, or before delivery reached the `online` state. Call `init()` first, check `res.success`, and wait for a `delivery_state_changed` event with `delivery_state == "online"` before creating conversations or sending messages.

### Why do peers not connect or messages not propagate?

The `delivery_preset` differs across instances, or delivery has not reached `online`. All participants must use the same preset (for example `logos.test`) to share a network, and each instance must report `online` via `delivery_state_changed` (or `status()`) before it can exchange messages.

### Why does a read stall the UI?

You issued a synchronous module read (`list_conversations`, `get_messages`, `status`) from inside an event handler. That re-enters the IPC replica while its read notifier is disabled and blocks until the call times out. Defer such reads to the next event-loop turn.

### Why is a previously created conversation still there after a restart?

Chat state is **persistent**. Identity and history live in the instance directory passed to `init()` (`identity.db`, `history.json`), so restarting against the same directory restores conversations and your identity. Point `init()` at a fresh directory to start from a clean state.
