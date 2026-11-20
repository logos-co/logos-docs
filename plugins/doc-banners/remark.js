// Remark plugin: a banner image under each doc's title and subtitle.
//
// The banner is the one named after the page's top-level folder under docs/
// (see ./banners.js), or DEFAULT_BANNER if that folder has none. Frontmatter
// `banner: <id>` picks another banner, and `banner: false` turns it off.
// It goes after the page's H1 and, when present, the `####` subtitle that
// directly follows it. The photo credit is the image's title (hover) text.
//
// Works on the source tree, so it covers mirrored reference pages too
// without editing them. The images are committed in static/img/banners.

const path = require('path');
const {banners, DEFAULT_BANNER} = require('./banners');

function sectionOf(filePath, docsDir) {
  const rel = path.relative(docsDir, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  return parts.length > 1 ? parts[0] : null;
}

function pickBanner(frontMatter, filePath, docsDir) {
  if (typeof frontMatter.banner === 'string' && banners[frontMatter.banner]) {
    return frontMatter.banner;
  }
  const section = sectionOf(filePath, docsDir);
  return section && banners[section] ? section : DEFAULT_BANNER;
}

function creditOf(banner) {
  if (banner.credit) return `Photo: ${banner.credit.name}`;
  if (banner.permission === 'logos' || !banner.logos) return 'Image: Logos';
  return 'Image: logos.co';
}

const attr = (name, value) => ({type: 'mdxJsxAttribute', name, value});

/** @param {{docsDir?: string}} [options] */
module.exports = function docBanners(options = {}) {
  const docsDir = path.resolve(options.docsDir ?? 'docs');

  return (tree, file) => {
    const frontMatter = file.data?.frontMatter ?? {};
    if (frontMatter.banner === false) return;

    const id = pickBanner(frontMatter, file.path, docsDir);
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
