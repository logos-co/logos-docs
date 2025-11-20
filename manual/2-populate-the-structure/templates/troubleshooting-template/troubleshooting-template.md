| Section                       | Format                              | Required  | ID                               |
|:------------------------------|:------------------------------------|:----------|:---------------------------------|
| Title                         | H1                                  | Yes       | `TS-TITLE`                      |
| Subtitle                      | Single bold sentence                | Yes       | `TS-SUBTITLE`                   |
| Callouts                      | Tip, Note, Important, Caution       | No        | `TS-CALLOUTS`                   |
| Overview                      | Paragraph                           | Yes       | `TS-OVERVIEW`                   |
| "What to expect" title      | H2                                  | No        | `TS-STRUCT-BEFORE-START-H2-TEXT`|
| "What to expect" list       | Bullet list                         | No        | `TS-BEFORE-START`               |
| Cuase 1                    | H2                                  | Yes       | `TS-TASK-TITLE`                 |
| Task intro                    | Paragraph                           | No        | `TS-TASK-INTRO`                 |
| Task callout                  | Callout                             | No        | `TS-TASK-CALLOUTS`              |
| Task actions                  | Numbered list                       | Yes       | `TS-TASK-STEP`                  |
| Clarifiers                    | Unordered bullets (depth 1) (2)     | No        | `TS-TASK-CLARIFIERS`            |
| Code                          | Fenced code block                   | No        | `TS-TASK-CODE`                  |
| Screenshot                    | Image                               | No        | `TS-TASK-IMG`                   |
| H4-H6 headings                | -                                   | Forbidden | `TS-STRUCT-FORBID-H4-H6`        |
| "Next steps" title            | H2                                  | No        | `TS-STRUCT-NEXT-H2-TEXT`        |
| "Next steps" list             | Bullet list                         | No        | `TS-NEXT`                       |

## Front matter
---
title:
doc_type: # [procedure, concept, reference, quickstart, api]
product: # [storage, blockchain, messaging]
topics: []
authors: # GitHub username
owner: logos
doc_version: # increased by one after every update
slug:
---


- If a troubleshooting topic becomes too long (for example, more than 3000 words), consider splitting it into multiple topics based on different issues or causes. <!-- TS-BEHAV-TROUBLESHOOTING-SPLIT-LONG -->

## Title

- Use a Markdown H1 heading.
- The title consists of the word "Troubleshooting" followed by a noun phrase describing the issue scope. For example, "Troubleshooting your connection to the Logos blockchain".

## Subtitle

- Use a Markdown H4 for the subtitle placed right under the H1. <!-- TS-STRUCT-SUBTITLE-H4 -->
- Single sentence with no links, list items, or formatting. Ends with a period. <!-- -BEHAV-SUBTITLE-SINGLE-SENTENCE -->
- Do not end with a period. <!-- TS-BEHAV-SUBTITLE-NO-PERIOD -->
- Stay under 120 characters (approx. 20 words). <!-- TS-BEHAV-SUBTITLE-LENGTH-120 -->
- Use imperative verbs to describe the topic's purpose or benefit: *Help*, *Resolve* and so on. <!-- TS-BEHAV-SUBTITLE-IMPERATIVE -->
- Adds new value beyond the title. It should not repeat the title or be a rephrased version of it. <!-- TS-BEHAV-SUBTITLE-ADDS-VALUE -->

Examples:

- *Resolve problems uploading files to the Logos storage.*
- *Learn the troubleshooting steps for common connection issues.*

## Callouts <!-- TS-CALLOUTS -->

- Use callouts sparingly in the document and only when necessary to avoid overwhelming the reader. <!-- TS-STRUCT-CALLOUTS-NOT-CONSECUTIVE -->
- One callout maximum per section <!-- TS-STRUCT-CALLOUTS-PER-SECTION-ONE -->
- Keep each callout concise (≤ 2 short sentences). If the content needs a list or multiple paragraphs, move it into the body under a heading. <!-- TS-BEHAV-CALLOUTS-CONCISE -->
- Ensure the callout content is directly relevant to the nearby task or decision point. <!-- TS-BEHAV-CALLOUTS-RELEVANT -->
- Use the appropriate type: `Tip`, `Note`, `Important`, or `Caution`. <!-- TS-BEHAVE-CALLOUTS-TYPE -->
- Do **not** include full procedural steps or long prerequisite checklists inside callouts. <!-- PROC-BEHAV-CALLOUTS-NO-STEPS -->
- For the allowed callout types and when to use them, see the [writing rules](../../3-validating-design/writing-rules/README.md). <!-- PROC-BEHAV-CALLOUTS-TYPES-REFER-STYLEGUIDE -->

## Overview

- Write one 50–100 word paragraph.
- Briefly describe what feature or task this troubleshooting topic covers, when users may encounter it, and the impact it has on their experience.
- Add context that the heading doesn’t provide; do not restate the heading. <!-- PROC-BEHAV-OVERVIEW-NO-REPEAT -->

