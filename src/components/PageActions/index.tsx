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

// "Copy page / Open in Claude / Open in ChatGPT" toolbar shown above every doc,
// in the style of Supabase, Mintlify and xAI docs. The Markdown it copies is
// the `.md` file the agent-ready plugin writes at build time.
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

  const copyMarkdown = async () => {
    track('copy-markdown', page);
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
      <div className={styles.bar} ref={menuRef}>
        <div className={styles.group}>
          <button type="button" className={styles.button} onClick={copyMarkdown}>
            {copied === 'ok' ? 'Copied' : copied === 'error' ? 'Copy failed' : 'Copy page'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.toggle}`}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="More ways to use this page"
            onClick={() => {
              if (!open) track('open-menu', page);
              setOpen(!open);
            }}>
            ▾
          </button>
        </div>
        {open && (
          <div role="menu" className={styles.menu}>
            {item('view-markdown', 'View as Markdown', 'The plain-text version agents read', mdPath)}
            {item('open-claude', 'Open in Claude', 'Ask questions about this page', openInClaude(prompt))}
            {item('open-chatgpt', 'Open in ChatGPT', 'Ask questions about this page', openInChatGPT(prompt))}
            {item(
              'connect-agent',
              'Connect your coding agent',
              'MCP server, llms.txt and AGENTS.md',
              '/get-started/coding-with-agents',
              false,
            )}
            {item(
              'report-problem',
              'Report a problem with this page',
              'Opens a pre-filled GitHub issue',
              reportIssueUrl(pageUrl, metadata.title),
            )}
          </div>
        )}
      </div>
    </>
  );
}
