# Build with Logos (temporary docs index)

> [!IMPORTANT]
>
>**Work in progress.** We are consolidating public developer docs for Logos into this repository.
> Until the first curated documentation set lands in the **first half of 2026**, expect rough edges: links may move or break, some use cases have no public docs yet, and many instructions are still being written.
>
> We appreciate your patience as we work to provide a coherent and comprehensive developer experience.

## What is Logos

Logos is a modular technology stack for building decentralized applications. Logos consolidates previously separate efforts (Nomos, Codex, and Waku) under one public identity to reduce cognitive load and provide a unified developer experience.

To learn more about Logos, visit the [Logos main site](https://logos.co).

## Logos stack components

- **Blockchain (base layer):** Runs the base chain for the testnet (consensus + data availability + settlement) and provides the foundation other components build on.
- **LSSA rollup:** Execution layer for wallet, token operations, and program deployment with support for public and private contexts.
- **Messaging:** Peer-to-peer messaging protocols and client libraries that apps use to publish and retrieve messages.
- **Storage:** Node-side content storage and retrieval functionality.

  > [!NOTE]
  >
  > Public end-to-end docs for Storage are not published yet.

- **Core:** A host runtime + SDKs for running modules and apps in the Logos ecosystem.
- **AnonComms:** Mixnet and capability-discovery components used to route messages with improved metadata privacy.

## Choose your path

The sections below include the information and links for the things that you can do now in Logos. When a journey has no public docs yet, you will see an explicit "docs not published yet" note.

### LSSA rollup

- **Set up a wallet for an LSSA-based chain:** Create a wallet and connect it to the LSSA environment so you can run the token and program flows.

  - LSSA repo (start here): https://github.com/logos-blockchain/lssa
  - Try the Wallet CLI: https://github.com/logos-blockchain/lssa#try-the-wallet-cli

- **Transfer tokens in public and private contexts:** Send native tokens using the wallet CLI across public/private combinations.

  - Wallet CLI walkthrough: https://github.com/logos-blockchain/lssa#try-the-wallet-cli

- **Create and transfer custom tokens (public and private contexts):** Define a custom token and execute transfers with different privacy modes.

  - Token program section (same README): https://github.com/logos-blockchain/lssa#the-token-program

- **Deploy custom programs using LSSA templates:** Build and deploy a sample program using the provided tutorial and templates.

  - Program deployment tutorial: https://github.com/logos-blockchain/lssa/tree/main/examples/program_deployment

- **Interact with sample apps in public and private contexts:** Run apps that exercise public/private context flows.

  - Example apps entry point: https://github.com/logos-co/logos-app-poc

    > [!NOTE]
    >
    > This repo is still evolving; some apps may be prototypes without full docs.

- **Track transactions through an LSSA explorer:** View LSSA transactions and state via an explorer UI/API.

  - Docs not published yet.

- **Use an LSSA transaction generator to stress-test the Logos testnet:** Generate high-volume transactions to measure performance.

  - Docs not published yet.

### Blockchain (base layer)

- **Set up a user wallet for the base layer:** Install and run the base-layer wallet UI/module so you can hold assets and interact with the chain.

  - Wallet UI: https://github.com/logos-co/logos-wallet-ui
  - Wallet module: https://github.com/logos-co/logos-wallet-module

- **Receive tokens from a faucet:** Obtain test tokens needed to run the v0.1 flows.

  - Docs not published yet.

- **Run a validator / consensus node (includes staking):** Run a base-layer node and participate in consensus.
  - Node repo: https://github.com/logos-co/nomos

    > [!NOTE]
    >
    > Public docs exist, but some details may change as testnet packaging stabilizes.

- **Run an archival DA node:** Operate an archival data-availability node and serve queries needed by rollup tooling.

  - Node repo (base layer): https://github.com/logos-co/nomos
  - DA research notes/code: https://github.com/logos-storage/das-research
  - Full documentation not published yet.

### Storage

- **Use the Storage module API:** Integrate with the storage module from an app or a local node operator setup.

  - Full documentation does not exist yet.
  - Code entry point: https://github.com/logos-storage/logos-storage-nim

### Messaging

- **Tests the Messaging module via its API:** Integrate messaging into an external app and validate basic publish/subscribe and message retrieval flows.

  - Public docs entry point: https://docs.waku.org
  - Reference implementation (protocols in Nim): https://github.com/logos-messaging/logos-messaging-nim

### Core + Messaging (demo chat app)

- **Use a demo chat app in Core using the Chat SDK and Messaging:** Run the demo chat UI/app and validate end-to-end message send/receive.

  - Core PoC (start here): https://github.com/logos-co/logos-core-poc

### Core

  - Docs not published yet.

### AnonComms

- **Use the AnonComms demo and capability discovery (work in progress):** Explore how the stack discovers nodes with specific capabilities and routes messages through a mixnet; public how-to docs and stable APIs are not published yet.

  - Roadmap (start here): https://roadmap.logos.co/anoncomms/roadmap/
  - Mixnet milestone context: https://roadmap.logos.co/messaging/milestones/closed/2025-introduce-mixnet-for-message-sending
  - Recent update context: https://roadmap.logos.co/anoncomms/updates/2025-12-08
  - Docs not published yet.

## If you get stuck

If you cannot complete a journey with public docs, please open an issue in this repository describing the journey you are trying to complete and where you got blocked.

## Documentation status and timeline

We are consolidating and updating previously fragmented materials into a single, coherent developer experience and source of truth, featuring consistent navigation and terminology. This process is ongoing, and we appreciate your patience as we work to provide comprehensive and up-to-date documentation.

We are also unifying public naming in our documentation to reflect Logos as a single technical stack: Nomos → Logos Blockchain, Codex → Logos Storage, and Waku → Logos Messaging. This consolidation makes the architecture easier to navigate by aligning documentation, examples, and terminology under one scheme. Legacy names may still appear in repositories and specifications, but going forward the Logos-first names will be used across our docs.

Our aim is to provide a predictable onboarding path for operators and developers, where they can find what they need and trust what they read.

### What to expect next

Starting in 2026, we will release documentation in phases aligned with the project milestones.

We will provide operator guides for those who want to run and support the Logos Blockchain, and developer guides for contributors building decentralized applications on the Logos stack (blockchain, storage, messaging).

### How to follow progress and contribute

We will update this page as sections go live and contribution paths open. Timelines may adjust as the system evolves.
