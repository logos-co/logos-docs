# Quickstart template <!-- This is an informative header; remove it before merging your content. -->

---
title:
doc_type: quickstart
product: # [storage, blockchain, messaging]
topics: []
authors: # GitHub username
owner: logos
doc_version: # increased by one after every update
slug:
---

## Template overview

| Section                       | Format                              | Required  | ID                    |
|:------------------------------|:------------------------------------|:----------|:----------------------|
| Title                         | H1                                  | Yes       | `QST-TITLE`           |
| Subtitle                      | H4                                  | Yes       | `QST-SUBTITLE`        |
| Access callouts               | Note-type callout                   | No        | `QST-ACCESS`          |
| Callouts                      | Tip, Note, Important, Caution       | No        | `QST-CALLOUTS`        |
| Overview                      | Paragraph                           | Yes       | `QST-OVERVIEW`        |
| "Before you start"            | List                                | No        | `QST-BEFORE-START`    |
| Task guidelines               |                                     | Yes       | `QST-TASK-GUIDELINES` |
| Task title                    | H2                                  | Yes       | `QST-TASK-TITLE`      |
| Task intro                    | Paragraph                           | No        | `QST-TASK-INTRO`      |
| Task callouts                 | Tip, Note, Important, Caution       | No        | `QST-TASK-CALLOUTS`   |
| Task actions                  | Numbered list                       | Yes       | `QST-TASK-STEP`       |
| Step clarifiers               | Unordered bullets (depth 1) (1)     | No        | `QST-TASK-CLARIFIERS` |
| Code                          | Fenced code block (2)               | No        | `QST-TASK-CODE`       |
| Screenshot                    | Image (2)                           | No        | `QST-TASK-IMG`        |
| "Next steps"                  | Bullet list                         | No        | `QST-NEXT`            |
| Extra guidelines              |                                     | Yes       | `QST-EXTRA`           |
| Forbidden content             |                                     | Forbidden | `QST-FORBID`          |

(1) Use a short bullet list for clarifiers or alternatives. Do not create numbered sub-steps.  
(2) Nest code and images inside the list item they clarify (indent so they are children of the preceding step).

## Title <!-- group: QST-TITLE -->

- Use a Markdown H1 heading. <!-- QST-STRUCT-TITLE-H1 -->
- The title consists of the words "Quickstart for" and the name of the project or feature (for example, "Quickstart for Logos Storage"). Do not add other text. <!-- QST-BEHAV-TITLE-IMPERATIVE  -->
- Capitalize only the first word and any proper nouns (sentence-style capitalization). <!-- QST-BEHAV-TITLE-SENTENCE-CASE -->
- Don't use punctuation marks, such as colons, semicolons, or dashes. <!-- QST-BEHAV-TITLE-NO-PUNCT -->

## Subtitle <!-- group: QST-SUBTITLE -->

- Use a Markdown H4 for the subtitle placed right under the H1. <!-- QST-STRUCT-SUBTITLE-H4 -->
- One sentence only; no links, list items, or formatting. <!-- QST-BEHAV-SUBTITLE-SINGLE-SENTENCE -->
- Ends with a period. <!-- QST-BEHAV-SUBTITLE-END-PERIOD -->
- Stay under 20 words. <!-- QST-BEHAV-SUBTITLE-LENGTH-20 -->
- Use imperative verbs to describe the topic's purpose or benefit <!-- QST-BEHAV-SUBTITLE-IMPERATIVE -->
	- Examples: <!-- EXAMPLE: QST-BEHAV-SUBTITLE-IMPERATIVE -->
		- *Get started*, *Explore*, *Try*, or similar
- Adds new value beyond the title; don't repeat or rephrase the H1. <!-- QST-BEHAV-SUBTITLE-ADDS-VALUE -->

Examples:

	- **Title**: *Quickstart for Logos Messaging* / **Subtitle**: *Get hands-on with Logos Messaging's key capabilities.*
	- **Title**: *Quickstart for Stripe* / **Subtitle**: *Quickly add payments to your project with Stripe.*

## Access callouts <!-- group: QST-ACCESS -->

This note-type callout is exclusively to alert readers about what roles, permissions, or product versions are required to perform the procedure.

