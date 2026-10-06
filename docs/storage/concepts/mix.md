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

:::info
This document reflects the state of this Logos component as it will exist on mainnet. Some features described here may not be available on the current testnet.
:::

[Mix](../../get-started/glossary.md#mix) (short for [mix
network](https://en.wikipedia.org/wiki/Mix_network)) is a privacy layer. When
enabled, it makes it harder for observers to figure out who is
downloading a file, effectively providing a form of anonymity.

Normally, when a node searches and downloads content on the network, it reveals
Personally Identifiable Information (PII) such as the node's IP address or
public keys to other peers. Mix provides a way to conceal this information such
that nodes requesting a file can do so without leaking any PII.

:::info
Note that, as of storage v3.0.0, only nodes _downloading_ remain anonymous.
Nodes providing content must remain public and identifiable.
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

## Enabling private downloads

When Mix is configured (`mix-enabled` true and at least one `dht-mix-proxy`
set), you can set the `isPrivate` flag in download operations like
`downloadToUrl` and `downloadChunks` (see [API
reference](https://logos-co.github.io/logos-storage-module/v3.0.0-rc1/api_reference.html))
so that downloads happen over mix. This in practice makes your download
anonymous; that is, third parties will not be able to tell that you
are downloading a file, even if they are serving the file to you themselves.

**Advertisements.** Logos storage's download operations expose a second option,
`advertise`, which controls whether or not a node advertises on the network that
it has a given file so that other peers can download from it. To benefit from the full privacy provided by the mix network, you should set `advertise=false` every time you set `isPrivate=true`.

:::warning
When using `nat:auto`, the node first needs to get a reachability status,
`Reachable` or `Unreachable`, before it can do private downloads. See
[Connectivity](./connectivity.md) for details.
:::
