---
title: About Mantle
doc_type: concept
product: blockchain
topics: Mantle
authors: kashepavadan
owner: logos
doc_version: 1
slug: about-mantle
---

# About Mantle

#### Understand how Mantle lets nodes and Zones interact with Bedrock.

Mantle is a Bedrock component that serves as the operating system of Logos. It provides operations that allow nodes to participate in the [Blend Network](about-the-blend-network.md), as well as to enable [Zones](about-zones.md) to interact with Bedrock. Mantle is also responsible for handling Logos notes, which are Bedrock-native fungible tokens.

## The basics

- Mantle serves as Bedrock's execution layer, enabling nodes to participate in Bedrock Services and facilitating interactions between Zones and Bedrock.
- Mantle maintains a limited ledger for fee payment, tracking fungible assets called notes with UTXO-based transactions.
- Mantle supports channels, which enforce immediate transaction ordering for Zones and facilitate decentralized sequencing and token bridging.

## Operations and transactions

Mantle operations are the way Logos nodes interact with Bedrock Services, and allow Zones to interact with Bedrock. Operations are submitted to Mantle via transactions, with each transaction potentially including several operations. The cost of executing operations is paid for by gas fees, denoted in [notes](about-mantle.md#mantle-ledger). All Logos nodes re-execute Mantle operations independently to ensure that the ledger state is updated correctly.

Logos nodes use Mantle operations to indicate their participation in the Blend Network, with Mantle providing a locking mechanism used to incentivize correct behavior by participants. The operations supported by Mantle include transferring notes, staking notes for participation in the Blend Network, paying rewards to compensate participants, and unstaking notes.

Inscription operations can be used to write arbitrary data to the Logos Blockchain, enabling a variety of ways to leverage the blockchain as a permanent, decentralized record. Crucially, Mantle can be used as a censorship resistant message delivery mechanism for Zones, allowing Zone sequencers to send information to each other and engage in coordinated action. This form of message passing facilitates cross-Zone interaction including arranging atomic transactions and state updates.

## Mantle ledger

Mantle maintains a restricted ledger that keeps track of fungible assets known as notes, which are bound to their owners. Notes are primarily used to pay for Mantle operations, but can also be bridged to equivalent Zone tokens. Mantle notes are stored by Logos nodes in a dictionary mapping notes to their unique note identifiers.

Note transfers are effected by using transfer operations, which are based on the UTXO model. To transfer value, a sender spends their note and creates an equivalent new note belonging to the recipient. A spent note can never be spent again. These notes each have their own secret key for spending, and a corresponding public key for receiving new notes.

## Logos channels

Logos channels, or channels for short, are lightweight virtual chains overlaid on top of the Logos Blockchain. The purpose of channels is to immediately enforce the correct ordering of transactions from Zones. These channels are implemented as permissioned, ordered logs of messages signed by a sequencer. These messages usually take the form of state updates from a particular Zone. Channels also provide several key features to Zones, which are described below.

### Immediate ordering

Logos channels ensure that their transactions will eventually be included on-chain in the correct order, regardless of how the Logos Blockchain may fork or reorganize. This allows new transactions that depend on earlier ones to be submitted immediately, without waiting for finality. An example with two channels is shown below:

![A diagram illustrating how two channels are included in the Logos Blockchain.](../.gitbook/assets/about-mantle-two-channels.png)

_A diagram illustrating how two channels are included in the Logos Blockchain._

It is important to note that Logos channels can only be relied on if the sequencer is trusted to act honestly. In the absence of this assumption, users must wait for the true blockchain finality.

### Decentralized sequencing

A channel may have one or several sequencers; in the latter case, authorized sequencers may take turns publishing messages according to a round-robin schedule, with unresponsive sequencers losing their turn via an automated timeout. Alternatively, sequencers can compete to update the Zone state via a "first write wins" model.

A given threshold of sequencers may also modify the sequencer list or change other channel properties by signing a message together, allowing an honest majority to remove a malicious sequencer. This form of decentralized Zone sequencing distributes the potential for MEV extraction across a set of parties rather than concentrating it as in the single-sequencer rollup design.

### Token bridging

Logos channels also enable token bridging and inter-Zone token transfers for Zones via the use of token balances. A channel’s balance represents the total token value bridged to that Zone, which increases when an equivalent-value note is destroyed on Mantle as part of a deposit operation. Conversely, a new Mantle note is created when a Zone token balance is decreased as a result of a withdrawal operation. Logos channel balances can also be used to effect atomic token transfers between Zones.

### Cross-Zone messaging

Since channel messages can include arbitrary data and are publicly visible, they can also be used for asynchronous or synchronous messaging. Used as a messaging platform, Logos channels can be used to coordinate action between sequencers of a single channel, for example to agree to sign a message modifying the sequencer list. They can also be used to arrange action across several Zones, such as atomic token transfers or other coordinated state transitions.
