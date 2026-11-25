---
title: Procedure tech tree
doc_type: reference
product: logos
topics: navigation, prerequisites
authors: kashepavadan
owner: logos
doc_version: 1
slug: tech-tree
sidebar_position: 5
---

import TechTree from '@site/src/components/TechTree';

# Procedure tech tree

#### See which procedures build on which, and find a path through the docs from where you are now.

Each box is a procedure. An arrow leads from a procedure to every procedure in its **Next steps** section. A solid arrow is a prerequisite: the next step lists the procedure under **Prerequisites**, so do them in that order. A dashed arrow is a suggestion: a related procedure to try next that doesn't need the first. Columns count the longest chain of arrows before a procedure, so the first column holds the procedures you can start with. Procedures that don't link to any other procedure sit together at the bottom of the first column.

## Diagram

Type in the search box to find procedures by title. The diagram then shows only the matches and their prerequisites, which are drawn with a dashed border.

Use **Show procedures for** to narrow the diagram to the kinds of user you're interested in: GUI users, CLI users, developers, or node operators. Each procedure belongs to one. While every type is shown, selecting one shows only that type. After that, selecting a type adds or removes it, and removing the last one shows every type again. The diagram keeps every prerequisite of a procedure it shows, even one for another type of user, and draws it with a dashed border.

Hover over a procedure, or tap it on a touch screen, to highlight what it needs and what it leads to. Click it, or tap it again, to open it. To keep a path highlighted, select the pin on its procedure. While a procedure is pinned, hovering over others doesn't change the highlight. Select the pin again, or press **Esc**, to unpin it.

<TechTree />

The diagram is generated from the procedures' **Next steps** and **Prerequisites** sections each time the docs are built.
