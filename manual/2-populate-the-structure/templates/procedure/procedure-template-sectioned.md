# Procedure template: sectioned layout

---
title:
doc_type: procedure
product: # [storage | blockchain | messaging]
topics: []
steps_layout: sectioned
authors: # GitHub username
owner: logos
doc_version: # increased by one after every update
slug:
---

## Template overview

| Section                 | Format                             | Required  | ID                  |
|:------------------------|:-----------------------------------|:----------|:--------------------|
| Title                   | H1                                 | Yes       | `PROC-TITLE`        |
| Subtitle                | H4 (single sentence)               | Yes       | `PROC-SUBTITLE`     |
| Access callout          | Note-type callout                  | No        | `PROC-ACCESS`       |
| Callouts                | Tip, Note, Important, Caution      | No        | `PROC-CALLOUTS`     |
| Intro                   |                                    | Yes       | `PROC-INTRO`        |
| Overview                | Paragraph                          | Yes       | `PROC-OVERVIEW`     |
| Decisions               | Paragraph, list, table             | No        | `PROC-DECISIONS`    |
| Limits                  | Paragraph, list, table             | No        | `PROC-LIMITS`       |
| Impact                  | Paragraph, list, table             | No        | `PROC-IMPACT`       |
| Prerequisites           | Paragraph, list                    | No        | `PROC-PREREQ`       |
| "What to expect"        | List                               | Yes       | `PROC-EXPECT`       |
| Task title              | H2 `Step {n}: …`                   | Yes       | `PROC-TASK-TITLE`   |
| Task intro              | Paragraph                          | No        | `PROC-TASK-INTRO`   |
| Task callouts           | Tip, Note, Important, Caution      | No        | `PROC-TASK-CALLOUTS`|
| Task steps              | Numbered list or checkboxes (1)    | Yes       | `PROC-TASK-STEPS`   |
| Step clarifiers         | Bullets under a step (depth 1) (2) | No        | `PROC-TASK-CLAR`    |
| Step code               | Fenced code block under the step (3)| No       | `PROC-TASK-CODE`    |
| Step screenshot         | Image under the step (3)           | No        | `PROC-TASK-IMG`     |
| FAQ / Troubleshooting   | Paragraph, list, H3                | No        | `PROC-ADDITIONS`    |
| Extra guidelines        |                                    | Yes       | `PROC-EXTRA`        |
| Forbidden content       |                                    | Forbidden | `PROC-FORBID`       |

(1) Use checkboxes only for unordered or long-running tasks. Numbered lists are the default for procedures.
(2) Use a short bullet list for clarifiers or alternatives. Do not create numbered sub-steps.
(3) Nest code and images inside the list item they clarify (indent so they are children of the preceding step).

## Title <!-- group: PROC-TITLE -->

- Use Markdown H1 headings. <!-- PROC-STRUCT-TITLE-H1 -->
- Aim for 50 to 60 characters; 80 characters maximum. <!-- PROC-BEHAV-TITLE-LENGTH-50-80 -->
- Start with an action verb in the imperative form. Don't use the *-ing* form of the verb. <!-- PROC-BEHAV-TITLE-IMPERATIVE -->
- Capitalize only the first word and any proper nouns (sentence-style capitalization). <!-- PROC-BEHAV-TITLE-SENTENCE-CASE -->
- Focus on the outcome, not the mechanics. Prefer results over lists of actions. <!-- PROC-BEHAV-TITLE-OUTCOME-FOCUSED -->
	- Examples: <!-- EXAMPLE: PROC-BEHAV-TITLE-OUTCOME-FOCUSED -->
		- Use: "Set up a local development environment for Node.js"
		- Avoid: "Install Node.js and create a project directory"
