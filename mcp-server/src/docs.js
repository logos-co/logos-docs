// Loads the docs index the site publishes at /agents/docs.json and answers
// list / get / search queries over it.

import {readFile} from 'node:fs/promises';

export const DEFAULT_SOURCE = 'https://docs.logos.co/agents/docs.json';
const REFRESH_MS = 60 * 60 * 1000;

export class DocsIndex {
  /** @param {string} source URL or file path of docs.json */
  constructor(source = DEFAULT_SOURCE) {
    this.source = source;
    this.data = null;
    this.loadedAt = 0;
    this.chunks = [];
  }

  async load() {
    if (this.data && Date.now() - this.loadedAt < REFRESH_MS) return this.data;
    const text = /^https?:\/\//.test(this.source)
      ? await fetch(this.source).then((r) => {
          if (!r.ok) throw new Error(`GET ${this.source}: HTTP ${r.status}`);
          return r.text();
        })
      : await readFile(this.source, 'utf8');
    this.data = JSON.parse(text);
    this.loadedAt = Date.now();
    this.chunks = this.data.pages.flatMap(chunkPage);
    this.buildStats();
    return this.data;
  }

  sections() {
    const byPath = new Map(this.data.pages.map((p) => [p.permalink, p]));
    return this.data.sections.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      use_cases: s.use_cases,
      pages: s.pages.map((path) => {
        const p = byPath.get(path);
        return {title: p.title, path, summary: p.summary};
      }),
    }));
  }

  /** Accepts a path, a full URL, with or without `.md` or a `#fragment`. */
  findPage(ref) {
    let path = String(ref).trim();
    try {
      path = new URL(path, 'https://x').pathname;
    } catch {
      // keep as is
    }
    path = path.replace(/\.md$/, '').replace(/\/$/, '') || '/';
    if (!path.startsWith('/')) path = `/${path}`;
    return this.data.pages.find((p) => p.permalink === path) || null;
  }

  suggest(ref, n = 5) {
    const r = this.search(String(ref).replace(/[^a-z0-9]+/gi, ' '), {limit: 20});
    return [...new Map(r.map((x) => [x.path, {title: x.title, path: x.path}])).values()].slice(0, n);
  }

  // BM25 over heading-level chunks, with a boost for matches in titles and headings.
  buildStats() {
    this.df = new Map();
    let total = 0;
    for (const c of this.chunks) {
      c.terms = tokenize(`${c.title} ${c.heading} ${c.text}`);
      c.titleTerms = new Set(tokenize(`${c.title} ${c.heading}`));
      total += c.terms.length;
      for (const t of new Set(c.terms)) this.df.set(t, (this.df.get(t) || 0) + 1);
    }
    this.avgLen = total / Math.max(1, this.chunks.length);
  }

  search(query, {section, limit = 8} = {}) {
    const q = [...new Set(tokenize(query))];
    if (!q.length) return [];
    const N = this.chunks.length;
    const k1 = 1.2;
    const b = 0.75;
    const scored = [];
    for (const c of this.chunks) {
      if (section && c.section !== section) continue;
      let score = 0;
      const tf = new Map();
      for (const t of c.terms) tf.set(t, (tf.get(t) || 0) + 1);
      for (const t of q) {
        const f = tf.get(t);
        if (!f) continue;
        const idf = Math.log(1 + (N - this.df.get(t) + 0.5) / (this.df.get(t) + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.terms.length) / this.avgLen)));
        if (c.titleTerms.has(t)) score += idf * 0.8;
      }
      if (score > 0) scored.push({c, score});
    }
    scored.sort((a, b2) => b2.score - a.score);
    return scored.slice(0, limit).map(({c, score}) => ({
      title: c.title,
      heading: c.heading || null,
      path: c.path,
      url: `${c.url}${c.anchor ? `#${c.anchor}` : ''}`,
      markdown_url: c.markdown_url,
      section: c.section,
      score: Math.round(score * 100) / 100,
      snippet: snippet(c.text, q),
    }));
  }
}

export function sliceSection(markdown, heading) {
  const lines = markdown.split('\n');
  const want = heading.toLowerCase().replace(/^#+\s*/, '').trim();
  let start = -1;
  let depth = 0;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) inFence = !inFence;
    if (inFence) continue;
    const m = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) continue;
    if (start === -1 && m[2].toLowerCase().includes(want)) {
      start = i;
      depth = m[1].length;
    } else if (start !== -1 && m[1].length <= depth) {
      return lines.slice(start, i).join('\n');
    }
  }
  return start === -1 ? null : lines.slice(start).join('\n');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

function chunkPage(page) {
  const chunks = [];
  let cur = {heading: '', lines: []};
  let inFence = false;
  for (const line of page.markdown.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const m = !inFence && line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (m) {
      chunks.push(cur);
      cur = {heading: m[2], lines: []};
    } else {
      cur.lines.push(line);
    }
  }
  chunks.push(cur);
  return chunks
    .filter((c) => c.heading || c.lines.join('').trim())
    .map((c) => ({
      title: page.title,
      heading: c.heading,
      anchor: c.heading ? slugify(c.heading) : '',
      text: c.lines.join('\n'),
      path: page.permalink,
      url: page.url,
      markdown_url: page.markdown_url,
      section: page.section,
    }));
}

const STOP = new Set('a an and are as at be by can do for from how i in is it of on or the this to with you your what when which'.split(' '));

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9_.-]+/)
    .flatMap((t) => (/[._-]/.test(t) ? [t, ...t.split(/[._-]+/)] : [t]))
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => t.replace(/(?<=..)(ing|es|s)$/, ''));
}

function snippet(text, terms, width = 280) {
  const flat = text.replace(/\s+/g, ' ').trim();
  const lower = flat.toLowerCase();
  let at = -1;
  for (const t of terms) {
    at = lower.indexOf(t);
    if (at !== -1) break;
  }
  const start = Math.max(0, at - 80);
  return `${start > 0 ? '…' : ''}${flat.slice(start, start + width)}${start + width < flat.length ? '…' : ''}`;
}
