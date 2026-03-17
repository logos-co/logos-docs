# Doc packet: [journey name]

> Fill in the sections below and paste this into the GitHub issue assigned to you for this specific journey.
> **Required sections** are the minimum for the Docs team to start a draft. If any required section is left blank, Docs will publish a stub page and flag the gap.
> **This doc packet does not replace your PR review.** After Docs writes the draft, you will review it for technical correctness on the pull request.

**Important:** Even if you provide a draft covering the user journey, you must still fill out this doc packet. The reason is that your draft may lack certain details that are important for the Docs team and the user to know. For example, you may not include every prerequisite, or you may assume certain knowledge that the Docs team or end user don't have.

---

## Required

### 1. Outcome and purpose

- **What the user achieves:** [One sentence. What is the end state after completing this journey?]
- **Why it matters:** [One to two sentences. What does this enable, unblock, or prove? Why should a developer or operator care?]
- **Key components:** [List the 2-5 main components or services involved in this journey. For each one, write one sentence on what it does and how it relates to the others.]

### 2. Scope

- **Repo:** [URL + branch, tag, or commit SHA]
- **Runtime target:** local / devnet / testnet v0.X (pick one)
- **Prerequisites:** [OS, minimum hardware requirements, tools, versions, accounts, keys, tokens, or other setup the user needs before starting]

### 3. Happy path

Provide the exact commands a user runs from a clean setup to a working result.
Include expected output or success indicators after each major step.

<!-- Copy-paste a working terminal session if possible. This is the single most -->
<!-- valuable thing you can provide. -->

```sh
[paste commands and outputs here]
```

### 4. Verification

- **Success command:** [One command or action that proves the journey is complete]
- **Expected result:** [What the user should see]

---

## Optional (improves doc quality)

### 5. Configuration

- **Required env vars / flags / config keys:** [name, purpose, example value]
- **Minimal working config snippet:** [if applicable]
- **Default ports / endpoints:** [what the user connects to]

### 6. Known issues and troubleshooting

- **Top 3 failure modes:** [symptom, cause if known, fix or workaround]
- **Limits for this release:** [features or workflows explicitly out of scope]

### 7. Additional context

- **Existing docs or specs:** [links to READMEs, Notion pages, specs, diagrams]
- **Hardware requirements:** [if this is a node or client journey: CPU, RAM, disk, network]
- **Estimated time to complete:** [rough happy-path duration]
- **Security notes:** [anything that could cause data loss, key leakage, or irreversible actions]

---

> **Reminder:** Completing this doc packet starts the documentation process.
> You will still be asked to review the draft on the pull request. For more information, see the [contributing guide](../../CONTRIBUTING.md).