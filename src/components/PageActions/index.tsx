import {useEffect, useRef, useState, type ReactNode} from 'react';
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

// Three buttons above every doc: copy the page's content (its Markdown, from
// the `.md` file the agent-ready plugin writes at build time), report an issue
// on GitHub, and a "More" menu with the remaining hand-offs.
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

  const item = (action: string, label: string, hint: string, href: string, external = true) => (
    <Link
      role="menuitem"
      className={styles.item}
      href={href}
      {...(external ? {target: '_blank', rel: 'noopener noreferrer'} : {})}
      onClick={() => {
        track(action, page);
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
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('report-issue', page)}>
          Report issue
        </Link>
        <div className={styles.dropdown} ref={menuRef}>
          <button
            type="button"
            className={styles.button}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => {
              if (!open) track('open-menu', page);
              setOpen(!open);
            }}>
            More <span aria-hidden="true">▾</span>
          </button>
          {open && (
            <div role="menu" className={styles.menu}>
              {item('view-markdown', 'View as Markdown', 'The plain-text version agents read', mdPath)}
              {item('open-claude', 'Open in Claude', 'Ask questions about this page', openInClaude(prompt))}
              {item('open-chatgpt', 'Open in ChatGPT', 'Ask questions about this page', openInChatGPT(prompt))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
