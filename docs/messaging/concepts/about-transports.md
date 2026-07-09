---
title: About transports
doc_type: concept
product: messaging
topics: transports, networking
authors: LordGhostX, fryorcraken
owner: logos
doc_version: 1
slug: transports
---

# About transports

#### Understand how nodes move data between peers and which transports suit each environment.

[Transports](https://docs.logos.co/get-started/glossary#transport) help move data packets across a network by establishing connections between peers. They define the rules and protocols to ensure efficient network transmission, routing, and data delivery. [Logos Delivery](https://docs.logos.co/get-started/glossary#logos-delivery) is a transport-agnostic framework that allows developers to choose and support multiple protocols according to their requirements.

## The basics

- Transports move data packets between peers and define how the network transmits, routes, and delivers data.
- Logos Delivery is transport-agnostic, so developers choose the protocols that suit their requirements.
- The [recommended transports](#recommended-transports) vary by environment, from TCP for service nodes to secure WebSocket for browsers.

## Recommended transports

For Logos Delivery nodes, the following transports are recommended:

- **TCP**: By default, Logos Delivery nodes use TCP for communication. Service nodes should employ TCP for listening to and connecting with other nodes.
- **Secure WebSocket**: In browser environments, secure WebSocket is used. Service nodes are encouraged to set up SSL certificates to enable incoming connections from browsers and serve them securely.
- Other protocols like [WebRTC](https://github.com/waku-org/js-waku/issues/20), [WebTransport](https://github.com/waku-org/js-waku/issues/697), and QUIC have been researched and studied for potential integration.

{% hint style="info" %}

Logos Delivery ensures compatibility and improved communication capabilities by following these recommended transports.

{% endhint %}
