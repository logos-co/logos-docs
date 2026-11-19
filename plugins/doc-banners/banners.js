// Banner images for doc pages, one per Logos concept.
//
// Each image is the one logos.co shows for that concept (technology stack,
// its sub-pages, the roadmap, Basecamp and node programme pages). Where a
// reverse image search (TinEye, 2026-11-18) found the photographer's own,
// larger original, `original` records it. The banners themselves are the
// committed crops in static/img/banners (3:1, at most 2400px wide); they are
// not regenerated, so re-crop by hand and keep these records in step.
//
// LICENSING: most of these are third-party photographs. Before this ships,
// Logos needs written permission for each one marked `permission: 'needed'`
// (the photographer's, or confirmation that the logos.co licence covers the
// docs). Entries marked 'cc-by-sa-4.0' are openly licensed and only need the
// attribution the banner caption already gives.
//
// `keys` are matched, in order, against a page's frontmatter `topics`, then
// its `product`, then its top-level docs folder (see ./remark.js).

const LOGOS = 'https://logos.co';

/** @type {Record<string, Banner>} */
const banners = {
  logos: {
    concept: 'Logos (default)',
    keys: [],
    logos: {page: `${LOGOS}/`, image: `${LOGOS}/images/home/hero-bg.webp`, size: '1920x1080'},
    credit: null,
    permission: 'needed',
    note: 'Poster frame of the logos.co home page hero video; stock footage, source not identified.',
  },
  'technology-stack': {
    concept: 'Logos technology stack (architecture)',
    keys: ['architecture', 'technology-stack', 'stack'],
    logos: {page: `${LOGOS}/technology-stack`, image: `${LOGOS}/images/technology-stack/architecture-overview.webp`, size: '1404x1872'},
    original: {page: 'https://www.bernhardlang.de/solarplants/', image: 'https://a.1stdibscdn.com/bernhard-lang-photography-solar-plants-010-usa-aerial-abstract-photography-for-sale/a_8031/a_39608121549897965503/av_solar_plants_010_by_bernhard_lang_master.jpg?width=1500', size: '1500x2000'},
    credit: {name: 'Bernhard Lang, Solar Plants 010', url: 'https://www.bernhardlang.de/solarplants/'},
    permission: 'needed',
  },
  basecamp: {
    concept: 'Logos Basecamp',
    keys: ['basecamp'],
    logos: {page: `${LOGOS}/basecamp`, image: `${LOGOS}/images/basecamp/renewal/build-app-basecamp.png`, size: '3806x2168'},
    credit: null,
    permission: 'logos',
    note: 'Screenshot of the Basecamp home screen (Logos-owned).',
  },
  'start-building': {
    concept: 'Start building (build an app)',
    keys: ['scaffold', 'build-an-app', 'blockchain-app'],
    logos: {page: `${LOGOS}/`, image: `${LOGOS}/images/home/figma-refresh/start-building.webp`, size: '1404x1472'},
    credit: null,
    permission: 'needed',
    note: 'No larger original found.',
  },
  'logos-core': {
    concept: 'Logos Core (modules and runtime)',
    keys: ['core', 'logos-core', 'modules', 'module'],
    logos: {page: `${LOGOS}/roadmap`, image: `${LOGOS}/images/roadmap/card-logos-core-a.webp`, size: '720x709'},
    credit: null,
    permission: 'needed',
    note: 'Larger copies exist only as anonymous reposts (1439x1409); photographer not identified.',
  },
  blockchain: {
    concept: 'Logos Blockchain',
    keys: ['blockchain', 'bedrock', 'mantle', 'zones', 'zone-sdk', 'bridging'],
    logos: {page: `${LOGOS}/technology-stack/blockchain`, image: `${LOGOS}/images/blockchain/overview/mantle.webp`, size: '640x512'},
    original: {page: 'https://gpidesign.com/2018/10/thursday-salute-to-originals-grasslands-repair/', image: 'https://gpidesign.com/wp-content/uploads/2018/10/Repair_Pavilion-of-Australia_Rory-Gardiner2-960x768@2x.jpg', size: '1920x1536'},
    credit: {name: 'Rory Gardiner, Repair, Australian Pavilion, Venice 2018', url: 'https://gpidesign.com/2018/10/thursday-salute-to-originals-grasslands-repair/'},
    permission: 'needed',
  },
  cryptarchia: {
    concept: 'Cryptarchia (private proof-of-stake)',
    keys: ['cryptarchia'],
    logos: {page: `${LOGOS}/technology-stack/blockchain`, image: `${LOGOS}/images/blockchain/overview/cryptarchia.webp`, size: '384x480'},
    credit: null,
    permission: 'needed',
    note: "No larger version found online. Banner cut from the larger copy in the Logos design files' Figma export (images/98059166dfd07e2b461519dd16eb36d9b3240ebb, 2560x3200).",
  },
  lez: {
    concept: 'Logos Execution Zone (LEZ)',
    keys: ['lez', 'logos-execution-zone'],
    logos: {page: `${LOGOS}/technology-stack/blockchain`, image: `${LOGOS}/images/blockchain/overview/lez.webp`, size: '384x599'},
    credit: null,
    permission: 'needed',
    note: "No larger version found online. Banner cut from the larger copy in the Logos design files' Figma export (images/9ffb57fcf39a99f0dd0481cb408eb420d5299320, 1076x1676).",
  },
  networking: {
    concept: 'Networking',
    keys: ['networking', 'libp2p', 'transports'],
    logos: {page: `${LOGOS}/roadmap`, image: `${LOGOS}/images/roadmap/card-networking.webp`, size: '2000x1050'},
    credit: null,
    permission: 'needed',
    note: 'No larger original found.',
  },
  'service-discovery': {
    concept: 'Service and peer discovery',
    keys: ['peer-discovery', 'service-discovery', 'capability-discovery', 'discv5', 'dns-discovery', 'peer-exchange', 'static-peers'],
    logos: {page: `${LOGOS}/technology-stack/networking`, image: `${LOGOS}/images/networking/mix-net.jpg`, size: '1440x1800'},
    credit: null,
    permission: 'needed',
    note: 'Too featureless for reverse search; no larger original found.',
  },
  mixnet: {
    concept: 'Mixnet',
    keys: ['mixnet', 'mix'],
    logos: {page: `${LOGOS}/technology-stack/networking`, image: `${LOGOS}/images/networking/capability-discovery.webp`, size: '1334x1800'},
    original: {page: 'https://samepaper.com/goldwin-x-same-paper', image: 'https://freight.cargo.site/t/original/i/02c081e9abb56a7d781db3c39c4f0d18c293c1da46990824098116527aefc80d/09.jpg', size: '4055x5470'},
    credit: {name: 'Xiaopeng Yuan for Same Paper × Goldwin, Work From Wild', url: 'https://samepaper.com/goldwin-x-same-paper'},
    permission: 'needed',
  },
  rln: {
    concept: 'Spam resistance: RLN and Zerokit',
    keys: ['rln', 'zerokit'],
    logos: {page: `${LOGOS}/technology-stack/networking`, image: `${LOGOS}/images/networking/peering-layer.jpg`, size: '1439x1800'},
    credit: null,
    permission: 'needed',
    note: "No larger original found. logos.co also uses this photo for Storage on the stack diagram. Banner cut from the larger copy in the Logos design files' Figma export (images/10348b10d2ee9bac2b32d5a7cbb8740ebfa7c07d, 2560x3202).",
  },
  messaging: {
    concept: 'Logos Messaging',
    keys: ['messaging', 'waku'],
    logos: {page: `${LOGOS}/roadmap`, image: `${LOGOS}/images/roadmap/card-messaging.webp`, size: '1200x1600'},
    credit: null,
    permission: 'needed',
    note: 'No larger original found.',
  },
  delivery: {
    concept: 'Delivery',
    keys: ['delivery'],
    logos: {page: `${LOGOS}/technology-stack/messaging`, image: `${LOGOS}/images/messaging/delivery-landscape.webp`, size: '1550x1240'},
    credit: null,
    permission: 'needed',
    note: "No larger original found online. Banner cut from the larger copy in the Logos design files' Figma export (images/18bf18f1e1d75bb3ef1d5734d8e67e1eaf26527d, 2560x3200, stored portrait).",
  },
  chat: {
    concept: 'Chat',
    keys: ['chat', 'de-mls'],
    logos: {page: `${LOGOS}/technology-stack/messaging`, image: `${LOGOS}/images/messaging/chat.webp`, size: '702x335'},
    credit: null,
    permission: 'needed',
    note: "Larger copy only as a watermarked stock preview (Creative Market, 910x607). Banner cut from the larger copy in the Logos design files' Figma export (images/1f8c4ce95de00d0bcd3e8cc539a2c3214912cf04, 1199x799).",
  },
  storage: {
    concept: 'Logos Storage',
    keys: ['storage'],
    logos: {page: `${LOGOS}/roadmap`, image: `${LOGOS}/images/roadmap/card-storage.webp`, size: '1200x1600'},
    credit: null,
    permission: 'needed',
    note: 'No larger original found.',
  },
  libstorage: {
    concept: 'libstorage',
    keys: ['libstorage'],
    logos: {page: `${LOGOS}/technology-stack/storage`, image: `${LOGOS}/images/storage/use-case-2.webp`, size: '702x335'},
    original: {page: 'http://www.n6cc.com/military-field-day-2024/', image: 'http://www.n6cc.com/wp-content/uploads/FD2024Eqp-200K.jpg', size: '2048x1536'},
    credit: {name: 'N6CC, Military Field Day 2024', url: 'http://www.n6cc.com/military-field-day-2024/'},
    permission: 'needed',
  },
  node: {
    concept: 'Run a node (node programme)',
    keys: ['node', 'run-a-node', 'operators'],
    logos: {page: `${LOGOS}/node-programme`, image: `${LOGOS}/images/node-programme/builders.webp`, size: '1920x1082'},
    original: {page: 'https://commons.wikimedia.org/wiki/File:Guifi.net_supernode_installation_2.jpg', image: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Guifi.net_supernode_installation_2.jpg', size: '3264x1840'},
    credit: {name: 'Lluis tgn, Guifi.net supernode installation, CC BY-SA 4.0, cropped', url: 'https://commons.wikimedia.org/wiki/File:Guifi.net_supernode_installation_2.jpg'},
    permission: 'cc-by-sa-4.0',
  },
};

module.exports = {banners, DEFAULT_BANNER: 'logos'};

/**
 * @typedef {object} Banner
 * @property {string} concept
 * @property {string[]} keys
 * @property {{page: string, image: string, size: string}} logos
 * @property {{page: string, image: string, size: string}} [original]
 * @property {{name: string, url: string} | null} credit
 * @property {'needed' | 'logos' | 'cc-by-sa-4.0'} permission
 * @property {string} [note]
 */
