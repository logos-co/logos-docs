// Written by plugins/tech-tree at build and dev-server start.
declare module '@generated/tech-tree/default/tree.json' {
  const tree: {
    sections: {id: string; title: string}[];
    userTypes: {id: string; label: string}[];
    nodes: {id: string; title: string; permalink: string; section: string; userType: string}[];
    edges: {from: string; to: string; required: boolean}[];
  };
  export default tree;
}

// plugins/tech-tree/layout.js, which the component runs in the browser.
declare module '@site/plugins/tech-tree/layout' {
  type Node = {id: string; title: string; permalink: string; section: string; userType: string};
  type Edge = {from: string; to: string; required: boolean};
  export function layout(
    graph: {nodes: Node[]; edges: Edge[]},
    sectionOrder?: string[],
  ): {
    nodeWidth: number;
    nodeHeight: number;
    width: number;
    height: number;
    columns: {x: number; count: number}[];
    nodes: (Node & {depth: number; x: number; y: number})[];
    edges: (Edge & {d: string})[];
  };
}