## Issue title

- Use titles when you describe multiple issues or causes.
- Error titles are Markdown H2 headings. <!-- TS-STRUCT-ERROR-TITLE-H2 -->
- Aim for 50–60 characters; 80 max. <!-- TS-BEHAV-ERROR-TITLE-LENGTH -->
- Summarize the error or cause. <!-- TS-BEHAV-ERROR-TITLE-SUMMARY -->
- Use sentence case (capitalize only the first word and proper nouns). <!-- TS-BEHAV-TASK-TITLE-SENTENCE-CASE -->
- Avoid one- or two-word titles. <!-- TS-BEHAV-TASK-TITLE-NO-ONE-TWO-WORD -->
- Don't use punctuation marks in titles (colons, semicolons, dashes). <!-- TS-BEHAV-TASK-TITLE-NO-PUNCT -->

Examples:

- Sumarize the issue: *Codespace creation fails*, *Codespace does not open when created*
- Sumarize the cause: *Application suspended*, *Redirect URI mismatch*

## Symptom

- Describe the signs users see when the problem happens. <!-- TS-BEHAV-OVERVIEW-CONTENT -->
- Link to related documents or headings in the same document to support the reader's gathering of information. <!-- TS-BEHAV-OVERVIEW-LINK -->

## Cause

- Describe the cause of the issue. <!-- TS-BEHAV-OVERVIEW-CONTENT -->
- Link to related documents or headings in the same document to support the reader's gathering of information. <!-- TS-BEHAV-OVERVIEW-LINK -->

## Code (optional) <!-- group: PROC-TASK-CODE -->

Follow the code rules in the Style Guide. <!-- PROC-BEHAV-TASK-CODE-REFER-STYLEGUIDE -->

**Example:**

1. Do this thing...

```bash
gh workflow run build --repo org/repo
```

## Screenshot (optional) <!-- group: PROC-TASK-IMG -->

See the [writing rules] (../../3-validating-design/writing-rules/README.md) for screenshots. <!-- PROC-BEHAV-TASK-SHOT-REFER-STYLEGUIDE -->

## Solution intro

- 

## Solution steps

- Use a numbered list when the procedure is completed in one go. <!-- PROC-BEHAV-TASK-STEPS-ORDERED-ONEGO -->
- Use checkboxes when steps are unordered or spread over time. <!-- PROC-BEHAV-TASK-STEPS-CHECKBOX-UNORDERED -->
- Start each step with an imperative verb; avoid -ing forms. <!-- PROC-BEHAV-TASK-STEPS-IMPERATIVE -->
- One step = one user action (combine only trivial actions). <!-- PROC-BEHAV-TASK-STEPS-ONE-ACTION -->
- Write ordered lists with `1.` for every item (1, 1, 1 …). <!-- PROC-STRUCT-TASK-STEPS-OL-ONE -->
- Aim for 2–7 steps. Split if longer. <!-- PROC-BEHAV-TASK-STEPS-COUNT-2-7 -->
- Avoid writing only one step. <!-- PROC-BEHAV-TASK-STEPS-NO-ONE -->
- When adding paragraphs, images, or code under a step, insert a blank line and indent so they are children of that step. <!-- PROC-STRUCT-TASK-STEPS-NESTING -->
- Bold UI elements (buttons, menus, options). <!-- PROC-BEHAV-TASK-STEPS-UI-BOLD -->
- Use inline code for commands, filenames, paths, and output. <!-- PROC-BEHAV-TASK-STEPS-CODE-INLINE -->
- Don’t use external links in steps; only same-page anchors. <!-- PROC-BEHAV-TASK-STEPS-LINKS-INTERNAL -->
- For UI paths, put location before action. <!-- PROC-BEHAV-TASK-STEPS-LOCATION-FIRST -->
- For conditions, write the result first, then the condition. <!-- PROC-BEHAV-TASK-STEPS-RESULT-THEN-CONDITION -->

### Step clarifiers (optional) <!-- group: PROC-TASK-CLAR -->

- Don't use numbered substeps beneath a step (nested ordered lists). <!-- PROC-STRUCT-TASK-CLAR-NO-ORDERED -->
- Use bullets for subactions, such as clarifiers or alternatives. <!-- PROC-STRUCT-TASK-CLAR-BULLETS -->
- Limit clarifiers to 2–4 items in one level. <!-- PROC-BEHAV-TASK-CLAR-COUNT-2-4 -->

## Best practices (optional)

- Use a Markdown H2 with the exact text "Best practices". <!-- PROC-STRUCT-EXPECT-H2-TEXT -->
- Include one unordered list. <!-- PROC-STRUCT-EXPECT-POSITION -->
- Write one complete sentence per bullet (two short sentences max), and end sentences with a period. <!-- PROC-BEHAV-EXPECT-SENTENCE-1-2 -->
- Order items from most important to least important to avoid problems when using the feature or performing the task. <!-- PROC-BEHAV-EXPECT-PRIORITY -->
