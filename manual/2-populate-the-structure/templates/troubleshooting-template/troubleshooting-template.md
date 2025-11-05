| Section                       | Format                              | Required  | ID                               |
|:------------------------------|:------------------------------------|:----------|:---------------------------------|
| Title                         | H1                                  | Yes       | `QST-TITLE`                      |
| Subtitle                      | Single bold sentence                | Yes       | `QST-SUBTITLE`                   |
| Callouts                      | Tip, Note, Important, Caution       | No        | `QST-CALLOUTS`                   |
| Overview                      | Paragraph                           | Yes       | `QST-OVERVIEW`                   |
| "What to expect" title      | H2                                  | No        | `QST-STRUCT-BEFORE-START-H2-TEXT`|
| "What to expect" list       | Bullet list                         | No        | `QST-BEFORE-START`               |
| Cuase 1                    | H2                                  | Yes       | `QST-TASK-TITLE`                 |
| Task intro                    | Paragraph                           | No        | `QST-TASK-INTRO`                 |
| Task callout                  | Callout                             | No        | `QST-TASK-CALLOUTS`              |
| Task actions                  | Numbered list                       | Yes       | `QST-TASK-STEP`                  |
| Clarifiers                    | Unordered bullets (depth 1) (2)     | No        | `QST-TASK-CLARIFIERS`            |
| Code                          | Fenced code block                   | No        | `QST-TASK-CODE`                  |
| Screenshot                    | Image                               | No        | `QST-TASK-IMG`                   |
| H4-H6 headings                | -                                   | Forbidden | `QST-STRUCT-FORBID-H4-H6`        |
| "Next steps" title            | H2                                  | No        | `QST-STRUCT-NEXT-H2-TEXT`        |
| "Next steps" list             | Bullet list                         | No        | `QST-NEXT`                       |


## Front matter
---
title:
doc_type: # [procedure, concept, reference, quickstart, api]
product: # [storage, blockchain, connect]
topics: []
authors: # GitHub username
owner: ift
doc_version: # increased by one after every update
slug:
---



A troubleshooting topic or section explains to users the product known issues and errors they might encounter because of product quirks or users' mistakes, and helps users resolve issues effectively if there is a solution.

When an issue applies to a specific procedure article, document it in that article as a troubleshooting section. Otherwise, create a new troubleshooting topic.


## Write a troubleshooting topic

### Filenames

Check out the [file names and location rules](../../../CONTRIBUTING.md#file-names-and-location-rules) for more information.

### General rules

- For troubleshooting content that applies to a specific procedure, include it as a section at the end of the [procedure article] instead of creating a separate troubleshooting topic. <!-- QST-BEHAV-TROUBLESHOOTING-PROCEDURE-SECTION -->
- If a troubleshooting topic becomes too long (for example, more than 3000 words), consider splitting it into multiple topics based on different issues or causes. <!-- QST-BEHAV-TROUBLESHOOTING-SPLIT-LONG -->
### Title

- Use a Markdown H1 heading.
- The title consists of the word "Troubleshooting" followed by a noun phrase describing the issue scope. For example, "Troubleshooting your connection to the Logos blockchain".

### Subtitle

- Use a Markdown H4 for the subtitle placed right under the H1. <!-- QST-STRUCT-SUBTITLE-H4 -->
- Single sentence with no links, list items, or formatting. Ends with a period. <!-- -BEHAV-SUBTITLE-SINGLE-SENTENCE -->
- Do not end with a period. <!-- QST-BEHAV-SUBTITLE-NO-PERIOD -->
- Stay under 120 characters (approx. 20 words). <!-- QST-BEHAV-SUBTITLE-LENGTH-120 -->
- Use imperative verbs to describe the topic's purpose or benefit: *Help*, *Resolve* and so on. <!-- QST-BEHAV-SUBTITLE-IMPERATIVE -->
- Adds new value beyond the title. It should not repeat the title or be a rephrased version of it. <!-- QST-BEHAV-SUBTITLE-ADDS-VALUE -->

**Examples:**

- *Resolve problems uploading files to the Logos storage.*
- *Learn the troubleshooting steps for common connection issues.*

## Callouts <!-- QST-CALLOUTS -->

- Use callouts sparingly in the document and only when necessary to avoid overwhelming the reader. <!-- QST-STRUCT-CALLOUTS-NOT-CONSECUTIVE -->
- One callout maximum per section <!-- QST-STRUCT-CALLOUTS-PER-SECTION-ONE -->
- Keep each callout concise (≤ 2 short sentences). If the content needs a list or multiple paragraphs, move it into the body under a heading. <!-- QST-BEHAV-CALLOUTS-CONCISE -->
- Ensure the callout content is directly relevant to the nearby task or decision point. <!-- QST-BEHAV-CALLOUTS-RELEVANT -->
- Use the appropriate type: `Tip`, `Note`, `Important`, or `Caution`. <!-- QST-BEHAVE-CALLOUTS-TYPE -->
- Do **not** include full procedural steps or long prerequisite checklists inside callouts. <!-- PROC-BEHAV-CALLOUTS-NO-STEPS -->
- For the allowed callout types and when to use them, see the [writing rules](../../3-validating-design/writing-rules/README.md). <!-- PROC-BEHAV-CALLOUTS-TYPES-REFER-STYLEGUIDE -->

### Overview

- Describe the problem For example, when users may encounter it, and the impact it has on their experience. <!-- QST-BEHAV-OVERVIEW-CONTENT -->
- Write one or two 50 to 100-word paragraphs. <!-- QST-BEHAV-OVERVIEW-LENGTH -->
- Avoid lengthy discussions of the product or feature. Link to a [concept](./concept-help-me-to-understand.md) article if you need to provide more information. <!-- QST-BEHAV-OVERVIEW-MORE-INFO -->
- Link to related documents or headings in the same document to support the reader's gathering of information. <!-- QST-BEHAV-OVERVIEW-LINK -->

### Cause 1



### Troubleshooting steps (optional)

If there are methods to resolve the issue, describe the troubleshooting procedure.
