---
title: Build a CLI app with Logos Storage
doc_type: procedure
product: storage
topics: []
steps_layout: sectioned
authors:
owner: logos
doc_version: 1
slug: libstorage-tutorial
---

# Build a CLI app with Logos Storage

#### Get started building a CLI application that transfers files over the Logos Storage network.

This tutorial walks you through building a simple CLI application that uploads and downloads files over the Logos Storage network using the [Logos Storage Module API](https://logos-co.github.io/logos-storage-module/api_reference.html). It is intended for developers who are setting up a new application using the skeleton project and working through the module lifecycle for the first time.

The tutorial uses the [Logos Storage App Skeleton](https://github.com/logos-storage/logos-storage-app-skeleton), which provides a ready-made  entry point at `app_main` that uses the `LogosModules` object to access the API. The skeleton also provides a set of Qt-compatible synchronization utilities.

**Before you start**, make sure you have the following:

- Nix package manager
- Git

## What to expect

- You can initialize, start, and cleanly shut down the storage module within your application.
- You can upload a file to the network and receive a Content Identifier (CID) that uniquely identifies it.
- You can download a file from the network using a CID and a Signed Peer Record (SPR).

## Step 1: Build the skeleton app

Clone the skeleton repository and compile the binary so you have a working entry point before adding any storage logic.

1. Clone the skeleton repository:

   ```bash
   git clone https://github.com/logos-storage/logos-storage-app-skeleton.git
   cd logos-storage-app-skeleton
   ```

1. Build with Nix:

   ```bash
   nix build
   ```

1. Confirm the compiled binary is available at `./result/bin/storage-app`.

## Step 2: Initialize the module

Call `init()` with your configuration once at startup, passing a JSON configuration string. See the [API Reference]((https://logos-co.github.io/logos-storage-module/api_reference.html)) for all available options.

   ```cpp
   const QString jsonConfig = "{}";
   bool result = m_logos->storage_module.init(jsonConfig);
   ```

> **Caution**
>
> Do not call `init()` more than once per instance unless you call `destroy()` first.

## Step 3: Start the node

Subscribe to the `storageStart` event and call `start()` afterward, to be able to detect failures.

   ```cpp
   m_logos->storage_module.on("storageStart", [this](const QVariantList& data) {
       bool success = data[0].toBool();
       if (!success) {
           QString error = data[1].toString();
           // Handle error
       }
   });

   bool result = m_logos->storage_module.start();
   ```

## Step 4: Upload a file

The Storage Module allows for two upload approaches. Choose `uploadUrl` for straightforward cases. Use the streaming API when you need fine-grained control over how data is sent.

### Upload with `uploadUrl`

The simplest way to upload files is to subscribe to the upload events, then call `uploadUrl()` with the path to your file. The network returns a Content Identifier (CID) on success.

1. Subscribe to the `storageUploadDone` and `storageUploadProgress` events:

   ```cpp
   //m_logos is the LogosModules object, used for API calls
   m_logos->storage_module.on("storageUploadDone", [this](const QVariantList& data) {
       bool success = data[0].toBool();
       QString sessionId = data[1].toString();
       QString cidOrError = data[2].toString();

       if (success) {
           qDebug() << "Upload complete. CID:" << cidOrError;
       } else {
           qDebug() << "Upload failed:" << cidOrError;
       }
   });

   m_logos->storage_module.on("storageUploadProgress", [this](const QVariantList& data) {
       bool success = data[0].toBool();
       QString sessionId = data[1].toString();
       int bytes = data[2].toInt();
       qDebug() << "Uploaded" << bytes << "bytes";
   });
   ```

1. Call `uploadUrl()` with the local file path:

   ```cpp
   QUrl fileUrl = QUrl::fromLocalFile("/path/to/myfile");
   LogosResult result = m_logos->storage_module.uploadUrl(fileUrl);
   ```

### Upload with the streaming API

Use the streaming upload API for chunk-level control.

1. Initialize the session:
     ```cpp
     LogosResult result = m_logos->storage_module.uploadInit(filename);
     QString sessionId = result.getValue<QString>();
     ```

1. . Upload chunks:
     ```cpp
     QFile file(filepath);
     file.open(QIODevice::ReadOnly);
     int chunkSize = 1024 * 64;
     while (!file.atEnd()) {
         QByteArray chunk = file.read(chunkSize);
         result = m_logos->storage_module.uploadChunk(sessionId, chunk);
         if (!result.success) {
             // Handle error
             break;
         }
     }
     ```

1. Finalize
     ```cpp
     result = m_logos->storage_module.uploadFinalize(sessionId);
     if (result.success) {
         QString cid = result.getValue<QString>();
         qDebug() << "CID:" << cid;
     }
     ```

## Step 5: Download a file

To download content, you need the CID returned during upload and the Signed Peer Record (SPR) of a node that holds the content.

1. Subscribe to the `storageDownloadDone` and `storageDownloadProgress` events:

   ```cpp
   //m_logos is the LogosModules object, used for API calls
   m_logos->storage_module.on("storageDownloadDone", [this](const QVariantList& data) {
       bool success = data[0].toBool();
       QString message = data[1].toString();
       if (success) {
           qDebug() << "Download complete";
       } else {
           qDebug() << "Download failed:" << message;
       }
   });

   m_logos->storage_module.on("storageDownloadProgress", [this](const QVariantList& data) {
       bool success = data[0].toBool();
       QString sessionId = data[1].toString();
       int size = data[2].toInt();
       qDebug() << "Downloaded" << size << "bytes";
   });
   ```

1. Call `downloadToUrl()` with the CID and the local destination path:

   ```cpp
   QUrl destination = QUrl::fromLocalFile("/path/to/output");
   LogosResult result = m_logos->storage_module.downloadToUrl(cid, destination /*, local = false*/);
   ```

   - Set the `local` (third) parameter of `downloadToUrl` to `true` to retrieve only locally-cached data.
   - Leave `local` as `false` (default) to fetch from the network.

## Step 6: Stop and clean up

Always stop the node before destroying resources to avoid leaving sessions open. To do so, call `stop()` and wait for the `storageStop` event, then call `destroy()`:

   ```cpp
   LogosResult result = m_logos->storage_module.stop();
   // Wait for storageStop event...
   result = m_logos->storage_module.destroy();
   ```

## Frequently asked questions

### Can I run the storage module without a UI?

Yes. The storage module supports headless mode, which lets you run it from the command line:

```bash
./logos/bin/logoscore -m ./modules --load-modules storage_module \
  -c "storage_module.init(@config.json)" \
  -c "storage_module.start()" \
  -c "storage_module.importFiles(/path/to/files)"
```