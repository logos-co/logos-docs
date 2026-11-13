#!/usr/bin/env python3
"""Mirror a Logos module's published API reference into these docs.

Each module repo below publishes a Sphinx site to its gh-pages branch when a
GitHub release is published (its .github/workflows/docs.yml), one directory
per tag. This script takes the module's latest release, downloads that
release's rendered API reference page, and converts the article to
Markdown at the page's path under docs/. The content is exactly what the
module's own site shows for that release; only the presentation changes.

Run by .github/workflows/sync-api-reference.yml, which opens a PR when the
output differs from what is committed. Run it locally the same way:

    pip install -r scripts/sync-api-reference/requirements.txt
    python3 scripts/sync-api-reference/sync.py [module ...] [--tag vX.Y.Z]

Do not edit the generated pages by hand: the next sync overwrites them. Fix
wording in the module repo, and presentation here.
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

REPO_ROOT = Path(__file__).resolve().parents[2]

MODULES = {
    'delivery': {
        'repo': 'logos-co/logos-delivery-module',
        'page': 'pages/api_reference.html',
        'product': 'messaging',
        'out': 'docs/messaging/delivery/delivery-module-api-reference.md',
        'title': 'Delivery module API reference',
        'subtitle': 'Look up every method and event the Delivery module exposes.',
        'lang': 'cpp',
        # Where the reference's wording actually lives (the page is generated).
        'edit': 'src/delivery_module_plugin.h',
    },
    'chat': {
        'repo': 'logos-co/logos-chat-module',
        'page': 'pages/api_reference.html',
        'product': 'messaging',
        'out': 'docs/messaging/chat-module/chat-module-api-reference.md',
        'title': 'Chat module API reference',
        'subtitle': 'Look up every method, event and record the Chat module exposes.',
        'lang': 'text',
        'edit': 'rust-lib/chat_module.lidl',
    },
    'storage': {
        'repo': 'logos-co/logos-storage-module',
        'page': 'api_reference.html',
        'product': 'storage',
        'out': 'docs/storage/storage-module-api-reference.md',
        'title': 'Storage module API reference',
        'subtitle': 'Look up every method and event the Storage module exposes.',
        'lang': 'cpp',
        'edit': 'src/storage_module_plugin.h',
    },
}


def fetch(url):
    headers = {'User-Agent': 'logos-docs-api-sync'}
    token = os.environ.get('GITHUB_TOKEN')
    if token and url.startswith('https://api.github.com/'):
        headers['Authorization'] = f'Bearer {token}'
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as r:
        return r.read().decode('utf-8')


def latest_release(repo):
    """The repo's latest published release (GitHub excludes drafts and prereleases)."""
    return json.loads(fetch(f'https://api.github.com/repos/{repo}/releases/latest'))['tag_name']


# ---------------------------------------------------------------- conversion


def esc(text):
    """Escape characters that Markdown would otherwise interpret in prose."""
    return re.sub(r'([\\`*_\[\]<>|])', r'\\\1', text)


def code_span(text):
    text = re.sub(r'\s+', ' ', text)
    fence = '``' if '`' in text else '`'
    pad = ' ' if text.startswith('`') or text.endswith('`') else ''
    return f'{fence}{pad}{text}{pad}{fence}'


def classes(el):
    return el.get('class') or [] if isinstance(el, Tag) else []


