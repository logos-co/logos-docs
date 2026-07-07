---
title: Understand peer discovery
doc_type: concept
product: messaging
topics: peer-discovery, networking
authors: LordGhostX, fryorcraken
owner: logos
doc_version: 1
slug: peer-discovery
---

# Understand peer discovery

#### Learn how a node bootstraps and finds the peers it needs to operate.

When initialising a Logos Messaging node, it must connect with other peers to enable message sending, receiving, and retrieval. To achieve this, a discovery mechanism is employed to locate other peers in the network. This process is known as bootstrapping.

## Why a node seeks more peers

Once a connection is established, the node must actively seek out additional peers to have:

- Sufficient peers in the [Relay](./understand-logos-messaging-protocols.md#relay) mesh: The goal is to have at least 6 peers in the mesh. This ensures a robust network where messages can be efficiently relayed.
- Reserve peers for backup: It is essential to have a surplus of peers available as reserves. These reserves are backups when the current peers become overloaded or experience unexpected disconnections.
- Peers with specific capabilities: The node seeks out peers with specific capabilities, such as [Store](./understand-logos-messaging-protocols.md#store), [Light Push](./understand-logos-messaging-protocols.md#light-push), or [Filter](./understand-logos-messaging-protocols.md#filter). This allows for targeted interactions and enhanced functionality based on the desired capabilities.

## Discovery mechanisms

Logos Messaging supports multiple peer discovery mechanisms, such as:

- [Configuring Static Peers](./about-static-peers.md)
- [Peer Discovery via DNS](./about-dns-discovery.md)
- [Discv5 Ambient Peer Discovery](./about-discv5.md)
- [Peer Exchange](./about-peer-exchange.md)
