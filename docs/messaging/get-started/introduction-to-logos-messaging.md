# Introduction to Logos Messaging

#### Learn how Logos provides private, censorship-resistant communication for decentralised applications.

[Logos Messaging](https://docs.logos.co/get-started/glossary#logos-messaging) is the messaging layer of the Logos technology stack. It lets applications send messages, relay data, and coordinate with one another without relying on centralised servers or exposing metadata to surveillance. It uses a peer-to-peer relay network where messages propagate across nodes with no central broker, supporting private one-to-one messaging, group messaging, and public broadcast channels.

## The basics

- Logos Messaging comprises two modules: [Delivery](https://github.com/logos-messaging/logos-delivery), a peer-to-peer transport layer with spam protection, and [Chat](https://github.com/logos-messaging/logos-chat), a library for private, end-to-end encrypted conversations built on top of Delivery.
- Messages propagate across a peer-to-peer relay network with no central broker. Anyone can run a node and there is no gas fee for sending or receiving messages.
- Delivery is modular. Applications combine a set of protocols — [Relay](../concepts/understand-logos-delivery-protocols.md#relay), [RLN Relay](../concepts/understand-logos-delivery-protocols.md#rln-relay), [Filter](../concepts/understand-logos-delivery-protocols.md#filter), [Store](../concepts/understand-logos-delivery-protocols.md#store), and [Light Push](../concepts/understand-logos-delivery-protocols.md#light-push) — to balance anonymity, scalability, and latency for their own use case.
- Logos Messaging is built on top of [libp2p](../concepts/learn-the-differences-between-logos-delivery-and-libp2p.md), but adds a service network that anyone can use without deploying their own infrastructure, along with economic spam protection that libp2p does not provide.

## Architecture

Logos Messaging is implemented as two modules that sit on top of the Logos networking layer: [Delivery](https://github.com/logos-messaging/logos-delivery), which handles peer-to-peer transport, and [Chat](https://github.com/logos-messaging/logos-chat), which builds private conversations on top of it.

### Delivery

Delivery is the peer-to-peer messaging network at the base of the messaging stack, and the reference implementation of the Logos Messaging protocol. It provides publish-subscribe messaging over an open, censorship-resistant network with no central broker, and it protects the network from spam using [RLN](../get-started/faq-logos-messaging.md#what-are-rate-limiting-nullifiers-rln), which verifies a zero-knowledge proof rather than a publisher's identity.

Delivery's functionality is split across a set of [protocols](../concepts/understand-logos-delivery-protocols.md):

- **Relay** extends [libp2p GossipSub](https://github.com/libp2p/specs/blob/master/pubsub/gossipsub/README.md) to provide the base publish/subscribe messaging that peers use to send and receive messages.
- **RLN Relay** extends Relay with rate limiting nullifiers for economic, privacy-preserving spam prevention.
- **Filter** lets light nodes selectively subscribe to messages by content topic, trading some privacy for lower bandwidth use.
- **Store** temporarily retains messages so offline peers can retrieve what they missed, though it does not guarantee availability — applications that need durable storage should pair Delivery with Logos Storage instead.
- **Light Push** lets bandwidth-constrained nodes publish a message and receive an acknowledgement that at least one peer received it, without guaranteeing network-wide propagation.

These protocols interact across three [network domains](../concepts/about-network-domains.md): the discovery domain, where nodes locate other peers; the gossip domain, where Relay and RLN Relay distribute messages; and the request/response domain, where Store, Filter, and Light Push serve resource-limited nodes directly.

Messages are routed using [content topics](../concepts/about-content-topics.md), developer-set metadata strings that let protocols filter, route, and retrieve messages.. How narrowly or broadly an application scopes its content topics is a direct privacy trade-off: Filter, Store, and Light Push all disclose content topics to peers, so grouping many users under shared topics increases k-anonymity, while splitting traffic into topic "buckets" helps distribute load for high-traffic applications.

Delivery is [transport-agnostic](../concepts/about-transports.md), so developers choose the protocol that fits their environment: TCP by default for service nodes, and secure WebSocket for browsers, with WebRTC, WebTransport, and QUIC under research for future support.

To join the network, a node bootstraps using one of several [peer discovery](../concepts/understand-peer-discovery/understand-peer-discovery.md) mechanisms — including static peers, DNS discovery, Discv5, and Peer Exchange — and then keeps looking for peers to maintain a healthy Relay mesh, reserve backup connections, and find peers with specific capabilities such as Store or Filter.

### Chat

Chat is a protocol and library that provides one-to-one and group conversations with end-to-end encryption, using de-MLS for group messaging. It uses Delivery as its transport, so applications get everything they need to add private chat without designing and securing their own messaging protocol from scratch.

### Security features

Logos Messaging's [security guarantees](../concepts/understand-logos-delivery-security-features.md) vary by protocol and are documented openly in the underlying RFCs. Relay provides pseudonymity and unlinkability between publishers, subscribers, and their activity, backed by GossipSub's peer-scoring mechanism and ongoing RLN research for spam protection. Data confidentiality, integrity, and authenticity are available through the Waku Message format and Noise protocols. Protocols that require a direct connection, such as Store and Filter, trade away some of that unlinkability, since a node can associate a peer's `PeerID` with the topics or filters it queries.

### Logos Messaging and libp2p

Logos Messaging is [built on top of libp2p](../concepts/learn-the-differences-between-logos-delivery-and-libp2p.md) and shares much of its terminology, but it goes further in two ways. It is a service network: developers can use it without deploying their own infrastructure, though anyone can choose to run a node to help decentralise the network. It is also a turnkey solution for privacy-preserving, censorship-resistant, platform-agnostic messaging, including out-of-the-box support for offline and resource-limited devices through Store, Filter, and Light Push, plus economic spam protection through RLN Relay, which libp2p does not provide on its own.
