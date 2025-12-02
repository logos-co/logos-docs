# Reference template

---
title:
doc_type: reference
product: # [storage | blockchain | messaging]
topics: []
authors: # GitHub username
owner: logos
doc_version: # increased by one after every update
slug:
---

## Template overview

| Element              | Format                         | Required   | ID               |
|:---------------------|:-------------------------------|:----------:|:---------------- |
| Title                | H1                             | Yes        | `REF-TITLE`      |
| Subtitle             | H4                             | Yes        | `REF-SUBTITLE`   |
| Access callout       | Note-type callout              | No         | `REF-ACCESS`     |
| Callouts             | Tip, Note, Important, Caution  | No         | `REF-CALLOUTS`   |
| Intro                |                                | Yes        | `REF-INTRO`      |
| H2 section           | H2 + body (container)          | Yes        | `REF-H2-SECTION` |
| H3 section           | H3 + body (container)          | No         | `REF-H3-SECTION` |
| Extra guidelines     |                                | Yes        | `REF-EXTRA`      |
| Forbidden content    |                                | Forbidden  | `REF-FORBID`     |

## Title <!-- group: REF-TITLE -->

- Use Markdown H1 headings. <!-- REF-STRUCT-TITLE-H1 -->
- Reference titles use a precise noun phrase. <!-- REF-BEHAV-TITLE-NOUN-PHRASE -->
	- Examples:

		| Bad (vague, verb-led)        | Good (precise noun phrase)            |
		| ---------------------------- | ------------------------------------- |
		| Understanding authentication | OAuth 2.0 token request parameters    |
		| Handling errors              | CLI exit codes and meanings           |
		| Working with storage         | Object storage bucket lifecycle rules |

- Omit verbs, imperatives, and questions, such as `configure`, `using`, `how to`, or `what is`. <!-- REF-BEHAV-TITLE-OMIT-CERTAIN-WORDS -->
- Aim for 25 to 60 characters; 80 characters maximum. <!-- REF-BEHAV-TITLE-LENGTH-25-80 -->
- Lead the sentence with the lookup object. <!-- REF-BEHAV-TITLE-LOOKUP-OBJECT -->
	- Example: use `Logos Storage API limits` instead of `Limits of the Logos Storage API`.
- If necessary, use cue words to signal the content type: `reference`, `syntax`, or `commands`, for example. <!-- REF-BEHAV-TITLE-CUE-WORDS -->
- Avoid meta-descriptions, such as `list of`, `table of`, `overview of`, `description of`, or similar. <!-- REF-BEHAV-TITLE-OMIT-META -->
- Capitalize only the first word and any proper nouns (sentence-style capitalization). <!-- REF-BEHAV-TITLE-SENTENCE-CASE -->
- Don't use punctuation marks, such as colons, semicolons, or dashes. <!-- REF-BEHAV-TITLE-NO-PUNCT -->

> **Examples:**
>
> - *Workflow syntax for Logos Storage Actions*
> - *Logos Messaging CLI commands reference*
> - *Environment variables for GitHub Codespaces*
> - *Logos Blockchain v2 protocol reference*

## Subtitle <!-- group: REF-SUBTITLE -->

- Use a Markdown H4 for the subtitle placed right under the H1 title. <!-- REF-STRUCT-SUBTITLE-H4 -->
- One sentence only; no links, lists, or inline formatting. <!-- REF-BEHAV-SUBTITLE-SINGLE-SENTENCE -->
- Ends with a period. <!-- REF-BEHAV-SUBTITLE-END-PERIOD -->
- Stay under 20 words. <!-- REF-BEHAV-SUBTITLE-LENGTH-20 -->
- Use neutral verbs that state the purpose or benefit; avoid persuasive language. <!-- REF-BEHAV-SUBTITLE-IMPERATIVE -->
	- Examples: `Understand`, `Review`, `See`, `Check`.
- Add new value beyond the title; don’t repeat or rephrase the H1. <!-- REF-BEHAV-SUBTITLE-ADDS-VALUE -->

