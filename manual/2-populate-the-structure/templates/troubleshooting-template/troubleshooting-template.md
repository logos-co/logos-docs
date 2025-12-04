| Section              | Format                          | Required  | ID                          |
|:---------------------|:--------------------------------|:----------|:----------------------------|
| Title                | H1                              | Yes       | `TS-TITLE`                  |
| Subtitle             | H4                              | Yes       | `TS-SUBTITLE`               |
| Callouts             | Tip, Note, Important, Caution   | No        | `TS-CALLOUTS`               |
| Overview             | Paragraph                       | Yes       | `TS-OVERVIEW`               |
| Issue title          | H2                              | No        | `TS-ISSUE-TITLE`            |
| Symptom              | Paragraph                       | Yes       | `TS-SYMPTOM`                |
| Cause                | Paragraph                       | Yes       | `TS-CAUSE`                  |
| Issue code           | Fenced code block (1)           | No        | `TS-ISSUE-CODE`             |
| Issue screenshot     | Image (1)                       | No        | `TS-ISSUE-IMG`              |
| Solution title       | H2                              | Yes       | `TS-SOLUTION-TITLE`         |
| Overview             | Paragraph                       | Yes       | `TS-SOLUTION-OVERVIEW`      |
| Decisions            | Paragraph, list, table          | No        | `TS-SOLUTION-DECISIONS`     |
| Limits               | Paragraph, list, table          | No        | `TS-SOLUTION-LIMITS`        |
| Prerequisites        | Paragraph, list                 | No        | `TS-SOLUTION-PREREQ`        |
| Solution steps       | Numbered list (2)               | No        | `TS-SOLUTION-STEP`          |
| Step clarifiers      | Unordered bullets (depth 1) (3) | No        | `TS-SOLUTION-CLAR`          |
| Step code            | Fenced code block (1)           | No        | `TS-STEP-CODE`              |
| Step screenshot      | Image (1)                       | No        | `TS-STEP-IMG`               |
| "Best practices"     | Bullet list                     | No        | `TS-BEST`                   |
| Extra guidelines     |                                 | Yes       | `TS-EXTRA`                  |
| Forbidden content    |                                 | Forbidden | `TS-FORBID`                 |

(1) Nest code and images inside the list item they clarify (indent so they are children of the preceding step).
(2) Use checkboxes only for unordered or long-running tasks. Numbered lists are the default for procedures.  
(3) Use a short bullet list for clarifiers or alternatives. Do not create numbered sub-steps.  

## Front matter
---
title:
doc_type: troubleshooting
product: # [storage, blockchain, messaging]
topics: []
authors: # GitHub username
owner: logos
doc_version: # increased by one after every update
slug:
---

## Title <!-- group: TS-TITLE -->

- Use a Markdown H1 heading. <!-- TS-STRUCT-TITLE-H1 -->
- The title consists of the word "Troubleshooting" followed by a noun phrase describing the issue scope. (For example, "Troubleshooting your connection to the Logos blockchain").  <!-- TS-BEHAV-TITLE-IMPERATIVE  -->

## Subtitle <!-- group: TS-SUBTITLE -->

- Use a Markdown H4 for the subtitle placed right under the H1. <!-- TS-STRUCT-SUBTITLE-H4 -->
- Single sentence with no links, list items, or formatting. Ends with a period. <!-- TS-BEHAV-SUBTITLE-SINGLE-SENTENCE -->
- Do not end with a period. <!-- TS-BEHAV-SUBTITLE-NO-PERIOD -->
- Stay under 120 characters (approx. 20 words). <!-- TS-BEHAV-SUBTITLE-LENGTH-120 -->
- Use imperative verbs to describe the topic's purpose or benefit (for example: *Clarify*, *Resolve*, *Help*). <!-- TS-BEHAV-SUBTITLE-IMPERATIVE -->
- Adds new value beyond the title. It should not repeat the title or be a rephrased version of it. <!-- TS-BEHAV-SUBTITLE-ADDS-VALUE -->

Examples:

- *Resolve problems uploading files to the Logos storage.*
- *Learn the troubleshooting steps for common connection issues.*

## Callouts <!-- group: TS-CALLOUTS -->

