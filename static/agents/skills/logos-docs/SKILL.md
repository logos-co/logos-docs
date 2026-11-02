---
name: logos-docs
description: Use when writing, building, packaging or debugging anything on the Logos stack — Logos modules (metadata.json, logos-module-builder, Nix flakes, .lgx packages), Logos Basecamp, logosctl, logos-scaffold (lgs), the Logos Blockchain, LEZ programs and wallets, Logos Messaging (Delivery, Chat), Logos Storage, the Mixnet, or testnet endpoints. Loads the official docs at docs.logos.co instead of relying on memory.
---

# Logos documentation

Logos changes with every testnet release, and most of it postdates your training data.
Treat what you remember about Logos as a hint, and check it against the docs before you
write code, configuration or commands.

## Where to read

1. If the `logos-docs` MCP server is connected, use it:
   - `list_sections` to pick a section by its use cases,
   - `search_docs` for a specific error message, command, field or concept,
   - `get_page` (optionally with `heading`) to read the page you found.
2. Otherwise fetch Markdown over HTTP:
   - Index of every page with a one-line summary: https://docs.logos.co/llms.txt
   - One section: `https://docs.logos.co/<section>/llms.txt` (sections: get-started,
     basecamp, build-an-app, core, blockchain, lez, messaging, storage, mixnet,
     peer-discovery, run-a-node)
   - Any page as Markdown: add `.md` to its URL.
   - Everything in one file (about 1 MB): https://docs.logos.co/llms-full.txt

Read the version banner at the top of each page ("This document is accurate for
Testnet vX"). If it does not match the version the user's project targets, say so.

## Rules

- After writing or editing a module's `metadata.json`, run the MCP tool
  `validate_module_metadata` on it and fix every error. Without the MCP server, check it
  against https://docs.logos.co/core/build-modules/build-and-run-a-logos-core-module.md.
- Use the versions the docs pin (for example `github:logos-co/logos-module-builder/<tag>`),
  not `main`, unless the user asks otherwise.
- Quote flake references in shell commands: `nix build '.#lgx-portable'`. Nix only sees
  files that Git tracks, so `git add` new files before building.
- Released `logosctl` and Basecamp builds install only portable `.lgx` variants
  (`.#lgx-portable`); development builds install only `-dev` variants (`.#lgx`).
- For testnet RPC, explorer and faucet URLs, read
  https://docs.logos.co/get-started/testnet-endpoints.md instead of guessing.
- When you answer from the docs, cite the page URL you used.

If the docs do not cover what you need, or they are wrong, tell the user and suggest
opening an issue at https://github.com/logos-co/logos-docs/issues/new?template=doc-fix-or-request.yml
