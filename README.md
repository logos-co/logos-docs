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

- **Discovery, Peering, Mix-net** is a shared networking layer. "Discovery" and "peering" are the fundamentals for finding and maintaining peer connections, while "mix-net" aligns with the stack’s **AnonComms** goal (routing with improved metadata privacy) and capability discovery.

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

### Blockchain (base layer)

- **Run a validator/consensus node (including staking):** Run a base-layer node and participate in consensus.
  - Node repo: https://github.com/logos-co/nomos

    > [!NOTE]
    >
    > Public docs exist, but some details may change as testnet packaging stabilizes.

- **Set up a user wallet for the base layer:** Install and run the base-layer wallet UI/module so you can hold assets and interact with the chain.

  - Wallet UI: https://github.com/logos-co/logos-wallet-ui
  - Wallet module: https://github.com/logos-co/logos-wallet-module

- **Receive tokens from a faucet:** Obtain test tokens needed to run the v0.1 flows. !!!LINK!!!

- **Run an archival DA node:** Operate an archival data-availability node and serve queries needed by rollup tooling.

  - Node repo (base layer): https://github.com/logos-co/nomos
  - DA research notes/code: https://github.com/logos-storage/das-research
  - Full documentation not published yet.

### Logos Execution Zone (LEZ)

- **Set up a wallet in the LEZ:** Create a wallet and connect it to the LEZ environment so you can run the token and program flows.

