import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {createPortal} from 'react-dom';
import A from '@theme-original/MDXComponents/A';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

// Hover / keyboard-focus previews for internal links in doc content. The data
// (page summaries and the opening paragraph of each section) comes from
// plugins/link-previews and is fetched as a separate chunk on first use.

type Section = {h: string; d: string};
type Page = {t: string; d: string; s: Record<string, Section>};
type Previews = Record<string, Page>;

let previewsPromise: Promise<Previews> | null = null;
const loadPreviews = () =>
  (previewsPromise ??= import('@generated/link-previews/default/previews.json').then(
    (m) => (m.default ?? m) as unknown as Previews,
  ));

const OPEN_DELAY = 300;
const GAP = 8;
const MARGIN = 16;

type Preview = {page: string; section?: string; text: string};

function lookup(previews: Previews, pathname: string, hash: string): Preview | null {
  const page = previews[pathname] ?? previews[pathname.replace(/\/$/, '')];
  if (!page) return null;
  if (hash) {
    const section = page.s[decodeURIComponent(hash)];
    if (section) return {page: page.t, section: section.h, text: section.d};
  }
  return page.d ? {page: page.t, text: page.d} : null;
}

// Inline code in previews is kept as `backticks`.
function renderText(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
      <code key={i}>{part.slice(1, -1)}</code>
    ) : (
      part
    ),
  );
}

type Props = ComponentProps<typeof A>;

export default function MDXA(props: Props): ReactNode {
  const {href} = props;
  const location = useLocation();
  const siteRoot = useBaseUrl('/');
  const linkRef = useRef<HTMLAnchorElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [preview, setPreview] = useState<Preview | null>(null);
  const tooltipId = useId();

  // Internal page or anchor links only; resolve to a pathname and anchor.
  let target: {pathname: string; hash: string} | null = null;
  if (typeof href === 'string' && !/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('//')) {
    const [rawPath, hash = ''] = href.split('#');
    const pathname = rawPath === '' ? location.pathname : rawPath;
    const samePage = pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '');
    // A link to the page you are on, with no anchor, has nothing to preview.
    if (pathname.startsWith(siteRoot) && !(samePage && !hash)) {
      target = {pathname: '/' + pathname.slice(siteRoot.length), hash};
    }
  }
  const pathname = target?.pathname;
  const hash = target?.hash;

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setPreview(null);
  }, []);

  const show = useCallback(() => {
    if (pathname === undefined) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      loadPreviews()
        .then((previews) => {
          // Still hovered or focused?
          const el = linkRef.current;
          if (!el || !(el.matches(':hover') || el.matches(':focus-visible'))) return;
          setPreview(lookup(previews, pathname, hash ?? ''));
        })
        .catch(() => {});
    }, OPEN_DELAY);
  }, [pathname, hash]);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(hide, [location.pathname, location.hash, hide]);

  // Any scroll moves the link away from a fixed-position popover.
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    window.addEventListener('scroll', hide, {passive: true, capture: true});
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', hide, {capture: true});
      window.removeEventListener('keydown', onKey);
    };
  }, [preview, hide]);

  if (!target) return <A {...props} />;

  return (
    <>
      <A
        {...props}
        ref={linkRef}
        aria-describedby={preview ? tooltipId : props['aria-describedby']}
        onPointerEnter={(e: PointerEvent<HTMLAnchorElement>) => {
          props.onPointerEnter?.(e);
          if (e.pointerType === 'mouse') show();
        }}
        onPointerLeave={(e: PointerEvent<HTMLAnchorElement>) => {
          props.onPointerLeave?.(e);
          hide();
        }}
        onFocus={(e: FocusEvent<HTMLAnchorElement>) => {
          props.onFocus?.(e);
          show();
        }}
        onBlur={(e: FocusEvent<HTMLAnchorElement>) => {
          props.onBlur?.(e);
          hide();
        }}
        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
          props.onClick?.(e);
          hide();
        }}
      />
      {preview && linkRef.current && (
        <Popover id={tooltipId} anchor={linkRef.current} preview={preview} />
      )}
    </>
  );
}

function Popover({id, anchor, preview}: {id: string; anchor: HTMLElement; preview: Preview}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{top: number; left: number} | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A link that wraps lines has several boxes; anchor to the first one.
    const rect = anchor.getClientRects()[0] ?? anchor.getBoundingClientRect();
    const {offsetWidth: w, offsetHeight: h} = el;
    const vw = document.documentElement.clientWidth;
    const below = rect.bottom + GAP;
    const top = below + h + MARGIN > window.innerHeight && rect.top - GAP - h > MARGIN ? rect.top - GAP - h : below;
    const left = Math.min(Math.max(rect.left, MARGIN), Math.max(MARGIN, vw - w - MARGIN));
    setPos({top, left});
  }, [anchor, preview]);

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className={styles.popover}
      style={pos ? {top: pos.top, left: pos.left} : {visibility: 'hidden', top: 0, left: 0}}>
      <div className={styles.title}>
        {preview.page}
        {preview.section && preview.section !== preview.page && (
          <>
            <span className={styles.separator} aria-hidden="true">
              ›
            </span>
            {renderText(preview.section)}
          </>
        )}
      </div>
      <p className={styles.text}>{renderText(preview.text)}</p>
    </div>,
    document.body,
  );
}
