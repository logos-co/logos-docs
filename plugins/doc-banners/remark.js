// Remark plugin: a banner image under each doc's title and subtitle.
//
// The banner is the one for the first of the page's frontmatter `topics`,
// then its `product`, then its top-level docs folder, that has an image in
// ./banners.js; failing all three, the default (logos.co home page) banner.
// It goes after the page's H1 and, when present, the `####` subtitle that
// directly follows it. The photo credit is the image's title (hover) text.
//
// Works on the source tree, so it covers mirrored reference pages too
// without editing them. The images are committed in static/img/banners.

const path = require('path');
const {banners, DEFAULT_BANNER} = require('./banners');

const norm = (s) => String(s).trim().toLowerCase().replace(/[\s_]+/g, '-');

// key -> banner id; the first banner to claim a key wins.
const byKey = new Map();
for (const [id, banner] of Object.entries(banners)) {
  for (const key of banner.keys) {
    if (!byKey.has(key)) byKey.set(key, id);
  }
}

function topicsOf(frontMatter) {
  const {topics} = frontMatter;
  if (!topics) return [];
  return Array.isArray(topics) ? topics : String(topics).split(',');
}

function sectionOf(filePath, docsDir) {
  const rel = path.relative(docsDir, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  return parts.length > 1 ? parts[0] : null;
}

function pickBanner(frontMatter, filePath, docsDir) {
  const candidates = [
    ...topicsOf(frontMatter),
    frontMatter.product,
    sectionOf(filePath, docsDir),
  ];
  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue;
    const id = byKey.get(norm(candidate));
    if (id) return id;
  }
  return DEFAULT_BANNER;
}

function creditOf(banner) {
  if (banner.credit) return `Photo: ${banner.credit.name}`;
  if (banner.permission === 'logos') return 'Image: Logos';
  return 'Image: logos.co';
}

const attr = (name, value) => ({type: 'mdxJsxAttribute', name, value});

/** @param {{docsDir?: string}} [options] */
module.exports = function docBanners(options = {}) {
  const docsDir = path.resolve(options.docsDir ?? 'docs');

  return (tree, file) => {
    const frontMatter = file.data?.frontMatter ?? {};
    if (frontMatter.banner === false) return;

    const id =
      typeof frontMatter.banner === 'string' && banners[frontMatter.banner]
        ? frontMatter.banner
        : pickBanner(frontMatter, file.path, docsDir);
    const banner = banners[id];

    const image = {
      type: 'mdxJsxFlowElement',
      name: 'img',
      attributes: [
        attr('className', `doc-banner doc-banner--${id}`),
        attr('src', `/img/banners/${id}.webp`),
        attr('alt', ''),
        attr('title', creditOf(banner)),
        attr('width', '1200'),
        attr('height', '400'),
        attr('loading', 'eager'),
        attr('decoding', 'async'),
      ],
      children: [],
    };

    // After the H1, and after a `####` subtitle directly below it.
    // Docusaurus's contentTitle plugin has already wrapped the H1 in a
    // <header> element by the time this runs.
    const children = tree.children;
    const isTitle = (n) =>
      (n.type === 'heading' && n.depth === 1) ||
      (n.type === 'mdxJsxFlowElement' &&
        n.name === 'header' &&
        n.children?.[0]?.type === 'heading' &&
        n.children[0].depth === 1);
    let at = children.findIndex(isTitle);
    if (at === -1) {
      // Title comes from frontmatter and renders above the content.
      at = children.findIndex((n) => n.type !== 'mdxjsEsm' && n.type !== 'yaml');
      if (at === -1) at = children.length;
    } else {
      at += 1;
    }
    const next = children[at];
    if (next && next.type === 'heading' && next.depth === 4) at += 1;
    children.splice(at, 0, image);
  };
};
