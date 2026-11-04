# Logos documentation

> Guides and references for the Logos stack: a modular, local-first technology stack for decentralised apps. Logos Basecamp runs modules and apps; Logos Core builds them; the Logos Blockchain, LEZ (the Logos Execution Zone), Messaging, Storage and the Mixnet are the services they use.

## How to read these docs

- Every page is available as Markdown: add `.md` to its URL (for example https://docs.logos.co/get-started/what-is-logos.md).
- Each section has its own index (`/<section>/llms.txt`) and full text (`/<section>/llms-full.txt`). The whole set is at https://docs.logos.co/llms-full.txt.
- Structured index with section use cases: https://docs.logos.co/agents/docs.json
- Coding with agents (AGENTS.md block, skill): https://docs.logos.co/get-started/coding-with-agents.md

## Get started

What Logos is, the glossary, testnet endpoints, the map of repositories, and how to use these docs with a coding agent.
Use this section to: understand what Logos is and how the stack fits together; look up a Logos term (module, LGX, LEZ, zone, mixnet); find testnet RPC endpoints, faucets and explorers; find which GitHub repository holds a component; connect a coding agent to these docs.
Section index: https://docs.logos.co/get-started/llms.txt

- [What is Logos?](https://docs.logos.co/get-started/what-is-logos.md): Learn how the Logos technology stack is organised as a modular operating system for decentralised applications.
- [Use the Logos docs with coding agents](https://docs.logos.co/get-started/coding-with-agents.md): Give Claude Code, Cursor, Codex, or another coding agent the Logos documentation so it works from current docs instead of memory.
- [Logos ecosystem repositories](https://docs.logos.co/get-started/logos-ecosystem-repositories.md): Review the key repositories across the logos organisations.
- [Glossary](https://docs.logos.co/get-started/glossary.md): A list of some common terms and phrases specific to the Logos ecosystem.
- [Testnet endpoints](https://docs.logos.co/get-started/testnet-endpoints.md): Look up the RPC, explorer, release, and channel for each Logos Testnet.

## Basecamp

Logos Basecamp, the local-first desktop launcher that installs and runs Logos modules and apps.
Use this section to: install Logos Basecamp; install and load an .lgx module into Basecamp; swap ETH and LEZ tokens in Basecamp.
Section index: https://docs.logos.co/basecamp/llms.txt

- [Install Logos Basecamp](https://docs.logos.co/basecamp/install-logos-basecamp.md): Get Logos Basecamp running on your desktop.
- [Install and load a module in Basecamp](https://docs.logos.co/basecamp/install-and-load-module-in-basecamp.md): Access features and functionalities through modules in Logos Basecamp.
- [Swap ETH and LEZ tokens in Basecamp](https://docs.logos.co/basecamp/atomic-swaps-poc.md): Install the atomic swap app from a catalogue URL and trade Sepolia ETH for LEZ testnet tokens with a counterparty you never have to trust.

## Build an app

Logos Scaffold: the CLI that creates, builds and runs Logos modules and Basecamp apps, with its configuration reference and troubleshooting.
Use this section to: create a new Logos module or Basecamp app with logos-scaffold (lgs); configure a scaffold project for Basecamp; debug a module that Basecamp does not load.
Section index: https://docs.logos.co/build-an-app/llms.txt

- [Integrate Logos into your application](https://docs.logos.co/build-an-app/integrate-logos.md): Choose how your application reaches the Logos stack, and where the nodes it depends on run.
- [About Logos Scaffold](https://docs.logos.co/build-an-app/scaffold/about-logos-scaffold.md): Understand what Logos Scaffold manages and when to reach for it.
- [Develop a Logos module with Logos Scaffold](https://docs.logos.co/build-an-app/scaffold/get-started/develop-a-logos-module-with-logos-scaffold.md): Build a module, install it into Basecamp, and iterate on it.
- [Troubleshoot Logos module development with Basecamp](https://docs.logos.co/build-an-app/scaffold/troubleshooting/troubleshoot-logos-module-development-with-basecamp.md): Diagnose the failures that show up while iterating on a module.
- [Logos Scaffold Basecamp configuration reference](https://docs.logos.co/build-an-app/scaffold/reference/logos-scaffold-basecamp-configuration-reference.md): Look up the `scaffold.toml` keys, launch environment, and directories behind `lgs basecamp`.

## Core

Logos Core: building core and UI modules with logos-module-builder, metadata.json, the LGX package format, and the logosctl CLI.
Use this section to: build and run a Logos core module (C++/Qt plugin); wrap an existing C library as a Logos module; build a C++ UI module for Basecamp; write or check a module metadata.json; package a module as .lgx (portable vs -dev variants); run modules headlessly with logosctl.
Section index: https://docs.logos.co/core/llms.txt

- [Start a Logos module from the CLI](https://docs.logos.co/core/build-modules/start-a-logos-module-from-the-cli.md): Explore how to load and call a Logos module from the command line using `logosctl`.
- [Build and run a Logos core module](https://docs.logos.co/core/build-modules/build-and-run-a-logos-core-module.md): Scaffold, build, package, and test a core module on Logos.
- [Wrap a C library as a Logos module](https://docs.logos.co/core/build-modules/wrap-a-c-library-as-a-logos-core-module.md): Expose functions from a C shared library through a Logos core module.
- [Build a Logos C++ UI module](https://docs.logos.co/core/build-modules/build-a-logos-cpp-ui-module.md): Get started building a ui\_qml module with a C++ backend that runs in a separate process.
- [LGX package format and bundling reference](https://docs.logos.co/core/reference/lgx-package-format-and-bundling-reference.md): An LGX file (.lgx) is the package format for distributing a Logos module: a deterministic, gzip-compressed tar archive that bundles one or more platform-specific builds of the module with a signed manifest describing its metadata and dependencies. lgx is the CLI that creates, inspects, and signs these archives. logosctl installs them into a session, from a catalogue or from a local file; the standalone lgpm installs local files, and lgpd downloads packages from a catalogue without installing them.
- [Logos CLI Reference](https://docs.logos.co/core/reference/logos-cli-reference.md): logosctl is the command-line tool for running Logos modules without the Basecamp app. It runs the Logos Core runtime as a daemon, which you drive with client commands to install packages, load modules, call their methods and watch their events. It bundles the package manager and package downloader modules, so searching a catalogue, installing with dependencies resolved, loading and calling all go through one binary.

## Blockchain

The Logos Blockchain (Cryptarchia consensus, Mantle, Blend network): running nodes, moving and bridging assets, zones, the Zone SDK and Logos SQL.
Use this section to: run a Logos Blockchain node from the CLI or from Basecamp; claim leader rewards; transfer tokens or bridge assets to a zone; build an application on a zone with Logos SQL or the Zone SDK; understand Cryptarchia, Mantle or the Blend network.
Section index: https://docs.logos.co/blockchain/llms.txt

- [Introduction to the Logos Blockchain](https://docs.logos.co/blockchain.md): Learn how Logos provides a private, resilient foundation for building decentralised applications.
- [Run a Blockchain node from Basecamp](https://docs.logos.co/blockchain/get-started/run-blockchain-node-from-basecamp.md): Install the blockchain modules and run a syncing testnet node from the Basecamp desktop app.
- [Run a Blockchain node from the CLI](https://docs.logos.co/blockchain/get-started/run-blockchain-node-from-cli.md): Start a node on the public testnet and verify runtime and consensus signals.
- [Claim leader rewards in Basecamp](https://docs.logos.co/blockchain/get-started/claim-leader-rewards-in-basecamp.md): Learn how to get rewarded for having your Logos Blockchain node propose blocks.
- [About Bedrock](https://docs.logos.co/blockchain/concepts/about-bedrock.md): Understand how Bedrock provides the consensus and shared context that Zones build on.
- [About Cryptarchia](https://docs.logos.co/blockchain/concepts/about-cryptarchia.md): Understand how Cryptarchia reaches consensus while keeping block proposers private.
- [About Mantle](https://docs.logos.co/blockchain/concepts/about-mantle.md): Understand how Mantle lets nodes and Zones interact with Bedrock.
- [About the Blend Network](https://docs.logos.co/blockchain/concepts/about-the-blend-network.md): Understand how the Blend Network hides the link between a block proposer and their proposal.
- [About Zones](https://docs.logos.co/blockchain/concepts/about-zones.md): Understand how Zones run custom, high-performance applications on the Logos Blockchain.
- [Move Blockchain assets on Basecamp](https://docs.logos.co/blockchain/transfer-tokens/move-blockchain-assets-on-basecamp.md): Get started with token transfers between wallet accounts directly from the dashboard UI.
- [Bridge assets from Logos Blockchain to a Zone on Basecamp](https://docs.logos.co/blockchain/transfer-tokens/bridge-assets-from-logos-blockchain-to-zone-on-basecamp.md): Get started locking wallet notes into a Logos Zone, including the LEZ, using Basecamp.
- [Inscribe data on-chain using the Zone SDK](https://docs.logos.co/blockchain/zone-sdk/inscribe-data-on-chain-using-zone-sdk.md): Learn how to write plain text as on-chain inscriptions using a simple Logos Zone.
- [Bridge assets between Logos Blockchain and a Zone](https://docs.logos.co/blockchain/zone-sdk/bridge-assets-between-blockchain-and-zone.md): Move tokens between Logos Blockchain and a Zone using channels and the Zone SDK.
- [Operate a decentralised Zone with round-robin sequencer rotation](https://docs.logos.co/blockchain/zone-sdk/operate-decentralised-zone-with-round-robin-sequencer-rotation.md): Get started with multi-sequencer channels using the Zone SDK and round-robin slot windows.
- [Join the Blend network as a core node](https://docs.logos.co/blockchain/blend/join-the-blend-network-as-a-core-node.md): Connect your blockchain node to Blend to contribute to proposer privacy.
- [Introduction to Logos SQL](https://docs.logos.co/blockchain/logos-sql.md): Learn how applications share a database through the Logos Blockchain while keeping a local copy of their data.
- [Build an application with Logos SQL](https://docs.logos.co/blockchain/logos-sql/build-application-with-logos-sql.md): Run a password-manager example and follow its SQL writes between two local databases.
- [Handle displaced writes](https://docs.logos.co/blockchain/logos-sql/handle-displaced-writes.md): Find out why a Logos SQL write was blocked, review displaced writes and decide how to continue.
- [Blockchain FAQ](https://docs.logos.co/blockchain/faq.md): Review answers to less obvious questions about how the Logos Blockchain works and where it fits.
- [Logos Blockchain API Reference](https://docs.logos.co/blockchain/reference/blockchain-api-reference.md): This page describes every HTTP endpoint a Logos Blockchain node exposes. It's accurate for Logos Blockchain node 0.3.1.

## LEZ (Logos Execution Zone)

The Logos Execution Zone: wallet, accounts, public and private transfers, custom tokens, programs, RLN membership, explorer and chain following.
Use this section to: run the LEZ wallet and transfer native tokens; create and transfer custom tokens on LEZ; write and deploy a LEZ program; register an RLN membership; run a LEZ explorer or follow the chain.
Section index: https://docs.logos.co/lez/llms.txt

- [Introduction to the Logos Execution Zone](https://docs.logos.co/lez.md): Understand how the Logos Execution Zone runs general-purpose applications with selective privacy.
- [Run the LEZ wallet app and initiate native token transfers](https://docs.logos.co/lez/get-started/run-lez-wallet-app-initiate-native-token-transfers.md): Use the wallet app to set up accounts and try every type of native token transfer on the LEZ testnet.
- [Run an LEZ wallet via the CLI](https://docs.logos.co/lez/get-started/run-lez-wallet-via-cli.md): Try the wallet CLI against the live LEZ testnet.
- [Transfer native tokens on the LEZ](https://docs.logos.co/lez/transfer-tokens/transfer-native-tokens-on-lez.md): Use the wallet CLI to send native tokens to public and private accounts.
- [Transfer LEZ tokens between public and private states](https://docs.logos.co/lez/transfer-tokens/transfer-lez-tokens-between-public-private-states.md): Get started with private transfers to accounts you don't control, using a recipient-published keypair.
- [Run an LEZ Indexer](https://docs.logos.co/lez/follow-chain/run-lez-indexer.md): Get started with the LEZ Indexer and query finalised LEZ state over HTTP RPC.
- [Start and use an instance of the LEZ Explorer](https://docs.logos.co/lez/follow-chain/start-and-use-instance-of-lez-explorer.md): Get a clear view of on-chain activity including blocks, transactions, and accounts.
- [Set up a shared private account](https://docs.logos.co/lez/accounts/set-up-shared-private-lez-account.md): Get started with group-owned private accounts where every member independently derives the same keys.
- [Write and deploy an LEZ program with `logos-scaffold`](https://docs.logos.co/lez/programs/write-and-deploy-lez-program-with-scaffold.md): Use `logos-scaffold` to create, build, and deploy a guest program on a local Logos Execution Zone sequencer.
- [Write an LEZ program that updates an account via `plan` and `apply`](https://docs.logos.co/lez/programs/write-lez-program-with-plan-and-apply.md): Walk through the example guest programs to learn how an LEZ program declares effects in `plan` and writes one shard at a time in `apply`.
- [Register an RLN membership from Basecamp](https://docs.logos.co/lez/rln/register-rln-membership-from-basecamp.md): Get an RLN membership on the LEZ testnet for a delivery node running in Logos Basecamp.
- [Register an RLN membership on LEZ with a Delivery node](https://docs.logos.co/lez/rln/register-rln-membership-on-lez-with-delivery-node.md): Start a Logos Delivery node on the DoS-protected logos.test network, register its RLN membership on the Logos Execution Zone, and send a rate-limited message.
- [Gate program instructions with admin-authority](https://docs.logos.co/lez/extensions/admin-authority.md): This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. This content is still being completed and verified.
- [Freeze program execution with freeze-authority](https://docs.logos.co/lez/extensions/freeze-authority.md): This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. This content is still being completed and verified.
- [Build a SPEL extension library](https://docs.logos.co/lez/extensions/build-a-spel-extension-library.md): This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. This content is still being completed and verified.

## Messaging

Logos Messaging: the Delivery node and module API, the Chat module API, Logos Chat 1:1 and group messaging, and peer-discovery concepts.
Use this section to: run a Delivery node; use the Delivery module API from an app; build a module that uses the Chat module API; send 1:1 or group messages with Logos Chat; understand how messaging peers discover each other.
Section index: https://docs.logos.co/messaging/llms.txt

- [Introduction to Logos Messaging](https://docs.logos.co/messaging.md): Learn how Logos can be used to build private, censorship-resistant communication applications.
- [Send 1:1 messages with the Logos Chat app](https://docs.logos.co/messaging/get-started/send-1-1-messages-logos-chat.md): Try out end-to-end encrypted private messaging over the Logos network.
- [Send group messages with the Logos Chat app](https://docs.logos.co/messaging/get-started/send-group-messages-logos-chat.md): Create a three-member end-to-end encrypted group conversation in the Logos Chat app, invite members by address, and send a message that reaches all of them.
- [FAQ: Logos Messaging](https://docs.logos.co/messaging/get-started/faq.md): Review common questions about how Logos Messaging works and how to build on it.
- [Understand Logos Delivery protocols](https://docs.logos.co/messaging/concepts/protocols.md): Understand the modular protocols that let applications balance anonymity, scalability, and latency.
- [About content topics](https://docs.logos.co/messaging/concepts/content-topics.md): Understand how content topics filter and route messages, and how naming choices affect privacy.
- [About network domains](https://docs.logos.co/messaging/concepts/network-domains.md): Understand the discovery, gossip, and request/response domains that structure how peers interact.
- [About transports](https://docs.logos.co/messaging/concepts/transports.md): Understand how nodes move data between peers and which transports suit each environment.
- [About static peers](https://docs.logos.co/messaging/concepts/understand-peer-discovery/static-peers.md): Understand how hard-coded bootstrap peers work and the trade-offs they carry.
- [About DNS discovery](https://docs.logos.co/messaging/concepts/understand-peer-discovery/dns-discovery.md): Understand how a node retrieves peer connection details from an ENR tree published in DNS.
- [About Discv5](https://docs.logos.co/messaging/concepts/understand-peer-discovery/discv5.md): Understand how Discv5 uses a distributed hash table to find peers across the network.
- [About peer exchange](https://docs.logos.co/messaging/concepts/understand-peer-discovery/peer-exchange.md): Understand how light nodes request peers from other nodes without relying on Discv5.
- [Understand Logos Delivery security features](https://docs.logos.co/messaging/concepts/security-features.md): See the services that keep Logos Delivery communication private and abuse-resistant.
- [Learn the differences between Logos Delivery and libp2p](https://docs.logos.co/messaging/concepts/logos-delivery-and-libp2p.md): Understand what Logos Delivery adds on top of libp2p and where the two differ.
- [Use the Delivery module API in an app](https://docs.logos.co/messaging/delivery/use-delivery-module-api-in-app.md): Get started integrating Logos messaging into a C++ module.
- [Run a Delivery node from the CLI](https://docs.logos.co/messaging/delivery/run-delivery-node-from-cli.md): Use the Delivery module to run a Logos Delivery node on the CLI
- [Build a Logos module that uses the Chat module API](https://docs.logos.co/messaging/chat-module/build-logos-module-that-uses-chat-module-api.md): Get started with private 1:1 and group end-to-end encrypted messaging in your own Logos module.
- [Understand peer discovery](https://docs.logos.co/messaging/concepts/understand-peer-discovery/peer-discovery.md): Learn how a node bootstraps and finds the peers it needs to operate.

## Storage

Logos Storage: decentralised, content-addressed file storage. Running a storage node and building apps on the Storage API.
Use this section to: run a Logos Storage node from the CLI or Basecamp; upload and download files; build a CLI app that uses the Storage API.
Section index: https://docs.logos.co/storage/llms.txt

- [Introduction to Logos Storage](https://docs.logos.co/storage.md): Learn how Logos can be used to build resilient, censorship-resistant file sharing applications.
- [Run a Storage Node from Basecamp](https://docs.logos.co/storage/get-started/run-storage-node-from-basecamp.md): Get started sharing and downloading files on the Logos Storage network
- [Run a Storage node from the CLI](https://docs.logos.co/storage/get-started/run-storage-node-from-cli.md): Get started running a Logos Storage node and uploading your first file to the Logos network.
- [Run a Mix network of Storage nodes](https://docs.logos.co/storage/get-started/run-mix-network-of-storage-nodes.md): Stand up a local Mix network and download a file through it, with the content lookup routed through Mix for privacy.
- [Troubleshooting](https://docs.logos.co/storage/get-started/faq.md): Fix the most common problems of a storage node.
- [Connectivity](https://docs.logos.co/storage/concepts/connectivity.md): Understand how a storage node joins a network and becomes reachable from the internet.
- [Mix](https://docs.logos.co/storage/concepts/mix.md): This document reflects the state of this Logos component as it will exist on mainnet. Some features described here may not be available on the current testnet.
- [Build a CLI app that uses the Storage API](https://docs.logos.co/storage/build-app/build-cli-app-that-uses-storage-api.md): Wrap the Storage module API in a simple synchronous CLI interface.

## Mixnet

The Logos mix network, which hides who talks to whom from network observers.
Use this section to: send anonymised messages over the mix network.
Section index: https://docs.logos.co/mixnet/llms.txt

- [Send anonymised messages over the mix network](https://docs.logos.co/mixnet/get-started/send-anonymised-messages-over-the-mix-network.md): Get started sending and receiving messages with improved sender privacy using the Logos Chat UI.

## Peer discovery

Peer discovery and connection management without central registries.
Use this section to: build a Logos core module that uses the service discovery API.
Section index: https://docs.logos.co/peer-discovery/llms.txt

- [Build a Logos Core module that uses the Service Discovery API](https://docs.logos.co/peer-discovery/get-started/build-logos-core-module-that-uses-service-discovery-api.md): Get started with typed, service-keyed peer lookups in a live Logos network.

## Run a node

Path pages for node operators.
Use this section to: run a full node for blockchain, delivery and storage.
Section index: https://docs.logos.co/run-a-node/llms.txt

- [Run a Logos node with blockchain, storage, and delivery](https://docs.logos.co/run-a-node.md): Get started running a full Logos node with all three core modules on testnet v0.3.
- [Expose Logos node metrics to Prometheus](https://docs.logos.co/run-a-node/expose-node-metrics.md): Serve the blockchain, storage, and delivery metrics of a running Logos node on one OpenMetrics endpoint and scrape it with Prometheus.
