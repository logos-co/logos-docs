---
name: Journey documentation (doc packet)
about: Use the Logos Delivery module API from an app
title: "[Journey] Use the Logos Delivery module API from an app"
labels: type:journey
---

# Use the Logos Delivery module API from an app

## 1. Outcome and purpose

- **What the user achieves:** A developer builds the Logos Delivery module and calls its API from a C++ application to send and receive messages over the Logos messaging network.
- **Why it matters:** Proves the Logos Delivery module is functioning and enables application developers to integrate Logos messaging into their C++ applications as a first-step integration.
- **Key components:**
  - `logos-delivery-module` — Logos module exposing the Logos Delivery API.
  - `logos-delivery` — Underlying implementation; a transitive dependency resolved automatically by Nix, linked statically to `logos-delivery-module`.

## 2. Scope

- **Repositories:**
  - https://github.com/logos-co/logos-delivery-module
  - https://github.com/logos-messaging/logos-delivery
- **Runtime target:** Testnet v0.1
- **Prerequisites:**
  - OS: macOS (aarch64 or x86_64) or Linux (aarch64 or x86_64)
  - Nix with flakes enabled (recommended path)
  - If not using Nix: CMake ≥ 3.14, Ninja, pkg-config, Qt6 (`qtbase` + `qtremoteobjects`)

## 3. Happy path

### Step 1: Create a Logos module

Scaffold a new module using [logos-module-builder](https://github.com/logos-co/logos-module-builder). For a full walkthrough, see [logos-tutorial](https://github.com/logos-co/logos-tutorial).

### Step 2: Declare `delivery_module` as a dependency

In `metadata.json`:

```json
{
  "name": "my_app",
  "dependencies": ["delivery_module"],
  ...
}
```

In `flake.nix`, add a matching input (the attribute name must match the dependency name):

```nix
inputs = {
  logos-module-builder.url = "github:logos-co/logos-module-builder";
  delivery_module.url = "github:logos-co/logos-delivery-module";
};
```

`logos-module-builder` automatically generates the typed `delivery_module` wrapper at build time.

### Step 3: Call the delivery module API

> ![TIP] For full documentation on module's API, check: 
> - [`README.md`](https://github.com/logos-co/logos-delivery-module#module-interface)
> - [`src/delivery_module_plugin.h`](https://github.com/logos-co/logos-delivery-module/blob/main/src/delivery_module_plugin.h)

In your module's `initLogos()`, instantiate `LogosModules` with the provided `LogosAPI*`. This gives you typed access to all declared dependencies, including `delivery_module`:

```c++
void MyPlugin::initLogos(LogosAPI* api) {
    m_logos = new LogosModules(api);
    // m_logos->delivery_module is now the Logos Delivery module instance
}
```

Then call the delivery module in order:

1. Initialize the node with a JSON config
    ```c++
    m_logos->delivery_module.createNode({"logLevel":"INFO","mode":"Core","preset":"logos.dev"})
    ```

2. Register event handlers
    ```c++
    m_logos->delivery_module.on("connectionStateChanged", ...)
    m_logos->delivery_module.on("messageReceived", ...)
    m_logos->delivery_module.on("messageSent", ...)
    m_logos->delivery_module.on("messageError", ...)
    ```

3. Connect to the network
    ```c++
    m_logos->delivery_module.start()
    ```

4. Subscribe to a [LIP-23](https://lip.logos.co/messaging/informational/23/topics.html#content-topics) content topic
    ```c++
    m_logos->delivery_module.subscribe(contentTopic)
    ```

5. Send a message — returns a request ID; delivery confirmation arrives asynchronously via `messageSent` / `messageError`
    ```c++
    m_logos->delivery_module.send(contentTopic, payload)
    ```

6. Clean shutdown
    ```c++
    m_logos->delivery_module.unsubscribe(contentTopic)
    m_logos->delivery_module.stop()
    ```

All lifecycle calls (`createNode`, `start`, `stop`, `subscribe`, `unsubscribe`, `send`) are synchronous. Events arrive off-thread via the Qt event loop.

### Step 4: Build and run

```sh
nix build
nix run
```

## 4. Verification

- **Success indicators:**
  - `start()` returns `true`
  - `connectionStateChanged` event fires with a non-empty status string
  - `send()` returns a successful `LogosResult` with a request ID, and `messageSent` fires for that ID
  - On the subscribing side, `messageReceived` fires on the subscribed content topic

## 5. Configuration

`createNode` accepts a flat JSON object mapping to `WakuNodeConf` fields. Minimal working config using the `logos.dev` preset:

```json
{
  "logLevel": "INFO",
  "mode": "Core",
  "preset": "logos.dev"
}
```

Full key reference and available presets (`logos.dev`, `twn`): [Module Interface](https://github.com/logos-co/logos-delivery-module#module-interface) in the README.

Default P2P TCP listen port: `60000` (configurable via `tcpPort`).

## 6. Known issues and troubleshooting

1. **`createNode` returns `false`**
   - Cause: malformed JSON, or an internal initialization error.
   - Fix: validate the JSON is well-formed and all key names are camelCase matching `WakuNodeConf` fields. Set `"logLevel": "DEBUG"` to get verbose output.

2. **`send()` returns an error result**
   - Cause: node was not started, or `contentTopic` is empty/invalid.
   - Fix: call `start()` first and verify it returns `true`. Check the content topic follows the LIP-23 format.

3. **`messageSent` never fires after a successful `send()`**
   - Cause: node is not connected to peers yet, or the network layer rejected the message (e.g., RLN proof failure).
   - Fix: wait for `connectionStateChanged` to fire before sending. If `messageError` fires, inspect `data[2]` (error message) for details.

4. **`messageReceived` never fires**
   - Cause: `subscribe()` not called before messages were sent, or the payload was sent on a different content topic.
   - Fix: call `subscribe(topic)` before any messages are sent on that topic. Remember that `data[2]` (payload) is base64-encoded and must be decoded before display.

**Out of scope for this doc:**

- Private/encrypted messaging
- Custom bootstrap peer configuration (use preset-provided defaults for logos.dev)
- Running a self-hosted logos-delivery backend

## 7. Additional context

- **Full API reference:** `src/delivery_module_plugin.h` in the `logos-delivery-module` repo contains complete Doxygen documentation for every method and event contract.
- **Module development guide:** `logos-developer-guide.md` in the `logos-tutorial` repo covers scaffolding, inter-module communication, `LogosResult` handling, and the generated wrappers in detail.
- **Hardware requirements:** Standard developer machine. No special hardware required. Minimum ~1 GB RAM for the node process.
- **Estimated time to complete:** 20–30 minutes (including Nix build times).
- **Security notes:** `createNode` must be called exactly once per context; calling it multiple times without stopping and destroying the context is undefined behavior.

## References

- `logos-delivery-module` repo: https://github.com/logos-co/logos-delivery-module
- `logos-module-builder` (build system + scaffolding): https://github.com/logos-co/logos-module-builder
- `logos-tutorial` (module development walkthrough): https://github.com/logos-co/logos-tutorial
- `logos-delivery`: https://github.com/logos-messaging/logos-delivery
- LIP-23 content topics: https://lip.logos.co/messaging/informational/23/topics.html#content-topics
