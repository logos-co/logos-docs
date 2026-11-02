#!/usr/bin/env node
// Checks the agent-facing build output (plugins/agent-ready) after `npm run build`:
// every link in llms.txt and in the .md pages that points at this site resolves to
// a file in build/, and the AGENTS.md block stays small enough to load on every turn.

import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

const BUILD = new URL('../build/', import.meta.url).pathname;
const REPO = new URL('../', import.meta.url).pathname;
const RAW = 'https://raw.githubusercontent.com/logos-co/logos-docs/main/';
const SITE = 'https://docs.logos.co';
const AGENTS_MD_BUDGET = 16 * 1024;
const errors = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const resolves = (url) => {
  const path = decodeURIComponent(new URL(url).pathname);
  return [path, `${path}/index.html`, `${path}.html`].some((p) => existsSync(join(BUILD, p)) && statSync(join(BUILD, p)).isFile());
};

for (const required of ['llms.txt', 'llms-full.txt', '.well-known/llms.txt', 'agents/docs.json', 'agents/AGENTS.md', 'agents/skills/logos-docs/SKILL.md']) {
  if (!existsSync(join(BUILD, required))) errors.push(`missing build/${required}`);
}

const files = walk(BUILD).filter((f) => /\.(md|txt)$/.test(f) && !f.endsWith('llms-full.txt'));
let links = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [, url] of text.matchAll(/\]\((https:\/\/docs\.logos\.co\/[^)\s#]*)/g)) {
    links++;
    if (!resolves(url)) errors.push(`${file.slice(BUILD.length)}: broken link ${url}`);
  }
  // Images and other assets are linked to the repository file.
  for (const [, url] of text.matchAll(/\]\((https:\/\/raw\.githubusercontent\.com\/logos-co\/logos-docs\/main\/[^)\s#]*)/g)) {
    links++;
    if (!existsSync(join(REPO, decodeURIComponent(url.slice(RAW.length))))) {
      errors.push(`${file.slice(BUILD.length)}: no repository file for ${url}`);
    }
  }
}

const docs = JSON.parse(readFileSync(join(BUILD, 'agents/docs.json'), 'utf8'));
for (const page of docs.pages) {
  if (!existsSync(join(BUILD, `${page.permalink}.md`))) errors.push(`no Markdown file for ${page.permalink}`);
}

const agentsMd = statSync(join(BUILD, 'agents/AGENTS.md')).size;
if (agentsMd > AGENTS_MD_BUDGET) {
  errors.push(`agents/AGENTS.md is ${agentsMd} bytes; keep it under ${AGENTS_MD_BUDGET} so it fits in every prompt`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s) in the agent-facing build output.`);
  process.exit(1);
}
console.log(`agent artifacts OK: ${docs.pages.length} pages, ${links} internal links checked, AGENTS.md ${agentsMd} bytes (${SITE})`);
