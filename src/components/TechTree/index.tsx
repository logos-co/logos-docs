// The procedure tech tree on /get-started/tech-tree. The graph and its layout
// come from plugins/tech-tree; this only draws them and handles highlighting.

import React, {useEffect, useMemo, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import tree from '@generated/tech-tree/default/tree.json';
import styles from './styles.module.css';

const COLUMN_LABELS = ['Start here', '1 step in', '2 steps in', '3 steps in', '4 steps in'];
const columnLabel = (k: number) => COLUMN_LABELS[k] ?? `${k} steps in`;

// Titles keep their inline code (`plan` and `apply`).
function Title({text}: {text: string}) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part,
      )}
    </>
  );
}

const plain = (title: string) => title.replace(/`/g, '');

export default function TechTree(): React.ReactElement {
  const [active, setActive] = useState<string | null>(null);
  const pointer = useRef('mouse');

  const {byId, parents, children} = useMemo(() => {
    const parents: Record<string, string[]> = {};
    const children: Record<string, string[]> = {};
    for (const n of tree.nodes) {
      parents[n.id] = [];
      children[n.id] = [];
    }
    for (const e of tree.edges) {
      children[e.from].push(e.to);
      parents[e.to].push(e.from);
    }
    return {byId: Object.fromEntries(tree.nodes.map((n) => [n.id, n])), parents, children};
  }, []);

  const {up, down} = useMemo(() => {
    const walk = (start: string, nb: Record<string, string[]>) => {
      const seen = new Set<string>();
      const stack = [...nb[start]];
      while (stack.length) {
        const j = stack.pop()!;
        if (!seen.has(j)) {
          seen.add(j);
          stack.push(...nb[j]);
        }
      }
      return seen;
    };
    return active ? {up: walk(active, parents), down: walk(active, children)} : {up: new Set<string>(), down: new Set<string>()};
  }, [active, parents, children]);

  useEffect(() => {
    const clear = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.(`.${styles.node}`)) setActive(null);
    };
    document.addEventListener('pointerdown', clear);
    return () => document.removeEventListener('pointerdown', clear);
  }, []);

  const lit = (id: string) => id === active || up.has(id) || down.has(id);
  const edgeLit = (from: string, to: string) =>
    (up.has(from) && (to === active || up.has(to))) || ((from === active || down.has(from)) && down.has(to));

  const status = active
    ? (() => {
        const needs = parents[active].map((i) => plain(byId[i].title));
        const leads = children[active].map((i) => plain(byId[i].title));
        return (
          <>
            <strong>{plain(byId[active].title)}</strong>.{' '}
            {needs.length ? `Needs: ${needs.join('; ')}. ` : 'No prerequisite procedures. '}
            {leads.length ? `Next steps: ${leads.join('; ')}.` : 'No procedure lists it as a prerequisite.'}
          </>
        );
      })()
    : `${tree.nodes.length} procedures, ${tree.edges.length} prerequisite links. Hover over or select a procedure to trace its path.`;

  return (
    <div className={styles.root}>
      <div className={styles.legend}>
        {tree.sections.map((s) => (
          <span key={s.id} style={{'--sec': `var(--tt-${s.id}, var(--ifm-color-primary))`} as React.CSSProperties}>
            <i />
            {s.title}
          </span>
        ))}
      </div>
      <div className={styles.scroller}>
        <div
          className={`${styles.stage} ${active ? styles.focus : ''}`}
          style={{width: tree.width, height: tree.height}}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}>
          <svg width={tree.width} height={tree.height} viewBox={`0 0 ${tree.width} ${tree.height}`} aria-hidden="true">
            {tree.edges.map((e) => (
              <path key={`${e.from}>${e.to}`} d={e.d} className={`${styles.edge} ${edgeLit(e.from, e.to) ? styles.on : ''}`} />
            ))}
          </svg>
          {tree.columns.map((c, k) => (
            <div key={k} className={styles.colhead} style={{left: c.x}}>
              <b>{c.count}</b>
              {columnLabel(k)}
            </div>
          ))}
          {tree.nodes.map((n) => (
            <Link
              key={n.id}
              to={n.permalink}
              className={`${styles.node} ${lit(n.id) ? styles.on : ''} ${n.id === active ? styles.self : ''}`}
              style={
                {
                  left: n.x,
                  top: n.y,
                  width: tree.nodeWidth,
                  height: tree.nodeHeight,
                  '--sec': `var(--tt-${n.section}, var(--ifm-color-primary))`,
                } as React.CSSProperties
              }
              onPointerDown={(e) => (pointer.current = e.pointerType)}
              // Not onMouseEnter: @docusaurus/Link overrides it with its own prefetch handler.
              onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(n.id)}
              onFocus={() => setActive(n.id)}
              onClick={(e) => {
                if (pointer.current !== 'mouse' && active !== n.id) {
                  e.preventDefault();
                  setActive(n.id);
                }
              }}>
              <span>
                <Title text={n.title} />
              </span>
            </Link>
          ))}
        </div>
      </div>
      <p className={styles.status} aria-live="polite">
        {status}
      </p>
    </div>
  );
}
