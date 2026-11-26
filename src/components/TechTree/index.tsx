// The procedure tech tree on /get-started/choose-your-path. The graph comes from
// plugins/tech-tree; this filters it by user type, lays it out with the
// plugin's layout(), draws it and handles highlighting.

import React, {useEffect, useMemo, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import tree from '@generated/tech-tree/default/tree.json';
import {layout} from '@site/plugins/tech-tree/layout';
import styles from './styles.module.css';

const SECTION_ORDER = tree.sections.map((s) => s.id);

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

// The pin button sits inside the right end of each box; styles.module.css pads the title clear of it.
const PIN_SIZE = 32;

// Drawn to match the home page icons: 24px grid, 2px square-ended strokes.
function PinIcon({filled}: {filled: boolean}) {
  return (
    <svg width={PIN_SIZE} height={PIN_SIZE} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3v7l-3 4h12l-3-4V3z" fill={filled ? 'currentColor' : 'none'} />
      <path d="M7 3h10M12 14v7" />
    </svg>
  );
}

export default function TechTree(): React.ReactElement {
  // What the pointer or keyboard is on now. A pinned procedure overrides it until unpinned.
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = pinned ?? hover;
  const pointer = useRef('mouse');
  const [types, setTypes] = useState<Set<string>>(() => new Set(tree.userTypes.map((t) => t.id)));
  const [query, setQuery] = useState('');
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  // The procedures shown for their own sake (`primary`) are those of the selected user
  // types or, during a search, those of them whose titles contain every term. The rest
  // are their prerequisites, all the way down, whatever their type. Procedures that only
  // follow on from a prerequisite stay hidden. The result is laid out afresh.
  const view = useMemo(() => {
    const primary = new Set(
      tree.nodes
        .filter((n) => types.has(n.userType))
        .filter((n) => terms.every((t) => plain(n.title).toLowerCase().includes(t)))
        .map((n) => n.id),
    );
    const shown = new Set(primary);
    const prerequisites: Record<string, string[]> = {};
    for (const e of tree.edges) if (e.required) (prerequisites[e.to] ??= []).push(e.from);
    const stack = [...shown];
    while (stack.length) {
      for (const p of prerequisites[stack.pop()!] ?? []) {
        if (!shown.has(p)) {
          shown.add(p);
          stack.push(p);
        }
      }
    }
    const nodes = tree.nodes.filter((n) => shown.has(n.id));
    const edges = tree.edges.filter((e) => shown.has(e.from) && shown.has(e.to));
    return {...layout({nodes, edges}, SECTION_ORDER), primary};
  }, [types, query]);
  const extra = view.nodes.length - view.primary.size;

  const {byId, parents, children} = useMemo(() => {
    const parents: Record<string, string[]> = {};
    const children: Record<string, string[]> = {};
    for (const n of view.nodes) {
      parents[n.id] = [];
      children[n.id] = [];
    }
    for (const e of view.edges) {
      children[e.from].push(e.to);
      parents[e.to].push(e.from);
    }
    return {byId: Object.fromEntries(view.nodes.map((n) => [n.id, n])), parents, children};
  }, [view]);

  // A filter that hides the pinned or hovered procedure releases it.
  useEffect(() => {
    if (pinned && !byId[pinned]) setPinned(null);
    if (hover && !byId[hover]) setHover(null);
  }, [byId, pinned, hover]);

  // With every type shown, a click narrows to that one type. Otherwise a click adds or
  // removes its type, and removing the last one shows every type again.
  const allTypes = tree.userTypes.map((t) => t.id);
  const toggleType = (id: string) =>
    setTypes((prev) => {
      if (prev.size === allTypes.length) return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next.size ? next : new Set(allTypes);
    });

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
    return active && parents[active]
      ? {up: walk(active, parents), down: walk(active, children)}
      : {up: new Set<string>(), down: new Set<string>()};
  }, [active, parents, children]);

  useEffect(() => {
    const clear = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.(`.${styles.node}, .${styles.pin}`)) setHover(null);
    };
    const unpin = (e: KeyboardEvent) => e.key === 'Escape' && setPinned(null);
    document.addEventListener('pointerdown', clear);
    document.addEventListener('keydown', unpin);
    return () => {
      document.removeEventListener('pointerdown', clear);
      document.removeEventListener('keydown', unpin);
    };
  }, []);

  const lit = (id: string) => id === active || up.has(id) || down.has(id);
  const edgeLit = (from: string, to: string) =>
    (up.has(from) && (to === active || up.has(to))) || ((from === active || down.has(from)) && down.has(to));

  const searching = terms.length > 0;
  const status = !view.nodes.length
    ? `No procedures match “${query.trim()}”${types.size < tree.userTypes.length ? ' for the selected user types' : ''}.`
    : active && byId[active]
    ? (() => {
        const needs = parents[active].map((i) => plain(byId[i].title));
        const leads = children[active].map((i) => plain(byId[i].title));
        return (
          <>
            {pinned ? 'Pinned: ' : ''}
            <strong>{plain(byId[active].title)}</strong>.{' '}
            {needs.length ? `Comes after: ${needs.join('; ')}. ` : 'No procedure leads to it. '}
            {leads.length ? `Next steps: ${leads.join('; ')}.` : 'No next steps.'}
          </>
        );
      })()
    : `${
        searching
          ? `${view.primary.size} ${view.primary.size === 1 ? 'procedure matches' : 'procedures match'} “${query.trim()}”${extra ? `, plus ${extra} ${extra === 1 ? 'prerequisite' : 'prerequisites'}` : ''}`
          : `${view.nodes.length} procedures${extra ? ` (${extra} of them prerequisites for another type of user)` : ''}`
      }, ${view.edges.length} links, ${view.edges.filter((e) => e.required).length} of them prerequisites. Hover over or select a procedure to trace its path, or pin it to keep it traced.`;

  return (
    <div className={styles.root}>
      <div className={styles.filter} role="group" aria-labelledby="tech-tree-filter">
        <span id="tech-tree-filter">Show procedures for</span>
        {tree.userTypes.map((t) => (
          <button key={t.id} type="button" aria-pressed={types.has(t.id)} onClick={() => toggleType(t.id)}>
            {t.label}
            <span className={styles.count}>{tree.nodes.filter((n) => n.userType === t.id).length}</span>
          </button>
        ))}
      </div>
      <div className={styles.legend}>
        {tree.sections.filter((s) => view.nodes.some((n) => n.section === s.id)).map((s) => (
          <span key={s.id} style={{'--sec': `var(--tt-${s.id}, var(--ifm-color-primary))`} as React.CSSProperties}>
            <i />
            {s.title}
          </span>
        ))}
        {extra > 0 && (
          <span className={styles.key}>
            <b className={styles.otherSwatch} />
            {searching ? 'Prerequisite of a match' : 'Prerequisite for another type of user'}
          </span>
        )}
        <span className={extra > 0 ? '' : styles.key}>
          <svg width="24" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="24" y2="3" className={styles.edge} />
          </svg>
          Prerequisite
        </span>
        <span>
          <svg width="24" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="24" y2="3" className={`${styles.edge} ${styles.suggested}`} />
          </svg>
          Suggested next step
        </span>
      </div>
      <input
        type="search"
        className={styles.search}
        placeholder="Search procedures"
        aria-label="Search procedures by title"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          // Esc clears the search first; it only unpins once the field is empty.
          if (e.key === 'Escape' && query) {
            e.preventDefault();
            e.nativeEvent.stopPropagation();
            setQuery('');
          }
        }}
      />
      <div className={styles.scroller} hidden={!view.nodes.length}>
        <div
          className={`${styles.stage} ${active ? styles.focus : ''}`}
          style={{width: view.width, height: view.height}}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}>
          <svg width={view.width} height={view.height} viewBox={`0 0 ${view.width} ${view.height}`} aria-hidden="true">
            {view.edges.map((e) => (
              <path
                key={`${e.from}>${e.to}`}
                d={e.d}
                className={`${styles.edge} ${e.required ? '' : styles.suggested} ${edgeLit(e.from, e.to) ? styles.on : ''}`}
              />
            ))}
          </svg>
          {view.columns.map((c, k) => (
            <div key={k} className={styles.colhead} style={{left: c.x}}>
              <b>{c.count}</b>
              {columnLabel(k)}
            </div>
          ))}
          {view.nodes.map((n) => (
            <React.Fragment key={n.id}>
              <Link
                to={n.permalink}
                className={`${styles.node} ${lit(n.id) ? styles.on : ''} ${n.id === active ? styles.self : ''} ${view.primary.has(n.id) ? '' : styles.other}`}
                style={
                  {
                    left: n.x,
                    top: n.y,
                    width: view.nodeWidth,
                    height: view.nodeHeight,
                    '--sec': `var(--tt-${n.section}, var(--ifm-color-primary))`,
                  } as React.CSSProperties
                }
                onPointerDown={(e) => (pointer.current = e.pointerType)}
                // Not onMouseEnter: @docusaurus/Link overrides it with its own prefetch handler.
                onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(n.id)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setHover((h) => (h === n.id ? null : h))}
                onFocus={() => setHover(n.id)}
                onClick={(e) => {
                  if (pointer.current !== 'mouse' && !pinned && active !== n.id) {
                    e.preventDefault();
                    setHover(n.id);
                  }
                }}>
                <span>
                  <Title text={n.title} />
                </span>
              </Link>
              <button
                type="button"
                className={`${styles.pin} ${n.id === pinned ? styles.pinned : ''} ${n.id === active ? styles.near : ''} ${lit(n.id) ? styles.on : ''}`}
                style={{left: n.x + view.nodeWidth - PIN_SIZE - 3, top: n.y + (view.nodeHeight - PIN_SIZE) / 2}}
                aria-label={`${n.id === pinned ? 'Unpin' : 'Pin'} ${plain(n.title)}`}
                aria-pressed={n.id === pinned}
                title={n.id === pinned ? 'Unpin' : 'Pin this path'}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(n.id)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setHover((h) => (h === n.id ? null : h))}
                onFocus={() => setHover(n.id)}
                onClick={() => {
                  setPinned(n.id === pinned ? null : n.id);
                  setHover(null);
                }}>
                <PinIcon filled={n.id === pinned} />
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
      <p className={styles.status} aria-live="polite">
        {status}
      </p>
    </div>
  );
}
