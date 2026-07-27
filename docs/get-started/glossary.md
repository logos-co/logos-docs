---
sidebar_position: 3
---

# Glossary

A list of some common terms and phrases specific to the Logos ecosystem.

---

## A

### Account

The basic organisational unit of the LEZ state, with all persistent data stored in accounts. Accounts can be either public or private, and can also represent LEZ programs. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

---

## B

### Basecamp

The desktop shell for Logos, which facilitates installing and running Logos modules and apps.

### Bedrock

The foundational layer of the Logos Blockchain, operating as a decentralised peer-to-peer network. See [About Bedrock](../blockchain/concepts/about-bedrock.md).

### Blend Network

A service that adds anonymity for block proposers on the Logos Blockchain. See [About the Blend Network](../blockchain/concepts/about-the-blend-network.md).

### Blend node

A Logos Blockchain node that chooses to participate in the Blend Network. Also known as a **core node**. See [About the Blend Network](../blockchain/concepts/about-the-blend-network.md).

### Blend Protocol

The protocol underlying the Blend Network, which provides anonymity for Logos Blockchain block proposers. See [About the Blend Network](../blockchain/concepts/about-the-blend-network.md).

### Bootstrapping

The process a Logos Blockchain or Delivery node undergoes when first connected to the network. For a Logos Blockchain node, this involves "catching up" on the history of the blockchain.

---

## C

### Catalogue

A repository that includes a list of Logos modules. Installing a module repo on Basecamp allows you to install the latest version of all these modules together. Also known as a **module repo**.

### Channel

A lightweight virtual chain of ordered message logs that represent the state of a Zone on Bedrock. See [About Mantle](../blockchain/concepts/about-mantle.md).

### CID

**Content Identifier**, used to identify files for the storage module.

### Codex

The old name for the Logos Storage component of the Logos technology stack.

### Content topic

A string attached to messages sent via Logos Delivery to enable protocol-level features like selective message processing and retrieval based on specific criteria. See [About content topics](../messaging/concepts/about-content-topics.md).

### Core module

A Logos module that does not include a user interface view and provides backend functionality.

### Core node

A Logos Blockchain node that chooses to participate in the Blend Network. Also known as a **Blend node**. See [About the Blend Network](../blockchain/concepts/about-the-blend-network.md).

### Cover traffic