- Place it after the title and subtitle, before the overview. <!-- QST-STRUCT-ACCESS-AFTER-SUBTITLE -->
- Use the *Note* callout style. <!-- QST-STRUCT-ACCESS-NOTE-STYLE -->
- Use label-led, scannable content (no explanations). <!-- QST-BEHAV-ACCESS-LABELED -->
- Include permissions (software role or permission level). <!-- QST-BEHAV-ACCESS-PERMISSIONS -->
- Include product (product version or edition), if applicable. <!-- QST-BEHAV-ACCESS-PRODUCT -->
- If multiple permissions/products apply, use commas. <!-- QST-BEHAV-ACCESS-LIST-IF-MANY -->
- Do not include knowledge, skills, or required tools. <!-- QST-BEHAV-ACCESS-SCOPE-ONLY -->
- Omit the callout entirely if no permission/product constraints exist. <!-- QST-STRUCT-ACCESS-OMIT-IF-EMPTY -->

Examples:

  > **Note**
  >
  > - **Permissions**: Admin roles with write permissions on the repository
  > - **Product**: Logos Storage v5.0 or later

## Callouts <!-- QST-CALLOUTS -->

- Use callouts sparingly and avoid placing them consecutively. <!-- QST-STRUCT-CALLOUTS-NOT-CONSECUTIVE -->
- One callout maximum per section <!-- QST-STRUCT-CALLOUTS-PER-SECTION-ONE -->
- Keep each callout concise (≤ 2 short sentences). If the content needs a list or multiple paragraphs, move it into the body under a heading. <!-- QST-BEHAV-CALLOUTS-CONCISE -->
- Ensure the callout content is directly relevant to the nearby task or decision point. <!-- QST-BEHAV-CALLOUTS-RELEVANT -->
- Use the appropriate type: *Tip*, *Note*, *Important*, or *Caution*. <!-- QST-BEHAV-CALLOUTS-TYPE -->
- Do not include full procedural steps or long prerequisite checklists inside callouts. Put steps in the main flow; keep prerequisite lists in "Before you start." <!-- QST-BEHAV-CALLOUTS-NO-STEPS -->
- For the allowed callout types and when to use them, see the [writing rules](../../3-validating-design/writing-rules/README.md). <!-- QST-BEHAV-CALLOUTS-TYPES-REFER-WRITING-RULES -->

## Overview <!-- group: QST-OVERVIEW -->

- Do not add a visible subheading. <!-- QST-STRUCT-OVERVIEW-NO-HEADING -->
- Describe the product or feature' core purposes and what the user will achieve in this quickstart. <!-- QST-BEHAV-OVERVIEW-CONTENT -->
- Write one or two 50 to 100-word paragraphs. <!-- QST-BEHAV-OVERVIEW-LENGTH -->
- Avoid lengthy discussions of the product or feature. Link to a [concept](./concept-help-me-to-understand.md) article if you need to provide more information. <!-- QST-BEHAV-OVERVIEW-MORE-INFO -->
- Link to related documents or headings in the same document to support the reader's gathering of information. <!-- QST-BEHAV-OVERVIEW-LINK -->
- Use at most one short alert only if it prevents confusion; otherwise keep this section free of callouts. <!-- QST-BEHAV-OVERVIEW-ALERT-SPARING -->

## "Before you start" (optional) <!-- group: QST-BEFORE-START -->

- Use the "Before you start" H2 heading for this section. <!-- QST-STRUCT-BEFORE-START-H2-TEXT -->
- Write a single unordered list. <!-- QST-STRUCT-BEFORE-UNORDERED -->
- Specify the intended audience of this quickstart, required prior knowledge for using this quickstart and the software or hardware requirements. <!-- QST-BEHAV-BEFORE-CONTENT -->
- Use noun phrases (for example, "familiarity with Golang"). Don't include verbs such as "learn" or "prepare". <!-- QST-BEHAV-BEFORE-START-NOUN -->
- Provide [links](../../20-style-the-content/10-links.md) to related content such as installation instructions or articles that provide required knowledge. <!-- QST-BEHAV-BEFORE-START-LINK -->
- Don't include the procedure for setting up or installing prerequisites. If you must explain the procedure, link to the corresponding document or resource. <!-- QST-BEHAV-BEFORE-START-NO-STEPS -->

