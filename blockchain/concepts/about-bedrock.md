> Source: https://docs.logos.co/blockchain/concepts/about-bedrock
> Markdown index of all Logos docs: https://docs.logos.co/llms.txt

# About Bedrock

#### Understand how Bedrock provides the consensus and shared context that Zones build on.

> **Info**
>
> This document reflects the state of this Logos component as it will exist on mainnet. Some features described here may not be available on the current testnet.

The [Bedrock](https://docs.logos.co/get-started/glossary.md#bedrock) layer is the basis on top of which the broader [Logos Blockchain](https://docs.logos.co/get-started/glossary.md#logos-blockchain) is built, operating as a large and decentralised peer-to-peer blockchain network. Bedrock functions as a solid foundation for [Zones](https://docs.logos.co/blockchain/concepts/about-zones.md) built on Logos, allowing Zone applications to leverage the Logos Blockchain's consensus guarantees. Bedrock also supports interoperability between Zones and Bedrock itself with support for asynchronous messaging and token bridging. By handling the logic allowing several parties to participate in sequencing a Zone, Bedrock contributes to the decentralisation of the Logos stack.

## The basics

- Bedrock is the foundational layer of the Logos Blockchain, operating as a decentralised peer-to-peer network.
- Bedrock provides consensus on transaction ordering to Zones, as well as a common context for Zone interaction.
- Participation in Bedrock is credibly neutral and private, ensuring open access for all participants.

## Bedrock components

Bedrock is organised into three key components. The most basic of these is the peer-to-peer network that allows [Logos nodes](https://docs.logos.co/get-started/glossary.md#logos-node) to communicate with each other in a decentralised way.

### Cryptarchia

On top of the peer-to-peer network sits [Cryptarchia](https://docs.logos.co/blockchain/concepts/about-cryptarchia.md), the Logos Blockchain’s consensus protocol used to reach an agreement about the state of the blockchain. As a [Private Proof of Stake](https://docs.logos.co/get-started/glossary.md#private-proof-of-stake) ([PPoS](https://docs.logos.co/get-started/glossary.md#ppos)) protocol, Cryptarchia gives all participants a proportional chance to propose a block, while making it infeasible to link blocks to their proposers both before and after the proposal.

### Mantle

[Mantle](https://docs.logos.co/blockchain/concepts/about-mantle.md), a Bedrock component that serves as the operating system of the Logos Blockchain, provides a minimal shared execution environment for Zones that allows them to interact with Bedrock. This includes operations like writing data to the blockchain, as well as a restricted ledger of [notes](https://docs.logos.co/get-started/glossary.md#note) to support [mining](https://docs.logos.co/get-started/glossary.md#mining), payments, and staking.

Zones make use of Mantle operations when posting their updates to the Logos Blockchain, as well as to communicate asynchronously with other Zones. Mantle ensures that Zones state updates are correctly ordered via the use of Logos [channels](https://docs.logos.co/get-started/glossary.md#channel). Logos channels also allow for several sequencers to sequence a Zone, and enable token bridging between Zones and Bedrock.
