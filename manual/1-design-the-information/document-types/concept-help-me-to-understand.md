# Concept - Help me to understand

> ℹ️ **Note:**
>
> For the template associated to this topic, see [concept template](../../../templates/concept/concept-template.md).

Concept topics build the mental model behind a feature or product. They explain the "why" so users can understand the purpose and benefits of the feature. For example, a developer starting with Waku might need to understand the concept of "Waku nodes" before they can effectively use the Waku protocol.

Concepts provide non-procedural information that complements other topic types, such as [procedure](./procedure-help-me-to-do.md) or [reference](./reference-help-me-to-remember.md) topics, but never replaces or duplicates them.

## When to use a concept topic

Create a concept topic whenever readers must understand background knowledge before:

- Using a feature or product
- Implementing an integration
- Choosing between alternative options
- Understand non-obvious behavior

> ℹ️ **Note:**
>
> A list of frequently asked questions (FAQs) falls under the concept category.

## Write a concept topic

### Filenames

Check out the [file names and location rules](../../../CONTRIBUTING.md#file-names-and-location-rules) for more information.

### General rules

- Target for documents between 900 and 1 500 words. Split longer ideas into separate concept topics.
- Replace dense prose with [lists](../../20-style-the-content/06-bullet-lists.md) and [tables](../../20-style-the-content/08-tables.md) to improve readability.
- Richly [link](../../20-style-the-content/10-links.md) to related topics, especially procedure and reference topics.
- Include [diagrams or images](../../30-work-with-media/_index.md) to illustrate complex ideas or workflows.

> ☝️ **Tip:**
>
> In Visual Studio Code, use the [Live Word Count](https://marketplace.visualstudio.com/items?itemName=Taptic.live-word-count) ↗ extension that is part of the recommended repository extensions.

## Concept topic structure

Concept topics follow a specific structure to ensure consistency and clarity. This table outlines the required elements and their formats:

| #   | Element                                   | Format                        | Required   |
|:----|:------------------------------------------|:------------------------------|:-----------|
| 1   | [Title](#title)                           | H1                            | Yes        |
| 2   | [Subtitle](#subtitle)                     | H4                            | Yes        |
| 3   | [Callout](#callout)                       | Information callout           | No         |
| 4   | [Introduction](#introduction)             | Paragraph                     | Yes        |
| 5   | [Diagram or image](#diagram-or-image)     | Mermaid diagram or image      | No         |
| 6   | [Use case example](#use-case-example)     | Paragraph, list               | No         |
| 7   | [Comparison](#comparison)                 | Paragraph, list, table        | No         |
| 8   | ["The basics"](#the-basics) heading       | H2                            | Yes        |
| 9   | ["The basics"](#the-basics) list          | Unordered list                | Yes        |
| 10  | [H2 section](#h2-h4-sections) title       | H2                            | Yes        |
| 11  | [H2 section](#h2-h4-sections) content     | Paragraph, others             | Yes        |
| 12  | [H3 section](#h2-h4-sections) title       | H3                            | No         |
| 13  | [H3 section](#h2-h4-sections) content     | Paragraph, others             | No         |
| 14  | [H4 section](#h2-h4-sections) title       | H4                            | No         |
| 15  | [H4 section](#h2-h4-sections) content     | Paragraph, others             | No         |
| 16  | [H5-H6 section](#h2-h4-sections)          | -                             | Forbidden  |
| 17  | [Further reading](#further-reading)       | -                             | Forbidden  |

### Title

Concept titles should explain, not instruct. They should be descriptive and concise (no more than 60 characters), indicating the main idea of the concept.

Guidelines:

1. Use cue words such as "Guide to", "About", "Understand", "FAQ", or "Introduction to". Do not use active verbs like "Learn" or "How to".
2. For verbs, use the base form over the gerund form. For example, use "Understand" instead of "Understanding".
3. Start with "About" to signal background reading. Avoid gerunds that look like procedures.
4. Use the "FAQ:" prefix for question compilations. Don't phrase FAQs as tasks.
5. When none of the cue words fit, choose a concise noun phrase.

| Rule | Usage         | ⚙️ Example                        |
|:-----|:--------------|:---------------------------------|
|  1   | **Correct**   | *Guide to RLN rate limiting*     |
|      | Incorrect     | *RLN rate limiting*              |
|  2   | **Correct**   | *Understand Codex API limits*    |
|      | Incorrect     | *Understanding Codex API limits* |
|  3   | **Correct**   | *About Waku GossipSub relay*     |
|      | Incorrect     | *Running Waku GossipSub relay*   |
|  4   | **Correct**   | *FAQ: Codex billing*             |
|      | Incorrect     | *Billing with Codex*             |
|  5   | **Correct**   | *Waku message encryption layers* |
|      | Incorrect     | *Encrypt messages in Waku*       |

### Subtitle

One short, imperative sentence that (a) defines the topic in plain language and (b) states the primary benefit or outcome. It answers the reader’s silent question, "Why should I care?".

Guidelines:

- Single sentence with no links, list items, or formatting. Ends with a period.
- Use H4 format. Stay under 120 characters / 20 words.
- Use imperative verbs to describe the topic's purpose or benefit: *Learn*, *Explore*, *Understand*, *Discover*, and so on.
- Adds new value beyond the title. It should not repeat the title or be a rephrased version of it.

> ⚙️ **Example:**
>
>- *Understand Waku’s peer-to-peer protocol for private, censorship-resistant messaging.*
>- *Learn how Codex provides real-time blockchain data through a single API.*

### Callout (optional)

This information-type [callout](../../20-style-the-content/12-callouts.md) is exclusively to alert readers about who can use this feature and shouldn't be used for any other information. For example, a feature is only available to specific application role or using a specific tool or interface.

> ⚙️ **Example:**
>
> *This feature is available to users with the **Admin** role in the application.*

### Introduction

Guidelines:

- Start with one or two lead sentences in a single paragraph that explains the concept, its purpose, and its relevance. This lead should be concise and engaging, ideally no more than 50 words.
- After the lead, explain the concept's main points using one paragraph per idea.
- If necessary, provide context or background information to help readers understand the concept.
- Link to related topics or headers in the same document to support the reader's gathering of information.

> ⚙️ **Example:**
>
>*Codex uses erasure coding and zero‑knowledge proofs to ensure stored data remains available and tamper‑proof in a fully decentralized network. This makes it safe and reliable for long‑term storage of critical information—without relying on any single provider.*
>
>*Erasure coding breaks each file into redundant fragments so that data can be reconstructed even if some nodes go offline, while ZK-based proofs provide lightweight verification that nodes are still storing their pieces, without revealing the data itself. Codex augments this with a lazy‑repair mechanism that restores missing fragments efficiently and an incentive‑driven marketplace where nodes stake collateral to back their storage promises—slashing misbehaving nodes and rewarding reliable ones.*

### Diagram or image (optional)

This section is part of the introduction and doesn't use a heading.

Guidelines:

- Use one diagram or image per concept. If you need two, the concept needs splitting or the second visual belongs to another H2 section.
- To show an architecture, flow, or process, use a Mermaid diagram.
- For UI or CLI outputs, when the interface itself is the concept, use a screenshot or image.
- For simple relationships, use a Mermaid diagram. Even two boxes and an arrow is clearer than prose.

> ℹ️ **Note:**
>
> For more information, check out the [diagrams](../../30-work-with-media/03-diagrams.md#mermaid-diagrams) and [screenshots](../../30-work-with-media/02-screenshots.md) information.

### Use case example (optional)

This section is part of the introduction and doesn't use a heading.

Provide a concrete, real-world scenario for the product feature. It answers the reader's silent question, "How can I use this feature in my work?" Use a bullet list format to present multiple use cases clearly.

> ⚙️ **Example:**
>
> *For example, you can configure custom environment variables so they are set every time you open a codespace, and you can ensure that temporary files are retained when the codespace stops.*

### Comparison (optional)

This section is part of the introduction and doesn't use a heading.

Use this section to help readers choose the right option among alternatives. This is specially useful when the concept has different implementations.

Guidelines:

- Use a list for simple comparisons or a table for more complex ones.
- Focus on key decision factors, such as performance, complexity, cost, prerequisites, and limitations.
- Use direct language in short sentences so different options are easy to scan.
- Highlight trade‑offs clearly. For example, "Option A is faster but less secure" or "Option B adds encryption overhead".
- Provide real-world guidance. For example, "Choose A if you need X, choose B if you care about Y".

> ⚙️ **Example:**
>
> | Feature             | Relay                                         | RLN Relay                                         |
> |:--------------------|:----------------------------------------------|:--------------------------------------------------|
> | Spam protection     | None – all peers can flood messages           | Enforces per-peer rate limits, economic penalties |
> | Privacy impact      | Neutral – standard Pub/Sub propagation        | Neutral – preserves Relay’s anonymity properties  |
> | Resource guarantees | Relies on network-level quotas, no enforcement| Stronger resilience due to rate limiting          |

### "The basics" section

This section provides a high-level overview of the concept, covering the most important takeaways without going into detail. Each point should be a concise statement that captures the essence of the concept.

Guidelines:

- Use the "The basics" H2 heading for this section.
- Write a single unordered list with three bullet points that summarize the concept.
- Order the points from most important to least important.
- Aim for one sentence per bullet point, maximum two very short ones.

> ⚙️ **Example:**
>
>- *Codespaces are fully managed, cloud-based development environments you can spin up in seconds.*
>- *They run in containers that match your repository’s configuration, so every contributor gets the same setup.*  
>- *You connect from your browser, VS Code, or the JetBrains Gateway. No local installation required.*

### H2-H4 sections

Headings structure the content into logical sections. Use H2 for key concepts, H3 for subconcepts, and H4 for further subdivisions if necessary.

Guidelines:

- One heading = one concept. Don't mix two ideas under the same heading.
- Arrange H2 sections from general to specific, or from most important to least important.
- Start with a paragraph before you add lists or tables.
- When possible, limit the document depth to H3.
- Stop at H4. Deeper levels (H5, H6) are forbidden.
- If you add an H3, at least one sibling H3 must follow or the split is unnecessary.

#### Using headings to organize content

Each heading level answers one question:

| Heading | Answers the question...                                        | Content to include                                                                                             |
|:--------|:---------------------------------------------------------------|:---------------------------------------------------------------------------------------------------------------|
| H2      | What is the main concept I need to understand first?           | The core concept, such as Architecture, Security Model, or Lifecycle.                                              |
| H3      | What are the key components or behaviors of this concept?      | (Optional) Sub-concepts that relate only to the parent H2.                                                     |
| H4      | Are there specific details or edge cases within this subtopic? | (Optional) Use when an H3 contains two or more distinct pieces of information that need further splitting. |

Quick decision tree for section headings:

```markdown
Need to add a section?
├─ Is it a brand-new core concept?             → H2
├─ Is it part of an existing H2 concept?       → H3
└─ Is it a detail that splits an H3 concept?   → H4 (and only if unavoidable)
```

⚙️ **Example:**

```markdown
## Architecture
{ Paragraph }

### Components
- Compute host  
- Container image  
- Virtual file system  

### Networking
{ Paragraph }

#### Port forwarding rules   <-- only because Networking had two separate cases
{ Paragraph }
```

### Further reading (forbidden)

This section is forbidden in concept topics. Instead, link to related procedure or reference topics within the content.

---

*Examples adapted from GitHub Docs (CC BY 4.0). See [Attributions](/ATTRIBUTIONS.md) for details.*