Example:

	> Before you begin, make sure you have:
	>
	> - A basic understanding of [Ethereum](https://ethereum.org/en/developers/docs/intro-to-ethereum/) ↗ concepts.
	> - Knowledge of how to work with Python virtual environments.
	> - A machine running Ubuntu Linux with the following minimum requirements:
	>   - 4 GB memory
	>   - 2 TB SSD storage
	>   - x86_64 architecture

## Task guidelines <!-- group: QST-TASK-GUIDELINES -->

- This section is guidance only; do not render a visible heading or body. <!-- QST-STRUCT-TASK-GUIDELINES-NO-RENDER -->
- Scope: these guidelines apply to all task sections (title, intro, callouts, steps, clarifiers, code, image). <!-- QST-STRUCT-TASK-GUIDELINES-SCOPE-ALL -->
- Use imperative mood throughout the tasks. <!-- QST-BEHAV-TASK-GUIDELINES-IMPERATIVE -->
- Choose two or three tasks that are essential, quick to complete, and provide immediate value to the user. <!-- QST-STRUCT-TASK-COUNT -->
- The first task is usually about setting up or installing the product or feature. <!-- QST-BEHAV-TASK-FIRST-SETUP -->
- If setup requires more than 7 steps, create a separate installation guide and direct readers to it in the [Before you start](#before-you-start-section) section. <!-- QST-BEHAV-TASK-FIRST-SETUP-LINK -->
- For the other task(s), focus on the core functionalities of the product or feature. <!-- QST-BEHAV-TASK-FEATURES -->

### Task title <!-- group: QST-TASK-TITLE -->

- Task titles are Markdown H2 headings. <!-- QST-STRUCT-TASK-TITLE-H2 -->
- Don't include numbering in the title. <!-- QST-BEHAV-TASK-TITLE-NO-NUMBERING -->
- Aim for 50–60 characters; 80 max. <!-- QST-BEHAV-TASK-TITLE-LENGTH -->
- Start with an imperative verb; avoid the *-ing* form. <!-- QST-BEHAV-TASK-TITLE-IMPERATIVE -->
- Use sentence case (capitalize only the first word and proper nouns). <!-- QST-BEHAV-TASK-TITLE-SENTENCE-CASE -->
- Avoid empty verbs (*make*, *manage*, *put*). <!-- QST-BEHAV-TASK-TITLE-NO-EMPTY-VERBS -->
- Avoid one- or two-word titles. <!-- QST-BEHAV-TASK-TITLE-NO-ONE-TWO-WORD -->
- Don't use punctuation marks in titles (colons, semicolons, dashes). <!-- QST-BEHAV-TASK-TITLE-NO-PUNCT -->

Examples:

	- *Run a Logos Messaging node*
	- *Connect to the Logos Blockchain network*
	- *Configure system admin access*

### Task intro (optional) <!-- group: QST-TASK-INTRO -->

- Write 1–2 short sentences that provide context. <!-- QST-BEHAV-TASK-INTRO-BRIEF -->
- Do not repeat the task title wording. <!-- QST-BEHAV-TASK-INTRO-NO-REPEAT -->
- Add cross-references here, not inside steps. <!-- QST-BEHAV-TASK-INTRO-LINKS -->

### Task callouts (optional) <!-- group: QST-TASK-CALLOUTS -->

- Use one callout after the intro for important notes, warnings, or tips. <!-- QST-STRUCT-TASK-CALLOUTS-AFTER-INTRO -->
- Do not place callouts between steps. <!-- QST-STRUCT-TASK-CALLOUTS-NO-BETWEEN-STEPS -->
- One callout maximum per task. <!-- QST-STRUCT-TASK-CALLOUTS-PER-TASK-ONE -->

### Task steps <!-- group: QST-TASK-STEP -->

- Use a numbered list. <!-- QST-BEHAV-TASK-STEP-ORDERED -->
- Start each step with an imperative verb; avoid *-ing* forms. <!-- QST-BEHAV-TASK-STEP-VERB -->
- One step = one user action (combine only trivial actions). <!-- QST-BEHAV-TASK-STEP-ONE-ACTION -->
- Write ordered lists with `1.` for every item (1, 1, 1 …). <!-- QST-STRUCT-TASK-STEPS-OL-ONE -->
- Aim for 2–7 steps. Split if longer. <!-- QST-BEHAV-TASK-STEP-RANGE -->
- Avoid one-step tasks. <!-- QST-BEHAV-TASK-STEP-NO-ONE -->
- When adding paragraphs, images, or code under a step, insert a blank line and indent so they are children of that step. <!-- QST-BEHAV-TASK-STEP-BLOCKS -->
- Bold UI elements (buttons, menus, options). <!-- QST-BEHAV-TASK-STEP-UI-BOLD -->
- Use inline code for commands, filenames, paths, and output. <!-- QST-BEHAV-TASK-STEP-CODE-INLINE -->
- Don't use external links in steps; only same-page anchors. <!-- QST-BEHAV-TASK-STEP-LINKS -->
- For UI paths, put location before action. <!-- QST-BEHAV-TASK-STEP-LOC-FIRST -->

	- Example <!-- EXAMPLE: QST-BEHAV-TASK-STEP-LOC-FIRST -->

		| Incorrect (action first) | Correct (location first) |
		|:---|:---|
		| Click **Save** in the **File** menu. | In the **File** menu, click **Save**. |
		| Select **Run** from the **Debug** configuration. | From the **Debug** configuration, select **Run**. |

- For conditions, write the result first, then the condition. <!-- QST-BEHAV-TASK-STEP-RESULT-FIRST -->

	- Example <!-- EXAMPLE: QST-BEHAV-TASK-STEP-RESULT-FIRST -->

		| Incorrect (condition first) | Correct (result first) |
		|---|---|
		| If the Network Status is Disconnected, an error message will display. | An error message will display if the Network Status is Disconnected. |
		| Only use the `$API_KEY` if you are calling the external service. | Use the `$API_KEY` only if you are calling the external service. |

### Step clarifiers (optional) <!-- group: QST-TASK-CLARIFIERS -->

- Don't use numbered substeps beneath a step (nested ordered lists). <!-- QST-STRUCT-TASK-CLARIFIERS-NOSUBSTEPS -->
- Use bullets for subactions, such as clarifiers or alternatives. <!-- QST-STRUCT-TASK-CLARIFIERS-BULLETS -->
- Limit clarifiers to 2–4 items in one level. <!-- QST-STRUCT-TASK-CLARIFIERS-LIMIT -->

### Task code (optional) <!-- group: QST-TASK-CODE -->

Follow the code rules in the writing rules document. <!-- QST-BEHAV-TASK-CODE-REFER-WRITING-RULES -->

	- Example:

		> 	1. Do this thing...
		>
		>    ```bash
		>    gh workflow run build --repo org/repo
		>   ```

### Task screenshot (optional) <!-- group: QST-TASK-IMG -->

- Follow the screenshots rules in the writing rules document. <!-- QST-BEHAV-IMG-REFER-WRITING-RULES -->

## "Next steps" (optional) <!-- group: QST-NEXT -->

- Use the "Next steps" H2 heading for this section. <!-- QST-STRUCT-NEXT-H2-TEXT -->
- For each bullet point, write an article title and the link to it. <!-- QST-STRUCT-NEXT-FORMAT -->
- Write at most three bullet points. <!-- QST-STRUCT-NEXT-3POINTS -->
- Consider a logical connection from the current quickstart that can act as a basis for users' next learning. <!-- QST-BEHAV-NEXT-LOGIC -->

## Extra guidelines <!-- group: QST-EXTRA -->

- This section is guidance only; do not render a visible heading or body. <!-- QST-STRUCT-EXTRA-GUIDELINES-NO-RENDER -->
- Keep the quickstart word count between 600 and 1200 words. <!-- QST-BEHAV-EXTRA-LENGTH -->

## Forbidden content <!-- group: QST-FORBID -->

- This section is guidance only; do not render a visible heading or body. <!-- QST-STRUCT-FORBID-GUIDELINES-NO-RENDER -->
- Do not use H4-H6 headings. <!-- QST-STRUCT-FORBID-H4-H6 -->
