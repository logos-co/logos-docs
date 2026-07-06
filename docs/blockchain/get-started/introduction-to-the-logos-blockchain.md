---
title: Introduction to the Logos Blockchain
doc_type: concept
product: blockchain
topics: blockchain
authors: kashepavadan
owner: logos
doc_version: 1
slug: introduction-to-the-logos-blockchain
---

# Introduction to the Logos Blockchain

#### Learn how Logos provides a private, resilient foundation for decentralised applications.

The [Logos Blockchain](https://docs.logos.co/get-started/glossary#logos-blockchain) is the foundational infrastructure of the Logos technology stack. It hosts decentralised applications and social institutions that require high privacy and resilience, gives those applications a common context for interaction, and guarantees they operate correctly and without corruption. Nodes can participate with consumer hardware and any amount of stake.

## The basics

* The Logos Blockchain is designed to decentralised applications and institutions that require high levels of privacy and resilience.
* Nodes can join with typical consumer hardware and any amount of stake, which keeps participation barriers low.
* Logos Blockchain consists of two layers: lightweight, permissionless blockchains called [Zones](../concepts/about-zones.md) built on top of a Layer 1 foundation called [Bedrock](../concepts/about-bedrock.md). The [Blend Network](../concepts/about-the-blend-network.md) service is used to improve the privacy of the network.

## Design principles

The Logos Blockchain was designed around three principles: privacy, neutrality, and resilience.

Privacy means the network protects information about all participants, regardless of their role. At the infrastructure level, nodes can propose blocks with a very low probability of being traced. Logos also gives developers tools to build applications with programmable privacy, so those applications can keep personal data hidden.

Neutrality means activity is handled without compromising the public neutrality of nodes. Nodes can process transactions without having to make their inclusion public.

Resilience means the network stays operational and protects privacy under difficult conditions, including a partitioned internet, heavy censorship, and hostile government action. Running a node is meant to be easy enough to do on a laptop, which attracts more nodes and reduces points of failure. A consensus protocol that prioritises liveness lets the network keep operating in the worst conditions.

## Architecture

The Logos Blockchain is implemented as two blockchain layers. Application execution happens on lightweight, permissionless blockchains called [Zones](../concepts/about-zones.md), which are built on a Layer 1 foundation called [Bedrock](../concepts/about-bedrock.md). The [Blend Network](../concepts/about-the-blend-network.md) service extends [Bedrock](https://docs.logos.co/get-started/glossary#bedrock)'s privacy properties.

### Bedrock

Bedrock is a large-scale validator network that serves as the foundational layer of the Logos Blockchain. It provides consensus, data availability, and lightweight verification to Zones. Its [Private Proof of Stake](https://docs.logos.co/get-started/glossary#private-proof-of-stake) ([PPoS](https://docs.logos.co/get-started/glossary#ppos)) consensus protocol, [Cryptarchia](../concepts/about-cryptarchia.md), keeps block proposers private while staying scalable, resilient, and accessible. Bedrock also enables decentralised sequencing for Zones, token bridging, and inter-[Zone](https://docs.logos.co/get-started/glossary#zone) messaging.

Running a Bedrock validator node means leaving the [Logos node](https://docs.logos.co/get-started/glossary#logos-node) application running in the background, with a low-maintenance approach. This makes it straightforward to contribute to the security, consensus, and interoperability of the network.

### Blend Network

The [Blend Network](https://docs.logos.co/get-started/glossary#blend-network) is an opt-in service that provides network-level privacy for consensus. It virtually eliminates the chance of linking a block proposer to the block they propose, so proposers cannot be targeted. Operators who join the Blend Network need more hardware than Bedrock validation alone requires.

### Zones

Applications do not run directly on Bedrock. They run on Layer 2 blockchains called [Zones](../concepts/about-zones.md), which define their own state transitions and validity but rely on Bedrock for consensus guarantees. This modular design lets creators customise a chain and maximise properties such as performance.

Zones can run as fully independent sovereign rollups, but Bedrock also enables token bridging and decentralised sequencing. Zones can exchange asynchronous messages through Bedrock, which allows limited interoperability without giving up the advantages of the sovereign rollup model.

The primary example is the [Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md), the initial host for the messaging and storage applications of the Logos stack, with support for private token transfers and [program](https://docs.logos.co/get-started/glossary#program) execution.
