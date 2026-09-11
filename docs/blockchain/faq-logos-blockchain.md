---
title: "FAQ: Logos Blockchain"
doc_type: concept
product: blockchain
topics: faq
authors: kashepavadan
owner: logos
doc_version: 1
slug: faq
sidebar_position: 6
---

# FAQ: Logos Blockchain

#### Review answers to less obvious questions about how the Logos Blockchain works and where it fits.

## How is the Logos Blockchain private if Mantle notes are public UTXOs?

It is important to distinguish between two distinct kinds of privacy that are possible on the [Logos Blockchain](../get-started/glossary.md#logos-blockchain): transaction privacy, and proposer privacy. Transaction privacy obscures transactions and other information published on-chain, preventing third parties from learning what exactly an individual did when interacting with the blockchain. On the other hand, proposer privacy hides the link between a proposed block and whoever proposed it: no observer can determine which participant is behind a given block, either before or after it's added to the chain. In other words, **transaction privacy hides the data published to the chain, while proposer privacy protects the people running the infrastructure**. The latter is particularly relevant for Proof of Stake blockchains, which select block proposers according to a schedule generated ahead of time.

Because the Logos Blockchain's Bedrock layer (which maintains the [Mantle ledger](concepts/about-mantle.md#mantle-ledger)) serves a resilient foundational layer for apps running on Logos Zones, it is designed primarily to protect the privacy of block proposers. If proposers could be identified or connected with transactions included in their blocks, they could become targets for coercion or denial of service attacks by hostile actors. Even when there is no credible threat of being targeted, block proposers without privacy could engage in cautionary self-censorship by excluding certain transactions, thereby compromising the neutrality of the entire network. Hiding proposer identity keeps that from happening regardless of how transparent the ledger is.

Transaction privacy needs different vastly for different use cases, and is therefore not provided directly by Bedrock. [Notes](../get-started/glossary.md#note) and their transfers are recorded openly on the ledger, similar to Bitcoin, and the Bedrock layer makes no attempt to hide that data. Developers that need to hide their app's data, such as balances or message contents, must implement their desired level of transaction privacy at the [Zone](concepts/about-zones.md) layer instead of relying on Bedrock for it. **Transaction privacy is supported natively on the [LEZ](../get-started/glossary.md#lez), in addition to public transactions**.

:::note
For more information on proposer privacy on Logos, see [Anonymous Block Proposers](https://blog.logos.co/article/anonymous-block-proposers).
:::

## Does the Blend Network always protect proposer privacy for everyone?

No, that protection depends on whether the proposer is a [core node](../get-started/glossary.md#core-node), and how many other core nodes are active in a given [epoch](../get-started/glossary.md#epoch). Only declared core nodes relay and blend messages, and their participation in Blend activity makes it hard to distinguish when they publish their own proposals. A block proposer that hasn't declared as a core node participates as an edge node instead, sending its proposal through core nodes for blending - an unusual activity that can be singled out and connected to broadcasted blocks by some attackers. If too few core nodes are active, all proposers fall back to broadcasting directly, with no Blend privacy for that epoch.

## If Bedrock doesn't interpret Zone data, what secures funds bridged into a Zone?

Correctness is the Zone's own responsibility, not Bedrock's. [Bedrock](concepts/about-bedrock.md) stores whatever state updates a [Zone](concepts/about-zones.md)'s sequencer inscribes without verifying their validity, so each Zone chooses its own correctness mechanism - publishing zero knowledge validity proofs, running a fraud-proof challenge window, or requiring its nodes to re-execute the state transition themselves. For bridged funds specifically, Bedrock enforces only one aggregate invariant: the total note value withdrawn from a Zone can never exceed the total value deposited into it. It doesn't verify that a withdrawal went to the correct account or that a Zone's internal accounting is honest - that guarantee comes entirely from whichever correctness mechanism the Zone itself implements.

On the LEZ, transactions are verified differently depending on if they're public or private. Public transactions are re-executed by LEZ validators, while private transactions involve the generation of zero knowledge proofs via Risc0, which are then verified by LEZ validators. 

## Does decentralised sequencing eliminate MEV on a Zone?

No, it distributes the opportunity for MEV extraction across a set of sequencers rather than removing it. When a Zone uses several sequencers, taking turns on a round-robin schedule or competing to publish first, no single sequencer can reliably capture all of the MEV available the way a single-sequencer rollup's operator could. A threshold of sequencers can also jointly sign a change to the sequencer list, letting an honest majority remove a malicious one.

## Why build on a Zone instead of launching an independent Layer 1?

Launching a new Layer 1 means bootstrapping its own validator set, economic security, and data availability from scratch, which a young chain typically struggles to do. Building as a [Zone](concepts/about-zones.md) instead lets an application keep full control over its own state and execution environment while relying on the Logos Blockchain for consensus guarantees and data availability it couldn't easily provide on its own. A Zone isn't locked into using Bedrock's other features to get this: it can run as a fully independent sovereign rollup, using Bedrock only for ordering and data availability, or opt into decentralised sequencing and token bridging for extra interoperability without giving up the sovereign rollup model's benefits.
