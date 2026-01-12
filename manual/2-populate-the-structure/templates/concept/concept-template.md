# Concept template

---
title:
doc_type: concept
product: # [storage | blockchain | messaging]
topics: []
authors: # GitHub username
owner: logos
doc_version: # increased by one after every update
slug:
---

## Template overview

| Section                | Format                        | Required   | ID                |
|:-----------------------|:------------------------------|:-----------|:------------------|
| Title                  | H1                            | Yes        | `CONC-TITLE`      |
| Subtitle               | H4                            | Yes        | `CONC-SUBTITLE`   |
| Access callout         | Note-type callout             | No         | `CONC-ACCESS`     |
| Callouts               | Tip, Note, Important, Caution | No         | `CONC-CALLOUTS`   |
| Intro                  |                               | Yes        | `CONC-INTRO`      |
| Overview               | Paragraph                     | Yes        | `CONC-OVERVIEW`   |
| Diagram                | Mermaid or image              | No         | `CONC-DIAGRAM`    |
| Use case example       | Paragraph, list               | No         | `CONC-USE-CASE`   |
| Comparison             | Paragraph, list, table        | No         | `CONC-COMPARISON` |
| "The basics" heading   | List                          | Yes        | `CONC-BASICS`     |
| H2 section             | H2 + body (container)         | Yes        | `CONC-H2-SECTION` |
| H3 section             | H3 + body (container)         | No         | `CONC-H3-SECTION` |
| Extra guidelines       |                               | Yes        | `CONC-EXTRA`      |
| Forbidden content      |                               | Forbidden  | `CONC-FORBID`     |

## Title <!-- group: CONC-TITLE -->

- Use Markdown H1 headings. <!-- CONC-STRUCT-TITLE-H1 -->
- Aim for 50 to 60 characters; 80 characters maximum. <!-- CONC-BEHAV-TITLE-LENGTH-50-80 -->
- Use cue words such as *Guide to*, *About*, *Understand*, *FAQ*, or *Introduction to*. Do not use active verbs like *Understand*, *Learn*, or *How to*. <!-- CONC-BEHAV-TITLE-CUE-WORDS -->
- Capitalize only the first word and any proper nouns (sentence-style capitalization). <!-- CONC-BEHAV-TITLE-SENTENCE-CASE -->
- For verbs, use the base form over the gerund form. <!-- CONC-BEHAV-TITLE-NO-GERUND -->
	- Examples: <!-- EXAMPLE: CONC-BEHAV-TITLE-NO-GERUND -->
		- Use: *Understand*, *Learn*, *Explore*
		- Avoid: *Understanding*, *Learning*, *Exploring*
- Use the *FAQ:* prefix for question compilations. Don't name FAQ articles as tasks. <!-- CONC-BEHAV-FAQ-PREFIX-QUESTIONS -->
- Avoid one- or two-word titles and empty verbs like *make*, *manage*, or *put*. <!-- CONC-BEHAV-TITLE-NO-EMPTY-VERBS -->
- Don't use punctuation marks, such as colons, semicolons, or dashes except the `FAQ:` prefix. <!-- CONC-BEHAV-TITLE-NO-PUNCT -->

Examples:

	| Usage   | Example                                |
	|:--------|:---------------------------------------|
	| **Use** | Guide to RLN rate limiting             |
	| Avoid   | Limiting RLN rate                      |
	| **Use** | Understand Codex API limits            |
	| Avoid   | Understanding Codex API limits         |
	| **Use** | FAQ: Codex billing and usage           |
	| Avoid   | Questions on Codex billing and usage   |

## Subtitle <!-- group: CONC-SUBTITLE -->

- Use a Markdown H4 for the subtitle placed right under the H1 title. <!-- CONC-STRUCT-SUBTITLE-H4 -->
- One sentence only; no links, lists, or inline formatting. <!-- CONC-BEHAV-SUBTITLE-SINGLE-SENTENCE -->
- Ends with a period. <!-- CONC-BEHAV-SUBTITLE-END-PERIOD -->
- Stay under 20 words. <!-- CONC-BEHAV-SUBTITLE-LENGTH-20 -->
- Use neutral verbs that state the purpose or benefit; avoid persuasive language. <!-- CONC-BEHAV-SUBTITLE-IMPERATIVE -->
	- Examples: <!-- EXAMPLE: CONC-BEHAV-SUBTITLE-IMPERATIVE -->
		- Use: *Learn*, *Explore*, *Discover*, *Understand*
