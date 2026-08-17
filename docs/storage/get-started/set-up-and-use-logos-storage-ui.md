---
title: Set up and use the Logos Storage UI
doc_type: procedure
product: storage
topics: storage
steps_layout: sectioned
authors: gmega, kashepavadan, arnaud
owner: logos
doc_version: 1
slug: set-up-and-use-logos-storage-ui
sidebar_position: 2
---

# Set up and use the Logos Storage UI

#### Get started sharing and downloading files on the Logos Storage network

The [Logos Storage](../../get-started/glossary.md#logos-storage) UI is a file-sharing application built on top of the [Logos Storage Module](https://github.com/logos-co/logos-storage-module). This guide covers running the application (through Logos [Basecamp](../../get-started/glossary.md#basecamp) or by building it with Nix), configuring your node through the onboarding wizard, and using the UI to share, download, and delete files. It is intended for node operators running the application on Linux or macOS.

:::info[Prerequisites]

- A router where you can configure port forwarding or that supports UPnP/NAT-PMP ready (see [Connectivity](../concepts/connectivity.md)).
:::

## What to expect

- You can build and run a standalone Logos Storage UI application using a single `nix build` command.
- You can configure your node through the onboarding wizard, in guided or advanced mode, and reach a running node.
- You can share files with other nodes and download files shared by others using a Content Identifier ([CID](../../get-started/glossary.md#cid)).
- You can make content lookups private with the **Mix** switch, and stop and restart the node without losing your files.

## Step 1: Run the application

You can install the application through Logos Basecamp (Option A), or build it from source with Nix (Option B).

### Option A — Run in Logos Basecamp

1. Download and [install](../../basecamp/install-logos-basecamp.md) the latest release of Logos Basecamp.
1. In the left bar, select **Package Manager**.
1. Select `Storage` in `Categories` then click **Install**.
1. Wait until a green **Installed** label appears next to both [modules](../../get-started/glossary.md#module).
1. In the left bar, select **storage** to launch the Logos Storage UI.

### Option B — Build and run locally with Nix

The application is built using Nix flakes. The output includes the storage UI plugin and supporting binaries. You need:

- **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

  ```bash
  mkdir -p ~/.config/nix
  echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
  ```

  Verify: `nix flake --help >/dev/null 2>&1 && echo "Flakes enabled"`

- **Git**

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

1. Launch the application:

   ```bash
   nix run
   ```

   - To override a dependency with a local version, use `--override-input`. For example:

     ```bash
     nix run --override-input storage_module/logos-storage git+file:///somewhere/logos-storage-nim?submodules=1
     ```

:::info
The first build compiles the storage engine and can take a long time; subsequent builds use the Nix cache. To work on the code, `nix develop` opens a shell with all dependencies available.
:::

#### Build fails with HTTP 500 on BoringSSL fetch

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

## Step 2: Configure your node through onboarding

On first launch, the app opens the onboarding wizard and asks how you want to set up your node: **Guided** or **Advanced**.

The Guided option will use the default configuration and start the node automatically.
The Advanced option allows you to edit the configuration before starting the node.

This guide follows the `Guided` setup.

1. Select **Guided** and click **Continue**.

   ![Onboarding](../assets/set-up-and-use-logos-storage-ui/storage-ui-onboarding.png)

1. On the **Select Drives** step, choose the folder where downloaded files will be saved, then click **Continue**.

   ![Select Drives step with the downloads folder field](../assets/set-up-and-use-logos-storage-ui/storage-ui-select-drives.png)

1. Wait for the dashboard to open and the node status icon to be green.

   ![Storage UI dashboard with the node running](../assets/set-up-and-use-logos-storage-ui/storage-ui-dashboard.png)

   A red status dot means the node is not running.

   When you start the node, you will see a status `Unknown` with a grey dot blinking. This is the NAT status check, updated every minute.
   A grey dot means the reachability check has not been performed yet.
   A green dot means the node is reachable from the network and can upload and download content.
   An orange dot means the node is not reachable from the network but falls back to the relay network. The node can still upload and download content using a relay with other peers. The speed might be reduced unless both peers were able to create a direct connection (hole punching).

   See [Connectivity](../concepts/connectivity.md).

1. Clicking on the help icon on the right of the NAT status will give you more information about the node's reachability.

   ![NAT status](../assets/set-up-and-use-logos-storage-ui/storage-ui-nat.png)

:::warning 

The latest Logos Storage Module (v2.1.0) relies on AutoNAT servers, which are not deployed on the `logos.test` network yet. NAT detection will not work until they are.

In the meantime, you can point the node at other AutoNAT servers with a manual configuration:

1. Bootstrap nodes: 

```json
[
  "spr:CiUIAhIhA_30VxBSXq0xCjoMIlFKlnY7gBEQzHv0pRY5kHP17-pTEgIDARpICicAJQgCEiED_fRXEFJerTEKOgwiUUqWdjuAERDMe_SlFjmQc_Xv6lMQrJLE0wYaCgoIBM-a0SUGH5AaCwoJBM-a0SWRAh-aKkYwRAIgHGe5zrUfxBfg0bY-rf0WOaYkci1mvYnwmgMKeXRVo68CIHjJUGqlj5jwNklm_BuIdz5_kHpLYH4tfiADtZx3Xmnu",
  "spr:CiUIAhIhAo61xuA0H8l-DQs4pjcsXRgIK_VrDlW9br-ad6-EAUKTEgIDARpICicAJQgCEiECjrXG4DQfyX4NCzimNyxdGAgr9WsOVb1uv5p3r4QBQpMQrJLE0wYaCgoIBEDicIcGH5AaCwoJBEDicIeRAh-aKkcwRQIhAIpb9JvG6OiphjL9gb1awcrGX8f-_j_qRcYkce5U6moLAiBjBF_uAtD5G6m_E_-TVHA-yV0klnYmrtCeyzm18KE9DA",
  "spr:CiUIAhIhAlvt_ed7o68o2EjRMAOLxOaAjhfs4Xo1mSMj4zFmGjqJEgIDARpICicAJQgCEiECW-3953ujryjYSNEwA4vE5oCOF-zhejWZIyPjMWYaOokQrJLE0wYaCgoIBIZ6WPAGH5AaCwoJBIZ6WPCRAh-aKkcwRQIhAPR-rNdpKYHhVb-jW7rEFMvlILBgWn9TTCAPOhCxCSf9AiAa4yqBS1U-a1BfYKzFCQ86wh2LLTxtwLgXKekMmuHxsg",
  "spr:CiUIAhIhAskyX6nTawF8y_IBEFWYiRNnjQDl8zpO78ImQpb5cXOuEgIDARpICicAJQgCEiECyTJfqdNrAXzL8gEQVZiJE2eNAOXzOk7vwiZClvlxc64QrJLE0wYaCgoIBIbR-fEGH5AaCwoJBIbR-fGRAh-aKkYwRAIgdbClsN6hpvfQRFopGJPN9-1P6fmrbv6sN0LNwSDs8xICIG_NXwQVb8IiGB5qMuREF6p-SjCWSKTFllWZFBmJHYmW"
]
```

2. Mix relay pool:

```json
{
  "version": 1,
  "relays": [
    {
      "peerId": "16Uiu2HAmVkKbPiweAgwiqjWkhptDUApzEM2w7jEjpRWB3zpQe9ZU",
      "multiAddr": "/ip4/207.154.209.37/tcp/8080",
      "mixPubKey": "2922d84ffd5a2d0dc8206034390ec38972a64402188c265b92a2045d0559775a",
      "libp2pPubKey": "03fdf45710525ead310a3a0c22514a96763b801110cc7bf4a516399073f5efea53"
    },
    {
      "peerId": "16Uiu2HAm52kdvfTWTrkGhkvGQX8dp8FfRcaPc6UgTzLFHsSLVQCi",
      "multiAddr": "/ip4/64.226.112.135/tcp/8080",
      "mixPubKey": "d91c44f0aebb26a2d78f83d31c805ce478a86c7b35d9b44e10a8ae6f6c30ba00",
      "libp2pPubKey": "028eb5c6e0341fc97e0d0b38a6372c5d18082bf56b0e55bd6ebf9a77af84014293"
    },
    {
      "peerId": "16Uiu2HAm1cXZXgyw47PM7xL1FFiNVQuntihVevNFK5Fy18uZU62c",
      "multiAddr": "/ip4/134.122.88.240/tcp/8080",
      "mixPubKey": "7eccd26d9decc8c8f236788313f2d76247614a005ff85808b0e6b473e435514a",
      "libp2pPubKey": "025bedfde77ba3af28d848d130038bc4e6808e17ece17a35992323e331661a3a89"
    },
    {
      "peerId": "16Uiu2HAm8y4UgDx9L5FVBPPgpoA36sdydWkewuLVgM4rnvnMtg1T",
      "multiAddr": "/ip4/134.209.249.241/tcp/8080",
      "mixPubKey": "fdb59c1dc2eb066f697b69d58866579dfb50586b161e8c604becfe177c8eb147",
      "libp2pPubKey": "02c9325fa9d36b017ccbf2011055988913678d00e5f33a4eefc2264296f97173ae"
    }
  ]
}
```

3. DHT mix proxies: 

```json
[
  "spr:CiUIAhIhA_30VxBSXq0xCjoMIlFKlnY7gBEQzHv0pRY5kHP17-pTEgIDARo7CicAJQgCEiED_fRXEFJerTEKOgwiUUqWdjuAERDMe_SlFjmQc_Xv6lMQl4nE0wYaCgoIBM-a0SUGH5AqRjBEAiAqH3RfY85YEUtyqBcFzGvDdQ8vV3g6teXDzocPeCWWKgIgGHFpJyc2-wxEaDQ5a5kIKgNOKxXqtF35dCfDQTKvgjg",
  "spr:CiUIAhIhAo61xuA0H8l-DQs4pjcsXRgIK_VrDlW9br-ad6-EAUKTEgIDARo7CicAJQgCEiECjrXG4DQfyX4NCzimNyxdGAgr9WsOVb1uv5p3r4QBQpMQ0ZHE0wYaCgoIBEDicIcGH5AqRjBEAiAUDfpZJRvZ2QjNHZV3fRQ3Hz4NaMlf-reFir93l9JJJQIgYXzXn0Kuw1I5H4G9M2hrV0B7ufspkiTySJEXqbjc2TI",
  "spr:CiUIAhIhAlvt_ed7o68o2EjRMAOLxOaAjhfs4Xo1mSMj4zFmGjqJEgIDARo7CicAJQgCEiECW-3953ujryjYSNEwA4vE5oCOF-zhejWZIyPjMWYaOokQ0ZHE0wYaCgoIBIZ6WPAGH5AqRzBFAiEA0CDBW5lpQ1IHZvh17-0aHS0YBrLVRrYlHDNVNnzrxiACIHrxDmdsrDKM2gFnU67yGXq0ukUMLMyVoUv7NmMbAh1V",
  "spr:CiUIAhIhAskyX6nTawF8y_IBEFWYiRNnjQDl8zpO78ImQpb5cXOuEgIDARo7CicAJQgCEiECyTJfqdNrAXzL8gEQVZiJE2eNAOXzOk7vwiZClvlxc64Q0pHE0wYaCgoIBIbR-fEGH5AqRzBFAiEAovgkG6R4aF6vdwB2t8tI8S0BAHey8O6AgZr-RpfITxUCIDEV4e4P_Vhf8h_gHi4AyE5T-gDJWvsMnPhbGFITcOQm"
]
```

:::

### Configuration

After onboarding, the settings are saved to a file whose location depends on the OS. If you are running the UI inside the Basecamp application:

| OS    | Path                                                |
|:------|:-----------------------------------------------------|
| Linux | `~/.config/Logos/LogosBasecamp.conf`                  |
| macOS | `~/Library/Preferences/com.logos.LogosBasecamp.plist` |

If you are running the standalone app built with Nix:

| OS    | Path                                                  |
|:------|:------------------------------------------------------|
| Linux | `~/.config/Logos/LogosStandalone.conf`                 |
| macOS | `~/Library/Preferences/com.logos.LogosStandalone.plist` |

## Step 3: Share a file

1. In the **Upload** panel, click **browse**. A file selector opens.

1. Select the file you want to share and click **Open**. The file is uploaded to your node and sharing begins automatically.

1. When the upload completes, the file appears in the **Manifests** list at the bottom of the UI, with its CID, filename, mimetype, and size.

   ![Dashboard after an upload, with the file listed in the Manifests panel](../assets/set-up-and-use-logos-storage-ui/storage-ui-uploaded.png)

1. Click the copy icon next to the CID. Share this string with others so they can download the file.

## Step 4: Download a file

The manifest is the representation of a file on the network: it carries the metadata (filename, size, mimetype). To download a file, you first fetch its manifest by CID, then download the content itself.

1. Paste the file's CID into the **Fetch Manifest** panel and click **Fetch**. The manifest downloads from the network and an entry appears in the **Manifests** list.

1. In the manifest entry's **Actions** column, click the download icon.

1. Watch the download widget at the top: it shows progress in real time and reports **Complete** when the file has been written to the downloads folder you chose during onboarding.

   ![Dashboard after a download, with the download widget reporting Complete](../assets/set-up-and-use-logos-storage-ui/storage-ui-downloaded.png)

:::info
No CID at hand? Try downloading a public file: fetch `zDvZRwzkzrrYB6sS1rRpRLt4gBhc1pWoyTSjkfszfmj1seaYYLCZ`, the [Farewell to Westphalia book](https://logos.co/farewell-to-westphalia). It is available on the network the default configuration connects to.
:::

When the file is downloaded, the download icon will turn green indicating that the file exists in your downloads folder.

## Step 5: Make your lookups private with Mix

The **Mix** switch in the **Node** panel controls private queries. When enabled, the node forwards its content lookups over the Logos mix network, which makes them much harder to trace back to you. See [Mix](../concepts/mix.md) for how it works.

- The switch is on by default when your configuration includes the Mix options.
- Private queries can be slower and may fail more often than direct ones. When looking up content that is not sensitive, you can toggle the switch off — observers will then be able to link you to your queries.

:::warning

When using `nat:auto`, the node first needs to get a reachability status, `Reachable` or `Unreachable`, before it can make DHT queries. See [Connectivity](../concepts/connectivity.md) for details.

:::

## Step 6: Settings

In the top right section, the settings icon on the right of **Manage node** opens the settings popup.

![Settings 1](../assets/set-up-and-use-logos-storage-ui/storage-ui-settings-1.png)

![Settings 2](../assets/set-up-and-use-logos-storage-ui/storage-ui-settings-2.png)

The default configuration should be suitable for most users.

Some settings cannot be updated, such as the `Data directory` and `Mix enabled`.
Most of the editable settings will require a node restart to take effect. You should see a message indicating that on the bottom right:

> Unsaved changes - the node must restart to apply them.

After saving the changes, you will need to close the settings and click **Stop** then **Start** to restart the node.

:::info
The active configuration is saved to `${HOME}/.logos_storage/config.json`. This file should not be edited manually. The settings UI should be used to change the configuration instead. If your configuration is messed up, you can delete this file and restart the node to reset it to the default configuration.
:::

## Step 7: Debug

A debug popup is available on the top right section, next to the settings icon. You can also display it using the `Ctrl+D` keyboard shortcut.

![Debug](../assets/set-up-and-use-logos-storage-ui/storage-ui-debug.png)

While it seems to be oriented toward advanced users, it can be useful to check the node's reachability status and if the relay is running.

## Step 8: Manage the node lifecycle

1. To stop the node, click **Stop** in the **Node** panel. The status indicator turns grey, the node reports **Stopped**, and peer connections drop.

1. Click **Start** to bring the node back to **Running**.

   - Your files survive the restart: the node persists its data in the configured `data-dir`, so previously uploaded files reappear in the **Manifests** list.

1. To stop sharing a file, click the trash icon in the manifest entry's **Actions** column. The file leaves the list and the **Storage** panel returns to **0 B Utilized**: the blocks are actually removed from disk.

## Troubleshooting Logos Storage

Connectivity problems (no peers, unreachable node, downloads timing out) are covered in the [Troubleshooting](troubleshooting.md) and [Connectivity](../concepts/connectivity.md) pages.
