---
name: Journey documentation (doc packet)
about: Use the Logos Delivery module API from an app
title: "[Journey] Use the Logos Delivery module API from an app"
labels: type:journey
---

# Use the Logos Delivery module API from an app

## 1. Outcome and purpose

- **What the user achieves:** A developer builds a Logos module that calls the Logos Delivery API from C++ to subscribe to content topics, send messages, and react to delivery events on the Logos messaging network.
- **Why it matters:** Proves the Logos Delivery module is functioning and gives application developers a working pattern for integrating Logos messaging into their C++ modules.
- **Key components:**
  - `logos-delivery-module` — the Logos module exposing the Logos Delivery API. This doc targets **tag `v0.1.3`**.
  - `logos-delivery` — underlying implementation, a transitive dependency resolved automatically by Nix and linked statically into `logos-delivery-module`.
  - `logos-delivery-demo` — a complete, runnable example module that follows this doc end-to-end (referenced in §7).

## 2. Scope

- **Repositories:**
  - https://github.com/logos-co/logos-delivery-module (pinned to [`v0.1.3`](https://github.com/logos-co/logos-delivery-module/tree/794c21cbe177bdea16d4907468eaf52d4282dda7))
  - https://github.com/logos-messaging/logos-delivery
- **Runtime target:** Testnet v0.1
- **Prerequisites:**
  - OS: macOS (aarch64 or x86_64) or Linux (aarch64 or x86_64)
  - Nix with flakes enabled
  - Advanced: a non-Nix build (CMake ≥ 3.14, Ninja, pkg-config, Qt6) is possible but requires hand-building the Logos toolchain — not covered here.

## 3. Happy path

### Step 1: Create a Logos module