- Use callouts sparingly in the document and only when necessary to avoid overwhelming the reader. <!-- TS-STRUCT-CALLOUTS-NOT-CONSECUTIVE -->
- One callout maximum per section <!-- TS-STRUCT-CALLOUTS-PER-SECTION-ONE -->
- Keep each callout concise (≤ 2 short sentences). If the content needs a list or multiple paragraphs, move it into the body under a heading. <!-- TS-BEHAV-CALLOUTS-CONCISE -->
- Ensure the callout content is directly relevant to the nearby task or decision point. <!-- TS-BEHAV-CALLOUTS-RELEVANT -->
- Use the appropriate type: `Tip`, `Note`, `Important`, or `Caution`. <!-- TS-BEHAVE-CALLOUTS-TYPE -->
- Do **not** include full procedural steps or long prerequisite checklists inside callouts. <!-- TS-BEHAV-CALLOUTS-NO-STEPS -->
- For the allowed callout types and when to use them, see the [writing rules](../../3-validating-design/writing-rules/README.md). <!-- TS-BEHAV-CALLOUTS-TYPES-REFER-STYLEGUIDE -->

## Overview <!-- group: TS-OVERVIEW -->

- This section is guidance only; do not render a visible heading or body. <!-- TS-STRUCT-OVERVIEW-NO-RENDER -->
- Write one paragraph of 50–100 words. <!-- TS-BEHAV-OVERVIEW-LENGTH -->
- Briefly describe what feature or task this troubleshooting topic covers, when users may encounter it, and the impact it has on their experience. <!-- TS-BEHAV-OVERVIEW-CONTENT -->
- Add context that the heading doesn't provide; do not restate the heading. <!-- TS-BEHAV-OVERVIEW-NO-REPEAT -->
- Use at most one short alert only if it prevents confusion; otherwise keep this section free of callouts. <!-- TS-BEHAV-OVERVIEW-ALERT-SPARING -->

## Issue title (optional) <!-- group: TS-ISSUE-TITLE -->

- Use titles when you describe multiple issues.  <!-- TS-STRUCT-ISSUE-TITLE-SITUATION -->
- Issue titles are Markdown H2 headings. <!-- TS-STRUCT-ISSUE-H2 -->
- Summarize the symptom or cause in the title depending on the [scope](README.md) of your content. <!-- TS-BEHAV-ISSUE-TITLE-CONTENT -->
- Issue titles are Markdown H2 headings. <!-- TS-STRUCT-ISSUE-TITLE-H2 -->
- Aim for 50–60 characters; 80 max. <!-- TS-BEHAV-ISSUE-TITLE-LENGTH -->
- Use sentence case (capitalize only the first word and proper nouns). <!-- TS-BEHAV-ISSUE-TITLE-SENTENCE-CASE -->
- Avoid one- or two-word titles. <!-- TS-BEHAV-ISSUE-TITLE-NO-ONE-TWO-WORD -->
- Don't use punctuation marks in titles (colons, semicolons, dashes). <!-- TS-BEHAV-ISSUE-TITLE-NO-PUNCT -->

Examples:

- Sumarize the symptom: *Codespace creation fails*, *Codespace does not open when created*
- Sumarize the cause: *Application suspended*, *Redirect URI mismatch*

## Symptom  <!-- group: TS-SYMPTOM -->

- Describe the signs users see when the problem happens and the impact on the user or system. <!-- TS-BEHAV-SYMPTOM-CONTENT -->
- Link to related documents or headings in the same document to support the reader's gathering of information. <!-- TS-BEHAV-SYMPTOM-LINK -->

## Cause <!-- group: TS-CAUSE -->

- Describe the cause of the issue. <!-- TS-BEHAV-CAUSE-CONTENT -->
- Explain if there are other side effects and risks (for example, data exposure, downtime, irreversible actions). <!-- TS-BEHAV-CAUSE-RISKS -->
- Link to related documents or headings in the same document to support the reader's gathering of information. <!-- TS-BEHAV-CAUSE-LINK -->

## Issue code (optional) <!-- group: TS-ISSUE-CODE -->

- Follow the code rules in the writing rules document. <!-- TS-BEHAV-ISSUE-CODE-REFER-WRITING-RULES -->

>Example:
>
> 	1. Do this thing...
>
>    ```bash
>    gh workflow run build --repo org/repo
>   ```

## Issue screenshot (optional) <!-- group: TS-ISSUE-IMG -->

- Follow the screenshots rules in the Writing Rules document. <!-- TS-BEHAV-ISSUE-IMG-REFER-WRITING-RULES -->

### Solution title <!-- group: TS-SOLUTION-TITLE -->

