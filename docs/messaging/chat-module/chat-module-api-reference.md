---
title: Chat module API reference
doc_type: reference
product: messaging
owner: logos
mdx:
  format: md
sidebar_position: 100
description: Look up every method, event and record the Chat module exposes.
custom_edit_url: https://github.com/logos-co/logos-chat-module/blob/master/rust-lib/chat_module.lidl
source_repo: logos-co/logos-chat-module
source_version: v0.3.0
---

# Chat module API reference

#### Look up every method, event and record the Chat module exposes.

:::note[Mirrored page]
This page mirrors the [API reference](https://logos-co.github.io/logos-chat-module/v0.3.0/pages/api_reference.html) published with
`logos-chat-module` v0.3.0, and is regenerated automatically after each release. To change it, edit
the source in [`logos-co/logos-chat-module`](https://github.com/logos-co/logos-chat-module), not this page.
:::

The module’s public surface is its contract, [rust-lib/chat\_module.lidl](https://github.com/logos-co/logos-chat-module/blob/master/rust-lib/chat_module.lidl). Everything on this page is rendered from that file, so it says exactly what a generated client can call.

For a walk-through of the calls in order – bring-up, identity, opening a conversation, sending – with working code, see [building a module that uses the Chat module API](https://docs.logos.co/messaging/chat-module/build-logos-module-that-uses-chat-module-api) on docs.logos.co.

Types are [LIDL](https://github.com/logos-co/logos-lidl/blob/master/docs/spec.md)’s, not any one language’s. The primitives are `tstr` (text), `bstr` (binary), `int`, `uint`, `float64`, `bool`, `any`, and `result` – a structured success-or-error. They compose as `[T]` for an array, `{K: V}` for a map, and `?T` for a value that may be absent. That set is fixed by the specification; how each maps onto a concrete type is up to the SDK generating your client.

## Methods {#methods}

Calls are dispatched over the Logos IPC bus. Status-bearing methods return `result`: success carries any payload – a conversation id, or nothing – and failure a human-readable reason. Collection getters return an array of the named record. A method that returns a plain string returns it empty when the module has not been initialised.

### `init` {#init}

```text
init(config: ChatConfig) → result
```

Bring the module up and join the delivery network.

Delivery starts asynchronously and this returns without waiting for it, so the module is not yet reachable when it succeeds. Readiness arrives as a delivery\_state\_changed event reaching “online”, and status() reports the state at any time. Subscribe to the events before calling this, or the early ones are missed.

Calling it again while initialised succeeds and ignores the new config, so call shutdown() first to reconfigure. The one exception is a delivery that failed before its node started: the call then starts delivery again, on its own delivery\_preset. The delivery node outlives shutdown(), so a new delivery\_preset does not reach it.

Storage lives under the instance directory the host assigns; init fails when the host assigned none. Two instances therefore run side by side by giving each host its own session directory, and need no port coordination: the delivery node picks its own.

Conversations persist across restarts purely as history. Each init is a new installation with a new address, so a conversation from a previous session reads back with its messages and history\_only set: it can be labelled and deleted, but it cannot be sent into or invited to, and it has no roster, until a member invites this installation back into the group. Restoring such conversations is being worked on.

### `shutdown` {#shutdown}

```text
shutdown() → result
```

Stop the module: end the inbound worker, drop the chat client, and close its storage. Succeeds when the module was never initialised. A later init() starts a fresh session from the persisted state. The installation ends here: the next one has a new address, and this one’s conversations read back history\_only.

### `get_log_path` {#get_log_path}

```text
get_log_path() → tstr
```

The file this module is writing its log to, in the instance directory the host assigned. Empty before init, and on a host that assigned none.

### `health` {#health}

```text
health() → bool
```

Liveness. Always true, and reachable without init or any lock held, so what a caller learns is whether this module answered at all: a host that lost the process fails the call instead, and a false is that failure surfacing.

### `get_installation_name` {#get_installation_name}

```text
get_installation_name() → tstr
```

This installation’s display name: the one set with set\_installation\_name, or the chat core’s own name for the installation when none was set.

### `set_installation_name` {#set_installation_name}

```text
set_installation_name(name: tstr) → result
```

Set this installation’s display name; empty restores the default. Local to this installation — it is not carried to peers.

### `get_address` {#get_address}

```text
get_address() → tstr
```

The local installation address, shared out-of-band so a peer can open a conversation with this installation via create\_conversation. Empty before init.

### `create_conversation` {#create_conversation}

```text
create_conversation(peer_address: tstr) → result
```

Open a 1:1 conversation with the peer at peer\_address (their get\_address). Sends the cryptographic invite; the first message follows via send\_message. Returns the new conversation’s id.

### `create_group_conversation` {#create_group_conversation}

```text
create_group_conversation(name: tstr, desc: tstr) → result
```

Create a group conversation with this installation as its only member; grow it with add\_group\_member. Every member sees the returned convo\_id. name and desc are the group’s shared metadata, visible to every member; both may be empty for an unnamed group.

### `add_group_member` {#add_group_member}

```text
add_group_member(convo_id: tstr, peer_address: tstr) → result
```

Invite every installation the account at peer\_address endorses into an existing group conversation. The invite is committed and delivered asynchronously; the peer observes the conversation once its instance has joined. Raises conversation\_updated here, and members\_changed once the group commits the add. Fails on an unknown convo\_id.

### `list_conversations` {#list_conversations}

```text
list_conversations() → [Conversation]
```

Every conversation this installation holds, in no particular order — sort by last\_activity\_ms for a conversation list.

### `get_messages` {#get_messages}

```text
get_messages(convo_id: tstr) → [Message]
```

The messages this installation holds for a conversation, oldest first. They survive a restart, which reads back a conversation’s newest 500. An unknown conversation reports an empty list rather than failing.

### `list_group_members` {#list_group_members}

```text
list_group_members(convo_id: tstr) → [GroupMember]
```

The roster of a conversation, one GroupMember per element: committed members first, then invites still awaiting the group’s commit. A direct conversation reports both participants and never a pending one; an unknown conversation reports an empty roster.

### `send_message` {#send_message}

```text
send_message(convo_id: tstr, content: tstr) → result
```

Encrypt content and publish it to the conversation, then record it here and raise message\_sent. Success means the message was handed to delivery\_module, not that delivery sent it or that any peer received it. Fails on an unknown convo\_id.

### `set_conversation_nickname` {#set_conversation_nickname}

```text
set_conversation_nickname(convo_id: tstr, nickname: tstr) → result
```

Label a conversation for this installation; empty clears the label. Local only — unlike a group’s name, no other member sees it. Raises conversation\_updated. Fails on an unknown convo\_id.

### `delete_conversation` {#delete_conversation}

```text
delete_conversation(convo_id: tstr) → result
```

Drop a conversation and its messages from this installation, and ignore anything that arrives for it afterwards rather than reopening it. Local only: the other members keep theirs. Raises conversation\_deleted. Fails on an unknown convo\_id.

### `status` {#status}

```text
status() → Status
```

A snapshot of the module: how many conversations it holds, and what the delivery node is doing. Readable before init, reporting zero conversations.

## Events {#events}

Events are pushed over the `lp_*` IPC event channel; a consumer subscribes with `on_<event>()` rather than polling. They are fire-and-forget: they carry their arguments positionally, in the order listed here, and return nothing.

This is where the results of the network arrive. A call returns once the request is dispatched, so an inbound message, a peer accepting an invite, or the delivery node coming online each reach you as an event rather than as a return value. Subscribe before calling [`init`](#init), or the earliest ones are missed.

### `message_received` {#message_received}

```text
message_received(convo_id: tstr, content: tstr, timestamp_ms: int, sender: tstr)
```

An inbound message was decrypted and recorded. sender: the sender’s account address, which its account’s log vouches for.

### `message_sent` {#message_sent}

```text
message_sent(convo_id: tstr, content: tstr, timestamp_ms: int)
```

A message this installation sent was published and recorded.

### `conversation_created` {#conversation_created}

```text
conversation_created(convo_id: tstr, is_outgoing: bool, peer_label: tstr, kind: tstr, name: tstr, desc: tstr)
```

A conversation was opened — by a call here, or by a peer’s invite arriving. is\_outgoing tells the two apart. kind: “direct” (1:1) or “group”, matching the Conversation record’s field. name, desc: the group’s shared metadata, empty for direct conversations and unnamed groups.

### `conversation_updated` {#conversation_updated}

```text
conversation_updated(convo_id: tstr)
```

A conversation’s local metadata changed here: a nickname was set, a member was invited, or an invite back into a history\_only conversation cleared the flag. Re-read it with list\_conversations.

### `members_changed` {#members_changed}

```text
members_changed(convo_id: tstr)
```

The group committed a roster change. Call list\_group\_members for the roster it committed.

### `conversation_deleted` {#conversation_deleted}

```text
conversation_deleted(convo_id: tstr)
```

A conversation was deleted on this installation.

### `delivery_state_changed` {#delivery_state_changed}

```text
delivery_state_changed(delivery_state: tstr, detail: tstr, delivery_adopted: bool)
```

The delivery node’s state changed: “initialising”, “online”, “error” or “stopped”, with detail carrying a human-readable reason where there is one. Reaching “online” is how a caller learns init() has finished bringing the network up. delivery\_adopted is as in the Status record, and settled by the time the state reaches “online”.

## Records {#records}

The structured payloads the methods above exchange. A field marked *optional* may be absent.

### `Conversation` {#Conversation}

```text
type Conversation
```

- `convo_id` (`tstr`) – Identifies the conversation in every other call. Returned by create\_conversation and create\_group\_conversation.
- `nickname` (`tstr`, optional) – A label for this conversation, set with set\_conversation\_nickname. Local to this installation; no other member sees it.
- `message_count` (`int`) – How many messages are kept for the conversation, across restarts, including any older than get\_messages returns. It counts what was sent and received here, not everything ever sent to the conversation.
- `last_activity_ms` (`int`) – When the most recent held message arrived, in milliseconds since the Unix epoch. Zero when the conversation has no messages.
- `kind` (`tstr`) – “direct” (1:1) or “group”. PrivateV1 and DirectV1 are both “direct”.
- `name` (`tstr`, optional) – A group’s shared name, set at creation and identical for every member. Absent for direct conversations and unnamed groups; distinct from the local-only `nickname`.
- `description` (`tstr`, optional) – A group’s shared description, set at creation alongside `name` and likewise the same for every member. Absent on the same terms.
- `preview` (`tstr`, optional) – The last message’s content, truncated to 160 characters, for a conversation-list preview. Absent when the conversation has no messages.
- `history_only` (`bool`) – True for a conversation from a previous session, kept for its history only (see init).

### `Message` {#Message}

```text
type Message
```

- `from_self` (`bool`) – True for a message this installation sent, false for one it received.
- `content` (`tstr`) – The message text, decrypted.
- `timestamp_ms` (`int`) – When the message was sent (own messages) or recorded (received ones), in milliseconds since the Unix epoch.
- `sender` (`tstr`, optional) – Sender’s account address; unset on messages this installation sent.

### `Status` {#Status}

```text
type Status
```

- `convo_count` (`int`) – How many conversations this installation currently holds.
- `delivery_state` (`tstr`) – The delivery node’s state, same vocabulary as the delivery\_state\_changed event: “initialising”, “online”, “error” or “stopped”.
- `detail` (`tstr`) – A human-readable reason for that state, empty when there is none.
- `delivery_adopted` (`bool`) – True when delivery\_module already had a node this module did not create, in its current process, with its delivery\_preset; a node it created before its process restarted counts. delivery\_module runs one node for every module that uses it, configured by whichever asked first, so this node keeps the settings it was created with, and they may differ from delivery\_preset.

### `GroupMember` {#GroupMember}

```text
type GroupMember
```

- `address` (`tstr`) – The member’s account address.
- `pending` (`bool`) – True while the group has not committed this member’s add, so it cannot read the conversation yet. Only invites this instance sent are reported, so a member another instance invited appears once the group commits it. The flag clears when that commit lands; an invite the group never commits stays pending for the life of the conversation.

### `ChatConfig` {#ChatConfig}

```text
type ChatConfig
```

- `delivery_preset` (`tstr`, optional) – The delivery network to create delivery\_module’s node on. A node that already exists keeps its own, which Status.delivery\_adopted reports. Empty or absent means “logos.test”.
- `log_level` (`tstr`, optional) – How much of the chat core’s own account of a run to log: “error” \| “warn” \| “info” \| “debug” \| “trace”. Absent or unrecognised means “info”. Read once, at init: a later init leaves it as it was.
