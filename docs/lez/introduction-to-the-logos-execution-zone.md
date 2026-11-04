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

[Private accounts](../get-started/glossary.md#private-account), by contrast, are stored locally on the account-holder’s node, which publishes [commitments](https://en.wikipedia.org/wiki/Commitment_scheme) to the account state onto the chain whenever the state is updated. The latest commitment binds the current account state to the chain without revealing its data, while nullifiers for previous commitments ensure that old commitments are not used for program execution. Private accounts are created with three types of associated keys:

- [Nullifier keys](../get-started/glossary.md#nullifier-keys): The [nullifier secret key](../get-started/glossary.md#nullifier-secret-key) is used inside the ZK proof to produce the nullifier that marks the previous state commitment as spent. Together with the [viewing secret key](../get-started/glossary.md#viewing-secret-key) (or decrypted account state), a holder of the nullifier secret key can effect account updates where authorisation is not required. The [nullifier public key](../get-started/glossary.md#nullifier-public-key), together with the public viewing key and an identifier, derives the account ID.
- [Viewing keys](../get-started/glossary.md#viewing-keys): The [viewing public key](../get-started/glossary.md#viewing-public-key) is used by anyone updating the account to encrypt its new state for the owner. The viewing secret key lets its holder decrypt and read that state. Together with the nullifier secret key, a holder of the nullifier secret key can effect account updates where authorisation is not required.
- [Authorisation secret key](../get-started/glossary.md#authorisation-secret-key): The authorisation secret key allows the account owner to effect authorised updates to the account state. Whether an update requires authorisation is determined by the program that executes the change.

:::info
The owner of a private account can selectively share their nullifier secret key and viewing secret key (or decrypted account state) with other parties to delegate certain tasks, while keeping the authorisation secret key private. For example, heavy proving of account updates can be outsourced to third parties, while important updates, such as native token transfers, will not be executable except by the account owner.
:::

### How programs update account state

When an LEE program executes, it modifies the accounts provided to it. These accounts could be either public or private, as an LEE program can be executed over both types of accounts. In either case, the program is executed using the same bytecode, the main difference being whether the user who runs a program will generate a zero knowledge proof. Executions modifying public accounts are executed transparently by LEZ validators like any standard RISC-V VM call. On the other hand, private executions involve the generation of zero knowledge proofs via Risc0, which are then verified by LEZ validators.

Account data is split up into a map of distinct portions known as *[shards](../get-started/glossary.md#shard)*, each of which is keyed specific program ID. As discussed in greater detail below, a program can only modify the data in its assigned shard, creating a new one if none exists. This way of organising account state requires a two-step update process:

- **Plan**: sees the instruction and a list of account handles, but no account data. It turns the instruction into several types of intents:
    1. Desired changes to account state, known as *effects*. Each effect operates on one shard.
    1. Inspect another shard via a read-only effect from another program.
    1. Chained calls to other programs.
    1. Events for off-chain indexers.
- **Apply**: applies one effect to exactly one shard of one account, and sees nothing else.

This incremental process for updating account state ensures that a malicious program cannot modify data that does not belong to it, that callers of other programs cannot pass in outdated or forged values, and that concurrent updates of an account from two different transactions can execute correctly.

## LEZ Node Architecture

The LEZ operates as a Zone, with updates to its state (both public and private) inscribed on the Logos Blockchain. The LEZ is sequenced in a decentralised manner by a permissioned set of sequencer nodes, who take turns posting the latest updates to the LEZ channel on [Mantle](../blockchain/concepts/about-mantle.md). In addition to the sequencers, the LEZ relies on a network of validators that anyone can join, which update the Zone state by transparently executing programs (for public executions) or by verifying zero knowledge proofs of correct state transitions (for private executions). Anybody can join the validator network and contribute to the correctness of the LEZ state, submitting the latest state to an LEZ sequencer to post on the blockchain. The LEZ also supports read-only indexer nodes that follow the LEZ channel for purposes such as block exploration and development.

## Use Cases

The LEZ is a ready-made execution environment for privacy-preserving applications built using the Logos stack. Since the same LEE program can be executed over both public and private accounts, computationally costly private executions can be used only when necessary to speed up execution. Together with Solana-style parallel execution, this feature makes the LEZ uniquely suited to applications requiring high throughput as well as private application state.

As an example, the LEZ could be used by users to run private DeFi applications. With support for privacy built-in, the LEZ could be used to build protocols where transaction details, user balances, or trading strategies are kept private by default, only revealing necessary information to authorised parties. This is especially so when high volumes of transactions are expected by these applications. Examples may include:

- Private Exchanges: Trading platforms where order books or individual trades are obscured.
- Private Lending/Borrowing Protocols: Financial services where loan details or collateral information are private.
- Private Transfers: Securely sending and receiving digital assets with transaction details kept private using zero knowledge proofs, ensuring financial privacy for individuals and businesses.
