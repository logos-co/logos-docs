import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

// Runs against the local site build: `npm run build` in the repository root first.
const docsJson = fileURLToPath(new URL('../../build/agents/docs.json', import.meta.url));
const serverJs = fileURLToPath(new URL('../src/server.js', import.meta.url));
let client;

before(async () => {
  assert.ok(existsSync(docsJson), `missing ${docsJson}; run npm run build in the repository root`);
  client = new Client({name: 'test', version: '0'});
  await client.connect(new StdioClientTransport({command: process.execPath, args: [serverJs, '--docs', docsJson]}));
});
after(() => client?.close());

const call = async (name, args = {}) => {
  const r = await client.callTool({name, arguments: args});
  const t = r.content[0].text;
  return {isError: r.isError, text: t, json: (() => { try { return JSON.parse(t); } catch { return null; } })()};
};

test('lists the four tools', async () => {
  const {tools} = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['get_page', 'list_sections', 'search_docs', 'validate_module_metadata']);
});

test('list_sections includes use cases and pages', async () => {
  const {json} = await call('list_sections');
  const core = json.find((s) => s.id === 'core');
  assert.ok(core.use_cases.length > 0);
  assert.ok(core.pages.some((p) => p.path === '/core/build-modules/build-and-run-a-logos-core-module'));
});

test('search finds the interface troubleshooting entry', async () => {
  const {json} = await call('search_docs', {query: 'module declares no interface'});
  assert.equal(json.results[0].path, '/core/build-modules/build-and-run-a-logos-core-module');
});

test('get_page accepts a .md URL and a heading', async () => {
  const {text, isError} = await call('get_page', {
    path: 'https://docs.logos.co/core/build-modules/build-and-run-a-logos-core-module.md',
    heading: 'Step 3',
  });
  assert.ok(!isError);
  assert.match(text, /^> Source: https:\/\/docs\.logos\.co\/core/);
  assert.match(text, /## Step 3: Build the module/);
  assert.doesNotMatch(text, /## Step 4/);
});

test('get_page on a missing path suggests pages', async () => {
  const {json, isError} = await call('get_page', {path: '/basecamp/install-basecamp'});
  assert.ok(isError);
  assert.ok(json.did_you_mean.some((p) => p.path === '/basecamp/install-logos-basecamp'));
});

test('validate_module_metadata runs over MCP', async () => {
  const {json} = await call('validate_module_metadata', {metadata: '{"name":"x-y","type":"core"}'});
  assert.equal(json.valid, false);
});
