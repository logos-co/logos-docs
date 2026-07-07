---
title: What is Logos
doc_type: concept
product: logos
topics: architecture
authors: jorge-campo
owner: logos
doc_version: 1
slug: what-is-logos
---

# What is Logos

Logos is a modular technology stack for building local-first, decentralised applications. Logos consolidates previously separate efforts ([Nomos](glossary.md#nomos), [Codex](glossary.md#codex), [Nescience](glossary.md#nescience) and [Waku](glossary.md#waku)) under one public identity to reduce cognitive load for developers and users.

If you've ever used Linux, you already understand how Logos works. A Linux distribution isn't solely a single binary it's a runtime foundation, a networking stack, a set of system services, and the applications that together create a complete operating system. Logos follows the same pattern: a core runtime at the base, a privacy-preserving networking layer above it, a set of pluggable modules that provide specific capabilities, and decentralised applications on top that compose those modules. Logos ships with an opinionated default configuration with storage, messaging, and blockchain modules that work out of the box, but you can assemble entirely different distributions with your own selection of modules and configurations.

![Layered diagram of the Logos technical stack](./.gitbook/assets/what-is-logos-logos-tech-diagram.png)

## Architecture

The stack is organised into distinct layers, each with a clear responsibility. From the bottom up:

**Discovery, Peering, and Mixnet: the networking layer.** This layer handles how Logos nodes find each other, establish connections, and communicate. Unlike conventional networking stacks, privacy is built in from the ground up. The mixnet routes messages through multiple relay nodes and mixes traffic patterns so that observers cannot determine who is talking to whom. A capability discovery protocol lets nodes advertise and find peers without centralised registries, and the peering layer manages connections across the decentralised network. This shared foundation treats all traffic alike, whether modules above it are storing files, sending chat messages, or processing transactions.

**Modules: the system services.** Modules are self-contained components that sit on top of the networking layer, each providing a specific capability. Logos ships with three foundational modules, and the architecture is open for anyone to create their own:

- **Blockchain:** Runs the consensus layer in the technology stack (i.e. consensus + settlement) and provides the foundation other components build on. [Logos Blockchain](glossary.md#logos-blockchain) is a sovereign, censorship resistant foundation for building applications while protecting the privacy of individual participants including node operators.

- **[Logos Execution Zone](glossary.md#logos-execution-zone) ([LEZ](glossary.md#lez)):** Execution [zone](glossary.md#zone) (Rollup) running on the Base layer for wallet, token operations, and [program](glossary.md#program) deployment with support for public and private contexts (previously referred to as Logos State Separation Architecture or [LSSA](glossary.md#lssa)).

- **Messaging (coordination)** handles private, censorship-resistant communication between parties. **Logos Delivery** provides publish-subscribe messaging for reliable transport. **Logos Chat** uses Delivery as its transport layer, providing encrypted one-to-one conversations and evolving toward group conversations.

- **Storage (serve frontends and files)** provides decentralised, content-addressed file storage and retrieval. Need to host a frontend, serve assets, or store user data without relying on corporate cloud providers? You interact with a straightforward API: store a file, get back a content identifier; provide a content identifier, get back the file.

- **User Modules** are the wild card. Because Logos follows a modular architecture, anyone can build modules that plug into the same infrastructure. The runtime loads them, manages their lifecycle, and enables them to communicate with other modules, whether they are Logos defaults or third-party additions. Use cases include wallet and key management, identity, access control, and anything else your application needs.

**Dapps: the applications.** At the top of the stack sit the decentralised applications that people actually use. These compose the modules below them: a chat app uses messaging and storage; a DeFi app uses blockchain and the Execution Zone; a filesharing app uses storage. The **Logos [Basecamp](glossary.md#basecamp)** is a desktop shell on the Logos Core framework that enables users to interact with the Logos ecosystem. It enables access to third party published applications, running local modules (for example, the node for the blockchain) in the Logos ecosystem and more, while avoiding the dependencies on web-browser interactions. The headless **[Logos Node](glossary.md#logos-node)** starts the same runtime without a UI, ideal for validators, infrastructure operators, or backend services.

{% hint style="info" %}

To learn more about Logos, visit the [Logos main site](https://logos.co).

{% endhint %}

The sections below link to the guides and references for what you can build and run on Logos today.

## Useful links

- [Logos repositories](https://github.com/logos-co/logos-docs/tree/main/docs/get-started/logos-ecosystem-repositories.md) — A comprehensive list of important public repositories in the Logos ecosystem.
- [Logos documentation GitHub repository](https://github.com/logos-co/logos-docs)
- [Logos modules](https://github.com/logos-co/logos-app?tab=readme-ov-file#modules)
- [Building Logos modules](https://github.com/logos-co/logos-tutorial) - How-to's on building modules and UIs to interact with them.
- [Use the Logos Storage module API from an app](https://logos-storage-docs.netlify.app/tutorials/storage-module/) — Interact with the Logos [Storage module](glossary.md#storage-module) API to store and retrieve data from your application.

- Community resources:
    - [Zero to Logos App](https://github.com/jzaki/logos-playground/blob/main/Zero-to-Logos-App.md) - A short tutorial to understand pieces and have a quick motivating win.
    - [Find and use an existing module](https://github.com/jzaki/logos-playground/blob/main/Find-and-use-a-module.md)
