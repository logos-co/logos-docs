---
title: About the LEE program model
doc_type: concept
product: lez
topics: lez
authors: kashepavadan
owner: logos
doc_version: 1
slug: about-the-lee-program-model
sidebar_position: 1
---

# About the LEE program model

#### Understand how LEE programs store state in accounts and update it by passing messages between actors.

:::info
This document reflects the state of this Logos component as it will exist on mainnet. Some features described here may not be available on the current testnet.
:::

The [Logos Execution Environment](../../get-started/glossary.md#logos-execution-environment) ([LEE](../../get-started/glossary.md#lee)) is the virtual machine that runs [programs](../../get-started/glossary.md#program) on the [Logos Execution Zone](../../get-started/glossary.md#logos-execution-zone) ([LEZ](../../get-started/glossary.md#lez)). LEE programs are stateless: all persistent data is stored in [accounts](../../get-started/glossary.md#account), which can be either public or private, and the same program bytecode runs over both. Programs update account state through a modified version of the [actor model](https://en.wikipedia.org/wiki/Actor_model).

## The basics

- All persistent data is stored in accounts, which can be either public or private.
- Account data is updated by *actors*—(account, program) pairs that operate on their own state or send messages to other actors.
- Authorised execution is scoped to individual actors through *grants*, which are passed between actors only explicitly.

## Accounts Model

To achieve separation between public and private state while allowing for full programmability, the LEE uses a stateless program model. Under this model, all persistent data is stored in accounts, which can be either public or private. Public accounts are stored on-chain as a map between the account ID and its associated state (such as a token balance). A [public account](../../get-started/glossary.md#public-account) owner’s private key signs transactions and authorises executions, while the derived account ID is publicly visible on-chain.

Public account keys rotate: the owner signs each transaction with a new key pair derived from the account's secret and its current nonce. This nonce increments with every transaction the account signs. Every signature also commits to the key the owner will use next, so no one else can substitute a different next key, and the account stores a commitment to its current key on chain. The account ID is derived from the account's initial key rather than its current one, so it stays the same as the key rotates.

[Private accounts](../../get-started/glossary.md#private-account), by contrast, are stored locally on the account-holder’s node, which publishes [commitments](https://en.wikipedia.org/wiki/Commitment_scheme) to the account state onto the chain whenever the state is updated. The latest commitment binds the current account state to the chain without revealing its data, while nullifiers for previous commitments ensure that old commitments are not used for program execution. Private accounts are created with three types of associated keys:

- [Nullifier keys](../../get-started/glossary.md#nullifier-keys): The [nullifier secret key](../../get-started/glossary.md#nullifier-secret-key) is used inside the ZK proof to produce the nullifier that marks the previous state commitment as spent. Together with the [viewing secret key](../../get-started/glossary.md#viewing-secret-key) (or decrypted account state), a holder of the nullifier secret key can effect account updates where authorisation is not required. The [nullifier public key](../../get-started/glossary.md#nullifier-public-key), together with the viewing public key, derives the account ID.
- [Viewing keys](../../get-started/glossary.md#viewing-keys): The [viewing public key](../../get-started/glossary.md#viewing-public-key) is used by anyone updating the account to encrypt its new state for the owner. The viewing secret key lets its holder decrypt and read that state. Together with the nullifier secret key, a holder of the nullifier secret key can effect account updates where authorisation is not required.
- [Authorisation secret key](../../get-started/glossary.md#authorisation-secret-key): The authorisation secret key allows the account owner to effect authorised updates to the account state. The nullifier secret key is derived from the authorisation secret key, so its holder also holds the nullifier secret key, but not the reverse. The authorisation secret key is never used to sign: the owner supplies it to the ZK proof, which derives the account ID from it and so proves the owner holds it. Whether an update requires authorisation is determined by the program that executes the change, and the owner chooses which programs the key authorises in each transaction, as described in [Authorisation and grants](#authorisation-and-grants).

:::info
The owner of a private account can selectively share their nullifier secret key and viewing secret key (or decrypted account state) with other parties to delegate certain tasks, while keeping the authorisation secret key private. For example, heavy proving of account updates can be outsourced to third parties, while important updates, such as native token transfers, will not be executable except by the account owner.
:::

## How programs update account state

When an LEE program executes, it modifies the accounts provided to it. These accounts could be either public or private, as an LEE program can be executed over both types of accounts. In either case, the program is executed using the same bytecode, the main difference being whether the user who runs a program will generate a zero knowledge proof. Executions modifying public accounts are executed transparently by LEZ validators like any standard RISC-V VM call. On the other hand, private executions involve the generation of zero knowledge proofs via Risc0, which are then verified by LEZ validators.

The LEE uses a modified version of [Erlang's](https://en.wikipedia.org/wiki/Erlang_(programming_language)) [actor model](https://en.wikipedia.org/wiki/Actor_model) to effect state updates. In the LEE, updates are executed via *actors*, each of which is a pairing of a program's address and an account. Each actor behaves as defined by the program's code, and maintains its own state relevant to that program (for example, the account's custom token balance for a token contract). This state is stored together with the account the actor belongs to (on-chain for public accounts and locally for private accounts) rather than with the program.

Actors receive instructions for execution in the form of *messages*, which could originate from the transaction itself or from another actor. To read or make updates to state belonging to other actors, an actor must send a message asking the other actor to report or change its state, and that actor decides whether to do so. An actor processes the messages it receives via its program's *message handler* function. Each time an actor receives a message, the handler sees the actor's current state, the message, the actor that sent it (if any), and the [*grants*](#authorisation-and-grants) it holds: the actors it has authority over (for example, through the account owner's signature). It returns the following:

1. The actor's updated state (if relevant).
1. Synchronous messages to other actors, which are processed within the same transaction.
1. Asynchronous messages to other actors, which can be processed in a later transaction.
1. Events for off-chain indexers.
1. The range of blocks or times in which the transaction is valid.

Synchronous messages are processed in the order they are sent, and each message finishes, together with every message it spawns, before the next one starts. If any handler fails, the whole transaction fails, so a chain of synchronous messages either takes effect entirely or not at all. A handler does not receive return values: to read another actor's state, an actor must send it a message asking for the state, and the answer arrives as a new message back to the sender.

Asynchronous messages let one transaction hand off work to another. A message sent to a public actor that the transaction declares is processed in the same transaction. A message to a private actor can instead be stored on chain as a commitment, which the recipient claims later in its own private transaction, producing a nullifier so the message cannot be claimed twice. For example, an exchange program can compute a payout from live public state, and the recipient can claim it privately afterwards. This asynchronous claim does not require the recipient to stay online and always be ready to generate a ZK proof for the private transaction. Instead, the recipient can create a proof to execute the private claim whenever they come online.

Because a program can only modify the state of actors keyed with its ID, and must message other actors to change their state, a malicious program cannot unilaterally modify data that does not belong to it. Each handler also works from its actor's live state rather than from values that a caller passes in, so callers cannot supply outdated or forged state. Importantly, the LEE actor model handles public and private accounts the same way, allowing one transaction to mix both.

### Authorisation and grants

A grant represents authority over a single actor. A handler checks that the actor holds a grant over its own actor before making a change that needs authorisation, such as debiting a native token balance. Grants are created at the following points:

- **Public account signature**: a transaction lists every public actor it involves and marks the ones the account owner chose to authorise. The account's signature grants authority over the marked actors only, and only to the message that starts the transaction.
- **Private account authorisation secret key**: when proving a transaction, the account owner names the actors it authorises, and the message that starts the transaction receives grants over those actors only.
- **[Program Derived Address](../../get-started/glossary.md#program-derived-address) seed**: a program sending a message to an account derived from its own address and a seed can attach that seed, which grants authority over the destination actor only.
- **Fee payment**: the transaction's fee transfer receives a grant over the fee payer's native token balance, and nothing else.

After that, grants must be passed to other actors. An actor can attach the grants it holds to the synchronous messages it sends, for example a router program forwarding a user's grant to a pool program, which forwards it in turn to the token program that debits the user. An actor cannot create a new grant or attach one it does not hold, and the transaction fails if it tries. Asynchronous messages never carry grants, because they were written by someone other than the actor that claims them. A grant over a private actor that reaches a public program can be published under a blinded address, so the public program can pass it along without learning which account it belongs to.