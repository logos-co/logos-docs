import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as PluginClientRedirects from '@docusaurus/plugin-client-redirects';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Logos documentation',
  tagline: 'Guides and references for the Logos stack.',
  favicon: 'img/favicon.png',

  // Light/dark favicon swap, matching docs.logos.co's own <link rel="icon">
  // pair (Docusaurus's `favicon` config field only takes one static file).
  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        href: '/img/favicon.png',
        media: '(prefers-color-scheme: light)',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        href: '/img/favicon-dark.png',
        media: '(prefers-color-scheme: dark)',
      },
    },
  ],

  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: 'https://docs.logos.co',
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'logos-co',
  projectName: 'logos-docs',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/logos-co/logos-docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        // Legacy GitBook URLs from the run-an-app / run-a-node / build-an-app
        // aggregator spaces, which duplicated pages that physically live
        // under other spaces. Those spaces no longer have their own copy of
        // the content (see sidebars.ts), so old links need to redirect to
        // the canonical (naturally nested, no slug override) page instead.
        redirects: [
          // run-an-app (-> basecamp / blockchain / lez)
          // Note: /run-an-app itself is NOT redirected — it's a real
          // generated-index page now (sidebars.ts), not a redirect target.
          {
            from: '/run-an-app/basecamp/install-logos-basecamp',
            to: '/basecamp/get-started/install-logos-basecamp',
          },
          {
            from: '/run-an-app/basecamp/readme',
            to: '/basecamp/get-started/install-logos-basecamp',
          },
          {
            from: '/run-an-app/blockchain-ui-app/build-and-run-logos-blockchain-node-app-ui',
            to: '/blockchain/node-app/build-and-run-logos-blockchain-node-app-ui',
          },
          {
            from: '/run-an-app/blockchain-ui-app/move-assets-using-logos-blockchain-app',
            to: '/blockchain/node-app/move-assets-using-logos-blockchain-app',
          },
          {
            from: '/run-an-app/blockchain-ui-app/bridge-assets-from-logos-blockchain-to-zone-using-app',
            to: '/blockchain/node-app/bridge-assets-from-logos-blockchain-to-zone-using-app',
          },
          {
            from: '/run-an-app/blockchain-ui-app/claim-leader-rewards-in-logos-blockchain-ui-app',
            to: '/blockchain/node-app/claim-leader-rewards-in-logos-blockchain-ui-app',
          },
          {
            from: '/run-an-app/blockchain-ui-app/readme',
            to: '/blockchain/node-app/build-and-run-logos-blockchain-node-app-ui',
          },
          {
            from: '/run-an-app/lez-wallet-ui/initiate-native-token-transfers-on-lez-with-wallet-ui',
            to: '/lez/get-started/initiate-native-token-transfers-on-lez-with-wallet-ui',
          },
          {
            from: '/run-an-app/lez-wallet-ui/readme',
            to: '/lez/get-started/initiate-native-token-transfers-on-lez-with-wallet-ui',
          },
          // run-a-node (-> blockchain / messaging / storage)
          {
            from: '/run-a-node/blockchain-node/run-a-logos-blockchain-node-from-cli',
            to: '/blockchain/get-started/run-a-logos-blockchain-node-from-cli',
          },
          {
            from: '/run-a-node/blockchain-node/readme',
            to: '/blockchain/get-started/run-a-logos-blockchain-node-from-cli',
          },
          {
            from: '/run-a-node/delivery-node/run-logos-delivery-node',
            to: '/messaging/delivery/run-logos-delivery-node',
          },
          {
            from: '/run-a-node/delivery-node/readme',
            to: '/messaging/delivery/run-logos-delivery-node',
          },
          {
            from: '/run-a-node/storage-node/run-logos-storage-node',
            to: '/storage/get-started/run-logos-storage-node',
          },
          {
            from: '/run-a-node/storage-node/readme',
            to: '/storage/get-started/run-logos-storage-node',
          },
          // build-an-app (-> core)
          // Note: /build-an-app itself is NOT redirected — it's a real
          // generated-index page now (sidebars.ts), not a redirect target.
          {
            from: '/build-an-app/build-modules/build-and-run-a-logos-core-module',
            to: '/core/build-modules/build-and-run-a-logos-core-module',
          },
          {
            from: '/build-an-app/build-modules/wrap-a-c-library-as-a-logos-core-module',
            to: '/core/build-modules/wrap-a-c-library-as-a-logos-core-module',
          },
          {
            from: '/build-an-app/build-modules/build-a-logos-cpp-ui-module',
            to: '/core/build-modules/build-a-logos-cpp-ui-module',
          },
          {
            from: '/build-an-app/build-modules/install-and-load-a-module-in-logos-basecamp',
            to: '/core/build-modules/install-and-load-a-module-in-logos-basecamp',
          },
          {
            from: '/build-an-app/build-modules/readme',
            to: '/core/build-modules/build-and-run-a-logos-core-module',
          },
        ],
      } satisfies PluginClientRedirects.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      // No title text — docs.logos.co's own navbar shows only the
      // wordmark logo, swapped by color scheme, no text alongside it.
      logo: {
        alt: 'Logos',
        src: 'img/logo-light.png',
        srcDark: 'img/logo-dark.png',
        // No fixed width: the default navbar CSS constrains height only,
        // so width is left to scale automatically and keep the logo's
        // real aspect ratio instead of being stretched to a fixed box.
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'getStartedSidebar',
          label: 'Get started',
          position: 'left',
        },
        {
          type: 'dropdown',
          label: 'Your path',
          position: 'left',
          items: [
            {
              type: 'docSidebar',
              sidebarId: 'runAnAppSidebar',
              label: 'Run an app',
            },
            {
              type: 'docSidebar',
              sidebarId: 'runANodeSidebar',
              label: 'Run a node',
            },
            {
              type: 'docSidebar',
              sidebarId: 'buildAnAppSidebar',
              label: 'Build an app',
            },
            {
              type: 'docSidebar',
              sidebarId: 'contributeSidebar',
              label: 'Contribute',
            },
          ],
        },
        {
          type: 'dropdown',
          label: 'Explore',
          position: 'left',
          items: [
            {type: 'docSidebar', sidebarId: 'basecampSidebar', label: 'Basecamp'},
            {type: 'docSidebar', sidebarId: 'blockchainSidebar', label: 'Blockchain'},
            {type: 'docSidebar', sidebarId: 'lezSidebar', label: 'LEZ'},
            {type: 'docSidebar', sidebarId: 'coreSidebar', label: 'Core'},
            {type: 'docSidebar', sidebarId: 'messagingSidebar', label: 'Messaging'},
            {type: 'docSidebar', sidebarId: 'storageSidebar', label: 'Storage'},
            {type: 'docSidebar', sidebarId: 'mixnetSidebar', label: 'Mixnet'},
            {
              type: 'docSidebar',
              sidebarId: 'peerDiscoverySidebar',
              label: 'Peer discovery',
            },
          ],
        },
        {
          href: 'https://github.com/logos-co/logos-docs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Get started',
              to: '/get-started/what-is-logos',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/logos-co/logos-docs',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Logos. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
