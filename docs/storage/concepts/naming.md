---
title: Naming
doc_type: concept
product: storage
topics: storage, naming, dht
authors: arnaud
owner: logos
doc_version: 1
slug: naming
sidebar_position: 3
---

# Naming

#### Understand how a name gives a file a key that stays the same when the file changes.

:::info
This document reflects the state of this Logos component as it will exist on mainnet. Some features described here may not be available on the current testnet.
:::

A [CID](../../get-started/glossary.md#cid) identifies one version of a file. When the file changes, its CID changes too, and you have to share the new CID again.

A name solves this. You publish a dataset under a label, and you get a _name key_. You share the name key once. Later, you point the name to another dataset, and the name key stays the same. From then on, anyone who fetches the name key gets the new dataset.

## Name key

The name key comes from the public key of the node that publishes and the label. Two different nodes that publish the same label get two different name keys.

A name key looks like a CID, but it is not a dataset CID. To fetch a file, you can give the Storage app either one.

## Name record

When you publish a name, the node signs a _name record_ with its key. The name record contains the label, the dataset CID and a sequence number. The node stores it and advertises it in the DHT (Distributed Hash Table).

To resolve a name key, a node reads the name record in the DHT and gets the dataset CID. It then downloads the dataset like any other CID.

- Only the node that published a name can point it to another dataset, since the name record must be signed with its key.
- A name points to one dataset. In the Storage app, a dataset has one name.
- When the DHT has several name records for a name key, it keeps the one with the highest sequence number. By default, the sequence number is the time of the publish.

## Lifetime

A name record expires 8 hours after the node signs it. While the node runs, it signs the name record again and advertises it every 4 hours. It also does it when it starts.

- If the node that published a name stays offline for more than 8 hours, the name key doesn't resolve anymore. When the node starts again, it publishes the name again.
- Any node can _refresh_ any name, not only the node that published it. The node reads the name record in the DHT and advertises it again, unchanged. This keeps the name easy to find when the DHT nodes that store it go offline. A refresh doesn't change the expiration of the name record.
- When you unpublish a name, the node deletes its name record and stops advertising it. Other nodes can still resolve the name key until the name record expires.

A name points to a dataset, but it doesn't keep the dataset online. Nodes must still share the dataset so that others can download it.

## Use names

- From the Storage app: see [Run a Storage Node from Basecamp](../get-started/run-storage-node-from-basecamp.md#step-9-share-a-file-under-a-name).
- From code: see `namePublish`, `nameUnpublish`, `nameRefresh`, `nameResolve`, `nameResolveKey` and `isNameKey` in the [Storage module API reference](../reference/storage-module-api-reference.md).
