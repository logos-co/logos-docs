---
title: Module builder Nix API reference
doc_type: reference
product: core
owner: logos
mdx:
  format: md
sidebar_position: 100
description: Look up the Nix functions logos-module-builder provides for building modules.
custom_edit_url: https://github.com/logos-co/logos-module-builder/blob/master/docs/nix-api.md
source_repo: logos-co/logos-module-builder
source_version: 0.3.3
---

# Module builder Nix API reference

#### Look up the Nix functions logos-module-builder provides for building modules.

:::note[Mirrored page]
This page mirrors [`docs/nix-api.md`](https://github.com/logos-co/logos-module-builder/blob/0.3.3/docs/nix-api.md) from
`logos-module-builder` 0.3.3, and is regenerated automatically after each release. To change it, edit
the source in [`logos-co/logos-module-builder`](https://github.com/logos-co/logos-module-builder), not this page.
:::

Complete reference for logos-module-builder Nix functions.

## Overview

The logos-module-builder exposes its API via `lib` attribute:

```nix
logos-module-builder.lib.mkLogosModule { ... }     # core + legacy UI widgets
logos-module-builder.lib.mkLogosQmlModule { ... }  # ui_qml (QML view + optional C++ backend)
```

## mkLogosModule

Builder for core C++ modules and legacy UI widget modules. For `ui_qml` modules (QML view with optional C++ backend), use `mkLogosQmlModule` instead.

### Syntax

```nix
mkLogosModule {
  src = ./.;
  configFile = ./metadata.json;

  # Optional
  flakeInputs = inputs;        # Pass all flake inputs — deps auto-resolved
  externalLibInputs = { };     # For external C libs fetched as flake inputs
  extraBuildInputs = [ ];
  extraNativeBuildInputs = [ ];
  configOverrides = { };
  preConfigure = "";           # String or function: { externalLibs }: "..."
  postInstall = "";
  logosStandalone = null;      # Override logos-standalone-app for `nix run`
}
```

### Parameters

#### src (required)
Path to the module source directory.

```nix
src = ./.;
```

#### configFile (required)
Path to the `metadata.json` configuration file.

```nix
configFile = ./metadata.json;
```

#### flakeInputs (optional)
All flake `inputs`. The builder automatically filters this by `dependencies` in `metadata.json` to resolve module dependencies — you don't need to pass them individually.

```nix
outputs = inputs@{ logos-module-builder, ... }:
  logos-module-builder.lib.mkLogosModule {
    src = ./.;
    configFile = ./metadata.json;
    flakeInputs = inputs;  # dependencies[] in metadata.json are resolved automatically from input names
  };
```

#### externalLibInputs (optional)
Flake inputs for external C/C++ libraries. Keys must match library names in `metadata.json`'s `nix.external_libraries`. For pre-built vendor libraries, use `vendor_path` in `metadata.json` instead — no `externalLibInputs` needed.

The builder auto-detects whether the resolved input is a Nix derivation (via `lib.isDerivation`). If it is, the derivation is used directly. If it's raw source, it's built with `make` / custom command. No flags needed in `metadata.json`.

**Simple format** — bare flake input, resolves to `packages.${system}.default`:

```nix
externalLibInputs = {
  gowalletsdk = inputs.go-wallet-sdk;
};
```

**Structured format** — per-variant package mappings. When any entry uses this format, the builder produces both `lib` and `lib-portable` outputs, each linked against the corresponding external lib variant. The `lgx` output bundles `lib` and `lgx-portable` bundles `lib-portable`.

```nix
externalLibInputs = {
  logos_pm = {
    input = inputs.logos-package-manager;
    packages = {
      default = "lib";           # → input.packages.${system}.lib
      portable = "lib-portable"; # → input.packages.${system}.lib-portable
    };
  };
};
```

**Per-system overrides** — `systems.<system>` reads one target from another package set, under other names, for an input that does not publish that target as `packages.<system>` (see [external-libraries.md](https://github.com/logos-co/logos-module-builder/blob/0.3.3/docs/external-libraries.md#builds-published-under-another-system)):

```nix
externalLibInputs = {
  logosdelivery = {
    input = inputs.logos-delivery;
    packages.default = "liblogosdelivery";
    systems.x86_64-windows = {
      system = "x86_64-linux";   # → input.packages.x86_64-linux
      packages.default = "liblogosdelivery-windows-x86_64";
    };
  };
};
```

#### extraBuildInputs (optional)
Additional Nix packages to add to `buildInputs`.

```nix
extraBuildInputs = with pkgs; [
  openssl
  libsodium
];
```

#### extraNativeBuildInputs (optional)
Additional Nix packages to add to `nativeBuildInputs` (build-time only).

```nix
extraNativeBuildInputs = with pkgs; [
  rustc
  cargo
];
```

#### configOverrides (optional)
Override values from `metadata.json`. Merged recursively.

```nix
configOverrides = {
  version = "2.0.0";
  nix_packages = {
    build = [ "extra-package" ];
  };
};
```

#### metadata.json: `interface`, `codegen`, and Go static libs (automatic)

The builder prepends steps before your `preConfigure`:

- **`"interface": "universal"`** — derives everything from `src/<name>_impl.h` (impl class derived from the module name, e.g. `accounts_module` → `AccountsModuleImpl`) in three steps:

  1. `logos-cpp-generator --header-to-lidl` → `generated_code/<name>.lidl`, the contract (also the events sidecar dependents' typed-event codegen reads)
  2. `logos-qt-host-generator --lidl … --backend cdylib` → `<name>_cdylib_glue.{h,cpp}`, the Qt plugin `logos_host` loads
  3. `logos-cpp-generator --lidl … --backend cdylib` → `<name>_module_impl.cpp`, `<name>_types.h` (and `<name>_events_cdylib.cpp` when the header declares `logos_events:`), the Qt-free C-ABI wrapper around the impl class

  (A single `logos-cpp-generator --from-header --backend qt` call used to do all
  of this; `--backend qt` no longer exists.)

  Optional overrides:

  ```json
  "interface": "universal",
  "codegen": {
    "impl_header": "src/custom_impl.h",
    "impl_class": "CustomImpl"
  }
  ```

  > **Method docs:** a comment directly above a method's declaration becomes that method's
  > `description`, carried in `getMethods()` and shown by `lm methods`, `logoscore module-info`,
  > and Basecamp's Methods list:
  > ```cpp
  > /// Processes the input and returns a result.
  > QString doSomething(const QString& input);
  > ```

- **`"interface": "universal"` + `"type": "ui_qml"`** (handled by `mkLogosQmlModule`) — for a C++ UI backend, `"codegen": { "rep": "src/<name>.rep" }` names the Qt Remote Objects view contract; `repc` runs on it and the `*Backend` class derives the generated `<RepClass>SimpleSource`. The `*Plugin`/`*Interface` glue is still generated.

- **External libraries** — `logos-plugin-qt` already copies flake-built externals into `lib/` before your hook; you usually do **not** need to `cp` them in `preConfigure`.

- **`go_build: true`** on an `nix.external_libraries` entry — passes `-DLOGOS_MODULE_GO_STATIC_LIBS=…` to CMake so `LogosModule.cmake` links the static archive with whole-archive / `-force_load` as needed.

`LOGOS_MODULE_BUILDER_ROOT` always points at **this** flake’s source — both entry points (`mkLogosModule` and `buildCppPlugin`) set it unconditionally, and evaluation throws if `cmake/LogosModule.cmake` is missing from it. That file is the only copy: `logos-plugin-qt` used to ship a second one, and because the override used to be conditional the two were selected by module *type* (every `ui_qml` plugin configured with the backend’s copy, every core module with this one). `logos_module()` echoes the file it was read from at configure time so a future fork is visible in the log.

#### preConfigure (optional)
Extra shell commands (or a function) appended **after** the automatic codegen / setup above.

**String form** — plain shell commands:

```nix
preConfigure = ''
  echo "Running custom preConfigure"
  ./scripts/generate-something.sh
'';
```

**Function form** — receives `{ externalLibs }` with resolved store paths keyed by library name:

```nix
preConfigure = { externalLibs }: ''
  # Only when you need something beyond the defaults
  echo "extra step using ${externalLibs.mylib}"
'';
```

#### postInstall (optional)
Shell commands to run after installation.

```nix
postInstall = ''
  # Custom post-install
  mkdir -p $out/share
  cp extra-files/* $out/share/
'';
```

#### logosStandalone (optional)
Override the `logos-standalone-app` used for `nix run`. By default, `logos-module-builder` bundles `logos-standalone-app` internally and automatically wires up `apps.default` for UI modules (`"type": "ui"` or QML modules). You only need this parameter if you want to use a custom build of `logos-standalone-app`.

```nix
logosStandalone = my-custom-standalone-app;
```

### Return Value

Returns an attribute set with:

```nix
{
  packages = {
    <system> = {
      default = <combined package>;
      <name>-lib = <library package>;
      <name>-include = <headers package>;
      lib = <library package>;
      include = <headers package>;
      lgx = <lgx package>;              # always included
      lgx-portable = <portable lgx>;    # always included
      install = <dev install package>;  # always included
      install-portable = <portable install package>;  # always included

      # Only when externalLibInputs uses structured format with variants:
      <name>-lib-portable = <portable library package>;
      lib-portable = <portable library package>;
    };
  };

  devShells = {
    <system> = {
      default = <dev shell>;
    };
  };

  apps = { ... };  # only for type="ui" (legacy widget modules)

  config = <parsed config>;
  metadataJson = <metadata.json content>;
}
```

### Example

```nix
{
  inputs = {
    logos-module-builder.url = "github:logos-co/logos-module-builder";
    waku_module.url = "github:logos-co/logos-waku-module";  # input name must match dependency name
  };

  outputs = inputs@{ logos-module-builder, ... }:
    logos-module-builder.lib.mkLogosModule {
      src = ./.;
      configFile = ./metadata.json;
      flakeInputs = inputs;
      preConfigure = ''
        echo "Building my module..."
      '';
    };
}
```

---

## mkLogosQmlModule

Builder for `ui_qml` modules — QML view with an optional C++ backend. Validates that `metadata.json` has `"type": "ui_qml"` and a non-null `"view"` field. When `"main"` is declared, compiles the C++ backend via `buildCppPlugin` and bundles it alongside the QML view. When `"main"` is absent, produces a QML-only output (no compilation). Always wires `apps.default`.

### Syntax

```nix
mkLogosQmlModule {
  src = ./.;
  configFile = ./metadata.json;

  # Optional — same parameters as mkLogosModule
  flakeInputs = inputs;
  externalLibInputs = { };
  extraBuildInputs = [ ];
  extraNativeBuildInputs = [ ];
  configOverrides = { };
  preConfigure = "";
  postInstall = "";
  logosStandalone = null;
}
```

### Return Value

```nix
{
  packages = {
    <system> = {
      default = <combined plugin (if backend) + QML view>;
      <name>-lib = <library package>;       # only when backend present
      lib = <library package>;              # only when backend present
      lgx = <lgx package>;
      lgx-portable = <portable lgx>;
      install = <dev install package>;
      install-portable = <portable install package>;
    };
  };

  devShells = {
    <system> = {
      default = <dev shell>;
    };
  };

  apps = {
    <system> = {
      default = <logos-standalone-app runner>;  # always present
    };
  };

  config = <parsed config>;
  metadataJson = <metadata.json content>;
}
```

### Example (with backend)

```nix
{
  inputs = {
    logos-module-builder.url = "github:logos-co/logos-module-builder";
    calc_module.url = "github:logos-co/logos-tutorial?dir=logos-calc-module";
  };

  outputs = inputs@{ logos-module-builder, ... }:
    logos-module-builder.lib.mkLogosQmlModule {
      src = ./.;
      configFile = ./metadata.json;  # type: ui_qml, main: "calc_ui_cpp_plugin", view: "qml/Main.qml"
      flakeInputs = inputs;
    };
}
```

### Example (QML-only, no backend)

```nix
{
  inputs = {
    logos-module-builder.url = "github:logos-co/logos-module-builder";
  };

  outputs = inputs@{ logos-module-builder, ... }:
    logos-module-builder.lib.mkLogosQmlModule {
      src = ./.;
      configFile = ./metadata.json;  # type: ui_qml, view: "Main.qml" (no "main")
      flakeInputs = inputs;
    };
}
```

---

## parseMetadata

Parse a `metadata.json` file.

### parseModuleConfig

Parse JSON content and apply defaults, resolving any `platforms` overlays for
the given target.

```nix
let
  parseMetadata = logos-module-builder.lib.parseMetadata;
  config = parseMetadata.parseModuleConfig {
    json     = builtins.readFile ./metadata.json;
    platform = parseMetadata.platformForSystem system;   # inside forAllSystems
  };
in {
  inherit (config) name version type category description;
  inherit (config) dependencies nix_packages external_libraries cmake;
}
```

`platform` is **required**. It may be `null`, which means "no target known" —
the parse then succeeds, but any field a `platforms` overlay declares throws
when read instead of quietly returning the base value. That is the shape the
builders use above `forAllSystems`, where only platform-invariant fields
(`name`, `version`, `type`, `interface`) are needed.

### platformForSystem

Turn a nix system string into the `{ os, architecture, abi }` triple that
`when` selectors are matched against.

```nix
logos-module-builder.lib.parseMetadata.platformForSystem "x86_64-windows"
# { os = "windows"; architecture = "x86_64"; abi = "gnu"; }
```

Note the `abi`: the Windows target is mingw (`x86_64-w64-mingw32`). Do not
derive the triple with `lib.systems.elaborate` — it reads the pseudo-system
string alone and answers `msvc`.

### platformOf

The same triple, from a package set that is already in scope.

```nix
logos-module-builder.lib.parseMetadata.platformOf pkgs.stdenv.hostPlatform
```

---

## common

Utility functions.

### systems

List of supported systems.

```nix
logos-module-builder.lib.common.systems
# [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ]
# plus "x86_64-windows" when the logos-nix input is threaded into the builder
```

### getLibExtension

Get library extension for platform.

```nix
logos-module-builder.lib.common.getLibExtension pkgs
# "dylib" on macOS, "so" on Linux
```

### getPluginFilename

Get plugin filename for module.

```nix
logos-module-builder.lib.common.getPluginFilename pkgs "my_module"
# "my_module_plugin.dylib" or "my_module_plugin.so"
```

### collectAllModuleDeps

Recursively resolve all module dependencies (direct + transitive) from flake inputs. Returns a flat attrset mapping module names to their LGX derivations. Used internally by `mkStandaloneApp` to bundle dependencies.

```nix
logos-module-builder.lib.common.collectAllModuleDeps system flakeInputs depNames
# { waku_module = <lgx derivation>; chat = <lgx derivation>; ... }
```

### nameFormats

Convert module name to various formats.

```nix
logos-module-builder.lib.common.nameFormats "my_module"
# { snake = "my_module"; pascal = "MyModule"; camel = "myModule"; upper = "MY_MODULE"; }
```

## Lower-level Builders

For advanced use cases, you can use some lower-level builders directly. Plugin compilation has been delegated to backends — `mkModuleLib` and `mkModuleInclude` no longer exist.

### Plugin Backends

Plugin compilation is delegated to a backend (e.g. `logos-plugin-qt`). The active backends are exposed as `uiBackend` and `coreBackend`:

```nix
logos-module-builder.lib.uiBackend.buildPlugin { ... }
logos-module-builder.lib.uiBackend.buildHeaders { ... }
logos-module-builder.lib.coreBackend.buildPlugin { ... }
```

These are internal implementation details — most modules don't need to call them directly.

### mkExternalLib

Build/resolve external libraries from flake inputs. Returns an attrset mapping library names to derivations. If a resolved input is already a Nix derivation (`lib.isDerivation`), it is used directly; otherwise the source is built with `make` / custom command.

```nix
logos-module-builder.lib.mkExternalLib.buildExternalLibs {
  pkgs = ...;
  config = ...;
  externalInputs = { };
}
```

### mkStandaloneApp

Build the `apps.default` entry for `nix run`.

```nix
logos-module-builder.lib.mkStandaloneApp {
  pkgs = ...;
  standalone = logos-standalone-app.packages.${system}.default;
  plugin = self.packages.${system}.default;
  metadataFile = ./metadata.json;
  dirName = "logos-my-module-plugin-dir";  # optional
  format = "qt-plugin";                    # or "qml"
  moduleDeps = { };                        # resolved module deps (LGX packages)
}
```

## version

Library version string.

```nix
logos-module-builder.lib.version
# "0.2.0"
```
