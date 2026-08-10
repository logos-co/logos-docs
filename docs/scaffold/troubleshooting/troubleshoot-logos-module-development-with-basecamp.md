---
title: Troubleshoot Logos module development with Basecamp
doc_type: troubleshooting
product: core
topics: scaffold, basecamp, modules, troubleshooting
authors:
owner: logos
doc_version: 1
slug: troubleshoot-logos-module-development-with-basecamp
sidebar_position: 1
---

# Troubleshoot Logos module development with Basecamp

#### Diagnose the failures that show up while iterating on a module.

Most problems in the module development loop share a shape: the build succeeds, no error is printed, and the running application does not do what the source says it should. This page maps those symptoms to their causes.

The commands here assume [Logos Scaffold](../about-logos-scaffold.md) and a module project set up as described in [Develop a Logos module with Logos Scaffold](../get-started/develop-a-logos-module-with-logos-scaffold.md).

## Symptom index

| Symptom | Section |
|:---|:---|
| A rebuilt module behaves as if nothing changed | [Your change is not visible after a rebuild](#your-change-is-not-visible-after-a-rebuild) |
| A module you installed is missing from Basecamp | [An installed module is missing](#an-installed-module-is-missing) |
| `Unix socket path too long (122 >= 104)` on macOS | [Module loading aborts with a socket path error](#module-loading-aborts-with-a-socket-path-error) |
| `Invalid null URL`, or a QML singleton holding the wrong values | [A QML type or singleton resolves to the wrong module](#a-qml-type-or-singleton-resolves-to-the-wrong-module) |
| A file you just added is absent at runtime | [A new file is missing from the built package](#a-new-file-is-missing-from-the-built-package) |
| Two instances share identity or crash together | [Two instances collide](#two-instances-collide) |
| `no 'main' field in metadata.json` during install | [Install fails inside a Nix build](#install-fails-inside-a-nix-build) |
| `basecamp modules` fails on an unresolved dependency | [A dependency cannot be resolved](#a-dependency-cannot-be-resolved) |
| A sibling sub-flake builds from the wrong source | [A sibling sub-flake override is ignored](#a-sibling-sub-flake-override-is-ignored) |
| `basecamp doctor` reports drift | [Doctor reports drift](#doctor-reports-drift) |
| The macOS window opens but the UI never renders | [The macOS UI stays blank](#the-macos-ui-stays-blank) |

## Your change is not visible after a rebuild

**Symptom.** You edit a source file, run `nix build .#lgx`, the build succeeds, and the running Basecamp behaves exactly as before.

**Cause.** Building a module produces a new package in the Nix store. It does not modify the copy already installed in a Basecamp base directory, and Basecamp resolves and loads its modules once, during startup. Nothing about a successful build reaches a process that is already running.

**Fix.** Complete all three steps of the loop, in order:

1. Rebuild the `.lgx`.
1. Install it into every base directory you are testing against.
1. Restart Basecamp.

With scaffold, one command does all three for a profile, because `launch` rebuilds, reinstalls, and starts a fresh instance:

```bash
lgs basecamp launch alice
```

Repeat it for every profile you have open. A relaunch of `alice` leaves a running `bob` on the previous build.

By hand, per base directory:

```bash
nix build .#lgx
lgpm --modules-dir <base-dir>/modules \
     --ui-plugins-dir <base-dir>/plugins \
     install --file result/<module-name>.lgx
# Restart the Basecamp instance that uses <base-dir>.
```

For QML-only edits, avoid the loop altogether during layout work by running the module in the standalone app with hot reload:

```bash
nix build .#ui-dev
./result/bin/run-logos-standalone-ui
```

## An installed module is missing

**Symptom.** You installed a module, launched Basecamp, and the module is not listed. Or it is present in one Basecamp window and absent in another on the same machine.

**Cause.** Basecamp instances read from different base directories. Without an explicit override, a non-portable build (the usual local `nix build`) appends `Dev` to the standard application data location so it does not share state with an installed release:

| How Basecamp runs | Base directory |
|:---|:---|
| `--user-dir <path>` or `LOGOS_USER_DIR=<path>` | `<path>`, exactly as given |
| Portable build with no override | `~/.local/share/Logos/LogosBasecamp` on Linux, `~/Library/Application Support/Logos/LogosBasecamp` on macOS |
| Non-portable build with no override | The same path with `Dev` appended, for example `~/.local/share/Logos/LogosBasecampDev` |

Installing into one of these directories has no effect on an instance reading another. Scaffold profiles are a third case again: their base directories live under `.scaffold/basecamp/profiles/<profile>/` in the project.

**Fix.** Pass `--user-dir` explicitly whenever you run Basecamp yourself, and install into that same path:

```bash
LogosBasecamp --user-dir /tmp/basecamp-a
```

To see which directories a scaffold profile uses:

```bash
lgs basecamp paths alice --json
```

Also check that the module was captured at all. `lgs basecamp modules --show` prints the set that `install` and `launch` act on; a module missing from that table is never installed.

## Module loading aborts with a socket path error

**Symptom.** On macOS, modules fail to load and the log contains:

```
[SubprocessContainer] Unix socket path too long (122 >= 104)
```

**Cause.** Loading a module opens a Unix domain socket under the runtime directory (`XDG_RUNTIME_DIR`, otherwise `TMPDIR`). macOS caps the whole socket path at 104 bytes. A runtime root nested under a long project path, for example `~/Developer/work/logos/my-module/.scaffold/basecamp/profiles/alice/xdg-tmp`, uses up that budget before the socket name is appended.

**Fix.** Point both `XDG_RUNTIME_DIR` and `TMPDIR` at a short path. Scaffold defaults to `/tmp/lgs-<profile>` on macOS and exports it as both variables. To set it yourself in `scaffold.toml`:

```toml
[basecamp.profiles.alice]
runtime_dir = "/tmp/lgs-alice"
```

When you launch Basecamp outside scaffold, export the variables before starting it:

```bash
export TMPDIR=/tmp/bc-a
export XDG_RUNTIME_DIR=/tmp/bc-a
mkdir -p "$TMPDIR"
```

Keep any override short. A project-relative or deeply nested directory can exceed the budget again once the socket name is appended.

## A QML type or singleton resolves to the wrong module

**Symptom.** A QML singleton holds values that belong to a different module, a type renders as another module's component, or the log fills with `Invalid null URL` errors. The module works when run alone in the standalone app and breaks inside Basecamp, where several modules load together.

**Cause.** QML composite types are cached for the whole process, keyed by the type name together with the URI of the module that declared it. A bare directory import such as `import "."` or `import "./theme"` declares no module, so that key carries an empty URI. When two modules loaded into the same host process each contain a file with the same base name, `Theme.qml` or `Card.qml` for instance, the cache can hand one module the other module's type.

**Fix.** Make every QML directory you import a named module: give it a `qmldir` that declares a module name, and import it by that name.

```
src/qml/
├── Main.qml
├── qmldir
└── SwapTheme/
    ├── qmldir
    └── Theme.qml
```

`src/qml/SwapTheme/qmldir`:

```
module SwapTheme
singleton Theme 1.0 Theme.qml
```

`src/qml/SwapTheme/Theme.qml` starts with the singleton pragma:

```qml
pragma Singleton
import QtQuick

QtObject {
    readonly property color background: "#101014"
}
```

`Main.qml` imports the module by name rather than by path:

```qml
import QtQuick
import SwapTheme          // not: import "." or import "SwapTheme" as a path

Rectangle {
    color: Theme.background
}
```

Two more points:

- `logos-module-builder` generates a `qmldir` for the entry directory of your view, declaring `module com.logos.module.<name>`, and leaves a `qmldir` you ship yourself untouched. Subdirectories are yours to name.
- A `qmldir` is a new file, so it is subject to the git-tracking rule below. Stage it before you build.

## A new file is missing from the built package

**Symptom.** You add a file, the build succeeds, and at runtime the file is not there. A `qmldir` is ignored, an asset does not load, or a configuration file falls back to defaults.

**Cause.** A flake with `src = ./.` builds from the git tree of your project. Files that git does not track are not part of that tree, so they never reach the build. Nothing warns you: the build succeeds and produces a `.lgx` that is quietly incomplete.

**Fix.** Stage new files before building:

```bash
git add -A
nix build .#lgx
```

The files must be tracked, not necessarily committed. Staging is enough.

Make this the reflex after adding any file, and check before a build that surprises you:

```bash
git status --short     # anything marked ?? is invisible to the build
```

## Two instances collide

**Symptom.** Two Basecamp windows show the same identity or the same message history, or one instance crashes shortly after the second starts.

**Cause.** The two instances share a base directory, a temp directory, or both. Shared state means a shared identity; a shared temp root means both instances try to bind the same module socket, and the second bind takes the socket from the first.

**Fix.** Give each instance its own base directory and its own short runtime directory.

With scaffold, launch two different profiles from two terminals at the project root:

```bash
# Terminal 1
lgs basecamp launch alice
```

```bash
# Terminal 2
lgs basecamp launch bob
```

By hand:

```bash
TMPDIR=/tmp/bc-a XDG_RUNTIME_DIR=/tmp/bc-a LogosBasecamp --user-dir /tmp/basecamp-a &
TMPDIR=/tmp/bc-b XDG_RUNTIME_DIR=/tmp/bc-b LogosBasecamp --user-dir /tmp/basecamp-b &
```

Launching the same scaffold profile twice in parallel is not supported. If two instances still collide on a port after isolation, that is a module-level issue worth reporting against the module that owns the port.

## Install fails inside a Nix build

**Symptom.** `lgs basecamp install` fails inside `nix build` with an error such as `no 'main' field in metadata.json`, while `cd <sub-flake> && nix build .#lgx` succeeds.

**Cause.** A sub-flake pulls in a module that itself depends on `logos-module-builder`. Without a `follows` entry, its `flake.lock` ends up with two `logos-module-builder` nodes: your pin, and a second one dragged in transitively. A direct build in that directory uses the sub-flake's own lock and never dereferences the extra node. When scaffold builds with `--override-input`, the stale node wins.

**Fix.** In each sub-flake that declares both `logos-module-builder` and a dependency that pulls it in, unify them:

```nix
{
  inputs = {
    logos-module-builder.url = "github:logos-co/logos-module-builder/tutorial-v1";
    delivery_module.url = "github:logos-co/logos-delivery-module/<pinned-rev>";

    # Force the transitive reference onto our pin.
    delivery_module.inputs.logos-module-builder.follows = "logos-module-builder";
  };
}
```

Then run `nix flake update` in that sub-flake and confirm the lock holds a single `logos-module-builder` revision.

## A dependency cannot be resolved

**Symptom.** `lgs basecamp modules` fails, naming a dependency it could not resolve to a flake reference.

**Cause.** A module's `metadata.json` declares a dependency that is not already in `[modules]`, is not one of the modules Basecamp preinstalls, is not an input of the declaring module's `flake.lock`, and is not in scaffold's built-in table. Scaffold fails rather than dropping it silently, because a missing runtime dependency surfaces much later as an unexplained failure inside Basecamp.

**Fix.** Either declare the dependency as a flake input in the module that needs it, which is the better option because the lock then pins the exact revision your module was built against:

```nix
inputs.delivery_module.url = "github:logos-co/logos-delivery-module/<rev>";
```

Or add the entry to `scaffold.toml` by hand:

```toml
[modules.delivery_module]
flake = "github:logos-co/logos-delivery-module/<rev>#lgx"
role = "dependency"
```

Hand-written entries survive every later `basecamp modules` run.

A related case: scaffold derives the module name for a remote flake reference from the repository slug and prints a note saying so. If the guess is wrong, correct the key in `scaffold.toml`. Re-runs preserve it.

## A sibling sub-flake override is ignored

**Symptom.** A multi-flake project builds a sibling module from its pinned revision instead of your working tree, so local changes to the sibling do not appear.

**Cause.** Scaffold rewrites `path:../<sibling>` inputs to point at the working tree, but it reads `flake.nix` line by line. It recognises `<name>.url = "path:../<sibling>";` and `inputs.<name>.url = "path:../<sibling>";`. A declaration split across lines inside a nested attribute set is not detected.

**Fix.** Flatten the declaration to a single line:

```nix
# Detected
tictactoe_core.url = "path:../tictactoe";

# Not detected
inputs.tictactoe_core = {
  url = "path:../tictactoe";
};
```

Only `path:../<sibling>` inputs are rewritten. `path:./sub`, `github:`, and `git+` references pass through unchanged.

## Doctor reports drift

**Symptom.** `lgs basecamp doctor` reports a difference between the captured module set and what is installed in a profile.

**Cause.** `[modules]` in `scaffold.toml` changed, or a source changed, without a reinstall.

**Fix.** Reinstall, then re-check:

```bash
lgs basecamp install
lgs basecamp doctor
```

If a command tells you Basecamp is not set up in this project, run the one-time `lgs basecamp setup` first.

## The macOS UI stays blank

**Symptom.** On macOS, Basecamp starts and backend modules load, but the interface never renders. The log mentions a shared library that was not found.

**Cause.** The `bin-macos-app` bundle predates `--user-dir` and does not use `XDG_DATA_HOME`. It reads `LOGOS_DATA_DIR` to locate modules and plugins, falling back to `~/Library/Application Support/Logos/LogosBasecamp/`. With a relative `LOGOS_DATA_DIR`, backend modules still load but the dynamically loaded UI libraries fail to resolve their paths, so the shell never appears.

**Fix.** Set `LOGOS_DATA_DIR` to an absolute path, or let scaffold set it. Scaffold points it at the profile's module root when it launches that stack, and rewrites a relative value from `[basecamp.env]` or `[basecamp.profiles.<name>.env]` to an absolute one.

## Collect diagnostics

If a problem survives all of the above, gather the evidence before reporting it:

```bash
lgs basecamp doctor --json
lgs report --tail 500
```

`report` bundles the relevant logs and state from `.scaffold/logs/`. Inspect the archive with `tar -tzf <path>` before sharing it publicly.

Per-run build logs live under `.scaffold/logs/`, one file per `install`. To watch a build as it happens instead:

```bash
lgs basecamp install --print-output
```

## Related documentation

- [Develop a Logos module with Logos Scaffold](../get-started/develop-a-logos-module-with-logos-scaffold.md)
- [About Logos Scaffold](../about-logos-scaffold.md)
- [Build and run a Logos core module](../../core/build-modules/build-and-run-a-logos-core-module.md)
