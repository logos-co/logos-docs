// node --test edge/worker.test.mjs — runs the worker against a fake origin.
import {test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

const pages = {
  '/core/x': ['<html>page</html>', 'text/html'],
  '/core/x.md': ['# X\n', 'application/octet-stream'],
  '/llms.txt': ['# Logos documentation\n', 'text/plain'],
};
const soft404 = '<html><link rel=canonical href=https://docs.logos.co/404.html /></html>';
let points;
beforeEach(() => {
  points = [];
  globalThis.fetch = async (req) => {
    const path = new URL(req.url).pathname;
    const [body, type] = pages[path] || [soft404, 'text/html'];
    return new Response(body, {status: 200, headers: {'content-type': type}});
  };
});
const env = {AGENT_TRAFFIC: {writeDataPoint: (p) => points.push(p)}};
const get = (path, headers = {}) => worker.fetch(new Request(`https://docs.logos.co${path}`, {headers}), env);

test('Accept: text/markdown returns the .md file', async () => {
  const r = await get('/core/x', {accept: 'text/markdown'});
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(await r.text(), '# X\n');
});

test('browsers still get HTML, with discovery headers', async () => {
  const r = await get('/core/x', {accept: 'text/html,*/*;q=0.8'});
  assert.equal(await r.text(), '<html>page</html>');
  assert.match(r.headers.get('link'), /<\/llms\.txt>; rel="llms-txt"/);
  assert.match(r.headers.get('link'), /<\/core\/x\.md>; rel="alternate"; type="text\/markdown"/);
  assert.equal(r.headers.get('x-llms-txt'), '/llms.txt');
});

test('soft 404s become real 404s; agents get Markdown', async () => {
  const human = await get('/nope', {'user-agent': 'Mozilla/5.0'});
  assert.equal(human.status, 404);
  const agent = await get('/nope', {'user-agent': 'Claude-User/1.0'});
  assert.equal(agent.status, 404);
  assert.match(await agent.text(), /llms\.txt/);
  const md = await get('/nope.md');
  assert.equal(md.status, 404);
});

test('.md served with a Markdown content type, agent request logged', async () => {
  const r = await get('/core/x.md', {'user-agent': 'Cursor/1.0'});
  assert.equal(r.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.deepEqual(points[0].blobs, ['cursor', '/core/x.md', 'markdown']);
});
