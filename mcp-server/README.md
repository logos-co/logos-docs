# Logos docs MCP server

A read-only [MCP](https://modelcontextprotocol.io) server for the Logos documentation.
Reader-facing set-up instructions: https://docs.logos.co/get-started/coding-with-agents

| Tool | What it does |
| --- | --- |
| `list_sections` | Every section with its description, `use_cases`, and pages. |
| `search_docs` | BM25 search over heading-level chunks; returns snippets and paths. |
| `get_page` | A page as Markdown, optionally only the part under one heading. |
| `validate_module_metadata` | Checks a module `metadata.json` against the rules the docs state, with a fix and the doc URL for each finding. |

The design follows Svelte's and Solana's docs MCP servers: a section list with use cases
so the agent can choose, canonical page retrieval, and a validator that checks what the
agent wrote (the role `svelte-autofixer` plays for Svelte).

## Run

```bash
npm ci
node src/server.js                                   # stdio, reads https://docs.logos.co/agents/docs.json
node src/server.js --http 3333                       # stateless Streamable HTTP at /mcp, /health
node src/server.js --docs ../build/agents/docs.json  # a local site build (npm run build at the repo root)
```

`LOGOS_DOCS_JSON` sets the docs source too. The index is cached in memory and refreshed
hourly.

## Test

```bash
(cd .. && npm run build) && npm test
```

## Data

The server reads `/agents/docs.json`, which `plugins/agent-ready` writes on every site
build, so it needs no index of its own. The validator rules live in `src/validate.js`;
each one cites the doc page that states it. When `logos-module-builder` changes, update
the docs first, then the rule.

## Hosting

The HTTP mode keeps no session state, so it can run on any Node host, serverless
platform or container behind a load balancer. Once it has a public URL, set the
`mcpUrl` option of the `agent-ready` plugin in `docusaurus.config.ts` so `llms.txt`
and the `AGENTS.md` block advertise it, and add the remote install commands to the
"Coding with agents" page.
