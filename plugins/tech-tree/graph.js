// The prerequisite graph between procedures, shared by the tech-tree plugin
// (the diagram on /get-started/tech-tree and the build check) and agent-ready
// (the Markdown version of that page).
//
// An edge runs from a prerequisite to the procedure that lists it: a link to
// another procedure inside a `:::info[Prerequisites]` admonition or a
// `## Prerequisites` section. Links to pages of any other doc_type (the
// glossary, Testnet endpoints, concept pages) are lookups, not steps, and are
// not edges. Every prerequisite must link back to each of its dependents from
// its `## Next steps` section; `errors` lists the ones that do not.

const fs = require('fs');
const path = require('path');
const {stripFrontMatter, splitFences} = require('../agent-ready/markdown');

// A relative link to a Markdown file, with an optional anchor.
const DOC_LINK = /\]\(([^)\s#:]+\.mdx?)(?:#[^)\s]*)?\)/g;

// Source lines with fenced code blanked out, so samples never count as links.
function proseLines(source) {
  return splitFences(stripFrontMatter(source)).flatMap((c) => (c.code ? c.lines.map(() => '') : c.lines));
}

function linksIn(lines, file) {
  const out = [];
  for (const line of lines) {
    for (const m of line.matchAll(DOC_LINK)) out.push(path.resolve(path.dirname(file), decodeURIComponent(m[1])));
  }
  return out;
}

function prerequisiteLinks(lines, file) {
  const block = [];
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^(#{2,6})\s+Prerequisites\b/);
    if (/^\s*:::\w+\[Prerequisites\]/.test(lines[i])) {
      for (i++; i < lines.length && !/^\s*:::\s*$/.test(lines[i]); i++) block.push(lines[i]);
    } else if (heading) {
      const level = heading[1].length;
      for (i++; i < lines.length; i++) {
        const h = lines[i].match(/^(#{1,6})\s/);
        if (h && h[1].length <= level) break;
        block.push(lines[i]);
      }
      i--;
    }
  }
  return linksIn(block, file);
}

// null when the page has no Next steps section.
function nextStepsLinks(lines, file) {
  const start = lines.findIndex((l) => /^##\s+Next steps\s*$/.test(l));
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && /^#{1,2}\s/.test(l));
  if (end === -1) end = lines.length;
  return new Set(linksIn(lines.slice(start + 1, end), file));
}

/**
 * @param {Array<{source: string, permalink: string, title: string, docType?: string}>} docs
 *   `source` is the absolute path of the doc's file.
 * @param {string} docsDir absolute path of docs/
 */
function buildGraph(docs, docsDir) {
  const bySource = new Map(docs.map((d) => [d.source, d]));
  const isProcedure = (file) => bySource.get(file)?.docType === 'procedure';
  const next = new Map();
  const edges = [];

  for (const doc of docs) {
    if (doc.docType !== 'procedure') continue;
    const lines = proseLines(fs.readFileSync(doc.source, 'utf8'));
    next.set(doc.source, nextStepsLinks(lines, doc.source));
    for (const target of new Set(prerequisiteLinks(lines, doc.source))) {
      if (target !== doc.source && isProcedure(target)) edges.push({from: target, to: doc.source});
    }
  }

  const rel = (file) => path.relative(path.dirname(docsDir), file).split(path.sep).join('/');
  const missing = new Map();
  for (const {from, to} of edges) {
    if (next.get(from)?.has(to)) continue;
    if (!missing.has(from)) missing.set(from, []);
    missing.get(from).push(to);
  }
  const errors = [...missing].map(([from, tos]) => ({
    file: rel(from),
    hasSection: next.get(from) !== null,
    missing: tos.map((to) => ({
      file: rel(to),
      line: `- [${bySource.get(to).title}](${path.relative(path.dirname(from), to).split(path.sep).join('/').replace(/^(?!\.)/, './')})`,
    })),
  }));

  const ids = [...new Set(edges.flatMap((e) => [e.from, e.to]))];
  const nodes = ids.map((id) => {
    const d = bySource.get(id);
    return {id: rel(id), title: d.title, permalink: d.permalink, section: path.relative(docsDir, id).split(path.sep)[0]};
  });
  return {nodes, edges: edges.map((e) => ({from: rel(e.from), to: rel(e.to)})), errors};
}

function formatErrors(errors) {
  const count = errors.reduce((n, e) => n + e.missing.length, 0);
  const lines = [
    `tech-tree: ${count} prerequisite link(s) have no matching "Next steps" link back.`,
    'A procedure that another procedure lists as a prerequisite must link to it from a "## Next steps" section at the end of the page.',
    '',
  ];
  for (const e of errors) {
    lines.push(`  ${e.file}: ${e.hasSection ? 'add to its "## Next steps" list' : 'add a "## Next steps" section at the end with'}`);
    for (const m of e.missing) lines.push(`    ${m.line}    (listed as a prerequisite by ${m.file})`);
    lines.push('');
  }
  return lines.join('\n');
}

// Columns by longest prerequisite chain, ordered and spaced to keep edges short.
const GEOMETRY = {nodeWidth: 228, nodeHeight: 56, gap: 10, columnGap: 92, top: 48};

function layout(graph, sectionOrder = []) {
  const {nodeWidth: W, nodeHeight: H, gap: GAP, columnGap, top} = GEOMETRY;
  const ids = graph.nodes.map((n) => n.id);
  const parents = Object.fromEntries(ids.map((i) => [i, []]));
  const children = Object.fromEntries(ids.map((i) => [i, []]));
  for (const {from, to} of graph.edges) {
    children[from].push(to);
    parents[to].push(from);
  }
  const section = Object.fromEntries(graph.nodes.map((n) => [n.id, n.section]));

  const depth = {};
  const visiting = new Set();
  const depthOf = (i) => {
    if (i in depth) return depth[i];
    if (visiting.has(i)) throw new Error(`tech-tree: prerequisite cycle through ${i}`);
    visiting.add(i);
    depth[i] = parents[i].length ? 1 + Math.max(...parents[i].map(depthOf)) : 0;
    visiting.delete(i);
    return depth[i];
  };
  ids.forEach(depthOf);
  const columns = Array.from({length: Math.max(0, ...ids.map((i) => depth[i])) + 1}, (_, k) =>
    ids.filter((i) => depth[i] === k),
  );

  // Order: group by section, then barycentre sweeps to reduce crossings.
  const rank = (s) => (sectionOrder.includes(s) ? sectionOrder.indexOf(s) : sectionOrder.length);
  columns.forEach((c) => c.sort((a, b) => rank(section[a]) - rank(section[b]) || a.localeCompare(b)));
  const pos = {};
  const index = () => columns.forEach((c) => c.forEach((i, k) => (pos[i] = k)));
  index();
  const bary = (i, nb) => (nb[i].length ? nb[i].reduce((s, j) => s + pos[j], 0) / nb[i].length : pos[i]);
  for (let it = 0; it < 12; it++) {
    for (let k = 1; k < columns.length; k++) {
      columns[k].sort((a, b) => bary(a, parents) - bary(b, parents));
      index();
    }
    for (let k = columns.length - 2; k >= 0; k--) {
      columns[k].sort((a, b) => bary(a, children) - bary(b, children));
      index();
    }
  }

  // Vertical positions: pull each node toward its neighbours, keeping order and spacing.
  const y = {};
  columns.forEach((c) => c.forEach((i, k) => (y[i] = k * (H + GAP))));
  const place = (c, want) => {
    let prev = -Infinity;
    const placed = c.map((i) => (prev = Math.max(want(i), prev + H + GAP)));
    const shift = placed.reduce((s, v, k) => s + (v - want(c[k])), 0) / c.length;
    c.forEach((i, k) => (y[i] = placed[k] - shift));
  };
  const mean = (nb) => (i) => (nb[i].length ? nb[i].reduce((s, j) => s + y[j], 0) / nb[i].length : y[i]);
  for (let it = 0; it < 6; it++) {
    for (let k = 1; k < columns.length; k++) place(columns[k], mean(parents));
    for (let k = columns.length - 2; k >= 0; k--) place(columns[k], mean(children));
  }
  const minY = Math.min(...ids.map((i) => y[i]));
  const x = (k) => k * (W + columnGap);

  const nodes = graph.nodes.map((n) => ({...n, depth: depth[n.id], x: x(depth[n.id]), y: Math.round(y[n.id] - minY + top)}));
  const at = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const edges = graph.edges.map(({from, to}) => {
    const a = at[from];
    const b = at[to];
    const x1 = a.x + W;
    const y1 = a.y + H / 2;
    const x2 = b.x;
    const y2 = b.y + H / 2;
    const dx = Math.max(40, (x2 - x1) / 2);
    return {from, to, d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`};
  });
  return {
    ...GEOMETRY,
    width: columns.length ? x(columns.length - 1) + W : 0,
    height: nodes.length ? Math.max(...nodes.map((n) => n.y)) + H + 16 : 0,
    columns: columns.map((c, k) => ({x: x(k), count: c.length})),
    nodes,
    edges,
  };
}

// Markdown stand-in for the diagram, for the agent-facing .md copy of the page.
function treeMarkdown(graph, url) {
  const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
  const link = (id) => `[${byId[id].title}](${url(byId[id].permalink)})`;
  const from = [...new Set(graph.edges.map((e) => e.from))].sort((a, b) =>
    byId[a].title.localeCompare(byId[b].title),
  );
  const lines = ['Each procedure below is a prerequisite of the procedures nested under it.', ''];
  for (const id of from) {
    lines.push(`- ${link(id)}`);
    for (const e of graph.edges.filter((e) => e.from === id)) lines.push(`  - ${link(e.to)}`);
  }
  return lines.join('\n');
}

// Docs as buildGraph expects them, from the docs plugin's loaded content.
function docsFrom(docsContent, siteDir) {
  return docsContent.loadedVersions[0].docs
    .filter((d) => !d.draft)
    .map((d) => ({
      source: path.resolve(siteDir, d.source.replace(/^@site\//, '')),
      permalink: d.permalink,
      title: d.title,
      docType: d.frontMatter.doc_type,
    }));
}

module.exports = {buildGraph, formatErrors, layout, treeMarkdown, docsFrom};
