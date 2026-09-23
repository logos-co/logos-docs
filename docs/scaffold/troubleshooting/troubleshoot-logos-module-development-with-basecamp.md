---
title: Troubleshoot Logos module development with Basecamp
doc_type: troubleshooting
product: core
topics: scaffold, basecamp, modules, troubleshooting
authors: weboko
owner: logos
doc_version: 1
slug: troubleshoot-logos-module-development-with-basecamp
sidebar_position: 1
---

# Troubleshoot Logos module development with Basecamp

#### Diagnose the failures that show up while iterating on a module.

:::info
This page describes `logos-scaffold` **0.3.1**, which pins Basecamp **0.2.3** by default. Run `lgs --version` to check yours.
:::

Most problems in the module development loop share a shape: the build succeeds, no error is printed, and the running application does not do what the source says it should. This page maps those symptoms to their causes.

The commands here assume [Logos Scaffold](../about-logos-scaffold.md) and a module project set up as described in [Develop a Logos module with Logos Scaffold](../get-started/develop-a-logos-module-with-logos-scaffold.md).

## Symptom index

| Symptom | Section |
|:---|:---|
| `lgs basecamp setup` fails with `signal: 9 (SIGKILL)` | [Basecamp setup is killed](#basecamp-setup-is-killed) |
| A rebuilt module behaves as if nothing changed | [Your change is not visible after a rebuild](#your-change-is-not-visible-after-a-rebuild) |
| A module you installed is missing from Basecamp | [An installed module is missing](#an-installed-module-is-missing) |
| `Unix socket path too long (122 >= 104)` | [Module loading aborts with a socket path error](#module-loading-aborts-with-a-socket-path-error) |
| `file '…/logos_token_…' has an unsupported type` during a build | [Builds fail after the first launch](#builds-fail-after-the-first-launch) |
| `refusing to use runtime dir …` or `cannot restrict permissions on runtime dir …` | [Launch refuses the runtime directory](#launch-refuses-the-runtime-directory) |
| `no modules captured` when launching | [Launch finds no modules](#launch-finds-no-modules) |
| `the .lgx has no variant for this stack` during install | [An installed module lacks the platform variant](#an-installed-module-lacks-the-platform-variant) |
| `Invalid null URL`, or a QML singleton holding the wrong values | [A QML type or singleton resolves to the wrong module](#a-qml-type-or-singleton-resolves-to-the-wrong-module) |
| A file you just added is absent at runtime | [A new file is missing from the built package](#a-new-file-is-missing-from-the-built-package) |
| Two instances share identity or crash together | [Two instances collide](#two-instances-collide) |
| `Missing content hashes in manifest` during install | [Install fails with `Missing content hashes in manifest`](#install-fails-with-missing-content-hashes-in-manifest) |
| `Forbidden root entry: assets` during install | [Install fails with `Forbidden root entry: assets`](#install-fails-with-forbidden-root-entry-assets) |
| `no 'main' field in metadata.json` during install | [Install fails inside a Nix build](#install-fails-inside-a-nix-build) |
| `basecamp modules` fails on an unresolved dependency | [A dependency cannot be resolved](#a-dependency-cannot-be-resolved) |
| A sibling sub-flake builds from the wrong source | [A sibling sub-flake override is ignored](#a-sibling-sub-flake-override-is-ignored) |
| `basecamp doctor` reports drift | [Doctor reports drift](#doctor-reports-drift) |
| Two macOS profiles share modules and identity despite isolation | [Profiles share state on macOS](#profiles-share-state-on-macos) |
| The macOS window opens but the UI never renders | [The macOS UI stays blank](#the-macos-ui-stays-blank) |

## Basecamp setup is killed

**Symptom.** `lgs basecamp setup` fails after several minutes with `error: building basecamp (.#app) failed with signal: 9 (SIGKILL)`. The setup log under `.scaffold/logs/` ends mid-way, often right after an `evaluation warning:` or `copying path` line, with no build error.

**Cause.** The machine ran out of memory and the kernel killed Nix. Evaluating the Basecamp 0.2.3 flake, before anything is built, peaks at close to 6 GB of resident memory, because its lock file pins thousands of inputs. Scaffold reports only the signal.

**Fix.** Free memory and run `lgs basecamp setup` again: close other large applications, stop Basecamp instances, and do not run another large build at the same time. Tuning the parallelism or garbage collector of Nix does not reduce the peak noticeably. On a machine with 8 GB of RAM or less that leaves little headroom: stop everything else first, or use a released [Basecamp](../../basecamp/install-logos-basecamp.md) with the [portable workflow](../get-started/develop-a-logos-module-with-logos-scaffold.md#step-7-test-against-a-released-basecamp).

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
     install --file result/logos-<module-name>-module.lgx
# Restart the Basecamp instance that uses <base-dir>.
```

For UI edits, you can skip Basecamp during layout work by running the module in its standalone app:

```bash
lgs basecamp run <module>
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

Do not expect Basecamp's bundled modules, such as `package_manager` or `main_ui`, in a profile's `modules/` directory. Basecamp 0.2.x loads them from next to its own binary, so a profile that lists only your own modules is working correctly.

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

**Symptom.** Modules fail to load and the log contains:

```
[SubprocessContainer] Unix socket path too long (122 >= 104)
```

**Cause.** Loading a module opens a Unix domain socket for it under the temp root, which is `TMPDIR`: `logos_<module>_<id>` in Basecamp 0.2.3, `logos_token_<module>` in older releases. The operating system caps the whole socket path at 104 bytes on macOS and 108 on Linux. A runtime root nested under a long path, for example a `runtime_dir` inside a deep project directory, uses up that budget before the socket name is appended.

**Fix.** Point the runtime root at a short path. Scaffold's default, `/tmp/lgs-<project-hash>-<profile>`, stays well under the limit on every platform, and scaffold exports it as both `TMPDIR` and `XDG_RUNTIME_DIR`. If you configured `runtime_dir` yourself, shorten it or remove it:

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

## Builds fail after the first launch

**Symptom.** The first `lgs basecamp launch` works. Every later `lgs basecamp install` or `launch`, or a second profile launched while the first is running, fails inside `nix build` with:

```
error: file '/.scaffold/basecamp/profiles/alice/xdg-tmp/logos_token_package_manager' has an unsupported type
```

**Cause.** The profile's runtime directory is inside the project tree. The socket name in the error depends on the Basecamp release. When the module flake is the project root, `nix build` copies that tree into the store and refuses to copy the Unix sockets a running Basecamp leaves in the runtime directory. Scaffold releases before 0.3.1 used the in-profile `xdg-tmp` directory by default on Linux; a `runtime_dir` that points inside the project has the same effect.

**Fix.** Upgrade scaffold to 0.3.1 or later, and remove any `runtime_dir` that points inside the project. The default runtime directory is now `/tmp/lgs-<project-hash>-<profile>`, outside the project. The next `launch` also clears the legacy `xdg-tmp` directory, so an affected project recovers without manual clean-up.

## Launch refuses the runtime directory

**Symptom.** `lgs basecamp launch` stops before building anything, with `refusing to use runtime dir <path> — it is a symlink`, `… it exists but is not a directory`, or `cannot restrict permissions on runtime dir <path> — it is owned by another user`.

**Cause.** The runtime directory holds the sockets of running modules, so scaffold only uses a directory it owns and can restrict to mode `0700`. The default `/tmp/lgs-<project-hash>-<profile>` name is predictable, so on a shared machine another user can create it first.

**Fix.** Remove the offending path if it is yours, or point the profile somewhere you control:

```toml
[basecamp.profiles.alice]
runtime_dir = "/tmp/lgs-myname-alice"
```

The check runs before the profile is scrubbed, so nothing is lost.

## Launch finds no modules

**Symptom.** `lgs basecamp launch` fails with ``no modules captured — run `logos-scaffold basecamp modules` before launching.``

**Cause.** `[modules]` in `scaffold.toml` is empty. Every launch scrubs the profile and reinstalls only what that table captures, so launching with an empty table would start a Basecamp with none of your modules.

**Fix.** Capture the modules, check the result, and launch again:

```bash
lgs basecamp modules
lgs basecamp modules --show
lgs basecamp launch alice
```

## An installed module lacks the platform variant

**Symptom.** `lgs basecamp install` or `launch` fails with `the .lgx has no variant for this stack`, followed by `lgpm`'s `Package does not contain variant for platform: linux-x86_64-dev (package provides: linux-amd64)`. With a package installed by other means, the module instead freezes the first time you click it in a development Basecamp, or a portable Basecamp drops it at start-up; `launch` then prints `… missing linux-amd64-dev variant (<module>)` instead of `all linux-amd64-dev variants present ✓`.

**Cause.** The package has no variant for the platform and stack Basecamp runs on. Development builds of Basecamp need the `-dev` key, for example `linux-amd64-dev` or `darwin-arm64-dev`. Portable builds need the bare key, for example `linux-amd64`. A `.lgx` built from the `lgx` output carries `-dev` keys, and one built from `lgx-portable` carries bare keys.

**Fix.** Build the variant that matches the Basecamp you run. Scaffold profiles use the `lgx` output unless `[repos.basecamp].attr` selects a portable stack. For a released AppImage or DMG, use `lgs basecamp build-portable`. For core modules, `lgs basecamp doctor` repeats the variant check for every seeded profile.

## A QML type or singleton resolves to the wrong module

**Symptom.** A QML singleton holds values that belong to a different module, a type renders as another module's component, or the log fills with `Invalid null URL` errors. The module works when run alone in the standalone app and breaks inside Basecamp, where several modules load together.

**Cause.** QML composite types are cached for the whole process, keyed by the type name together with the URI of the module that declared it. A bare directory import such as `import "."` or `import "./theme"` declares no module, so that key carries an empty URI. When two modules loaded into the same host process each contain a file with the same base name, `Theme.qml` or `Card.qml` for instance, the cache can hand one module the other module's type.

**Fix.** Keep your QML under a sub-directory and point `view` in `metadata.json` at it, for example `"view": "qml/Main.qml"`. When the view file sits at the project root, `logos-module-builder` 0.2.x packages that single file and nothing else, so no other QML file or directory reaches the package. Then make every QML directory you import a named module: give it a `qmldir` that declares a module name, and import it by that name.

```
qml/
├── Main.qml
└── SwapTheme/
    ├── qmldir
    └── Theme.qml
```

`qml/SwapTheme/qmldir`:

```
module SwapTheme
singleton Theme 1.0 Theme.qml
```

`qml/SwapTheme/Theme.qml` starts with `pragma Singleton`:

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

**Cause.** The two instances share a base directory, a runtime directory, or both. Shared state means a shared identity; a shared temp root means both instances try to bind the same module socket, and the second bind takes the socket from the first.

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

## Install fails with `Missing content hashes in manifest`

**Symptom.** `lgs basecamp install` or `launch` fails when installing a package, with `Package validation failed: Missing content hashes in manifest`, followed by a scaffold hint about rebuilding the package.

**Cause.** The `lgpm` that scaffold pins for Basecamp 0.2.3 validates each package's structure and Merkle content hashes on install. Packages built by `logos-module-builder` before 0.2.0, including every `tutorial-v1`-era package, carry no hashes. The same applies to a dependency pinned to an old revision, for example `delivery_module` at a `tutorial-v1-compat` commit.

**Fix.** Rebuild the module with `logos-module-builder` 0.2.x, or bundle your `#lib` output with a matching [`nix-bundle-lgx`](https://github.com/logos-co/nix-bundle-lgx). For a dependency, move its `[modules.<name>]` entry, or its input in your `flake.nix`, to a release built with that tooling.

Downgrading `[repos.lgpm].pin` does not help: the Basecamp that the pin set builds embeds the same validating library, and it is the one that reads the installed modules. See [Pinned versions](../about-logos-scaffold.md#pinned-versions).

## Install fails with `Forbidden root entry: assets`

**Symptom.** `lgs basecamp install` or `launch` fails with `Package validation failed: Forbidden root entry: assets`.

**Cause.** The module was built with `logos-module-builder` 0.3.x. Those releases write the package icon to an `assets/` directory at the package root, a layout the `lgpm` pinned for Basecamp 0.2.3 does not accept. The same 0.3.x releases also refuse to build a `ui_qml` package without a 256×256 PNG icon, which 0.2.x does not require.

**Fix.** Pin `logos-module-builder` to a 0.2.x release, for example `github:logos-co/logos-module-builder/0.2.6`, run `nix flake update logos-module-builder`, and reinstall. A dependency built with 0.3.x needs an older revision in its `[modules.<name>]` entry.

## Install fails inside a Nix build

**Symptom.** `lgs basecamp install` fails inside `nix build` with an error such as `no 'main' field in metadata.json`, while `cd <sub-flake> && nix build .#lgx` succeeds.

**Cause.** A sub-flake pulls in a module that itself depends on `logos-module-builder`. Without a `follows` entry, its `flake.lock` ends up with two `logos-module-builder` nodes: your pin, and a second one dragged in transitively. A direct build in that directory uses the sub-flake's own lock and never reads the extra node. When scaffold builds with `--override-input`, the stale node wins.

**Fix.** In each sub-flake that declares both `logos-module-builder` and a dependency that pulls it in, unify them:

```nix
{
  inputs = {
    logos-module-builder.url = "github:logos-co/logos-module-builder/0.2.6";
    delivery_module.url = "github:logos-co/logos-delivery-module/<pinned-rev>";

    # Force the transitive reference onto our pin.
    delivery_module.inputs.logos-module-builder.follows = "logos-module-builder";
  };
}
```

Then run `nix flake update` in that sub-flake and confirm the lock holds a single `logos-module-builder` revision.

## A dependency cannot be resolved

**Symptom.** `lgs basecamp modules` fails, naming a dependency it could not resolve to a flake reference.

**Cause.** A module's `metadata.json` declares a dependency that is not already in `[modules]`, is not one of the modules Basecamp ships with, is not an input of the declaring module's `flake.lock`, and is not in scaffold's built-in table. Scaffold fails rather than dropping it silently, because a missing runtime dependency surfaces much later as an unexplained failure inside Basecamp.

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

**Symptom.** `lgs basecamp doctor` reports a warning about drift or about the pin set.

**Cause and fix.** Doctor reports three kinds of drift, each with its own remedy:

| Warning | Cause | Fix |
|:---|:---|:---|
| Modules not captured | A module source that `basecamp modules` would discover today is missing from `[modules]`. | Run `lgs basecamp modules`. It adds new sources and keeps existing entries. |
| Dependency pin drift | A captured `role = "dependency"` entry points at a different revision from scaffold's default for that module. | Nothing, if the revision is intentional. Otherwise update the entry in `scaffold.toml`. |
| Basecamp pin set | Exactly one of `[repos.basecamp]` and `[repos.lgpm]` is at scaffold's default. | Pin both to a matching pair, then run `lgs basecamp setup`. See [Pinned versions](../about-logos-scaffold.md#pinned-versions). |

Scaffold releases before 0.3.1 also reported a module captured at the project root as not captured, permanently, because they compared the relative reference in `scaffold.toml` with the absolute one discovery produced. Upgrade scaffold if that warning does not clear after `basecamp modules`.

If doctor reports that the Basecamp or `lgpm` binary is missing, or a command tells you Basecamp is not set up in this project, run `lgs basecamp setup`.

## Profiles share state on macOS

**Symptom.** On macOS, two profiles that should be isolated show the same installed modules, the same identity, or the same history. `lgs basecamp paths <profile>` reports distinct directories, and the profile directories on disk really are separate.

**Cause.** On macOS, Basecamp does not honour `XDG_DATA_HOME`, so the per-profile XDG isolation `launch` sets never reaches it. It locates its data tree through an environment override instead, and without one every profile collapses onto the shared `~/Library/Application Support/Logos/LogosBasecamp` (or `LogosBasecampDev` for a development build). In Basecamp 0.2.x this affects development builds as well as the portable bundle. The override changed name between generations: Basecamp 0.1.x reads `LOGOS_DATA_DIR`, and 0.2.x reads `LOGOS_USER_DIR` (the environment-variable equivalent of `--user-dir`) and ignores the old name entirely.

**Fix.** Let `launch` set them, and upgrade scaffold if it is older than 0.3.1. `launch` always sets `LOGOS_USER_DIR` to an absolute per-profile path, on every host and stack, and additionally sets `LOGOS_DATA_DIR` when the host is macOS and `[repos.basecamp].attr` selects a portable stack (`bin-macos-app`, `bin-appimage`, `bin-bundle-dir`). Confirm what a profile resolves with:

```bash
lgs basecamp paths alice --json
```

If you declare either key yourself in `[basecamp.env]` or `[basecamp.profiles.<name>.env]`, your value wins and the two keys are resolved independently, so setting only one leaves the other at the profile default and the two can end up pointing at different trees. On a pinned 0.2.x Basecamp, `LOGOS_USER_DIR` is the one that matters: setting only `LOGOS_DATA_DIR` is the same as setting nothing.

## The macOS UI stays blank

**Symptom.** On macOS, Basecamp starts and backend modules load, but the interface never renders. The log mentions a shared library that was not found.

**Cause.** A relative value for the module-root override. Backend modules still load, but the dynamically loaded UI libraries fail to resolve their paths, so the shell never appears.

**Fix.** Use an absolute path, or let scaffold set it. `launch` points `LOGOS_USER_DIR` (and, on the macOS portable stack, `LOGOS_DATA_DIR`) at the profile's module root, and rewrites a relative value from `[basecamp.env]` or `[basecamp.profiles.<name>.env]` to an absolute one against the project root. An empty or whitespace-only value counts as unset and falls back to the profile default.

## Collect diagnostics

If a problem survives all of the above, gather the evidence before reporting it:

```bash
lgs basecamp doctor --json
lgs report --tail 500
```

`report` writes a `.tar.gz` bundle for a GitHub issue. It collects only a fixed list of logs and state, redacts what it collects, and lists anything it skipped. Inspect the archive with `tar -tzf <path>` before sharing it publicly, and file the issue with the template in [`logos-co/scaffold`](https://github.com/logos-co/scaffold/issues/new/choose).

Per-run build logs live under `.scaffold/logs/`, one file per `install`. To watch a build as it happens instead:

```bash
lgs basecamp install --print-output
```

## Related documentation

- [Develop a Logos module with Logos Scaffold](../get-started/develop-a-logos-module-with-logos-scaffold.md)
- [About Logos Scaffold](../about-logos-scaffold.md)
- [Build and run a Logos core module](../../core/build-modules/build-and-run-a-logos-core-module.md)
