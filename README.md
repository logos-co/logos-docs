# Build with Logos

## What is Logos

Logos is a modular technology stack for building local-first, decentralised applications. Logos consolidates previously separate efforts (Nomos, Codex, and Waku) under one public identity to reduce cognitive load and provide a unified developer experience.

If you've ever used Linux, you already understand how Logos works. A Linux distribution isn't solely a single binary it's a runtime foundation, a networking stack, a set of system services, and the applications that together create a complete operating system. Logos follows the same pattern: a core runtime at the base, a privacy-preserving networking layer above it, a set of pluggable modules that provide specific capabilities, and decentralised applications on top that compose those modules. Logos ships with an opinionated default configuration with storage, messaging, and blockchain modules that work out of the box, but you can assemble entirely different distributions with your own selection of modules and configurations.

![Layered diagram of the Logos technical stack](/docs/_shared/images/logos-tech-diagram.png)

### Architecture

The stack is organised into distinct layers, each with a clear responsibility. From the bottom up:

**Discovery, Peering, and Mixnet: the networking layer.** This layer handles how Logos nodes find each other, establish connections, and communicate. Unlike conventional networking stacks, privacy is built in from the ground up. The mixnet routes messages through multiple relay nodes and mixes traffic patterns so that observers cannot determine who is talking to whom. A capability discovery protocol lets nodes advertise and find peers without centralised registries, and the peering layer manages connections across the decentralised network. This shared foundation treats all traffic alike, whether modules above it are storing files, sending chat messages, or processing transactions.

**Modules: the system services.** Modules are self-contained components that sit on top of the networking layer, each providing a specific capability. Logos ships with three foundational modules, and the architecture is open for anyone to create their own:

- **Blockchain (decentralised compute)** provides consensus and programmable state. **Data Availability and Consensus** is the base layer that ensures transaction data is published and retrievable and that nodes agree on a single ordered history of blocks. The **Execution Zone** is where application logic runs and state is updated, supporting both public and private state, you can deploy programs, run AMMs, transfer tokens, and create financial primitives with built-in privacy.

- **Messaging (coordination)** handles private, censorship-resistant communication between parties. **Logos Delivery** provides publish-subscribe messaging for reliable transport. **Logos Chat** uses Delivery as its transport layer, providing encrypted one-to-one conversations and evolving toward group conversations.

- **Storage (serve frontends and files)** provides decentralised, content-addressed file storage and retrieval. Need to host a frontend, serve assets, or store user data without relying on corporate cloud providers? You interact with a straightforward API: store a file, get back a content identifier; provide a content identifier, get back the file.

- **User Modules** are the wild card. Because Logos follows a modular architecture, anyone can build modules that plug into the same infrastructure. The runtime loads them, manages their lifecycle, and enables them to communicate with other modules, whether they are Logos defaults or third-party additions. Use cases include wallet and key management, identity, access control, and anything else your application needs.

**Dapps: the applications.** At the top of the stack sit the decentralised applications that people actually use. These compose the modules below them: a chat app uses messaging and storage; a DeFi app uses blockchain and the Execution Zone; a filesharing app uses storage. The **Logos App** is the default launcher, it starts the runtime, loads the configured module profile, and provides a unified interface with built-in apps for wallet management, encrypted chat, filesharing, and blockchain exploration. The headless **Logos Node** starts the same runtime without a UI, ideal for validators, infrastructure operators, or backend services.

