---
slug: /storage
sidebar_position: 0
---

import Figure from '@site/src/components/Figure';

# Logos Storage

Logos storage is a filesharing protocol that allows users of the Logos stack to publish and share files in a decentralized manner. It provides persistence guarantees that are similar to those of Bittorrent[^1]; i.e., those of an [organically replicated network](#organic-replication-and-persistence-guarantees), while padding [stronger privacy guarantees](#privacy). Logos storage [is provided as a Logos module](./get-started/run-logos-storage-node.md), and requires [the Logos runtime and tooling](/get-started/what-is-logos) to work.

## What can you do with Logos storage?

The key functionality of Logos storage is _file sharing_: you can make files avaiable on the network which other people can then download. This is, in some ways, similar to how Google Drive[^3] works (Figure 1): you start by **(1)** [uploading a file to your own node](./get-started/run-logos-storage-node.md#publish-a-file) which will **(2)** store the file internally and **(3)** produce a file **Content IDentifier** (CID), which uniquely identifies your file and works very much like a "share link".

You can then **(4)** share this CID with other users using a third-party mechanism such as e-mail or [Logos messaging](/messaging). Once in posession of a CID, a user $q$ can then its Logos storage node to download and store the file **(5)** from the network and store it internally **(6)**. Once the file is available [^2], the user can then retrieve it from the node **(7)** and consume its contents.

<Figure src={require("./assets/logos-intro.png").default} caption="Logos storage workflow." number={1} />

## Organic replication and persistence guarantees

The reader may have noticed from the previous discussion that a user $p$ wishing to share a file $F$ must first upload it to their local node. A user $q$ wishing to obtain $F$ must then download $F$ to _their_ local node first. The reason is that, underneath, $p$ and $q$ are engaging in a replication protocol - when $p$ initially shares $F$, $F$ is added to the network with $1$ replica ($p$'s node). Once $q$ downloads it $F$ now has $2$ replicas. If a third user $g$ were to download $F$ as well, then it would have $3$ replicas, and so on.

Since the number of replicas is determined by the number of nodes _interested_ in $F$ and interest is inherently an organic property, we name this _organic replication_. This is in stark contrast to Decentralized Storage Networks such as Swarm[^4] or SIA[^5] (or products like Google Drive) where providers put storage for sale and will take up potentially arbitrary content so long as it is paid for. This also places a fundamental limitation on persistence: if no one is interested in your files, chances are that losing your node means your data is lost as well.

Note that this is not an insurmountable limitation: one could set up multiple nodes and create replication groups for files using Logos messaging, but this is currently not provided out-of-the-box. For files of public interest, however, replication should happen naturally: parties interested in keeping some content online can operate their own nodes and curate the list of files they wish to replicate. This allows the operator to control the type of content they host[^6], as well as how much content they host.

## Privacy

A key problem with filesharing networks such as Bittorrent - and Logos storage itself - is that organic replication exposes both the party that provide content (providers) and the party that downloads it (downloaders) to censorship. Even with encrypted communications, active attackers can join the network and uncover which nodes are doing what.

Privacy in Logos storage has been focused on _unlinking_ both providers and downloaders by the use of Mix networks[^6]. This is strongly inspired by how Tribler[^6] works, but adapted to Logos' infrastructure and constraints. As of the [Logos testnet v0.2](https://roadmap.logos.co/testnets/v02), we are able to provide some level of unlinkability to content lookup queries and, by [testnet v0.3](https://roadmap.logos.co/testnets/v03), we should be able to provide unlinkable downloads; i.e., it should be possible for a downloader $q$ to download a file $F$ without revealing to neither passive nor active attackers that they are, in fact, downloading $F$.

The ultimate goal is _fully anonynous filesharing_; i.e., a system in which neither providers nor downloaders can be linked to the content they are providing/downloading.

## What's next

The [Storage UI App](./get-started/set-up-and-use-logos-storage-ui.md) is probably the fastest and simplest way to give Logos storage a go. For people considering running a node on a more permanent basis or building on Logos storage, you should look into [how to run a storage node](./get-started/run-logos-storage-node.md), as well as the [Storage module API reference](https://logos-co.github.io/logos-storage-module/latest/api_reference.html).

[^1]: B. Cohen. _The BitTorrent Protocol Specification,_ Jan. 2008. Available: https://www.bittorrent.org/beps/bep_0003.html
[^2]: Or partially available, as when using streaming downloads.
[^3]: Google Drive: https://drive.google.com/
[^4]: V. Trón. _The Book of Swarm,_ Feb. 2024. Available: https://www.ethswarm.org/The-Book-of-Swarm.pdf
[^5]: Sia Network: https://sia.tech/
[^6]: D. L. Chaum. _Untraceable electronic mail, return addresses, and digital pseudonyms,_ CACM, Feb. 1981, doi: https://doi.org/10.1145/358549.358563
