> Source: https://docs.logos.co/messaging/concepts/logos-delivery-and-libp2p
> Markdown index of all Logos docs: https://docs.logos.co/llms.txt

# Learn the differences between Logos Delivery and libp2p

#### Understand what Logos Delivery adds on top of libp2p and where the two differ.

> **Info**
>
> This document reflects the state of this Logos component as it will exist on mainnet. Some features described here may not be available on the current testnet.

Since [Logos Delivery](https://docs.logos.co/get-started/glossary.md#logos-delivery) is built on top of libp2p, they share a lot of concepts and terminologies between them. However, there are key differences between them that are worth noting.

## The basics

- Logos Delivery is built on top of libp2p, so the two share many concepts and terms.
- Unlike libp2p, Logos Delivery is an [open network](#logos-delivery-as-an-open-network) and a [turnkey solution](#logos-delivery-as-a-turnkey-solution).
- Logos Delivery adds [economic spam protection](#economic-spam-protection), which libp2p does not provide.

## Logos Delivery as an open network

Logos Delivery intends to incentivise mechanisms to run nodes, but it is not part of libp2p's scope. Additionally, users and developers can use Logos Delivery without deploying their own infrastructure, though anyone can choose to [run a node](https://docs.logos.co/messaging/delivery/run-delivery-node-from-cli.md) to help decentralise the network.

## Logos Delivery as a turnkey solution

Logos Delivery includes various protocols covering the following domains: privacy preservation, censorship resistance, and platform agnosticism, allowing it to run on any platform or environment.

Logos Delivery provides out-of-the-box protocols to enable [mostly offline](https://docs.logos.co/get-started/glossary.md#mostly-offline)/resource-limited devices, [Store](https://docs.logos.co/messaging/concepts/protocols.md#store)/[Light Push](https://docs.logos.co/messaging/concepts/protocols.md#light-push)/[Filter](https://docs.logos.co/messaging/concepts/protocols.md#filter) caters to those use cases.

## Economic spam protection

libp2p does not have strong spam protection guarantees, [RLN Relay](https://docs.logos.co/messaging/concepts/protocols.md#rln-relay) is a protocol being developed by the Logos Delivery team towards this goal.