Dummy messages sent by Blend nodes to improve proposer anonymity. See [Cover traffic](../blockchain/concepts/about-the-blend-network.md#cover-traffic).

### Cryptarchia

The Private Proof of Stake consensus protocol used by the Logos Blockchain. See [About Cryptarchia](../blockchain/concepts/about-cryptarchia.md).

---

## D

### Delivery module

A module that uses the Logos Delivery network to send messages and subscribe to content topics.

### DNS discovery

A peer discovery mechanism used in Logos Delivery that allows the retrieval of an Ethereum Node Record (ENR) tree from the TXT field of a domain name, enabling the storage of node connection details and promoting decentralisation. See [About DNS discovery](../messaging/concepts/understand-peer-discovery/about-dns-discovery.md).

---

## E

### ENR

**Ethereum Node Record** - a specification used in Logos Delivery to represent and identify nodes, facilitating discovery and communication within the network. Besides connection details, ENR also includes node configuration information like enabled protocol and shards.

### Epoch

A time unit used by the Logos Blockchain, about 7.5 days long. See [About Cryptarchia](../blockchain/concepts/about-cryptarchia.md#time-units).

### Ethereum Node Record

A specification used in Logos Delivery to represent and identify nodes, facilitating discovery and communication within the network. Also known as **ENR**. Besides connection details, ENR also includes node configuration information like enabled protocol and shards.

---

## F

### Filter

A protocol that enables Logos Delivery light nodes to selectively subscribe to specific messages transmitted by peers using content topics. It is designed to be a lightweight alternative for accessing the Relay network. See [Understand Logos Delivery protocols](../messaging/concepts/understand-logos-delivery-protocols.md#filter).

---

## G

### GMS

A **Group Master Secret** - a 32-byte secret used on the LEZ that, when sealed with another party's public sealing key, allows them to create a local instance of a shared LEZ account. See [Set up a shared private LEZ account](../lez/accounts/set-up-shared-private-lez-account.md).

### GossipSub

A protocol for efficient and scalable information dissemination in decentralised networks commonly used in blockchain systems. See [About network domains](../messaging/concepts/about-network-domains.md#gossip-domain).

### Group Master Secret

A 32-byte secret used on the LEZ that, when sealed with another party's public sealing key, allows them to create a local instance of a shared LEZ account. Also known as a **GMS**. See [Set up a shared private LEZ account](../lez/accounts/set-up-shared-private-lez-account.md).

---

## I

### Inscription

A type of Mantle operation that writes data to the Logos Blockchain. Inscriptions are often used to represent Zone state updates. See [About Mantle](../blockchain/concepts/about-mantle.md).

---

## L

### LEE

The **Logos Execution Environment** - the virtual machine that runs on the Logos Execution Zone. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md).

### LEZ

The **Logos Execution Zone** - the primary execution layer for general-purpose applications on Logos, with built-in support for private execution. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md).

### `lgpm`

The official package manager used for Logos modules.

### `lgpd`

The official package downloader for Logos modules.

### `.lgx`

A module file type which allows it to be loaded with `logoscore` and Basecamp.

### Light node

A resource-limited device or client that leverages service nodes to access the Logos Delivery Relay network.

### Light push

A protocol enabling Logos Delivery light nodes to send messages to the Relay network and receive acknowledgements confirming that a peer has received them. See [Understand Logos Delivery protocols](../messaging/concepts/understand-logos-delivery-protocols.md#light-push).

### LIP

**Logos Improvement Proposal** - a proposed community update to the Logos design, which may or may not be incorporated into the project.

### `lm`

A helper tool for Logos modules.

### Locator

An address assigned to a Logos Blockchain node participating in the Blend Network. See [About the Blend Network](../blockchain/concepts/about-the-blend-network.md#service-declaration-protocol).

### Logos Blockchain

The foundational infrastructure layer of the Logos technology stack. See [Introduction to the Logos Blockchain](../blockchain/get-started/introduction-to-the-logos-blockchain.md).

### Logos Chat

A library for private, encrypted peer-to-peer chat using Logos Delivery. A component of Logos Delivery.

### Logos Delivery

A peer-to-peer messaging network with DoS protection via Rate Limiting Nullifiers. A component of Logos Delivery.

### Logos Execution Environment

The virtual machine that runs on the Logos Execution Zone. Also known as the **LEE**. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md).

### Logos Execution Zone

The primary execution layer for general-purpose applications on Logos, with built-in support for private execution. Also known as the **LEZ**. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md).

### Logos Messaging

The private messaging layer of the Logos technology stack.

### Logos node

A node running one or several Logos modules that connect to a network of other such nodes. See [Run a Logos node with blockchain, storage, and delivery](../run-a-node/get-started/run-logos-node-blockchain-storage-delivery.md).

### `logos-module-builder`

A build tool for Logos modules.

### `logos-module-viewer`

A graphical tool for inspecting Logos modules.

### `logos-standalone-app`

An app that displays UI views for Logos modules.

### Logos Storage

The privacy-preserving filesharing component of the Logos technology stack.

### `logoscore`

A daemon that runs Logos modules from the command line.

### LSSA

An old name for the Logos Execution Environment. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md).

---

## M

### Mantle

The execution layer of Bedrock, enabling participation in the Blend Network and facilitating interactions wth Zones. See [About Mantle](../blockchain/concepts/about-mantle.md).

### Message

A virtual "block" of data that forms part of a Logos channel. See [About Mantle](../blockchain/concepts/about-mantle.md).

### Mix

Traffic obfuscation used to improve privacy guarantees.

### Module

A self-contained, resuable software component that provides a specific capability. Multiple modules can be loaded and made to interact to form a complete application.

### Module repo

A repository that includes a list of Logos modules. Installing a module repo on Basecamp allows you to install the latest version of all these modules together. Also known as a **catalogue**.

### Mostly offline

Logos Delivery clients who spend most of their time offline or disconnected from the internet and only occasionally to the network. Examples include browsers and mobile phones.

---

## N

### Nescience

An old name for the Logos Execution Environment. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md).

### Nomos

An old name for the Logos Blockchain. See [Introduction to the Logos Blockchain](../blockchain/get-started/introduction-to-the-logos-blockchain.md).

### Node key

A Secp256k1 (64-char hex string) private key for generating the PeerID, listening addresses, and discovery addresses of a Logos Delivery node.

### Note

A fungible UTXO token used on Mantle. See [About Mantle](../blockchain/concepts/about-mantle.md#mantle-ledger).

### NPK

A **Nullifier Public Key** - a public key used to verify token ownership on the LEZ. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

### NSSA

An old name for the Logos Execution Environment. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md).

### NSK

A **Nullifier Secret Key** - a secret key used to sign LEZ transactions. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

### Nullifier keys

A key pair used to sign transactions and verify token ownership on the LEZ. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

### Nullifier Public Key

A public key used to verify token ownership on the LEZ, also known as an **NPK**. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).


### Nullifier Secret Key

A secret key used to sign LEZ transactions, also known as an **NSK**. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

---

## O

### Out-of-band

Exchanging information through a separate, secure channel distinct from the main communication method to enhance security.

---

## P

### PDA

**Program Derived Address** - the address assigned to an LEE program. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md).

### Peer discovery

When a Logos Delivery node locates and gets information about other peers in the network. See [Understand peer discovery](../messaging/concepts/understand-peer-discovery/understand-peer-discovery.md).

### Peer exchange

A peer discovery mechanism used in Logos Delivery that enables light nodes to request and receive peers from other nodes in the network, allowing them to bootstrap and expand their connections without depending on Discv5. See [About peer exchange](../messaging/concepts/understand-peer-discovery/about-peer-exchange.md).

### Peer ID

The unique identifier of a node in the Logos Delivery network generated from the cryptographic hash of the node's public key.

### Piñata

The LEZ-specific testnet faucet program that funds accounts with native tokens.