- Solution section titles are Markdown H2 headings. <!-- TS-STRUCT-SOLUTION-TITLE-H2 -->
- Aim for 50–60 characters; 80 max. <!-- TS-BEHAV-SOLUTION-TITLE-LENGTH-50-80 -->
- If there are multiple tasks in the solution, the first task title must be `Step 1:` + `task-name`. Subsequent task titles must increment by `Step` by 1. <!-- TS-STRUCT-SOLUTION-TITLE-ORDER-ASC -->
- Use an imperative verb for `task-name`; avoid the -ing form. <!-- TS-BEHAV-SOLUTION-TITLE-IMPERATIVE -->
- Use sentence case (capitalize only the first word and proper nouns). <!-- TS-BEHAV-SOLUTION-TITLE-SENTENCE-CASE -->
- Avoid empty verbs (make, manage, put). <!-- TS-BEHAV-SOLUTION-TITLE-NO-EMPTY-VERBS -->
- Avoid one- or two-word titles. <!-- TS-BEHAV-SOLUTION-TITLE-NO-ONE-TWO-WORD -->
- Don't use punctuation marks in titles (colons, semicolons, dashes). <!-- TS-BEHAV-SOLUTION-TITLE-NO-PUNCT -->

## Solution intro

Use the Overview section to expain whether there is a solution. If there is a solution to the issue, use the other sections to help readers understand the underlying mechanism of the fix. 

The introduction includes these sections, each one represented by a paragraph, list, or table:

