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
sidebar_position: 1
---

# Build a Logos module that uses the Chat module API

#### Get started with private 1:1 and group end-to-end encrypted messaging in your own Logos module.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

This procedure covers how to build a Logos [module](../../get-started/glossary.md#module) that calls the [logos-chat-module](https://github.com/logos-co/logos-chat-module) API (tag `v0.2.2`) to exchange addresses, open private 1:1 (or *direct*) and group conversations, and send and receive end-to-end encrypted messages on the Logos network. It is intended for application developers who want to integrate private messaging without taking direct dependencies on `liblogoschat` or `logos-delivery`.

Chat state is **ephemeral** in this release: identity, conversations, and message history live in memory only. Restarting an instance mints a fresh identity (with a new address) and an empty conversation list.

:::info[Prerequisites]

- A supported OS:
    - Linux
    - macOS
- Network access.
- **Nix** with flakes enabled.
   - Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

    ```bash
    mkdir -p ~/.config/nix
    echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
    ```
- An understanding of [Logos modules](../../core/build-modules/build-a-logos-cpp-ui-module.md)
:::

## What to expect

- You can initialise a chat client, connect to the Logos network, and exchange end-to-end encrypted messages with another instance.
- You can open a private 1:1 conversation by exchanging addresses [out of band](../../get-started/glossary.md#out-of-band) and calling `create_conversation` from the initiating side.
- You can create a group conversation with `create_group_conversation`, grow it with `add_group_member`, and exchange messages with all group members.
- You can integrate the full chat lifecycle—init, subscribe to events, share your address, open conversations, send, shut down—into any Logos C++ module.

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

1. Keep the generated files—you build on them, you don't delete them. The template is a working `ui_example` module. Its main files are:

   | File | What it is | Can you edit it? |
   |---|---|---|
   | `src/ui_example_plugin.{h,cpp}` | The C++ plugin | Yes—your chat code goes here (Steps 3–7) |
   | `src/ui_example.rep`, `src/ui_example_interface.h` | The module's interface | No |
   | `src/qml/Main.qml` | The example view | Later—replace with your own UI |
   | `metadata.json`, `CMakeLists.txt` | Build config | Step 2 only |

   You add your chat code in `UiExamplePlugin::initLogos()`. Leave the example `status` / `add` UI as is for now.

:::info
Keep the module named `ui_example`. The name is referenced in `metadata.json`, `CMakeLists.txt`, the `src/ui_example*` files, and `Main.qml` (`logos.module("ui_example")`)—they must all match, or `nix build` fails. To use a different name, change it in every one of these.
:::

## Step 2: Declare `chat_module` as a dependency

Add `chat_module` to both `metadata.json` and `flake.nix`, pinning to the released tag so your app stays stable as the module's API evolves.

:::info
The flake input name (`chat_module`) must match the dependency name in `metadata.json`. `logos-module-builder` automatically generates the typed `chat_module` wrapper at build time.
:::

1. In `metadata.json`, add `chat_module` and `delivery_module` to the dependencies array and reuse `chat_module`'s bundled `delivery_module` contract:

   ```json
   {
     "name": "ui_example",
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

1. In `flake.nix`, pin `chat_module` and its [transport](../../get-started/glossary.md#transport) dependency `delivery_module`, then map the delivery input to the `delivery_module` dependency so the builder can resolve its runtime:

   ```nix
   inputs = {
     # Follow chat_module's own builder so the codegen chain matches the one the
     # module was released against.
     logos-module-builder.follows = "chat_module/logos-module-builder";
     # Pin chat_module to the released tag so its API can't shift under `nix flake update`.
     chat_module.url = "github:logos-co/logos-chat-module/v0.2.2";
     # chat_module reaches delivery over IPC, but the builder still needs delivery's
     # runtime build from a matching flake input. Pin the v0.2.0 tag—the exact
     # rev chat_module v0.2.2 is built against.
     logos-delivery-module.url = "github:logos-co/logos-delivery-module/v0.2.0";
   };

   outputs = inputs@{ logos-module-builder, logos-delivery-module, ... }:
     logos-module-builder.lib.mkLogosQmlModule {
       src = ./.;
       configFile = ./metadata.json;
       # Map the delivery input to the `delivery_module` dependency name.
       flakeInputs = { delivery_module = logos-delivery-module; } // inputs;
     };
   ```

:::info
The `dependency_overrides` entry above only points the builder at delivery's `.lidl` contract for code generation—it does **not** supply delivery's runtime build. The builder resolves each `metadata.json` dependency's runtime from a matching flake input, so `delivery_module` needs the `logos-delivery-module` input, mapped in via `flakeInputs`. Without it, `nix build` cannot resolve `delivery_module`. This mirrors how [`logos-chat-ui`](https://github.com/logos-co/logos-chat-ui/blob/v0.2.2/flake.nix) wires the two modules together.
:::

## Step 3: Initialise `LogosModules` and subscribe to events

In your module's `initLogos()` function, construct `LogosModules` with the provided `LogosAPI*` and subscribe to all push events before calling `init()`. Subscribing first ensures you do not miss early events or the first incoming messages.

1. Add the `LogosModules` member, then construct it in `initLogos()`.

   In the header `src/ui_example_plugin.h`—add the include and the member:

   ```cpp
   #include "logos_sdk.h"   // generated umbrella—exposes LogosModules

   // inside the UiExamplePlugin class:
   LogosModules* m_logos = nullptr;
   ```

   In `src/ui_example_plugin.cpp`—construct it:

   ```cpp
   void UiExamplePlugin::initLogos(LogosAPI* api) {
       logosAPI = api;      // keep the scaffold's two existing lines
       setBackend(this);
       m_logos = new LogosModules(api);
       // Use m_logos->chat_module to call the Logos Chat module.
   }
   ```

1. Subscribe to the module's push events. Each handler receives the event's positional arguments in the order declared in `chat_module.lidl`:

   ```cpp
   auto& chat = m_logos->chat_module;

   // A new message arrived in a conversation.
   chat.on("message_received", [](const QVariantList& a) {
       // a[0]: QString convo_id, a[1]: QString content, a[2]: qint64 timestamp_ms,
       // a[3]: QString sender (the sender's account address)
   });
   // One of your own messages was recorded/sent.
   chat.on("message_sent", [](const QVariantList& a) {
       // a[0]: convo_id, a[1]: content, a[2]: timestamp_ms
   });
   // A conversation was created—incoming from a peer, or your own outgoing one.
   chat.on("conversation_created", [](const QVariantList& a) {
       // a[0]: QString convo_id, a[1]: bool is_outgoing, a[2]: QString peer_label,
       // a[3]: QString kind ("direct" | "group"), a[4]: QString name, a[5]: QString desc
       // Choose a[3] = "direct" for a 1:1 conversation
   });
   chat.on("conversation_updated", [](const QVariantList& a) { /* a[0]: convo_id */ });
   chat.on("members_changed",      [](const QVariantList& a) { /* a[0]: convo_id */ });
   chat.on("conversation_deleted", [](const QVariantList& a) { /* a[0]: convo_id */ });
   // Delivery/connection state changed—drives your "connected" indicator.
   chat.on("delivery_state_changed", [](const QVariantList& a) {
       // a[0]: QString delivery_state ("initialising" | "online" | "stopped" | "error")
       // a[1]: QString detail
   });
   ```

   See [`rust-lib/chat_module.lidl`](https://github.com/logos-co/logos-chat-module/blob/v0.2.2/rust-lib/chat_module.lidl) for the exact argument list of every method and event.

## Step 4: Initialise the chat client

Status-bearing methods return their result **synchronously** as a `LogosResult`.
- `res.success` tells you whether the call succeeded;
- `res.getError<QString>()` carries the failure reason;
- `res.getValue<QString>()` carries the returned value (for example, the new conversation's id).

Ongoing activity—incoming messages, new conversations, delivery-state changes—arrives **asynchronously** through the push events you subscribed to in Step 3.

:::info
`init()` starts delivery asynchronously, so the client is not connected the moment `init()` returns. Watch `delivery_state_changed` for the `online` state before creating conversations or sending messages.
:::

`init()` takes a single `ChatConfig` record, passed from C++ as a `QVariantMap` (records in parameter position have no generated struct—the wire shape is the contract). Both fields are optional:

| Field | Type | Notes |
|---|---|---|
| `delivery_preset` | string | The delivery network to join. Use `logos.test` to reach the Logos test network; absent or empty means `logos.dev`. Must match across all participants. |
| `log_level` | string | The chat core's own log verbosity: `error`, `warn`, `info`, `debug`, or `trace` (default `info`) |

1. Initialise the chat client:

   ```cpp
   const QVariantMap config{
       {"delivery_preset", "logos.test"},
       {"log_level", "info"},
   };
   const LogosResult res = m_logos->chat_module.init(config);
   if (!res.success) {
       qWarning() << "init failed:" << res.getError<QString>();
       return;
   }
   // init succeeded; delivery connects asynchronously.
   // Wait for delivery_state_changed with state == "online" before creating conversations.
   ```

1. Read (or set) your identity:

   ```cpp
   const QString myId = m_logos->chat_module.get_installation_name();
   // Optionally choose a name: m_logos->chat_module.set_installation_name("alice");
   ```

1. Share your address:

   ```cpp
   const QString myAddress = m_logos->chat_module.get_address();
   // share `myAddress` out of band (the peer pastes it—see Steps 9 and 10)
   ```

## Step 5: Direct conversations

A direct conversation is 1:1 - the initiator opens it with the peer's address, and messages flow both ways end-to-end encrypted.

:::info
To create a group conversation, skip this step and proceed to [Step 6](#step-6-group-conversations).
:::

1. Open the conversation as the initiator, or receive it as the recipient:

   ```cpp
   const LogosResult res = m_logos->chat_module.create_conversation(peerAddress);
   // On success a conversation_created event (is_outgoing == true) fires with the new convo_id.
   ```

   - The initiator calls `create_conversation` with the peer's address (their `get_address()`).
   - The recipient does not call anything; a `conversation_created` push event (`is_outgoing == false`) arrives automatically once the invite lands.

1. Send a message:

   ```cpp
   m_logos->chat_module.send_message(convoId, "How are you?");
   // On success a message_sent event fires locally; the peer receives a message_received event.
   ```

   - Message content is plain text in both directions—the module handles encoding and end-to-end encryption on the wire.

1. Receive messages through the `message_received` event.

## Step 6: Group conversations

A group conversation starts with its creator as the only member and grows one peer at a time. Unlike a [direct conversation](#step-5-direct-conversations), membership changes are asynchronous by design: an add is committed by the group some time after it is proposed.

1. Create the group:

   ```cpp
   const LogosResult res = m_logos->chat_module.create_group_conversation("Book Club", "Weekly sci-fi picks");
   const QString groupId = res.getValue<QString>();  // the conversation id every member will share
   ```

   - The group starts with you as its only member. The name and description are shared metadata, carried to every joiner. Note that this metadata is only set once at the moment of group creation and cannot be edited later.

1. Grow the group one member at a time:

   ```cpp
   m_logos->chat_module.add_group_member(groupId, peerAddress);
   // Returns once the add is *proposed*; the group commits it asynchronously.
   ```

   - `add_group_member` returns as soon as the add is proposed. The process takes a few minutes, then the peer will see the group chat on their side.
   - The invited peer does not call anything; a `conversation_created` event (`kind == "group"`, carrying the group's shared name and description) arrives once the welcome lands.
   - Membership is symmetric: **any** member can propose an add, not just the creator.
   - A `members_changed` event fires on every membership change.
   - Members can not be removed.

1. Send a message to the group:

   ```cpp
   m_logos->chat_module.send_message(groupId, "hello group");
   // One send reaches every member; each receiver gets a message_received event.
   ```

1. Receive group messages through the same `message_received` event.

## Step 7: Read state and shut down

1. Read history and conversation state at any time (synchronous reads):

   ```cpp
   const QVariantList convos = m_logos->chat_module.list_conversations();  // [Conversation]
   const QVariantList msgs   = m_logos->chat_module.get_messages(convoId); // [Message]
   const QVariantMap  st     = m_logos->chat_module.status().toMap();      // { convo_count, delivery_state, detail }
   ```

   :::warning
   Do not make a synchronous module read (`list_conversations`, `get_messages`, `status`) from *inside* an event handler—it re-enters the IPC replica while its read notifier is disabled and stalls until the call times out. Defer the read to the next event-loop turn instead (see `deferToEventLoop` in [`logos-chat-ui`](https://github.com/logos-co/logos-chat-ui/blob/v0.2.2/src/ChatBackend.cpp)).
   :::

1. Read a group conversation roster at any time:

   ```cpp
   const QVariantList members = m_logos->chat_module.list_group_members(groupId);  // [GroupMember]
   // Each element: { address, pending }—committed members first, then invites
   // this instance sent that the group has not committed yet (pending == true).
   ```

   - The `pending` flag clears when the group commits that add. An unknown conversation id reports an empty roster.

1. Shut down cleanly:

   ```cpp
   m_logos->chat_module.shutdown();   // disconnects and tears the client down
   ```

## Step 8: Build and run

1. Build the module:

   ```sh
   nix build
   ```

1. Preview the module using `logos-standalone-app` (for `ui_qml` modules):

   ```sh
   nix run                # preview via logos-standalone-app (for ui_qml modules)
   nix build .#lgx        # package as .lgx for installation into logos-basecamp
   ```

## Step 9: Verify a two-instance direct exchange

A chat is only proven end to end when a message travels between two running instances. Start two copies of your module—each with its own instance directory—and confirm a message lands as a `message_received` event. Per-instance isolation comes from the host's instance directory (for example `nix run . -- --user-dir ~/.local/share/chat_a`).

1. Start both instances and wait until each reports `delivery_state == "online"` via `delivery_state_changed`.
1. **In instance A**: call `get_address()` and share the returned address out of band (copy it into instance B).
1. **In instance B**: call `create_conversation(addressFromA)`.
   - Instance B sees a `conversation_created` event (`is_outgoing == true`); instance A should receive one with `is_outgoing == false` once the invite lands.
1. **In instance B**: send the first message: `send_message(convoId, "Hello from B")`.
   - Instance A should receive a `message_received` event carrying `"Hello from B"`.
1. **In instance A**: reply with `send_message(convoId, "Hi B")`.
   - Instance B should receive the matching `message_received` event.

Seeing the `message_received` events on both sides confirms the full round trip: identity, address exchange, key discovery, conversation setup, and end-to-end encrypted delivery.

## Step 10: Verify a three-instance group conversation

Group semantics only show with three or more members. Start three instances (A, B, and C) by following the instructions in [Step 9](#step-9-verify-a-two-instance-direct-exchange) and wait for all three to report `online`. Group joins land asynchronously (see [Step 6](#step-6-group-conversations))—budget minutes per membership change.

1. Collect each instance's address via `get_address()`.
1. **In instance A**: call `create_group_conversation("Book Club", "Weekly sci-fi picks")` and keep the returned conversation id.
1. **In instance A**: call `add_group_member(groupId, addressOfB)`.
   - The call returns immediately; B joins once the group commits the add—B receives a `conversation_created` event (`kind == "group"`, `name == "Book Club"`) under the same conversation id A holds.
1. **In instance B**: Once B has joined, call `add_group_member(groupId, addressOfC)`.
   - C can join the same way.
1. In each instance, call `list_group_members(groupId)` and wait until all three addresses appear with `pending == false` on every member. Each membership change also fires `members_changed`.
1. **In instance A**: call `send_message(groupId, "hello group")`.
   - B and C each receive one `message_received` event whose `sender` is A's address.
1. **In instance C**: post a reply.
   - A and B should receive it, attributed to C's address—the newest member reaches the founding members and vice versa.

## Troubleshooting the Logos Chat module

### Why does a method fail?

The method returns a `LogosResult` with `success == false` and a reason in `getError<QString>()`. The most common cause is calling a conversation or message method before `init()` succeeded, or before delivery reached the `online` state. Call `init()` first, check `res.success`, and wait for a `delivery_state_changed` event with `delivery_state == "online"` before creating conversations or sending messages.

### Why do peers not connect or messages not propagate?

The `delivery_preset` differs across instances, or delivery has not reached `online`. All participants must use the same preset (for example `logos.test`) to share a network, and each instance must report `online` via `delivery_state_changed` (or `status()`) before it can exchange messages. Each instance must also be able to reach the [key-package registry](https://devnet.chat-kc.logos.co), where key material is published during `init()` and looked up by `create_conversation`. For delivery-level detail, check the log file named by `get_log_path()`.

### Why hasn't an invited member joined the group yet?

This is the designed behaviour, not a hang. An `add_group_member` call only *proposes* the add: the group agrees on it, the group's steward batches it into an MLS commit after a commit-inactivity window (60 seconds by default), and the welcome only travels after that commit—so a join lands minutes after the call over the live network. Until the commit, the invite shows in the proposer's `list_group_members` with `pending == true`. Poll `list_conversations` on the invited instance (or wait for its `conversation_created` event) rather than assuming failure. An invite the group never commits stays pending for the life of the conversation.

### Why is `send_message` rejected right after a membership change?

Briefly after a membership change commits, the group is finalising its new epoch and rejects sends. Retry after a few seconds.

### Why does a read stall the UI?

You issued a synchronous module read (`list_conversations`, `get_messages`, `status`) from inside an event handler. That re-enters the IPC replica while its read notifier is disabled and blocks until the call times out. Defer such reads to the next event-loop turn.

### Why are my conversations gone after a restart?

Chat state is **ephemeral** in this release: identity, conversations, and message history live in memory only. Restarting an instance mints a fresh identity with a new address and an empty conversation list, so peers must re-open conversations with the new address. Persistence across restarts is planned for a later release.
