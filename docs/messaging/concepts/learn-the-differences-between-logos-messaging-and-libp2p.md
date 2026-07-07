---
title: Learn the differences between Logos Messaging and libp2p
doc_type: concept
product: messaging
topics: libp2p, architecture
authors: LordGhostX, fryorcraken
owner: logos
doc_version: 1
slug: logos-messaging-and-libp2p
---

# Learn the differences between Logos Messaging and libp2p

#### Understand what Logos Messaging adds on top of libp2p and where the two differ.

Since Logos Messaging is built on top of libp2p, they share a lot of concepts and terminologies between them. However, there are key differences between them that are worth noting.

## The basics

- Logos Messaging is built on top of libp2p, so the two share many concepts and terms.
- Unlike libp2p, Logos Messaging is a [service network](#logos-messaging-as-a-service-network) and a [turnkey solution](#logos-messaging-as-a-turnkey-solution).
- Logos Messaging adds [economic spam protection](#economic-spam-protection), which libp2p does not provide.

## Logos Messaging as a service network

Logos Messaging intends to incentivise mechanisms to run nodes, but it is not part of libp2p's scope. Additionally, users or developers do not have to deploy their infrastructure as a prerequisite to use Logos Messaging. It is a service network. However, you are encouraged to [run a node](../delivery/run-logos-delivery-node.md) to support and decentralise the network.

## Logos Messaging as a turnkey solution

Logos Messaging includes various protocols covering the following domains: privacy preservation, censorship resistance, and platform agnosticism, allowing it to run on any platform or environment.

Logos Messaging provides out-of-the-box protocols to enable mostly offline/resource-limited devices, [Store](./understand-logos-messaging-protocols.md#store)/[Light Push](./understand-logos-messaging-protocols.md#light-push)/[Filter](./understand-logos-messaging-protocols.md#filter) caters to those use cases.

## Economic spam protection

libp2p does not have strong spam protection guarantees, [RLN Relay](./understand-logos-messaging-protocols.md#rln-relay) is a protocol being developed by the Logos Messaging team towards this goal.
