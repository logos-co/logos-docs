---
title: Send anonymous messages with the Logos Chat app over the mix network
doc_type: procedure
product: messaging
topics: [messaging, mixnet]
steps_layout: sectioned
authors: Ivansete-status, kashepavadan
owner: logos
doc_version: 1
slug: send-anonymous-messages-logos-chat-over-mix
sidebar_position: 2.7
---

# Send anonymous messages with the Logos Chat app over the mix network

#### Route every 1:1 and group chat message through the mix network by creating the delivery node from the Delivery Demo app before opening Logos Chat.

:::info
**Permissions**: No special permissions required.

**Product**: Logos Basecamp, Logos Chat app, and Delivery Demo app.
:::

:::tip[Version]
This document is accurate for **Testnet v0.3.0**.
:::

This procedure shows how to use the [Logos Chat](../../get-started/glossary.md#logos-chat) app in Logos [Basecamp](../../get-started/glossary.md#basecamp) so that every message it sends is onion-routed over the [mix](../../get-started/glossary.md#mix) network. The anonymity comes from the Messaging API, not from a separate demo client: you create the [Logos Delivery](../../get-started/glossary.md#logos-delivery) node from the Delivery Demo app with `anonymityLevel` set to `Required`, and the Chat app adopts that node instead of creating its own. Use this procedure to try sender-anonymous messaging from a GUI, with no code.

A conversation needs two parties, and one Basecamp instance hosts one delivery node, so you run two Basecamp instances, **A** and **B**. Steps marked **in each instance** are done twice.

Mix protects only the send path. Each message travels three hops before an exit node publishes it, so expect higher latency than a direct send.

:::info[Prerequisites]

- A supported OS:
   - Linux x86_64 or aarch64 (AppImage)
   - macOS aarch64 (DMG)
   - Windows is not supported: the catalogue's chat and delivery packages publish no Windows variant.
- Two Basecamp instances, either on two machines or on one machine with separate user directories, as described in [Step 1](#step-1-start-two-basecamp-instances)
- Outbound access to the `logos.test` network on TCP `30303`, and HTTPS access to the key-package registry at `https://devnet.chat-kc.logos.co`

:::

## What to expect

- You can exchange 1:1 and group chat messages in the Logos Chat app with every send routed over the mix network.
- You can create a mix-enabled delivery node from the Delivery Demo app that the Chat app then adopts.
- You can run two Basecamp instances on one machine, each with its own delivery node and data directory.

## Step 1: Start two Basecamp instances

If you are running A and B on two separate machines, do the first action on each machine and skip the second.

1. [Install](../../basecamp/install-logos-basecamp.md) Logos Basecamp 0.3.0 or later from `github.com/logos-co/logos-basecamp/releases/latest`, then launch it. This is instance A, on the default data directory.
1. Start instance B against its own data directory:

   ```bash
   basecamp --user-dir ~/logos-basecamp-b
   ```

   - You can set the `LOGOS_USER_DIR` environment variable instead of passing `--user-dir`.

   **Expected result:** a second Basecamp window opens, with its own plugins, modules, module data, and logs.

## Step 2: Install the Delivery Demo and Chat apps

**In each instance:**

1. In the left bar, select **Package Manager** and browse the online [catalogue](../../get-started/glossary.md#catalogue).
1. Install the **Delivery Demo** [package](../../get-started/glossary.md#package) (`logos_delivery_demo`).
1. Install the **Chat** package (`chat_ui`).

   **Expected result:** both apps appear on that instance's app grid.

## Step 3: Create a mix-enabled delivery node

Open Delivery Demo before Chat. If Chat starts first, it creates the delivery node itself with its own defaults and no anonymity, and the anonymity level of a node can't be changed once it is created.

**In each instance:**

1. Open the **Delivery Demo** app.
1. In the `createNode` panel, set these values:

   | Field | Value |
   |:------|:------|
   | `preset` | `logos.test` |
   | `mode` | `Core` |
   | `anonymityLevel` | `Required` |

   - `Required` routes every send over mix and never falls back to a direct send. `Preferred` falls back when no mix path is available, and `None` (the default) doesn't use mix at all.
1. Click **Call** to create the node.
1. Wait for the status badge to show `Connected`.

   - With `anonymityLevel` set to `Required`, this takes longer than usual: the node needs a pool of at least four mix nodes plus a member that serves [light push](../../get-started/glossary.md#light-push) as the exit.

## Step 4: Open Logos Chat

**In each instance:**

1. Open the **Chat** app.

   **Expected result:** the account card reaches **Online** within 5 to 20 seconds.

## Step 5: Send and receive messages

1. Start a 1:1 conversation between A and B and exchange messages, as described in [Send 1:1 messages with the Logos Chat app](./send-1-1-messages-logos-chat.md#step-2-start-a-conversation). You can also create a group conversation from **New chat**.
1. In instance B, send a message in the conversation.

   **Expected result:** the message appears in A's thread within a few seconds to a minute of leaving B, while Delivery Demo in both instances shows a node created with `anonymityLevel` set to `Required`.

## Troubleshooting Logos Chat over mix

### Chat shows an error instead of Online, and nothing sends

A Chat module older than v0.3.0 cannot adopt a node that another app created. Install Chat v0.3.0 or later from **Package Manager**.

### Messages flow, but nothing was routed over mix

Chat was opened before Delivery Demo, so Chat created the node itself with its own defaults and no anonymity. Restart Basecamp, open Delivery Demo first and create the node as in [Step 3](#step-3-create-a-mix-enabled-delivery-node), then open Chat.

### The status badge takes a long time to show `Connected`

With `anonymityLevel` set to `Required`, the node needs a mix pool of at least four mix nodes plus an exit that serves light push. Until it finds them, the connection status reports `Disconnected`. Wait for the pool to fill.

### Launching Basecamp again brings the first window forward instead of opening a second one

Basecamp allows one instance per data directory. Without `--user-dir`, the second launch brings instance A forward and exits, printing `Basecamp is already running for <dir>` on stderr. Start the second instance with `--user-dir <path>` as in [Step 1](#step-1-start-two-basecamp-instances).
