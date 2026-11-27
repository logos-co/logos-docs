#!/usr/bin/env python3
"""Find component versions the docs use that are older than the latest release.

Nothing here lists components or versions by hand. The script reads every
page under docs/ and collects each pinned version it can attribute to a
component:

- GitHub refs: release, tree, blob and download links, Nix flake refs
  (github:owner/repo/ref), Cargo git dependencies (git = "...", tag = "..."),
  `cargo install --git ... --tag ...`, `git clone --branch ...`, and a
  `git checkout <ref>` that follows a clone on the same page.
- Packages: any package name from a package repository index (the official
  catalogue, plus every repo the docs link to that publishes an `index`
  release) followed by a version, or `package install <name> --version <v>`.
- Repo names written in prose (`logos-module-builder` 0.3.0) and the few
  product names in ALIASES.

Refs that are not versions (branches, commits) are skipped, and so are
versions given as a floor or as history ("0.3.2 or later", "older than 0.3.0",
"since 0.3.4"). Mirrored reference pages (front matter `source_repo`) are
skipped too, since sync-api-reference keeps them current.

The latest version of a repo is its newest stable GitHub release (falling back
to its newest stable tag when it publishes no versioned releases), compared
within the same tag prefix (swap_ui-v0.5.0 only competes with swap_ui-*). The
latest version of a package is its newest stable version across the indexes.

Each (component, docs version) older than the latest is one mismatch. With
--create-issues, an issue is opened for each mismatch unless an open issue
already carries its marker; a closed issue with the marker suppresses it too
when it was closed as "not planned" or labelled wontfix, which is how an
intentionally old pin (a legacy testnet page, say) is silenced.

    GITHUB_TOKEN=... python3 scripts/check-versions/check_versions.py [--create-issues]
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS = REPO_ROOT / 'docs'
API = 'https://api.github.com'

# The official Basecamp/logosctl package catalogue. Other package repositories
# are found from the repos the docs link to.
CATALOGUE_REPO = 'logos-co/logos-modules-release'

# Product names the docs use in prose instead of a repo name.
ALIASES = {
    'Basecamp': 'logos-co/logos-basecamp',
    'logosctl': 'logos-co/logos-logoscore-cli',
    'logos-scaffold': 'logos-co/scaffold',
    'LEZ': 'logos-blockchain/logos-execution-zone',
}

LABEL = 'version-mismatch'
MARKER = '<!-- version-mismatch: {key} -->'
MARKER_RE = re.compile(r'<!-- version-mismatch: (\S+) -->')

# A ref that is a version, with an optional tag prefix (swap_ui-v0.5.0).
REF_VERSION = re.compile(
    r'^(?P<prefix>[A-Za-z][\w.-]*?-)?v?(?P<num>\d+\.\d+(?:\.\d+)?)'
    r'(?:-(?P<pre>[0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$')
# A version written in prose: three parts, optional rc-style suffix,
# optionally wrapped in backticks, bold or a link.
PROSE_VERSION = (r'[ \t]+(?:version[ \t]+)?[`*\[]*v?'
                 r'(?P<ver>\d+\.\d+\.\d+(?:-(?:rc|alpha|beta|pre|dev)[0-9A-Za-z.]*)?)(?![\w.]*\d)')
REPO = r'(?P<o>[\w.-]+)/(?P<r>[\w.-]+?)(?:\.git)?'
REF = r'(?P<ref>[^/\s)#?"\'`>\]]+)'
GITHUB_REFS = [
    re.compile(rf'https?://github\.com/{REPO}/(?:releases/tag|releases/download|tree|blob)/{REF}'),
    re.compile(rf'(?<![\w/])github:{REPO}/{REF}'),
    re.compile(rf'git\s*=\s*"https://github\.com/{REPO}"\s*,\s*(?:tag|branch)\s*=\s*"{REF}"'),
    re.compile(rf'--git\s+https://github\.com/{REPO}(?=[\s\\])[^\n]*?\s--tag\s+{REF}'),
    re.compile(rf'git clone\s+[^\n]*?--branch\s+{REF}\s+[^\n]*?https://github\.com/{REPO}(?![\w.-])'),
]
CLONE = re.compile(rf'git clone\s[^\n]*?https://github\.com/{REPO}(?![\w.-])')
CHECKOUT = re.compile(r'git checkout\s+(?P<ref>[^\s`]+)')
# A version is a floor or history, not a pin, when it reads like these.
BEFORE_SKIP = re.compile(
    r'(?:older than|newer than|earlier than|later than|before|prior to|up to|until|since|'
    r'upgrading (?:\w+ )*from|>=?|<=?)\s*[`*\[]*\s*$', re.I)
AFTER_SKIP = re.compile(r'^[`*\])]*\s*(?:\([^)]*\)\s*)?(?:or (?:later|newer|above|higher)|and later|\+)', re.I)


def api(path, params=None):
    url = path if path.startswith('http') else API + path
    if params:
        url += '?' + urllib.parse.urlencode(params)
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'logos-docs-version-check'}
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        headers['Authorization'] = f'Bearer {token}'
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as r:
        return json.load(r)


def api_pages(path, params=None, limit=10):
    out = []
    for page in range(1, limit + 1):
        batch = api(path, {**(params or {}), 'per_page': 100, 'page': page})
        out.extend(batch)
        if len(batch) < 100:
            break
    return out


def api_send(method, path, body):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(), method=method, headers={
        'Accept': 'application/vnd.github+json',
        'Authorization': f'Bearer {os.environ["GITHUB_TOKEN"]}',
        'Content-Type': 'application/json',
        'User-Agent': 'logos-docs-version-check',
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def parse_version(text, ref=True):
    """(prefix, (major, minor, patch), pre) for a version string, or None."""
    m = REF_VERSION.match(text)
    if not m:
        return None
    nums = tuple(int(n) for n in m['num'].split('.'))
    return (m['prefix'] or '').lower(), nums + (0,) * (3 - len(nums)), m['pre']


def sort_key(parsed):
    _, nums, pre = parsed
    # A pre-release sorts before the release it leads up to.
    return nums, pre is None, pre or ''


def show(parsed):
    prefix, nums, pre = parsed
    return '.'.join(map(str, nums)) + (f'-{pre}' if pre else '')


def is_mirrored(text):
    return text.startswith('---') and re.search(r'^source_repo:', text.split('\n---', 1)[0], re.M)


def line_of(text, pos):
    return text.count('\n', 0, pos) + 1


def skipped(text, start, end):
    line_start = text.rfind('\n', 0, start) + 1
    return BEFORE_SKIP.search(text[line_start:start]) or AFTER_SKIP.match(text[end:end + 40])


def doc_files():
    for path in sorted(DOCS.rglob('*')):
        if path.suffix in ('.md', '.mdx') and 'assets' not in path.parts:
            text = path.read_text(encoding='utf-8')
            if not is_mirrored(text):
                yield path.relative_to(REPO_ROOT).as_posix(), text


def scan_github(files):
    """Every version-like GitHub ref, and every repo mentioned at all."""
    mentions, repos = [], set()
    for rel, text in files:
        for m in re.finditer(rf'github\.com/{REPO}(?![\w.-])', text):
            repos.add(f'{m["o"]}/{m["r"]}'.lower())
        hits = [(m.start(), m.end(), m['o'], m['r'], m['ref']) for rx in GITHUB_REFS for m in rx.finditer(text)]
        # `git checkout v0.3.2` checks out the repo the page last cloned.
        clones = [(m.start(), m['o'], m['r']) for m in CLONE.finditer(text)]
        for m in CHECKOUT.finditer(text):
            before = [c for c in clones if c[0] < m.start()]
            if before:
                _, o, r = before[-1]
                hits.append((m.start(), m.end(), o, r, m['ref']))
        seen = set()
        for start, end, o, r, ref in hits:
            parsed = parse_version(ref)
            if not parsed or (start, ref) in seen or skipped(text, start, end):
                continue
            seen.add((start, ref))
            mentions.append({'repo': f'{o}/{r}'.lower(), 'parsed': parsed, 'file': rel,
                             'line': line_of(text, start), 'source': 'github'})
    return mentions, repos


def name_pattern(name, bare=False):
    """A package or repo name in prose: bare when it has a separator (or is an alias), else in backticks."""
    words = re.split(r'[_-]', name)
    body = r'[_\- ]'.join(re.escape(w) for w in words)
    if len(words) == 1 and not bare:
        return rf'`{body}`'
    return rf'(?<![\w`-])`?{body}`?(?![\w-])'


def scan_names(files, names, bare=()):
    """Versions written next to a package/repo name: {name: [mention, ...]}."""
    found = {}
    for name in names:
        # Aliases are product names, so match their case exactly.
        rx = re.compile(name_pattern(name, name in bare) + PROSE_VERSION, 0 if name in bare else re.I)
        install = re.compile(rf'package install\s+{re.escape(name)}\s*(?:\\\s*)?--version\s+v?(?P<ver>\S+)')
        for rel, text in files:
            for m in list(rx.finditer(text)) + list(install.finditer(text)):
                parsed = parse_version(m['ver'])
                if parsed and not skipped(text, m.start(), m.end()):
                    found.setdefault(name, []).append(
                        {'parsed': ('',) + parsed[1:], 'file': rel, 'line': line_of(text, m.start())})
    return found


def latest_repo_versions(repo, prefixes):
    """{prefix: (parsed, url)} for the newest stable version of each tag prefix."""
    best = {}

    def consider(tag, url):
        parsed = parse_version(tag)
        if parsed and parsed[2] is None and parsed[0] in prefixes:
            if parsed[0] not in best or sort_key(parsed) > sort_key(best[parsed[0]][0]):
                best[parsed[0]] = (parsed, url)

    try:
        for rel in api_pages(f'/repos/{repo}/releases', limit=3):
            if not rel['draft'] and not rel['prerelease']:
                consider(rel['tag_name'], rel['html_url'])
        if set(prefixes) - set(best):
            # Tags only fill in prefixes that have no versioned release.
            tagged = {}
            for tag in api_pages(f'/repos/{repo}/tags'):
                parsed = parse_version(tag['name'])
                if parsed and parsed[2] is None and parsed[0] in prefixes and parsed[0] not in best:
                    if parsed[0] not in tagged or sort_key(parsed) > sort_key(tagged[parsed[0]][0]):
                        tagged[parsed[0]] = (parsed, f'https://github.com/{repo}/tree/{tag["name"]}')
            best.update(tagged)
    except urllib.error.HTTPError as e:
        print(f'warning: {repo}: {e}', file=sys.stderr)
    return best


def package_indexes(repos):
    """{package: (parsed, index_repo)} for the newest stable version of each package.

    A package in the official catalogue takes its version from there; other
    indexes only supply packages the catalogue does not carry, since a side
    repository can number an unrelated build of the same name differently.
    """
    latest = {}
    for repo in [CATALOGUE_REPO, *sorted(set(repos) - {CATALOGUE_REPO})]:
        claimed = set(latest)
        try:
            rel = api(f'/repos/{repo}/releases/tags/index')
        except urllib.error.HTTPError:
            continue
        asset = next((a for a in rel.get('assets', []) if a['name'] == 'index.json'), None)
        if not asset:
            continue
        with urllib.request.urlopen(asset['browser_download_url'], timeout=60) as r:
            index = json.load(r)
        for pkg in index.get('packages', []):
            if pkg['name'] in claimed:
                continue
            for v in pkg.get('versions', []):
                parsed = parse_version(str(v.get('manifest', {}).get('version', '')))
                if not parsed or parsed[2] is not None:
                    continue
                parsed = ('',) + parsed[1:]
                if pkg['name'] not in latest or sort_key(parsed) > sort_key(latest[pkg['name']][0]):
                    latest[pkg['name']] = (parsed, repo)
    return latest


def find_mismatches():
    files = list(doc_files())
    gh_mentions, repos = scan_github(files)

    packages = package_indexes(repos)
    for name, found in scan_names(files, packages).items():
        for m in found:
            m.update(source='package', package=name)
            gh_mentions.append(m)

    repo_names = {r.split('/')[1]: r for r in repos}
    names = {**{n: r for n, r in repo_names.items() if '-' in n}, **ALIASES}
    for name, found in scan_names(files, names, bare=ALIASES).items():
        for m in found:
            m.update(source='github', repo=names[name].lower())
            gh_mentions.append(m)

    wanted = {}
    for m in gh_mentions:
        if m['source'] == 'github':
            wanted.setdefault(m['repo'], set()).add(m['parsed'][0])
    latest = {repo: latest_repo_versions(repo, prefixes) for repo, prefixes in sorted(wanted.items())}

    groups = {}
    for m in gh_mentions:
        if m['source'] == 'package':
            newest, index_repo = packages[m['package']]
            key = f'package:{m["package"]}'
            label = f'`{m["package"]}` package'
            where = f'https://github.com/{index_repo}/releases/tag/index'
        else:
            found = latest.get(m['repo'], {}).get(m['parsed'][0])
            if not found:
                continue
            newest, where = found
            prefix = m['parsed'][0]
            key = f'github:{m["repo"]}' + (f':{prefix.rstrip("-")}' if prefix else '')
            label = f'[`{m["repo"]}`](https://github.com/{m["repo"]})' + (f' (`{prefix}*` tags)' if prefix else '')
        if sort_key(m['parsed']) >= sort_key(newest):
            continue
        g = groups.setdefault(f'{key}@{show(m["parsed"])}', {
            'label': label, 'docs': show(m['parsed']), 'latest': show(newest), 'where': where, 'at': set()})
        g['at'].add((m['file'], m['line']))
    return groups


def existing_markers(repo):
    """Markers that suppress a new issue: open issues, and closed ones that were dismissed."""
    markers = set()
    for issue in api_pages(f'/repos/{repo}/issues', {'state': 'all'}, limit=50):
        if 'pull_request' in issue:
            continue
        dismissed = issue.get('state_reason') == 'not_planned' or any(
            l['name'] == 'wontfix' for l in issue.get('labels', []))
        if issue['state'] == 'open' or dismissed:
            markers.update(MARKER_RE.findall(issue.get('body') or ''))
    return markers


def issue_body(key, g, repo, ref):
    lines = '\n'.join(f'- [`{f}:{n}`](https://github.com/{repo}/blob/{ref}/{f}#L{n})' for f, n in sorted(g['at']))
    return f"""The docs use {g['label']} **{g['docs']}**, but the latest release is **{g['latest']}** ([source]({g['where']})).

