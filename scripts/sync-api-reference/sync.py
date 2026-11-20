#!/usr/bin/env python3
"""Mirror reference pages that other Logos repos publish into these docs.

Every source below is read at its repo's latest GitHub release, and the
result is written to the page's path under docs/, in the section's Reference
folder. There are three kinds of source:

- 'sphinx': the repo publishes a Sphinx site to its gh-pages branch when a
  release is published (its .github/workflows/docs.yml), one directory per
  tag. The release's rendered page is downloaded and its article converted
  to Markdown.
- 'markdown': the repo keeps the reference as a Markdown file. The file is
  read at the release tag, its own title is replaced with this page's, and
  relative links are pointed at the file's neighbours on GitHub at that tag.
- 'jsonrpsee': the repo defines a JSON-RPC API as a Rust `pub trait Rpc`
  with jsonrpsee's #[method]/#[subscription] attributes. The file is read at
  the release tag and each method's name, doc comment, parameters and return
  type are laid out as a reference.

Whatever the kind, the content is exactly what the source repo has for that release;
only the presentation changes.

Run by .github/workflows/sync-api-reference.yml, which opens a PR when the
output differs from what is committed. Run it locally the same way:

    pip install -r scripts/sync-api-reference/requirements.txt
    python3 scripts/sync-api-reference/sync.py [source ...] [--tag vX.Y.Z]

Do not edit the mirrored pages by hand: the next sync overwrites them. Fix
wording in the source repo, and presentation here.
"""

import argparse
import json
import os
import posixpath
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

REPO_ROOT = Path(__file__).resolve().parents[2]

