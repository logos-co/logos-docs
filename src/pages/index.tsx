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
    to: '/run-a-node/get-started/run-logos-node-blockchain-storage-delivery',
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
    to: '/contribute/welcome',
    icon: '/img/home/contribute.png',
  },
];

const exploreLogos: CardItem[] = [
  {
    title: 'λ Basecamp',
    description: 'The desktop shell for Logos',
    to: '/basecamp/get-started/install-logos-basecamp',
  },
  {
    title: 'λ Blockchain',
    description: 'A sovereign, censorship-resistant base layer for building apps',
    to: '/blockchain/get-started/introduction-to-the-logos-blockchain',
  },
  {
    title: 'λ LEZ',
    description: 'The flagship execution environment built on the Logos Blockchain',
    to: '/lez/get-started/introduction-to-the-logos-execution-zone',
  },
  {
    title: 'λ Core',
    description: 'The headless CLI runtime',
    to: '/core/build-modules/start-a-logos-module-from-the-cli',
  },
  {
    title: 'λ Messaging',
    description: 'Private, censorship-resistant communication',
    to: '/messaging/get-started/introduction-to-logos-messaging',
  },
  {
    title: 'λ Storage',
    description: 'Decentralised, content-addressed file storage and retrieval',
    to: '/storage/get-started/run-logos-storage-node',
  },
  {
    title: 'λ Mixnet',
    description: 'Traffic mixing that hides communication patterns from network observers',
    to: '/mixnet/get-started/discover-nodes-and-send-messages-via-the-anoncomms-mixnet-demo-app',
  },
  {
    title: 'λ Peer discovery',
    description: 'Peer discovery and connection management without central registries',
    to: '/peer-discovery/welcome',
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

function CardGrid({items}: {items: CardItem[]}) {
  return (
    <div className={styles.cardGrid}>
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