### PoL

**Proof of Leadership** - the ZK proof that a note's owner is eligible to propose a block. See [About Cryptarchia](../blockchain/concepts/about-cryptarchia.md).

### PPoS

**Private Proof of Stake** - a Proof of Stake consensus mechanism that protects the identity of block proposers. See [About Cryptarchia](../blockchain/concepts/about-cryptarchia.md).

### Private account

A type of LEZ account that keeps its transactions private. Account updates are proven via ZK proofs. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

### Private Proof of Stake

A Proof of Stake consensus mechanism that protects the identity of block proposers, also known as **PPoS**. See [About Cryptarchia](../blockchain/concepts/about-cryptarchia.md).

### Program

An executable smart contract on the LEZ, associated with an LEZ account. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

### Program Derived Address

The address assigned to an LEZ program, also known as a **PDE**. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md).

### Proof of Leadership

The ZK proof that a note's owner is eligible to propose a block. Also known as **PoL**. See [About Cryptarchia](../blockchain/concepts/about-cryptarchia.md).

### Public account

A type of LEZ account whose state is publicly available. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

---

## R

### Relay

A protocol that extends the GossipSub protocol to enable secure and censorship resistant message sending and receiving among peers while preserving privacy. It also scales the Logos Delivery network to accommodate many nodes efficiently. See [Understand Logos Delivery protocols](../messaging/concepts/understand-logos-delivery-protocols.md#relay).

---

## S

### SDP

The **Service Declaration Protocol** - used to keep track of Logos Blockchain nodes that opted in to participate in the Blend Network. See [About the Blend Network](../blockchain/concepts/about-the-blend-network.md#service-declaration-protocol).

### Sealing keys

A key pair used by users of a shared LEZ account, together with the Group Master Secret, to derive a local instance of a shared account. See [Set up a shared private LEZ account](../lez/accounts/set-up-shared-private-lez-account.md).

### Service Declaration Protocol

Used to keep track of Logos Blockchain nodes that opted in to participate in the Blend Network. Also known as the **SDP**. See [About the Blend Network](../blockchain/concepts/about-the-blend-network.md#service-declaration-protocol).

### Service Reward Distribution Protocol

The **Service Reward Distribution Protocol** - enables reward distribution to Logos Blockchain nodes participating in the Blend Network. See [About the Blend Network](../blockchain/concepts/about-the-blend-network.md#service-reward-distribution-protocol).

### Slot

The basic time unit used by the Logos Blockchain, equivalent to 1 second. See [About Cryptarchia](../blockchain/concepts/about-cryptarchia.md#time-units).

### SRDP

Enables reward distribution to Logos Blockchain nodes participating in the Blend Network. Also known as the **SRDP**. See [About the Blend Network](../blockchain/concepts/about-the-blend-network.md#service-reward-distribution-protocol).

### Storage module

The Logos module that provides filesharing capabilities via Logos Storage.

### Store

A protocol that enables the storage of relayed messages in the Logos Delivery network, allowing offline peers to retrieve missed messages upon reconnecting to the network. See [Understand Logos Delivery protocols](../messaging/concepts/understand-logos-delivery-protocols.md#store).

---

## T

### Token definition account

An LEZ account that defines the properties and behaviour of a custom token. See [Create and transfer custom tokens on the Logos Execution Zone](../lez/transfer-tokens/create-and-transfer-custom-tokens-on-the-logos-execution-zone.md).

### Token holding account

An LEZ account that is able to hold a custom token. See [Create and transfer custom tokens on the Logos Execution Zone](../lez/transfer-tokens/create-and-transfer-custom-tokens-on-the-logos-execution-zone.md).

### Token program

An LEZ program that facilitates the creation of custom LEZ tokens. See [Create and transfer custom tokens on the Logos Execution Zone](../lez/transfer-tokens/create-and-transfer-custom-tokens-on-the-logos-execution-zone.md).

### Transport

A network mechanism that establishes connections between Logos Delivery peers and enables efficient transmission, routing, and delivery of data packets.

---

## U

### UI Module

A Logos module that includes a user interface view.

---

## V

### Viewing keys

A key pair used to generate and verify ZK proofs on the LEZ. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

### Viewing Public Key

A public key used to verify ZK proofs on the LEZ, also known as a **VPK**. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

### Viewing Secret Key

A secret key used to generate ZK proofs on the LEZ, also known as a **VSK**. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

### VPK

A **Viewing Public Key** - a public key used to verify ZK proofs on the LEZ. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

### VSK

A **Viewing Secret Key** - a secret key used to generate ZK proofs on the LEZ. See [Introduction to the Logos Execution Zone](../lez/get-started/introduction-to-the-logos-execution-zone.md#accounts-model).

---

## W

### Waku

An old name for the Logos Delivery component of the Logos technology stack.

---

## Z

### Zone SDK

An SDK provided by Logos to facilitate the creation of custom Logos Zones. See [About Zones](../blockchain/concepts/about-zones.md).

### Zone

An L2 blockchain that defines its own state but uses the Logos Blockchain for consensus. See [About Zones](../blockchain/concepts/about-zones.md).