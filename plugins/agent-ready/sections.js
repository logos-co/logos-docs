// Section metadata for the agent-facing outputs (llms.txt, the per-section
// indexes, docs.json and the docs MCP server's `list_sections` tool).
//
// `use_cases` is what an agent reads to decide which section to open, so phrase
// each entry as a task the reader is trying to do, not as a topic name.
// A docs folder that is missing here still gets indexed, under its folder name.

module.exports = [
  {
    id: 'get-started',
    title: 'Get started',
    description: 'What Logos is, the glossary, testnet endpoints, the map of repositories, and how to use these docs with a coding agent.',
    use_cases: [
      'understand what Logos is and how the stack fits together',
      'look up a Logos term (module, LGX, LEZ, zone, mixnet)',
      'find testnet RPC endpoints, faucets and explorers',
      'find which GitHub repository holds a component',
      'connect a coding agent to these docs',
    ],
  },
  {
    id: 'basecamp',
    title: 'Basecamp',
    description: 'Logos Basecamp, the local-first desktop launcher that installs and runs Logos modules and apps.',
    use_cases: [
      'install Logos Basecamp',
      'install and load an .lgx module into Basecamp',
      'swap ETH and LEZ tokens in Basecamp',
    ],
  },
  {
    id: 'build-an-app',
    title: 'Build an app',
    description: 'Logos Scaffold: the CLI that creates, builds and runs Logos modules and Basecamp apps, with its configuration reference and troubleshooting.',
    use_cases: [
      'create a new Logos module or Basecamp app with logos-scaffold (lgs)',
      'configure a scaffold project for Basecamp',
      'debug a module that Basecamp does not load',
    ],
  },
  {
    id: 'core',
    title: 'Core',
    description: 'Logos Core: building core and UI modules with logos-module-builder, metadata.json, the LGX package format, and the logosctl CLI.',
    use_cases: [
      'build and run a Logos core module (C++/Qt plugin)',
      'wrap an existing C library as a Logos module',
      'build a C++ UI module for Basecamp',
      'write or check a module metadata.json',
      'package a module as .lgx (portable vs -dev variants)',
      'run modules headlessly with logosctl',
    ],
  },
  {
    id: 'blockchain',
    title: 'Blockchain',
    description: 'The Logos Blockchain (Cryptarchia consensus, Mantle, Blend network): running nodes, moving and bridging assets, zones, the Zone SDK and Logos SQL.',
    use_cases: [
      'run a Logos Blockchain node from the CLI or from Basecamp',
      'claim leader rewards',
      'transfer tokens or bridge assets to a zone',
      'build an application on a zone with Logos SQL or the Zone SDK',
      'understand Cryptarchia, Mantle or the Blend network',
    ],
  },
  {
    id: 'lez',
    title: 'LEZ (Logos Execution Zone)',
    description: 'The Logos Execution Zone: wallet, accounts, public and private transfers, custom tokens, programs, RLN membership, explorer and chain following.',
    use_cases: [
      'run the LEZ wallet and transfer native tokens',
      'create and transfer custom tokens on LEZ',
      'write and deploy a LEZ program',
      'register an RLN membership',
      'run a LEZ explorer or follow the chain',
    ],
  },
  {
    id: 'messaging',
    title: 'Messaging',
    description: 'Logos Messaging: the Delivery node and module API, the Chat module API, Logos Chat 1:1 and group messaging, and peer-discovery concepts.',
    use_cases: [
      'run a Delivery node',
      'use the Delivery module API from an app',
      'build a module that uses the Chat module API',
      'send 1:1 or group messages with Logos Chat',
      'understand how messaging peers discover each other',
    ],
  },
  {
    id: 'storage',
    title: 'Storage',
    description: 'Logos Storage: decentralised, content-addressed file storage. Running a storage node and building apps on the Storage API.',
    use_cases: [
      'run a Logos Storage node from the CLI or Basecamp',
      'upload and download files',
      'build a CLI app that uses the Storage API',
    ],
  },
  {
    id: 'mixnet',
    title: 'Mixnet',
    description: 'The Logos mix network, which hides who talks to whom from network observers.',
    use_cases: ['send anonymised messages over the mix network'],
  },
  {
    id: 'peer-discovery',
    title: 'Peer discovery',
    description: 'Peer discovery and connection management without central registries.',
    use_cases: ['build a Logos core module that uses the service discovery API'],
  },
  {
    id: 'run-a-node',
    title: 'Run a node',
    description: 'Path pages for node operators.',
    use_cases: ['run a full node for blockchain, delivery and storage'],
  },
];
