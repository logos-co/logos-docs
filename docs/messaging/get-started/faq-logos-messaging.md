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

## What is Logos Messaging,Logos Delivery?

[Logos Messaging](https://docs.logos.co/get-started/glossary#logos-messaging) is the messaging component of the Logos technology stack, composed of [Logos Delivery](https://docs.logos.co/get-started/glossary#logos-delivery) and [Logos Chat](https://docs.logos.co/get-started/glossary#logos-chat). Logos Delivery is a peer-to-peer messaging network with DoS protection via RLN (Rate Limiting Nullifiers). Any application can use it to send and receive messages over an open, censorship-resistant network.

Logos Chat is a protocol and library that provides 1:1 and group conversations with end-to-end encryption using de-MLS - everything an application needs to add private chat without rolling its own protocol.

## Does messaging require a gas fee?

No, sending and receiving messages using Logos Messaging involves no gas fee.

## What encryption does Logos Delivery use?

Logos Delivery uses libp2p noise encryption for node-to-node connections. However, no default encryption method is applied to the data sent over the network. This design choice enhances Logos Delivery's encryption flexibility, encouraging developers to use custom protocols or Logos Delivery message payload encryption methods freely.

## Where does Logos Delivery store the messages?

Logos Delivery's [Store protocol](../concepts/understand-logos-delivery-protocols.md#store) is designed to temporarily store messages within the network. However, Logos Delivery does not guarantee the message's availability and recommends using [Logos Storage](https://logos.co/technology-stack/storage) for long-term storage.

## Can Logos Delivery only be used for wallet-to-wallet messaging?

No, Logos Delivery is flexible and imposes no specific rules on identifiers.

## How does Logos Delivery differ from IPFS?

Logos Delivery focuses on short, ephemeral, real-time messages, while IPFS focuses on large, long-term data storage. Although there's an overlap between the two technologies, Logos Delivery does not currently support large data for privacy reasons.

## What are Rate Limiting Nullifiers (RLN)?

[Rate Limiting Nullifier](../concepts/understand-logos-delivery-protocols.md#rln-relay) is a zero-knowledge (ZK) protocol enabling spam protection in a decentralised network while preserving privacy. Each message must be accompanied by a ZK proof, which [Relay](../concepts/understand-logos-delivery-protocols.md#relay) nodes verify to ensure the publishers do not send more messages than they are allowed. The ZK proof does not leak any private information about message publishers - it only proves they are members of a set of users allowed to publish a certain number of messages per given time frame.
