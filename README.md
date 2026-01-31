# Build with Logos (temporary docs index)

> [!IMPORTANT]
>
>**Work in progress.** We are consolidating public developer docs for Logos into this repository.
> Until the first curated documentation set lands in the **first half of 2026**, expect rough edges: links may move or break, some use cases have no public docs yet, and many instructions are still being written.
>
> We appreciate your patience as we work to provide a coherent and comprehensive developer experience.

## What is Logos

Logos is a modular technology stack for building decentralized applications. Logos consolidates previously separate efforts (Nomos, Codex, and Waku) under one public identity to reduce cognitive load for developers and users.

The current Web3 developer and user experience is fragmented. Developers need to build and deploy smart contracts on-chain, write front ends that are hosted centrally, use centralized third-party services for applications to work, and rely heavily on web-browser access, which is prone to privacy leaks.

Logos is a ground-up re-imagination of the technology stack. It brings together discrete but necessary components in one tech stack that solves for both the developer experience as well as the user experience.

To learn more about Logos, visit (https://logos.co/tech-stack)

## Logos stack components
- **Blockchain (consensus and data availability layer):** Runs the consensus layer in the technolgy stack (i.e. consensus + data availability + settlement) and provides the foundation other components build on. Logos Blockchain provides a resilient, censorship resistant foundation for building applications while protecting the privacy of individual participants including node operators.
- **Logos Execution Zone:** Execution zone (Rollup) running on the Base layer for wallet, token operations, and program deployment with support for public and private contexts (previously referred to as Logos State Separation Architecture or LSSA). 
- **Messaging:** Peer-to-peer messaging protocols and client libraries that apps use to publish and retrieve messages.
- **Storage:** Node-side content storage and retrieval functionality.
- **Logos App:** An app built on the Logos Core framework that enables users to interact with the Logos ecosystem. It enables discovery of published applications, running local modules (e.g. node for the blockchain) in the Logos ecosystem and more, while avoiding the dependencies on web-browser interactions typically seen in Web3. 
- **AnonComms:** Mixnet and capability-discovery components used to route messages with improved metadata privacy.

## Choose your path

The sections below include the information and links for the things that you can do now in Logos. When a journey has no public docs yet, you will see an explicit "docs not published yet" note. The set of use cases listed here are categorised by the component of the technology stack that the users can interact with. These use cases are evolving fast and we recommend users to review this documentation frequently for updates. While some documentation allows for these use cases to be performed via the CLI, additional documentation will be added as these use cases can be performed via the Logos App as well. 

### Logos Execution Zone 

- **Set up a wallet in the Logos Execution Zone:** Create a wallet on a LEZ environment (e.g. testnet) and change token visibility between private context and public contexts.

  - LSSA repo (start here): https://github.com/logos-blockchain/lssa
  - Try the Wallet CLI: https://github.com/logos-blockchain/lssa#try-the-wallet-cli

- **Transfer tokens in public and private contexts:** Send native tokens using the wallet CLI in both private and public contexts.

  - Wallet CLI walkthrough: https://github.com/logos-blockchain/lssa#try-the-wallet-cli

- **Create and transfer custom tokens (public and private contexts):** Define a custom token and execute transfers in private and public contexts.

  - Token program section (same README): https://github.com/logos-blockchain/lssa#the-token-program

- **Deploy custom programs using LEZ templates:** Build and deploy a sample program (i.e. contracts) using the provided tutorial and templates.

  - Program deployment tutorial: https://github.com/logos-blockchain/lssa/tree/main/examples/program_deployment

- **Interact with sample apps in public and private contexts:** Run apps that exercise public/private context flows.

  - Example apps entry point: https://github.com/logos-co/logos-app-poc

    > [!NOTE]
    >
    > This repo is still evolving; some apps may be prototypes without full docs.

- **Track transactions through an LEZ explorer:** View LEZ transactions and state via an explorer UI/API.

  - Docs not published yet.

- **Use an LEZ transaction generator to stress-test the Logos testnet:** Generate high-volume transactions to measure performance.

  - Docs not published yet.

### Blockchain (base layer)

- **Set up a user wallet for the base layer (consensus):** Install and run the base-layer wallet UI/module so you can hold assets and interact with the chain.

  - Wallet UI: https://github.com/logos-co/logos-wallet-ui
  - Wallet module: https://github.com/logos-co/logos-wallet-module

- **Receive tokens from a faucet:** Obtain test tokens needed to run the v0.1 flows.

  - Docs not published yet.

- **Run a validator node:** Run a base-layer node and participate in consensus by staking tokens.
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