- [Build instructions](https://github.com/logos-co/logos-app?tab=readme-ov-file#how-to-build)
- [Modules](https://github.com/logos-co/logos-app?tab=readme-ov-file#modules)

### LEZ rollup

- **Set up a wallet for an LEZ-based chain:** Create a wallet and connect it to the LEZ environment so you can run the token and program flows.

  - LEZ repo (start here): https://github.com/logos-blockchain/lssa
  - Try the Wallet CLI: https://github.com/logos-blockchain/lssa#try-the-wallet-cli

- **Transfer tokens in public and private contexts:** Send native tokens using the wallet CLI across public/private combinations.

  - Wallet CLI walkthrough: https://github.com/logos-blockchain/lssa#try-the-wallet-cli

- **Create and transfer custom tokens (public and private contexts):** Define a custom token and execute transfers with different privacy modes.

  - Token program section (same README): https://github.com/logos-blockchain/lssa#the-token-program

- **Deploy custom programs using LEZ templates:** Build and deploy a sample program using the provided tutorial and templates.

  - Program deployment tutorial: https://github.com/logos-blockchain/lssa/tree/main/examples/program_deployment

- **Interact with sample apps in public and private contexts:** Run apps that exercise public/private context flows.

  - Example apps entry point: https://github.com/logos-co/logos-app-poc

- **Track transactions through an LEZ explorer:** View LEZ transactions and state via an explorer UI/API.

  - Docs not published yet.

- **Use an LEZ transaction generator to stress-test the Logos testnet:** Generate high-volume transactions to measure performance.

  - Docs not published yet.

### Storage

- **Use the Storage module API:** Integrate with the storage module from an app or a local node operator setup.

  - Documentation is not available just yet.
  - Code entry point: https://github.com/logos-storage/logos-storage-nim

### Logos App

**Build and run the Logos App:** Build the application from source using Nix and launch it locally with all required modules and dependencies loaded automatically.

- [[Build instructions](https://github.com/logos-co/logos-app?tab=readme-ov-file#how-to-build)](https://github.com/logos-co/logos-app?tab=readme-ov-file#how-to-build)
- [[Modules](https://github.com/logos-co/logos-app?tab=readme-ov-file#modules)](https://github.com/logos-co/logos-app?tab=readme-ov-file#modules)
- [[Build and run Logos App (alpha) to access Testnet v0.1 UIs](https://github.com/logos-co/logos-docs/blob/main/docs/core/journeys/build-and-run-logos-app-alpha-to-access-testnet-v0.1-uis.md)](https://github.com/logos-co/logos-docs/blob/main/docs/core/journeys/build-and-run-logos-app-alpha-to-access-testnet-v0.1-uis.md) — Build and launch the Logos App alpha release to access the Testnet v0.1 user interfaces.
- [[Run Logos Node in headless mode](https://github.com/logos-co/logos-docs/blob/main/docs/core/journeys/run-logos-node-in-headless-mode.md)](https://github.com/logos-co/logos-docs/blob/main/docs/core/journeys/run-logos-node-in-headless-mode.md) — Run a Logos node without a graphical interface for server or automated environments.

### Logos Execution Zone

- [[Set up a wallet for the Logos Execution Zone](https://github.com/logos-co/logos-docs/blob/main/docs/apps/wallet/journeys/quickstart-for-the-logos-execution-zone-wallet.md)](https://github.com/logos-co/logos-docs/blob/main/docs/apps/wallet/journeys/quickstart-for-the-logos-execution-zone-wallet.md) — Install and configure a wallet to interact with the Logos Execution Zone.
- [[Transfer native tokens on the Logos Execution Zone](https://github.com/logos-co/logos-docs/blob/main/docs/apps/wallet/journeys/transfer-native-tokens-on-the-logos-execution-zone.md)](https://github.com/logos-co/logos-docs/blob/main/docs/apps/wallet/journeys/transfer-native-tokens-on-the-logos-execution-zone.md) — Send and receive native tokens between wallets on the Logos Execution Zone.
- [[Create and transfer custom tokens on the Logos Execution Zone](https://github.com/logos-co/logos-docs/blob/main/docs/apps/wallet/journeys/create-and-transfer-custom-tokens-on-the-logos-execution-zone.md)](https://github.com/logos-co/logos-docs/blob/main/docs/apps/wallet/journeys/create-and-transfer-custom-tokens-on-the-logos-execution-zone.md) — Mint your own custom tokens and transfer them on the Logos Execution Zone.
- [[Create and use an AMM liquidity pool in the Logos Execution Zone](https://github.com/logos-co/logos-docs/blob/main/docs/apps/sample-apps/journeys/create-and-use-an-amm-liquidity-pool-on-the-logos-execution-zone.md)](https://github.com/logos-co/logos-docs/blob/main/docs/apps/sample-apps/journeys/create-and-use-an-amm-liquidity-pool-on-the-logos-execution-zone.md) — Set up and interact with an automated market maker liquidity pool on the Logos Execution Zone.

### Blockchain

- [[Start a Logos blockchain node using the CLI](https://github.com/logos-co/logos-docs/blob/main/docs/blockchain/quickstart-guide-for-the-logos-blockchain-node.md)](https://github.com/logos-co/logos-docs/blob/main/docs/blockchain/quickstart-guide-for-the-logos-blockchain-node.md) — Set up and run a Logos blockchain node from the command line.

### Storage

- [[Use the Logos Storage module API from an app](https://logos-storage-docs.netlify.app/tutorials/storage-module/)](https://logos-storage-docs.netlify.app/tutorials/storage-module/) — Interact with the Logos Storage module API to store and retrieve data from your application.
- [[Store and retrieve a file using the Simple Filesharing App](https://logos-storage-docs.netlify.app/tutorials/libstorage/)](https://logos-storage-docs.netlify.app/tutorials/libstorage/) — Walk through storing and retrieving files using the Simple Filesharing application.

### Messaging

- [[Use the Logos Delivery Module API from an app](https://github.com/logos-co/logos-docs/blob/main/docs/messaging/journeys/use-the-logos-delivery-module-api-from-an-app.md)](https://github.com/logos-co/logos-docs/blob/main/docs/messaging/journeys/use-the-logos-delivery-module-api-from-an-app.md) — Integrate the Logos Delivery Module API into your application to send and receive messages.
- [[Use the Logos Chat Module API from an app](https://github.com/logos-co/logos-docs/blob/main/docs/messaging/journeys/use-the-logos-chat-module-api-from-an-app.md)](https://github.com/logos-co/logos-docs/blob/main/docs/messaging/journeys/use-the-logos-chat-module-api-from-an-app.md) — Integrate the Logos Chat Module API into your application to enable chat functionality.

### AnonComs

- [[Discover nodes and send messages via the AnonComms Mixnet demo app](https://github.com/logos-co/logos-docs/blob/main/docs/connect/anoncomms/journeys/discover-nodes-and-send-messages-via-the-anoncomms-mixnet-demo-app.md)](https://github.com/logos-co/logos-docs/blob/main/docs/connect/anoncomms/journeys/discover-nodes-and-send-messages-via-the-anoncomms-mixnet-demo-app.md) — Use the AnonComms Mixnet demo application to discover network nodes and exchange messages anonymously.

## If you get stuck

Please open an issue in this repository describing your what you are trying to complete and where you got blocked.

## Documentation status and timeline

We are consolidating and updating previously fragmented materials into a single, coherent developer experience and source of truth, featuring consistent navigation and terminology. This process is ongoing, and we appreciate your patience as we work to provide comprehensive and up-to-date documentation.

We are also unifying public naming in our documentation to reflect Logos as a single technical stack: Nomos → Logos Blockchain, Codex → Logos Storage, and Waku → Logos Messaging. This consolidation makes the architecture easier to navigate by aligning documentation, examples, and terminology under one scheme. Legacy names may still appear in repositories and specifications, but going forward the Logos-first names will be used across our docs.

Our aim is to provide a predictable onboarding path for operators and developers, where they can find what they need and trust what they read.

### What to expect next

In 2026 we will release documentation in phases aligned with the project milestones.

We will provide operator guides for those who want to run and support the Logos Blockchain, and developer guides for contributors building decentralized applications on the Logos stack (blockchain, storage, messaging).

### How to follow progress and contribute

We will update this page as sections go live and contribution paths open. Timelines may adjust as the system evolves.
