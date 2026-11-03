// Turns a Docusaurus Markdown/MDX source file into plain Markdown that an agent
// can read without a JavaScript runtime: no front matter, no MDX imports or
// components, admonitions as blockquotes, and every link absolute.

const path = require('path');

const FENCE = /^\s*(```|~~~)/;

// Split a document into alternating prose / fenced-code chunks so rewrites
// never touch code samples.
function splitFences(text) {
  const chunks = [];
  let buf = [];
  let inFence = false;
  let fenceMarker = '';
  for (const line of text.split('\n')) {
    const m = line.match(FENCE);
    if (!inFence && m) {
      if (buf.length) chunks.push({code: false, lines: buf});
      buf = [line];
      inFence = true;
      fenceMarker = m[1];
    } else if (inFence && m && m[1] === fenceMarker && line.trim() === fenceMarker) {
      buf.push(line);
      chunks.push({code: true, lines: buf});
      buf = [];
      inFence = false;
    } else {
      buf.push(line);
    }
  }
  if (buf.length) chunks.push({code: inFence, lines: buf});
  return chunks;
}

function stripFrontMatter(text) {
  if (!text.startsWith('---\n')) return text;
  const end = text.indexOf('\n---', 4);
  if (end === -1) return text;
  return text.slice(text.indexOf('\n', end + 1) + 1);
}

const ADMONITION_LABELS = {
  note: 'Note',
  tip: 'Tip',
  info: 'Info',
  warning: 'Warning',
  caution: 'Caution',
  danger: 'Danger',
  important: 'Important',
};

function convertAdmonitions(lines) {
  const out = [];
  let open = null; // {indent}
  let inFence = null;
  for (const line of lines) {
    const fence = line.match(FENCE);
    if (fence) {
      if (!inFence) inFence = fence[1];
      else if (line.trim() === inFence) inFence = null;
    }
    const start = !inFence && line.match(/^(\s*):::(\w+)\s*(?:\[(.*)\]|(.*))$/);
    if (!open && start) {
      const [, indent, kind, bracketTitle, plainTitle] = start;
      const title = (bracketTitle || plainTitle || '').trim();
      const label = ADMONITION_LABELS[kind.toLowerCase()] || kind;
      open = {indent};
      out.push(`${indent}> **${label}${title ? `: ${title.trim()}` : ''}**`);
      out.push(`${indent}>`);
      continue;
    }
    if (open && !inFence && /^\s*:::\s*$/.test(line)) {
      open = null;
      continue;
    }
    if (open) {
      const body = line.startsWith(open.indent) ? line.slice(open.indent.length) : line.trimStart();
      out.push(body.length ? `${open.indent}> ${body}` : `${open.indent}>`);
      continue;
    }
    out.push(line);
  }
  return out;
}

/**
 * @param {object} args
 * @param {string} args.source      raw file contents
 * @param {string} args.sourcePath  absolute path of the file
 * @param {string} args.siteUrl     e.g. https://docs.logos.co
 * @param {string} args.title       page title (used when the file has no H1)
 * @param {(absPath: string) => string | undefined} args.resolveDoc
 *        maps an absolute .md path to the page's permalink
 * @param {string} args.rawBase     base URL for raw repository files (images)
 * @param {string} args.repoRoot    absolute path of the repository root
 */
function toAgentMarkdown({source, sourcePath, siteUrl, title, resolveDoc, rawBase, repoRoot}) {
  const body = stripFrontMatter(source);
  const dir = path.dirname(sourcePath);

  const rewriteLink = (target) => {
    if (/^(https?:|mailto:|#)/.test(target)) return target;
    if (target.startsWith('pathname://')) return `${siteUrl}${target.slice('pathname://'.length)}`;
    const [file, hash] = target.split('#');
    const abs = path.resolve(dir, decodeURIComponent(file));
    if (/\.mdx?$/.test(file)) {
      const permalink = resolveDoc(abs);
      if (permalink) return `${siteUrl}${permalink}.md${hash ? `#${hash}` : ''}`;
    }
    if (file.startsWith('/')) return `${siteUrl}${file}${hash ? `#${hash}` : ''}`;
    // Images and other assets: point at the file in the repository.
    return `${rawBase}/${path.relative(repoRoot, abs).split(path.sep).join('/')}`;
  };

  const chunks = splitFences(body).map((chunk) => {
    if (chunk.code) return chunk.lines.join('\n');
    let text = chunk.lines
      .filter((l) => !/^import\s+.+\s+from\s+['"].+['"];?\s*$/.test(l))
      .join('\n');

    text = text.replace(
      /<Figure\b[^>]*?src=\{require\(["']([^"']+)["']\)\.default\}[^>]*?caption=["']([^"']*)["'][^>]*?(?:number=\{(\d+)\})?[^>]*\/>/g,
      (_, src, caption, number) => `![${number ? `Figure ${number}. ` : ''}${caption}](${rewriteLink(src)})`,
    );
    text = text.replace(
      /<YouTube\b[^>]*?id=["']([^"']+)["'][^>]*?title=["']([^"']*)["'][^>]*\/>/g,
      (_, id, t) => `[Video: ${t}](https://www.youtube.com/watch?v=${id})`,
    );
    // Markdown links and images. Inline code spans are matched first and left
    // alone, but a link label may itself contain code (`[`lgpm`](...)`).
    text = text.replace(
      /(`[^`\n]*`)|(!?\[(?:[^\]`\n]|`[^`\n]*`)*\])\(([^)\s]+)(\s+"[^"]*")?\)/g,
      (whole, code, label, target, t = '') => (code ? code : `${label}(${rewriteLink(target)}${t})`),
    );
    return text;
  });

  // Admonitions can wrap code blocks, so convert them over the whole page,
  // only recognising `:::` markers outside fences.
  const body2 = convertAdmonitions(chunks.join('\n').split('\n')).join('\n');

  let md = body2.replace(/\n{3,}/g, '\n\n').trim();
  if (!/^#\s/m.test(md.split('\n').find((l) => l.trim()) || '')) {
    md = `# ${title}\n\n${md}`;
  }
  return md + '\n';
}

// The one-line summary agents see in llms.txt: the `####` subtitle the docs
// put under each H1, else Docusaurus's own description.
function summaryOf(source, fallback) {
  const m = stripFrontMatter(source).match(/^#\s.+\n+####\s+(.+)$/m);
  const s = (m ? m[1] : fallback || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
  return s;
}

function headingsOf(markdown) {
  return splitFences(markdown)
    .filter((c) => !c.code)
    .flatMap((c) => c.lines)
    .map((l) => l.match(/^(#{2,3})\s+(.+?)\s*$/))
    .filter(Boolean)
    .map((m) => ({depth: m[1].length, text: m[2]}));
}

module.exports = {toAgentMarkdown, summaryOf, headingsOf, stripFrontMatter, splitFences};
