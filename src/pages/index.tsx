import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

type CardItem = {
  title: string;
  description: string;
  to: string;
  icon?: string;
};

// Three ways in, after Solana's docs homepage: do something now, have your
// coding agent do it, or understand the stack first.
const startHere: CardItem[] = [
  {
    title: 'Quickstart',
    description: 'Install Logos Basecamp and run your first Logos app in minutes',
    to: '/basecamp/install-logos-basecamp',
  },
  {
    title: 'Coding with agents',
    description: 'Connect Claude Code, Cursor, Codex or VS Code to these docs: MCP server, llms.txt and AGENTS.md',
    to: '/get-started/coding-with-agents',
  },
  {
    title: 'Concepts',
    description: 'How the Logos stack fits together, from the runtime to the apps',
    to: '/get-started/what-is-logos',
  },
];

const choosePath: CardItem[] = [
  {
    title: 'Run an app',
    description: 'Run modules inside Basecamp, as standalone apps, or headlessly',
    to: '/run-an-app',
    icon: '/img/home/run-an-app.png',
  },
  {
    title: 'Run a node',
    description: 'Run one service or all three: blockchain, delivery, and storage',
    to: '/run-a-node',
    icon: '/img/home/run-a-node.png',
  },
  {
    title: 'Build an app',
    description: 'Build and ship apps on Logos',
    to: '/build-an-app',
    icon: '/img/home/build-an-app.png',
  },
  {
    title: 'Contribute',
    description: 'Improve the protocol, the docs, or the tooling',
    to: 'https://github.com/logos-co/logos-docs?tab=contributing-ov-file#contributing-to-the-logos-documentation',
    icon: '/img/home/contribute.png',
  },
];

const exploreLogos: CardItem[] = [
  {
    title: 'λ Basecamp',
    description: 'A local-first launcher for peer-to-peer apps built on Logos',
    to: '/basecamp',
  },
  {
    title: 'λ Blockchain',
    description: 'A sovereign, censorship-resistant base layer for building apps',
    to: '/blockchain',
  },
  {
    title: 'λ LEZ',
    description: 'The flagship execution environment built on the Logos Blockchain',
    to: '/lez',
  },
  {
    title: 'λ Core',
    description: 'The headless CLI runtime',
    to: '/core/build-modules/start-a-logos-module-from-the-cli',
  },
  {
    title: 'λ Messaging',
    description: 'Private, censorship-resistant communication',
    to: '/messaging',
  },
  {
    title: 'λ Storage',
    description: 'Decentralised, content-addressed file storage and retrieval',
    to: '/storage',
  },
  {
    title: 'λ Mixnet',
    description: 'Traffic mixing that hides communication patterns from network observers',
    to: '/mixnet/get-started/send-anonymised-messages-over-the-mix-network',
  },
  {
    title: 'λ Peer discovery',
    description: 'Peer discovery and connection management without central registries',
    to: '/peer-discovery/get-started/build-logos-core-module-that-uses-service-discovery-api',
  },
];

function Card({title, description, to, icon}: CardItem) {
  return (
    <Link className={styles.card} to={to}>
      {icon && <img className={styles.cardIcon} src={icon} alt="" />}
      <h4 className={styles.cardTitle}>{title}</h4>
      <p className={styles.cardDescription}>{description}</p>
    </Link>
  );
}

function CardGrid({items, className}: {items: CardItem[]; className?: string}) {
  return (
    <div className={className ? `${styles.cardGrid} ${className}` : styles.cardGrid}>
      {items.map((item) => (
        <Card key={item.to} {...item} />
      ))}
    </div>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Logos documentation"
      description="Guides and references for the Logos stack.">
      <main className="container">
        <div className={styles.hero}>
          <div className={styles.heroImage}>
            <img src="/img/home/understand-logos.webp" alt="" />
          </div>
          <div className={styles.heroText}>
            <Heading as="h2">Understand Logos</Heading>
            <p>Learn what Logos is, how the stack works, and the ideas behind it.</p>
            <Link className="button button--primary" to="/get-started/what-is-logos">
              Get started →
            </Link>
          </div>
        </div>

        <div className={styles.section}>
          <Heading as="h3" className={styles.sectionTitle}>
            Start here
          </Heading>
          <CardGrid items={startHere} className={styles.cardGridThree} />
          <p className={styles.agentNote}>
            Building with an AI agent? Point it at <a href="/llms.txt">docs.logos.co/llms.txt</a>,
            or add <code>.md</code> to any page URL for plain Markdown.
          </p>
        </div>

        <div className={styles.section}>
          <Heading as="h3" className={styles.sectionTitle}>
            Choose your path
          </Heading>
          <CardGrid items={choosePath} />
        </div>

        <div className={styles.section}>
          <Heading as="h3" className={styles.sectionTitle}>
            Explore Logos
          </Heading>
          <CardGrid items={exploreLogos} />
        </div>

        <div style={{height: '3rem'}} />
      </main>
    </Layout>
  );
}
