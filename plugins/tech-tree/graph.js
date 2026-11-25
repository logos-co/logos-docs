// The graph between procedures, shared by the tech-tree plugin (the diagram on
// /get-started/tech-tree and the build check) and agent-ready (the Markdown
// version of that page).
//
// An edge runs from a procedure to each procedure linked from its
// `## Next steps` section. It is `required` when the target also lists the
// source as a prerequisite: a link to another procedure inside a
// `:::info[Prerequisites]` admonition or a `## Prerequisites` section. Links
// to pages of any other doc_type (the glossary, Testnet endpoints, concept
// pages) are lookups, not steps, and are not edges. Every prerequisite must
// link back to each of its dependents from its `## Next steps` section;
// `errors` lists the ones that do not.

const fs = require('fs');
const path = require('path');
const {stripFrontMatter, splitFences} = require('../agent-ready/markdown');
const {USER_TYPES} = require('./user-types');

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
 * @param {Array<{source: string, permalink: string, title: string, docType?: string, techTree?: boolean, userType?: string}>} docs
 *   `source` is the absolute path of the doc's file.
 * @param {string} docsDir absolute path of docs/
 */
function buildGraph(docs, docsDir) {
  const bySource = new Map(docs.map((d) => [d.source, d]));
  const isProcedure = (file) => bySource.get(file)?.docType === 'procedure';
  const next = new Map();
  const required = [];

  for (const doc of docs) {
    if (doc.docType !== 'procedure') continue;
    const lines = proseLines(fs.readFileSync(doc.source, 'utf8'));
    next.set(doc.source, nextStepsLinks(lines, doc.source));
    for (const target of new Set(prerequisiteLinks(lines, doc.source))) {
      if (target !== doc.source && isProcedure(target)) required.push({from: target, to: doc.source});
    }
  }

  const rel = (file) => path.relative(path.dirname(docsDir), file).split(path.sep).join('/');
  const missing = new Map();
  for (const {from, to} of required) {
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

  // Arrows: every Next steps link between procedures. Those a Prerequisites
  // link backs go in first; any other that would close a loop (two pages that
  // list each other as Next steps) is left out, since columns need a DAG.
  const key = (e) => `${e.from}>${e.to}`;
  const isRequired = new Set(required.map(key));
  const edges = required.map((e) => ({...e, required: true}));
  const out = new Map();
  const addOut = ({from, to}) => out.set(from, [...(out.get(from) ?? []), to]);
  edges.forEach(addOut);
  const reaches = (start, goal) => {
    const seen = new Set();
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      if (i === goal) return true;
      if (seen.has(i)) continue;
      seen.add(i);
      stack.push(...(out.get(i) ?? []));
    }
    return false;
  };
  const suggested = [...next]
    .flatMap(([from, tos]) => [...(tos ?? [])].filter((to) => to !== from && isProcedure(to)).map((to) => ({from, to})))
    .filter((e) => !isRequired.has(key(e)))
    .sort((a, b) => key(a).localeCompare(key(b)));
  const skipped = [];
  for (const e of suggested) {
    if (reaches(e.to, e.from)) {
      skipped.push({from: rel(e.from), to: rel(e.to)});
      continue;
    }
    edges.push({...e, required: false});
    addOut(e);
  }

  // Every procedure is a node, including ones that link to no other procedure,
  // unless its front matter sets `tech_tree: false`. The Next steps check above
  // still covers those pages; they and their links are only left off the diagram.
  const shown = (file) => bySource.get(file).techTree !== false;
  const ids = docs.filter((d) => d.docType === 'procedure' && shown(d.source)).map((d) => d.source);
  const nodes = ids.map((id) => {
    const d = bySource.get(id);
    return {
      id: rel(id),
      title: d.title,
      permalink: d.permalink,
      section: path.relative(docsDir, id).split(path.sep)[0],
      userType: d.userType,
    };
  });
  return {
    nodes,
    edges: edges
      .filter((e) => shown(e.from) && shown(e.to))
      .map((e) => ({from: rel(e.from), to: rel(e.to), required: e.required})),
    errors,
    skipped,
    userTypeErrors: docs
      .filter((d) => d.docType === 'procedure' && !USER_TYPES.some((t) => t.id === d.userType))
      .map((d) => ({file: rel(d.source), value: d.userType})),
  };
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

// Markdown stand-in for the diagram, for the agent-facing .md copy of the page.
function treeMarkdown(graph, url) {
  const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
  const link = (id) => `[${byId[id].title}](${url(byId[id].permalink)})`;
  const from = [...new Set(graph.edges.map((e) => e.from))].sort((a, b) =>
    byId[a].title.localeCompare(byId[b].title),
  );
  const lines = [
    'Each procedure below lists the procedures nested under it as Next steps. "(prerequisite)" marks a next step that lists the procedure above it under Prerequisites.',
    '',
  ];
  const linked = new Set(graph.edges.flatMap((e) => [e.from, e.to]));
  const alone = graph.nodes.filter((n) => !linked.has(n.id)).sort((a, b) => a.title.localeCompare(b.title));
  for (const id of from) {
    lines.push(`- ${link(id)}`);
    for (const e of graph.edges.filter((e) => e.from === id)) {
      lines.push(`  - ${link(e.to)}${e.required ? ' (prerequisite)' : ''}`);
    }
  }
  if (alone.length) {
    lines.push('', 'These procedures have no Next steps or Prerequisites links to other procedures:', '');
    for (const n of alone) lines.push(`- ${link(n.id)}`);
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
      techTree: d.frontMatter.tech_tree !== false,
      userType: d.frontMatter.user_type,
    }));
}

function formatUserTypeErrors(errors) {
  const allowed = USER_TYPES.map((t) => t.id).join(', ');
  return [
    `tech-tree: ${errors.length} procedure(s) have no valid \`user_type\` in their front matter. Give each exactly one of: ${allowed}.`,
    'The criteria for each are the journey fit checklists in .github/ISSUE_TEMPLATE/doc-packet.yml.',
    '',
    ...errors.map((e) => `  ${e.file}: ${e.value === undefined ? 'missing' : JSON.stringify(e.value)}`),
    '',
  ].join('\n');
}

module.exports = {buildGraph, formatErrors, formatUserTypeErrors, treeMarkdown, docsFrom};