# Every mirrored page. Adding one here also needs its `out` path added to
# .vale.ini (excluded from linting) and to add-paths in the workflow.
SOURCES = {
    'delivery': {
        'kind': 'sphinx',
        'repo': 'logos-co/logos-delivery-module',
        'page': 'pages/api_reference.html',
        'product': 'messaging',
        'out': 'docs/messaging/reference/delivery-module-api-reference.md',
        'title': 'Delivery module API reference',
        'subtitle': 'Look up every method and event the Delivery module exposes.',
        'lang': 'cpp',
        # Where the reference's wording actually lives (the page is generated).
        'edit': 'src/delivery_module_plugin.h',
    },
    'chat': {
        'kind': 'sphinx',
        'repo': 'logos-co/logos-chat-module',
        'page': 'pages/api_reference.html',
        'product': 'messaging',
        'out': 'docs/messaging/reference/chat-module-api-reference.md',
        'title': 'Chat module API reference',
        'subtitle': 'Look up every method, event and record the Chat module exposes.',
        'lang': 'text',
        'edit': 'rust-lib/chat_module.lidl',
    },
    'storage': {
        'kind': 'sphinx',
        'repo': 'logos-co/logos-storage-module',
        'page': 'api_reference.html',
        'product': 'storage',
        'out': 'docs/storage/reference/storage-module-api-reference.md',
        'title': 'Storage module API reference',
        'subtitle': 'Look up every method and event the Storage module exposes.',
        'lang': 'cpp',
        'edit': 'src/storage_module_plugin.h',
    },
    'logosctl': {
        'kind': 'markdown',
        'repo': 'logos-co/logos-logoscore-cli',
        'page': 'docs/logosctl.md',
        'product': 'core',
        'out': 'docs/core/reference/logos-cli-reference.md',
        # Published URL (docs.logos.co/core/reference/logos-cli-reference): keep it.
        'slug': 'logos-cli-reference',
        'title': 'Logos CLI reference',
        'subtitle': 'Look up every logosctl command, option and configuration key.',
    },
    'scaffold': {
        'kind': 'markdown',
        'repo': 'logos-co/scaffold',
        'page': 'docs/commands.md',
        'product': 'core',
        'out': 'docs/build-an-app/scaffold/reference/logos-scaffold-command-reference.md',
        'title': 'Logos Scaffold command reference',
        'subtitle': 'Look up every logos-scaffold command and what it does.',
    },
    'module-builder-cmake': {
        'kind': 'markdown',
        'repo': 'logos-co/logos-module-builder',
        'page': 'docs/cmake-reference.md',
        'product': 'core',
        'out': 'docs/core/reference/module-builder-cmake-reference.md',
        'title': 'Module builder CMake reference',
        'subtitle': 'Look up the CMake functions, variables and targets logos-module-builder provides.',
    },
    'module-builder-nix': {
        'kind': 'markdown',
        'repo': 'logos-co/logos-module-builder',
        'page': 'docs/nix-api.md',
        'product': 'core',
        'out': 'docs/core/reference/module-builder-nix-api-reference.md',
        'title': 'Module builder Nix API reference',
        'subtitle': 'Look up the Nix functions logos-module-builder provides for building modules.',
    },
    'lez-sequencer-rpc': {
        'kind': 'jsonrpsee',
        'repo': 'logos-blockchain/logos-execution-zone',
        'branch': 'dev',
        'page': 'lez/sequencer/service/rpc/src/lib.rs',
        'product': 'lez',
        'out': 'docs/lez/reference/lez-sequencer-rpc-reference.md',
        'title': 'LEZ sequencer RPC reference',
        'subtitle': 'Look up every JSON-RPC method a LEZ sequencer serves.',
        # The crate the parameter and return types come from, and its path at the tag.
        'types': ('sequencer_service_protocol', 'lez/sequencer/service/protocol'),
    },
    'lez-indexer-rpc': {
        'kind': 'jsonrpsee',
        'repo': 'logos-blockchain/logos-execution-zone',
        'branch': 'dev',
        'page': 'lez/indexer/service/rpc/src/lib.rs',
        'product': 'lez',
        'out': 'docs/lez/reference/lez-indexer-rpc-reference.md',
        'title': 'LEZ indexer RPC reference',
        'subtitle': 'Look up every JSON-RPC method and subscription a LEZ indexer serves.',
        'types': ('indexer_service_protocol', 'lez/indexer/service/protocol'),
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


def edit_url(cfg, path):
    return f'https://github.com/{cfg["repo"]}/blob/{cfg.get("branch", "master")}/{path}'


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


def front_matter(cfg, tag, edit_url):
    lines = [
        '---',
        f'title: {cfg["title"]}',
        'doc_type: reference',
        f'product: {cfg["product"]}',
        'owner: logos',
    ]
    if cfg.get('slug'):
        lines.append(f'slug: {cfg["slug"]}')
    lines += [
        # Plain CommonMark, not MDX: signatures and usage lines are full of < and {.
        'mdx:',
        '  format: md',
        'sidebar_position: 100',
        f'description: {cfg["subtitle"]}',
        f'custom_edit_url: {edit_url}',
        f'source_repo: {cfg["repo"]}',
        f'source_version: {tag}',
        '---',
    ]
    return '\n'.join(lines)


def page(cfg, tag, edit_url, source_link, body):
    repo = cfg['repo']
    name = repo.split('/')[1]
    banner = '\n'.join([
        ':::note[Mirrored page]',
        f'This page mirrors {source_link}',
        f'`{name}` {tag}, and is regenerated automatically after each release. To change it, edit',
        f'the source in [`{repo}`](https://github.com/{repo}), not this page.',
        ':::',
    ])
    # The page is excluded from Vale in .vale.ini: its prose belongs to the
    # source repo. (Vale's HTML-comment switches would not parse here.)
    return (f'{front_matter(cfg, tag, edit_url)}\n\n# {cfg["title"]}\n\n'
            f'#### {cfg["subtitle"]}\n\n{banner}\n\n{body.strip()}\n')


def render_sphinx(source, tag, html):
    cfg = SOURCES[source]
    soup = BeautifulSoup(html, 'html.parser')
    article = soup.select_one('article.bd-article')
    if article is None:
        raise SystemExit(f'{source}: no <article class="bd-article"> in the published page')
    repo = cfg['repo']
    owner, name = repo.split('/')
    page_dir = cfg['page'].rpartition('/')[0]
    site_base = f'https://{owner}.github.io/{name}/{tag}/' + (f'{page_dir}/' if page_dir else '')
    body = '\n\n'.join(Converter(article, site_base, cfg['lang']).blocks(article, 1))
    link = f'the [API reference](https://{owner}.github.io/{name}/{tag}/{cfg["page"]}) published with'
    return page(cfg, tag, edit_url(cfg, cfg['edit']), link, body)


FENCE = re.compile(r'^ {0,3}(`{3,}|~{3,})')
# Inline links and images, [text](target "title"), and reference definitions.
INLINE_LINK = re.compile(r'(!?\[[^\]]*\]\()(<[^>]*>|[^)\s]+)')
REF_DEF = re.compile(r'^( {0,3}\[[^\]]+\]:\s*)(\S+)', re.M)


def render_markdown(source, tag, text):
    """The source file, minus its own title, with relative links made absolute.

    Relative links resolve against the file's directory and point at the
    release tag on GitHub (images at raw.githubusercontent.com), so they keep
    working outside the source repo and match the mirrored version.
    """
    cfg = SOURCES[source]
    repo = cfg['repo']
    src_dir = posixpath.dirname(cfg['page'])

    def absolute(target, image):
        bare = target[1:-1] if target.startswith('<') else target
        if not bare or bare.startswith('#') or re.match(r'^[a-z][a-z0-9+.-]*:', bare, re.I):
            return target
        path, _, frag = bare.partition('#')
        path = posixpath.normpath(posixpath.join(src_dir, path)).lstrip('/')
        if image:
            url = f'https://raw.githubusercontent.com/{repo}/{tag}/{path}'
        else:
            kind = 'blob' if posixpath.splitext(path)[1] else 'tree'
            url = f'https://github.com/{repo}/{kind}/{tag}/{path}'
        return url + (f'#{frag}' if frag else '')

    text = re.sub(r'\A---\n.*?\n---\n', '', text, flags=re.S)  # source's own front matter
    out, fence, dropped_title = [], None, False
    for line in text.split('\n'):
        m = FENCE.match(line)
        if fence:
            if m and m.group(1)[0] == fence[0] and len(m.group(1)) >= len(fence):
                fence = None
            out.append(line)
            continue
        if m:
            fence = m.group(1)
            out.append(line)
            continue
        if not dropped_title and re.match(r'^# ', line):
            dropped_title = True  # this page's title replaces the source's
            continue
        line = INLINE_LINK.sub(lambda m: m.group(1) + absolute(m.group(2), m.group(1).startswith('!')), line)
        line = REF_DEF.sub(lambda m: m.group(1) + absolute(m.group(2), False), line)
        out.append(line)

    return page(cfg, tag, edit_url(cfg, cfg['page']), file_link(cfg, tag), '\n'.join(out))


def file_link(cfg, tag):
    return f'[`{cfg["page"]}`](https://github.com/{cfg["repo"]}/blob/{tag}/{cfg["page"]}) from'


def cell(text):
    """Table-cell text: one line, pipes escaped."""
    return ' '.join(text.split()).replace('|', '\\|')


def split_top(text, sep=','):
    """Split on `sep` outside <>, (), [] and {}."""
    parts, depth, cur = [], 0, ''
    for ch in text:
        if ch in '<([{':
            depth += 1
        elif ch in '>)]}':
            depth -= 1
        if ch == sep and depth == 0:
            parts.append(cur.strip())
            cur = ''
        else:
            cur += ch
    if cur.strip():
        parts.append(cur.strip())
    return parts


def generic_args(ty, outer):
    """['T', 'E'] for `outer<T, E>`, else None."""
    ty = ty.strip()
    if ty.startswith(outer + '<') and ty.endswith('>'):
        return split_top(ty[len(outer) + 1:-1])
    return None


# ---------------------------------------------------------------- jsonrpsee

RPC_ITEM = re.compile(
    r'(?P<doc>(?:[ \t]*///[^\n]*\n)*)'
    r'[ \t]*#\[(?P<kind>method|subscription)\((?P<args>[^)]*)\)\]\s*'
    r'(?:async\s+)?fn\s+\w+\s*\((?P<params>[^)]*)\)\s*(?:->\s*(?P<ret>[^;{]+?))?\s*[;{]')


def parse_rpc_trait(text):
    m = re.search(r'\bpub\s+trait\s+Rpc\b[^{]*\{', text)
    if m is None:
        raise SystemExit('no `pub trait Rpc` in the source file')
    # Plain // comments (TODOs, separators) are the source's notes to itself, not docs.
    body = re.sub(r'^[ \t]*//(?!/)[^\n]*\n', '', text[m.end():], flags=re.M)
    items = []
    for it in RPC_ITEM.finditer(body):
        args = dict(re.findall(r'(\w+)\s*=\s*("[^"]*"|[^,]+)', it['args']))
        args = {k: v.strip().strip('"') for k, v in args.items()}
        doc = '\n'.join(re.sub(r'^\s*/// ?', '', l) for l in it['doc'].rstrip('\n').split('\n')) if it['doc'] else ''
        params = []
        for p in split_top(it['params']):
            if p.lstrip('&').startswith(('self', 'mut self')):
                continue
            name, _, ty = p.partition(':')
            params.append((name.strip(), ' '.join(ty.split())))
        if it['kind'] == 'subscription':
            returns = args.get('item', '')
        else:
            ret = ' '.join((it['ret'] or '()').split())
            returns = (generic_args(ret, 'Result') or [ret])[0]
        items.append({'kind': it['kind'], 'name': args['name'], 'doc': doc.strip(),
                      'params': params, 'returns': returns})
    if not items:
        raise SystemExit('no #[method] or #[subscription] items in `pub trait Rpc`')
    return items


def render_jsonrpsee(source, tag, text):
    cfg = SOURCES[source]
    repo = cfg['repo']
    items = parse_rpc_trait(text)
    crate, crate_path = cfg['types']
    crate_link = f'[`{crate}`](https://github.com/{repo}/tree/{tag}/{crate_path})'
    out = [
        'The server speaks JSON-RPC 2.0. Parameter and return types are the Rust types the '
        f'server is written against; most come from the {crate_link} crate, and their JSON '
        'shape is their `serde` serialisation. A failed call returns a JSON-RPC error object.',
    ]
    for kind, heading in (('method', 'Methods'), ('subscription', 'Subscriptions')):
        group = [i for i in items if i['kind'] == kind]
        if not group:
            continue
        out.append(f'## {heading}')
        out.append('| Name | Parameters | ' + ('Item' if kind == 'subscription' else 'Returns') + ' |\n| --- | --- | --- |\n'
                   + '\n'.join(f'| [`{i["name"]}`](#{i["name"].lower()}) | '
                                + (', '.join(f'`{n}`' for n, _ in i['params']) or 'None')
                                + ' | ' + ('None' if i['returns'] == '()' else code_span(i['returns'])) + ' |'
                                for i in group))
        for i in group:
            out.append(f'### `{i["name"]}`')
            if i['doc']:
                out.append(i['doc'])
            if i['params']:
                out.append('Parameters, in order:\n\n| Name | Type |\n| --- | --- |\n'
                           + '\n'.join(f'| `{n}` | {code_span(t)} |' for n, t in i['params']))
            else:
                out.append('Takes no parameters.')
            if kind == 'subscription':
                out.append(f'Each notification carries {code_span(i["returns"])}.')
            elif i['returns'] == '()':
                out.append('Returns no value: the result is `null`.')
            else:
                out.append(f'Returns {code_span(i["returns"])}.')
    return page(cfg, tag, edit_url(cfg, cfg['page']), file_link(cfg, tag), '\n\n'.join(out))


def raw_url(cfg, tag):
    owner, name = cfg['repo'].split('/')
    if cfg['kind'] == 'sphinx':
        return f'https://raw.githubusercontent.com/{owner}/{name}/gh-pages/{tag}/{cfg["page"]}'
    return f'https://raw.githubusercontent.com/{owner}/{name}/{tag}/{cfg["page"]}'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sources', nargs='*', metavar='source',
                    help=f'sources to sync: {", ".join(SOURCES)} (default: all)')
    ap.add_argument('--tag', help='sync this release tag instead of the latest release (needs one source)')
    args = ap.parse_args()
    sources = args.sources or list(SOURCES)
    unknown = [s for s in sources if s not in SOURCES]
    if unknown:
        ap.error(f'unknown source(s): {", ".join(unknown)}')
    if args.tag and len(sources) != 1:
        ap.error('--tag needs exactly one source')

    for source in sources:
        cfg = SOURCES[source]
        tag = args.tag or latest_release(cfg['repo'])
        url = raw_url(cfg, tag)
        try:
            content = fetch(url)
        except urllib.error.HTTPError as e:
            # A Sphinx site reaches gh-pages a few minutes after the release;
            # the next scheduled run picks it up.
            print(f'::warning::{source}: {tag} has no {cfg["page"]} yet ({e.code} {url})')
            continue
        render = {'sphinx': render_sphinx, 'markdown': render_markdown,
                  'jsonrpsee': render_jsonrpsee}[cfg['kind']]
        new = render(source, tag, content)
        out = REPO_ROOT / cfg['out']
        old = out.read_text() if out.exists() else None
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(new)
        print(f'{source}: {tag} -> {cfg["out"]} ({"unchanged" if new == old else "updated"})')
        if os.environ.get('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f'{source.replace("-", "_")}={tag}\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
