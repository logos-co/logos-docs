---
title: Build a Logos module that uses the Chat module API
doc_type: procedure
product: messaging
topics: []
steps_layout: sectioned
authors:
owner: logos
doc_version: 1
slug: build-logos-module-that-uses-chat-module-api
---

# Build a Logos module that uses the Chat module API

#### Get started with private 1:1 end-to-end encrypted messaging in your own Logos module.

This procedure covers how to build a Logos module that calls the [logos-chat-module](https://github.com/logos-co/logos-chat-module) API (tag `v0.1.0`) to exchange introduction bundles, open private 1:1 conversations, and send and receive end-to-end encrypted messages on the Logos network. It is intended for application developers who want to integrate private messaging without taking direct dependencies on `liblogoschat` or `logos-delivery`. For a complete worked example following this exact pattern, see [`logos-chat-ui`](https://github.com/logos-co/logos-chat-ui).

{% hint style="info" %}
Identity, conversations, and message history are ephemeral — they exist only while the app runs. Restarting an instance gives it a new identity and clears all conversations. There is no persistence or history sync across restarts.
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
- You can open a private 1:1 conversation by exchanging introduction bundles out of band and calling `newPrivateConversation` from the initiating side.
- You can integrate the full chat lifecycle — init, start, create bundle, open conversation, send, stop — into any Logos C++ module.

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

1. In `metadata.json`, add `chat_module` to the dependencies array:

   ```json
   {
     "name": "my_app",
     "dependencies": ["chat_module"],
     ...
   }
   ```

1. In `flake.nix`, add a matching pinned input:

   ```nix
   inputs = {
     logos-module-builder.url = "github:logos-co/logos-module-builder";
     chat_module.url = "github:logos-co/logos-chat-module/v0.1.0";
   };
   ```

## Step 3: Initialise `LogosModules` and register event handlers

In your module's `initLogos()` function, construct `LogosModules` with the provided `LogosAPI*` and register all event handlers before calling `startChat()`. Registering handlers first ensures you do not miss early results or the first incoming messages.

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

1. Register all event handlers:

   ```cpp
   // Lifecycle + request results
   m_logos->chat_module.on("chatInitResult",  [](const QVariantList& data) {
       // data[0]: bool success, data[1]: int statusCode, data[2]: QString message, data[3]: timestamp
   });
   m_logos->chat_module.on("chatStartResult", [](const QVariantList& data) { /* success, statusCode, message, ts */ });
   m_logos->chat_module.on("chatCreateIntroBundleResult", [](const QVariantList& data) {
       // data[0]: bool success, data[2]: QString introBundle
   });
   m_logos->chat_module.on("chatNewPrivateConversationResult", [](const QVariantList& data) {
       // data[0]: bool success, data[2]: QString conversation (JSON object with the conversation id)
   });
   m_logos->chat_module.on("chatSendMessageResult", [](const QVariantList& data) { /* success, statusCode, result, ts */ });

   // Push events (delivered after setEventCallback())
   m_logos->chat_module.on("chatNewConversation", [](const QVariantList& data) {
       // data[0]: QString — JSON payload describing the new conversation
   });
   m_logos->chat_module.on("chatNewMessage", [](const QVariantList& data) {
       // data[0]: QString — JSON payload with conversationId, sender, content (hex-encoded)
   });
   m_logos->chat_module.on("chatDeliveryAck", [](const QVariantList& data) { /* JSON payload */ });
   ```

   - See [`src/chat_module_plugin.h`](https://github.com/logos-co/logos-chat-module/blob/v0.1.0/src/chat_module_plugin.h) for the exact field layout of every event.

## Step 4: Drive the chat lifecycle

Call each method in order and wait for its result event before continuing. `initChat` takes a flat JSON config string consumed by `liblogoschat`.

{% hint style="info" %}
Every chat method returns `bool` immediately — `true` means the request was accepted; `false` means it was rejected before being sent, typically because the client is not yet initialised. The actual result always arrives later as a named async event. Never proceed to the next call before the corresponding result event fires with `success == true`.
{% endhint %}

The minimal working config for the `logos.dev` (CHANGE TO LOGOS.TEST) network:

```json
{
  "name": "alice",
  "clusterId": 2,
  "shardId": 1
}
```

| Field | Type | Notes |
|---|---|---|
| `name` | string | Identity name. `getId()` returns this string. |
| `port` | int | Logos Delivery (Waku) TCP port. `0` or omitted picks a random port. |
| `clusterId` | int | Must be `2` to reach the `logos.dev` network. |
| `shardId` | int | Must be `1` to reach the `logos.dev` network. |
| `staticPeers` | string[] | Optional bootstrap peer multiaddrs. |

The pubsub topic is derived from `clusterId`/`shardId`; they must match across all participants or messages will not propagate.

1. Initialise the chat client:

   ```cpp
   const QString cfg = R"({"name":"alice","clusterId":2,"shardId":1})";
   if (!m_logos->chat_module.initChat(cfg)) {
       qWarning() << "initChat rejected — config invalid";
       return;
   }
   // wait for chatInitResult (success == true) before continuing
   ```

1. Subscribe to push events, then start the client:

   ```cpp
   m_logos->chat_module.setEventCallback();
   m_logos->chat_module.startChat();
   // wait for chatStartResult (success == true) — the client is now connected
   ```

   - Call `setEventCallback()` after `initChat` and before `startChat()` so no incoming messages are missed.

1. Create and share your introduction bundle:

   ```cpp
   m_logos->chat_module.createIntroBundle();
   // chatCreateIntroBundleResult delivers the bundle string — share it out of band.
   ```

1. Open a private conversation as the initiator, or receive one as the recipient:

   ```cpp
   const QString contentHex = toHex("Hello!");               // content must be hex-encoded
   m_logos->chat_module.newPrivateConversation(peerBundle, contentHex);
   // chatNewPrivateConversationResult carries the new conversation id.
   ```

   - The initiator calls `newPrivateConversation` with the peer's intro bundle and a hex-encoded opening message.
   - The recipient does not call anything; a `chatNewConversation` push event arrives automatically.

1. Send and receive messages:

   ```cpp
   m_logos->chat_module.sendMessage(conversationId, toHex("How are you?"));
   // chatSendMessageResult confirms acceptance; the peer gets a chatNewMessage push event.
   ```

   - Outgoing content must be hex-encoded. The `content` field of `chatNewMessage` is also hex-encoded; decode it before displaying.

1. Shut down cleanly:

   ```cpp
   m_logos->chat_module.stopChat();   // disconnects and tears the client down
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

## Troubleshooting the Logos Chat module

### Why does a method return `false`?

The client is not yet initialised, or (for `startChat`) `initChat` has not completed. Call `initChat()` first and wait for `chatInitResult` with `success == true` before calling any other method.

### Why do peers not connect or messages not propagate?

The `clusterId` and `shardId` values are mismatched across instances. Both must be `2` and `1` respectively to reach the `logos.dev` network. If your network requires a bootstrap peer, add its multiaddr to `staticPeers` in the `initChat` config.

### Why does message content arrive garbled or empty?

`newPrivateConversation` and `sendMessage` require **hex-encoded** content. Passing raw UTF-8 produces wrong bytes on the wire. Hex-encode all outgoing content and hex-decode the `content` field of every `chatNewMessage` event before displaying it.

### Why is a previously created conversation gone after a restart?

Chat state is ephemeral. Identity, conversations, and message history exist only while the app runs and are lost on `stopChat()` or restart. Re-exchange intro bundles to open a new conversation after a restart.
