// Docusaurus plugin: data for the hover previews on internal links.
//
// For every doc it records the page title and summary, plus the opening
// paragraph of each heading's section, keyed by the heading's anchor. The
// result is written to @generated/link-previews/default/previews.json, which
// src/theme/MDXComponents/A loads on the first hover (so it is a separate
// chunk, not part of every page's bundle). Works under `npm start` as well as
// `npm run build`.

const fs = require('fs');
const path = require('path');
const {createSlugger} = require('@docusaurus/utils');
const {stripFrontMatter, splitFences, summaryOf} = require('../agent-ready/markdown');

const DOCS_PLUGIN = 'docusaurus-plugin-content-docs';
const MAX_CHARS = 320;

// Markdown inline syntax -> plain text. Inline code keeps its backticks so the
// client can render it as <code>.
function plain(md) {
  return md
    .replace(/\s*\{#[\w-]+\}\s*$/, '') // explicit heading id
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[((?:[^\]`]|`[^`]*`)*)\]\([^)]*\)/g, '$1') // links
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1') // reference links
    .replace(/<[^>]+>/g, '') // inline HTML / JSX
    .replace(/(\*\*|__)(?=\S)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?=\S)([^*]+?)\*/g, '$1$2')
    .replace(/(^|\W)_(?=\S)([^_]+?)_(?=\W|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

// The text Docusaurus slugs a heading from: its rendered text content.
const headingText = (md) => plain(md).replace(/`/g, '');

function truncate(text) {
  if (text.length <= MAX_CHARS) return text;
  const cut = text.slice(0, MAX_CHARS);
  const sentence = cut.lastIndexOf('. ');
  if (sentence > MAX_CHARS * 0.6) return cut.slice(0, sentence + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

// Blocks of a section that read as prose: no tables, admonitions, MDX
// components, imports or images. Lists are a fallback when there is no
// paragraph.
function firstProse(lines) {
  const blocks = [];
  let buf = [];
  let inAdmonition = 0;
  const flush = () => {
    if (buf.length) blocks.push(buf);
    buf = [];
  };
  for (const line of lines) {
    const t = line.trim();
    if (/^:::\w/.test(t)) {
      flush();
      inAdmonition++;
      continue;
    }
    if (inAdmonition) {
      if (/^:::\s*$/.test(t)) inAdmonition--;
      continue;
    }
    if (!t) flush();
    else buf.push(t);
  }
  flush();

  const isList = (b) => /^([-*+]|\d+\.)\s/.test(b[0]);
  const isProse = (b) =>
    !isList(b) && !/^(\||<|\{|import\s|export\s|!\[|---|\$\$)/.test(b[0]) && plain(b.join(' ')).length > 0;

  const para = blocks.find(isProse);
  if (para) {
    // A trailing "See [Page](...)." cross-reference is a dead end in a
    // preview, where the link cannot be clicked.
    const text = plain(para.map((l) => l.replace(/^>\s?/, '')).join(' ')).replace(/(?<=\.)\s+See [^.]+\.$/, '');
    return truncate(text);
  }
  const list = blocks.find(isList);
  if (list) {
    const items = list
      .filter((l) => /^([-*+]|\d+\.)\s/.test(l))
      .map((l) => plain(l.replace(/^([-*+]|\d+\.)\s+/, '')).replace(/[.;:]$/, ''));
    return truncate(items.join('; ') + '.');
  }
  return '';
}

function previewsFor(source, title, fallbackSummary) {
  const body = stripFrontMatter(source);
  const slugger = createSlugger();
  const sections = {};
  let current = null; // {id, heading, lines}
  let intro = [];
  const close = () => {
    if (!current) return;
    const text = firstProse(current.lines);
    if (text) sections[current.id] = {h: current.heading, d: text};
  };

  for (const chunk of splitFences(body)) {
    if (chunk.code) continue;
    for (const line of chunk.lines) {
      const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (m && m[1].length >= 2) {
        close();
        const explicit = m[2].match(/\{#([\w-]+)\}\s*$/);
        const text = headingText(m[2]);
        const id = explicit ? explicit[1] : slugger.slug(text);
        current = {id, heading: text, lines: []};
      } else if (!m && current) {
        current.lines.push(line);
      } else if (!m && !current) {
        intro.push(line);
      }
    }
    // A code block ends a paragraph.
    (current ? current.lines : intro).push('');
  }
  close();

  const summary = summaryOf(source, '');
  return {
    t: title,
    d: plain(summary) || firstProse(intro) || plain(fallbackSummary || ''),
    s: sections,
  };
}

module.exports = function linkPreviewsPlugin(context) {
  return {
    name: 'link-previews',

    async allContentLoaded({allContent, actions}) {
      const docs = allContent[DOCS_PLUGIN]?.default;
      if (!docs) throw new Error('link-previews: docs plugin content not found');
      const pages = {};
      for (const version of docs.loadedVersions) {
        for (const doc of version.docs) {
          if (doc.draft) continue;
          const sourcePath = path.resolve(context.siteDir, doc.source.replace(/^@site\//, ''));
          const source = fs.readFileSync(sourcePath, 'utf8');
          pages[doc.permalink] = previewsFor(source, doc.title, doc.description);
        }
      }
      await actions.createData('previews.json', JSON.stringify(pages));
    },
  };
};

module.exports.previewsFor = previewsFor;
