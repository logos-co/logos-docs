# Contributing

`logos-co/logos-docs` is the documentation repository for the [Logos](https://logos.co) stack. It hosts user journeys, quickstarts, and reference docs covering the Logos Blockchain node, the Logos Execution Zone (LEZ) wallet, AnonComms, the Logos App POC, and related modules.

This guide is for anyone who wants to fix, improve, or add to those docs.

## Who can contribute

Contributions from outside the Logos Docs team are welcome. You do not need to be a Logos employee or contractor to open an issue or a pull request. If something is wrong, missing, or unclear, please flag it (or fix it).

If you are unsure whether a change is wanted, open an issue first using the [Doc fix or request](.github/ISSUE_TEMPLATE/doc-fix-or-request.yml) template and we will reply.

## File names and location rules

The repository follows a small number of conventions derived from the existing tree. Please match them when adding new files.

- **Journey docs live under `docs/<area>/journeys/`.** Areas currently in use are `blockchain`, `messaging`, `connect/anoncomms`, `core`, `apps/wallet`, and `apps/sample-apps`. A few short quickstarts (e.g. `docs/blockchain/quickstart-guide-for-the-logos-blockchain-node.md`) sit one level higher; new long-form journeys should go under `journeys/`.
- **Filenames are kebab-case, lowercased, and descriptive of the journey.** Use the form `verb-the-thing-with-the-thing.md`, e.g. `transfer-native-tokens-on-the-logos-execution-zone.md`. No leading numbers, no spaces, no uppercase.
- **Each area has a `docs/<area>/README.md`.** Most are currently empty. Do not assume these are load-bearing; the keep/populate/delete decision is tracked separately. If your change adds a new area, add an empty `README.md` so the structure stays consistent.
- **Co-located assets live next to the doc.** Put screenshots, diagrams, and other binary assets in a folder named after the journey slug, e.g. `docs/blockchain/quickstart-guide-for-the-logos-blockchain-node/`. Reference them with relative links from the doc.
- **Shared assets** (used by more than one doc) go under `docs/_shared/images/`.

## Pull request conventions

- **Keep PRs small and focused.** One journey or one fix per PR. Reviewers can land a small PR in a day; a sprawling one tends to sit.
- **Title format follows conventional commits:** `docs(area): short imperative summary`. Examples from the log: `docs: update releases link to use /latest`, `fix: actualize lez related scripts`. Use `docs(blockchain): ...`, `docs(wallet): ...`, etc. when the change is scoped to one area.
- **In the PR description, say what you ran or rendered to verify the change.** Anchor links and code fences are easy to break in review-only edits, so reviewers value an explicit "I ran the commands in section X on platform Y" line.
- **For new journeys, state the platform(s) you tested on.** The Logos stack has hit ARM-on-Pi compatibility issues in the past; reviewers value an explicit `tested on linux/aarch64` or `x86_64 only` line in the PR body.

## Branch policy and commit messages

- Branch from `main`. Open the PR back into `main`.
- Commit messages follow conventional commits: `docs(area): short imperative summary` for doc changes, `fix(area): ...` for fixes to existing content, `chore: ...` for tooling.
- One logical change per commit where possible. Squash on merge is fine.

## Proposing a new journey doc

1. Open an issue using the [Doc fix or request](.github/ISSUE_TEMPLATE/doc-fix-or-request.yml) template, selecting **Request a new document**. Describe the journey you want documented, who it is for, and what success looks like.
2. If you have already drafted the doc, you can skip straight to a draft PR. Link the issue from the PR description so the conversation stays in one place.
3. Place the file under `docs/<area>/journeys/` following the naming rules above.

## Flagging a stub doc or broken flow without fixing it

If you hit a doc that does not work and you do not have time to fix it yourself, please still tell us. Open an issue using the [Doc fix or request](.github/ISSUE_TEMPLATE/doc-fix-or-request.yml) template and include:

- Which doc and which step.
- The exact command or action you ran.
- What you expected and what actually happened (paste the error if there is one).
- Your platform: OS, architecture, and any relevant runtime versions (e.g. `linux/aarch64`, Nix 2.21, Node 20).

That is enough for a maintainer to reproduce or to redirect the issue.

## Tooling

This is a documentation repository, so changes are mostly Markdown. There is no required local build step today; if lint or link-check tooling is added later it will be wired into a `Makefile` or `package.json` and called out in `.github/copilot-instructions.md`.

If you are adding code blocks or screenshots, please follow the patterns already in the tree (GitHub-flavored Markdown, `> [!NOTE]` admonitions, fenced code blocks with a language tag).

## Who to ask

> [!NOTE]
> **TODO for a maintainer:** please fill in the canonical contact channel for the Logos Docs team here (Discord channel, Slack channel, or email). The contributor guide should not invent one.

In the meantime, opening an issue in this repository is the most reliable way to reach the team.
