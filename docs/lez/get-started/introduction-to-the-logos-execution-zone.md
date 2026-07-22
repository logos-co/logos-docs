---
title: Introduction to the Logos Execution Zone
doc_type: concept
product: blockchain
topics: Logos Execution Zone
authors: kashepavadan
owner: logos
doc_version: 1
slug: introduction-to-the-logos-execution-zone
sidebar_position: 1
---

# Introduction to the Logos Execution Zone

#### Understand how the Logos Execution Zone runs general-purpose applications with selective privacy.

The [Logos Execution Zone](https://docs.logos.co/get-started/glossary#logos-execution-zone) ([LEZ](https://docs.logos.co/get-started/glossary#lez)) is the primary execution layer for applications built on the Logos stack. It is implemented as a [Zone](../../blockchain/concepts/about-zones.md) on the [Logos Blockchain](https://docs.logos.co/get-started/glossary#logos-blockchain) and uses zero knowledge proofs to ensure the correctness of its operations. The LEZ runs a Risc0-based virtual machine, the [Logos Execution Environment](https://docs.logos.co/get-started/glossary#logos-execution-environment) ([LEE](https://docs.logos.co/get-started/glossary#lee)), which separates state into public and private components that LEE programs can use and modify seamlessly. This selective privacy lets developers write generic programs while the LEE guarantees privacy and correctness.

## The basics

- The LEZ is the flagship [Zone](https://docs.logos.co/get-started/glossary#zone) for general-purpose applications on Logos, with built-in support for private execution.
- The LEZ separates state into public and private accounts. Public executions are validated by re-execution, and private executions are proven with zero knowledge proofs.
- The LEZ supports applications with high transaction throughput, and inscribes its state updates on the Logos Blockchain through the LEZ [channel](https://docs.logos.co/get-started/glossary#channel).

## Accounts Model

To achieve separation between public and private state while allowing for full programmability, the LEE uses a stateless [program](https://docs.logos.co/get-started/glossary#program) model. Under this model, all persistent data is stored in accounts, which can be either public or private. Public accounts are stored on-chain as a map between the [account](https://docs.logos.co/get-started/glossary#account) ID and its associated state (such as a token balance). A [public account](https://docs.logos.co/get-started/glossary#public-account) owner’s private key signs transactions and authorises executions, while the derived account ID is publicly visible on-chain.

Private accounts, by contrast, are stored locally on the account-holder’s node, which publishes [commitments](https://en.wikipedia.org/wiki/Commitment_scheme) to the account state onto the chain whenever the state is updated. The latest commitment binds the current account state to the chain without revealing its data, while nullifiers for previous commitments ensure that old commitments are not used for program execution. Private accounts are created with two associated key pairs.

-  [Nullifier keys](https://docs.logos.co/get-started/glossary#nullifier-keys): The private nullifier key is used by the account owner to sign transactions and authorise executions. The public nullifier key is used as the account ID for verifying ownership.
-  [Viewing keys](https://docs.logos.co/get-started/glossary#viewing-keys): The private viewing key is used by the account owner to create ZK proofs. The public viewing key is used to verify proofs without revealing the account owner.

:::info
A program must obtain a [private account](https://docs.logos.co/get-started/glossary#private-account)’s [nullifier public key](https://docs.logos.co/get-started/glossary#nullifier-public-key), as well as its [viewing public key](https://docs.logos.co/get-started/glossary#viewing-public-key), in order to modify a private account state. Therefore, you cannot transfer tokens to a private account without being provided this information by the owner.
:::

When an LEE program executes, it modifies the accounts provided to it. These accounts could be either public or private, as an LEE program can be executed over both types of accounts. In either case, the program is executed using the same bytecode, the main difference being whether the user who runs a program will generate a zero knowledge proof. Executions modifying public accounts are executed transparently by LEZ validators like any standard RISC-V VM call. On the other hand, private executions involve the generation of zero knowledge proofs via Risc0, which are then verified by LEZ validators. 

## LEZ Node Architecture

The LEZ operates as a Zone, with updates to its state (both public and private) inscribed on the Logos Blockchain. The LEZ is sequenced in a decentralised manner by a permissioned set of sequencer nodes, who take turns posting the latest updates to the LEZ channel on [Mantle](../../blockchain/concepts/about-mantle.md). In addition to the sequencers, the LEZ maintains an open network of validators, which update the Zone state by transparently executing programs (for public executions) or by verifying zero knowledge proofs of correct state transitions (for private executions). Anybody can join the validator network and contribute to the correctness of the LEZ state, submitting the latest state to an LEZ sequencer to post on the blockchain. The LEZ also supports read-only indexer nodes that follow the LEZ channel for purposes such as block exploration and development.

## Use Cases

The LEZ is a ready-made platform for privacy-preserving applications built using the Logos stack. Since the same LEE program can be executed over both public and private accounts, computationally costly private executions can be used only when necessary to speed up execution. Together with Solana-style parallel execution, this feature makes the LEZ uniquely suited to applications requiring high throughput as well as private application state.

As an example, the LEZ could be used to host private DeFi applications. With support for privacy built-in, the LEZ could be used to build protocols where transaction details, user balances, or trading strategies are kept confidential by default, only revealing necessary information to authorised parties. This is especially so when high volumes of transactions are expected by these applications. Examples may include:

- Private Exchanges: Trading platforms where order books or individual trades are obscured.
- Confidential Lending/Borrowing Protocols: Financial services where loan details or collateral information are private.
- Confidential Transfers: Securely sending and receiving digital assets with transaction details obscured using zero knowledge proofs, ensuring financial privacy for individuals and businesses.

:::tip
Check out the tutorial on how to create your own [Automated Market Maker (AMM) trading pool](../../build-an-app/tutorials/create-and-use-an-amm-liquidity-pool-on-the-logos-execution-zone.md) program on the LEZ.
:::
