# Reference template <!-- This is an informative header; remove it before merging your content. -->

<details>
<summary>Style rule</summary>
Use sentence-case headings.
</details>


<!-- Document layout
| #   | Element            | Format                 | Required   |
|:----|:------------------ |:---------------------- |:---------- |
| 1   | Title              | H1                     | Yes        |
| 2   | Subtitle           | H4                     | Yes        |
| 3   | Callout            | Information callout    | No         |
| 4   | Introduction       | Paragraph              | Yes        |
| 5   | H2 section title   | H2                     | Yes        |
| 6   | H2 section content | Paragraph/list/table   | Yes        |
| 7   | → Section body     | Paragraph/list/table   | Yes        |
| 8   | → Code             | Fenced block           | No         |
| 9   | → Screenshot       | Image                  | No         |
| 10  | → Callout          | Information callout    | No         |
| 11  | H3 section title   | H3                     | No         |
| 12  | H3 section content | Same as H2             | No         |
| 13  | H4 section title   | H4                     | No         |
| 14  | H4 section content | Same as H2             | No         |
| 15  | H5-H6 section      | -                      | Forbidden  |
| 16  | Further reading    | -                      | Forbidden  |

-->

---
title: ""
topic: ""
author: ""
version: ""
---

# { Title }

<!--
Guidelines:

- Reference titles use a precise noun phrase of no more than 60 characters or 7 words.
- Lead the sentence with the lookup object. For example, use "Codex API limits" instead of "Limits of the Codex API".
- Omit verbs, imperatives, and questions, such as "configure", "using", "how to", or "what is".
- If necessary, use cue words to signal the content type: "reference", "syntax", or "commands", for example.
- Avoid meta-descriptions, such as "list of", "table of", "overview of", "description of", or similar.

> ⚙️ **Examples:**
>
> - *Workflow syntax for Codex Actions*
> - *Codex CLI commands reference*
> - *Environment variables for GitHub Codespaces*
> - *Waku v2 protocol reference*

> ℹ️ **Note:**
> 
> For more information and examples, check out the [reference title](../../docs-standards/10-structure-the-content/reference-help-me-to-remember.md#title) standards.
-->

#### { Subtitle }

<!--
Guidelines:

- Single sentence with no links, list items, or formatting. Ends with a period.
- Use H4 headings format. Stay under 120 characters / 20 words.
- Focus on the lookup object (Codex CLI syntax, Waku configuration options, etc.).
- Adds new value beyond the title. It should not repeat the title or be a rephrased version of it.

> ⚙️ **Examples:**
>
>- *Workflow files use YAML syntax to define the steps and conditions for running Codex Actions.*
>- *Find information about the Codex CLI commands, including their syntax and usage.*
>- *You can use workflow commands when running shell commands in a workflow.*
>- *Using a YAML file, you can configure the Waku v2 protocol options.*

> ℹ️ **Note:**
>
> For more information, check out the [reference subtitle](../../docs-standards/10-structure-the-content/01-document-types/reference.md#subtitle) standards.
-->

(Optional) { Callout }

<!--
This information-type callout is exclusively to alert readers about who can use this feature and shouldn't be used for any other information. For example, a feature is only available to specific application role or using a specific tool or interface.

> ⚙️ **Example:**
>
> *This feature is available to users with the **Admin** role in the application.*

> ℹ️ **Note:**
>
> For more information, check out [Callouts](../../docs-standards/20-style-the-content/12-callouts.md).
-->

{ Introduction }

<!--
Guidelines:

- No headings.
- One or two sentences in a single paragraph to give context.

> ℹ️ **Note:**
>
> Check out [reference example](./reference-example.md).
-->

## { H2 section title }

<!--
Use H2 headings to break down long list or tables into smaller, more manageable sections. For example, you can use H2 headings to separate different categories of commands or options (configuration, authentication, etc.).

Guidelines:

Use simple section titles. Refer to this list of common section titles:

| Heading text (choose one) | Typical content |
|:--------------------------|:----------------|
| **Overview** / **Description** / **Purpose** | A brief definition of the item plus why and when you would use it. |
| **Usage** / **Synopsis** / **Syntax** | Show the command or a short config example with required and optional parts. |
| **Options** / **Flags** / **Parameters** / **Arguments** | A table or list that explains each option or parameter, its purpose, accepted values, and defaults. |
| **Examples** / **Example Usage** | One or more runnable examples that demonstrate common tasks. |
| **Return values** / **Output** / **Exit codes** | A table or list of possible log lines or numeric exit codes with their meaning. |
| **Errors** / **Troubleshooting** | Typical error messages, their causes, and concise fixes or links to deeper troubleshooting guides. |
-->

{ H2 section content }

<!--
Guidelines:
- One H2 section = one idea. Don't mix two ideas under the same heading.
- Arrange H2 sections from general to specific, or from most important to least important.

> ℹ️ **Note:**
>
> For more information, check out [Using headings to organize content](../../docs-standards/10-structure-the-content/concept-help-me-to-understand.md#using-headings-to-organize-content) in the docs standards.
-->

{ Paragraph, list, or table }

<!--
Add here the reference information. Use tables or lists primarily. When in doubt about the format, read [Tables](../../docs-standards/20-style-the-content/8-tables.md).
-->

(Optional) { Code }

<!--
> ℹ️ **Note:**
>
> For information about code formatting, check out [Code](../../docs-standards/20-style-the-content/13-code.md).
-->

(Optional) { Screenshot }

<!--
> ℹ️ **Note:**
>
> For more information, check out [Screenshots](../../docs-standards/30-work-with-media/02-screenshots.md).
-->

(Optional) ### { H3 section title }

<!-- **First H3** -->

<!--
Guidelines:
>
- H3 is used to break down the main H2 section into smaller, more manageable parts.
- Use it to provide additional details or sub-sections that are relevant to the main section.
- Only add an H3 when you have two or more sibling subsections or a clear need for a linkable anchor (e.g., "Parameters", "Example").
- Try to limit the document depth to H3.
- For content, use the same format as H2 sections: paragraph, list, or table.
-->

(Optional) { H3 section content }

{ Paragraph, list, or table content }

(Optional) { Screenshot }

(Optional) { Code }

(Optional) ### { H3 section title }

<!-- **Second H3** -->

{ Paragraph, list, or table content }

(Optional) { Screenshot }

(Optional) { Code }

(Optional) #### { H4 section title }

<!--
Guidelines:

- H4 headings are rarely used and you should avoid them.
- In most cases, using a table or list under the previous header is a better option.
- For content, use the same format as H2 sections: paragraph, list, or table.
- Stop at H4. Deeper levels (H5, H6) are forbidden.
-->

(Optional) #### { H4 section content }

{ Paragraph, list, or table content }

(Optional) { Screenshot }

(Optional) { Code }
