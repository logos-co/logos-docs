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
sidebar_position: 2
---

import YouTube from '@site/src/components/YouTube';

# Install and load a module in Logos Basecamp

#### Access features and functionalities through modules in Logos Basecamp.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

In Logos [Basecamp](../get-started/glossary.md#basecamp), you can install and load modules that provide features like chat, storage, or wallets from the online [catalogue](../get-started/glossary.md#catalogue) or local `.lgx` files.

There are two types of modules in Logos Basecamp. [Core modules](../get-started/glossary.md#core-module) are the headless background services that provide capabilities like messaging or storage, while [UI modules](../get-started/glossary.md#ui-module) are the visual front-ends users interact with. Both kinds of modules are packaged and distributed as [packages](../get-started/glossary.md#package).

:::info[Prerequisites]

- [Basecamp installed and running](./install-logos-basecamp.md).
- Internet access for online catalogue install.
- [An `.lgx` file](../core/build-modules/build-and-run-a-logos-core-module.md) for local install. Make sure that the archive contains a variant matching your platform.
:::

## What to expect

- You can install a [module](../get-started/glossary.md#module) from the online catalogue or from a local `.lgx` file.
- You can load or unload a module from **Settings**: core modules under **Module Inspector**, UI modules under **Apps Inspector**.
- You can read a loaded module's status, CPU, and memory in **Settings > Module Inspector**. **Apps Inspector** shows a UI module's status and version, without live resource usage.

:::tip
An introduction to modules in Logos Basecamp is available in video form:
<YouTube id="yZ_93uAAY9A" title="Understanding .lgx modules on Logos Basecamp" />
:::

## Step 1: Install the module package

When installing a module, Logos Basecamp extracts the variant for your platform into your user modules directory (core modules) or user plugins directory (UI modules).

### Install from the online catalogue

1. At the bottom of the sidebar, click **Package Manager** ![](./assets/install-and-load-a-module-in-logos-basecamp/package-manager-icon.png).
1. Browse and locate the module you want. Use the **Categories** and **Types** filters or the search box. The **Type** column shows `core` for core modules and `ui_qml` for UI modules. Click a row to open its **Details** panel on the right.
1. Click **INSTALL** on the module's row. An **Install Package?** dialogue opens and lists any dependency changes. Click **Install** to confirm.
1. Wait until the row's **Action** column reads `INSTALLED`. Core modules then appear in **Settings > Module Inspector**. UI modules appear in the sidebar and in **Settings > Apps Inspector**.

### Install from a local `.lgx` file

1. At the bottom of the sidebar, click **Package Manager** ![](./assets/install-and-load-a-module-in-logos-basecamp/package-manager-icon.png).
1. Click **Install Local Package**.
1. Select the `.lgx` file, click **Open**, then click **Install** in the **Install Package?** dialogue.
1. Core modules appear in **Settings > Module Inspector**. UI modules appear in the sidebar and in **Settings > Apps Inspector**.

## Step 2: Load the module

Loading a module turns an installed module into a running service you can actually use. Each loaded Logos module runs in its own `logos_host` process, so memory usage increases with the number of loaded modules.

1. At the bottom of the sidebar, click **Settings** ![](./assets/install-and-load-a-module-in-logos-basecamp/settings-icon.png), then click **Module Inspector**, or **Apps Inspector** for a UI module.
1. Find the module in the list. Its **Status** column reads `NOT LOADED`.
1. Click **Load** next to the module. The status changes to `LOADED` and the **CPU** and **Memory** columns start reporting.

To open a UI module, click its icon in the sidebar.

:::info
You can click **Unload** in **Settings > Module Inspector** or close the tab of a module to unload it. Unloading stops the module's host process but not its dependencies, which may still be in use by other modules or UI Apps.
:::

## Troubleshooting

### The installed module doesn't appear in Module Inspector or Apps Inspector

Confirm the module actually installed: check its status in **Package Manager**.

- If installing from the online catalogue: if a package's row shows **Not available** instead of **Install**, it has no build for your platform, build flavour, or architecture.
- If installing from a local `.lgx` file: Basecamp reports an error if the archive has no variant for your platform.

Either way, confirm the archive includes a variant matching your platform before reinstalling. If the package shows as installed in Package Manager but still doesn't appear in the relevant inspector, its manifest `type` may not match where you're looking—core modules only appear in Module Inspector, and UI modules (`ui_qml`) only appear in Apps Inspector.

### A QML-based UI App cannot reach the network

By design, QML UI Apps run inside a sandboxed QML engine with a deny-all QNetworkAccessManager and a URL interceptor that whitelists only the app's own directory. To make network calls, route them through a Logos Module, which runs in its own unsandboxed process. Use `logos.callModule("<module>", "<method>", [args])` from QML.
