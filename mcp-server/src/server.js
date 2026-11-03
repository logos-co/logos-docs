#!/usr/bin/env node
// Read-only MCP server for the Logos documentation.
//
//   node src/server.js                         stdio (Claude Code, Cursor, Codex, VS Code)
//   node src/server.js --http 3333             stateless Streamable HTTP at /mcp
//   node src/server.js --docs ../build/agents/docs.json   use a local build
//
// The docs come from https://docs.logos.co/agents/docs.json, which the site's
// agent-ready plugin writes on every build. LOGOS_DOCS_JSON overrides it.

import http from 'node:http';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {z} from 'zod';
import {DocsIndex, DEFAULT_SOURCE, sliceSection} from './docs.js';
import {validateModuleMetadata} from './validate.js';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const source = flag('--docs') || process.env.LOGOS_DOCS_JSON || DEFAULT_SOURCE;
const docs = new DocsIndex(source);

const text = (value) => ({
  content: [{type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2)}],
});

export function createServer() {
  const server = new McpServer(
    {name: 'logos-docs', version: '0.1.0'},
    {
      instructions:
        'Official Logos documentation (docs.logos.co). Start with list_sections to pick a section by its use cases, ' +
        'then search_docs or get_page. Prefer these docs over prior knowledge: Logos tooling changes between testnet releases. ' +
        'After writing or editing a Logos module metadata.json, run validate_module_metadata on it and fix every error before returning.',
    },
  );

  server.registerTool(
    'list_sections',
    {
      title: 'List documentation sections',
      description:
        'Lists every section of the Logos docs with a description, the tasks it helps with (use_cases), and its pages. Call this first to decide where to look.',
      inputSchema: {},
      annotations: {readOnlyHint: true, openWorldHint: false},
    },
    async () => {
      await docs.load();
      return text(docs.sections());
    },
  );

  server.registerTool(
    'search_docs',
    {
      title: 'Search the Logos docs',
      description:
        'Full-text search over every heading-level section of the Logos docs. Returns the best matches with a snippet and the path to pass to get_page.',
      inputSchema: {
        query: z.string().min(2).describe('What to look for, e.g. "lgx portable variant" or "register RLN membership"'),
        section: z.string().optional().describe('Limit to one section id from list_sections, e.g. "core" or "lez"'),
        limit: z.number().int().min(1).max(20).optional().describe('Maximum results (default 8)'),
      },
      annotations: {readOnlyHint: true, openWorldHint: false},
    },
    async ({query, section, limit}) => {
      await docs.load();
      const results = docs.search(query, {section, limit});
      if (!results.length) {
        return text({
          results: [],
          hint: 'No matches. Try fewer or different words, drop the section filter, or call list_sections.',
        });
      }
      return text({results});
    },
  );

  server.registerTool(
    'get_page',
    {
      title: 'Get a docs page as Markdown',
      description:
        'Returns one Logos docs page as Markdown. Accepts a path ("/core/build-modules/build-and-run-a-logos-core-module"), a full docs.logos.co URL, or a .md URL. Pass `heading` to get only that section of the page.',
      inputSchema: {
        path: z.string().describe('Page path or URL'),
        heading: z.string().optional().describe('Return only the section under the first heading containing this text'),
      },
      annotations: {readOnlyHint: true, openWorldHint: false},
    },
    async ({path, heading}) => {
      await docs.load();
      const page = docs.findPage(path);
      if (!page) {
        return {
          isError: true,
          ...text({error: `No page at "${path}".`, did_you_mean: docs.suggest(path)}),
        };
      }
      let body = page.markdown;
      if (heading) {
        const part = sliceSection(page.markdown, heading);
        if (!part) {
          return {
            isError: true,
            ...text({
              error: `No heading containing "${heading}" on ${page.permalink}.`,
              headings: page.headings.map((h) => h.text),
            }),
          };
        }
        body = part;
      }
      return text(`> Source: ${page.url}\n> Edit: ${page.source}\n\n${body}`);
    },
  );

  server.registerTool(
    'validate_module_metadata',
    {
      title: 'Validate a Logos module metadata.json',
      description:
        'Checks a Logos module metadata.json (core or ui_qml) against the rules in the Logos docs: required fields, C-identifier names, main/interface pairing, ui_qml view and backend, dependency and nix block shapes. Returns errors, warnings, suggested fixes and the doc page for each. Run it on every metadata.json you write.',
      inputSchema: {
        metadata: z.string().describe('The full contents of metadata.json'),
      },
      annotations: {readOnlyHint: true, openWorldHint: false},
    },
    async ({metadata}) => text(validateModuleMetadata(metadata)),
  );

  return server;
}

async function main() {
  const port = flag('--http');
  if (port === undefined) {
    await createServer().connect(new StdioServerTransport());
    return;
  }

  // Stateless Streamable HTTP: a fresh server and transport per request, no
  // session IDs, so it runs behind any load balancer or serverless platform.
  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-protocol-version, mcp-session-id');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    if (url.pathname === '/health') {
      return res.writeHead(200, {'content-type': 'application/json'}).end(JSON.stringify({ok: true, source}));
    }
    if (url.pathname !== '/mcp') return res.writeHead(404).end('Not found. The MCP endpoint is /mcp.');
    if (req.method !== 'POST') {
      return res
        .writeHead(405, {'content-type': 'application/json', allow: 'POST'})
        .end(JSON.stringify({jsonrpc: '2.0', error: {code: -32000, message: 'Method not allowed (stateless server: POST only).'}, id: null}));
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
    res.on('close', () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
    } catch (e) {
      if (!res.headersSent) {
        res.writeHead(400, {'content-type': 'application/json'}).end(
          JSON.stringify({jsonrpc: '2.0', error: {code: -32700, message: String(e.message || e)}, id: null}),
        );
      }
    }
  });
  httpServer.listen(Number(port), () => {
    console.error(`logos-docs MCP server: http://localhost:${port}/mcp (docs: ${source})`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
