---
title: Storage module API reference
doc_type: reference
product: storage
owner: logos
mdx:
  format: md
sidebar_position: 100
description: Look up every method and event the Storage module exposes.
custom_edit_url: https://github.com/logos-co/logos-storage-module/blob/master/src/storage_module_plugin.h
source_repo: logos-co/logos-storage-module
source_version: v3.0.2
---

# Storage module API reference

#### Look up every method and event the Storage module exposes.

:::note[Mirrored page]
This page mirrors the [API reference](https://logos-co.github.io/logos-storage-module/v3.0.2/api_reference.html) published with
`logos-storage-module` v3.0.2, and is regenerated automatically after each release. To change it, edit
the source in [`logos-co/logos-storage-module`](https://github.com/logos-co/logos-storage-module), not this page.
:::

```cpp
class StorageModuleImpl : public LogosModuleContext
```

Logos Storage Module API.

Wraps a libstorage node and exposes upload, download, and data-management operations. Synchronous methods return immediately; asynchronous methods report completion through the typed events in the `Asynchronous-completion events` section.

## Asynchronous-completion events

Each event delivers a single JSON-encoded string `payload`, described with the event below.

### `storageStop` {#storageStop}

```cpp
void storageStop(const std::string &payload)
```

Emitted when [stop()](#stop) has finished stopping the node.

```json
{
  "success": bool,
  "message": string
}
```

### `storageConnect` {#storageConnect}

```cpp
void storageConnect(const std::string &payload)
```

Emitted when [connect()](#connect) has finished connecting to the peer.

```json
{
  "success": bool,
  "message": string
}
```

### `storageUploadProgress` {#storageUploadProgress}

```cpp
void storageUploadProgress(const std::string &payload)
```

Emitted as [uploadUrl()](#uploadUrl) or [uploadChunk()](#uploadChunk) upload data.

```json
{
  "success":   bool,
  "sessionId": string,
  "bytes":     number,       // present on success
  "total":     number,       // file size in bytes
  "error":     string        // present on failure
}
```

### `storageUploadDone` {#storageUploadDone}

```cpp
void storageUploadDone(const std::string &payload)
```

Emitted when [uploadUrl()](#uploadUrl) finishes.

```json
{
  "success":   bool,
  "sessionId": string,
  "cid":       string,       // present on success
  "error":     string        // present on failure
}
```

### `storageDownloadProgress` {#storageDownloadProgress}

```cpp
void storageDownloadProgress(const std::string &payload)
```

Emitted as [downloadToUrl()](#downloadToUrl) or [downloadChunks()](#downloadChunks) receive data.

```json
{
  "success":   true,
  "sessionId": string,
  "bytes":     number,       // file download (downloadToUrl)
  "total":     number,       // file download; dataset size in bytes
  "chunk":     string        // base64 chunk, stream download (downloadChunks)
}
```

### `storageDownloadDone` {#storageDownloadDone}

```cpp
void storageDownloadDone(const std::string &payload)
```

Emitted when [downloadToUrl()](#downloadToUrl) or [downloadChunks()](#downloadChunks) finishes.

```json
{
  "success":   bool,
  "sessionId": string,
  "error":     string        // present on failure
}
```

### `storageDownloadManifestDone` {#storageDownloadManifestDone}

```cpp
void storageDownloadManifestDone(const std::string &payload)
```

Emitted when [downloadManifest()](#downloadManifest) finishes.

```json
{
  "success": bool,
  "cid":     string,
  "manifest": {              // present on success
    "manifestVersion": number,
    "treeCid":     string,
    "datasetSize": number,
    "blockSize":   number,
    "filename":    string,
    "mimetype":    string
  },
  "error":   string          // present on failure
}
```

### `storageRemoveDone` {#storageRemoveDone}

```cpp
void storageRemoveDone(const std::string &payload)
```

Emitted when [remove()](#remove) finishes.

```json
{
  "success": bool,
  "cid":     string,
  "error":   string          // present on failure
}
```

## Public Functions

### `loadConfigOrDefault` {#loadConfigOrDefault}

```cpp
StdLogosResult loadConfigOrDefault()
```

Load the configuration saved by the last successful [init()](#init).

The configuration is read from `~/.logos_storage/config.json` and migrated to this module version using its `config-version`. Depending on the updates of logos-storage-nim, some options can be removed or replaced with new ones. The data-dir and the Mix configuration are then filled in as [init()](#init) does.

When the file does not exist, returns a suitable default configuration. This call does not write anything to disk.

Returns StdLogosResult::value as a JSON string.

### `init` {#init}

```cpp
bool init(const std::string &cfg)
```

Create a new storage node instance and configure it.

`cfg` is a JSON string with the configuration overwriting defaults.

Example of JSON config:

```json
{
    "log-level": "info",
    "log-format": "auto",
    "metrics": false,
    "metrics-address": "127.0.0.1",
    "metrics-port": 8008,
    "data-dir": ".cache/storage",
    "listen-ip": "0.0.0.0",
    "listen-port": 0,
    "nat": "auto",
    "net-privkey": "key",
    "bootstrap-node": [],
    "no-bootstrap-node": false,
    "network": "logos.test",
    "dht-mix-proxy": [],
    "mix-enabled": false,
    "mix-pool": "",
    "mix-pool-json": "",
    "max-peers": 160,
    "num-threads": 0,
    "agent-string": "Logos Storage",
    "repo-kind": "fs",
    "storage-quota": 21474836480,
    "block-ttl": "30d",
    "block-mi": "10m",
    "block-mn": 1000,
    "block-retries": 300,
    "log-file": "/tmp/storage-log-624036264.log",
    "nat-schedule-interval": "2m",
    "nat-num-peers-to-ask": 3,
    "nat-max-queue-size": 3,
    "nat-min-confidence": 0.6,
    "nat-observed-addr-min-count": 1,
    "nat-max-relays": 2,
    "nat-port-mapping-discover-timeout": 500,
    "nat-port-mapping-timeout": 500,
    "nat-port-mapping-recheck-period": 300000
}
```

`cfg` is taken as a configuration suitable for this version of the module - older configuration strings are not migrated automatically (see `loadConfigOrDefault`). The data-dir is set if it is not provided. With `mix-enabled` true and no custom bootstrap settings, the Mix configuration of the network is filled in.

Do not call [init()](#init) more than once per instance.

On success, `cfg` is saved in `~/.logos_storage/config.json`, where [loadConfigOrDefault()](#loadConfigOrDefault) reads it back. A `cfg` without `config-version` is saved with the current version.

Returns true on success. The method is synchronous.

### `start` {#start}

```cpp
bool start()
```

Start the storage node.

If the node is already running, the call succeeds and emits `storageStart` immediately. If the node is starting or stopping, the call fails.

`storageStart` is emitted once the node is up.

Returns true if the start command was accepted by libstorage. Actual completion is signalled asynchronously via the `storageStart` event.

The method is asynchronous.

### `stop` {#stop}

```cpp
StdLogosResult stop()
```

Stop the storage node.

If the node is starting or stopping, the call fails.

The node can be started and stopped multiple times. Returns a StdLogosResult indicating whether the stop command was sent; actual completion is signalled via the `storageStop` event.

The method is asynchronous.

### `destroy` {#destroy}

```cpp
StdLogosResult destroy()
```

Destroy the storage context and free all resources.

Internally calls storage\_close then storage\_destroy. The node should be stopped before calling [destroy()](#destroy). Not stopping first can lead to undefined behaviour (e.g. data loss or crashes).

Fails while the node is starting or stopping.

Returns StdLogosResult::success = true on success. The method is synchronous.

### `isRunning` {#isRunning}

```cpp
bool isRunning()
```

Check whether the storage node is running.

Returns true after a successful start, and false after a successful stop or a [destroy()](#destroy).

The method is synchronous.

### `libstorageVersion` {#libstorageVersion}

```cpp
StdLogosResult libstorageVersion()
```

Get the libstorage version string.

Named for what it returns: this is the version of the underlying libstorage (Nim) library, NOT of this module. `version()` cannot be used for it &#8212; that name is reserved for module identity and must be `version() -> tstr`, which the generator injects from `metadata.json`.

Does not require the node to be started.

Returns StdLogosResult::value as a std::string on success. The method is synchronous.

### `moduleVersion` {#moduleVersion}

```cpp
std::string moduleVersion()
```

Get this module’s version, as declared in `metadata.json`.

The method is synchronous.

### `dataDir` {#dataDir}

```cpp
StdLogosResult dataDir()
```

Get the storage data directory path.

Returns StdLogosResult::value as a std::string on success. The method is synchronous.

### `network` {#network}

```cpp
StdLogosResult network()
```

Get the Logos network this node was configured for.

Returns StdLogosResult::value as a std::string on success. The method is synchronous.

### `peerId` {#peerId}

```cpp
StdLogosResult peerId()
```

Get the node’s peer ID.

The peer ID is the libp2p peer identity as described at [https://docs.libp2p.io/concepts/fundamentals/peers/](https://docs.libp2p.io/concepts/fundamentals/peers/)

Returns StdLogosResult::value as a std::string on success. The method is synchronous.

### `spr` {#spr}

```cpp
StdLogosResult spr()
```

Get the node’s Signed Peer Record (SPR).

Returns StdLogosResult::value as a std::string on success. The method is synchronous.

### `debug` {#debug}

```cpp
StdLogosResult debug()
```

Get debug information for the node.

Returns StdLogosResult::value as a JSON object on success:

```json
{
  "id": string,
  "addrs": [string],
  "spr": string,
  "table": {
    "localNode": { "peerId": string, "addresses": [string],
                   "lastSeen": null },
    "nodes": [{ "peerId": string, "addresses": [string],
                "lastSeen": int }]
  }
}
```

The method is synchronous.

### `collectMetrics` {#collectMetrics}

```cpp
LogosMap collectMetrics()
```

Collect node metrics for the openmetrics module.

Implements the openmetrics-module IMetricsSource interface. Returns a Logos openmetrics-compatible JSON object. On libstorage errors or invalid payloads, returns: { “metrics”: \[\] }.

```json
{
  "metrics": [
    {
      "name": string,
      "type": string,
      "help": string,
      "value": number,
      "labels": object
    }
  ]
}
```

The method is synchronous.

### `updateLogLevel` {#updateLogLevel}

```cpp
StdLogosResult updateLogLevel(const std::string &logLevel)
```

Set the log level at runtime.

`logLevel` must be one of: TRACE, DEBUG, INFO, NOTICE, WARN, ERROR, FATAL

Returns StdLogosResult::success = true on success. The method is synchronous.

### `connect` {#connect}

```cpp
StdLogosResult connect(const std::string &peerId, const std::vector<std::string> &peerAddresses)
```

Connect to a peer.

Uses `peerAddresses` as explicit dial targets when provided; otherwise the peer must be discoverable via the DHT using `peerId`.

Returns a StdLogosResult indicating whether the connect command was sent; actual completion is signalled via the `storageConnect` event.

The method is asynchronous.

### `uploadUrl` {#uploadUrl}

```cpp
StdLogosResult uploadUrl(const std::string &filePath, int64_t chunkSize, bool advertise)
```

Upload a local file by absolute path.

Internally calls storage\_upload\_init followed by storage\_upload\_file. If init succeeds but the file upload command fails, the session is cancelled automatically.

`filePath` – absolute path to the file on disk. `chunkSize` – upload chunk size in bytes (default 65536). `advertise` – if false, neither announce the dataset to the DHT nor serve it to peers.

Returns StdLogosResult::value as a session ID string on success.

The method is asynchronous; progress is signalled via the `storageUploadProgress` event (throttled to at most one event per % point) and completion via the `storageUploadDone` event.

### `uploadInit` {#uploadInit}

```cpp
StdLogosResult uploadInit(const std::string &filename, int64_t chunkSize, bool advertise)
```

Create a manual upload session for chunk-by-chunk streaming.

Use this only when [uploadUrl()](#uploadUrl) cannot be used (e.g. you are streaming data that is not on disk). After creating a session, send all chunks with [uploadChunk()](#uploadChunk), then call [uploadFinalize()](#uploadFinalize) to get the CID.

`filename` – used to populate manifest metadata (mimetype, name). `chunkSize` – upload chunk size in bytes (default 65536). `advertise` – if false, neither announce the dataset to the DHT nor serve it to peers.

Returns StdLogosResult::value as the session ID string on success. The method is synchronous.

### `uploadChunk` {#uploadChunk}

```cpp
StdLogosResult uploadChunk(const std::string &sessionId, const std::string &chunk)
```

Upload a single data chunk for a session created with [uploadInit()](#uploadInit).

A failed chunk does not corrupt the session; the caller may retry or call [uploadCancel()](#uploadCancel).

Emits the `storageUploadProgress` event on completion.

The method is asynchronous.

### `uploadFinalize` {#uploadFinalize}

```cpp
StdLogosResult uploadFinalize(const std::string &sessionId)
```

Finalize a manual upload session and retrieve the CID.

Must be called after all chunks have been sent with [uploadChunk()](#uploadChunk).

Returns StdLogosResult::value as the CID string on success. The method is synchronous.

### `uploadCancel` {#uploadCancel}

```cpp
StdLogosResult uploadCancel(const std::string &sessionId)
```

Cancel an ongoing upload session.

Returns StdLogosResult::success = true on success. The method is synchronous.

### `downloadToUrl` {#downloadToUrl}

```cpp
StdLogosResult downloadToUrl(const std::string &cid, const std::string &filePath, bool local, int64_t chunkSize, bool isPrivate, bool advertise)
```

Download content by CID and write it to a local file.

Internally fetches the manifest first to obtain the total size (required for progress throttling); returns an error if the manifest is unavailable.

`cid` – content identifier to download. `filePath` – destination path on disk. `local` – if true, only reads from locally cached data (no network). `chunkSize` – download chunk size in bytes (default 65536). `isPrivate` – if true, tunnels the download over Mix. Complete privacy also requires setting `advertise=false`. `advertise` – if false, neither announce the dataset to the DHT nor serve it to peers.

Returns StdLogosResult::value as the session ID (= CID) on success.

The method is asynchronous; progress is signalled via the `storageDownloadProgress` event (throttled to at most one event per % point) and completion via the `storageDownloadDone` event.

### `downloadChunks` {#downloadChunks}

```cpp
StdLogosResult downloadChunks(const std::string &cid, bool local, int64_t chunkSize, bool isPrivate, bool advertise)
```

Download content by CID and deliver it as a stream of base64-encoded chunks.

Use this when you want to process or forward the data without writing it to disk. For large files, [downloadToUrl()](#downloadToUrl) is more efficient as it avoids the base64 encoding overhead.

`cid` – content identifier to download. `local` – if true, only reads from locally cached data (no network). `chunkSize` – download chunk size in bytes (default 65536). `isPrivate` – if true, tunnels the download over Mix. Complete privacy also requires setting `advertise=false`. Returns StdLogosResult::value as the session ID (= CID) on success.

The method is asynchronous; each chunk is delivered via the `storageDownloadProgress` event (one event per chunk, not throttled) and completion via the `storageDownloadDone` event.

### `downloadCancel` {#downloadCancel}

```cpp
StdLogosResult downloadCancel(const std::string &sessionId)
```

Cancel an ongoing download session.

Returns StdLogosResult::success = true on success. The method is synchronous.

### `exists` {#exists}

```cpp
StdLogosResult exists(const std::string &cid)
```

Check whether content identified by CID exists in local storage.

Returns StdLogosResult::value as bool (true = exists) on success. The method is synchronous.

### `fetch` {#fetch}

```cpp
StdLogosResult fetch(const std::string &cid, bool isPrivate, bool advertise)
```

Fetch content from the network and cache it locally in the background.

The method returns as soon as the fetch request is accepted; no event is emitted when the background download completes.

Returns StdLogosResult::success = true if the request was accepted. The method is synchronous.

`isPrivate` – if true, tunnels the download over Mix. Complete privacy also requires setting `advertise=false`. `advertise` – if false, neither announce the dataset to the DHT nor serve it to peers.

### `getAdvertise` {#getAdvertise}

```cpp
StdLogosResult getAdvertise(const std::string &cid)
```

Check whether the dataset is announced to the DHT and served to peers. Returns StdLogosResult::value as a bool on success. The method is synchronous.

### `setAdvertise` {#setAdvertise}

```cpp
StdLogosResult setAdvertise(const std::string &cid, bool advertise)
```

Enable or disable DHT announcements and serving to peers for a dataset. Published DHT records are not withdrawn; they stop being republished and expire. Returns StdLogosResult::success = true on success. The method is synchronous.

### `remove` {#remove}

```cpp
StdLogosResult remove(const std::string &cid)
```

Remove content identified by CID from local storage in the background.

The delete may touch the network and can take a while, so this method does not block: the returned StdLogosResult only reports whether the command was dispatched. The real outcome arrives later via the `storageRemoveDone` event.

### `space` {#space}

```cpp
StdLogosResult space()
```

Get storage space information.

Returns StdLogosResult::value as a JSON object on success:

```json
{
  "totalBlocks":        number,
  "quotaMaxBytes":      number,
  "quotaUsedBytes":     number,
  "quotaReservedBytes": number
}
```

The method is synchronous.

### `manifests` {#manifests}

```cpp
StdLogosResult manifests()
```

List all manifests stored locally.

Returns StdLogosResult::value as a JSON array on success; each item:

```json
{
  "cid":         string,
  "treeCid":     string,
  "datasetSize": number,
  "blockSize":   number,
  "filename":    string,
  "mimetype":    string
}
```

The method is synchronous.

### `downloadManifest` {#downloadManifest}

```cpp
StdLogosResult downloadManifest(const std::string &cid, bool isPrivate, bool advertise)
```

Fetch the manifest for a given CID in the background.

The lookup may query the DHT and can take a long time, so this method does not block: the returned StdLogosResult only reports whether the command was dispatched. The real outcome arrives later via the `storageDownloadManifestDone` event.

`isPrivate` – if true, tunnels the download over Mix. Complete privacy also requires setting `advertise=false`, and running the remainder of the download with `isPrivate` set to `true`. `advertise` – if false, neither announce the manifest to the DHT nor serve it to peers.

### `importFiles` {#importFiles}

```cpp
void importFiles(const std::string &path)
```

Import all files from a directory (headless helper).

Iterates regular files in `path` and calls [uploadUrl()](#uploadUrl) with advertisements enabled for each. Does not wait for uploads to complete; listen for `storageUploadDone` events to track results.
