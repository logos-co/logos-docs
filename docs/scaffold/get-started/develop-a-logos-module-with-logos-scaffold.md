---
title: Develop a Logos module with Logos Scaffold
doc_type: procedure
product: core
topics: scaffold, basecamp, modules
steps_layout: sectioned
authors: weboko
owner: logos
doc_version: 1
slug: develop-a-logos-module-with-logos-scaffold
sidebar_position: 1
---

# Develop a Logos module with Logos Scaffold

#### Build a module, install it into Basecamp, and iterate on it.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**, `logos-scaffold` **0.4.0**, and Basecamp **0.3.0**.
:::

[Logos Scaffold](../about-logos-scaffold.md) drives the loop a module author repeats all day: build the [`.lgx`](../../get-started/glossary.md#lgx) package, install it into a [Basecamp](../../get-started/glossary.md#basecamp) instance, restart Basecamp, and check the result. This guide covers that loop, including running two instances side by side to exercise peer-to-peer features.

:::info[Prerequisites]

- Linux (x86_64 or aarch64) or macOS (arm64 or x86_64). Scaffold is Unix-only.
- [Nix](https://nixos.org/download.html) with flakes enabled. Required by every `basecamp` subcommand.
- `git`, and Rust 1.81 or newer with `cargo`, to install scaffold.
- The Unix process helpers `lsof`, `ps`, and `kill`, which scaffold uses to track the processes it starts.
- A module project that exposes `packages.<system>.lgx` from a `flake.nix`, built with [`logos-module-builder`](https://github.com/logos-co/logos-module-builder) **0.3.0**, the release whose SDK matches Basecamp 0.3.0. See [Pinned versions](../about-logos-scaffold.md#pinned-versions).
    - If you do not have a module yet, start from a 0.3.0 template and pin the builder in the generated `flake.nix`, whose URL the template leaves unpinned:

        ```bash
        mkdir my_ui && cd my_ui && git init
        nix flake init -t github:logos-co/logos-module-builder/0.3.0#ui-qml
        sed -i 's#github:logos-co/logos-module-builder"#github:logos-co/logos-module-builder/0.3.0"#' flake.nix
        git add -A
        ```

    - The `ui-qml` template produces a QML-only module that shows up in the Basecamp sidebar, with the 256×256 icon builder 0.3.x requires in `src/icons/icon.png`. Set `name` and `display_name` in `metadata.json`, and move `Main.qml` into a sub-directory such as `qml/` (updating `view`) if the module will have more than one QML file.
    - The same release has `default` (a minimal core module), `with-external-lib`, `ui-qml-backend`, `rust`, and `rust-with-external-lib` templates.
- About 5 GB of free memory for the first `lgs basecamp setup`, which evaluates the Basecamp 0.3.0 flake before building anything. On a smaller machine, fetch the prebuilt Basecamp first as described in [Basecamp setup is killed](../troubleshooting/troubleshoot-logos-module-development-with-basecamp.md#basecamp-setup-is-killed).
- A graphical environment. Basecamp is a desktop application.
:::

## What to expect

- You can build your module and run it in isolated Basecamp profiles.
- You can apply a source change and see it in a running Basecamp.
- You can run two Basecamp instances at once and exercise peer-to-peer features between them.

## Step 1: Install Logos Scaffold

1. Install both binaries from crates.io:

   ```bash
   cargo install logos-scaffold
   ```

   This installs `logos-scaffold` and its shorter alias `lgs`. They are functionally identical; this guide uses `lgs`.

   To build from source instead, clone [`logos-co/scaffold`](https://github.com/logos-co/scaffold) and run `cargo install --path .` in it.

1. Confirm the install:

   ```bash
   lgs --version
   ```

:::tip
`lgs completions bash` and `lgs completions zsh` print shell completion scripts that cover both binary names. Each subcommand also documents copy-paste examples under `--help`.
:::

## Step 2: Prepare the module project

Run these commands from the root of your module project.

1. Create `scaffold.toml` if the project does not have one:

   ```bash
   lgs init
   ```

   `init` writes `scaffold.toml`, creates `.scaffold/`, and appends `.scaffold` to `.gitignore`. It also installs AI-assistant instructions for the project under `.claude/skills/`, `.cursor/rules/`, and `AGENTS.md`. Run it once per project. If the project already has a `scaffold.toml` from an older schema, `init` migrates it in place and leaves a `scaffold.toml.bak` next to it.

   :::warning
   `init` overwrites an existing `AGENTS.md` at the project root without prompting, and unlike `scaffold.toml` it leaves no `.bak` copy. If your project already has an `AGENTS.md`, commit it or copy it somewhere safe before you run `init`, then merge your content back into the new file.
   :::

1. Pin and build the Basecamp toolchain:

   ```bash
   lgs basecamp setup
   ```

   `setup` pins the Basecamp and [`lgpm`](../../get-started/glossary.md#lgpm) versions the project builds against, builds both with Nix, and seeds the `alice` and `bob` profile directories under `.scaffold/basecamp/profiles/`. The first run downloads and builds a lot; later runs are cheap and do nothing when the pin has not changed. Build output goes to `.scaffold/logs/<timestamp>-setup-*.log`.

   The two pins move as a set: scaffold's default `lgpm` is the revision the pinned Basecamp release locks, because Basecamp reads installed modules with that same library. If the project still carries the default pins of an earlier scaffold release, such as Basecamp 0.2.3, `setup` first rewrites them to the 0.3.0 set and prints each change. See [Pinned versions](../about-logos-scaffold.md#pinned-versions).

   Once a pin has been built, running `setup` again reuses that build and prints `basecamp (.#app) already built at /nix/store/…; skipping nix build`, instead of evaluating the Basecamp flake a second time.

   Neither binary lands on your `PATH`. The Basecamp checkout and the build results live under scaffold's [cache root](../about-logos-scaffold.md#project-layout), shared by every project that uses the same pin, and scaffold records their paths in `.scaffold/state/basecamp.state`.

   If the Basecamp build fails with `signal: 9 (SIGKILL)`, the machine ran out of memory. See [Basecamp setup is killed](../troubleshooting/troubleshoot-logos-module-development-with-basecamp.md#basecamp-setup-is-killed).

1. Capture the set of modules to install, then review what was captured:

   ```bash
   lgs basecamp modules
   lgs basecamp modules --show
   ```

   `basecamp modules` discovers the `flake.nix` at the project root that exposes `packages.<system>.lgx`, or, when the root has none, every immediate sub-directory flake that does. It resolves the runtime dependencies each module declares in `metadata.json`, under `dependencies` or `optional_dependencies` and as plain names or `{"name": …, "version": …}` objects, and writes the result to the `[modules]` table in `scaffold.toml`. `--show` prints the current table without changing it:

   ```toml
   [modules.tictactoe]
   flake = "path:./tictactoe#lgx"
   role = "project"

   [modules.delivery_module]
   flake = "github:logos-co/logos-delivery-module/<rev>#lgx"
   role = "dependency"
   ```

   `role = "project"` marks a module you build locally, `role = "dependency"` a runtime companion. Sources inside the project are recorded as relative references, `path:.#lgx` for a module at the project root and `path:./<dir>#lgx` for a sub-directory, so the committed file works in any checkout. The table is hand-editable, and re-running `basecamp modules` never overwrites an existing entry.

   Modules that Basecamp bundles itself (`capability_module`, `modules_state`, `package_downloader`, `package_manager`, and `package_manager_ui`) are never captured. Basecamp loads them from next to its own binary, so they do not appear in a profile's `modules/` directory either. A profile listing only your own modules is expected.

:::info
`lgs basecamp docs` prints the full module-project contract, including the dependency-resolution rules and the `[modules]` schema. It works outside a scaffold project too, so you can read the contract before running `lgs init`.
:::

## Step 3: Build and install the module

1. Build every captured module and install the results into both seeded profiles:

   ```bash
   lgs basecamp install
   ```

   Dependencies are built and installed first, then project modules; the first failure stops the run. Each source is built through Nix and installed with `lgpm`, which validates the package structure and content hashes. Output goes to a timestamped log under `.scaffold/logs/`, with a one-line status per build; pass `--print-output`, or set `LOGOS_SCAFFOLD_PRINT_OUTPUT=1`, to stream the Nix output to your terminal instead.

   If `[modules]` is empty, `install` runs `basecamp modules` first and prints what it captured.

1. Check the project's Basecamp health:

   ```bash
   lgs basecamp doctor
   ```

   `doctor` checks that `setup` built Basecamp and `lgpm` and seeded the profiles, and reports:

   - The Basecamp and `lgpm` pin set, warning when only one of the pair is at scaffold's default.
   - The captured modules, with the tag or commit of each remote reference.
   - A manifest variant check per profile, flagging installed modules whose `manifest.json` lacks an entry for the current platform.
   - Dependency pin drift: a captured `role = "dependency"` revision that differs from scaffold's default.
   - Discovery drift: module sources that `basecamp modules` would discover today but that are missing from `[modules]`.

   Add `--json` for machine-readable output.

## Step 4: Launch Basecamp

1. Start a profile:

   ```bash
   lgs basecamp launch alice
   ```

   `launch` performs these steps in order:

   1. Stops the Basecamp instance this profile started last time, if it is still running.
   1. Fails straight away if `[modules]` is empty, or if the profile's runtime directory cannot be used, before anything is deleted.
   1. Removes the profile's data and cache.
   1. Rebuilds and reinstalls every captured module into the profile.
   1. Prints a one-line variant check of the installed core modules, for example `launch: profile alice has 3 module(s); all linux-amd64-dev variants present ✓`. The count covers `modules/` only, so a project of QML-only modules reports `0 module(s)`.
   1. Starts Basecamp with the profile's environment.

1. Confirm your module appears in the Basecamp window and behaves as expected. A UI module gets an entry in the sidebar, shown with its initials when it ships no icon; click it to open the module.

   To keep a copy of the window's output, add `--log-file`. Bare `--log-file` writes to `.scaffold/basecamp/profiles/<profile>/basecamp.log` and still tees to your terminal; `--log-file=PATH` picks the file.

:::warning
Removing the profile's data on every launch is deliberate: every launch starts from a clean profile, so identity keys, conversations, any other in-app state, per-module persisted state in `module_data/`, and Basecamp's own `logs/` are discarded. That is what makes runs reproducible. If you need state that survives a restart, run Basecamp yourself against a fixed base directory as described in [Step 6](#step-6-run-two-instances-side-by-side).
:::

To see the paths a profile resolves without launching or changing anything, including the XDG directories, the runtime directory, and Basecamp's `modules/`, `plugins/`, `module_data/`, and `logs/` directories:

```bash
lgs basecamp paths alice --json
```

### What `launch` sets on the Basecamp process

`launch` adds these variables to the environment `lgs` itself inherited; it clears nothing. `<profile-dir>` is `.scaffold/basecamp/profiles/<profile>/`.

| Variable | Value | Set when |
|:---|:---|:---|
| `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME` | `<profile-dir>/xdg-config`, `xdg-data`, `xdg-cache` | Always |
| `TMPDIR`, `XDG_RUNTIME_DIR` | The profile's runtime directory: a configured `runtime_dir`, otherwise `/tmp/lgs-<project-hash>-<profile>` | Always |
| `LOGOS_PROFILE` | The profile name | Always |
| `LOGOS_USER_DIR` | `<profile-dir>/xdg-data/Logos/LogosBasecamp`, with `Dev` appended for a non-portable Basecamp build. This is Basecamp's base directory for the profile. | Always |

You can layer your own variables on top in `scaffold.toml`. They apply in this order, last writer wins:

1. `[basecamp.env_append]`, whose lists are `:`-joined onto the value `lgs` inherited, for path-style variables.
1. The profile's `env_file`, a dotenv-style `KEY=VALUE` file.
1. `[basecamp.env]`, applied to every profile.
1. The profile's own variables, in a `[basecamp.profiles.<name>.env]` table.

```toml
[basecamp.env]
LOG_LEVEL = "debug"

[basecamp.profiles.alice.env]
LOG_LEVEL = "trace"
```

:::warning
Write each `env` as its own `[… .env]` table, as above. `logos-scaffold` 0.4.0 silently ignores the inline form, `env = { KEY = "value" }`, for both `[basecamp]` and profiles.

`[basecamp.env_append]` cannot extend `QT_PLUGIN_PATH`, `QML2_IMPORT_PATH`, or `LD_LIBRARY_PATH` with Basecamp 0.3.0: its launcher script sets those three variables outright, replacing whatever it inherits.
:::

`LOGOS_USER_DIR` is post-processed after that layering: an absolute value you set is kept, a relative one is rewritten to absolute against the project root, and an empty one counts as unset and falls back to the profile default.

## Step 5: Iterate on a source change

Building a module does not update a running Basecamp. Basecamp loads modules once, at startup, from the copies installed in its base directory, so a rebuilt `.lgx` reaches a running instance only after it is reinstalled there and Basecamp restarts.

1. Edit your source. If you add a file, stage it before the next build:

    ```bash
    git add -A
    ```

    :::warning
    A Nix flake whose `src = ./.` only sees files that git tracks, and that holds for scaffold's own builds too. A new file that you have not staged is silently absent from the build: the build succeeds, the `.lgx` is produced, and the module misbehaves at runtime. This includes `qmldir` files, QML assets, and configuration files. See [A new file is missing from the built package](../troubleshooting/troubleshoot-logos-module-development-with-basecamp.md#a-new-file-is-missing-from-the-built-package).
    :::

1. Relaunch every profile you are testing. `launch` rebuilds the module, reinstalls it into the profile, and starts a fresh instance:

    ```bash
    lgs basecamp launch alice
    ```

    - Repeat it for each profile. Relaunching `alice` leaves a running `bob` on the previous build.

### Iterate without scaffold

Without scaffold, do the same three moves by hand: rebuild the `.lgx`, reinstall it into **every** base directory you test against with an [`lgpm`](../../get-started/glossary.md#lgpm) on your `PATH`, and restart Basecamp:

```bash
nix build .#lgx

lgpm --modules-dir /tmp/basecamp-a/modules \
     --ui-plugins-dir /tmp/basecamp-a/plugins \
     install --file result/logos-<module-name>-module.lgx

# Then close and restart the Basecamp instance that uses /tmp/basecamp-a.
```

Use an `lgpm` built from the same `logos-package-manager` revision as the Basecamp you run. Basecamp reads installed modules with that library, so a mismatched `lgpm` can write packages the app cannot load.

You can also install a `.lgx` through the Package Manager UI inside Basecamp, which installs into the base directory of the instance you clicked in. The restart requirement is unchanged.

To produce artifacts without installing them anywhere, use `lgs basecamp build`. It builds the captured project modules and writes load-ordered symlinks under `.scaffold/basecamp/lgx/` and `.scaffold/basecamp/portable/`:

```bash
lgs basecamp build                              # both variants (the default)
lgs basecamp build --variant lgx --module swap  # one variant, one module
```

### Iterate faster on a single module

These loops skip a full Basecamp launch while you work on one module. Use them for iteration, then go back to Basecamp to verify the module in its real host.

- `lgs basecamp run <module>` runs a captured module through `nix run` in its own standalone app, so you exercise the module without the rest of the stack. It runs the flake's default app, or the app named by `standalone_app` in the module's `[modules.<name>]` entry. A module captured from a prebuilt `.lgx` file has no app to run.
- For QML-only changes, `logos-module-builder` 0.3.0 has a `ui-dev` target that reloads QML from your working tree on every save:

  ```bash
  nix build .#ui-dev
  ./result/bin/run-logos-standalone-ui
  ```

  It prints `hot-reloading QML from <project>/qml` and then `QML reloaded …` after each edit. Rebuild only when you change something other than QML.
- `lgs basecamp develop <module>` drops you into that module's Nix dev shell when you need to build by hand.

## Step 6: Run two instances side by side

Peer-to-peer features need two instances. Each one needs its own base directory, otherwise both write to the same state. Choose one of the two options below: scaffold profiles, or Basecamp instances you start yourself.

### Option A—Scaffold profiles

Open two terminals, both at the project root:

```bash
# Terminal 1
lgs basecamp launch alice
```

```bash
# Terminal 2
lgs basecamp launch bob
```

Each window gets its own configuration, data, and cache directories under `.scaffold/basecamp/profiles/<profile>/`, its own runtime directory under `/tmp`, and `LOGOS_PROFILE` set to the profile name. An action in `alice` should be observable in `bob`.

To add more profiles, declare them in `scaffold.toml`. Unknown profiles are seeded on first launch:

```toml
[basecamp.profiles.maker]
env_file    = ".env"
runtime_dir = "/tmp/lgs-maker"
log_file    = ".scaffold/basecamp/profiles/maker/basecamp.log"

[basecamp.profiles.maker.env]
SWAP_UI_AUTO_ROLE = "maker"

[basecamp.profiles.taker]
env_file = ".env.taker"

[basecamp.profiles.taker.env]
SWAP_UI_AUTO_ROLE = "taker"
```

`log_file` makes every launch of that profile tee its output, as `--log-file` does.

### Option B—Your own Basecamp with `--user-dir`

When you run Basecamp yourself instead of through scaffold, isolate the instances with `--user-dir` (short form `-u`), which sets the base directory holding `plugins/`, `modules/`, `module_data/`, and `logs/`:

```bash
LogosBasecamp --user-dir /tmp/basecamp-a &
LogosBasecamp --user-dir /tmp/basecamp-b &
```

Basecamp creates the directory if it is missing and resolves the flag to an absolute path. Setting the `LOGOS_USER_DIR` environment variable is equivalent, except that the variable is used exactly as given, so give it an absolute path.

The executable name depends on how you installed Basecamp: `./result/bin/LogosBasecamp` for a Nix build, `./logos-basecamp.AppImage` for the Linux release, or the application bundle on macOS. The flag is the same in all cases.

Remember that each base directory holds its own copy of your module. Installing a new build into `/tmp/basecamp-a` does nothing for the instance running out of `/tmp/basecamp-b`.

### Where Basecamp stores state without `--user-dir`

If you pass no override, the base directory depends on how Basecamp was built. A non-portable build (a local `nix build .#app`, the usual developer build) appends `Dev` to the standard application data location, so that a development build and an installed release do not share state:

| How Basecamp runs | Base directory |
|:---|:---|
| `--user-dir <path>` or `LOGOS_USER_DIR=<path>` | `<path>`, exactly as given |
| Portable build (AppImage, DMG, bundle) with no override | `~/.local/share/Logos/LogosBasecamp` on Linux, `~/Library/Application Support/Logos/LogosBasecamp` on macOS |
| Non-portable build with no override | The same path with `Dev` appended, for example `~/.local/share/Logos/LogosBasecampDev` |

This trips people up in one specific way: you install a module, launch the other build, and the module is not there. Both builds behaved correctly; they simply looked in different directories. Passing `--user-dir` explicitly removes the ambiguity.

:::info
On macOS, Basecamp does not honour `XDG_DATA_HOME`: without an override, every instance of a build falls back to the shared `~/Library/Application Support/Logos/LogosBasecamp` (or `LogosBasecampDev`), for development builds and the portable bundle alike. Basecamp reads the override from `LOGOS_USER_DIR`, the environment-variable equivalent of `--user-dir`, and `lgs basecamp launch` always sets it to an absolute per-profile path. Set it yourself only if you need a different tree, and always use an absolute path: a relative value scatters state and can leave the UI unable to resolve its libraries. Basecamp 0.1.x's `LOGOS_DATA_DIR` is no longer read or set.
:::

### Keep runtime paths short

When a module loads, the Logos runtime opens a Unix domain socket for it under the temp root, which is `TMPDIR`: `logos_<module>_<id>` in Basecamp 0.2.3 and later, `logos_token_<module>` in older releases. The operating system caps the full socket path at 104 bytes on macOS and 108 on Linux, and a long runtime root overflows that budget before the socket name is even appended. Module loading then aborts with:

```
[SubprocessContainer] Unix socket path too long (122 >= 104)
```

Scaffold gives every profile its own short runtime directory and exports it as both `TMPDIR` and `XDG_RUNTIME_DIR`:

1. `[basecamp.profiles.<name>].runtime_dir`, if set. A relative path is joined to the project root.
1. Otherwise `/tmp/lgs-<project-hash>-<profile>` on every platform, where `<project-hash>` is the first eight hex characters of a SHA-256 of the project's path. The hash keeps two checkouts of the same project from sharing a directory.

```toml
[basecamp.profiles.alice]
runtime_dir = "/tmp/lgs-alice"
```

The default lives outside the project on purpose. A module flake is often the project root itself, and `nix build` copies that tree into the store; it refuses to copy the sockets a running Basecamp leaves behind. A runtime directory inside the project therefore breaks every build after the first launch. If you set `runtime_dir`, keep it short and outside the project tree.

Scaffold creates the directory with mode `0700` before it touches the profile. It refuses to use a runtime directory that is a symbolic link, is not a directory, or belongs to another user and cannot be restricted to `0700`, because the sockets in it give access to running modules.

A distinct runtime root per instance matters for a second reason on every platform: two instances sharing one temp root can collide on the same module socket, and the second instance to bind takes the socket away from the first.

## Step 7: Test against a released Basecamp

Profiles run the Basecamp build that `basecamp setup` pinned. To test your module against a released AppImage or DMG instead, build the portable variant and load it by hand.

1. Build the portable variant of every project module:

    ```bash
    lgs basecamp build --variant lgx-portable
    ```

    - `lgs basecamp build-portable` is the back-compatible alias.
    - Add `--module <name>` to build one module instead of all of them.
    - `role = "dependency"` entries are skipped, because the released build ships its own copies.

    **Expected result:** scaffold prints the built packages in load order and links them into `.scaffold/basecamp/portable/` as `<NN>-<module_name>.lgx`.

1. In the released Basecamp, install each package through its install button, in the printed order.

Portable builds never fall back to the regular `#lgx` output. If a flake does not expose `lgx-portable`, the command fails and tells you so, rather than installing a package that cannot run in a portable host.

To run a portable Basecamp stack in your scaffold profiles instead, set the flake output in `[repos.basecamp]`. The attribute can be mapped per host, with the scalar form as the fallback:

```toml
[repos.basecamp.attr]
aarch64-darwin = "bin-macos-app"
x86_64-linux   = "bin-appimage"
```

## Next steps

- [Troubleshoot Logos module development with Basecamp](../troubleshooting/troubleshoot-logos-module-development-with-basecamp.md)
- [About Logos Scaffold](../about-logos-scaffold.md)
- [Install and load a module in Logos Basecamp](../../basecamp/install-and-load-a-module-in-logos-basecamp.md)
- [Write and deploy an LEZ program with `logos-scaffold`](../../lez/programs/write-and-deploy-lez-program-with-scaffold.md), for the other half of scaffold's surface