- Include the action and the object/context (what/where/how) so the goal is unambiguous. <!-- PROC-BEHAV-TITLE-ACTION-OBJECT -->
- Avoid one- or two-word titles and empty verbs like *make*, *manage*, or *put*. <!-- PROC-BEHAV-TITLE-NO-EMPTY-VERBS -->
- Don't use punctuation marks, such as colons, semicolons, or dashes, except for the required "Step {n}:" prefix. <!-- PROC-BEHAV-TITLE-NO-PUNCT -->

Examples:

	| Usage   | Example                                 |
	|:--------|:----------------------------------------|
	| **Use** | Create a codespace from a template      |
	| Avoid   | Creating a codespace from a template    |
	| **Use** | Use source control in your codespace    |
	| Avoid   | Use source control                      |
	| **Use** | Collaborate with others in a codespace  |
	| Avoid   | Set up a live share session             |

## Subtitle <!-- group: PROC-SUBTITLE -->

- Use a Markdown H4 for the subtitle placed right under the H1. <!-- PROC-STRUCT-SUBTITLE-H4 -->
- One sentence only; no links, lists, or inline formatting. <!-- PROC-BEHAV-SUBTITLE-SINGLE-SENTENCE -->
- Ends with a period. <!-- PROC-BEHAV-SUBTITLE-END-PERIOD -->
- Stay under 20 words. <!-- PROC-BEHAV-SUBTITLE-LENGTH-20 -->
- Use neutral verbs that state the purpose or benefit; avoid persuasive language. <!-- PROC-BEHAV-SUBTITLE-IMPERATIVE -->
  - Examples: <!-- EXAMPLE: PROC-BEHAV-SUBTITLE-IMPERATIVE -->
  	- Use *Get started*, *Explore*, *Try*, or similar
- Add new value beyond the title; don’t repeat or rephrase the H1. <!-- PROC-BEHAV-SUBTITLE-ADDS-VALUE -->

Examples:

- **Title**: *Quickstart for GitHub Actions* / **Subtitle**: *Try out the core features of GitHub Actions in minutes*
- **Title**: *Create a pull request* / **Subtitle**: *Create a pull request to propose and collaborate on changes to a repository*

## Access callout (optional) <!-- group: PROC-ACCESS -->

This note-type callout is exclusively to alert readers about what roles, permissions, or product versions are required to perform the procedure.

- Omit the callout entirely if no permission/product constraints exist. <!-- PROC-STRUCT-ACCESS-OMIT-IF-EMPTY -->
- Place it after the title and subtitle, before the introduction. <!-- PROC-STRUCT-ACCESS-AFTER-SUBTITLE -->
- Use the `Note` callout style. <!-- PROC-STRUCT-ACCESS-NOTE-STYLE -->
- Use label-led, scannable content (no explanations). <!-- PROC-BEHAV-ACCESS-LABELED -->
- Include permissions (software role or permission level), if applicable. <!-- PROC-BEHAV-ACCESS-PERMISSIONS -->
- Include product (product version or edition), if applicable. <!-- PROC-BEHAV-ACCESS-PRODUCT -->
- If multiple permissions/products apply, use commas. <!-- PROC-BEHAV-ACCESS-LIST-IF-MANY -->
- Do not include knowledge, skills, or required tools. <!-- PROC-BEHAV-ACCESS-SCOPE-ONLY -->

Example:

  > **Note**
  >
  > - **Permissions**: Node operators, Site operators
  > - **Product**: Logos Storage v1.4.0 or later

## Callouts <!-- PROC-CALLOUTS -->

