# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## Checks before opening a PR

Two checks run on every PR, and both are cheap to run locally:

- `npm ci && npm run build` — the Docusaurus build (`.github/workflows/build-check.yml`). Catches broken relative links and bad frontmatter.
- `vale <changed files>` — prose lint (`.github/workflows/vale.yml`). It runs with `filter_mode: added` and `fail_on_error: true`, so **only `error`-level alerts on lines you added block the merge**; warnings and suggestions never do. Compare against the pre-change file rather than chasing every alert.

`Logos.SpellingGB` is a plain en_GB dictionary and rejects ordinary technical words (`tooltip`, `Env`, `swap's`). `Google.EmDash` rejects a spaced em dash. Both stop at inline code, so a literal UI string that trips them belongs in backticks, not bold. Repo-wide vocabulary additions go in `.github/styles/config/vocabularies/Logos/accept.txt`.

## Docs about software living in other repos

Several pages under `docs/` (notably `docs/basecamp/swap-eth-and-lez-tokens-in-logos-basecamp.md`) are literal walkthroughs of apps whose source is in another repository. There is no CI that can detect drift, so every UI string, version, address, and program ID has to be re-verified against that repo's release tags before the page is edited — the app's own QML/source is the authority, not the page's previous wording.

## Conventions

`CONTRIBUTING.md` is the authority on document types, templates, and the review workflow; read it before adding or restructuring a page. Note the repo-wide `:::tip[Version]` banner that states which Testnet release a page is accurate for — it tracks the Testnet, not the app the page describes.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
