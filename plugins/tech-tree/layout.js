// Lays out the tech tree: columns by longest chain of links, groups of
// connected procedures stacked top to bottom. Pure, with no Node.js imports,
// because src/components/TechTree runs it in the browser to re-lay out the
// diagram for the selected user types.

// Columns by longest chain of links, ordered and spaced to keep edges short.
// nodeWidth includes the 32px pin button at the right of each box.
const GEOMETRY = {nodeWidth: 260, nodeHeight: 56, gap: 10, columnGap: 92, top: 48};

function layout(graph, sectionOrder = []) {
  const {nodeWidth: W, nodeHeight: H, gap: GAP, columnGap, top} = GEOMETRY;
  const ids = graph.nodes.map((n) => n.id);
  const parents = Object.fromEntries(ids.map((i) => [i, []]));
  const children = Object.fromEntries(ids.map((i) => [i, []]));
  for (const {from, to} of graph.edges) {
    children[from].push(to);
    parents[to].push(from);
  }
  const section = Object.fromEntries(graph.nodes.map((n) => [n.id, n.section]));

  const depth = {};
  const visiting = new Set();
  const depthOf = (i) => {
    if (i in depth) return depth[i];
    if (visiting.has(i)) throw new Error(`tech-tree: prerequisite cycle through ${i}`);
    visiting.add(i);
    depth[i] = parents[i].length ? 1 + Math.max(...parents[i].map(depthOf)) : 0;
    visiting.delete(i);
    return depth[i];
  };
  ids.forEach(depthOf);
  const columnCount = Math.max(0, ...ids.map((i) => depth[i])) + 1;
  const columns = Array.from({length: columnCount}, (_, k) => ids.filter((i) => depth[i] === k));
  const rank = (s) => (sectionOrder.includes(s) ? sectionOrder.indexOf(s) : sectionOrder.length);

  // Connected groups of procedures. Each is laid out on its own and the groups
  // are stacked, since nothing in the layout pulls separate groups together.
  const group = {};
  const groups = [];
  for (const start of ids) {
    if (start in group) continue;
    const members = [];
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      if (i in group) continue;
      group[i] = groups.length;
      members.push(i);
      stack.push(...parents[i], ...children[i]);
    }
    groups.push(members);
  }
  const groupRank = (g) => Math.min(...g.map((i) => rank(section[i])));
  groups.sort((a, b) => groupRank(a) - groupRank(b) || b.length - a.length);
  // Procedures with no links at all share one group at the bottom, packed like a column.
  const unlinked = groups.filter((g) => g.length === 1).flat();
  groups.splice(0, groups.length, ...groups.filter((g) => g.length > 1));
  if (unlinked.length) groups.push(unlinked);

  const pos = {};
  const y = {};
  let offset = 0;
  for (const members of groups) {
    const set = new Set(members);
    const cols = columns.map((c) => c.filter((i) => set.has(i)));

    // Order: group by section, then barycentre sweeps to reduce crossings.
    cols.forEach((c) => c.sort((a, b) => rank(section[a]) - rank(section[b]) || a.localeCompare(b)));
    const index = () => cols.forEach((c) => c.forEach((i, k) => (pos[i] = k)));
    index();
    const bary = (i, nb) => (nb[i].length ? nb[i].reduce((s, j) => s + pos[j], 0) / nb[i].length : pos[i]);
    for (let it = 0; it < 12; it++) {
      for (let k = 1; k < cols.length; k++) {
        cols[k].sort((a, b) => bary(a, parents) - bary(b, parents));
        index();
      }
      for (let k = cols.length - 2; k >= 0; k--) {
        cols[k].sort((a, b) => bary(a, children) - bary(b, children));
        index();
      }
    }

    // Vertical positions: pull each node toward its neighbours, keeping order and spacing.
    cols.forEach((c) => c.forEach((i, k) => (y[i] = k * (H + GAP))));
    const place = (c, want) => {
      if (!c.length) return;
      let prev = -Infinity;
      const placed = c.map((i) => (prev = Math.max(want(i), prev + H + GAP)));
      const shift = placed.reduce((s, v, k) => s + (v - want(c[k])), 0) / c.length;
      c.forEach((i, k) => (y[i] = placed[k] - shift));
    };
    const mean = (nb) => (i) => (nb[i].length ? nb[i].reduce((s, j) => s + y[j], 0) / nb[i].length : y[i]);
    for (let it = 0; it < 6; it++) {
      for (let k = 1; k < cols.length; k++) place(cols[k], mean(parents));
      for (let k = cols.length - 2; k >= 0; k--) place(cols[k], mean(children));
    }

    // Stack this group below the previous one.
    const lo = Math.min(...members.map((i) => y[i]));
    members.forEach((i) => (y[i] += offset - lo));
    offset = Math.max(...members.map((i) => y[i])) + H + 3 * GAP;
  }
  columns.forEach((c) => c.sort((a, b) => y[a] - y[b]));
  const x = (k) => k * (W + columnGap);

  const nodes = graph.nodes.map((n) => ({...n, depth: depth[n.id], x: x(depth[n.id]), y: Math.round(y[n.id] + top)}));
  const at = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const edges = graph.edges.map(({from, to, required}) => {
    const a = at[from];
    const b = at[to];
    const x1 = a.x + W;
    const y1 = a.y + H / 2;
    const x2 = b.x;
    const y2 = b.y + H / 2;
    const dx = Math.max(40, (x2 - x1) / 2);
    return {from, to, required, d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`};
  });
  return {
    ...GEOMETRY,
    width: columns.length ? x(columns.length - 1) + W : 0,
    height: nodes.length ? Math.max(...nodes.map((n) => n.y)) + H + 16 : 0,
    columns: columns.map((c, k) => ({x: x(k), count: c.length})),
    nodes,
    edges,
  };
}

module.exports = {GEOMETRY, layout};
