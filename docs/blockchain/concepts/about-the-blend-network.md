---
title: About the Blend Network
doc_type: concept
product: blockchain
topics: Blend Network
authors: kashepavadan
owner: logos
doc_version: 1
slug: about-the-blend-network
sidebar_position: 4
---

# About the Blend Network

#### Understand how the Blend Network hides the link between a block proposer and their proposal.

The [Blend Network](https://docs.logos.co/get-started/glossary#blend-network) adds a layer of anonymity for block proposers on top of [Cryptarchia](./about-cryptarchia.md), the Logos [Private Proof of Stake](https://docs.logos.co/get-started/glossary#private-proof-of-stake) consensus protocol. [Cryptarchia](https://docs.logos.co/get-started/glossary#cryptarchia) uses a private leadership election as a first line of defence against deanonymisation, but preventing adversaries from learning about proposers through network monitoring needs stronger obfuscation. The [Blend Protocol](https://docs.logos.co/get-started/glossary#blend-protocol) provides it: an anonymous broadcasting protocol that makes it hard to link a proposal to its proposer through network analysis. The Blend Network is the service made up of nodes that opt in to run the Blend Protocol, and those nodes are rewarded for participating.

## The basics

- The Blend Network adds anonymity for block proposers on top of Cryptarchia's Private Proof of Stake consensus.
- Proposals are wrapped in multiple layers of encryption and routed through random paths of nodes, each adding a random delay before forwarding.
- Nodes must explicitly opt in through the [Service Declaration Protocol](https://docs.logos.co/get-started/glossary#service-declaration-protocol) and prove ownership of a [note](https://docs.logos.co/get-started/glossary#note) with a minimum stake.

## Objectives

The main objective of the Logos Blend Network is to reduce the probability of linking a block proposal with its proposer, which also translates to increasing the difficulty of learning the proposer’s relative stake. At the same time, the Blend Protocol was designed to minimise bandwidth usage on the network compared to general-use mixnets, and to maximise decentralisation by involving all nodes in the obfuscation process. By doing so, the Blend Network increases the cost of attacking the network to deanonymise a block proposal without straining the network with high bandwidth usage.

The Blend Network supports the privacy of the [Logos Blockchain](https://docs.logos.co/get-started/glossary#logos-blockchain) as a whole, by providing additional anonymity to block proposers, protecting against [adversaries](https://gwern.net/doc/cs/security/2009-syverson.pdf) with both a complete (global) and partial (local) view of the Logos Blockchain. The anonymity provided by the Blend Network also substantially improves the privacy guarantees of Cryptarchia by making it even harder to learn a proposer’s relative stake - which would allow an attacker to estimate the likelihood of that node winning the leadership election.

## How the Blend Protocol works

The Blend Network makes it difficult to link a block proposer to their proposal by having the message travel between several nodes before being revealed. Blend nodes must maintain a minimum number of connections with other nodes, and cannot exceed a maximum frequency of messages they can send - putting an upper bound on bandwidth usage.

While dedicated participation in the Blend Network is reserved for declared Blend nodes, proposals can also be sent to it from regular Logos nodes. The following steps illustrate the process which a proposal message goes through before being broadcast and included in the chain.

1. The message sender selects a random path of nodes along which it will relay its message to the receiver, covering the message in layers of encryption for every node on the path.
2.  The sender sends the layered message to every [Blend node](https://docs.logos.co/get-started/glossary#blend-node) with which it maintains a peer-to-peer connection. This process, known as dissemination, is shown below.

    ![The Blend Network using dissemination to relay proposal messages. Peer-to-peer relaying of messages is not shown for simplicity.](../assets/about-the-blend-network/dissemination.png)

3. When a Blend node receives a message, it checks that the message is unique and has not yet been seen, relaying it to its own peers. This ensures that every message is ultimately disseminated to the entire network.
4. A Blend node that receives a message will also attempt to decrypt the message. If it is able to decrypt the outer layer of a message it receives, it relays this decrypted message (after a randomised delay) to its peers for the next node in the path to receive and decrypt.
5. When the receiver finally receives its message, it decrypts this message and is able to retrieve the original payload. This payload is then broadcast to the Logos Blockchain as a block proposal.

This process of hiding messages under several layers of encryption and randomly delaying their propagation at each stage of dissemination is known as message blending. When a message is disseminated to all nodes, observers cannot determine which node was the intended receiver, even if they can identify the sender. Due to the layered encryption, observers also cannot determine which "hop" of the relay process the message is currently on. This decryption at each node in the path transforms messages, so the incoming and outgoing messages cannot be linked together based on their content.

Random delays are the other component of message blending. If messages are rare (as in a low bandwidth network like the Blend Network), then an observer may be able to link even encrypted messages if they are disseminated in close succession. To prevent this, every message is assigned a random delay by the node processing it, with each message being released in the order it is received once its delay period has passed. This ensures that incoming and outgoing messages cannot be linked together based on their timing.

## Cover traffic

An important way that the Blend Network obscures network patterns is by producing indistinguishable messages within a "crowded" network. To increase this effect in an environment where proposals are relatively rare, the Blend Network also produces artificial cover messages. Cover messages do not contain any meaningful payload and are generated by Blend nodes to increase network noise and to blend in with data messages that contain real proposals.

Cover messages mimic the behaviour of data messages, in that they are disseminated and processed by Blend nodes in the same manner. Blend nodes repeatedly encrypt random payload data to generate a cover message, which is then relayed to the next node in its selected path via dissemination. At each step in the transmission process, intended nodes decrypt, randomly delay, and disseminate cover messages without any indication that they may not be genuine. In fact, encrypted data and cover messages are completely indistinguishable even to adversary-controlled Blend nodes (a type of local observer). The hiding effect provided by [cover traffic](https://docs.logos.co/get-started/glossary#cover-traffic) is illustrated in the diagram below.

![Disseminated Blend Network cover traffic (dotted lines) obscuring a data message (solid lines).](../assets/about-the-blend-network/cover-traffic-hiding-effect.png)

_Disseminated Blend Network cover traffic (dotted lines) obscuring a data message (solid lines)._

To avoid the network getting congested with too much message traffic, the Blend Network places a quota limiting the number of cover messages produced by each node, as well as the number of nodes in the path of each cover and data message. Adherence to this quota is verified via a zero knowledge proof.

## Participating in the Blend Network

Participation in the Blend Network is more complex than running a [Logos node](https://docs.logos.co/get-started/glossary#logos-node). The protocol relies on an agreed-upon sets of active participants to ensure its correct operation, as Blend nodes must keep track of connections to other Blend nodes for message relaying. As a result, it is not possible to allow dynamic participation in the Blend Network as it exists for [Bedrock](https://docs.logos.co/get-started/glossary#bedrock). Participation in the Blend Network is therefore not incumbent upon a node unless it opts in.

### Service Declaration Protocol

Logos nodes that choose to participate in the Blend Network explicitly declare their intent by using the Service Declaration Protocol ([SDP](https://docs.logos.co/get-started/glossary#sdp)). The goal of the SDP is to create a single repository of identifiers to determine which nodes have opted into the Blend Network at a given time.

The SDP provides a standardised mechanism for Logos nodes to declare their participation, demonstrate activity, and withdraw when desired. It operates around a schedule measured by consensus epochs. This protocol creates a single repository of identifiers used to establish secure communication between nodes and manage service participation.

The SDP consists of three basic steps, each of which represents a type of message sent by a participating node to [Mantle](./about-mantle.md):

- Declare: A node elects to participate in a given service.
- Active: To continue participating, the node must regularly send an "active" message. Nodes that have not sent an active message for a prolonged period of time have their declarations withdrawn.
- Withdraw: A node withdraws its declaration and stops providing a service.

To submit a service declaration, a node must prove that it owns a note with a service-dependent minimum stake value. This note is locked for the duration of the declaration, but remains eligible for consensus leadership. The stake requirement makes service declarations sufficiently expensive to avoid spamming or Sybil attacks. Nodes participating in services are assigned addresses (known as locators) based on the [Multiaddr scheme](https://docs.libp2p.io/concepts/fundamentals/addressing/), allowing them to communicate securely while engaging in a service.

### Service Reward Distribution Protocol

The [Service Reward Distribution Protocol](https://docs.logos.co/get-started/glossary#service-reward-distribution-protocol) ([SRDP](https://docs.logos.co/get-started/glossary#srdp)) enables deterministic, efficient, and verifiable reward distribution to nodes based on their participation in Bedrock Services. Like the SDP, it also operates around epochs. The SRDP process unfolds over three key phases, distributing rewards based on node activity from previous epochs. These phases are:

- Activity tracking: Nodes participating in services submit active messages to attest to their participation in the previous [epoch](https://docs.logos.co/get-started/glossary#epoch).
- Reward calculation: At the end of the epoch, the system calculates rewards for nodes that participated in the previous epoch.
- Reward distribution: Starting immediately after the epoch when activity messages are submitted, rewards are gradually distributed to active service nodes. Each block includes one [Mantle](https://docs.logos.co/get-started/glossary#mantle) transaction that can distribute rewards to up to four nodes.

The selection of nodes receiving rewards in each block follows a deterministic, pseudo-random process based on the Cryptarchia epoch randomness from the start of the epoch. This approach ensures fairness and prevents manipulation of the distribution order.