- Use callouts sparingly and avoid placing them consecutively. <!-- PROC-STRUCT-CALLOUTS-NOT-CONSECUTIVE -->
- One callout maximum per section <!-- PROC-STRUCT-CALLOUTS-PER-SECTION-ONE -->
- Keep each callout concise (≤ 2 short sentences). If the content needs a list or multiple paragraphs, move it into the body under a heading. <!-- PROC-BEHAV-CALLOUTS-CONCISE -->
- Ensure the callout content is directly relevant to the nearby task or decision point. <!-- PROC-BEHAV-CALLOUTS-RELEVANT -->
- Use the appropriate type: `Tip`, `Note`, `Important`, or `Caution`. <!-- PROC-BEHAV-CALLOUTS-TYPE -->
- Do not include full procedural steps or long prerequisite checklists inside callouts. Put steps in the main flow; keep prerequisite lists in "Before you start." <!-- PROC-BEHAV-CALLOUTS-NO-STEPS -->
- For the allowed callout types and when to use them, see the [writing rules](../../3-validating-design/writing-rules/README.md). <!-- PROC-BEHAV-CALLOUTS-TYPES-REFER-WRITING-RULES -->

Example:

> **Note:**
>
> Keep container resources within the documented limits to avoid throttling.

## Intro <!-- group: PROC-INTRO -->

Every procedure requires an introduction that provides context and helps readers understand the procedure's purpose and scope. The introduction includes these sections, each one represented by a paragraph, list, or table:

