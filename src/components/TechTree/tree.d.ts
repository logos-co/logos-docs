// Written by plugins/tech-tree at build and dev-server start.
declare module '@generated/tech-tree/default/tree.json' {
  const tree: {
    nodeWidth: number;
    nodeHeight: number;
    width: number;
    height: number;
    columns: {x: number; count: number}[];
    sections: {id: string; title: string}[];
    nodes: {id: string; title: string; permalink: string; section: string; depth: number; x: number; y: number}[];
    edges: {from: string; to: string; d: string}[];
  };
  export default tree;
}
