---
title: Install and load a module in Logos Basecamp
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: iurimatias, cheny0
owner: logos
doc_version: 1
slug: install-and-load-a-module-in-logos-basecamp
---

# Install and load a module in Logos Basecamp

#### Access features and functionalities through modules in Logos Basecamp.

In Logos Basecamp, you can install and load modules that provide features like chat, storage, or wallets from the online catalog or local `.lgx` files.

There are two types of modules in Logos Basecamp. Core modules are the headless background services that provide capabilities like messaging or storage, while UI modules are the visual front-ends users interact with.

Before you start, make sure you have:

- Logos Basecamp [installed and running](./install-the-logos-basecamp-app.md).
- Internet access for online catalog install.
- [An `.lgx` file](./build-and-run-a-logos-core-module.md) for local install.

{% hint style="info" %}

The `.lgx` file's archive must contain a variant matching your platform. For example, `linux-x86_64`, `linux-aarch64`, `darwin-x86_64`, or `darwin-arm64`.

{% endhint %}

## What to expect

- You can install a module from the online catalog or from a local `.lgx` file.
- You can load or unload a module from the **Modules** view.
- You can read a loading module's status, CPU, and memory in the **Modules** view.

## Step 1: Install the module package

When installing a module, Logos Basecamp extracts the variant for your platform into your user modules directory (core modules) or user plugins directory (UI modules).

### Install from the online catalog

1. In the sidebar, click **Package Manager** <img src="../.gitbook/assets/install-and-load-a-module-in-logos-basecamp-package-manager-icon.png">.
1. Browse and locate the module you want. You can click the module to view more details in the content area below.
1. Select the module to install and click **Install**.
1. At the bottom of the sidebar, click the **Modules** <img src="../.gitbook/assets/install-and-load-a-module-in-logos-basecamp-modules-icon.png">. The newly installed module appears under **UI Modules** or **Core Modules** depending on its type.

### Install from a local `.lgx` file

1. At the bottom of the sidebar, click **Modules** <img src="../.gitbook/assets/install-and-load-a-module-in-logos-basecamp-modules-icon.png">.
1. Click **Install LGX Package**.
1. Select the `.lgx` file and confirm.
1. The newly installed module appears under **UI Modules** or **Core Modules** depending on its type.

## Step 2: Load the module

Loading a module turns an installed module into a running service you can actually use. Each loaded Logos module runs in its own `logos_host` process, so memory usage increases with the number of loaded modules.

1. At the bottom of the sidebar, click **Modules** <img src="../.gitbook/assets/install-and-load-a-module-in-logos-basecamp-modules-icon.png">.
1. Find the module to load under **UI Modules** or **Core Modules** depending on its type.
1. Click **Load** next to the module.

{% hint style="info" %}

You can click **Unload** in the Modules view or close the tab of a module to unload it. Unloading stops the module's host process but not its dependencies, which may still be in use by other modules or UI Apps.

{% endhint %}

## Troubleshooting

### The installed module doesn't appear in the Modules view

The `.lgx` file probably does not contain a variant for your platform, or it was copied to a directory that Logos Basecamp doesn't scan. Confirm the archive includes a variant matching your platform (`linux-x86_64`, `linux-aarch64`, `darwin-x86_64`, or `darwin-arm64`), then reinstall using **Install LGX Package** in the **Modules** view rather than copying files manually so the package manager copies the files to the correct user modules directory.

### A QML-based UI App cannot reach the network

By design, QML UI Apps run inside a sandboxed QML engine with a deny-all QNetworkAccessManager and a URL interceptor that whitelists only the app's own directory. To make network calls, route them through a Logos Module, which runs in its own unsandboxed process. Use `logos.callModule("<module>", "<method>", [args])` from QML.
