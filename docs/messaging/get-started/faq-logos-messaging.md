---
title: "FAQ: Logos Messaging"
doc_type: concept
product: messaging
topics: faq
authors: LordGhostX, fryorcraken
owner: logos
doc_version: 1
slug: faq
---

# FAQ: Logos Messaging

#### Review common questions about how Logos Messaging works and how to build on it.

## What is Logos Messaging and Logos Delivery?

[Logos Delivery](https://github.com/logos-messaging/logos-delivery) is the reference implementation of the Logos Messaging (formerly Waku) protocol.

## Does messaging require a gas fee?

No, sending and receiving messages using Logos Messaging involves no gas fee.

## What encryption does Logos Messaging use?

Logos Messaging uses libp2p noise encryption for node-to-node connections. However, no default encryption method is applied to the data sent over the network. This design choice enhances Logos Messaging's encryption flexibility, encouraging developers to use custom protocols or Logos Messaging message payload encryption methods freely.

## Where does Logos Messaging store the messages?

Logos Messaging's [Store protocol](../concepts/understand-logos-messaging-protocols.md#store) is designed to temporarily store messages within the network. However, Logos Messaging does not guarantee the message's availability and recommends using [Logos Storage](https://logos.co/technology-stack/storage) for long-term storage.

## Can Logos Messaging only be used for wallet-to-wallet messaging?

No, Logos Messaging is flexible and imposes no specific rules on identifiers.

## How does Logos Messaging differ from IPFS?

Logos Messaging focuses on short, ephemeral, real-time messages, while IPFS focuses on large, long-term data storage. Although there's an overlap between the two technologies, Logos Messaging does not currently support large data for privacy reasons.

## What are Rate Limiting Nullifiers (RLN)?

[Rate Limiting Nullifier](../concepts/understand-logos-messaging-protocols.md#rln-relay) is a zero-knowledge (ZK) protocol enabling spam protection in a decentralised network while preserving privacy. Each message must be accompanied by a ZK proof, which [Relay](../concepts/understand-logos-messaging-protocols.md#relay) nodes verify to ensure the publishers do not send more messages than they are allowed. The ZK proof does not leak any private information about message publishers - it only proves they are members of a set of users allowed to publish a certain number of messages per given time frame.
