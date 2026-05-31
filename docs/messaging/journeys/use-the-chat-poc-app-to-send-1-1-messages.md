# Use the Chat PoC App to send 1:1 messages

> [!NOTE]
>
> The Chat PoC App is a small demo that exercises the abilities of `logos-chat-module` — not an official Logos product. This page is a quickstart for building, running, and using it, not full documentation of the UI.

Applies to:

- https://github.com/logos-co/logos-chatsdk-ui@v0.1.0
- https://github.com/logos-co/logos-chat-module@5e4d4d4 (pinned by the app's `flake.lock`)

Runtime target: testnet v0.1
Last checked: 2026-05-31
Status: Draft (UI flow derived from source; network connectivity pending SME verification)
Owner: owner needed (recent commits by @sirotin, @osmaczko, @Khushboo-dev-cpp)
Tracking: Journey [journeys.logos.co#15](https://github.com/logos-co/journeys.logos.co/issues/15)

## Outcome and purpose

- **What the user achieves:** Two people each run the Chat PoC App, exchange intro bundles, and send/receive end-to-end encrypted 1:1 messages over the Logos network.
- **Why it matters:** Demonstrates, end to end, the private-messaging capability of `logos-chat-module` in a runnable UI — identity, intro-bundle handshake, and encrypted 1:1 delivery, with no central server.
- **Key components:**
  - **`logos-chatsdk-ui`** — the QML chat UI (this journey's app).
  - **`logos-chat-module`** — chat backend the UI drives for identity, bundles, conversations, and messaging.
  - **Logos Core / module system** — loads the UI and backend modules and wires them via Qt Remote Objects.
  - **Logos network (Waku transport)** — carries the encrypted messages between the two app instances.

## Scope

- **Repository:** https://github.com/logos-co/logos-chatsdk-ui, tag `v0.1.0`.
- **Runtime target:** testnet v0.1.
- **Prerequisites:**
  - Linux or macOS.
  - [Nix](https://nixos.org/download) with flakes enabled (`experimental-features = nix-command flakes`).
  - Network access so the two instances can reach each other.
  - No accounts or keys to provision — identity is generated fresh on each launch (see [Limits](#limits)).

## Happy path

The app auto-initializes and starts chat on launch, so most of the flow is UI clicks. You need **two running instances** — two machines, or two terminals on one machine — to message between them.

### 1. Build and run

```sh
git clone https://github.com/logos-co/logos-chatsdk-ui
cd logos-chatsdk-ui
git checkout v0.1.0

# Run the standalone app (Nix fetches all dependencies)
nix run
```

`nix run` starts Logos Core, loads `capability_module` and `chat_module`, then launches the QML UI in an isolated `ui-host` process.

Expected output:

- A chat window opens with a conversation list on the left and a chat panel on the right.
- The bottom status bar shows the chat status and, once started, your identity ID.

### 2. Use the UI — send a 1:1 message

Do this on **both** instances; call them **A** and **B**.

1. **Wait for connection.** When the left panel stops showing *"Waiting for connection…"* and the status bar shows your identity, the app is running.
2. **On A — get your intro bundle.** Click **Get Intro Bundle**, then **Copy to Clipboard**. The bundle is a string starting with `logos_chatintro…`. Send it to B out-of-band (any channel).
3. **On B — start the conversation.** Click **+ new**. Paste A's intro bundle into the dialog and type an intro message (default: `Hello!`). Confirm. A new conversation appears in B's left panel.
4. **On A — accept.** The conversation and B's intro message appear automatically in A's left panel. Select it.
5. **Chat both ways.** In either app, select the conversation, type in *"Type a message…"*, and press **Enter** or click **>>**. Your messages appear right-aligned; the counterparty's appear left-aligned, each with a timestamp.

## Verification

- **Success action:** From instance A, send a message in the shared conversation; watch instance B.
- **Expected result:** The exact message text appears as an incoming (left-aligned) bubble in B's chat panel within a few seconds, and a reply sent from B appears as an incoming bubble in A. Both directions working confirms encrypted 1:1 delivery over the network.

## Configuration

Connection settings default to Waku `clusterId=2`, `shardId=1`, a random port, and a randomly suffixed identity name. Override via environment variables before `nix run`:

| Variable | Default | Purpose |
|---|---|---|
| `CHAT_NAME` | `LogosUser_NNN` | Identity display name |
| `CHAT_PORT` | `0` (random) | Waku listen port |
| `CHAT_CLUSTER_ID` | `2` | Waku cluster ID |
| `CHAT_SHARD_ID` | `1` | Waku shard ID |
| `CHAT_STATIC_PEER` | *(unset)* | Static peer multiaddr to bootstrap connectivity |

To test local backend changes, override the flake input, e.g. `nix run --override-input chat_module path:../logos-chat-module`.

## Known issues and troubleshooting

- **Nix flakes errors** — *Symptom:* "experimental feature 'nix-command' is disabled" / "flakes" errors. *Fix:* enable `nix-command` and `flakes` in your Nix configuration.
- **Instances don't discover each other** — *Symptom:* messages never arrive; left panel stays on "Waiting for connection…". *Cause:* no shared bootstrap peer. *Fix:* set `CHAT_STATIC_PEER` to a shared reachable multiaddr on both instances.
- **Conversation lost after restart** — *Symptom:* a previously open conversation is gone. *Cause:* state is ephemeral (see Limits). *Fix:* re-exchange intro bundles.

## Point of contact

- **GitHub:** _TODO — confirm R&D point of contact handle_
- **Discord:** _TODO — confirm R&D point of contact handle_

## Limits

- **Ephemeral state:** identity, conversations, and message history exist only while the app runs. Restarting an instance gives it a new identity and clears its conversations.
- **No persistence or history sync:** conversations are not reloaded on startup.

## Additional context

- App README and module structure: https://github.com/logos-co/logos-chatsdk-ui/blob/v0.1.0/README.md
- Backend module: https://github.com/logos-co/logos-chat-module
- Estimated time to complete: ~10–15 min, including the first Nix build.

## References

- [https://github.com/logos-co/logos-chatsdk-ui](https://github.com/logos-co/logos-chatsdk-ui)
- [https://github.com/logos-co/logos-chat-module](https://github.com/logos-co/logos-chat-module)
