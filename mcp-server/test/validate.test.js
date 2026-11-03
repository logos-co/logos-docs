import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateModuleMetadata} from '../src/validate.js';

// The minimal-module template from logos-module-builder.
const template = {
  name: 'minimal',
  display_name: 'Minimal Module',
  version: '1.0.0',
  type: 'core',
  interface: 'universal',
  category: 'example',
  description: 'A minimal example Logos module',
  main: 'minimal_plugin',
  dependencies: [],
  nix: {
    packages: {build: [], runtime: []},
    external_libraries: [],
    cmake: {find_packages: [], extra_sources: [], extra_include_dirs: [], extra_link_libraries: []},
  },
};

const errors = (r) => r.findings.filter((f) => f.severity === 'error').map((f) => f.field);

test('the builder template passes', () => {
  const r = validateModuleMetadata(JSON.stringify(template));
  assert.equal(r.valid, true, JSON.stringify(r.findings));
});

test('invalid JSON is reported', () => {
  assert.deepEqual(errors(validateModuleMetadata('{"name": ')), ['(file)']);
});

test('a dashed name is not a C identifier', () => {
  const r = validateModuleMetadata({...template, name: 'my-module', main: 'my-module_plugin'});
  assert.ok(errors(r).includes('name'));
  assert.match(r.findings.find((f) => f.field === 'name').fix, /my_module/);
});

test('core module without interface quotes the build error', () => {
  const {interface: _, ...noInterface} = template;
  const r = validateModuleMetadata(noInterface);
  const f = r.findings.find((x) => x.field === 'interface');
  assert.equal(f.severity, 'error');
  assert.match(f.message, /declares no interface/);
});

test('main with an extension is an error', () => {
  assert.ok(errors(validateModuleMetadata({...template, main: 'minimal_plugin.so'})).includes('main'));
});

test('ui_qml needs a view, and a backend needs interface universal', () => {
  const r = validateModuleMetadata({...template, type: 'ui_qml', interface: undefined});
  assert.ok(errors(r).includes('view'));
  assert.ok(errors(r).includes('interface'));
});

test('QML-only ui module passes without main', () => {
  const {main: _, interface: __, ...rest} = template;
  const r = validateModuleMetadata({...rest, type: 'ui_qml', view: 'Main.qml', icon: 'icon.png'});
  assert.equal(r.valid, true, JSON.stringify(r.findings));
  assert.equal(r.module_kind, 'ui_qml (QML only)');
});

test('bad dependency entries and self-dependency', () => {
  const r = validateModuleMetadata({...template, dependencies: ['minimal', 42, 'a', 'a']});
  assert.deepEqual(errors(r).sort(), ['dependencies', 'dependencies[0]', 'dependencies[1]'].sort());
});

test('fixes use the corrected module name', () => {
  const r = validateModuleMetadata({...template, name: 'my-module', main: 'my-module_plugin.so'});
  for (const f of r.findings.filter((x) => x.field === 'main')) assert.match(f.fix, /"my_module_plugin"/);
});
