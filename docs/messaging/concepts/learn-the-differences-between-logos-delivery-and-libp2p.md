---
title: Learn the differences between Logos Delivery and libp2p
doc_type: concept
product: messaging
topics: libp2p, architecture
authors: LordGhostX, fryorcraken
owner: logos
doc_version: 1
slug: logos-delivery-and-libp2p
---

# Learn the differences between Logos Delivery and libp2p

#### Understand what Logos Delivery adds on top of libp2p and where the two differ.

Since [Logos Delivery](https://docs.logos.co/get-started/glossary#logos-delivery) is built on top of libp2p, they share a lot of concepts and terminologies between them. However, there are key differences between them that are worth noting.

## The basics

- Logos Delivery is built on top of libp2p, so the two share many concepts and terms.
- Unlike libp2p, Logos Delivery is a [service network](#logos-delivery-as-a-service-network) and a [turnkey solution](#logos-delivery-as-a-turnkey-solution).
- Logos Delivery adds [economic spam protection](#economic-spam-protection), which libp2p does not provide.

## Logos Delivery as a service network

Logos Delivery intends to incentivise mechanisms to run nodes, but it is not part of libp2p's scope. Additionally, users or developers do not have to deploy their infrastructure as a prerequisite to use Logos Delivery. It is a service network. However, you are encouraged to [run a node](../messaging/run-logos-delivery-node.md) to support and decentralise the network.

## Logos Delivery as a turnkey solution

Logos Delivery includes various protocols covering the following domains: privacy preservation, censorship resistance, and platform agnosticism, allowing it to run on any platform or environment.

Logos Delivery provides out-of-the-box protocols to enable [mostly offline](https://docs.logos.co/get-started/glossary#mostly-offline)/resource-limited devices, [Store](./understand-logos-delivery-protocols.md#store)/[Light Push](./understand-logos-delivery-protocols.md#light-push)/[Filter](./understand-logos-delivery-protocols.md#filter) caters to those use cases.

## Economic spam protection

libp2p does not have strong spam protection guarantees, [RLN Relay](./understand-logos-delivery-protocols.md#rln-relay) is a protocol being developed by the Logos Delivery team towards this goal.