Scaffold a new module using [logos-module-builder](https://github.com/logos-co/logos-module-builder). For a full walkthrough, see the [Logos module developer guide](https://github.com/logos-co/logos-tutorial/blob/master/logos-developer-guide.md). For a complete worked example following this doc, see [`logos-delivery-demo`](https://github.com/logos-co/logos-delivery-demo).

### Step 2: Declare `delivery_module` as a dependency

In `metadata.json`:

```json
{
  "name": "my_app",
  "dependencies": ["delivery_module"],
  ...
}
```

In `flake.nix`, add a matching input. **Pin to a released tag** so the doc and your app remain stable when the module's API evolves:

```nix
inputs = {
  logos-module-builder.url = "github:logos-co/logos-module-builder";
  delivery_module.url = "github:logos-co/logos-delivery-module/v0.1.3";
};
```

> The flake input name (`delivery_module`) must match the dependency name in `metadata.json`. `logos-module-builder` automatically generates the typed `delivery_module` wrapper at build time.

### Step 3: Call the delivery module API

> [!TIP]
> For the full API reference, see:
> - [`README.md`](https://github.com/logos-co/logos-delivery-module/blob/794c21cbe177bdea16d4907468eaf52d4282dda7/README.md#module-interface)
> - [`src/delivery_module_plugin.h`](https://github.com/logos-co/logos-delivery-module/blob/794c21cbe177bdea16d4907468eaf52d4282dda7/src/delivery_module_plugin.h)

In your module's `initLogos()`, construct `LogosModules` with the provided `LogosAPI*`. `LogosModules` is generated at build time by `logos-module-builder`; pull it in via the umbrella header and keep it on the plugin as a member.

```cpp
#include "logos_sdk.h"   // generated umbrella — exposes LogosModules

// In your plugin class:
//   LogosModules* m_logos = nullptr;

void MyPlugin::initLogos(LogosAPI* api) {
    m_logos = new LogosModules(api);
    // m_logos->delivery_module is now the typed wrapper for the Logos Delivery module.
}
```

Then drive the module through the following sequence.

#### 1. Register event handlers (before starting)

Wire your handlers **before** `start()` so you don't miss the first `connectionStateChanged` event:

```cpp
m_logos->delivery_module.on("connectionStateChanged", [](const QVariantList& data) {
    // data[0]: QString — connection status
    // data[1]: QString — timestamp (ns since epoch)
});

m_logos->delivery_module.on("messageReceived", [](const QVariantList& data) {
    // data[0]: QString     — messageHash
    // data[1]: QString     — contentTopic
    // data[2]: QByteArray  — payload (raw bytes)
    // data[3]: QString     — timestamp (ns since epoch)
});

m_logos->delivery_module.on("messageSent",       [](const QVariantList& data) { /* requestId, hash, ts */ });
m_logos->delivery_module.on("messagePropagated", [](const QVariantList& data) { /* requestId, hash, ts */ });
m_logos->delivery_module.on("messageError",      [](const QVariantList& data) { /* requestId, hash, error, ts */ });
```

See `src/delivery_module_plugin.h` in the module repo for the exact event contracts.

#### 2. Initialize the node

Every lifecycle method returns a `LogosResult`. **Always check `success` before continuing**, and surface `getError()` on failure:

```cpp
const QString cfg = R"({"logLevel":"INFO","mode":"Core","preset":"logos.test"})";

LogosResult r = m_logos->delivery_module.createNode(cfg);
if (!r.success) {
    qWarning() << "createNode failed:" << r.getError();
    return;
}
```

#### 3. Connect to the network

```cpp
LogosResult r = m_logos->delivery_module.start();
if (!r.success) {
    qWarning() << "start failed:" << r.getError();
    return;
}
```

`connectionStateChanged` fires off-thread once the node connects to peers.

#### 4. Subscribe to a content topic

Use a [LIP-23](https://lip.logos.co/messaging/draft/23/topics.html) content-topic string:

```cpp
LogosResult r = m_logos->delivery_module.subscribe(contentTopic);
if (!r.success) {
    qWarning() << "subscribe failed:" << r.getError();
}
```

#### 5. Send a message

On success, `getString()` returns the request ID; track it through the `messageSent` → `messagePropagated` events (or `messageError`):

```cpp
LogosResult r = m_logos->delivery_module.send(contentTopic, payload);
if (!r.success) {
    qWarning() << "send failed:" << r.getError();
    return;
}
const QString requestId = r.getString();
```

#### 6. Clean shutdown

`stop()` tears down the underlying node, which drops every active subscription and event listener — no need to call `unsubscribe()` first.

```cpp
LogosResult s = m_logos->delivery_module.stop();
if (!s.success) qWarning() << "stop failed:" << s.getError();
```

All lifecycle calls (`createNode`, `start`, `stop`, `subscribe`, `unsubscribe`, `send`) are synchronous and return `LogosResult`. Events are delivered off-thread as Logos plugin events.

### Step 4: Build and run

```sh
nix build              # build the module
nix run                # preview via logos-standalone-app (for ui_qml modules)
nix build .#lgx        # package as .lgx for installation into logos-basecamp
```

## 4. Verification

- **Success indicators:**
  - `createNode()` returns `result.success == true`
  - `start()` returns `result.success == true`
  - `connectionStateChanged` event fires with a non-empty status string within a few seconds
  - `send()` returns a successful `LogosResult`; `result.getString()` is a non-empty request ID
  - `messageSent` and then `messagePropagated` fire for that request ID
  - On the subscribing side, `messageReceived` fires on the subscribed content topic

## 5. Configuration

`createNode` accepts a flat JSON object mapping to `WakuNodeConf` fields. Minimal working config using the `logos.test` preset:

```json
{
  "logLevel": "INFO",
  "mode": "Core",
  "preset": "logos.test"
}
```

Full key reference and available presets (`logos.test`, `logos.dev`, `twn`): see the [Module Interface](https://github.com/logos-co/logos-delivery-module/blob/794c21cbe177bdea16d4907468eaf52d4282dda7/README.md#module-interface) section of the README.

By default the module assigns every listening port (TCP, discv5 UDP, REST, metrics, websocket) to `0`, letting the OS pick a free ephemeral port. Pin a specific port by setting it explicitly in the config (e.g. `tcpPort`); caller-supplied ports are always preserved (fleet configs that pin ports keep working).

Because unspecified ports default to `0`, you can run several instances of the same app side-by-side on one machine without port collisions — each node binds OS-assigned ephemeral ports.

## 6. Known issues and troubleshooting

1. **`createNode` returns an unsuccessful `LogosResult`**
   - Cause: malformed JSON, or an internal initialization error.
   - Fix: validate the JSON is well-formed; key names are camelCase matching `WakuNodeConf` fields. Set `"logLevel": "DEBUG"` for verbose output. Inspect `result.getError()` for the underlying message.

2. **`send()` returns an unsuccessful `LogosResult`**
   - Cause: node was not started, or `contentTopic` is empty/invalid.
   - Fix: call `start()` first and verify it returned success. Confirm the content topic follows the LIP-23 format.

3. **`messageSent` never fires after a successful `send()`**
   - Cause: node is not connected to peers yet, or the network layer rejected the message (e.g., RLN proof failure).
   - Fix: wait for `connectionStateChanged` before sending. If `messageError` fires, inspect `data[2]` (error message) for details.

4. **`messageReceived` never fires**
   - Cause: `subscribe()` was not called before messages were sent, or the payload was sent on a different content topic.
   - Fix: call `subscribe(topic)` before any messages are sent on that topic.

5. **Two instances of the same app on one host fail to start (port collision)**
   - Cause: you pinned the same fixed port (e.g. `tcpPort`) for both instances.
   - Fix: omit the port keys so each instance gets an OS-assigned ephemeral port (the default), or assign distinct ports per instance.

**Out of scope for this doc:**

- Private/encrypted messaging
- Custom bootstrap peer configuration (use preset-provided defaults for `logos.test`)
- Running a self-hosted `logos-delivery` backend

## 7. Additional context

- **Complete example:** [`logos-delivery-demo`](https://github.com/logos-co/logos-delivery-demo) — a small `ui_qml` module that subscribes to user-managed content topics, sends/receives messages, and surfaces every `delivery_module` call with an `Info` button. Follows this doc end-to-end and is built against `logos-delivery-module/v0.1.3`.
- **Full API reference:** `src/delivery_module_plugin.h` at `v0.1.3` contains Doxygen documentation for every method and event contract.
- **Module development guide:** [`logos-developer-guide.md`](https://github.com/logos-co/logos-tutorial/blob/master/logos-developer-guide.md) in `logos-tutorial` covers scaffolding, inter-module communication, `LogosResult` handling, and the generated wrappers.
- **Node metrics:** `collectOpenMetricsText()` (added in `v0.1.3`) returns the node's Prometheus/OpenMetrics exposition text so the [`openmetrics`](https://github.com/logos-co/openmetrics-module) module can scrape it via the text-source convention. It returns an empty document before the node is created, so a scrape never errors.
- **Hardware requirements:** Standard developer machine. No special hardware required. Minimum ~1 GB RAM for the node process.
- **Estimated time to complete:** ~10 minutes of hands-on work. Nix build time is excluded — it depends on your machine and cache state.
- **Security notes:** `createNode` must be called exactly once per context; calling it multiple times without `stop()`-ing and destroying the context is undefined behavior.

## References

- `logos-delivery-module` (this doc targets [`v0.1.3`](https://github.com/logos-co/logos-delivery-module/tree/794c21cbe177bdea16d4907468eaf52d4282dda7)): https://github.com/logos-co/logos-delivery-module
- `logos-delivery-demo` (complete worked example): https://github.com/logos-co/logos-delivery-demo
- `logos-module-builder` (build system + scaffolding): https://github.com/logos-co/logos-module-builder
- `logos-tutorial` (module development walkthrough): https://github.com/logos-co/logos-tutorial
- `logos-delivery` (underlying implementation): https://github.com/logos-messaging/logos-delivery
- LIP-23 content topics: https://lip.logos.co/messaging/draft/23/topics.html
