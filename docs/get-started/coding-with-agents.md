---
title: Use the Logos docs with coding agents
doc_type: procedure
product: logos
topics: AI agents, MCP, llms.txt
authors: weboko
owner: logos
doc_version: 1
slug: coding-with-agents
sidebar_position: 2
---

# Use the Logos docs with coding agents

#### Connect Claude Code, Cursor, Codex, or VS Code to the Logos documentation so your agent works from current docs instead of memory.

Logos changes with every Testnet release, and most of it is newer than the training data of any coding agent. An agent that answers from memory invents `metadata.json` fields, Nix flake outputs, and `logosctl` flags. This page shows the four ways to give an agent the current docs, from the lightest to the most capable:

| Option | What the agent gets | Set-up time |
| --- | --- | --- |
| [Markdown and `llms.txt`](#read-the-docs-as-markdown) | Every page as plain Markdown, plus an index | None |
| [`AGENTS.md` block](#add-the-logos-docs-to-agentsmd) | A compact index of the docs in every prompt | One command |
| [Agent skill](#install-the-logos-docs-skill) | Instructions the agent loads when it works on Logos code | One command |
| [Docs MCP server](#connect-the-docs-mcp-server) | Search, page retrieval, and a `metadata.json` validator as tools | A few minutes |

## Read the docs as Markdown

Agents read Markdown far more efficiently than HTML. Every page on this site has a Markdown version:

- **Any page:** add `.md` to its URL, for example [`/get-started/what-is-logos.md`](pathname:///get-started/what-is-logos.md).
- **Index of every page**, each with a one-line summary: [`/llms.txt`](pathname:///llms.txt), also at `/.well-known/llms.txt`.
- **One section:** `/<section>/llms.txt` for the index and `/<section>/llms-full.txt` for the full text, for example [`/core/llms.txt`](pathname:///core/llms.txt).
- **Everything in one file:** [`/llms-full.txt`](pathname:///llms-full.txt), about 1 MB.
- **Structured index** with each section's use cases, for tools: [`/agents/docs.json`](pathname:///agents/docs.json).

Each page also has a **Copy page** button. Its menu opens the page in Claude or ChatGPT, or shows the Markdown version.

:::tip
To point an agent at the docs without any set-up, start your prompt with: "Read https://docs.logos.co/llms.txt and use the Logos docs for this task."
:::

## Add the Logos docs to `AGENTS.md`

`AGENTS.md` (or `CLAUDE.md` for Claude Code) is loaded into every prompt, so the agent does not have to decide to look anything up. The block below tells the agent to prefer the docs over memory and lists every page with a short summary, in about 12 KB.

1. From the root of your project, append the block to `AGENTS.md`:

   ```bash
   curl -fsSL https://docs.logos.co/agents/AGENTS.md >> AGENTS.md
   ```

1. If you use Claude Code, make sure `CLAUDE.md` includes it. Either append the block to `CLAUDE.md` instead, or add a line containing `@AGENTS.md` to `CLAUDE.md`.

The block is generated from the docs on every site build. To refresh it, replace the text between `<!-- BEGIN logos-docs` and `<!-- END logos-docs -->` with a new download.

## Install the Logos docs skill

A skill is a set of instructions that an agent loads only when the task needs it. The Logos docs skill tells the agent where the docs are, to check the version banner on each page, and to validate every `metadata.json` it writes.

- **Claude Code**, for one project:

  ```bash
  mkdir -p .claude/skills/logos-docs
  curl -fsSL https://docs.logos.co/agents/skills/logos-docs/SKILL.md \
    -o .claude/skills/logos-docs/SKILL.md
  ```

  To install it for all your projects, use `~/.claude/skills/logos-docs` instead.

- **Other agents** that support skills: download [`SKILL.md`](pathname:///agents/skills/logos-docs/SKILL.md) into the agent's skills folder.

## Connect the docs MCP server

The docs MCP server gives the agent four read-only tools:

| Tool | What it does |
| --- | --- |
| `list_sections` | Lists every section of the docs with the tasks it covers, so the agent can choose where to look. |
| `search_docs` | Searches every heading-level section of the docs and returns matches with snippets. |
| `get_page` | Returns a page as Markdown, or only the part under one heading. |
| `validate_module_metadata` | Checks a module's `metadata.json` against the rules in these docs and returns errors, suggested fixes, and the page that states each rule. |

The server reads [`/agents/docs.json`](pathname:///agents/docs.json), so it always serves the published docs.

:::info[Prerequisites]
- Node.js 20 or later
- Git
:::

1. Clone this repository and install the server:

   ```bash
   git clone https://github.com/logos-co/logos-docs.git
   cd logos-docs/mcp-server
   npm ci
   ```

1. Note the absolute path of the server, which you need in the next step:

   ```bash
   echo "$PWD/src/server.js"
   ```

1. Add the server to your agent. Replace `/path/to/logos-docs` with the path from the previous step.

   - **Claude Code:**

     ```bash
     claude mcp add logos-docs -- node /path/to/logos-docs/mcp-server/src/server.js
     ```

   - **Codex CLI:**

     ```bash
     codex mcp add logos-docs -- node /path/to/logos-docs/mcp-server/src/server.js
     ```

   - **Cursor:** add the server to `.cursor/mcp.json` in your project, or to `~/.cursor/mcp.json` for all projects:

     ```json
     {
       "mcpServers": {
         "logos-docs": {
           "command": "node",
           "args": ["/path/to/logos-docs/mcp-server/src/server.js"]
         }
       }
     }
     ```

   - **VS Code:** add the server to `.vscode/mcp.json` in your project:

     ```json
     {
       "servers": {
         "logos-docs": {
           "type": "stdio",
           "command": "node",
           "args": ["/path/to/logos-docs/mcp-server/src/server.js"]
         }
       }
     }
     ```

1. Check that the agent sees the tools. In Claude Code, run `/mcp` and confirm that `logos-docs` shows as connected with four tools. Then ask, for example: "Use the logos-docs tools to check my metadata.json."

To share one server between several agents or machines, run it over HTTP instead. It listens at `/mcp` and keeps no session state:

```bash
npm run start:http
claude mcp add --transport http logos-docs http://localhost:3333/mcp
```

## Report a problem

If an agent gets something wrong because a page is wrong, unclear, or missing, use **Report a problem with this page** in the page's **Copy page** menu. It opens a GitHub issue with the page already filled in.
