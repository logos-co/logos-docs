# Edge worker for docs.logos.co (optional, not deployed)

`docs.logos.co` is a static Docusaurus build behind Cloudflare. The build already
publishes `.md` pages and `llms.txt` (see `plugins/agent-ready`). Four agent features
need control over HTTP responses, which a static build cannot provide, so they live in
this Cloudflare Worker:

| Feature | Why it matters |
| --- | --- |
| `Accept: text/markdown` on any page URL returns its Markdown | The same URL serves people and agents, as on Cloudflare's own docs. |
| `Link: </llms.txt>; rel="llms-txt"`, a Markdown `rel="alternate"` link, and `X-Llms-Txt` on every response | An agent that lands on any URL can find the index without parsing HTML. |
| Real `404` status codes, with a Markdown body for agents | The origin currently answers unknown paths with the 404 page **and status 200**, so agents (and link checkers) cannot tell a wrong URL from a real page. |
| Agent-traffic logging to Workers Analytics Engine | Umami runs as page JavaScript, which agents never execute, so agent reads are invisible today. |

## Try it

```bash
node --test edge/worker.test.mjs          # unit tests against a fake origin
cp edge/wrangler.toml.example edge/wrangler.toml
cd edge && npx wrangler dev               # local preview, proxies to the real site
```

Deploying needs access to the `logos.co` Cloudflare zone; it is a decision for the
site's infrastructure owners. If a Worker is not an option, a Cloudflare Transform
Rule can add the `Link` and `X-Llms-Txt` headers alone.

## Reading agent traffic

With the `AGENT_TRAFFIC` binding, each agent request writes `blobs = [agent, path,
served_as]`, `doubles = [status]`. For example, agent reads per page over the last
7 days, through the Analytics Engine SQL API:

```sql
SELECT blob1 AS agent, blob2 AS path, count() AS hits
FROM logos_docs_agent_traffic
WHERE timestamp > NOW() - INTERVAL '7' DAY
GROUP BY agent, path
ORDER BY hits DESC
```

Filter on `double1 = 404` to find the URLs agents guess but that do not exist. Those
are the best candidates for redirects or new pages.
