> Source: https://docs.logos.co/messaging/concepts/understand-peer-discovery/peer-discovery
> Markdown index of all Logos docs: https://docs.logos.co/llms.txt

# Understand peer discovery

#### Learn how a node bootstraps and finds the peers it needs to operate.

When initialising a [Logos Delivery](https://docs.logos.co/get-started/glossary.md#logos-delivery) node, it must connect with other peers to enable message sending, receiving, and retrieval. To achieve this, a discovery mechanism is employed to locate other peers in the network. This process is known as [bootstrapping](https://docs.logos.co/get-started/glossary.md#bootstrapping).

## Why a node seeks more peers

Once a connection is established, the node must actively seek out additional peers to have:

- Sufficient peers in the [Relay](https://docs.logos.co/messaging/concepts/protocols.md#relay) mesh: The goal is to have at least 6 peers in the mesh. This ensures a robust network where messages can be efficiently relayed.
- Reserve peers for backup: It is essential to have a surplus of peers available as reserves. These reserves are backups when the current peers become overloaded or experience unexpected disconnections.
- Peers with specific capabilities: The node seeks out peers with specific capabilities, such as [Store](https://docs.logos.co/messaging/concepts/protocols.md#store), [Light Push](https://docs.logos.co/messaging/concepts/protocols.md#light-push), or [Filter](https://docs.logos.co/messaging/concepts/protocols.md#filter). This allows for targeted interactions and enhanced functionality based on the desired capabilities.

## Discovery mechanisms

Logos Delivery supports multiple [peer discovery](https://docs.logos.co/get-started/glossary.md#peer-discovery) mechanisms, such as:

- [Configuring Static Peers](https://docs.logos.co/messaging/concepts/understand-peer-discovery/static-peers.md)
- [Peer Discovery via DNS](https://docs.logos.co/messaging/concepts/understand-peer-discovery/dns-discovery.md)
- [Discv5 Ambient Peer Discovery](https://docs.logos.co/messaging/concepts/understand-peer-discovery/discv5.md)
- [Peer Exchange](https://docs.logos.co/messaging/concepts/understand-peer-discovery/peer-exchange.md)
