---
title: Send anonymised messages over the mix network
doc_type: procedure
product: messaging
topics: [chat, mix]
steps_layout: flat
authors: chaitanyaprem, kashepavadan
owner: logos
doc_version: 1
slug: send-anonymised-messages-over-the-mix-network
---

# Send anonymised messages over the mix network

#### Get started sending and receiving messages with sender anonymity using the Logos Chat UI.

This procedure covers how to run the [`chat_ui_mix`](https://github.com/logos-co/logos-chat-ui/tree/feat/logos-testnetv02-mix) desktop app, connect to the testnet-0.2 mix fleet, and exchange messages between two instances with sender unlinkability. No configuration is required — the app ships with shared testnet credentials and discovers the fleet automatically.

Before you start, make sure you have the following:

- macOS or Linux
- [Nix](https://nixos.org/download) with flakes enabled — add `experimental-features = nix-command flakes` to `~/.config/nix/nix.conf` (create it if needed)
- Outbound TCP access to the fleet on port `30304`

## What to expect

- You can connect to the testnet-0.2 mix fleet and watch the status bar reach **MIX 5/4**, which confirms the mix node pool is ready for anonymous sends.
- You can exchange intro bundles between two instances and send messages that are routed sender-unlinkably through the 3-hop mixnet.
- You can confirm end-to-end delivery by matching the sender's `Message sent via mix successfully` log with the recipient's `ChatBackend: New message: …` log.

## Start the first instance and connect to the mix fleet

The mix chat app can be found in the `logos-chat-ui` repository.

1. Clone the repository and check out the `feat/logos-testnetv02-mix` branch:

   ```sh
   git clone https://github.com/logos-co/logos-chat-ui.git
   cd logos-chat-ui
   git checkout feat/logos-testnetv02-mix
   ```

1. Start the app:

   ```sh
   nix run --accept-flake-config
   ```

   {% hint style="info" %}
   The first build pulls the full dependency chain through Nix and takes approximately 15–20 minutes. Subsequent launches use the cache and start in seconds.
   {% endhint %}

1. In the startup popup, pick a demo user (1–10) and click **Start**.

   - The app loads the bundled testnet credentials and begins discovering the fleet mix nodes via libp2p Kademlia service discovery.

1. Wait for the mix pool to reach the minimum. Check the status bar and console for the following:

   - Status bar shows `Connected`, `MIX: ENABLED`, and `USER: <n>` immediately after launch. Console shows `Kademlia mix discovery mounted` and `Connected to static peers`.
   - Over the next 1–2 minutes the mix pool fills. Status bar moves from `MIX 0/4` toward **`MIX 5/4`** (pool size 5 / minimum 4). Console shows `Waiting for mix node pool` then **`Mix node pool ready  poolSize=5`**.
   - The send box remains disabled until the pool reaches the minimum.

## Start a second instance and exchange messages

Run the second instance in its own folder with a different demo user and port to avoid credential collisions and RLN rate-limit conflicts.

{% hint style="warning" %}
Never run two instances in the same working directory. The app stages credential files (`rln_membership.json`, `rln_tree.db`, and others) into the current folder; two instances sharing the same folder race on identity. If a previous launch left orphaned processes behind, run `pkill -9 -f logos_host_qt` before starting a new instance.
{% endhint %}

1. In a new terminal, create a separate working directory for the second instance and start it:

   ```sh
   mkdir ../chat2 && cd ../chat2 # ../ steps out of the logos-chat-ui clone
   CHAT_DEMO_USER=2 CHAT_PORT=62002 nix run ../logos-chat-ui --accept-flake-config
   ```

   - `CHAT_DEMO_USER` pre-selects a different demo user (use any index other than the one chosen in the first instance).
   - `CHAT_PORT` sets the libp2p listen port to avoid a port conflict with the first instance (`0` selects a random port).
   - Wait for this instance's status bar to also reach **`MIX 5/4`** before sending.

1. Exchange intro bundles between the two instances:

   - In one instance, click **My Bundle** and copy the displayed bundle.
   - In the other instance, click **+ new**, paste the bundle and enter a first message, then click **create**.

1. Send a message from one instance and confirm it arrives in the other:

   - **Sender console:** `Sending via mix (lightpushPublish)` → **`Message sent via mix successfully`**
   - **Recipient console:** `ChatBackend: New message: …`
   - The message appears in the recipient's conversation within approximately 1–2 seconds.
   - A `Mix lightpush: no SURB reply within 60s` warning in the sender console is benign — delivery uses the forward path, which is independent of the SURB reply.

1. Confirm the final status bar state on both instances:

   - Status bar reads **`MIX 5/4`** and **`Connected`**.

## Troubleshooting mix chat

### Why does the app fail to launch after a previous run?

A previous instance was killed while `logos_host_qt` child processes were still running. These orphaned processes block the next launch. Run `pkill -9 -f logos_host_qt` to clear them, then try again.

### Why does the mix pool stay at `MIX 0/4` or fill slowly?

The pool takes 1–2 minutes to fill on first launch. Wait and watch the status bar. If the pool does not reach **`MIX 5/4`** after several minutes, the fleet may be temporarily degraded — the mix fleet is a shared testnet of 5 nodes and connectivity depends on all of them being reachable.

### Why does the send succeed but the recipient never sees the message?

The app receives as a light client and must stay subscribed to a healthy fleet node. If fleet connectivity is degraded, the round-trip may not complete even though the send path works. Retry after confirming the pool is at **`MIX 5/4`** on both instances. If the problem persists, the fleet may be temporarily unavailable.

### Why do two instances on the same machine collide?

Either both instances share the same working directory, the same demo-user index, or both are listening on the same port. Run each instance in its own folder (`chat2`, and so on), use a different `CHAT_DEMO_USER` value for each, and set distinct `CHAT_PORT` values.