Examples:

- **Title**: *Logos Storage limits* / **Subtitle**: *Understand the limits and resource constraints that apply to Logos Storage.*
- **Title**: *Logos Blockchain v2 protocol reference* / **Subtitle**: *Review the network parameters and consensus rules used in Logos Blockchain.*

## Access callout (optional) <!-- group: REF-ACCESS -->

This note-type callout is exclusively to alert readers about what roles, permissions, or product versions this reference applies to.

- Omit the callout entirely if no permission/product constraints exist. <!-- REF-STRUCT-ACCESS-OMIT-IF-EMPTY -->
- Place it after the title and subtitle, before the introduction. <!-- REF-STRUCT-ACCESS-AFTER-SUBTITLE -->
- Use the `Note` callout style. <!-- REF-STRUCT-ACCESS-NOTE-STYLE -->
- Use label-led, scannable content (no explanations). <!-- REF-BEHAV-ACCESS-LABELED -->
- Include permissions (software role or permission level), if applicable. <!-- REF-BEHAV-ACCESS-PERMISSIONS -->
- Include product (product version or edition), if applicable. <!-- REF-BEHAV-ACCESS-PRODUCT -->
- If multiple permissions/products apply, use commas. <!-- REF-BEHAV-ACCESS-LIST-IF-MANY -->
- Do not include knowledge, skills, or required tools. <!-- REF-BEHAV-ACCESS-SCOPE-ONLY -->

Example:

  > **Note**
  >
  > - **Permissions**: Node operators, Site operators
  > - **Product**: Logos Storage v1.4.0 or later

## Callouts <!-- group: REF-CALLOUTS -->

- Use callouts sparingly and avoid placing them consecutively. <!-- REF-STRUCT-CALLOUTS-NOT-CONSECUTIVE -->
- One callout maximum per section. <!-- REF-STRUCT-CALLOUTS-PER-SECTION-ONE -->
- Keep each callout concise (≤ 2 short sentences). If the content needs a list or multiple paragraphs, move it into the body under a heading. <!-- REF-BEHAV-CALLOUTS-CONCISE -->
- Ensure the callout content is directly relevant to the nearby text. <!-- REF-BEHAV-CALLOUTS-RELEVANT -->
- Use the appropriate type: `Tip`, `Note`, `Important`, or `Caution`. <!-- REF-BEHAV-CALLOUTS-TYPE -->
- For the allowed callout types and when to use them, see the [writing rules](../../3-validating-design/writing-rules/README.md). <!-- REF-BEHAV-CALLOUTS-TYPES-REFER-WRITING-RULES -->

Example:

> **Note:**
>
> Keep container resources within the documented limits to avoid throttling.

## Intro <!-- group: REF-INTRO -->

Every reference requires a short introduction that provides context.

- Write one or two 50- to 100-word paragraphs explaining the purpose and relevance of the reference article. <!-- REF-BEHAV-INTRO-LENGTH-50-100 -->
- Provide context or background information to help readers understand the information. <!-- REF-BEHAV-INTRO-CONTEXT -->
- Link only when it helps disambiguate or deep-dive (aim ≤2 links). <!-- REF-BEHAV-INTRO-LINK-HEADERS -->
- If the intro is long or complex, link to other supportive documents. <!-- REF-BEHAV-INTRO-LINK-DOCS -->
- Avoid meta-descriptions, such as `The following table [...]`, `This article includes the list of [...]`, or similar. <!-- REF-BEHAV-INTRO-OMIT-META -->
- This section is guidance only; do not render a visible heading or body. <!-- REF-STRUCT-INTRO-GUIDELINES-NO-RENDER -->

## H2 section <!-- group:REF-H2-SECTION -->

- Break down long lists or tables into smaller, more manageable sections using H2 headings. <!-- REF-BEHAV-H2-SECTION-BREAKDOWN -->
	- Examples: Use different lists or tables for different categories, like `Configuration`, `Authentication`, or `Networking`.
