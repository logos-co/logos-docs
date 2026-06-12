---
title: Logos ecosystem repositories
doc_type: reference
product: logos
topics: Repositories
authors: cheny0
owner: logos
doc_version: 1
slug: logos-ecosystem-repositories
---

# Logos ecosystem repositories

#### Review the key repositories across the logos organizations.
 
The Logos project is organized into several GitHub organizations, each focused on one part of the system. This page highlights the most important repositories for understanding the project and getting started with development. The selection is curated rather than exhaustive.
 
## Orientation and contribution resources
 
These repositories explain what Logos is building and how to take part, with no code to run.
 
| Repository | Description |
|:---|:---|
| [logos-docs](https://github.com/logos-co/logos-docs) | Documentation, standards, and templates for Logos projects. |
| [roadmap](https://github.com/logos-co/roadmap) | A Markdown-based view of the Logos roadmap. |
| [ideas](https://github.com/logos-co/ideas) | Community-sourced project ideas to build on top of Logos. |
| [rfp](https://github.com/logos-co/rfp) | Grants for building in the Logos ecosystem. |
 
## Logos Basecamp

Logos Basecamp is the desktop shell for the Logos platform.

| Repository | Description |
|:---|:---|
| [logos-basecamp](https://github.com/logos-co/logos-basecamp) | The Logos Basecamp app. |

## Logos Core
 
Logos Core is the modular runtime that ties applications together.

| Repository | Description |
|:---|:---|
| [scaffold](https://github.com/logos-co/scaffold) | CLI that bootstraps a runnable Logos application environment. |
| [logos-liblogos](https://github.com/logos-co/logos-liblogos) | The core runtime library for the Logos modular application platform. |
| [logos-logoscore-cli](https://github.com/logos-co/logos-logoscore-cli) | The headless CLI runtime for the Logos modular application platform. |
| [logos-logoscore-py](https://github.com/logos-co/logos-logoscore-py) | Python wrapper for the logoscore CLI. |
| [logos-package-manager](https://github.com/logos-co/logos-package-manager) | C++ library and CLI for local Logos package management. |
| [logos-package-downloader](https://github.com/logos-co/logos-package-downloader) | Module download tooling. No official description; purpose inferred. |
| [logos-module-builder](https://github.com/logos-co/logos-module-builder) | C++ library and CLI (lgpd) for fetching Logos module catalogs and downloading `.lgx` packages. |
| [logos-app-builder](https://github.com/logos-co/logos-app-builder) | Shared Nix library for building Logos UI applications. |
| [Overwatch](https://github.com/logos-co/Overwatch) | Self-contained services application framework. |
 
## Core modules and applications
 
Modules plug into Logos Core to provide specific capabilities, and user-interface repositories are the front-end applications built on those modules. Modules and applications live in both organizations.
 
| Repository | Description |
|:---|:---|
| [logos-chat-module](https://github.com/logos-co/logos-chat-module) | A Logos Core module that exposes Logos Chat. |
| [logos-chat-ui](https://github.com/logos-co/logos-chat-ui) | UI application for the Logos Chat SDK proof of concept. |
| [logos-wallet-module](https://github.com/logos-co/logos-wallet-module) | Early-stage wallet module built on go-wallet-sdk. |
| [logos-accounts-module](https://github.com/logos-co/logos-accounts-module) | Early-stage account-management module built on go-wallet-sdk. |
| [logos-blockchain-module](https://github.com/logos-blockchain/logos-blockchain-module) | Core module wrapping logos-blockchain-c. |
| [logos-blockchain-ui](https://github.com/logos-blockchain/logos-blockchain-ui) | Blockchain UI application for Logos Core. |
| [logos-execution-zone-module](https://github.com/logos-blockchain/logos-execution-zone-module) | Logos Execution Zone module for Logos Core. No official description; purpose inferred. |
| [logos-execution-zone-wallet-ui](https://github.com/logos-blockchain/logos-execution-zone-wallet-ui) | Logos Execution Zone wallet UI. No official description; purpose inferred. |
 
## Logos Blockchain
 
The Logos Blockchain is the foundational infrastructure of the Logos technology stack.
 
| Repository | Description |
|:---|:---|
| [logos-blockchain](https://github.com/logos-blockchain/logos-blockchain) | The Logos blockchain repository. |
| [logos-blockchain-block-explorer-template](https://github.com/logos-blockchain/logos-blockchain-block-explorer-template) | Python block explorer and indexer template. |
| [nimbos](https://github.com/logos-co/nimbos) | Nim client for the Logos chain. |
 
## Logos Execution Zone
 
The Logos Execution Zone (LEZ) is the primary execution layer for applications built on the Logos stack.
 
| Repository | Description |
|:---|:---|
| [logos-execution-zone](https://github.com/logos-blockchain/logos-execution-zone) | The LEZ  repository. |
| [lez-programs](https://github.com/logos-blockchain/lez-programs) | Essential Logos Execution Zone programs built by Logos. |
| [lez-multisig](https://github.com/logos-co/lez-multisig) | Multisig built with the lez-framework program macro. |
| [logos-lez-rln](https://github.com/logos-co/logos-lez-rln) | Logos Execution Zone program for RLN registration. |
| [logos-sql-zone](https://github.com/logos-blockchain/logos-sql-zone) | Password-manager demo built with the Zone SDK. |
| [lez-fuzzing](https://github.com/logos-blockchain/lez-fuzzing) | Adversarial testing and fuzzing infrastructure for LEZ. |
 
## Logos messaging

Logos Messaging is the project's decentralized communication system.

| Repository | Description |
|:---|:---|
| [logos-delivery](https://github.com/logos-messaging/logos-delivery) | Logos messaging protocols implemented in Nim, formerly nwaku. |
| [logos-delivery-js](https://github.com/logos-messaging/logos-delivery-js) | Logos messaging protocols implemented in JavaScript and TypeScript, formerly Waku v2. |
| [logos-delivery-python-bindings](https://github.com/logos-messaging/logos-delivery-python-bindings) | Python wrapper around the node. |
| [sds-go-bindings](https://github.com/logos-messaging/sds-go-bindings) | Go bindings for the SDS reliability protocol. No official description; purpose inferred. |
| [nim-sds](https://github.com/logos-messaging/nim-sds) | Nim implementation of the end-to-end reliability protocol. |
| [nim-segmentation](https://github.com/logos-messaging/nim-segmentation) | Message segmentation. No official description; purpose inferred. |
| [logos-delivery-rlnv2-contract](https://github.com/logos-messaging/logos-delivery-rlnv2-contract) | RLN-v2 smart contracts, written in Solidity. |
| [specs](https://github.com/logos-messaging/specs) | Protocol specifications. No official description; purpose inferred. |
| [logos-delivery-compose](https://github.com/logos-messaging/logos-delivery-compose) | Docker-compose files to deploy a node. |
| [logos-delivery-simulator](https://github.com/logos-messaging/logos-delivery-simulator) | Simulates a network with multiple nodes, traffic, and users. |
| [logos-delivery-interop-tests](https://github.com/logos-messaging/logos-delivery-interop-tests) | Interoperability tests. No official description; purpose inferred. |
| [libchat](https://github.com/logos-messaging/libchat) | Supporting library for Logos Chat, written in Rust. |
| [awesome-logos-delivery](https://github.com/logos-messaging/awesome-logos-delivery) | Community-curated list of resources. |

## Logos Storage

Logos Storage is the project's privacy-preserving, decentralized storage system.

| Repository | Description |
|:---|:---|
| [logos-storage-nim](https://github.com/logos-storage/logos-storage-nim) | The storage node and durability engine, formerly nim-codex. |
| [logos-storage-nim-dht](https://github.com/logos-storage/logos-storage-nim-dht) | A DHT based on Discv5 with libp2p provider-record support. |
| [circom-compat-ffi](https://github.com/logos-storage/circom-compat-ffi) | FFI for circom-compat (ark-circom), used for zero-knowledge proving. |
| [logos-storage-research](https://github.com/logos-storage/logos-storage-research) | Durability-engine research. |
| [logos-storage-nim-cs-dist-tests](https://github.com/logos-storage/logos-storage-nim-cs-dist-tests) | Distributed system tests for the node. |
| [logos-storage-local-harness](https://github.com/logos-storage/logos-storage-local-harness) | A bash harness for running the node without containers. |
| [transport-over-mix](https://github.com/logos-storage/transport-over-mix) | Transport-layer abstraction over Mix, with spec and reference implementation. |
| [libp2p-storage-mix-transport](https://github.com/logos-storage/libp2p-storage-mix-transport) | Experiments with a storage transport over the libp2p Mix protocol. |
| [mix-hidden-services](https://github.com/logos-storage/mix-hidden-services) | Hidden services over Mix. |
| [lioness_blockcipher](https://github.com/logos-storage/lioness_blockcipher) | Rust implementation of the LIONESS wide-block cipher. |
| [logos-storage-docs-obsidian](https://github.com/logos-storage/logos-storage-docs-obsidian) | Indexed, searchable documentation as an Obsidian vault. |

## AnonComms

AnonComms focuses on building the core elements that allow privacy-preserving communication and coordination across the Logos stack. The work is at early stages, see the latest update in the [roadmap](https://roadmap.logos.co/anoncomms/).

## Standards, governance, and verification
 
These repositories define how Logos documents, proposes, and verifies changes.
 
| Repository | Description |
|:---|:---|
| [logos-lips](https://github.com/logos-co/logos-lips) | Logos Improvement Proposals Index.|
| [logos-doctest](https://github.com/logos-co/logos-doctest) | Executable documentation that can be verified and rendered. |
| [logos-tutorial](https://github.com/logos-co/logos-tutorial) | Tutorial materials |
