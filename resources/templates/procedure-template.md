# Tutorial template: logos-docs sectioned layout

This template is calibrated against the **live** rendered site at [docs.logos.co](https://docs.logos.co)
(Docusaurus v3), not just the [logos-co/logos-docs](https://github.com/logos-co/logos-docs) repo
listing — some pages in the repo are mid-migration and use older GitBook-style syntax that no
longer matches what's actually published. Give this whole file to an AI model together with
source tutorial text in any format (a blog post, a README, a transcript, loose notes, etc.) and
ask it to rewrite that text as a tutorial matching this structure.

Reference pages this was built from: *Run a Logos storage node*, *Send 1:1 messages with the
Logos Chat app*, *Install Logos Basecamp*, *Build and run a Logos core module*.

---
title:
doc_type: # tutorial | procedure
product: # [blockchain | storage | messaging | mixnet | peer-discovery | core | basecamp | lez]
topics: []
steps_layout: sectioned
authors: # GitHub username
owner: logos
doc_version: # increased by one after every update
slug:
---

## Template overview

| Section                 | Format                                     | Required  | ID                 |
|:------------------------|:--------------------------------------------|:----------|:-------------------|
| Title                   | H1                                          | Yes       | `TUT-TITLE`        |
| Subtitle                | H4 (single sentence)                        | Yes       | `TUT-SUBTITLE`     |
| Permissions/Product callout | Admonition                              | No        | `TUT-ACCESS`       |
| Version callout          | Admonition (`:::tip[Version]`)              | Yes       | `TUT-VERSION`      |
| Admonitions             | `:::type ... :::` (note/tip/info/warning/danger) | No   | `TUT-ADMON`        |
| Intro                   | Paragraph(s)                                | Yes       | `TUT-INTRO`        |
| Prerequisites           | Titled admonition (`:::info[Prerequisites]`) + list | No | `TUT-PREREQ`       |
| "What to expect"        | H2 `What to expect` + 3-item list           | Yes       | `TUT-EXPECT`       |
| Step title              | H2 `Step {n}: …`                            | Yes       | `TUT-STEP-TITLE`   |
| Step intro               | Paragraph                                   | No        | `TUT-STEP-INTRO`   |
| Step admonitions          | `:::type ... :::`                          | No        | `TUT-STEP-ADMON`   |
| Step options (branches)   | H3 `Option A — …` / `Option B — …`         | No        | `TUT-STEP-OPTIONS` |
| Step actions               | Numbered list (1)                          | Yes       | `TUT-STEP-ACTIONS` |
| Action clarifiers          | Bullets under an action, depth 1 (2)       | No        | `TUT-STEP-CLAR`    |
| Action code                 | Fenced code block under the action (3)    | No        | `TUT-STEP-CODE`    |
| Action screenshot            | Image under the action (3)                | No        | `TUT-STEP-IMG`     |
| Action expected result        | Bolded "Expected result:" lead-in (3)   | No        | `TUT-STEP-RESULT`  |
| Reference table                | Markdown table under a step (4)         | No        | `TUT-STEP-TABLE`   |
| Troubleshooting          | H2 `Troubleshooting` or `Troubleshooting {topic}` + H3 issues | No | `TUT-TROUBLESHOOT` |
| Extra guidelines         |                                             | Yes       | `TUT-EXTRA`        |
| Forbidden content        |                                             | Forbidden | `TUT-FORBID`       |

(1) Use a numbered list for actions completed in sequence within one run of the tutorial. This is the default; almost every tutorial in the repo uses it.
(2) Use a short bullet list for clarifiers, alternative flags, or "what this does" asides. Do not create numbered sub-actions.
(3) Nest code blocks, screenshots, and result lines inside the list item they belong to (indent so they are children of the preceding action).
(4) Use a reference table when a step introduces a config file, request payload, or set of fields the reader needs to look up (e.g. explaining each key in a `config.json`).

## Title <!-- group: TUT-TITLE -->

- Use a Markdown H1 heading. <!-- TUT-STRUCT-TITLE-H1 -->
- Start with an imperative verb or a clear task/outcome phrase (e.g. "Run a Logos storage node", "Send 1:1 messages with the Logos Chat app"). <!-- TUT-BEHAV-TITLE-IMPERATIVE -->
- Capitalize only the first word and any proper nouns (sentence-style capitalization). <!-- TUT-BEHAV-TITLE-SENTENCE-CASE -->
- Name the concrete thing the reader ends up with or does, not the underlying mechanics. <!-- TUT-BEHAV-TITLE-OUTCOME-FOCUSED -->
	- Examples: <!-- EXAMPLE: TUT-BEHAV-TITLE-OUTCOME-FOCUSED -->
		- Use: "Run a Logos storage node"
		- Avoid: "Understanding the storage module lifecycle"
- Include enough of the object/context that the goal is unambiguous out of context (module, app, or artifact involved). <!-- TUT-BEHAV-TITLE-ACTION-OBJECT -->
- Avoid empty verbs like *use*, *work with*, or *explore* when a more specific verb exists (*run*, *build*, *send*, *install*, *connect*). <!-- TUT-BEHAV-TITLE-NO-EMPTY-VERBS -->
- Don't use punctuation marks such as colons, semicolons, or dashes in the title itself (a colon inside a proper noun like "1:1" is fine). <!-- TUT-BEHAV-TITLE-NO-PUNCT -->

Examples from the repo:

| Usage   | Example                                              |
|:--------|:------------------------------------------------------|
| **Use** | Run a Logos storage node                              |
| Avoid   | Understanding the storage node lifecycle               |
| **Use** | Send 1:1 messages with the Logos Chat app               |
| Avoid   | Messaging overview                                       |
| **Use** | Install Logos Basecamp                                    |
| Avoid   | Getting Basecamp set up                                    |

## Subtitle <!-- group: TUT-SUBTITLE -->

- Use a Markdown H4 immediately under the H1 (the site renders it as a single description line under the title). <!-- TUT-STRUCT-SUBTITLE-H4 -->
- One sentence only; no links, lists, or inline formatting. <!-- TUT-BEHAV-SUBTITLE-SINGLE-SENTENCE -->
- Ends with a period. <!-- TUT-BEHAV-SUBTITLE-END-PERIOD -->
- State what the reader will do or try, in terms concrete enough to double as the page's meta description. <!-- TUT-BEHAV-SUBTITLE-DESCRIPTIVE -->
- Don't repeat or lightly rephrase the H1; add the outcome or verb chain the title didn't have room for. <!-- TUT-BEHAV-SUBTITLE-ADDS-VALUE -->

Examples from the repo:

- **Title**: *Run a Logos storage node* / **Subtitle**: *Get started running a Logos storage node and uploading your first file to the Logos network.*
- **Title**: *Send 1:1 messages with the Logos Chat app* / **Subtitle**: *Try out end-to-end encrypted private messaging over the Logos network.*
- **Title**: *Install Logos Basecamp* / **Subtitle**: *Get Logos Basecamp running on your desktop.*

## Permissions/Product callout (optional) <!-- group: TUT-ACCESS -->

An admonition, used only to tell the reader what access level or product/edition they need before they start — not a general-purpose note.

- Omit entirely if there's nothing to state (no special permissions, single product). <!-- TUT-STRUCT-ACCESS-OMIT-IF-EMPTY -->
- Place it right after the subtitle, before the intro. <!-- TUT-STRUCT-ACCESS-POSITION -->
- Use label-led, scannable lines: `**Permissions**: …` and `**Product**: …`. <!-- TUT-BEHAV-ACCESS-LABELED -->
- If no special permissions are required, say so explicitly rather than omitting the line. <!-- TUT-BEHAV-ACCESS-EXPLICIT-NONE -->
- Don't include prerequisites (tools, OS, disk space) here — those belong in [Prerequisites](#prerequisites-optional). <!-- TUT-BEHAV-ACCESS-SCOPE-ONLY -->

Example (from *Install Logos Basecamp*):

```
:::info
**Permissions**: No special permissions required.

**Product**: Logos Basecamp.
:::
```

## Version callout <!-- group: TUT-VERSION -->

An admonition used only to pin the tutorial to the software version(s) it was verified against — not a general-purpose note.

- Required on every tutorial, even stable/versionless tooling — state the version verified against regardless, so readers always know what the steps were tested on. <!-- TUT-STRUCT-VERSION-REQUIRED -->
- Place it right after the subtitle (after the Permissions/Product callout, if present) and before the intro. <!-- TUT-STRUCT-VERSION-POSITION -->
- Use the `:::tip[Version]` admonition with the exact title `Version`. <!-- TUT-BEHAV-VERSION-ADMONITION-TITLE -->
- State accuracy as a single sentence naming the network/release, bolding the version identifier, e.g. "This document is accurate for **Testnet v0.2.1**." <!-- TUT-BEHAV-VERSION-SENTENCE -->
- Don't restate prerequisites, install links, or compatibility caveats here — keep it to the version statement only. <!-- TUT-BEHAV-VERSION-SCOPE-ONLY -->

Example (from *Run a Logos Blockchain node on the public testnet from the CLI*):

```
:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::
```

## Admonitions <!-- group: TUT-ADMON -->

The live site renders Docusaurus admonitions. Write them with triple-colon fences, not
blockquotes and not GitBook `{% hint %}` tags:

```
:::info
Content goes here. Can span multiple sentences or short paragraphs.
:::
```

- Valid types: `note` (a small aside), `tip` (a shortcut or best practice), `info` (neutral context or a definition), `warning` (something that can break the tutorial or has a real cost if skipped), `danger` (destructive or security-sensitive action). <!-- TUT-BEHAV-ADMON-TYPES -->
- Optionally give an admonition a custom title with `:::type[Title]` (used for the [Prerequisites](#prerequisites-optional) block, for example). <!-- TUT-BEHAV-ADMON-CUSTOM-TITLE -->
- Use admonitions sparingly; don't place two consecutively. <!-- TUT-STRUCT-ADMON-NOT-CONSECUTIVE -->
- An admonition can hold multiple sentences or paragraphs, a list, or a fenced code block when the content genuinely belongs with the surrounding context — there's no fixed sentence or content-type limit. <!-- TUT-BEHAV-ADMON-CONTENT-FLEXIBLE -->
- An admonition can be nested inside a step's numbered list item (indent it as a child of that item) or placed at the top level between an intro and its first step. <!-- TUT-STRUCT-ADMON-PLACEMENT -->
- Don't put procedural steps inside an admonition; it adds context to the surrounding step, it doesn't replace it. <!-- TUT-BEHAV-ADMON-NO-STEPS -->

Example:

```
:::warning
Registry packages currently ship portable variants only. To use a registry module with a dev
build, build the module from source and bundle it with `#dual`.
:::
```

## Intro <!-- group: TUT-INTRO -->

- Place directly under the subtitle (and the Permissions/Product callout, if present), with no heading of its own. <!-- TUT-STRUCT-INTRO-NO-HEADING -->
- Write one to three short paragraphs covering: what the tutorial has the reader build, run, or try, why/when they'd want it, and who it's for. <!-- TUT-BEHAV-INTRO-CONTENT -->
- Name the concrete artifacts involved (module/app names, binaries, network, file formats, related SDKs) so the scope is unambiguous. <!-- TUT-BEHAV-INTRO-CONCRETE -->
- State the purpose plainly, e.g. "Use this procedure to verify the setup works or to explore X for development purposes." <!-- TUT-BEHAV-INTRO-PURPOSE -->
- A short, plain-prose caveat about session/data persistence or scope (no admonition styling needed) can follow the intro if it changes how the reader should interpret their results. <!-- TUT-BEHAV-INTRO-PLAIN-CAVEAT -->
	- Example: <!-- EXAMPLE: TUT-BEHAV-INTRO-PLAIN-CAVEAT -->
		- "Identity, conversations, and message history exist only while the app is running. Restarting an instance gives it a new identity and clears all conversations."

Example (from the repo):

> This procedure shows how to use the Logos Chat app to exchange encrypted 1:1 messages between
> two running instances. It demonstrates the basic private-messaging capabilities of the Logos
> Chat Module: ephemeral identity, intro-bundle handshake, and encrypted messaging with no
> central server. Use this procedure to verify the setup works or to explore the messaging flow
> for development purposes.

## Prerequisites (optional) <!-- group: TUT-PREREQ -->

Use a titled admonition — this is the only accepted pattern:

```
:::info[Prerequisites]
- A supported OS:
  - Linux
  - macOS
- Network access
- For the local build only: **Nix** with flakes enabled.
:::
```

- Place it directly after the intro and before "What to expect". <!-- TUT-STRUCT-PREREQ-POSITION -->
- Always use the [admonition](#admonitions) syntax with the custom title `[Prerequisites]`; don't introduce the list with a plain lead-in sentence instead. <!-- TUT-STRUCT-PREREQ-ADMONITION-ONLY -->
- Use a single bullet list of concrete items: OS/platform, disk space, installed tools (link to install instructions), language/framework familiarity, and any network access needed. <!-- TUT-BEHAV-PREREQ-SCOPE -->
- Where a prerequisite requires a command to install or verify, nest a fenced code block under that bullet. <!-- TUT-STRUCT-PREREQ-NESTED-CODE -->
- Omit this section entirely if the tutorial has no setup beyond what "What to expect" already implies. <!-- TUT-STRUCT-PREREQ-OMIT-IF-EMPTY -->
- Don't include roles or permissions here; those belong in the [Permissions/Product callout](#permissionsproduct-callout-optional). <!-- TUT-BEHAV-PREREQ-NO-ROLES -->

## "What to expect" <!-- group: TUT-EXPECT -->

- Use a Markdown H2 with the exact text "What to expect". <!-- TUT-STRUCT-EXPECT-H2-TEXT -->
- Place it after the intro/prerequisites and before the first step. <!-- TUT-STRUCT-EXPECT-POSITION -->
- Include exactly one unordered list with three items (no code blocks or admonitions here). <!-- TUT-STRUCT-EXPECT-UL-THREE -->
- Each bullet is one complete sentence starting with "You can …", ending with a period. <!-- TUT-BEHAV-EXPECT-SENTENCE -->
- Use parallel wording across the three bullets, ordered from the outcome the reader most cares about to the least. <!-- TUT-BEHAV-EXPECT-PARALLEL-PRIORITY -->
- These bullets should map to the tutorial's steps at a glance — a reader who only reads this list should know what they'll walk away able to do. <!-- TUT-BEHAV-EXPECT-MAPS-TO-STEPS -->

Example (from *Send 1:1 messages with the Logos Chat app*):

```
## What to expect

- You can run the Logos Chat app without building from source by installing it through Logos Basecamp.
- You can exchange encrypted messages between two instances in real time after completing the intro-bundle handshake.
- You can verify delivery by confirming each message appears on the receiving instance within a few seconds.
```

## Step

Every tutorial has one or more steps. Each step includes these mandatory and optional parts:

- [Step title](#step-title)
- [Step intro (optional)](#step-intro-optional)
- [Step admonitions (optional)](#step-admonitions-optional)
- [Step options / branches (optional)](#step-options--branches-optional)
- [Step actions](#step-actions)
- [Action clarifiers (optional)](#action-clarifiers-optional)
- [Action code (optional)](#action-code-optional)
- [Action screenshot (optional)](#action-screenshot-optional)
- [Action expected result (optional)](#action-expected-result-optional)
- [Reference table (optional)](#reference-table-optional)

### Step title <!-- group: TUT-STEP-TITLE -->

- Use a Markdown H2 heading. <!-- TUT-STRUCT-STEP-H2 -->
- Prefix it with "Step {n}: " and number sequentially starting at 1; this is the dominant pattern in the repo. <!-- TUT-STRUCT-STEP-NUMBERING -->
	- A short tutorial with only one broad phase may instead use a single plain, descriptive H2 without a "Step" prefix — but be consistent within one document. <!-- TUT-BEHAV-STEP-TITLE-CONSISTENCY -->
- After the "Step {n}: " prefix, use an imperative verb phrase describing the step's outcome (e.g. "Exchange intro bundles", "Send and receive messages"). <!-- TUT-BEHAV-STEP-TITLE-IMPERATIVE -->
- Use sentence case; capitalize only the first word and proper nouns. <!-- TUT-BEHAV-STEP-TITLE-SENTENCE-CASE -->
- Avoid empty verbs (make, manage, put, use) when a more specific verb is available. <!-- TUT-BEHAV-STEP-TITLE-NO-EMPTY-VERBS -->
- Don't use punctuation beyond the required "Step {n}:" colon. <!-- TUT-BEHAV-STEP-TITLE-NO-PUNCT -->

### Step intro (optional) <!-- group: TUT-STEP-INTRO -->

- Write 1–2 short sentences of context: why this step exists, what it requires, or how many parallel things the reader needs running (e.g. "You need two running instances to complete this procedure."). <!-- TUT-BEHAV-STEP-INTRO-BRIEF -->
- Don't repeat the step title wording. <!-- TUT-BEHAV-STEP-INTRO-NO-REPEAT -->
- If actions in this step are asynchronous or the mental model differs from a simple linear list, explain that here before the numbered list starts. <!-- TUT-BEHAV-STEP-INTRO-MODEL -->

### Step admonitions (optional) <!-- group: TUT-STEP-ADMON -->

- Use the [admonition](#admonitions) syntax. <!-- TUT-STRUCT-STEP-ADMON-SYNTAX -->
- Place a step-level admonition after the step intro and before the numbered list/options, or nested under a specific action if it only applies there. <!-- TUT-STRUCT-STEP-ADMON-PLACEMENT -->
- One top-level admonition maximum per step; context that only applies to one action goes nested under that action instead. <!-- TUT-STRUCT-STEP-ADMON-ONE -->

### Step options / branches (optional) <!-- group: TUT-STEP-OPTIONS -->

Use when a step can be completed in more than one way and the reader only needs to pick one (e.g. running an app through a GUI vs. building it from source).

- Use H3 headings of the form "Option A — {short label}", "Option B — {short label}", nested directly under the step's H2. <!-- TUT-STRUCT-OPTIONS-H3-LABEL -->
- Each option gets its own self-contained numbered action list; don't make option B depend on steps only found in option A. <!-- TUT-BEHAV-OPTIONS-SELF-CONTAINED -->
- State once, before the options, what the reader is choosing between and that they only need one. <!-- TUT-BEHAV-OPTIONS-FRAME-CHOICE -->
- Keep the options roughly parallel in depth; if one path is far longer, consider linking out to a dedicated page for it instead. <!-- TUT-BEHAV-OPTIONS-PARALLEL-DEPTH -->

Example (from *Send 1:1 messages with the Logos Chat app*):

```
## Step 1: Run the Logos Chat app

You need two running instances to complete this procedure. Each instance can use either of the
options below independently.

### Option A — Run in Logos Basecamp

1. Download and install the latest release of Logos Basecamp.
2. ...

### Option B — Build and run locally with Nix

1. Clone the repository and check out the target release:

   ```bash
   git clone https://github.com/logos-co/logos-chatsdk-ui
   cd logos-chatsdk-ui
   ```
```

### Step actions <!-- group: TUT-STEP-ACTIONS -->

- Use a numbered list (`1.` for every item) for the actions that make up the step (or each option within it). <!-- TUT-STRUCT-STEP-ACTIONS-OL-ONE -->
- Start each action with an imperative verb. <!-- TUT-BEHAV-STEP-ACTIONS-IMPERATIVE -->
- One action = one command or one user action; group only trivial sub-actions together. <!-- TUT-BEHAV-STEP-ACTIONS-ONE-ACTION -->
- Aim for 1–7 actions per step; split into another step if longer. <!-- TUT-BEHAV-STEP-ACTIONS-COUNT -->
- Use inline code for commands, filenames, flags, paths, and literal output. <!-- TUT-BEHAV-STEP-ACTIONS-CODE-INLINE -->
- Bold UI elements (buttons, menus, fields) when the action is performed in a GUI, e.g. "In the left bar, select **Package Manager**." <!-- TUT-BEHAV-STEP-ACTIONS-UI-BOLD -->
- When two or more parties/instances/machines are involved, use bold labels to keep the reader oriented, e.g. "**On instance A:**" / "**On instance B:**" as a lead-in before that party's own numbered list. <!-- TUT-BEHAV-STEP-ACTIONS-MULTI-PARTY-LABELS -->
- When an action produces a file, UI state, or output the reader should recognize, say so in the same sentence or in a nested clarifier/screenshot/result — don't leave the reader to guess whether it worked. <!-- TUT-BEHAV-STEP-ACTIONS-CONFIRM -->
- Cross-reference other pages inline with a link rather than telling the reader to "go read X first". <!-- TUT-BEHAV-STEP-ACTIONS-LINKS-INLINE -->

### Action clarifiers (optional) <!-- group: TUT-STEP-CLAR -->

- Use a bullet list nested under the action for sub-flags, alternatives, or "why this matters" asides. <!-- TUT-STRUCT-CLAR-BULLETS -->
- Don't create numbered sub-actions under an action. <!-- TUT-STRUCT-CLAR-NO-ORDERED -->
- Keep clarifiers short — a phrase or one sentence per bullet. <!-- TUT-BEHAV-CLAR-BRIEF -->

### Action code (optional) <!-- group: TUT-STEP-CODE -->

- Nest a fenced code block under the action it belongs to (indent so it's a child of that list item). <!-- TUT-STRUCT-CODE-NESTING -->
- Always set the language on the fence (`bash`, `json`, `cpp`, `sh`, etc.). <!-- TUT-BEHAV-CODE-LANGUAGE-TAG -->
- Prefer one command (or one short related group of commands) per block over one giant block covering the whole step. <!-- TUT-BEHAV-CODE-GRANULARITY -->
- Use placeholder tokens in angle brackets for values the reader must supply (e.g. `<module-name>`), and state what to replace them with the first time a placeholder appears. <!-- TUT-BEHAV-CODE-PLACEHOLDERS -->

### Action screenshot (optional) <!-- group: TUT-STEP-IMG -->

- Nest an image directly under the action it illustrates, as its own line (indented as a child of the list item). <!-- TUT-STRUCT-IMG-NESTING -->
- Use short, descriptive alt text naming the app and what's shown, e.g. `![Logos Basecamp package installation screenshot](...)`. <!-- TUT-BEHAV-IMG-ALT-TEXT -->
- Use a screenshot where the reader needs to recognize a specific UI state (a button, a panel, a label) to know they're on track — not decoratively. <!-- TUT-BEHAV-IMG-PURPOSEFUL -->

### Action expected result (optional) <!-- group: TUT-STEP-RESULT -->

- When an action's success isn't obvious from the command or click alone, add a bolded "Expected result:" lead-in nested under that action, describing what the reader should see. <!-- TUT-BEHAV-RESULT-BOLD-LEAD-IN -->
	- Example: <!-- EXAMPLE: TUT-BEHAV-RESULT-BOLD-LEAD-IN -->
		- "**Expected result:** the exact message text appears as an incoming (left-aligned) bubble in B's chat panel within a few seconds."
- Alternatively, for CLI output, show the expected output as a nested fenced block (no language, or `text`) trimmed to the lines that matter. <!-- TUT-BEHAV-RESULT-SHOW-EXPECTED-CLI -->

### Reference table (optional) <!-- group: TUT-STEP-TABLE -->

- Use a Markdown table nested under the action (or directly under the step) when introducing a config file, request/response payload, or CLI flags the reader needs to look up rather than read linearly. <!-- TUT-STRUCT-TABLE-USE-CASE -->
- Columns should fit the content — typically field/flag name and a one-line description; add a default or required column only if genuinely useful. <!-- TUT-BEHAV-TABLE-COLUMNS -->
- Don't duplicate in prose what the table already states. <!-- TUT-BEHAV-TABLE-NO-DUPLICATE -->

## Troubleshooting (optional) <!-- group: TUT-TROUBLESHOOT -->

- Use an H2 heading: either the bare word "Troubleshooting", or "Troubleshooting {app/module name}" when the tutorial is scoped to one app (e.g. "Troubleshooting Logos Chat"). <!-- TUT-STRUCT-TROUBLESHOOT-H2 -->
- Place it after the final step. <!-- TUT-STRUCT-TROUBLESHOOT-POSITION -->
- Use H3 subheadings for each issue, written as a short declarative description of the symptom, including a quoted UI message where relevant (e.g. `Messages never arrive and the left panel shows "Waiting for connection…"`) — question form is not required. <!-- TUT-BEHAV-TROUBLESHOOT-H3-SYMPTOM -->
- Under each H3, explain the cause briefly and give the fix; use inline code for commands, flags, and file names, and a fenced code block if a command is needed. <!-- TUT-BEHAV-TROUBLESHOOT-CAUSE-FIX -->
- A "Known constraints" subsection (architectural limitations that aren't really bugs) is allowed alongside true troubleshooting entries. <!-- TUT-BEHAV-TROUBLESHOOT-KNOWN-CONSTRAINTS -->
- For longer or recurring issues, link out to a dedicated troubleshooting/FAQ page instead of growing this section indefinitely. <!-- TUT-BEHAV-TROUBLESHOOT-SPLIT-IF-LONG -->

## Extra guidelines <!-- group: TUT-EXTRA -->

- This section is guidance only; do not render a visible heading or body. <!-- TUT-STRUCT-EXTRA-GUIDELINES-NO-RENDER -->
- Use the Logos-first product names in body text (Logos Blockchain, Logos Storage, Logos Messaging, Logos Execution Zone/LEZ), not the legacy internal names (Nomos, Codex, Waku, Nescience), unless quoting a repository or binary name that still uses the legacy name. <!-- TUT-BEHAV-EXTRA-NAMING -->
- Link glossary terms on first use with `[Term](https://docs.logos.co/get-started/glossary#term)` (module, module names, CID, out-of-band, channel, etc.) rather than re-explaining them inline. <!-- TUT-BEHAV-EXTRA-GLOSSARY-LINKS -->
- Every command the reader is asked to run should be one they can copy-paste verbatim (after substituting any placeholders) and expect to work from a clean environment matching the prerequisites. <!-- TUT-BEHAV-EXTRA-RUNNABLE -->
- Write for a reader following along step by step in a terminal or UI, not skimming for concepts — favor the imperative, concrete instruction over an explanatory aside; move deeper "why" explanations to a linked concept page if they'd interrupt the flow. <!-- TUT-BEHAV-EXTRA-PROCEDURAL-VOICE -->

## Forbidden content <!-- group: TUT-FORBID -->

- This section is guidance only; do not render a visible heading or body. <!-- TUT-STRUCT-FORBID-GUIDELINES-NO-RENDER -->
- Do not use H5 or H6 headings. <!-- TUT-STRUCT-FORBID-H5-H6 -->
- Do not use blockquote-style callouts (`> **Note**`) or GitBook `{% hint %}` tags; use Docusaurus `:::type ... :::` admonitions instead. <!-- TUT-BEHAV-FORBID-NO-BLOCKQUOTE-OR-GITBOOK-CALLOUTS -->
- Do not include a "Further reading" section or a list of related links at the end of the document. <!-- TUT-BEHAV-FORBID-NO-FURTHER-READING -->
- Do not impose an overall word- or character-count limit on the tutorial as a whole — length should be whatever the number of steps and necessary detail requires. <!-- TUT-BEHAV-FORBID-NO-DOC-LENGTH-LIMIT -->
