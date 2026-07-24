---
title: Mix
doc_type: concept
product: storage
topics: storage, mix, privacy
authors: arnaud
owner: logos
doc_version: 1
slug: mix
sidebar_position: 2
---

# Mix

#### Understand how Mix hides who is looking up content on the storage network.

Mix is a privacy layer. When it is enabled, the node hides *who* is asking for content when it looks up where to find data on the network.

Normally, when a node searches the network to find where some content lives, the peers it asks can see its identity. With Mix, those lookups are routed through other relays first, so the peer that answers cannot tell who originally asked.

Mix currently protects DHT queries (content lookups) only: advertising content and transferring files do not go through Mix.

:::info
Mix is an experimental feature and may change before mainnet.
:::

## Configuration

Set `mix-enabled` to `true`. Mix needs a few extra options to know which relays it can use:

| Option          | Description                                                       |
| --------------- | ----------------------------------------------------------------- |
| `mix-enabled`   | Turn Mix on (default `false`).                                     |
| `dht-mix-proxy` | Peer records (SPRs) used as proxy destinations for lookups.        |
| `mix-pool`      | Path to a JSON file listing the Mix relays.                        |
| `mix-pool-json` | The relay list as inline JSON. Takes precedence over `mix-pool`.   |

Example:

```json
{
  "mix-enabled": true,
  "mix-pool": "/path/to/mix-pool.json"
}
```

## Toggling private queries

When Mix is configured (`mix-enabled` true and at least one `dht-mix-proxy` set), the switch defaults to on, so DHT queries are tunnelled from the start. Call `togglePrivateQueries(false)` to stop tunnelling and `togglePrivateQueries(true)` to resume. Enabling fails if Mix is not configured; disabling is always allowed. The call returns the previous state. This affects queries only, not advertisements.

:::info
`togglePrivateQueries` is a temporary API and will likely be removed before mainnet.
:::