class Converter:
    def __init__(self, article, site_base, lang):
        self.site_base = site_base  # the published page's directory, for its relative links
        self.lang = lang
        self.ids = {}  # every id Sphinx gave an anchor -> the id used here
        self.used = set()
        self._collect_ids(article)

    # Readable anchors: API items keep their name (`#createNode`), sections
    # keep Sphinx's id. Every alias Sphinx emitted maps to the same anchor so
    # in-page links still land.
    def _unique(self, wanted):
        anchor, n = wanted, 2
        while anchor in self.used:
            anchor, n = f'{wanted}-{n}', n + 1
        self.used.add(anchor)
        return anchor

    def level(self, el):
        """Heading level for an item at el: one below its section and group."""
        n = len(el.find_parents('section'))
        n += sum(1 for d in el.find_parents('div') if self.titled_group(d))
        return min(n + 1, 6)

    @staticmethod
    def titled_group(div):
        # Breathe wraps each member group in a container whose first child is
        # a <p class="rubric"> title ("Public Functions", a \name group, ...).
        return ('breathe-sectiondef' in classes(div)
                and div.find('p', class_='rubric', recursive=False) is not None)

    def _collect_ids(self, article):
        for section in article.find_all('section'):
            if section.get('id'):
                self.ids[section['id']] = self._unique(section['id'])
        for dt in article.select('dl[class] > dt.sig'):
            name = dt.select_one('.sig-name')
            anchor = self._unique(re.sub(r'[^\w-]', '', name.get_text()) if name else 'item')
            dt['data-anchor'] = anchor
            for el in [dt, *dt.find_all(id=True)]:
                if el.get('id'):
                    self.ids.setdefault(el['id'], anchor)

    # -- inline

    def inline(self, el):
        if isinstance(el, NavigableString):
            return esc(re.sub(r'\s+', ' ', str(el)))
        if not isinstance(el, Tag):
            return ''
        cls = classes(el)
        if 'headerlink' in cls:
            return ''
        if el.name == 'code':
            return code_span(el.get_text())
        if el.name in ('br', 'p'):
            return ' ' + ''.join(self.inline(c) for c in el.children) + ' '
        inner = ''.join(self.inline(c) for c in el.children)
        if el.name == 'strong' or el.name == 'b':
            return f'**{inner.strip()}**' if inner.strip() else ''
        if el.name == 'em' or el.name == 'i':
            return f'*{inner.strip()}*' if inner.strip() else ''
        if el.name == 'a':
            href = self.link(el.get('href', ''))
            return f'[{inner.strip()}]({href})' if href else inner
        return inner

    def link(self, href):
        if href.startswith('#'):
            return '#' + self.ids.get(href[1:], href[1:])
        if re.match(r'^[a-z][a-z0-9+.-]*:', href) or not href:
            return href
        # Another page of the module's own site: link to it there.
        return self.site_base + href

    # -- blocks

    def blocks(self, el, depth):
        """Markdown for the children of el, as a list of blocks."""
        out, run = [], []

        def flush():
            text = re.sub(r'[ \t]+', ' ', ''.join(run)).strip()
            if text:
                out.append(text)
            run.clear()

        for child in el.children:
            if isinstance(child, Tag) and self.is_block(child):
                flush()
                out.extend(self.block(child, depth))
            else:
                run.append(self.inline(child))
        flush()
        return out

    BLOCK_TAGS = {'section', 'div', 'p', 'ul', 'ol', 'dl', 'table', 'pre', 'blockquote',
                  'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}

    def is_block(self, el):
        # Breathe sometimes nests <p> in <p> (invalid HTML); read it as one paragraph.
        if el.name == 'p' and el.find_parent('p'):
            return False
        return el.name in self.BLOCK_TAGS

    def block(self, el, depth):
        cls = classes(el)
        name = el.name
        if name == 'section':
            return self.blocks(el, depth + 1)
        if name == 'h1':
            return []  # the page title comes from the front matter
        if re.fullmatch(r'h[2-6]', name):
            section = el.find_parent('section')
            anchor = self.ids.get(section.get('id')) if section else None
            text = ''.join(self.inline(c) for c in el.children).strip()
            return [f'{"#" * min(int(name[1]), 6)} {text}' + (f' {{#{anchor}}}' if anchor else '')]
        if name == 'p':
            if 'admonition-title' in cls:
                return []
            if 'rubric' in cls:
                text = ''.join(self.inline(c) for c in el.children).strip()
                return [f'{"#" * (self.level(el) - 1)} {text}']
            return self.blocks(el, depth)
        if name in ('ul', 'ol'):
            return [self.list_(el, depth)]
        if name == 'div' and any(c.startswith('highlight-') for c in cls):
            lang = next(c[len('highlight-'):] for c in cls if c.startswith('highlight-'))
            code = el.find('pre').get_text().rstrip('\n')
            return [f'```{lang}\n{code}\n```']
        if name == 'pre':
            return [f'```\n{el.get_text().rstrip()}\n```']
        if name == 'div' and 'admonition' in cls:
            title = el.select_one('.admonition-title')
            kind = 'note'
            label = title.get_text().strip() if title else ''
            body = '\n\n'.join(self.blocks(el, depth))
            return [f':::{kind}' + (f'[{label}]' if label else '') + f'\n\n{body}\n\n:::']
        if name == 'dl' and 'field-list' in cls:
            return self.field_list(el, depth)
        if name == 'dl' and el.find('dt', class_='sig', recursive=False):
            return self.api_items(el, depth)
        if name == 'dl':
            out = []
            for dt in el.find_all('dt', recursive=False):
                out.append(f'**{"".join(self.inline(c) for c in dt.children).strip()}**')
                dd = dt.find_next_sibling('dd')
                if dd:
                    out.extend(self.blocks(dd, depth))
            return out
        if name == 'table':
            return [self.table(el)]
        if name == 'blockquote':
            return ['\n'.join('> ' + l if l else '>' for l in '\n\n'.join(self.blocks(el, depth)).split('\n'))]
        return self.blocks(el, depth)  # div, container, ...

    def list_(self, el, depth):
        lines = []
        for i, li in enumerate(el.find_all('li', recursive=False), 1):
            marker = f'{i}.' if el.name == 'ol' else '-'
            body = '\n\n'.join(self.blocks(li, depth)) or ''
            pad = ' ' * (len(marker) + 1)
            first, *rest = body.split('\n') or ['']
            lines.append(f'{marker} {first}')
            lines.extend(pad + l if l else '' for l in rest)
        return '\n'.join(lines)

    def field_list(self, el, depth):
        out = []
        for dt in el.find_all('dt', recursive=False):
            label = re.sub(r'\s+', ' ', dt.get_text()).strip().rstrip(':')
            dd = dt.find_next_sibling('dd')
            body = self.blocks(dd, depth) if dd else []
            if len(body) == 1 and '\n' not in body[0] and not body[0].startswith('- '):
                out.append(f'**{label}:** {body[0]}')
            else:
                out.append(f'**{label}:**')
                out.extend(body)
        return out

    def api_items(self, el, depth):
        out = []
        for dt in el.find_all('dt', recursive=False):
            name = dt.select_one('.sig-name')
            for hl in dt.select('a.headerlink'):
                hl.decompose()
            signature = re.sub(r'\s+', ' ', dt.get_text()).strip()
            signature = re.sub(r'\s+([,)])', r'\1', signature).replace('( ', '(')
            label = name.get_text().strip() if name else signature
            dd = dt.find_next_sibling('dd')
            # A documented class (doxygenclass without :members-only:) wraps
            # the whole page: render it as the introduction, not as an item.
            if {'class', 'struct'} & set(classes(el)) and not el.find_parent('dl'):
                out.append(f'```{self.lang}\n{signature}\n```')
                if dd:
                    out.extend(self.blocks(dd, depth))
                continue
            out.append(f'{"#" * self.level(el)} {code_span(label)} {{#{dt["data-anchor"]}}}')
            out.append(f'```{self.lang}\n{signature}\n```')
            if dd:
                out.extend(self.blocks(dd, depth + 1))
        return out

    def table(self, el):
        rows = []
        for tr in el.find_all('tr'):
            cells = [''.join(self.inline(c) for c in td.children).strip().replace('\n', ' ')
                     for td in tr.find_all(['th', 'td'])]
            rows.append(cells)
        if not rows:
            return ''
        width = max(len(r) for r in rows)
        rows = [r + [''] * (width - len(r)) for r in rows]
        lines = ['| ' + ' | '.join(rows[0]) + ' |', '|' + ' --- |' * width]
        lines += ['| ' + ' | '.join(r) + ' |' for r in rows[1:]]
        return '\n'.join(lines)


def render(module, tag, html):
    cfg = MODULES[module]
    soup = BeautifulSoup(html, 'html.parser')
    article = soup.select_one('article.bd-article')
    if article is None:
        raise SystemExit(f'{module}: no <article class="bd-article"> in the published page')
    repo = cfg['repo']
    owner, name = repo.split('/')
    page_dir = cfg['page'].rpartition('/')[0]
    site_base = f'https://{owner}.github.io/{name}/{tag}/' + (f'{page_dir}/' if page_dir else '')
    body = '\n\n'.join(Converter(article, site_base, cfg['lang']).blocks(article, 1))

    front = '\n'.join([
        '---',
        f'title: {cfg["title"]}',
        'doc_type: reference',
        f'product: {cfg["product"]}',
        'owner: logos',
        # Plain CommonMark, not MDX: C++ and LIDL signatures are full of < and {.
        'mdx:',
        '  format: md',
        'sidebar_position: 100',
        f'description: {cfg["subtitle"]}',
        f'custom_edit_url: https://github.com/{repo}/blob/master/{cfg["edit"]}',
        f'source_repo: {repo}',
        f'source_version: {tag}',
        '---',
    ])
    banner = '\n'.join([
        ':::note[Mirrored page]',
        f'This page mirrors the [API reference](https://{owner}.github.io/{name}/{tag}/{cfg["page"]}) published with',
        f'`{name}` {tag}, and is regenerated automatically after each release. To change it, edit',
        f'the source in [`{repo}`](https://github.com/{repo}), not this page.',
        ':::',
    ])
    # The page is excluded from Vale in .vale.ini: its prose belongs to the
    # module repo. (Vale's HTML-comment switches would not parse here.)
    return f'{front}\n\n# {cfg["title"]}\n\n#### {cfg["subtitle"]}\n\n{banner}\n\n{body}\n'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('modules', nargs='*', metavar='module',
                    help=f'modules to sync: {", ".join(MODULES)} (default: all)')
    ap.add_argument('--tag', help='sync this release tag instead of the latest release (needs one module)')
    args = ap.parse_args()
    modules = args.modules or list(MODULES)
    unknown = [m for m in modules if m not in MODULES]
    if unknown:
        ap.error(f'unknown module(s): {", ".join(unknown)}')
    if args.tag and len(modules) != 1:
        ap.error('--tag needs exactly one module')

    for module in modules:
        cfg = MODULES[module]
        tag = args.tag or latest_release(cfg['repo'])
        owner, name = cfg['repo'].split('/')
        url = f'https://raw.githubusercontent.com/{owner}/{name}/gh-pages/{tag}/{cfg["page"]}'
        try:
            html = fetch(url)
        except urllib.error.HTTPError as e:
            # The module's docs workflow publishes a few minutes after the
            # release; the next scheduled run picks it up.
            print(f'::warning::{module}: {tag} is not published to gh-pages yet ({e.code} {url})')
            continue
        out = REPO_ROOT / cfg['out']
        new = render(module, tag, html)
        old = out.read_text() if out.exists() else None
        out.write_text(new)
        print(f'{module}: {tag} -> {cfg["out"]} ({"unchanged" if new == old else "updated"})')
        if os.environ.get('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f'{module}={tag}\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
