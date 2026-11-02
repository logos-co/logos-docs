// Checks a Logos module metadata.json against the rules the Logos docs state.
// This is the docs' equivalent of Svelte's `svelte-autofixer`: an agent runs it
// on the file it just wrote, before handing the result back to the user.
//
// Every rule cites the page it comes from. Keep the rules to what the docs
// say; if logos-module-builder changes, update the docs first, then this file.

const DOCS = 'https://docs.logos.co';
const CORE_GUIDE = `${DOCS}/core/build-modules/build-and-run-a-logos-core-module.md`;
const UI_GUIDE = `${DOCS}/core/build-modules/build-a-logos-cpp-ui-module.md`;
const CLIB_GUIDE = `${DOCS}/core/build-modules/wrap-a-c-library-as-a-logos-core-module.md`;
const LGX_REF = `${DOCS}/core/reference/lgx-package-format-and-bundling-reference.md`;

const KNOWN_TYPES = ['core', 'ui_qml'];
const KNOWN_FIELDS = new Set([
  'name', 'display_name', 'version', 'type', 'interface', 'category', 'description', 'main',
  'view', 'icon', 'backend', 'dependencies', 'optional_dependencies', 'interface_dependencies',
  'provides', 'uses', 'codegen', 'nix', 'platforms', 'author', 'license', 'homepage', 'repository',
]);
const C_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

/**
 * @param {string | object} input metadata.json text or parsed object
 * @returns {{valid: boolean, module_kind: string, findings: Array<{severity: 'error'|'warning'|'info', field: string, message: string, fix?: string, doc: string}>}}
 */
