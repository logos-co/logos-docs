// Optional Cloudflare Worker for docs.logos.co. NOT deployed; see edge/README.md.
//
// The site is static, so a few agent features need the edge:
//   1. Content negotiation: `Accept: text/markdown` on a page URL returns the
//      page's .md file (the Cloudflare docs pattern).
//   2. Discovery headers on every response: `Link: </llms.txt>; rel="llms-txt"`,
//      the page's Markdown alternate, and `X-Llms-Txt`.
//   3. Real 404 status codes. The origin answers unknown paths with the 404 page
//      and status 200, so agents cannot tell a typo from a page. Agents get a
//      Markdown 404 that points at /llms.txt.
//   4. Agent-traffic logging. Page-view analytics run in JavaScript, which agents
//      never execute; this records agent requests in Workers Analytics Engine
//      (binding AGENT_TRAFFIC) when it is configured.

const AGENTS = [
  ['claude-code', /claude-code|claude-cli/i],
  ['claude', /Claude-User|Claude-SearchBot|ClaudeBot|anthropic/i],
  ['cursor', /Cursor/i],
  ['codex', /codex/i],
  ['chatgpt', /ChatGPT-User|OAI-SearchBot|GPTBot|openai/i],
  ['perplexity', /Perplexity/i],
  ['gemini', /Google-Extended|Gemini/i],
  ['copilot', /copilot/i],
  ['mcp-server', /logos-docs-mcp|node(-fetch)?\//i],
  ['script', /curl|wget|python-requests|python-httpx|axios|Go-http-client|undici/i],
];

export function classify(request) {
  const ua = request.headers.get('user-agent') || '';
  const accept = request.headers.get('accept') || '';
  for (const [name, re] of AGENTS) if (re.test(ua)) return name;
  if (/text\/markdown/.test(accept)) return 'unknown-agent';
  return null;
}

const wantsMarkdown = (request) => {
  const accept = request.headers.get('accept') || '';
  const md = accept.match(/text\/markdown(?:;q=([\d.]+))?/);
  if (!md) return false;
  const html = accept.match(/text\/html(?:;q=([\d.]+))?/);
  return !html || Number(md[1] ?? 1) >= Number(html[1] ?? 1);
};

const isPagePath = (path) => !/\.[a-z0-9]+$/i.test(path);
const mdPathFor = (path) => `${path.replace(/\/$/, '') || '/index'}.md`;

const notFoundMarkdown = (path) => `# Page not found

There is no page at \`${path}\` on docs.logos.co.

- Index of every page, with a one-line summary: https://docs.logos.co/llms.txt
- Every page is available as Markdown: add \`.md\` to its URL.
- All docs in one file: https://docs.logos.co/llms-full.txt
`;

function withAgentHeaders(response, path) {
  const res = new Response(response.body, response);
  const links = ['</llms.txt>; rel="llms-txt"'];
  if (isPagePath(path)) links.push(`<${mdPathFor(path)}>; rel="alternate"; type="text/markdown"`);
  res.headers.append('Link', links.join(', '));
  res.headers.set('X-Llms-Txt', '/llms.txt');
  res.headers.append('Vary', 'Accept');
  return res;
}

async function isSoft404(response) {
  if (!(response.headers.get('content-type') || '').includes('text/html')) return false;
  const html = await response.clone().text();
  return /rel=["']?canonical["']? href=["']?https:\/\/docs\.logos\.co\/404\.html/.test(html);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const agent = classify(request);
    const markdown = isPagePath(path) && wantsMarkdown(request);

    let response;
    if (markdown) {
      response = await fetch(new Request(new URL(mdPathFor(path), url), request));
      if (response.ok && !(response.headers.get('content-type') || '').includes('text/html')) {
        response = new Response(response.body, response);
        response.headers.set('content-type', 'text/markdown; charset=utf-8');
      } else {
        response = new Response(notFoundMarkdown(path), {status: 404, headers: {'content-type': 'text/markdown; charset=utf-8'}});
      }
    } else {
      response = await fetch(request);
      const wantsText = /\.(md|txt|json)$/.test(path);
      if (response.status === 200 && (wantsText ? (response.headers.get('content-type') || '').includes('text/html') : await isSoft404(response))) {
        response = agent || wantsText
          ? new Response(notFoundMarkdown(path), {status: 404, headers: {'content-type': 'text/markdown; charset=utf-8'}})
          : new Response(response.body, {status: 404, headers: response.headers});
      } else if (path.endsWith('.md')) {
        response = new Response(response.body, response);
        response.headers.set('content-type', 'text/markdown; charset=utf-8');
      } else if (path.endsWith('.txt')) {
        response = new Response(response.body, response);
        response.headers.set('content-type', 'text/plain; charset=utf-8');
      }
    }

    if (agent && env?.AGENT_TRAFFIC) {
      // blobs: agent, path, served-as; doubles: status. Query with the Analytics Engine SQL API.
      env.AGENT_TRAFFIC.writeDataPoint({
        blobs: [agent, path, markdown || /\.(md|txt)$/.test(path) ? 'markdown' : 'html'],
        doubles: [response.status],
        indexes: [agent],
      });
    }
    return withAgentHeaders(response, path);
  },
};
