import {Fragment, useEffect, useRef, useState, type ReactNode} from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {
  askPrompt,
  markdownPath,
  openInChatGPT,
  openInClaude,
  reportIssueUrl,
  track,
} from '@site/src/lib/agentLinks';

import styles from './styles.module.css';

type Assistant = 'chatgpt' | 'claude';

const ASSISTANTS: Record<Assistant, {label: string; url: (prompt: string) => string}> = {
  claude: {label: 'Claude', url: openInClaude},
  chatgpt: {label: 'ChatGPT', url: openInChatGPT},
};

// The split button opens the assistant the reader picked last; Claude until
// they pick one. An inline script in docusaurus.config.ts copies the saved
// choice to <html data-assistant> before the page paints, and CSS shows the
// matching button, so the label never flickers (the same trick Docusaurus
// uses for the colour mode).
const STORAGE_KEY = 'logos-docs:assistant';
const DEFAULT_ASSISTANT: Assistant = 'claude';
const savedAssistant = (): Assistant =>
  (document.documentElement.dataset.assistant as Assistant) || DEFAULT_ASSISTANT;

// Three controls above every doc:
//   Copy content    copies the page's Markdown (the `.md` file the
//                   agent-ready plugin writes at build time)
//   Report issue    opens a pre-filled GitHub issue for the page
//   Open in X | ▾   split button: one click opens the page in the reader's
//                   assistant; the menu switches assistant and holds the
//                   Markdown view
export default function PageActions(): ReactNode {
  const {metadata} = useDoc();
  const {siteConfig} = useDocusaurusContext();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'error'>('idle');
  const menuRef = useRef<HTMLDivElement>(null);

  const page = metadata.permalink;
  const mdPath = markdownPath(page);
  const mdUrl = `${siteConfig.url}${mdPath}`;
  const pageUrl = `${siteConfig.url}${page}`;
  const prompt = askPrompt(mdUrl);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const copyContent = async () => {
    track('copy-content', page);
    try {
      const res = await fetch(mdPath);
      if (!res.ok) throw new Error(String(res.status));
      await navigator.clipboard.writeText(await res.text());
      setCopied('ok');
    } catch {
      setCopied('error');
    }
    setTimeout(() => setCopied('idle'), 2000);
  };

  const choose = (a: Assistant) => {
    document.documentElement.dataset.assistant = a;
    try {
      window.localStorage.setItem(STORAGE_KEY, a);
    } catch {
      // Not remembered, but the link still opens.
    }
  };

  const linkProps = (external: boolean) =>
    external ? {target: '_blank', rel: 'noopener noreferrer'} : {};

  const item = (
    action: string,
    label: string,
    hint: string,
    href: string,
    {external = true, onClick}: {external?: boolean; onClick?: () => void} = {},
  ) => (
    <Link
      role="menuitem"
      className={styles.item}
      href={href}
      {...linkProps(external)}
      onClick={() => {
        track(action, page);
        onClick?.();
        setOpen(false);
      }}>
      <span className={styles.itemLabel}>{label}</span>
      <span className={styles.itemHint}>{hint}</span>
    </Link>
  );

  return (
    <>
      <Head>
        <link rel="alternate" type="text/markdown" href={mdPath} title="This page as Markdown" />
      </Head>
      <div className={styles.bar}>
        <button type="button" className={styles.button} onClick={copyContent}>
          {copied === 'ok' ? 'Copied' : copied === 'error' ? 'Copy failed' : 'Copy content'}
        </button>
        <Link
          className={styles.button}
          href={reportIssueUrl(pageUrl, metadata.title)}
          {...linkProps(true)}
          onClick={() => track('report-issue', page)}>
          Report issue
        </Link>
        <div className={styles.split} ref={menuRef}>
          {(Object.keys(ASSISTANTS) as Assistant[]).map((a) => (
            <Link
              key={a}
              className={`${styles.button} ${styles.splitMain} ${styles[a]}`}
              href={ASSISTANTS[a].url(prompt)}
              {...linkProps(true)}
              onClick={() => track(`open-${a}`, page)}>
              Open in {ASSISTANTS[a].label}
            </Link>
          ))}
          <button
            type="button"
            className={`${styles.button} ${styles.splitToggle}`}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="More ways to use this page"
            onClick={() => {
              if (!open) track('open-menu', page);
              setOpen(!open);
            }}>
            <span aria-hidden="true">▾</span>
          </button>
          {open && (
            <div role="menu" className={styles.menu}>
              {(Object.keys(ASSISTANTS) as Assistant[]).map((a) => (
                <Fragment key={a}>
                  {item(
                    `open-${a}`,
                    `Open in ${ASSISTANTS[a].label}`,
                    a === savedAssistant()
                      ? 'Ask about this page · current default'
                      : 'Ask about this page · sets it as default',
                    ASSISTANTS[a].url(prompt),
                    {onClick: () => choose(a)},
                  )}
                </Fragment>
              ))}
              <div className={styles.divider} role="separator" />
              {item('view-markdown', 'View as Markdown', 'The plain-text version agents read', mdPath)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
