// Docusaurus plugin: the procedure tech tree.
//
// Builds the graph between procedures (see ./graph.js) and writes it to
// @generated/tech-tree/default/tree.json for src/components/TechTree, which
// docs/get-started/tech-tree.md renders. The component lays it out (see
// ./layout.js) for whichever user types the reader selects.
//
// It also enforces two conventions. When a procedure lists another procedure
// as a prerequisite, the prerequisite must link back to it from its
// "## Next steps" section. And every procedure must carry exactly one
// `user_type` (see ./user-types.js). `npm run build` fails on either;
// `npm start` only warns, so a half-written page doesn't stop the dev server.

const path = require('path');
const {buildGraph, formatErrors, formatUserTypeErrors, docsFrom} = require('./graph');
const {layout} = require('./layout');
const {USER_TYPES} = require('./user-types');
const SECTIONS = require('../agent-ready/sections');

const DOCS_PLUGIN = 'docusaurus-plugin-content-docs';

module.exports = function techTreePlugin(context) {
  return {
    name: 'tech-tree',

    async allContentLoaded({allContent, actions}) {
      const docsContent = allContent[DOCS_PLUGIN]?.default;
      if (!docsContent) throw new Error('tech-tree: docs plugin content not found');
      const graph = buildGraph(docsFrom(docsContent, context.siteDir), path.join(context.siteDir, 'docs'));

      const messages = [
        graph.errors.length && formatErrors(graph.errors),
        graph.userTypeErrors.length && formatUserTypeErrors(graph.userTypeErrors),
      ].filter(Boolean);
      if (messages.length) {
        const message = messages.join('\n');
        if (process.env.NODE_ENV === 'production') throw new Error(message);
        console.warn(`[WARNING] ${message}`);
      }

      for (const {from, to} of graph.skipped) {
        console.info(`[INFO] tech-tree: not drawing the Next steps link ${from} -> ${to}, which would close a loop.`);
      }

      const sectionIds = SECTIONS.map((s) => s.id);
      const titles = Object.fromEntries(SECTIONS.map((s) => [s.id, s.title]));
      layout(graph, sectionIds); // Throws on a prerequisite loop, so the build catches it.
      const used = [...new Set(graph.nodes.map((n) => n.section))].sort(
        (a, b) => (sectionIds.indexOf(a) + 1 || 1e3) - (sectionIds.indexOf(b) + 1 || 1e3),
      );
      const tree = {
        sections: used.map((id) => ({id, title: titles[id] || id})),
        userTypes: USER_TYPES.filter((t) => graph.nodes.some((n) => n.userType === t.id)),
        nodes: graph.nodes,
        edges: graph.edges,
      };
      await actions.createData('tree.json', JSON.stringify(tree));
    },
  };
};