- Add new value beyond the title; don’t repeat or rephrase the H1. <!-- CONC-BEHAV-SUBTITLE-ADDS-VALUE -->

Examples:

- **Title**: *About Logos Connect communication protocol* / **Subtitle**: *Understand Waku’s peer-to-peer protocol for private, censorship-resistant messaging*
- **Title**: *Guide to Logos Storage API* / **Subtitle**: *Learn how Codex provides real-time blockchain data through a single API*

## Access callout (optional) <!-- group: CONC-ACCESS -->

This note-type callout is exclusively to alert readers about what roles, permissions, or product versions covered by this concept.

- Omit the callout entirely if no permission/product constraints exist. <!-- CONC-STRUCT-ACCESS-OMIT-IF-EMPTY -->
- Place it after the title and subtitle, before the introduction. <!-- CONC-STRUCT-ACCESS-AFTER-SUBTITLE -->
- Use the *Note* callout style. <!-- CONC-STRUCT-ACCESS-NOTE-STYLE -->
- Use label-led, scannable content (no explanations). <!-- CONC-BEHAV-ACCESS-LABELED -->
- Include permissions (software role or permission level), if applicable. <!-- CONC-BEHAV-ACCESS-PERMISSIONS -->
- Include product (product version or edition), if applicable. <!-- CONC-BEHAV-ACCESS-PRODUCT -->
- If multiple permissions/products apply, use commas. <!-- CONC-BEHAV-ACCESS-LIST-IF-MANY -->
- Do not include knowledge, skills, or required tools. <!-- CONC-BEHAV-ACCESS-SCOPE-ONLY -->

Example:

  > **Note**
  >
  > - **Permissions**: Node operators, Site operators
  > - **Product**: Logos Storage v1.4.0 or later

## Callouts <!-- CONC-CALLOUTS -->

- Use callouts sparingly and avoid placing them consecutively. <!-- CONC-STRUCT-CALLOUTS-NOT-CONSECUTIVE -->
- One callout maximum per section <!-- CONC-STRUCT-CALLOUTS-PER-SECTION-ONE -->
- Keep each callout concise (≤ 2 short sentences). If the content needs a list or multiple paragraphs, move it into the body under a heading. <!-- CONC-BEHAV-CALLOUTS-CONCISE -->
- Ensure the callout content is directly relevant to the nearby text. <!-- CONC-BEHAV-CALLOUTS-RELEVANT -->
- Use the appropriate type: *Tip*, *Note*, *Important*, or *Caution*. <!-- CONC-BEHAV-CALLOUTS-TYPE -->
- For the allowed callout types and when to use them, see the [writing rules](../../3-validating-design/writing-rules/README.md). <!-- CONC-BEHAV-CALLOUTS-TYPES-REFER-WRITING-RULES -->

Example:

> **Note:**
>
> Keep container resources within the documented limits to avoid throttling.

## Intro <!-- group: CONC-INTRO -->

Every concept requires an introduction that provides context and helps readers understand feature goals, benefits, and use cases. The introduction includes these sections, each one represented by a paragraph, list, or table:

