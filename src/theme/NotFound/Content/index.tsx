import {useEffect, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import {useLocation} from '@docusaurus/router';
import {track} from '@site/src/lib/agentLinks';

type Props = {className?: string};
type Guess = {title: string; url: string};

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/\.md$/, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'logos', 'from'].includes(w));

// Rank llms.txt entries by how many words they share with the missing path.
function guessPages(llmsTxt: string, missing: string): Guess[] {
  const wanted = new Set(words(missing));
  if (!wanted.size) return [];
  return [...llmsTxt.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)/gm)]
    .map(([, title, url]) => {
      const path = new URL(url).pathname;
      const score = words(path).filter((w) => wanted.has(w)).length;
      return {title, url: path.replace(/\.md$/, ''), score};
    })
    .filter((g) => g.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// The stock 404 page plus a way back for both readers: likely matches for
// people, and the llms.txt index for agents (the recovery path Mintlify-hosted
// docs use). The agent paragraph is server-rendered, so it is visible to
// agents that never run JavaScript.
export default function NotFoundContent({className}: Props): ReactNode {
  const {pathname} = useLocation();
  const [guesses, setGuesses] = useState<Guess[]>([]);

  useEffect(() => {
    track('not-found', pathname);
    fetch('/llms.txt')
      .then((r) => (r.ok ? r.text() : ''))
      .then((t) => setGuesses(guessPages(t, pathname)))
      .catch(() => undefined);
  }, [pathname]);

  return (
    <main className={clsx('container margin-vert--xl', className)}>
      <div className="row">
        <div className="col col--6 col--offset-3">
          <Heading as="h1" className="hero__title">
            Page not found
          </Heading>
          <p>We could not find what you were looking for. The page may have moved or been renamed.</p>
          {guesses.length > 0 && (
            <>
              <p>Were you looking for one of these?</p>
              <ul>
                {guesses.map((g) => (
                  <li key={g.url}>
                    <Link to={g.url}>{g.title}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p>
            Search with the box at the top of the page, or start from{' '}
            <Link to="/get-started/what-is-logos">What is Logos?</Link>.
          </p>
          <div className="alert alert--secondary" role="note">
            <strong>For AI agents:</strong> the full list of pages, each with a one-line summary,
            is at <a href="/llms.txt">/llms.txt</a>. Every page is available as Markdown by
            adding <code>.md</code> to its URL, and the whole documentation set is in{' '}
            <a href="/llms-full.txt">/llms-full.txt</a>.
          </div>
        </div>
      </div>
    </main>
  );
}
