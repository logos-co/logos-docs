# Build with Logos

## What is Logos

Logos is a modular technology stack for building local first, decentralized applications. Logos consolidates previously separate efforts (Nomos, Codex, and Waku) under one public identity to reduce cognitive load and provide a unified developer experience.

This diagram is a conceptual view of Logos as a layered stack. Dapps use one or more Logos components (storage, messaging, blockchain, and user modules), which rely on shared networking and kernel layers underneath.

![Layered diagram of the Logos technical stack](/docs/_shared/images/logos-tech-diagram.png)

Inside Logos, the top row shows the subsystems that Dapps interact with most directly:

- **Blockchain (decentralized compute)** represents the main compute/state layer, with two responsibilities:

  - **Data Availability and Consensus** is the base layer that ensures (1) transaction data is published and retrievable by the network, and (2) nodes agree on a single, ordered history of blocks.
  - **Execution Zone** is where application logic runs and state is updated (separate from the layers that only order blocks and guarantee data availability).

- **Messaging (coordination)** is the peer-to-peer communication layer used by apps to publish or retrieve messages.

- **Storage (serve frontends)** provides the node-side content storage and retrieval functionality.

- **User Modules** represent pluggable modules that extend Logos' capabilities such as wallet and key management, messaging features, identity, access control, or module installation.

- **Discovery, Peering, Mix-net** is a shared networking layer. "Discovery" and "peering" are the fundamentals for finding and maintaining peer connections, while "mix-net" aligns with the stack's **AnonComms** goal (routing with improved metadata privacy) and capability discovery.

- Everything sits on the **Logos Kernel**, which is the lowest layer in the picture. In the public repos, you can see two building blocks that match that "kernel/runtime foundation" idea.

> [!NOTE]
>
> To learn more about Logos, visit the [Logos main site](https://logos.co).

## Logos

The sections below include the information and links for the things that you can do now in Logos.

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
