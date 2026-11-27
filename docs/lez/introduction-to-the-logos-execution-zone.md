---
title: Introduction to the Logos Execution Zone
doc_type: concept
product: blockchain
topics: lez
authors: kashepavadan
owner: logos
doc_version: 1
slug: /lez
sidebar_position: 0
---

# Introduction to the Logos Execution Zone

#### Understand how the Logos Execution Zone runs general-purpose applications with selective privacy.

:::info
This document reflects the state of this Logos component as it will exist on mainnet. Some features described here may not be available on the current testnet.
:::

The [Logos Execution Zone](../get-started/glossary.md#logos-execution-zone) ([LEZ](../get-started/glossary.md#lez)) is the primary execution layer for applications built on the Logos stack. It is implemented as a [Zone](../blockchain/concepts/about-zones.md) on the [Logos Blockchain](../get-started/glossary.md#logos-blockchain) and uses zero knowledge proofs to ensure the correctness of its operations. The LEZ runs a Risc0-based virtual machine, the [Logos Execution Environment](../get-started/glossary.md#logos-execution-environment) ([LEE](../get-started/glossary.md#lee)), which separates state into public and private components that LEE programs can use and modify seamlessly. This selective privacy lets developers write generic programs while the LEE enforces privacy and correctness.

## The basics

- The LEZ is the flagship Zone for general-purpose applications on Logos, with built-in support for private execution.
- The LEZ separates state into public and private accounts. Public executions are validated by re-execution, and private executions are proven with zero knowledge proofs.
- The LEZ supports applications with high transaction throughput, and inscribes its state updates on the Logos Blockchain through the LEZ [channel](../get-started/glossary.md#channel).

## Accounts Model

To achieve separation between public and private state while allowing for full programmability, the LEE uses a stateless [program](../get-started/glossary.md#program) model. Under this model, all persistent data is stored in accounts, which can be either public or private. Public accounts are stored on-chain as a map between the [account](../get-started/glossary.md#account) ID and its associated state (such as a token balance). A [public account](../get-started/glossary.md#public-account) owner’s private key signs transactions and authorises executions, while the derived account ID is publicly visible on-chain.

[Private accounts](../get-started/glossary.md#private-account), by contrast, are stored locally on the account-holder’s node, which publishes [commitments](https://en.wikipedia.org/wiki/Commitment_scheme) to the account state onto the chain whenever the state is updated. The latest commitment binds the current account state to the chain without revealing its data, while nullifiers for previous commitments ensure that old commitments are not used for program execution.

For more information about the LEE program model, see [About the LEE program model](./concepts/about-the-lee-program-model.md).

## LEZ Node Architecture

The LEZ operates as a Zone, with updates to its state (both public and private) inscribed on the Logos Blockchain. The LEZ is sequenced in a decentralised manner by a permissioned set of sequencer nodes, who take turns posting the latest updates to the LEZ channel on [Mantle](../blockchain/concepts/about-mantle.md). In addition to the sequencers, the LEZ relies on a network of validators that anyone can join, which update the Zone state by transparently executing programs (for public executions) or by verifying zero knowledge proofs of correct state transitions (for private executions). Anybody can join the validator network and contribute to the correctness of the LEZ state, submitting the latest state to an LEZ sequencer to post on the blockchain. The LEZ also supports read-only indexer nodes that follow the LEZ channel for purposes such as block exploration and development.

## Use Cases

The LEZ is a ready-made execution environment for privacy-preserving applications built using the Logos stack. Since the same LEE program can be executed over both public and private accounts, computationally costly private executions can be used only when necessary to speed up execution. Together with Solana-style parallel execution, this feature makes the LEZ uniquely suited to applications requiring high throughput as well as private application state.

As an example, the LEZ could be used by users to run private DeFi applications. With support for privacy built-in, the LEZ could be used to build protocols where transaction details, user balances, or trading strategies are kept private by default, only revealing necessary information to authorised parties. This is especially so when high volumes of transactions are expected by these applications. Examples may include:

- Private Exchanges: Trading platforms where order books or individual trades are obscured.
- Private Lending/Borrowing Protocols: Financial services where loan details or collateral information are private.
- Private Transfers: Securely sending and receiving digital assets with transaction details kept private using zero knowledge proofs, ensuring financial privacy for individuals and businesses.
