// Docusaurus plugin: the procedure tech tree.
//
// Builds the prerequisite graph between procedures (see ./graph.js), lays it
// out, and writes it to @generated/tech-tree/default/tree.json for
// src/components/TechTree, which docs/get-started/tech-tree.md renders.
//
// It also enforces the Next steps convention: when a procedure lists another
// procedure as a prerequisite, the prerequisite must link back to it from its
// "## Next steps" section. `npm run build` fails on a missing link; `npm start`
// only warns, so a half-written page doesn't stop the dev server.

const path = require('path');
const {buildGraph, formatErrors, layout, docsFrom} = require('./graph');
const SECTIONS = require('../agent-ready/sections');

const DOCS_PLUGIN = 'docusaurus-plugin-content-docs';

module.exports = function techTreePlugin(context) {
  return {
    name: 'tech-tree',

    async allContentLoaded({allContent, actions}) {
      const docsContent = allContent[DOCS_PLUGIN]?.default;
      if (!docsContent) throw new Error('tech-tree: docs plugin content not found');
      const graph = buildGraph(docsFrom(docsContent, context.siteDir), path.join(context.siteDir, 'docs'));

      if (graph.errors.length) {
        const message = formatErrors(graph.errors);
        if (process.env.NODE_ENV === 'production') throw new Error(message);
        console.warn(`[WARNING] ${message}`);
      }

      const sectionIds = SECTIONS.map((s) => s.id);
      const titles = Object.fromEntries(SECTIONS.map((s) => [s.id, s.title]));
      const tree = layout(graph, sectionIds);
      const used = [...new Set(tree.nodes.map((n) => n.section))].sort(
        (a, b) => (sectionIds.indexOf(a) + 1 || 1e3) - (sectionIds.indexOf(b) + 1 || 1e3),
      );
      tree.sections = used.map((id) => ({id, title: titles[id] || id}));
      await actions.createData('tree.json', JSON.stringify(tree));
    },
  };
};
