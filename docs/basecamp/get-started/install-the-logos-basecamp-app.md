---
title: Install the Logos Basecamp app
doc_type: procedure
product: core
topics: core
steps_layout: flat
authors: iurimatias, cheny0
owner: logos
doc_version: 1
slug: install-the-logos-basecamp-app
---

# Install the Logos Basecamp app

#### Get Logos Basecamp running on your desktop.

{% hint style="info" %}

- **Permissions**: No special permissions required.
- **Product**: Logos Basecamp.

{% endhint %}

Logos Basecamp is the desktop shell for the Logos platform. You can discover, install, and run Logos modules and apps using its graphical interface as an alternative to the command line.

You can install Logos Basecamp in two ways:

| Method | When to use it | Tooling required |
|:--|:--|:--|
| [Prebuilt release (AppImage or DMG)](#install-from-a-prebuilt-release) | End users | None |
| [Build from source with Nix](#build-and-run-logos-basecamp-from-source) | Contributors, custom builds, unsupported platforms | Nix with flakes enabled |

{% hint style="info" %}

To enable flakes in nix, add `experimental-features = nix-command flakes` to `/etc/nix/config`.

{% endhint %}

Before you start, make sure you have the following:

- Internet access.
- A supported OS: Linux x86_64 or aarch64 (tested on Ubuntu 22.04+), or macOS aarch64 (recent versions).
- 4 GB RAM minimum (8 GB recommended) and ~2 GB free disk space.
- For the source build only: [Nix](https://github.com/NixOS/nix-installer) installed with flakes enabled.

{% hint style="info" %}

Internet access is required to download the binary or clone the repository, but not to launch Logos Basecamp afterward. Logos Basecamp itself opens no inbound ports. 

{% endhint %}

## Install from a prebuilt release

1. Go to the [latest release page](https://github.com/logos-co/logos-basecamp/releases/latest) and download the artifact for your OS:
    - Linux: the `AppImage` files
    - macOS: the `.dmg` files

1. Depending on your OS, install and launch the app as follows:

- On macOS, drag the `.dmg` file into `/Applications`. Then launch the app from `/Applications`.
- On Linux, grant execute permission to the downloaded AppImage and launch it:

    ```bash
    chmod +x logos-basecamp-*.AppImage
    ./logos-basecamp-x86_64.AppImage  # or logos-basecamp-aarch64.AppImage
    ```

## Build and run Logos Basecamp from source

1. Clone the repository and enter it:

    ```bash
    git clone https://github.com/logos-co/logos-basecamp.git
    cd logos-basecamp
    ```

1. Build the app with the Nix flake:

    ```bash
    nix build '.#app'
    ```

1. Run the resulting binary:

    ```bash
    ./result/bin/LogosBasecamp
    ```

## Troubleshooting the Basecamp app

### I see an `libEGL.so.1 / libOpenGL.so.0 missing` error when trying to launch the AppImage on Linux?
Try running the following command:

```bash
sudo apt-get install -y fuse libegl1 libopengl0
```