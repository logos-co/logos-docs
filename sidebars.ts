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
              label: 'Install and load a module in Logos Basecamp',
              href: '/basecamp/install-and-load-a-module-in-logos-basecamp',
            },
          ],
        },
        {
          type: 'category',
          label: 'Blockchain UI app',
          items: [
            {
              type: 'link',
              label: 'Build and run the Logos Blockchain UI app',
              href: '/blockchain/node-app/build-and-run-logos-blockchain-node-app-ui',
            },
            {
              type: 'link',
              label: 'Move assets using the Logos Blockchain UI app',
              href: '/blockchain/node-app/move-assets-using-logos-blockchain-app',
            },
            {
              type: 'link',
              label:
                'Bridge assets from Logos Blockchain to a Zone using the Logos Blockchain app',
              href: '/blockchain/node-app/bridge-assets-from-logos-blockchain-to-zone-using-app',
            },
            {
              type: 'link',
              label: 'Claim leader rewards in the Logos Blockchain UI app',
              href: '/blockchain/node-app/claim-leader-rewards-in-logos-blockchain-ui-app',
            },
          ],
        },
        {
          type: 'category',
          label: 'LEZ wallet UI',
          items: [
            {
              type: 'link',
              label: 'Initiate native token transfers on the LEZ with the wallet UI',
              href: '/lez/get-started/initiate-native-token-transfers-on-lez-with-wallet-ui',
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
          label: 'Storage UI',
          items: [
            {
              type: 'link',
              label: 'Set up and use the Logos Storage UI',
              href: '/storage/get-started/set-up-and-use-logos-storage-ui',
            },
          ],
        },
      ],
    },
  ],
  runANodeSidebar: [
    'run-a-node/get-started/run-logos-node-blockchain-storage-delivery',
    {
      type: 'category',
      label: 'Blockchain node',
      items: [
        {
          type: 'link',
          label: 'Run a Logos Blockchain node on the public testnet from the CLI',
          href: '/blockchain/get-started/run-a-logos-blockchain-node-from-cli',
        },
      ],
    },
    {
      type: 'category',
      label: 'Delivery node',
      items: [
        {
          type: 'link',
          label: 'Run a Logos delivery node',
          href: '/messaging/delivery/run-logos-delivery-node',
        },
      ],
    },
    {
      type: 'category',
      label: 'Storage node',
      items: [
        {
          type: 'link',
          label: 'Run a Logos storage node',
          href: '/storage/get-started/run-logos-storage-node',
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
              label: 'Install and load a module in Logos Basecamp',
              href: '/basecamp/install-and-load-a-module-in-logos-basecamp',
            },
          ],
        },
        {
          type: 'category',
          label: 'Tutorials',
          items: [
            'build-an-app/tutorials/create-and-use-an-amm-liquidity-pool-on-the-logos-execution-zone',
            'build-an-app/tutorials/build-dapp-with-logos-zone-sdk',
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
        description: 'Install and run Logos Basecamp, the desktop launcher for the Logos stack.',
        slug: '/basecamp',
      },
      items: [{type: 'autogenerated', dirName: 'basecamp'}],
    },
  ],
  blockchainSidebar: [{type: 'autogenerated', dirName: 'blockchain'}],
  lezSidebar: [{type: 'autogenerated', dirName: 'lez'}],
  coreSidebar: [{type: 'autogenerated', dirName: 'core'}],
  messagingSidebar: [{type: 'autogenerated', dirName: 'messaging'}],
  storageSidebar: [{type: 'autogenerated', dirName: 'storage'}],
  mixnetSidebar: [{type: 'autogenerated', dirName: 'mixnet'}],
  peerDiscoverySidebar: [{type: 'autogenerated', dirName: 'peer-discovery'}],
  contributeSidebar: [{type: 'autogenerated', dirName: 'contribute'}],
};

export default sidebars;