- [Overview](#overview)
- [Decisions (optional)](#decisions-optional)
- [Limits (optional)](#limits-optional)
- [Prerequisites (optional)](#prerequisites-optional)

- This section is guidance only; do not render a visible heading or body. <!-- TS-STRUCT-SOLUTION-INTRO-GUIDELINES-NO-RENDER -->
- Include the intro components in this order: Overview, Decisions (optional), Limits (optional), Impact (optional), Prerequisites (optional). <!-- TS-STRUCT-SOLUTION-INTRO-ORDER -->
- The following child blocks render without their own headings: Overview, Decisions, Limits, Impact, Prerequisites. <!-- TS-STRUCT-SOLUTION-INTRO-CHILDREN-NO-HEADINGS -->

### Overview <!-- group: TS-SOLUTION-OVERVIEW -->

- Render inline under the Intro section; do not add a visible subheading. <!-- TS-STRUCT-SOLUTION-OVERVIEW-NO-HEADING -->
- Explain whether there is a solution or workaround to the issue. <!-- TS-BEHAV-SOLUTION-OVERVIEW-STATUS -->
- If there is, write 1-2 sentences explaining what the solution procedure covers. <!-- TS-BEHAV-SOLUTION-OVERVIEW-CONTENT -->
- State who the intended audience is. <!-- TS-BEHAV-SOLUTION-OVERVIEW-AUDIENCE-SCOPE -->
- Use at most one short alert only if it prevents confusion; otherwise keep this section free of callouts. <!-- TS-BEHAV-SOLUTION-OVERVIEW-ALERT-SPARING -->

### Decisions (optional) <!-- group: TS-SOLUTION-DECISIONS -->

- Render inline under the Intro section; do not add a visible subheading. <!-- TS-STRUCT-SOLUTION-DECISIONS-NO-HEADING -->
- Summarize decisions the reader must make **before** starting (for example, CLI vs. GUI). <!-- TS-BEHAV-SOLUTION-DECISIONS-PURPOSE -->
- Use a list for simple choices; use a compact table for multi-factor comparisons. <!-- TS-BEHAV-SOLUTION-DECISIONS-FORM -->
- Focus on actionable factors: performance, complexity, cost, prerequisites, and limitations. <!-- TS-BEHAV-SOLUTION-DECISIONS-FACTORS -->
- State trade-offs explicitly (for example, "A is faster but less secure"). <!-- TS-BEHAV-SOLUTION-DECISIONS-TRADEOFFS -->
- Give clear guidance (for example, "Choose A if you need X; choose B if you need Y"). <!-- TS-BEHAV-SOLUTION-DECISIONS-GUIDANCE -->

### Limits (optional) <!-- group: TS-SOLUTION-LIMITS -->

- Render inline under the Intro section; do not add a visible subheading. <!-- TS-STRUCT-SOLUTION-LIMITS-NO-HEADING -->
- Describe constraints as a short paragraph; use a list/table only if it improves scanning. <!-- TS-BEHAV-SOLUTION-LIMITS-FORMAT -->
- Cover quotas, rate limits, timeouts, eventual consistency, and destructive side effects. <!-- TS-BEHAV-SOLUTION-LIMITS-COVERAGE -->
- If a constraint is critical to success or safety, surface it with a single concise callout (see Callouts). <!-- TS-BEHAV-SOLUTION-LIMITS-ALERT-CRITICAL -->
- If useful, mention a workaround or mitigation strategy. <!-- TS-BEHAV-SOLUTION-LIMITS-MITIGATION -->

### Prerequisites (optional) <!-- group: TS-SOLUTION-PREREQ -->

- Render inline under the Intro section; do not add a visible subheading. <!-- TS-STRUCT-SOLUTION-PREREQ-NO-HEADING -->
- List only the technical setup needed to run the procedure (software, versions, tools, configuration). <!-- TS-BEHAV-SOLUTION-PREREQ-SCOPE -->
- Prefer a single bullet list of noun phrases; keep it brief and link to install/setup instructions as needed. <!-- TS-BEHAV-SOLUTION-PREREQ-LIST-NOUNS -->

## Solution steps (optional) <!-- group: TS-SOLUTION-STEP -->

- Use a numbered list when the procedure is completed in one go. <!-- TS-BEHAV-SOLUTION-STEP-ORDERED-ONEGO -->
- Use checkboxes when steps are unordered or spread over time. <!-- TS-BEHAV-SOLUTION-STEP-CHECKBOX-UNORDERED -->
- Start each step with an imperative verb; avoid -ing forms. <!-- TS-BEHAV-SOLUTION-STEP-IMPERATIVE -->
- One step = one user action (combine only trivial actions). <!-- TS-BEHAV-SOLUTION-STEP-ONE-ACTION -->
- Write ordered lists with `1.` for every item (1, 1, 1 …). <!-- TS-STRUCT-SOLUTION-STEP-OL-ONE -->
- Aim for 2–7 steps. Split if longer. <!-- TS-BEHAV-SOLUTION-STEP-COUNT-2-7 -->
- Avoid writing only one step. <!-- TS-BEHAV-SOLUTION-STEP-NO-ONE -->
- When adding paragraphs, images, or code under a step, insert a blank line and indent so they are children of that step. <!-- TS-STRUCT-SOLUTION-STEP-NESTING -->
- Bold UI elements (buttons, menus, options). <!-- TS-BEHAV-SOLUTION-STEP-UI-BOLD -->
- Use inline code for commands, filenames, paths, and output. <!-- TS-BEHAV-SOLUTION-STEP-CODE-INLINE -->
- Don't use external links in steps; only same-page anchors. <!-- TS-BEHAV-SOLUTION-STEP-LINKS-INTERNAL -->
- For UI paths, put location before action. <!-- TS-BEHAV-SOLUTION-STEP-LOCATION-FIRST -->
- For conditions, write the result first, then the condition. <!-- TS-BEHAV-SOLUTION-STEP-RESULT-THEN-CONDITION -->

### Step clarifiers (optional) <!-- group: TS-SOLUTION-CLAR -->

- Don't use numbered substeps beneath a step (nested ordered lists). <!-- TS-STRUCT-SOLUTION-CLAR-NO-ORDERED -->
- Use bullets for subactions, such as clarifiers or alternatives. <!-- TS-STRUCT-SOLUTION-CLAR-BULLETS -->
- Limit clarifiers to 2–4 items in one level. <!-- TS-BEHAV-SOLUTION-CLAR-COUNT-2-4 -->

### Step code (optional) <!-- group: TS-STEP-CODE -->

- Follow the code rules in the writing rules document. <!-- TS-BEHAV-STEP-CODE-REFER-WRITING-RULES -->

> Example:
>
>	1. Do this thing...
>
>	```bash
>	gh workflow run build --repo org/repo
>	```

### Step screenshot (optional) <!-- group: TS-STEP-IMG -->

- Follow the screenshots rules in the Writing Rules document. <!-- TS-BEHAV-STEP-IMG-REFER-WRITING-RULES -->

## Best practices (optional) <!-- group: TS-BEST -->

- Use a Markdown H2 with the exact text "Best practices". <!-- TS-STRUCT-BEST-H2-TEXT -->
- Include one unordered list. <!-- TS-STRUCT-BEST-LIST -->
- Write one complete sentence per bullet (two short sentences max), and end sentences with a period. <!-- TS-BEHAV-BEST-SENTENCE-1-2 -->
- Order items from most important to least important to avoid stated issues when using the feature or performing the task. <!-- TS-BEHAV-BEST-PRIORITY -->

## Extra guidelines <!-- group: TS-EXTRA -->

- This section is guidance only; do not render a visible heading or body. <!-- TS-STRUCT-EXTRA-NO-RENDER -->
- Keep the troubleshooting document word count under 3 000 words. <!-- TS-BEHAV-EXTRA-COUNT -->

## Forbidden content <!-- group: TS-FORBID -->

- Do not use H4-H6 headings. <!-- TS-FORBID-STRUCT-H4-H6 -->
