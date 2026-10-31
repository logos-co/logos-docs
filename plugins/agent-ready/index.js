// Docusaurus plugin: publishes the docs in the forms coding agents read.
//
// After `docusaurus build` it writes, next to the HTML:
//   /<page>.md                 every doc as plain Markdown
//   /llms.txt                  index of every page with a one-line summary
//   /llms-full.txt             every page in one file
//   /<section>/llms.txt        per-section index (and llms-full.txt)
//   /.well-known/llms.txt      copy of /llms.txt
//   /agents/docs.json          sections, pages and content for the docs MCP server
//   /agents/AGENTS.md          copy-paste block for a project's AGENTS.md
//
// See docs/get-started/coding-with-agents.md for the reader-facing side.

const fs = require('fs');
const path = require('path');
const {toAgentMarkdown, summaryOf, headingsOf} = require('./markdown');
const SECTIONS = require('./sections');

const DOCS_PLUGIN = 'docusaurus-plugin-content-docs';

function walkSidebar(items, visit, parents = []) {
  for (const item of items || []) {
    visit(item, parents);
    if (item.type === 'category') walkSidebar(item.items, visit, [...parents, item]);
  }
}

module.exports = function agentReadyPlugin(context, options = {}) {
  const siteUrl = context.siteConfig.url.replace(/\/$/, '');
  const repoRoot = context.siteDir;
  const rawBase = options.rawBase || 'https://raw.githubusercontent.com/logos-co/logos-docs/main';
  const mcpUrl = options.mcpUrl || '';
  let docsContent;

  return {
    name: 'agent-ready',

    async allContentLoaded({allContent}) {
      docsContent = allContent[DOCS_PLUGIN]?.default;
    },

    injectHtmlTags() {
      return {
        headTags: [
          {tagName: 'link', attributes: {rel: 'llms-txt', href: '/llms.txt', type: 'text/plain'}},
        ],
      };
    },

    async postBuild({outDir}) {
      if (!docsContent) throw new Error('agent-ready: docs plugin content not found');
      const version = docsContent.loadedVersions[0];
      const write = (rel, data) => {
        const file = path.join(outDir, rel);
        fs.mkdirSync(path.dirname(file), {recursive: true});
        fs.writeFileSync(file, data);
      };
      const mdUrl = (permalink) => `${siteUrl}${permalink === '/' ? '/index' : permalink}.md`;

      // Map source files to permalinks so relative links become absolute .md links.
      const bySource = new Map();
      for (const doc of version.docs) {
        bySource.set(path.resolve(repoRoot, doc.source.replace(/^@site\//, '')), doc.permalink);
      }

      // Order pages by their first appearance in the sidebars.
      const order = new Map();
      for (const sidebar of Object.values(version.sidebars)) {
        walkSidebar(sidebar, (item) => {
          if (item.type === 'doc' && !order.has(item.id)) order.set(item.id, order.size);
        });
      }

      const pages = version.docs
        .filter((doc) => !doc.unlisted && !doc.draft)
        .map((doc) => {
          const sourcePath = path.resolve(repoRoot, doc.source.replace(/^@site\//, ''));
          const source = fs.readFileSync(sourcePath, 'utf8');
          const markdown = toAgentMarkdown({
            source,
            sourcePath,
            siteUrl,
            title: doc.title,
            rawBase,
            repoRoot,
            resolveDoc: (abs) => bySource.get(abs),
          });
          const relSource = path.relative(path.join(repoRoot, 'docs'), sourcePath);
          return {
            id: doc.id,
            title: doc.title,
            summary: summaryOf(source, doc.description),
            section: relSource.split(path.sep)[0],
            doc_type: doc.frontMatter.doc_type || null,
            url: `${siteUrl}${doc.permalink}`,
            markdown_url: mdUrl(doc.permalink),
            permalink: doc.permalink,
            source: `https://github.com/logos-co/logos-docs/blob/main/docs/${relSource.split(path.sep).join('/')}`,
            headings: headingsOf(markdown),
            markdown,
            _order: order.has(doc.id) ? order.get(doc.id) : 1e6,
          };
        })
        .sort((a, b) => a._order - b._order || a.permalink.localeCompare(b.permalink));

      const header = (page) =>
        `> Source: ${page.url}\n> Markdown index of all Logos docs: ${siteUrl}/llms.txt\n\n`;

      for (const page of pages) {
        write(`${page.permalink}.md`, header(page) + page.markdown);
      }

      // Section metadata: configured sections first, then any folder not configured.
      const known = new Map(SECTIONS.map((s) => [s.id, s]));
      const sectionIds = [
        ...SECTIONS.map((s) => s.id),
        ...[...new Set(pages.map((p) => p.section))].filter((id) => !known.has(id)),
      ];
      const sections = sectionIds
        .map((id) => {
          const meta = known.get(id) || {id, title: id, description: '', use_cases: []};
          const sectionPages = pages.filter((p) => p.section === id);
          return {
            ...meta,
            llms_txt: `${siteUrl}/${id}/llms.txt`,
            llms_full_txt: `${siteUrl}/${id}/llms-full.txt`,
            pages: sectionPages,
          };
        })
        .filter((s) => s.pages.length);

      const pageLine = (p) => `- [${p.title}](${p.markdown_url})${p.summary ? `: ${p.summary}` : ''}`;
      const agentNotes = [
        '## How to read these docs',
        '',
        `- Every page is available as Markdown: add \`.md\` to its URL (for example ${mdUrl('/get-started/what-is-logos')}).`,
        `- Each section has its own index (\`/<section>/llms.txt\`) and full text (\`/<section>/llms-full.txt\`). The whole set is at ${siteUrl}/llms-full.txt.`,
        `- Structured index with section use cases: ${siteUrl}/agents/docs.json`,
        mcpUrl
          ? `- Docs MCP server (search, fetch, and a metadata.json validator): ${mcpUrl}`
          : '- Docs MCP server (search, fetch, and a metadata.json validator): see the "Coding with agents" page.',
        `- Coding with agents: ${mdUrl('/get-started/coding-with-agents')}`,
        '',
      ].join('\n');

      const llmsTxt = [
        '# Logos documentation',
        '',
        '> Guides and references for the Logos stack: a modular, local-first technology stack for decentralised apps. Logos Basecamp runs modules and apps; Logos Core builds them; the Logos Blockchain, LEZ (the Logos Execution Zone), Messaging, Storage and the Mixnet are the services they use.',
        '',
        agentNotes,
        ...sections.flatMap((s) => [
          `## ${s.title}`,
          '',
          s.description,
          s.use_cases.length ? `Use this section to: ${s.use_cases.join('; ')}.` : '',
          `Section index: ${s.llms_txt}`,
          '',
          ...s.pages.map(pageLine),
          '',
        ]),
      ]
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');

      write('llms.txt', llmsTxt);
      write('.well-known/llms.txt', llmsTxt);
      write('index.md', llmsTxt);
      write(
        'llms-full.txt',
        pages.map((p) => `${header(p)}${p.markdown}`).join('\n---\n\n'),
      );

      for (const s of sections) {
        write(
          `${s.id}/llms.txt`,
          [
            `# Logos documentation: ${s.title}`,
            '',
            `> ${s.description}`,
            '',
            s.use_cases.length ? `Use this section to:\n\n${s.use_cases.map((u) => `- ${u}`).join('\n')}\n` : '',
            `Full text of this section: ${s.llms_full_txt}`,
            `Index of all sections: ${siteUrl}/llms.txt`,
            '',
            '## Pages',
            '',
            ...s.pages.map(pageLine),
            '',
          ].join('\n'),
        );
        write(`${s.id}/llms-full.txt`, s.pages.map((p) => `${header(p)}${p.markdown}`).join('\n---\n\n'));
      }

      // Generated-index category pages (/run-an-app, /basecamp, ...) have no
      // source file; give them a Markdown listing of what they link to.
      const docByid = new Map(version.docs.map((d) => [d.id, d]));
      for (const sidebar of Object.values(version.sidebars)) {
        walkSidebar(sidebar, (item) => {
          if (item.type !== 'category' || item.link?.type !== 'generated-index') return;
          const gen = item.link;
          const lines = [];
          walkSidebar(item.items, (child, parents) => {
            const depth = '  '.repeat(parents.length);
            if (child.type === 'category') lines.push(`${depth}- ${child.label}`);
            else if (child.type === 'doc') {
              const d = docByid.get(child.id);
              if (d) lines.push(`${depth}- [${child.label || d.title}](${mdUrl(d.permalink)})`);
            } else if (child.type === 'link') {
              const href = child.href.startsWith('/') ? mdUrl(child.href) : child.href;
              lines.push(`${depth}- [${child.label}](${href})`);
            }
          });
          write(
            `${item.link.permalink}.md`,
            `> Source: ${siteUrl}${item.link.permalink}\n> Markdown index of all Logos docs: ${siteUrl}/llms.txt\n\n` +
              `# ${gen?.title || item.label}\n\n${gen?.description ? `${gen.description}\n\n` : ''}${lines.join('\n')}\n`,
          );
        });
      }

      // Structured index for the docs MCP server and other tools.
      write(
        'agents/docs.json',
        JSON.stringify(
          {
            name: 'Logos documentation',
            site: siteUrl,
            generated_at: new Date().toISOString(),
            sections: sections.map(({pages: sp, ...s}) => ({...s, pages: sp.map((p) => p.permalink)})),
            pages: pages.map(({_order, ...p}) => p),
          },
          null,
          0,
        ),
      );

      // AGENTS.md block: an always-loaded, compressed index of the docs (the
      // pattern that scored best in Vercel's Next.js agent evals).
      const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
      const agentsMd = [
        '<!-- BEGIN logos-docs (generated from https://docs.logos.co/agents/AGENTS.md) -->',
        '## Logos documentation',
        '',
        'This project builds on Logos. Your training data about Logos is likely outdated or missing:',
        'before writing Logos code, configs, `metadata.json`, Nix flakes or CLI commands, read the',
        'relevant page below. Prefer the docs over memory, and cite the page you used.',
        '',
        `- Fetch any page as Markdown by adding \`.md\` to its URL. Full index: ${siteUrl}/llms.txt`,
        mcpUrl
          ? `- If the \`logos-docs\` MCP server is connected, use \`search_docs\` / \`get_page\`, and run \`validate_module_metadata\` on every metadata.json you write.`
          : '- If the `logos-docs` MCP server is connected, use `search_docs` / `get_page`, and run `validate_module_metadata` on every metadata.json you write.',
        '',
        `Docs index (base URL ${siteUrl}, append \`.md\`):`,
        '',
        ...sections.flatMap((s) => [
          `${s.title}:`,
          ...s.pages.map((p) => `- ${p.permalink}${p.summary ? ` — ${short(p.summary, 90)}` : ''}`),
        ]),
        '<!-- END logos-docs -->',
        '',
      ].join('\n');
      write('agents/AGENTS.md', agentsMd);

      console.log(
        `[agent-ready] wrote ${pages.length} Markdown pages, llms.txt, llms-full.txt, ${sections.length} section indexes, agents/docs.json (${Math.round(
          fs.statSync(path.join(outDir, 'agents/docs.json')).size / 1024,
        )} KB), agents/AGENTS.md (${Math.round(Buffer.byteLength(agentsMd) / 1024)} KB)`,
      );
    },
  };
};
