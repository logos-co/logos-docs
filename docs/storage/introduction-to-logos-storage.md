---
title: Introduction to Logos Storage
doc_type: concept
product: storage
topics: storage
authors: gmega, kashepavadan
owner: logos
doc_version: 1
slug: /storage
sidebar_position: 0
---

import Figure from '@site/src/components/Figure';

# Logos Storage

#### Learn how Logos provides resilient, censorship-resistant file sharing for decentralised applications.

Logos storage is a filesharing protocol that allows users of the Logos stack to publish and share files in a decentralized manner. It provides the persistence guarantees of an [organically replicated network](#organic-replication) while adding [stronger privacy guarantees](#privacy). Logos storage [is provided as a Logos module](./get-started/run-logos-storage-node.md), and requires the Logos runtime and tooling to work.

## The basics

- Logos Storage allows users to share files over a decentralised, private network of nodes.
- Files are stored locally by each node, with each file assigned a unique identifier known as a CID.
- Anybody with a CID can download the associated file from the network. Nodes that download a file replicate it on their machine and make it available for others, with more downloads resulting in more peers to download from.
- Neither providers nor dowloaders can be linked to the content they interact with.

## How Logos Storage works

The key functionality of Logos Storage is _file sharing_: you can make files avaiable on the network which other people can then download. The basic process is illustrated in Figure 1:

<Figure id="fig:1" src={require("./assets/logos-intro.png").default} caption="Logos storage workflow." number={1} />

1. A user [uploads a file to their Logos Storage node `p`](./get-started/run-logos-storage-node.md#publish-a-file).
1. Node `p` stores the file internally.
1. Node `p` produces a *Content Identifier* (CID for short) that uniquely identifies the file. The CID functions very much like a "file share link".
1. The user shares the CID with other users via a third-party communication mechanism (such as [Logos Messaging](/messaging)).
1. Another user that received the CID uses their own Logos Storage node `q` to download the file.
1. Node `q` that downloaded the file stores it internally.
1. Once the file is made available on node `q` (including partial availability, such as for streaming), the user can retrieve it and consume its contents.

### Organic replication

Note that a user that wants to share a file must first upload it to their local node. Another user that wants to obtain that same file must then download it to their own local node first. The reason is that, underneath, both users are engaging in a replication protocol - when the first user initially shares their file, that file is added to the network with 1 replica (the uploading node). Once the second user downloads it, the file has 2 replicas. If a third user were to download that same file as well, it would have 3 replicas, etc.

Since the number of replicas is determined by the number of nodes interested in a given file - interest being an organic property - this process is referred to as _organic replication_. This is in stark contrast to decentralised storage networks such as [Swarm](https://www.ethswarm.org/The-Book-of-Swarm.pdf) or [SIA](https://sia.tech/), where providers guarantee the availability of uploaded content in exchange for a fee. The way Logos Storage works places a fundamental limitation on persistence: if no one is interested in your files, chances are that losing your node means your data is lost as well.

This is not an insurmountable limitation: one could set up multiple nodes and create replication groups for files using Logos Messaging, but this is not currently provided out-of-the-box. For files of public interest, however, replication should happen naturally: parties interested in keeping some content online can operate their own nodes and curate the list of files they wish to replicate. This allows the operator to control the type of content they host, as well as how much content they host.

### Privacy

A key problem with filesharing networks such as [BitTorrent](https://www.bittorrent.org/beps/bep_0003.html) - and Logos Storage itself - is that organic replication on its own exposes both the party that provides content (the *provider*) and the party that downloads it (the *downloader*) to censorship. Even with encrypted communications, active attackers can join the network and uncover which nodes are doing what.

Privacy in Logos Storage has been focused on _unlinking_ both providers and downloaders by the use of [Mix networks](https://doi.org/10.1145/358549.358563). This is strongly inspired by how [Tribler](https://tribler.org/) works, but adapted to Logos' infrastructure and constraints. When fully mature, Logos Storage will leverage  mix network technology to provide _fully anonymous filesharing_; that is, a system in which neither providers nor downloaders can be linked to the content they are providing/downloading.

## How to use Logos Storage

The [Storage UI App](./get-started/set-up-and-use-logos-storage-ui.md) is probably the fastest and simplest way to try out Logos storage. To run a node on a more permanent basis or build on Logos Storage, check out [how to run a storage node](./get-started/run-logos-storage-node.md) and the [Storage module API reference](https://logos-co.github.io/logos-storage-module/latest/api_reference.html).