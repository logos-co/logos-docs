---
title: Choose your path
doc_type: reference
product: logos
topics: navigation, prerequisites
authors: kashepavadan
owner: logos
doc_version: 1
slug: choose-your-path
sidebar_position: 2
---

import TechTree from '@site/src/components/TechTree';

# Choose your path

#### See which procedures build on which, and find a path through the docs to whatever you'd like to do.

**Ready to use Logos, but not sure where to start?** Explore what is possible with a "tech tree" generated directly from the Logos documentation. All procedure pages on the site are displayed as boxes, with lines tracing potential sequences to try. You can narrow down the option by selecting how you'd like to use Logos (for example, GUI vs CLI), or search for a specific term. When you've selected your path, click on the text in each box to be directed to the relevant page.

## Tech tree diagram

Solid lines leading to a box indicate prerequisites, while dashed lines are related procedures suggested in a page's Next Steps section. Type in the search box to find procedures by title. The diagram then shows only the matches and their prerequisites, which are drawn with a dashed border.

Use **Show procedures for** to narrow the diagram to the kind of user you are: GUI, CLI, developer, or node operator. The diagram keeps every prerequisite of a procedure it shows, even one for another type of user, and draws it with a dashed border.

:::tip
If you want to build on Logos as a developer, make sure to also check out [Integrate Logos into your application](../build-an-app/integrate-logos-into-your-application.md).
:::

Hover over a procedure, or tap it on a touch screen, to highlight what it needs and what it leads to. Click it, or tap it again, to open it. To keep a path highlighted, select the pin icon in the box. While a procedure is pinned, hovering over others doesn't change the highlight. Select the pin again, or press **`Esc`**, to unpin it.

<TechTree />

The diagram is generated from the procedures' **Next steps** and **Prerequisites** sections each time the docs are built.
