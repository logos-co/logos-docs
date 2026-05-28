---
title: About Logos Zones
doc_type: concept
product: blockchain
topics: zonez
authors: kashepavadan
owner: logos
doc_version: 1
slug: about-logos-zones
---

# About Logos Zones

#### Understand how Zones run custom, high-performance applications on the Logos Blockchain.

Zones are customisable, high-performance blockchains for applications built on Logos. A Zone defines its own state and execution environment, while relying on the Logos Blockchain for consensus and data availability. Zones can also use optional [Bedrock](#about-bedrock.md) features such as token bridging and cross-Zone messaging. A sequencer updates a Zone's state by submitting state updates to the blockchain. Zones suit applications that need speed and customisation more than they need interoperability.

## The basics

- A Zone defines its own state and execution environment, while the Logos Blockchain provides consensus and data availability.
- A sequencer, or a committee of sequencers, handles a Zone's transactions and submits state updates to the blockchain.
- Zones can use tokens bridged from Bedrock and support cross-Zone transactions.

## How Zones work

Zones let developers build performant applications with the freedom to define an execution environment that suits their needs, while the Logos Blockchain provides economic security and data availability that a Zone could not provide on its own. [Bedrock](#about-bedrock.md) does not interpret Zone data. Instead, it provides operations through [Mantle](#about-mantle.md) that let Zone sequencers inscribe their state updates permanently to the blockchain.

Unlike Ethereum Layer 2s, Zones do not rely on a smart contract on the Layer 1 to ensure the correctness of their state. A Zone can ensure correctness in several ways, including publishing zero knowledge validity proofs for its validators to verify, providing a challenge window for fraud proofs, or requiring Zone nodes to re-execute the state transition function.

## Additional Features

The Zone model described above is very similar to that of conventional [Sovereign Rollups ↗](https://dba.xyz/rollups-are-l1s-l2s-a-k-a-how-rollups-actually-actually-actually-work/?ref=blog.nomos.tech). In fact, Zones can be built as pure sovereign rollups, with Bedrock only used for ordering and data availability guarantees. However, Bedrock also provides some optional functionality that somewhat increases the decentralisation and interoperability of Zones without significantly compromising the benefits of the sovereign rollup design. 

### Decentralised Sequencing

While a Zone can be implemented with just one sequencer updating the Zone state, this design allows the sequencer to take full advantage of any MEV and represents a centralised point of failure. On Logos, it is also possible to distribute sequencing rights to a permissioned set of parties. These sequencers can compete to be the first to publish the next state update, or take turns sequencing the Zone according to a round-robin schedule. This latter model provides more Bedrock-level protections for Zone users, including an automated timeout for unresponsive sequencers. Decentralised sequencing also allows a given threshold of sequencers to update the sequencer list to remove a malicious sequencer. All these operations are handled by Logos channels.

### Token Bridging

Users can also take advantage of built-in token bridging to transfer value between Bedrock and Zones. A Zone’s associated channel maintains a token balance, which keeps track of the total token value stored in the Zone. This balance is updated as value is deposited to or withdrawn from a Zone, with notes of equivalent value destroyed or created on Bedrock as a result of these operations.

Note that it is the Zone’s responsibility to ensure that token transfers are executed correctly within its own state. Bedrock only ensures that the total token value withdrawn from a Zone does not exceed the value deposited.

### Asynchronous Messaging

Zone sequencers can use channels to submit messages with arbitrary data, allowing them to communicate on-chain with other sequencers. Sequencers can use these messages to coordinate actions with other sequencers of the same Zone, for example to agree to sign a message modifying the sequencer list. They can also be used to arrange action across several Zones, such as atomic token transfers or other coordinated state transitions. In the latter case, sequencers must interpret all new messages and determine whether the message is directed to them. The Logos Blockchain provides a suggested message standard to make it easier for sequencers to interpret messages from other Zones, but anybody can define their own standard if they so desire.

# Use Cases

Zones can implement almost anything, ranging from applications to virtual machines that are home to many different applications. They are best suited for applications that require high performance and do not need strong interoperability.

## Logos Execution Zone

The [Logos Execution Zone (LEZ)](#about-the-logos-execution-zone.md) is the flagship Zone on the Logos Blockchain. It serves as the home for applications built using the complete Logos stack, including its messaging and storage modules. It also provides support for private accounts and program execution, with the state being verified via zero knowledge proofs. For more information about the Logos Execution Zone, see the page below:

## Other Uses

In addition to the LEZ, anybody can make aZone on Logos. The Logos Team has already prepared a [Zone SDK ↗](https://github.com/logos-blockchain/logos-blockchain/tree/master/zone-sdk) that makes it easy to build a Logos Zone. Some possibilities of Sovereign Zone applications include:

- Self-Sovereign Digital Nations/Communities: Logos Blockchain can power the core identity, communication, and governance layers for nascent digital nations. This would involve:
    - Self-Sovereign Identity (SSI) Solutions: Users can control their digital identities and share verifiable credentials privately and selectively.
    - Secure Communication Channels: The Logos ecosystem provides encrypted and censorship-resistant collaboration tools for citizens of network states.
    - Decentralised Justice Systems: Building frameworks for dispute resolution and legal agreements within a network state, potentially leveraging zero-knowledge proofs for privacy.
- Gaming Applications: Games often rely on rapid state changes to function correctly, making them ideal for implementation as Zone applications on Logos.
- Small-scale Networked Applications: Networked applications can use the Logos Blockchain to store their state updates on-chain, with users recreating the state locally based on these updates. This makes the Logos Blockchain a low cost, easy alternative for self-hosting - especially for small-scale applications.
