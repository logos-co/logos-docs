---
title: Use the Logos docs with coding agents
doc_type: procedure
product: logos
topics: AI agents, llms.txt, AGENTS.md
authors: weboko
owner: logos
doc_version: 1
slug: coding-with-agents
sidebar_position: 2
---

# Use the Logos docs with coding agents

#### Give Claude Code, Cursor, Codex, or another coding agent the Logos documentation so it works from current docs instead of memory.

Logos changes with every Testnet release, and most of it is newer than the training data of any coding agent. An agent that answers from memory invents `metadata.json` fields, Nix flake outputs, and `logosctl` flags. This page shows three ways to give an agent the current docs, from the lightest to the most thorough:

| Option | What the agent gets | Set-up time |
| --- | --- | --- |
| [Markdown and `llms.txt`](#read-the-docs-as-markdown) | Every page as plain Markdown, plus an index | None |
| [`AGENTS.md` block](#add-the-logos-docs-to-agentsmd) | A compact index of the docs in every prompt | One command |
| [Agent skill](#install-the-logos-docs-skill) | Instructions the agent loads when it works on Logos code | One command |

## Read the docs as Markdown

Agents read Markdown far more efficiently than HTML. Every page on this site has a Markdown version:

- **Any page:** add `.md` to its URL, for example [`/get-started/what-is-logos.md`](pathname:///get-started/what-is-logos.md).
- **Index of every page**, each with a one-line summary: [`/llms.txt`](pathname:///llms.txt), also at `/.well-known/llms.txt`.
- **One section:** `/<section>/llms.txt` for the index and `/<section>/llms-full.txt` for the full text, for example [`/core/llms.txt`](pathname:///core/llms.txt).
- **Everything in one file:** [`/llms-full.txt`](pathname:///llms-full.txt), about 1 MB.
- **Structured index** with each section's use cases, for tools: [`/agents/docs.json`](pathname:///agents/docs.json).

Each page also has a **Copy content** button that copies the page as Markdown, and an **Open in Claude** button that starts a chat about the page. Its arrow menu switches to ChatGPT, which the button then remembers, and shows the Markdown version.

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

A skill is a set of instructions that an agent loads only when the task needs it. The Logos docs skill tells the agent where the docs are, to check the version banner on each page, and to check every `metadata.json` it writes against the docs.

- **Claude Code**, for one project:

  ```bash
  mkdir -p .claude/skills/logos-docs
  curl -fsSL https://docs.logos.co/agents/skills/logos-docs/SKILL.md \
    -o .claude/skills/logos-docs/SKILL.md
  ```

  To install it for all your projects, use `~/.claude/skills/logos-docs` instead.

- **Other agents** that support skills: download [`SKILL.md`](pathname:///agents/skills/logos-docs/SKILL.md) into the agent's skills folder.

## Report a problem

If an agent gets something wrong because a page is wrong, unclear, or missing, select **Report issue** above the page title. It opens a GitHub issue with the page already filled in.