export function validateModuleMetadata(input) {
  const findings = [];
  const add = (severity, field, message, doc, fix) =>
    findings.push({severity, field, message, ...(fix ? {fix} : {}), doc});

  let meta = input;
  if (typeof input === 'string') {
    try {
      meta = JSON.parse(input);
    } catch (e) {
      add('error', '(file)', `Not valid JSON: ${e.message}`, CORE_GUIDE);
      return {valid: false, module_kind: 'unknown', findings};
    }
  }
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    add('error', '(file)', 'metadata.json must be a JSON object.', CORE_GUIDE);
    return {valid: false, module_kind: 'unknown', findings};
  }

  // name
  if (typeof meta.name !== 'string' || !meta.name) {
    add('error', 'name', '`name` is required.', CORE_GUIDE);
  } else if (!C_IDENTIFIER.test(meta.name)) {
    add('error', 'name',
      `\`name\` must be a valid C identifier (letters, digits, underscores; not starting with a digit). Got "${meta.name}". It is used in file names, method calls and module loading.`,
      CORE_GUIDE, `"name": "${meta.name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1')}"`);
  }
  // Fixes below use the corrected name, so they stay valid when `name` is not.
  const name =
    typeof meta.name === 'string' && meta.name
      ? meta.name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1')
      : '<module-name>';

  // version
  if (meta.version === undefined) {
    add('error', 'version', '`version` is missing. Every template sets it, and packages are versioned from it.', LGX_REF, '"version": "1.0.0"');
  } else if (typeof meta.version !== 'string' || !SEMVER.test(meta.version)) {
    add('warning', 'version', `\`version\` should be a semantic version such as "1.0.0". Got ${JSON.stringify(meta.version)}.`, LGX_REF);
  }

  // type
  const type = meta.type ?? 'core';
  if (meta.type === undefined) {
    add('warning', 'type', '`type` is missing; the build treats the module as "core". Set it explicitly.', CORE_GUIDE, '"type": "core"');
  } else if (!KNOWN_TYPES.includes(meta.type)) {
    add('error', 'type', `Unknown \`type\` "${meta.type}". The docs describe "core" (no UI) and "ui_qml" (a QML view, optionally with a C++ backend).`, UI_GUIDE);
  }

  for (const f of ['display_name', 'description']) {
    if (typeof meta[f] !== 'string' || !meta[f].trim()) {
      add('warning', f, `\`${f}\` is empty or missing. Basecamp, \`lm\` and \`logosctl module show\` display it.`, CORE_GUIDE);
    }
  }

  const hasPlugin = meta.main !== undefined;
  if (type === 'core') {
    if (typeof meta.main !== 'string' || !meta.main) {
      add('error', 'main', '`main` is required for a core module: the plugin file name without its extension.', CORE_GUIDE, `"main": "${name}_plugin"`);
    } else if (meta.main !== `${name}_plugin`) {
      add('warning', 'main', `\`main\` is usually "<module-name>_plugin" ("${name}_plugin"). Got "${meta.main}". It must match the plugin file the build produces.`, CORE_GUIDE, `"main": "${name}_plugin"`);
    }
    if (/\.(so|dylib|dll)$/.test(meta.main || '')) {
      add('error', 'main', '`main` must not include the file extension (.so, .dylib or .dll).', CORE_GUIDE, `"main": "${name}_plugin"`);
    }
  }

  if (type === 'core' && hasPlugin && meta.interface !== 'universal') {
    add('error', 'interface',
      meta.interface === undefined
        ? `A core module must keep "interface": "universal". Without it the build stops with "logos-module-builder: module '${name}' is a core module shipping a plugin (main: ${meta.main}) but declares no interface".`
        : `\`interface\` is "${meta.interface}". The documented authoring model for core modules is "universal".`,
      `${CORE_GUIDE}#the-build-reports-that-the-module-declares-no-interface`, '"interface": "universal"');
  }

  if (type === 'ui_qml') {
    if (typeof meta.view !== 'string' || !meta.view) {
      add('error', 'view', 'A "ui_qml" module needs `view`: the path of its main QML file, for example "qml/Main.qml".', UI_GUIDE, '"view": "qml/Main.qml"');
    } else if (!/\.qml$/.test(meta.view)) {
      add('warning', 'view', `\`view\` should point at a .qml file. Got "${meta.view}".`, UI_GUIDE);
    }
    if (hasPlugin) {
      if (meta.interface !== 'universal') {
        add('error', 'interface', 'A "ui_qml" module with a C++ backend (`main` is set) needs "interface": "universal"; without it the build expects a hand-written plugin.', UI_GUIDE, '"interface": "universal"');
      }
      if (meta.main !== `${name}_plugin`) {
        add('warning', 'main', `\`main\` is usually "${name}_plugin".`, UI_GUIDE, `"main": "${name}_plugin"`);
      }
      if (!meta.codegen || typeof meta.codegen.rep !== 'string') {
        add('warning', 'codegen.rep', 'A C++ UI module declares its backend interface in a .rep file, set in `codegen.rep`.', UI_GUIDE, `"codegen": { "rep": "src/${name}.rep" }`);
      }
    }
    if (!meta.icon) {
      add('info', 'icon', 'No `icon` set. Basecamp shows a default icon in the launcher.', UI_GUIDE);
    }
  }

  // dependencies
  for (const field of ['dependencies', 'optional_dependencies']) {
    if (meta[field] === undefined) continue;
    if (!Array.isArray(meta[field])) {
      add('error', field, `\`${field}\` must be an array of module names.`, CORE_GUIDE, `"${field}": []`);
      continue;
    }
    meta[field].forEach((d, i) => {
      const depName = typeof d === 'string' ? d : d && typeof d === 'object' ? d.name : undefined;
      if (typeof depName !== 'string' || !depName) {
        add('error', `${field}[${i}]`, `Each entry must be a module name string or an object with a \`name\`. Got ${JSON.stringify(d)}.`, CORE_GUIDE);
      } else if (depName === meta.name) {
        add('error', `${field}[${i}]`, 'A module cannot depend on itself.', CORE_GUIDE);
      }
    });
    const names = meta[field].map((d) => (typeof d === 'string' ? d : d?.name)).filter(Boolean);
    const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
    if (dupes.length) add('error', field, `Duplicate entries: ${dupes.join(', ')}.`, CORE_GUIDE);
  }

  // codegen
  if (meta.codegen !== undefined) {
    if (typeof meta.codegen !== 'object' || Array.isArray(meta.codegen) || meta.codegen === null) {
      add('error', 'codegen', '`codegen` must be an object.', CORE_GUIDE);
    } else {
      const {impl_header: h, impl_class: c} = meta.codegen;
      if ((h === undefined) !== (c === undefined)) {
        add('warning', 'codegen', 'Set `codegen.impl_header` and `codegen.impl_class` together; otherwise the other one still defaults to the name-derived value.', `${CORE_GUIDE}#the-build-fails-with-failed-to-open-header-file-or-unknown-type-name`);
      }
    }
  } else if (type === 'core') {
    add('info', 'codegen',
      `Without \`codegen\`, the build parses src/${name}_impl.h and expects a class named ${name.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}Impl.`,
      `${CORE_GUIDE}#the-build-fails-with-failed-to-open-header-file-or-unknown-type-name`);
  }

  // nix block
  if (meta.nix === undefined) {
    add('warning', 'nix', 'The `nix` block is missing. Keep it (even with empty lists): the build and the bundler rely on it.', CORE_GUIDE,
      '"nix": { "packages": { "build": [], "runtime": [] }, "external_libraries": [], "cmake": { "find_packages": [], "extra_sources": [], "extra_include_dirs": [], "extra_link_libraries": [] } }');
  } else if (typeof meta.nix !== 'object' || Array.isArray(meta.nix) || meta.nix === null) {
    add('error', 'nix', '`nix` must be an object.', CORE_GUIDE);
  } else {
    const n = meta.nix;
    for (const k of ['build', 'runtime']) {
      if (n.packages?.[k] !== undefined && !Array.isArray(n.packages[k])) {
        add('error', `nix.packages.${k}`, `\`nix.packages.${k}\` must be an array of nixpkgs attribute names.`, CLIB_GUIDE);
      }
    }
    if (n.external_libraries !== undefined) {
      if (!Array.isArray(n.external_libraries)) {
        add('error', 'nix.external_libraries', '`nix.external_libraries` must be an array.', CLIB_GUIDE);
      } else {
        n.external_libraries.forEach((lib, i) => {
          if (!lib || typeof lib !== 'object' || typeof lib.name !== 'string') {
            add('error', `nix.external_libraries[${i}]`, 'Each external library needs a `name` (the CMake target).', CLIB_GUIDE, '{ "name": "calc", "vendor_path": "lib" }');
          }
        });
      }
    }
    for (const k of ['find_packages', 'extra_sources', 'extra_include_dirs', 'extra_link_libraries']) {
      if (n.cmake?.[k] !== undefined && !Array.isArray(n.cmake[k])) {
        add('error', `nix.cmake.${k}`, `\`nix.cmake.${k}\` must be an array.`, CLIB_GUIDE);
      }
    }
  }

  for (const key of Object.keys(meta)) {
    if (!KNOWN_FIELDS.has(key)) {
      add('info', key, `\`${key}\` is not a field the Logos docs describe. Check the spelling; unknown fields are ignored.`, LGX_REF);
    }
  }

  const kind = type === 'ui_qml' ? (hasPlugin ? 'ui_qml with C++ backend' : 'ui_qml (QML only)') : type;
  return {valid: !findings.some((f) => f.severity === 'error'), module_kind: kind, findings};
}