- [Overview](#overview)
- [Decisions (optional)](#decisions-optional)
- [Limits (optional)](#limits-optional)
- [Impact (optional)](#impact-optional)
- [Prerequisites (optional)](#prerequisites-optional)

- This section is guidance only; do not render a visible heading or body. <!-- PROC-STRUCT-INTRO-GUIDELINES-NO-RENDER -->
- Include the intro components in this order: Overview, Decisions (optional), Limits (optional), Impact (optional), Prerequisites (optional). <!-- PROC-STRUCT-INTRO-ORDER -->
- The following child blocks render without their own headings: Overview, Decisions, Limits, Impact, Prerequisites. <!-- PROC-STRUCT-INTRO-CHILDREN-NO-HEADINGS -->

### Overview <!-- group: PROC-OVERVIEW -->

- Render inline under the Intro section; do not add a visible subheading. <!-- PROC-STRUCT-OVERVIEW-NO-HEADING -->
- Write a 50–100 word paragraph explaining what this procedure covers, why it matters, and when to use it. <!-- PROC-BEHAV-OVERVIEW-LENGTH-50-100 -->
- State where it applies and who the intended audience is. <!-- PROC-BEHAV-OVERVIEW-AUDIENCE-SCOPE -->
- (Optional) Give one concrete real-world scenario in a single sentence. <!-- PROC-BEHAV-OVERVIEW-EXAMPLE-ONE -->
- Use at most one short alert only if it prevents confusion; otherwise keep this section free of callouts. <!-- PROC-BEHAV-OVERVIEW-ALERT-SPARING -->

### Decisions (optional) <!-- group: PROC-DECISIONS -->

- Render inline under the Intro section; do not add a visible subheading. <!-- PROC-STRUCT-DECISIONS-NO-HEADING -->
- Summarize decisions the reader must make before starting. <!-- PROC-BEHAV-DECISIONS-PURPOSE -->
	- Examples: <!-- EXAMPLE: PROC-BEHAV-DECISIONS-PURPOSE -->
		- "Using CLI vs. using GUI"
		- "Choosing between Method A and Method B"
- Use a list for simple choices; use a compact table for multi-factor comparisons. <!-- PROC-BEHAV-DECISIONS-FORM -->
- Focus on actionable factors: performance, complexity, cost, prerequisites, and limitations. <!-- PROC-BEHAV-DECISIONS-FACTORS -->
- State trade-offs explicitly. <!-- PROC-BEHAV-DECISIONS-TRADEOFFS -->
	- Examples: <!-- EXAMPLE: PROC-BEHAV-DECISIONS-TRADEOFFS -->
		- "A is faster but less secure"
		- "B requires more setup but scales better"
- Give clear guidance. <!-- PROC-BEHAV-DECISIONS-GUIDANCE -->
	- Examples: <!-- EXAMPLE: PROC-BEHAV-DECISIONS-GUIDANCE -->
		- "Choose A for small projects"
		- "Choose B for production use"
- If the decision space is complex, link to a dedicated decision guide. <!-- PROC-BEHAV-DECISIONS-LINK -->

### Limits (optional) <!-- group: PROC-LIMITS -->

- Render inline under the Intro section; do not add a visible subheading. <!-- PROC-STRUCT-LIMITS-NO-HEADING -->
- Describe constraints as a short paragraph; use a list/table only if it improves scanning. <!-- PROC-BEHAV-LIMITS-FORMAT -->
- Cover quotas, rate limits, timeouts, eventual consistency, and destructive side effects. <!-- PROC-BEHAV-LIMITS-COVERAGE -->
- If a constraint is critical to success or safety, surface it with a single concise callout (see Callouts). <!-- PROC-BEHAV-LIMITS-ALERT-CRITICAL -->
- If useful, mention a workaround or mitigation strategy. <!-- PROC-BEHAV-LIMITS-MITIGATION -->
- Link to a dedicated "Limitations" page if details are lengthy. <!-- PROC-BEHAV-LIMITS-LINK -->

### Impact (optional) <!-- group: PROC-IMPACT -->

- Render inline under the Intro section; do not add a visible subheading. <!-- PROC-STRUCT-IMPACT-NO-HEADING -->
- A paragraph, list, or table. <!-- PROC-BEHAV-IMPACT-FORMAT -->
- Highlight side effects and risks, such as  data exposure, downtime, or irreversible actions. <!-- PROC-BEHAV-IMPACT-RISKS -->
- Note required privileges or safer alternatives when relevant. <!-- PROC-BEHAV-IMPACT-PRIVS-ALTS -->
- Use a single concise callout for critical security impacts; link out for details. <!-- PROC-BEHAV-IMPACT-ALERT-CRITICAL -->

### Prerequisites (optional) <!-- group: PROC-PREREQ -->

- Render inline under the Intro section; do not add a visible subheading. <!-- PROC-STRUCT-PREREQUISITES-NO-HEADING -->
- List only the technical setup needed to run the procedure (software, versions, tools, configuration). <!-- PROC-BEHAV-PREREQ-SCOPE -->
- Don't include roles, permissions, or product variants here; put those in the [access callout](#access-callout-optional). <!-- PROC-BEHAV-PREREQ-NO-ROLES -->
- Prefer a single bullet list of noun phrases; keep it brief and link to install/setup instructions as needed. <!-- PROC-BEHAV-PREREQ-LIST-NOUNS -->

## "What to expect" <!-- group: PROC-EXPECT -->

- Use a Markdown H2 with the exact text "What to expect". <!-- PROC-STRUCT-EXPECT-H2-TEXT -->
- Place this section after the introduction and before the first task section. <!-- PROC-STRUCT-EXPECT-POSITION -->
- Include exactly one unordered list with three items (no code blocks or callouts here). <!-- PROC-STRUCT-EXPECT-UL-THREE -->
- Write one complete sentence per bullet (two short sentences max), and end sentences with a period. <!-- PROC-BEHAV-EXPECT-SENTENCE-1-2 -->
- Use parallel wording in each bullet (same grammatical shape), focused on outcomes users will have after completing the procedure. <!-- PROC-BEHAV-EXPECT-PARALLEL-OUTCOME -->
	- Example: "You can ...".
- Order items from most important to least important. <!-- PROC-BEHAV-EXPECT-PRIORITY -->
- Allow only same-page heading links; no external links. <!-- PROC-BEHAV-EXPECT-LINKS-INTERNAL -->

## Task

Every procedure requires at least one task. Each task includes these mandatory and optional sections:

- [Task title](#task-title)
- [Task intro (optional)](#task-intro-optional)
- [Task callouts (optional)](#task-callouts-optional)
- [Task steps](#task-steps)
- [Step clarifiers (optional)](#step-clarifiers-optional)
- [Step code (optional)](#step-code-optional)
- [Step screenshot (optional)](#step-screenshot-optional)

### Task title <!-- group: PROC-TASK-TITLE -->

- Procedure section titles are Markdown H2 headings. <!-- PROC-STRUCT-TASK-H2 -->
- Aim for 50–60 characters; 80 max. <!-- PROC-BEHAV-TASK-TITLE-LENGTH-50-80 -->
- The first task title must be `Step 1:` + `task-name`. Subsequent task titles must increment by `Step` by 1. <!-- PROC-STRUCT-TASK-ORDER-ASC -->
- Start with an imperative verb; avoid the -ing form. <!-- PROC-BEHAV-TASK-TITLE-IMPERATIVE -->
- Use sentence case (capitalize only the first word and proper nouns). <!-- PROC-BEHAV-TASK-TITLE-SENTENCE-CASE -->
- Avoid empty verbs (make, manage, put). <!-- PROC-BEHAV-TASK-TITLE-NO-EMPTY-VERBS -->
- Avoid one- or two-word titles. <!-- PROC-BEHAV-TASK-TITLE-NO-ONE-TWO-WORD -->
- Don’t use punctuation marks in titles (colons, semicolons, dashes). <!-- PROC-BEHAV-TASK-TITLE-NO-PUNCT -->

### Task intro (optional) <!-- group: PROC-TASK-INTRO -->

- Write 1–2 short sentences that provide context. <!-- PROC-BEHAV-TASK-INTRO-BRIEF -->
- Do not repeat the task title wording. <!-- PROC-BEHAV-TASK-INTRO-NO-REPEAT -->
- Add cross-references here, not inside steps. <!-- PROC-BEHAV-TASK-INTRO-LINKS -->

### Task callouts (optional) <!-- group: PROC-TASK-CALLOUTS -->

- Use one callout after the intro for important notes, warnings, or tips. <!-- PROC-STRUCT-TASK-CALLOUTS-AFTER-INTRO -->
- Do not place callouts between steps. <!-- PROC-STRUCT-TASK-CALLOUTS-NO-BETWEEN-STEPS -->
- One callout maximum per task. <!-- PROC-STRUCT-TASK-CALLOUTS-PER-TASK-ONE -->

### Task steps <!-- group: PROC-TASK-STEPS -->

- Use a numbered list when the task is completed in one go. <!-- PROC-BEHAV-TASK-STEPS-ORDERED-ONEGO -->
- Use checkboxes when steps are unordered or spread over time. <!-- PROC-BEHAV-TASK-STEPS-CHECKBOX-UNORDERED -->
- Each "Step {n}" section contains exactly one list of actions. <!-- PROC-STRUCT-TASK-ONE-LIST -->
- Start each step with an imperative verb; avoid -ing forms. <!-- PROC-BEHAV-TASK-STEPS-IMPERATIVE -->
- One step = one user action (combine only trivial actions). <!-- PROC-BEHAV-TASK-STEPS-ONE-ACTION -->
- Write ordered lists with `1.` for every item (1, 1, 1 …). <!-- PROC-STRUCT-TASK-STEPS-OL-ONE -->
- Aim for 2–7 steps. Split if longer. <!-- PROC-BEHAV-TASK-STEPS-COUNT-2-7 -->
- Avoid one-step tasks. <!-- PROC-BEHAV-TASK-STEPS-NO-ONE -->
- When adding paragraphs, images, or code under a step, insert a blank line and indent so they are children of that step. <!-- PROC-STRUCT-TASK-STEPS-NESTING -->
- Bold UI elements (buttons, menus, options). <!-- PROC-BEHAV-TASK-STEPS-UI-BOLD -->
- Use inline code for commands, filenames, paths, and output. <!-- PROC-BEHAV-TASK-STEPS-CODE-INLINE -->
- Don’t use external links in steps; only same-page anchors. <!-- PROC-BEHAV-TASK-STEPS-LINKS-INTERNAL -->
- For UI paths, put location before action. <!-- PROC-BEHAV-TASK-STEPS-LOCATION-FIRST -->

	- Examples: <!-- EXAMPLE: PROC-BEHAV-TASK-STEPS-LOCATION-FIRST -->

		| Incorrect (action first)                         | Correct (location first)                          |
		|:---|:---|
		| Click **Save** in the **File** menu.             | In the **File** menu, click **Save**.             |
		| Select **Run** from the **Debug** configuration. | From the **Debug** configuration, select **Run**. |

- For conditions, write the result first, then the condition. <!-- PROC-BEHAV-TASK-STEPS-RESULT-THEN-CONDITION -->

  - Examples: <!-- EXAMPLE: PROC-BEHAV-TASK-STEPS-RESULT-THEN-CONDITION -->

    | Incorrect (condition first) | Correct (result first) |
    |:---|:---|
    | If the Network Status is "Disconnected", an error message will display. | An error message will display if the Network Status is "Disconnected". |
    | Only use the `$API_KEY` if you are calling the external service.        | Use the `$API_KEY` only if you are calling the external service.       |

### Step clarifiers (optional) <!-- group: PROC-TASK-CLAR -->

- Don't use numbered substeps beneath a step (nested ordered lists). <!-- PROC-STRUCT-TASK-CLAR-NO-ORDERED -->
- Use bullets for subactions, such as clarifiers or alternatives. <!-- PROC-STRUCT-TASK-CLAR-BULLETS -->
- Limit clarifiers to 2–4 items in one level. <!-- PROC-BEHAV-TASK-CLAR-COUNT-2-4 -->

### Step code (optional) <!-- group: PROC-TASK-CODE -->

- Follow the code formatting rules in the Writing Rules. <!-- PROC-BEHAV-TASK-CODE-REFER-WRITING-RULES -->

Example:

>	1. Do this thing...
>
>	```bash
>	gh workflow run build --repo org/repo
>	```

### Step screenshot (optional) <!-- group: PROC-TASK-IMG -->

- Follow the screenshot formatting rules in the Writing Rules. <!-- PROC-BEHAV-TASK-IMG-REFER-WRITING-RULES -->

## FAQ / Troubleshooting (optional) <!-- group: PROC-ADDITIONS -->

- Use an H2 Markdown heading for this section. <!-- PROC-STRUCT-ADDITIONS-H2 -->
- Place this section after the final procedure section and before "Next steps" (if present). <!-- PROC-STRUCT-ADDITIONS-POSITION -->
- Begin with "Troubleshooting {topic}" for error resolution or "Frequently asked questions" for question-based content. <!-- PROC-BEHAV-ADDITIONS-TITLE-PATTERN -->
- Use paragraphs, lists, or H3 headings for the content. <!-- PROC-STRUCT-ADDITIONS-ALLOWED-BLOCKS-H3 -->
- If you use H3 question headings, write them in sentence case and end with a question mark. <!-- PROC-BEHAV-ADDITIONS-H3-QUESTION-FORM -->
- Use "Frequently asked questions" instead of "FAQ" alone. <!-- PROC-BEHAV-ADDITIONS-TERM-FAQ -->
- For longer or complex cases, create a separate FAQ or Troubleshooting (concept) article and link to it. <!-- PROC-BEHAV-ADDITIONS-SPLIT-IF-LONG -->

## Extra guidelines <!-- group: PROC-EXTRA -->

- This section is guidance only; do not render a visible heading or body. <!-- PROC-STRUCT-EXTRA-GUIDELINES-NO-RENDER -->
- Keep the procedure word count between 400 and 800 words. <!-- PROC-BEHAV-EXTRA-LENGTH -->

## Forbidden content <!-- group: PROC-FORBID -->

- Do not use H4–H6 headings. <!-- PROC-STRUCT-FORBID-H4-H6 -->
- Do not include a "Further reading" section or links to other related topics at the end of the document. <!-- PROC-BEHAV-FORBID-NO-FURTHER-READING -->
