---
title: Set up and use the Logos Storage UI
doc_type: procedure
product: storage
topics: storage
steps_layout: sectioned
authors: gmega, kashepavadan
owner: logos
doc_version: 1
slug: set-up-and-use-logos-storage-ui
---

# Set up and use the Logos Storage UI

#### Get started sharing and downloading files on the Logos Storage network

The Logos Storage UI is a file-sharing application built on top of the [Logos Storage Module](https://github.com/logos-co/logos-storage-module). This guide covers building the application with Nix, configuring your node's network connectivity, and using the UI to share, download, and delete files. It is intended for node operators running the application on Linux or macOS.

Before you start, have the following ready:

- **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

  ```bash
  mkdir -p ~/.config/nix
  echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
  ```

  Verify: `nix flake --help >/dev/null 2>&1 && echo "Flakes enabled"`
- Git with submodules support
- A router where you can configure port forwarding or that supports UPnP/NAT-PMP

## What to expect

- You can build and run a standalone Logos Storage UI application using a single `nix build` command.
- You can configure your node's network connectivity to make it reachable from the internet.
- You can share files with other nodes and download files shared by others using a Content Identifier (CID).

## Step 1: Build the application

The application is built using Nix flakes. The output includes the storage UI plugin and supporting binaries.

{% hint style="info" %}

If Nix flakes are not enabled globally, add `experimental-features = nix-command flakes` to `~/.config/nix/nix.conf`.

{% endhint %}

1. Clone the [`logos-storage-ui`](https://github.com/logos-co/logos-storage-ui) repository and enter the project directory:

   ```bash
   git clone --recurse-submodules https://github.com/logos-co/logos-storage-ui.git
   cd logos-storage-ui
   ```

1. Run the build command:

   ```bash
   nix build
   ```

1. Confirm the build succeeded by checking the `result/` directory for the following outputs on macOS (`.dylib` files are replaced with `.so` files on Linux):

   ```
   result/
   └── lib/
       ├── storage_ui_plugin.dylib           # Qt plugin (loaded by the app)
       └── storage_ui_replica_factory.dylib
   ```

1. Enter development shell (Optional)

   ```bash
   # Enter development shell with all dependencies
   nix develop
   ```

1. Launch the application:

   ```bash
   nix run
   ```

   - To override a dependency with a local version, use `--override-input`. For example:

     ```bash
     nix run --override-input storage_module/logos-storage git+file:///somewhere/logos-storage-nim?submodules=1
     ```

## Step 2: Configure network connectivity

Your node must be reachable from the internet. Choose the setup option that matches your network environment.

| Scenario | Setup option | Details |
|:---------|:-------------|:--------|
| Behind NAT with UPnP or NAT-PMP | `Guided` followed by `UPnP` | Logos Storage configures the network automatically. |
| Behind NAT, manual port forwarding available | `Guided` followed by `Port Forwarding` | Requires forwarding one TCP port (chosen during onboarding) and UDP `8090`. |
| Custom or complex network | `Advanced` | Displays a prepopulated configuration JSON you can edit manually. See the [API reference](https://logos-co.github.io/logos-storage-module/latest/api_reference.html). |

The active configuration is saved to `${HOME}/.logos_storage/config.json`. Change this file and restart the Storage Module to apply the changes.

The default settings are saved to `~/.config/Logos/LogosStorage.conf` on Linux, `~/Library/Preferences/Logos.LogosStorage.plist` on macOS, and `HKCU\Software\Logos\LogosStorage` (Registry) on Windows.

1. Launch the application and select the setup option that matches your network environment from the table above and click **Continue**.

1. Wait for the connectivity checker to confirm your node is reachable. A message reading "your node is up and reachable" confirms success.

   - If the node is unreachable, see [Troubleshooting Logos Storage](#troubleshooting-logos-storage) below.
   - You can choose to continue without connectivity, but you will only be able to download files from other nodes.

## Step 3: Share a file

1. In the UI, locate and click the upload panel. A file selector opens.

1. Select the file you want to share and click **Open**. The file is uploaded to your node and sharing begins automatically.

1. Copy the Content Identifier (CID) displayed in the upload panel — for example, `zDvZRwzm49ZJLzxheYtydzx6AcNVSrf69LriUWjPr1SNLVnaXfj2`. Share this string with others so they can download the file.

## Step 4: Download a file

1. Paste the file's CID into the **Fetch manifest** panel and click **Fetch**. The file's metadata downloads from the network and an entry appears in the **Manifests** list at the bottom of the UI.

1. Next to the manifest entry, click the **Download** icon. A file selector will open.

1. Choose a save location and click **Open**. The download progress widget will show progress in real-time.

## Step 5: Delete a file

To stop sharing a file, click the trash bin icon next to the manifest entry for that file. This removes the file from your node and stops sharing it.

## Troubleshooting Logos Storage

Logos Storage requires two open ports to function:

- **UDP (`8090` by default)** — used for discovery and DHT operations.
- **TCP (`8500` by default)** — used for data transfer and peer connections.

### Node has no peers

**Symptom:** The node starts successfully but never connects to any peer.

**Cause:** Discovery is unavailable, typically because another process is using UDP port `8090`.

**Fix:** Ensure no other process is using port `8090`, or change the default port in the advanced configuration JSON.

### UPnP is not working

**Symptom:** You selected the `UPnP` option during setup but the node remains unreachable.

**Cause:** Many routers have UPnP disabled by default.

**Fix:** Enable UPnP on your router, or switch to the manual `Port Forwarding` configuration.

### Manual port forwarding is configured but node is unreachable

**Symptom:** Both UDP and TCP ports are configured but the node is still unreachable.

**Cause:** The ports are not open on your router.

**Fix:** Enable port forwarding for UDP `8090` and your chosen TCP port on your router.

### Build fails with HTTP 500 on BoringSSL fetch

**Symptom:** The build fails with the following error:

```
error: Failed to fetch git repository https://boringssl.googlesource.com/boringssl : error: RPC failed; HTTP 500 curl 22 The requested URL returned error: 500
fatal: unable to write request to remote: Broken pipe
```

**Cause:** Git's HTTP request size limits are too low for large repositories.

**Fix:** Increase the limits and retry:

```bash
git config --global http.postBuffer 524288000
git config --global http.maxRequestBuffer 100M
```