> [!NOTE]
>
> To learn more about Logos, visit the [Logos main site](https://logos.co).

The sections below link to the guides and references for what you can build and run on Logos today.

## Logos

### Logos App

**Build and run the Logos App:** Build the application from source using Nix and launch it locally with all required modules and dependencies loaded automatically.

- [Build instructions](https://github.com/logos-co/logos-app?tab=readme-ov-file#how-to-build)
- [Modules](https://github.com/logos-co/logos-app?tab=readme-ov-file#modules)
- [Build and run Logos App (alpha) to access Testnet v0.1 UIs](https://github.com/logos-co/logos-docs/blob/main/docs/core/journeys/build-and-run-logos-app-alpha-to-access-testnet-v0.1-uis.md) — Build and launch the Logos App alpha release to access the Testnet v0.1 user interfaces.

### Logos Execution Zone

- [Set up a wallet for the Logos Execution Zone](https://github.com/logos-co/logos-docs/blob/main/docs/apps/wallet/journeys/quickstart-for-the-logos-execution-zone-wallet.md) — Install and configure a wallet to interact with the Logos Execution Zone.
- [Transfer native tokens on the Logos Execution Zone](https://github.com/logos-co/logos-docs/blob/main/docs/apps/wallet/journeys/transfer-native-tokens-on-the-logos-execution-zone.md) — Send and receive native tokens between wallets on the Logos Execution Zone.
- [Create and transfer custom tokens on the Logos Execution Zone](https://github.com/logos-co/logos-docs/blob/main/docs/apps/wallet/journeys/create-and-transfer-custom-tokens-on-the-logos-execution-zone.md) — Mint your own custom tokens and transfer them on the Logos Execution Zone.
- [Create and use an AMM liquidity pool in the Logos Execution Zone](https://github.com/logos-co/logos-docs/blob/main/docs/apps/sample-apps/journeys/create-and-use-an-amm-liquidity-pool-on-the-logos-execution-zone.md) — Set up and interact with an automated market maker liquidity pool on the Logos Execution Zone.

### Blockchain

- [Start a Logos blockchain node using the CLI](https://github.com/logos-co/logos-docs/blob/main/docs/blockchain/quickstart-guide-for-the-logos-blockchain-node.md) — Set up and run a Logos blockchain node from the command line.

### Storage

- [Use the Logos Storage module API from an app](https://logos-storage-docs.netlify.app/tutorials/storage-module/) — Interact with the Logos Storage module API to store and retrieve data from your application.
- [Store and retrieve a file using the Simple Filesharing App](https://logos-storage-docs.netlify.app/tutorials/libstorage/) — Walk through storing and retrieving files using the Simple Filesharing application.

### Messaging

- [Use the Logos Delivery Module API from an app](https://github.com/logos-co/logos-docs/blob/main/docs/messaging/journeys/use-the-logos-delivery-module-api-from-an-app.md) — Integrate the Logos Delivery Module API into your application to send and receive messages.
- [Use the Logos Chat Module API from an app](https://github.com/logos-co/logos-docs/blob/main/docs/messaging/journeys/use-the-logos-chat-module-api-from-an-app.md) — Integrate the Logos Chat Module API into your application to enable chat functionality.

### AnonComms

- [Discover nodes and send messages via the AnonComms Mixnet demo app](https://github.com/logos-co/logos-docs/blob/main/docs/connect/anoncomms/journeys/discover-nodes-and-send-messages-via-the-anoncomms-mixnet-demo-app.md) — Use the AnonComms Mixnet demo application to discover network nodes and exchange messages anonymously.

## If you get stuck

Please open an issue in this repository describing what you are trying to complete and where you got blocked.

## Documentation status and timeline

We are consolidating and updating previously fragmented materials into a single, coherent developer experience and source of truth, featuring consistent navigation and terminology. This process is ongoing, and we appreciate your patience as we work to provide comprehensive and up-to-date documentation.

We are also unifying public naming in our documentation to reflect Logos as a single technical stack: Nomos → Logos Blockchain, Codex → Logos Storage, and Waku → Logos Messaging. This consolidation makes the architecture easier to navigate by aligning documentation, examples, and terminology under one scheme. Legacy names may still appear in repositories and specifications, but going forward the Logos-first names will be used across our docs.

Our aim is to provide a predictable onboarding path for operators and developers, where they can find what they need and trust what they read.

### What to expect next

In 2026 we will release documentation in phases aligned with the project milestones.

We will provide operator guides for those who want to run and support the Logos Blockchain, and developer guides for contributors building decentralized applications on the Logos stack (blockchain, storage, messaging).

### How to follow progress and contribute

We will update this page as sections go live and contribution paths open. Timelines may adjust as the system evolves.