- [Overview](#overview)
- [Diagram (optional)](#diagram-optional)
- [Use case example (optional)](#use-case-example-optional)
- [Comparison (optional)](#comparison-optional)

- This section is guidance only; do not render a visible heading or body. <!-- CONC-STRUCT-INTRO-GUIDELINES-NO-RENDER -->
- Include the intro components in this order: Overview, Diagram (optional), Use case example (optional), Comparison (optional). <!-- CONC-STRUCT-INTRO-ORDER -->
- The following child blocks render without their own headings: Overview, Diagram (optional), Use case example (optional), Comparison (optional). <!-- CONC-STRUCT-INTRO-CHILDREN-NO-HEADINGS -->

### Overview <!-- group: CONC-OVERVIEW -->

- Write a 50–100 word paragraph explaining the concept, its purpose, and its relevance. <!-- CONC-BEHAV-OVERVIEW-LENGTH-50-100 -->
- Provide context or background information to help readers understand the concept. <!-- CONC-BEHAV-OVERVIEW-CONTEXT -->
- Explain the concept's main points using one paragraph per idea. <!-- CONC-STRUCT-OVERVIEW-PARAGRAPH-PER-IDEA -->
- Link only when it helps disambiguate or deep-dive (aim ≤3 links). <!-- CONC-BEHAV-OVERVIEW-LINK-HEADERS -->
- If the overview is long or complex, link to other supportive documents. <!-- CONC-BEHAV-OVERVIEW-LINK-DOCS -->

### Diagram (optional) <!-- group: CONC-DIAGRAM -->

- Use one diagram or image per idea. <!-- CONC-STRUCT-DIAGRAM-ONE-PER-IDEA -->
- To show an architecture, flow, or process, use a Mermaid diagram. <!-- CONC-BEHAV-DIAGRAM-MERMAID -->
- For UI or CLI outputs, when the interface itself is the concept, use a screenshot or image. <!-- CONC-BEHAV-DIAGRAM-SCREENSHOT -->
- For simple relationships, use a Mermaid diagram. Even two boxes and an arrow is clearer than prose. <!-- CONC-BEHAV-DIAGRAM-SIMPLE-RELATIONSHIPS -->

### Use case example (optional) <!-- group: CONC-USE-CASE -->

- Provide a concrete, real-world scenario for the product feature. <!-- CONC-BEHAV-USE-CASE-REAL-WORLD -->
- Use a bullet list format to present multiple use cases clearly. <!-- CONC-STRUCT-USE-CASE-LIST -->

> Example:
>
> *For example, you can configure custom environment variables so they are set every time you open a codespace, and you can ensure that temporary files are retained when the codespace stops.*

### Comparison (optional) <!-- group: CONC-COMPARISON -->

- Use a paragraph or list for simple comparisons with ≤2 options. <!-- CONC-STRUCT-COMPARISON-PARAGRAPH-LIST -->
- Use a table for complex comparisons with 3 or more options. <!-- CONC-STRUCT-COMPARISON-TABLE -->
- Focus on key decision factors, such as performance, complexity, cost, prerequisites, and limitations. <!-- CONC-BEHAV-COMPARISON-KEY-FACTORS -->
- Use direct language in short sentences, so different options are easy to scan. <!-- CONC-BEHAV-COMPARISON-DIRECT-LANGUAGE -->
- Highlight trade‑offs clearly. <!-- CONC-BEHAV-COMPARISON-TRADEOFFS -->
	- Examples: <!-- EXAMPLE: CONC-BEHAV-COMPARISON-TRADEOFFS -->
		- "Option A is faster but less secure"
		- "Option B adds encryption overhead".
- Provide real-world guidance. <!-- CONC-BEHAV-COMPARISON-GUIDANCE -->
	- Examples: <!-- EXAMPLE: CONC-BEHAV-COMPARISON-GUIDANCE -->
		- "Use Option A for high-throughput scenarios"
		- "Choose Option B when data privacy is critical".

> Example:
>
> | Feature             | Relay                                       | RLN Relay                                   |
> |:--------------------|:--------------------------------------------|:--------------------------------------------|
> | Spam protection     | None – all peers can flood messages         | Enforces per-peer rate limits, economic penalties |
> | Privacy impact      | Neutral – standard Pub/Sub propagation      | Neutral – preserves Relay’s anonymity properties |
> | Resource guarantees | Relies on network-level quotas, no enforcement | Stronger resilience due to rate limiting |

## "The basics" <!-- CONC-BASICS -->

- Use a Markdown H2 with the exact text "The basics". <!-- CONC-STRUCT-BASICS-H2-TEXT -->
- Place this section after the introduction and before the next H2 section. <!-- CONC-STRUCT-BASICS-POSITION -->
- Include exactly one unordered list with three items (no code blocks or callouts here). <!-- CONC-STRUCT-EXPECT-UL-THREE -->
- Write one complete sentence per bullet (two short sentences max), and end sentences with a period. <!-- CONC-BEHAV-EXPECT-SENTENCE-1-2 -->
- Use parallel wording in each bullet (same grammatical shape), focused on main ideas. <!-- CONC-BEHAV-EXPECT-PARALLEL-OUTCOME -->
- Order items from most important to least important. <!-- CONC-BEHAV-EXPECT-PRIORITY -->
- Allow only same-page heading links; no external links. <!-- CONC-BEHAV-EXPECT-LINKS-INTERNAL -->

> Example:
>
>- *Codespaces are fully managed, cloud-based development environments you can spin up in seconds.*
>- *They run in containers that match your repository’s configuration, so every contributor gets the same setup.*  
>- *You connect from your browser, VS Code, or the JetBrains Gateway. No local installation required.*

## H2 section <!-- CONC-H2-SECTION -->

- One heading = one idea. Don't mix two ideas under the same heading. <!-- CONC-BEHAV-H2-SECTION-ONE-IDEA -->
- Arrange H2 sections from general to specific, or from most important to least important. <!-- CONC-BEHAV-H2-SECTION-ORDER -->
- Start with a paragraph before you add lists or tables. <!-- CONC-STRUCT-H2-SECTION-PARAGRAPH-FIRST -->

### Key idea description <!-- CONC-H2-KEY-IDEA -->

- First paragraph = key idea description. <!-- CONC-STRUCT-H2-KEY-IDEA-PARAGRAPH-FIRST -->

### Screenshot (optional) <!-- CONC-H2-SHOT -->

- If present, the first visual after the key idea must be an image or screenshot. <!-- CONC-STRUCT-H2-SHOT-POSITION -->
- Screenshot has non-empty alt text. <!-- CONC-STRUCT-H2-SHOT-ALT-TEXT -->
- Follow the screenshot formatting rules in the Writing Rules. <!-- CONC-BEHAV-H2-SHOT-REFER-WRITING-RULES -->

### Code (optional) <!-- CONC-H2-CODE -->

- If present, use a fenced code block; take the first fenced block after screenshot/key idea. <!-- CONC-STRUCT-H2-CODE-POSITION -->
- Snippet is short and illustrative, non-procedural. <!-- CONC-BEHAV-H2-CODE-SHORT-NONPROCEDURAL -->
- Follow the code formatting rules in the Writing Rules. <!-- CONC-BEHAV-H2-CODE-REFER-WRITING-RULES -->

## H3 section (optional) <!-- CONC-H3-SECTION -->

- H3 sections expand the preceding H2 section and must be nested under it (no orphan H3). <!-- CONC-STRUCT-H3-SECTION-NESTED -->
- Limit the document depth to H3. <!-- CONC-STRUCT-H3-SECTION-DEPTH-LIMIT-H3 -->
- First paragraph = key idea description. <!-- CONC-STRUCT-H3-SECTION-PARAGRAPH-FIRST -->
- If you add an H3, at least one sibling H3 must follow or the split is unnecessary. <!-- CONC-STRUCT-H3-SECTION-SIBLING -->

### Key idea description <!-- CONC-H3-KEY-IDEA -->

- First paragraph = key idea description. <!-- CONC-STRUCT-H3-KEY-IDEA-PARAGRAPH-FIRST -->

### Screenshot (optional) <!-- CONC-H3-SHOT -->

- If present, the first visual after the key idea must be an image or screenshot. <!-- CONC-STRUCT-H3-SHOT-POSITION -->
- Screenshot has non-empty alt text. <!-- CONC-STRUCT-H3-SHOT-ALT-TEXT -->
- Follow the screenshot formatting rules in the Writing Rules. <!-- CONC-BEHAV-H3-SHOT-REFER-WRITING-RULES -->

### Code (optional) <!-- CONC-H3-CODE -->

- If present, use a fenced code block; take the first fenced block after screenshot/key idea. <!-- CONC-STRUCT-H3-CODE-POSITION -->
- Snippet is short and illustrative, non-procedural. <!-- CONC-BEHAV-H3-CODE-SHORT-NONPROCEDURAL -->
- Follow the code rules in the Writing Rules. <!-- CONC-BEHAV-H3-CODE-REFER-WRITING-RULES -->

## Extra guidelines <!-- group: CONC-EXTRA -->

- This section is guidance only; do not render a visible heading or body. <!-- CONC-STRUCT-EXTRA-GUIDELINES-NO-RENDER -->
- Keep the procedure word count between 400 and 900 words. <!-- CONC-BEHAV-EXTRA-LENGTH -->

## Forbidden content <!-- group: CONC-FORBID -->

- Do not use H4–H6 headings. <!-- CONC-STRUCT-FORBID-H4-H6 -->
- Do not include a "Further reading" section or links to other related topics at the end of the document. <!-- CONC-BEHAV-FORBID-NO-FURTHER-READING -->
