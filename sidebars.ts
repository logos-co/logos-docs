import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)
const sidebars: SidebarsConfig = {
  runAnAppSidebar: [
    {
      type: 'category',
      label: 'Run an app',
      link: {
        type: 'generated-index',
        title: 'Run an app',
        description:
          'Run modules inside Basecamp, through individual UI apps, or headlessly.',
        slug: '/run-an-app',
      },
      items: [
        {
          type: 'category',
          label: 'Basecamp',
          items: [
            {
              type: 'link',
              label: 'Install Logos Basecamp',
              href: '/basecamp/install-logos-basecamp',
            },
            {
              type: 'link',
              label: 'Install and load a module in Basecamp',
              href: '/basecamp/install-and-load-module-in-basecamp',
            },
            {
              type: 'link',
              label: 'Swap ETH and LEZ tokens in Basecamp',
              href: '/basecamp/atomic-swaps-poc',
            },
          ],
        },
        {
          type: 'category',
          label: 'Blockchain app',
          items: [
            {
              type: 'link',
              label: 'Run a Blockchain node from Basecamp',
              href: '/blockchain/get-started/run-blockchain-node-from-basecamp',
            },
            {
              type: 'link',
              label: 'Move Blockchain assets on Basecamp',
              href: '/blockchain/transfer-tokens/move-blockchain-assets-on-basecamp',
            },
            {
              type: 'link',
              label: 'Bridge assets from Logos Blockchain to a Zone on Basecamp',
              href: '/blockchain/transfer-tokens/bridge-assets-from-logos-blockchain-to-zone-on-basecamp',
            },
            {
              type: 'link',
              label: 'Claim leader rewards in Basecamp',
              href: '/blockchain/get-started/claim-leader-rewards-in-basecamp',
            },
          ],
        },
        {
          type: 'category',
          label: 'LEZ wallet app',
          items: [
            {
              type: 'link',
              label: 'Run the LEZ wallet app and initiate native token transfers',
              href: '/lez/get-started/run-lez-wallet-app-initiate-native-token-transfers',
            },
          ],
        },
        {
          type: 'category',
          label: 'Chat App',
          items: [
            {
              type: 'link',
              label: 'Send 1:1 messages with the Logos Chat app',
              href: '/messaging/get-started/send-1-1-messages-logos-chat',
            },
          ],
        },
        {
          type: 'category',
          label: 'Storage app',
          items: [
            {
              type: 'link',
              label: 'Run a Storage Node from Basecamp',
              href: '/storage/get-started/run-storage-node-from-basecamp',
            },
          ],
        },
      ],
    },
  ],
  runANodeSidebar: [
    'run-a-node/get-started/run-logos-node-blockchain-storage-delivery',
    'run-a-node/get-started/expose-logos-node-metrics-to-prometheus',
    {
      type: 'category',
      label: 'Blockchain node',
      items: [
        {
          type: 'link',
          label: 'Run a Blockchain node from Basecamp',
          href: '/blockchain/get-started/run-blockchain-node-from-basecamp',
        },
        {
          type: 'link',
          label: 'Run a Blockchain node from the CLI',
          href: '/blockchain/get-started/run-blockchain-node-from-cli',
        },
      ],
    },
    {
      type: 'category',
      label: 'Delivery node',
      items: [
        {
          type: 'link',
          label: 'Run a Delivery node from the CLI',
          href: '/messaging/delivery/run-delivery-node-from-cli',
        },
      ],
    },
    {
      type: 'category',
      label: 'Storage node',
      items: [
        {
          type: 'link',
          label: 'Run a Storage node from the CLI',
          href: '/storage/get-started/run-storage-node-from-cli',
        },
      ],
    },
  ],
  buildAnAppSidebar: [
    {
      type: 'category',
      label: 'Build an app',
      link: {
        type: 'generated-index',
        title: 'Build an app',
        description: 'Build and ship apps on Logos.',
        slug: '/build-an-app',
      },
      items: [
        {
          type: 'category',
          label: 'Build modules',
          items: [
            {
              type: 'link',
              label: 'Build and run a Logos core module',
              href: '/core/build-modules/build-and-run-a-logos-core-module',
            },
            {
              type: 'link',
              label: 'Wrap a C library as a Logos core module',
              href: '/core/build-modules/wrap-a-c-library-as-a-logos-core-module',
            },
            {
              type: 'link',
              label: 'Build a Logos C++ UI module',
              href: '/core/build-modules/build-a-logos-cpp-ui-module',
            },
            {
              type: 'link',
              label: 'Install and load a module in Basecamp',
              href: '/basecamp/install-and-load-module-in-basecamp',
            },
          ],
        },
        {
          type: 'category',
          label: 'Scaffold',
          items: [{type: 'autogenerated', dirName: 'build-an-app/scaffold'}],
        },
        {
          type: 'category',
          label: 'Tutorials',
          items: [
            'build-an-app/tutorials/build-app-with-logos-zone-sdk',
          ],
        },
      ],
    },
  ],

  getStartedSidebar: [{type: 'autogenerated', dirName: 'get-started'}],
  // Hand-written, not autogenerated: pulls in an article that physically
  // lives under core/build-modules/ (installing/loading a module is core
  // content, but belongs in the Basecamp reader's path too).
  basecampSidebar: [
    {
      type: 'category',
      label: 'Basecamp',
      link: {
        type: 'generated-index',
        title: 'Basecamp',
        description: 'Install and run Logos Basecamp, the local-first launcher for peer-to-peer apps built on Logos.',
        slug: '/basecamp',
      },
      items: [{type: 'autogenerated', dirName: 'basecamp'}],
    },
  ],
  blockchainSidebar: [{type: 'autogenerated', dirName: 'blockchain'}],
  lezSidebar: [{type: 'autogenerated', dirName: 'lez'}],
  coreSidebar: [{type: 'autogenerated', dirName: 'core'}],
  messagingSidebar: [
    {type: 'autogenerated', dirName: 'messaging'},
    {
      type: 'link',
      label: 'Delivery Module API Reference',
      href: 'https://logos-co.github.io/logos-delivery-module/latest/pages/api_reference.html',
    },
    {
      type: 'link',
      label: 'Chat Module API Reference',
      href: 'https://logos-co.github.io/logos-chat-module/latest/pages/api_reference.html',
    }
  ],
  storageSidebar: [
    {type: 'autogenerated', dirName: 'storage'},
    {
      type: 'link',
      label: 'API Reference',
      href: 'https://logos-co.github.io/logos-storage-module/latest/api_reference.html',
    }
  ],
  mixnetSidebar: [{type: 'autogenerated', dirName: 'mixnet'}],
  peerDiscoverySidebar: [{type: 'autogenerated', dirName: 'peer-discovery'}],
};

export default sidebars;
