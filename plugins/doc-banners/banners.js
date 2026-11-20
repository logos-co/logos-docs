// Banner images for doc pages, one per top-level folder under docs/. The id
// is the folder name, and the image is static/img/banners/<id>.webp.
//
// Each image comes from logos.co or from the Logos design files (the Figma
// export of logos.co, shared 2026-11-19). `logos` records where logos.co shows
// it; `figma` names the file it has in that export's images/ folder. Where a
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

const LOGOS = 'https://logos.co';

/** @type {Record<string, Banner>} */
const banners = {
  'get-started': {
    figma: {image: 'b3f9b8d74158bac9fdcd722c8e991a837d289232', size: '2739x4096'},
    credit: null,
    permission: 'needed',
    note: 'Photograph from the Logos design files; source not identified. Also the default banner.',
  },
  basecamp: {
    figma: {image: 'feb2e715f3736b5bee164848d14104c249cbe978', size: '1920x1920'},
    credit: null,
    permission: 'needed',
    note: 'Photograph from the Logos design files; source not identified.',
  },
  'build-an-app': {
    figma: {image: '9b722884599c362d6a77de8fc00635f441ee08d8', size: '1828x900'},
    credit: null,
    permission: 'needed',
    note: 'Photograph from the Logos design files; source not identified.',
  },
  core: {
    logos: {page: `${LOGOS}/technology-stack/messaging`, image: `${LOGOS}/images/messaging/chat.webp`, size: '702x335'},
    figma: {image: '1f8c4ce95de00d0bcd3e8cc539a2c3214912cf04', size: '1199x799'},
    credit: null,
    permission: 'needed',
    note: 'Larger copy only as a watermarked stock preview (Creative Market, 910x607); the Figma copy is the same preview. logos.co shows it for Chat.',
  },
  blockchain: {
    figma: {image: '4591b1049ffa4d132526df01a018782519fc2993', size: '1914x822'},
    credit: null,
    permission: 'needed',
    note: 'Photograph from the Logos design files; source not identified.',
  },
  lez: {
    logos: {page: `${LOGOS}/technology-stack/blockchain`, image: `${LOGOS}/images/blockchain/overview/cryptarchia.webp`, size: '384x480'},
    figma: {image: '98059166dfd07e2b461519dd16eb36d9b3240ebb', size: '2560x3200'},
    credit: null,
    permission: 'needed',
    note: 'No larger version found online. logos.co shows it for Cryptarchia.',
  },
  messaging: {
    logos: {page: `${LOGOS}/roadmap`, image: `${LOGOS}/images/roadmap/card-networking.webp`, size: '2000x1050'},
    credit: null,
    permission: 'needed',
    note: 'No larger original found. logos.co shows it for Networking on the roadmap.',
  },
  mixnet: {
    figma: {image: '967c2dd05e37963d7d7fa30a97a50a175c911fe0', size: '2560x3200'},
    credit: null,
    permission: 'needed',
    note: 'Photograph from the Logos design files; source not identified.',
  },
  'peer-discovery': {
    logos: {page: `${LOGOS}/technology-stack/networking`, image: `${LOGOS}/images/networking/peering-layer.jpg`, size: '1439x1800'},
    figma: {image: '10348b10d2ee9bac2b32d5a7cbb8740ebfa7c07d', size: '2560x3202'},
    credit: null,
    permission: 'needed',
    note: 'No larger original found online. logos.co shows it for the peering layer and for Storage on the stack diagram.',
  },
  'run-a-node': {
    logos: {page: `${LOGOS}/node-programme`, image: `${LOGOS}/images/node-programme/builders.webp`, size: '1920x1082'},
    original: {page: 'https://commons.wikimedia.org/wiki/File:Guifi.net_supernode_installation_2.jpg', image: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Guifi.net_supernode_installation_2.jpg', size: '3264x1840'},
    credit: {name: 'Lluis tgn, Guifi.net supernode installation, CC BY-SA 4.0, cropped', url: 'https://commons.wikimedia.org/wiki/File:Guifi.net_supernode_installation_2.jpg'},
    permission: 'cc-by-sa-4.0',
  },
  storage: {
    figma: {image: '4d50cc822ff723ff596dcbb0aab650ef92ec9267', size: '1200x1200'},
    credit: null,
    permission: 'needed',
    note: 'Photograph from the Logos design files; source not identified.',
  },
};

// For a page outside any folder, or in a folder with no banner yet.
const DEFAULT_BANNER = 'get-started';

module.exports = {banners, DEFAULT_BANNER};

/**
 * @typedef {object} Banner
 * @property {{page: string, image: string, size: string}} [logos]
 * @property {{image: string, size: string}} [figma]
 * @property {{page: string, image: string, size: string}} [original]
 * @property {{name: string, url: string} | null} credit
 * @property {'needed' | 'logos' | 'cc-by-sa-4.0'} permission
 * @property {string} [note]
 */