Where the docs use {g['docs']}:

{lines}

Update these pages to {g['latest']} after re-verifying them against that release (see AGENTS.md on docs about software in other repos), or close this issue as **not planned** if the old version is intentional, which stops this mismatch from being reported again.

Opened by `.github/workflows/check-versions.yml`. An issue is opened only when no open issue already reports the same component and docs version.

{MARKER.format(key=key)}
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--create-issues', action='store_true', help='open an issue for each new mismatch')
    parser.add_argument('--repo', default=os.environ.get('GITHUB_REPOSITORY', 'logos-co/logos-docs'))
    parser.add_argument('--ref', default='main', help='branch the issue links point at')
    args = parser.parse_args()

    groups = find_mismatches()
    known = existing_markers(args.repo)
    summary = ['| Component | Docs | Latest | Pages | Issue |', '| --- | --- | --- | --- | --- |']
    created = 0
    if args.create_issues and set(groups) - known:
        try:
            api_send('POST', f'/repos/{args.repo}/labels', {
                'name': LABEL, 'color': 'fbca04', 'description': 'Docs use an older version than the latest release'})
        except urllib.error.HTTPError as e:
            if e.code != 422:  # 422: the label already exists
                raise
    for key, g in sorted(groups.items()):
        name = re.sub(r'[`\[\]]|\(http[^)]*\)', '', g['label'])
        title = f'Version mismatch: {name} {g["docs"]} in docs, latest is {g["latest"]}'
        status = 'already reported' if key in known else 'new'
        if key not in known and args.create_issues:
            issue = api_send('POST', f'/repos/{args.repo}/issues', {
                'title': title, 'body': issue_body(key, g, args.repo, args.ref), 'labels': [LABEL, 'type:chore']})
            status = f'#{issue["number"]}'
            created += 1
        print(f'{status:>16}  {title}  ({len(g["at"])} location(s))')
        summary.append(f'| {g["label"]} | {g["docs"]} | {g["latest"]} | {len({f for f, _ in g["at"]})} | {status} |')
    print(f'{len(groups)} mismatch(es), {created} issue(s) opened.')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f:
            f.write('## Docs version mismatches\n\n' + ('\n'.join(summary) if groups else 'None found.') + '\n')


if __name__ == '__main__':
    main()
