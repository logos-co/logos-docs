---
title: Install Logos Basecamp
doc_type: procedure
product: core
topics: core
steps_layout: flat
authors: iurimatias, cheny0
owner: logos
doc_version: 1
slug: install-logos-basecamp
sidebar_position: 1
---

import YouTube from '@site/src/components/YouTube';

# Install Logos Basecamp

#### Get Logos Basecamp running on your desktop.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

Logos [Basecamp](../get-started/glossary.md#basecamp) is the desktop shell for Logos. You can discover, install, and run Logos [modules](../get-started/glossary.md#module) and apps using its graphical interface as an alternative to the command line.

You can install Logos Basecamp in two ways:

| Method | When to use it | Tooling required |
|:--|:--|:--|
| [Prebuilt release (AppImage, DMG or Windows installer)](#install-from-a-prebuilt-release) | End users | None |
| [Build from source with Nix](#build-and-run-logos-basecamp-from-source) | Contributors, custom builds, unsupported platforms | Nix with flakes enabled |

:::info[Prerequisites]

- A supported OS:
    - Linux x86_64 or aarch64 (tested on Ubuntu 22.04+)
    - macOS aarch64 (recent versions)
    - Windows 10 or 11 x86_64 (native installer; see [apps available on Windows](#apps-available-on-windows))
    - WSL2 Ubuntu on Windows 11 (or Windows 10 21H2+ with WSLg for GUI support) is also supported
- 4 GB RAM minimum (8 GB recommended) and ~2 GB free disk space.
- For the source build only: **Nix** with flakes enabled.
    - Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

    ```bash
    mkdir -p ~/.config/nix
    echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
    ```
:::

:::tip
This tutorial is also available in video form:
<YouTube id="SZ72xolkZz4" title="Installing Logos Basecamp" />
:::

## Install from a prebuilt release

1. Go to the [latest release page](https://github.com/logos-co/logos-basecamp/releases/latest) and download the artifact for your OS:
    - Linux, WSL: the `AppImage` files
    - macOS: the `.dmg` files
    - Windows: the `-windows-setup.exe` file

1. Depending on your OS, install and launch Basecamp as follows:

- On macOS, open the `.dmg` file and drag the Basecamp app inside it into `/Applications`. Then launch Basecamp from `/Applications`.
- On Linux and WSL, install some prerequisites, then grant execute permission to the downloaded AppImage and launch it:

    ```bash
    # install rerequisites
    sudo apt-get install -y libfuse2t64 libegl1 libopengl0
    # On Ubuntu 22.04 and earlier, use libfuse2 instead of libfuse2t64

    chmod +x LogosBasecamp-Desktop-*.AppImage
    ./LogosBasecamp-Desktop-*-x86_64.AppImage  # or ./LogosBasecamp-Desktop-*-aarch64.AppImage
    ```

    The file name carries the release version and commit, for example `LogosBasecamp-Desktop-v0.3.1-aeb819-x86_64.AppImage`. If you have downloaded more than one release, run the file name in full.

- On Windows, run the downloaded `LogosBasecamp-Desktop-*-x86_64-windows-setup.exe`. It doesn't need administrator rights.
    - The installer is not code-signed yet, so Microsoft Defender SmartScreen may show **Windows protected your PC**. Click **More info**, then **Run anyway**.
    - Choose **Install (recommended)** to install for your user under `%LOCALAPPDATA%\Programs\Logos Basecamp`, with a Start menu entry, an optional desktop shortcut, and an uninstaller in **Settings > Apps**. Choose **Portable (extract only)** to only extract the files to a folder of your choice.
    - Launch **Logos Basecamp** from the Start menu, or run `bin\LogosBasecamp.exe` from the portable folder.

### Apps available on Windows

Not every module in the catalogue has a Windows build yet. Of the apps covered in these docs, these run on native Windows:

- **Chat**: the `chat_ui`, `chat_module`, and `delivery_module` packages. See [Send 1:1 messages with the Logos Chat app](../messaging/get-started/send-1-1-messages-logos-chat.md).
- **Storage**: the `storage_ui` and `storage_module` packages. See [Set up and use the Logos Storage UI](../storage/get-started/set-up-and-use-logos-storage-ui.md).

For other apps, such as the blockchain node or the swap app, run the Linux AppImage under WSL2.

## Build and run Logos Basecamp from source

1. Clone the repository and enter it:

    ```bash
    git clone https://github.com/logos-co/logos-basecamp.git
    cd logos-basecamp
    ```

1. Build Basecamp with Nix flake:

    ```bash
    nix build '.#bin-appimage'
    ```

1. Run the resulting binary:

    ```bash
    ./result/logos-basecamp.AppImage
    ```

## Troubleshooting Basecamp

### Experimental Nix feature 'nix-command' when building the AppImage
The following error might appear while building the AppImage:

```text
error: experimental Nix feature 'nix-command' is disabled; add '--extra-experimental-features nix-command' to enable it
```

in which case the command should be changed to enable flakes:

```bash
nix build --extra-experimental-features 'nix-command flakes' '.#bin-appimage'
```

### I see an `error while loading shared libraries` error when trying to launch the AppImage on Linux?
The AppImage relies on a few graphics and font libraries from your system. On a minimal Ubuntu install, such as WSL or a server image, some of them may be missing, for example `libEGL.so.1`, `libOpenGL.so.0`, or `libharfbuzz.so.0`. Install them with:

```bash
sudo apt-get install -y libfuse2t64 libegl1 libopengl0 libharfbuzz0b
# On Ubuntu 22.04 and earlier, use libfuse2 instead of libfuse2t64
```

Don't install the `fuse` package on Ubuntu 22.04 or later. It replaces `fuse3`, which other system packages depend on.