- One heading = one concept. Don't mix two concepts under the same heading. <!-- REF-BEHAV-H2-SECTION-ONE-IDEA -->
- Arrange H2 sections from general to specific, or from most important to least important. <!-- REF-BEHAV-H2-SECTION-ORDER -->
- Start with a paragraph before you add lists or tables. <!-- REF-STRUCT-H2-SECTION-PARAGRAPH-FIRST -->
- Refer to this list of common titles for H2 and H3 headings: <!-- REF-BEHAV-H2-H3-SECTIONS-COMMON-TITLES -->

	| Typical content | Heading text (choose one) |
	|:---|:---|
	| Brief definition + when/why to use it | `Overview` / `Description` / `Purpose` |
	| Command or short config example with required/optional parts | `Usage` / `Synopsis` / `Syntax` |
	| Options/parameters with purpose, accepted values, defaults | `Options` / `Flags` / `Parameters` / `Arguments` |
	| Runnable examples of common tasks | `Examples` / `Example usage` |
	| Log lines or exit codes and their meaning | `Return values` / `Output` / `Exit codes` |
	| Typical errors, causes, and concise fixes | `Errors` / `Troubleshooting` |

### Tables, lists, or paragraphs <!-- group: REF-H2-SECTION-CONTENT -->

- Use tables or lists primarily to present reference data. <!-- REF-BEHAV-H2-SECTION-TABLES-LISTS -->
- If present, screenshots have non-empty alt text. <!-- REF-STRUCT-H2-SHOT-ALT-TEXT -->
- Follow the screenshot formatting rules in the Writing Rules. <!-- REF-BEHAV-H2-SHOT-REFER-WRITING-RULES -->
- If code is present, use a fenced code block. <!-- REF-STRUCT-H2-FENCED-CODE -->
- Code snippets are short and illustrative. <!-- REF-BEHAV-H2-CODE-SHORT-ILLUSTRATIVE -->
- Follow the code formatting rules in the Writing Rules. <!-- REF-BEHAV-H2-CODE-REFER-WRITING-RULES -->

## H3 section (optional) <!-- group: REF-H3-SECTION -->

- H3 sections expand the preceding H2 section and must be nested under it (no orphan H3). <!-- REF-STRUCT-H3-SECTION-NESTED -->
- If you add an H3, at least one sibling H3 must follow or the split is unnecessary. <!-- REF-STRUCT-H3-SECTION-SIBLING -->
- Use tables or lists primarily to present reference data. <!-- REF-BEHAV-H3-SECTION-TABLES-LISTS -->
- Write a brief first sentence or paragraph with a description of the content. <!-- REF-STRUCT-H3-SECTION-PARAGRAPH-FIRST -->
- If present, screenshots have non-empty alt text. <!-- REF-STRUCT-H3-SHOT-ALT-TEXT -->
- Follow the screenshot formatting rules in the Writing Rules. <!-- REF-BEHAV-H3-SHOT-REFER-WRITING-RULES -->
- If code is present, use a fenced code block. <!-- REF-STRUCT-H3-FENCED-CODE -->
- Code snippets are short and illustrative. <!-- REF-BEHAV-H3-CODE-SHORT-ILLUSTRATIVE -->
- Follow the code formatting rules in the Writing Rules. <!-- REF-BEHAV-H3-CODE-REFER-WRITING-RULES -->

## Extra guidelines <!-- group: REF-EXTRA -->

- This section is guidance only; do not render a visible heading or body. <!-- REF-STRUCT-EXTRA-GUIDELINES-NO-RENDER -->
- Keep narrative text concise (aim 400–900 words). Tables and parameter lists are not included in this count. <!-- REF-BEHAV-EXTRA-CONCISE-NARRATIVE -->

## Forbidden content <!-- group: REF-FORBID -->

- Do not use H4–H6 headings. <!-- REF-STRUCT-FORBID-H4-H6 -->
- Do not include a "Further reading" section or links to other related topics at the end of the document. <!-- REF-BEHAV-FORBID-NO-FURTHER-READING -->
