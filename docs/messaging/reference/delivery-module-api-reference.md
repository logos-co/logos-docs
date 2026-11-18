---
title: Delivery module API reference
doc_type: reference
product: messaging
owner: logos
mdx:
  format: md
sidebar_position: 100
description: Look up every method and event the Delivery module exposes.
custom_edit_url: https://github.com/logos-co/logos-delivery-module/blob/master/src/delivery_module_plugin.h
source_repo: logos-co/logos-delivery-module
source_version: v0.3.3
---

# Delivery module API reference

#### Look up every method and event the Delivery module exposes.

:::note[Mirrored page]
This page mirrors the [API reference](https://logos-co.github.io/logos-delivery-module/v0.3.3/pages/api_reference.html) published with
`logos-delivery-module` v0.3.3, and is regenerated automatically after each release. To change it, edit
the source in [`logos-co/logos-delivery-module`](https://github.com/logos-co/logos-delivery-module), not this page.
:::

Everything `delivery_module` exposes, generated from the doc comments in `src/delivery_module_plugin.h`: the methods you call, and the events they report back through.

## Methods {#methods}

Every call returns as soon as its request is dispatched. Where the outcome only becomes known later, it is reported through the events below.

### `createNode` {#createNode}

```cpp
StdLogosResult createNode(const std::string &cfg)
```

Creates a liblogosdelivery node from a JSON configuration.

The JSON passes through to logos-delivery verbatim; `parseLogosDeliveryConf` ([logos-messaging/logos-delivery](https://github.com/logos-messaging/logos-delivery)) owns the grammar. `entryLayer` selects how much of the stack is mounted:

- `"kernel"` — transport node only
- `"messaging"` — kernel + messaging client
- `"channels"` — kernel + messaging + reliable channels (default)

Three typical shapes:

**App developer** — full stack (default `entryLayer`). `preset` picks the network (`"logos.test"`, `"logos.dev"`, `"twn"`), `mode` picks the protocol flags (`"Core"` = relay node, `"Edge"` = light node). Optional `messagingOverrides` / `channelsOverrides` objects override per-layer defaults:

```json
{ "mode": "Core", "preset": "logos.test" }
```

One such override is `anonymityLevel` — `"None"` (default), `"Preferred"` or `"Required"`. Anything above `"None"` mounts mix and routes sends through it, so it conflicts with an explicit `"mix": false`. `"Preferred"` falls back to the plain path when mix is unusable; `"Required"` fails the send instead.

```json
{
  "mode": "Core",
  "preset": "logos.test",
  "messagingOverrides": { "anonymityLevel": "Required" }
}
```

Other overrides worth naming: `backfillEnabled` (default `true`) runs Store catch-up for the messages missed while the node was down, and `backfillRequestTimeoutSeconds` bounds one Store query (default 10, range 1–300); see [messageReceived](#messageReceived) for what catch-up delivers. `nat` selects public-address discovery — `"any"` (default), `"none"`, `"upnp"`, `"pmp"` or `"extip:<IP>"`.

**Node operator** — kernel-only service node on a public network. `mode` is not applied on this layer, so protocol flags are set explicitly in `kernelConf`:

```json
{
  "entryLayer": "kernel",
  "kernelConf": { "preset": "logos.test", "relay": true }
}
```

**Network hoster** — kernel-only node on a self-hosted network; `kernelConf` is a raw `WakuNodeConf` used as-is:

```json
{
  "entryLayer": "kernel",
  "kernelConf": { "clusterId": 42, "relay": true, "entryNodes": ["/dns4/…"] }
}
```

On kernel-only nodes `send` / `subscribe` / `channel*` fail with “node has no messaging client” / “no reliable channel manager”; `getNodeInfo`, `storeQuery` and metrics keep working.

The pre-layered flat shape (bare `WakuNodeConf` keys at top level) still parses and boots the full stack.

**Parameters:** **cfg** – UTF-8 JSON payload string.

**Returns:** `true` if context creation succeeds and callback returns `RET_OK`, otherwise `false`.

### `start` {#start}

```cpp
StdLogosResult start()
```

Starts the delivery node.

**Returns:** `true` once dispatched; completion is reported via `nodeStarted`.

### `stop` {#stop}

```cpp
StdLogosResult stop()
```

Stops the delivery node.

**Returns:** `true` once dispatched; completion is reported via `nodeStopped`.

### `send` {#send}

```cpp
StdLogosResult send(const std::string &contentTopic, const std::vector<uint8_t> &payload)
```

Sends a message over the active node.

Builds a JSON envelope expected by `logosdelivery_ctx_send`: `{ "contentTopic": string, "payload": base64, "ephemeral": false }`.

Returns a requestId on success. Async results come via typed events:

- `messageError` emitted if the module can’t send the message
- `messageQueued` emitted if the send waits for rate-limit budget
- `messagePropagated` emitted if the message has hit the network
- `messageSent` emitted after the message is validated by the network

**Parameters:**

- **contentTopic** – Destination content topic.
- **payload** – Raw message bytes; base64-encoded before crossing the FFI boundary.

**Returns:** Success with request id, or error details.

### `subscribe` {#subscribe}

```cpp
StdLogosResult subscribe(const std::string &contentTopic)
```

Subscribes to the supplied content topic.

**Parameters:** **contentTopic** – Topic identifier.

**Returns:** `true` when subscribed successfully, otherwise `false`.

### `unsubscribe` {#unsubscribe}

```cpp
StdLogosResult unsubscribe(const std::string &contentTopic)
```

Unsubscribes from the supplied content topic.

**Parameters:** **contentTopic** – Topic identifier.

**Returns:** `true` when unsubscribed successfully, otherwise `false`.

### `storeQuery` {#storeQuery}

```cpp
StdLogosResult storeQuery(const std::string &jsonQuery, const std::string &peerAddr, int64_t timeoutMs)
```

Runs a Store (historical message) query against a specific store service peer.

⚠️ USE AT YOUR OWN RISK: backed by the kernel API (`logosdelivery_ctx_waku_store_query`, `liblogosdelivery_kernel.h`), which is subject to change at any point without a deprecation cycle. This method’s JSON contract follows it.

The query JSON maps to logos-delivery’s `StoreQueryRequest` (`library/kernel_api/protocols/store_api.nim`):

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `requestId` | string | yes | Caller-chosen id, echoed in the response |
| `includeData` | boolean | yes | `true` returns full messages, `false` hashes only |
| `paginationForward` | boolean | yes | Paging direction |
| `pubsubTopic` | string | no | Pubsub topic filter |
| `contentTopics` | array of string | no | Content topic filters |
| `timeStart` | number/string | no | Range start, nanoseconds since Unix epoch |
| `timeEnd` | number/string | no | Range end, nanoseconds since Unix epoch |
| `messageHashes` | array of string | no | Hex message hashes for lookup-by-hash queries |
| `paginationCursor` | string | no | Hex cursor from a previous response |
| `paginationLimit` | number | no | Max messages per page |

On success the result value is the response JSON (`StoreQueryResponseHex`): `{ "requestId", "statusCode", "statusDesc", "messages": [ { "messageHash", "message", "pubsubTopic" } ], "paginationCursor" }` with hashes 0x-hex encoded.

**Parameters:**

- **jsonQuery** – UTF-8 JSON query document, see above.
- **peerAddr** – Multiaddress of the store service peer to query (e.g. `/ip4/127.0.0.1/tcp/60000/p2p/16Uiu2...`).
- **timeoutMs** – Query timeout in milliseconds.

**Returns:** Success with the response JSON, or error details.

### `channelCreate` {#channelCreate}

```cpp
StdLogosResult channelCreate(const std::string &channelId, const std::string &contentTopic, const std::string &senderId)
```

Creates (or re-opens) a reliable channel.

Persisted channel state survives [channelClose](#channelClose), so re-creating a channel with the same id restores it.

**Parameters:**

- **channelId** – Application-chosen channel identifier.
- **contentTopic** – Content topic the channel communicates on.
- **senderId** – This participant’s SDS (Scalable Data Sync) sender identifier.

**Returns:** Success with the channel id, or error details.

### `channelExists` {#channelExists}

```cpp
StdLogosResult channelExists(const std::string &channelId)
```

Checks whether a reliable channel is currently open.

An unknown channel id is not an error.

**Parameters:** **channelId** – Channel identifier.

**Returns:** Success with `"true"` or `"false"` (verbatim FFI string), or error details.

### `channelSend` {#channelSend}

```cpp
StdLogosResult channelSend(const std::string &channelId, const std::vector<uint8_t> &payload)
```

Sends a message on a reliable channel.

Builds the JSON envelope expected by `logosdelivery_ctx_channel_send`: `{ "payload": base64, "ephemeral": false }`.

Returns a requestId on success. Async results come via typed events:

- `channelMessageSent` once every segment of the send is confirmed
- `channelMessageError` if the send finalises with a failed segment

**Parameters:**

- **channelId** – Channel identifier.
- **payload** – Raw message bytes; base64-encoded before crossing the FFI boundary.

**Returns:** Success with request id, or error details.

### `channelClose` {#channelClose}

```cpp
StdLogosResult channelClose(const std::string &channelId)
```

Closes a reliable channel: stops its SDS loops.

Persisted state survives, so [channelCreate](#channelCreate) with the same id restores the channel.

**Parameters:** **channelId** – Channel identifier.

**Returns:** `true` when closed successfully, otherwise `false`.

### `getAvailableNodeInfoIDs` {#getAvailableNodeInfoIDs}

```cpp
StdLogosResult getAvailableNodeInfoIDs()
```

Lists the node info items this node advertises, for use with getNodeInfo.

The list comes back as a JSON array of strings:

```json
["Version", "Metrics", "MyMultiaddresses", "MyENR", "MyPeerId"]
```

Which items a node advertises depends on how it was built and configured, so treat the set as discovered rather than fixed. An advertised item may still return an empty value from getNodeInfo when the feature behind it is unconfigured.

**Returns:** Success with the list above, or error details. Fails before [createNode](#createNode) has run.

### `getLocalMixPeerRecord` {#getLocalMixPeerRecord}

```cpp
StdLogosResult getLocalMixPeerRecord()
```

Returns information for the given node info item.

**Parameters:** **nodeInfoId** – Identifier for the requested node info item.

**Returns:** JSON data string on success, or error details.

### `getConnectionStatus` {#getConnectionStatus}

```cpp
StdLogosResult getConnectionStatus()
```

Returns the node’s current connection status.

`connectionStateChanged` fires on transitions only, so a caller that starts listening after the node settled reads the current status here.

**Returns:** `Disconnected`, `PartiallyConnected` or `Connected` on success, `Disconnected` while the node is not started. Fails before [createNode](#createNode) has run.

### `getAvailableConfigs` {#getAvailableConfigs}

```cpp
StdLogosResult getAvailableConfigs()
```

Information about the available configuration parameters for `createNode`.

### `collectOpenMetricsText` {#collectOpenMetricsText}

```cpp
std::string collectOpenMetricsText()
```

Returns the node’s metrics as an OpenMetrics/Prometheus text document, so the `openmetrics` module can scrape this module.

liblogosdelivery already aggregates Prometheus metrics in its global registry and renders them as exposition text behind the `"Metrics"` node-info attribute. This method just hands that text back verbatim — no reshaping — which satisfies the openmetrics `metrics_source` interface’s `collectOpenMetricsText()` convention. The openmetrics scraper parses the text, injects a `module="delivery_module"` label on every series, and merges it with other modules. Select this method per-module in the openmetrics `start` config with `{"name":"delivery_module","format":"text"}`.

Returns an empty string before a node has been created, or when the underlying read fails, so a scrape never errors out on this module.

**Returns:** OpenMetrics/Prometheus exposition text (possibly empty).

### `rlnRespond` {#rlnRespond}

```cpp
StdLogosResult rlnRespond(int64_t reqId, const std::string &resultJson)
```

Completes an outstanding RLN request (see the `rln*Request` events).

The delivery library outsources RLN operations to an external RLN module; this module facilitates that message passing. When the delivery library makes an RLN request, this module emits the matching `rln*Request` event. This method takes the reqId of the original request along with the response and passes it on to the library verbatim — the wire schema is owned by the RLN module and the delivery library, not modelled here.

On a node running lez RLN the in-process bridge (see [rlnBridgeEnable](#rlnBridgeEnable)) answers each request itself; only the first response per reqId is accepted, so a second caller of this method is rejected as a duplicate.

There is no response deadline to manage on this side: if no response arrives in time, the delivery library synthesizes a TRANSIENT failure itself. A response for a request that already timed out (or was never issued) fails with an error.

**Parameters:** **reqId** – Request id from the `rln*Request` event. Ids \>= 2^63 appear negative here (int64 view of the library’s uint64 id); they are passed through bit-exactly, so echo them back unchanged.

### `rlnBridgeEnable` {#rlnBridgeEnable}

```cpp
StdLogosResult rlnBridgeEnable()
```

Enables the in-process RLN bridge.

Once enabled, each `rln*Request` is answered inside this module: the bridge’s worker threads call the co-loaded `liblogos_rln_module` and pass its reply back unchanged. The events keep emitting for observability, but an external responder must not also answer an enabled node: its second response per reqId is rejected. Idempotent; call any time before [start](#start). A preset that enables RLN does this automatically. Calling it directly is mainly for test purposes.

### `rlnState` {#rlnState}

```cpp
StdLogosResult rlnState()
```

Where this node’s RLN stands.

RLN is not configured by a caller: [createNode](#createNode) reads the network `preset` and brings RLN up for deployments whose preset enables it. The chain-touching part of that runs off the [createNode](#createNode) thread, so a node is created before RLN is usable and this reports the progress.

| State | Meaning |
| --- | --- |
| `Disabled` | No node yet, or the node’s preset carries no RLN |
| `Initializing` | Plugin installed, backend still coming up |
| `Ready` | The in-process bridge answers requests |
| `Failed` | Bring-up failed; `message` carries the reason |

`Ready` means the backend started and the bridge answers. It does not promise the RLN module’s valid-root window is warm — that is a background refresh the module does not currently expose.

:::note[See also]

See also [rlnStateChanged](#rlnStateChanged) for the same transitions as an event.

:::

**Returns:** Value `{"state": "<state>", "message": "<detail>"}`, plus `registryId`, `rlnIdentifier` and `epochSizeSec` once a preset has enabled RLN — the resolved deployment, so a caller can name or query it without a second copy of the preset table.

## Events {#events}

A caller never invokes these. Every method above returns as soon as its request is dispatched, and what actually happened on the network arrives here — so subscribe to these rather than reading a return value.

`send` and `channelSend` return a request id, and every event reporting the outcome of that call carries the same id, so several messages can be in flight at once.

Timestamps are `int64` nanoseconds since the Unix epoch. `messageReceived` reports the timestamp carried by the message itself; every other event is stamped by the module host when the event is emitted.

### `messageQueued` {#messageQueued}

```cpp
void messageQueued(const std::string &requestId, const std::string &messageHash, int64_t timestamp)
```

Emitted when a send is held back because the epoch’s rate-limit budget is spent.

Not a failure: the message stays queued and goes out once the budget refills, so [messagePropagated](#messagePropagated) and [messageSent](#messageSent) still follow. Emitted at most once per send, the first time the message is held back.

### `messageSent` {#messageSent}

```cpp
void messageSent(const std::string &requestId, const std::string &messageHash, int64_t timestamp)
```

Emitted when the network has validated a sent message.

The success terminal state for [send](#send), usually preceded by [messagePropagated](#messagePropagated).

### `messageError` {#messageError}

```cpp
void messageError(const std::string &requestId, const std::string &messageHash, const std::string &error, int64_t timestamp)
```

Emitted when the module could not send a message; `error` carries the reason.

### `messagePropagated` {#messagePropagated}

```cpp
void messagePropagated(const std::string &requestId, const std::string &messageHash, int64_t timestamp)
```

Emitted when a message has reached the network but is not yet validated.

### `messageReceived` {#messageReceived}

```cpp
void messageReceived(const std::string &messageHash, const std::string &contentTopic, const std::vector<uint8_t> &payload, const std::string &source, int64_t timestamp)
```

Emitted when a message arrives on a subscribed content topic.

`payload` is delivered as raw bytes, already decoded from the wire encoding.

`source` is `"live"` when the message was delivered as it was published, or `"history"` when Store catch-up recovered it — at startup, or after a connectivity gap. Catch-up is on by default, so a restart replays what was missed while the node was down. Upstream suppresses duplicates only for a few minutes and only in memory, so a consumer that needs each message once must deduplicate by `messageHash`.

### `connectionStateChanged` {#connectionStateChanged}

```cpp
void connectionStateChanged(const std::string &connectionStatus, int64_t timestamp)
```

Emitted when the node’s connectivity changes.

A node configured with `anonymityLevel` above `"None"` reports disconnected until a mix exit is ready, since it cannot send anonymously before that.

### `channelMessageReceived` {#channelMessageReceived}

```cpp
void channelMessageReceived(const std::string &channelId, const std::string &senderId, const std::vector<uint8_t> &payload, int64_t timestamp)
```

Emitted when a message arrives on an open reliable channel.

`senderId` is the sending participant’s SDS identifier. `payload` is delivered as raw bytes, already decoded from the wire encoding.

### `channelMessageSent` {#channelMessageSent}

```cpp
void channelMessageSent(const std::string &channelId, const std::string &requestId, int64_t timestamp)
```

Emitted once every segment of a [channelSend](#channelSend) is confirmed.

### `channelMessageError` {#channelMessageError}

```cpp
void channelMessageError(const std::string &channelId, const std::string &requestId, const std::string &error, int64_t timestamp)
```

Emitted when a [channelSend](#channelSend) finalises with a failed segment.

### `nodeStarted` {#nodeStarted}

```cpp
void nodeStarted(bool success, const std::string &message, int64_t timestamp)
```

Emitted when [start](#start) finishes; `message` carries the reason when `success` is false.

### `nodeStopped` {#nodeStopped}

```cpp
void nodeStopped(bool success, const std::string &message, int64_t timestamp)
```

Emitted when [stop](#stop) finishes; `message` carries the reason when `success` is false.

### `rlnStateChanged` {#rlnStateChanged}

```cpp
void rlnStateChanged(const std::string &state, const std::string &message, int64_t timestamp)
```

Emitted on every RLN bring-up transition.

`state` is one of `Disabled`, `Initializing`, `Ready` or `Failed`, and `message` carries the reason on `Failed`. See [rlnState](#rlnState) for what each one means and when they occur.

### `dispatchRlnGetMembershipStateRequestEvent` {#dispatchRlnGetMembershipStateRequestEvent}

```cpp
void dispatchRlnGetMembershipStateRequestEvent(int64_t reqId, const std::string &registryId, const std::string &rlnIdentifier, int64_t timestamp)
```

RLN request events, one per ABI function (`liblogosdelivery_rln.h`).

Answer each via [rlnRespond](#rlnRespond) with the same `reqId`. The JSON args are opaque to this module (RLN module wire schema). `epochTimestamp` is the Unix-seconds epoch/quota timestamp; the trailing `timestamp` is the local emission time, as on every other event.

### `dispatchRlnGetEpochQuotaRequestEvent` {#dispatchRlnGetEpochQuotaRequestEvent}

```cpp
void dispatchRlnGetEpochQuotaRequestEvent(int64_t reqId, const std::string &registryId, const std::string &rlnIdentifier, int64_t epochTimestamp, int64_t timestamp)
```

### `dispatchRlnGenerateProofRequestEvent` {#dispatchRlnGenerateProofRequestEvent}

```cpp
void dispatchRlnGenerateProofRequestEvent(int64_t reqId, const std::string &registryId, const std::string &rlnIdentifier, const std::string &signalHex, int64_t epochTimestamp, int64_t timestamp)
```

### `dispatchRlnValidateProofRequestEvent` {#dispatchRlnValidateProofRequestEvent}

```cpp
void dispatchRlnValidateProofRequestEvent(int64_t reqId, const std::string &registryId, const std::string &rlnIdentifier, const std::string &signalHex, int64_t epochTimestamp, const std::string &proofJson, int64_t timestamp)
```
