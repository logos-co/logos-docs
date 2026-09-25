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

   - `init` also creates `.scaffold/`, appends `.scaffold` to `.gitignore`, and installs AI-assistant instructions under `.claude/skills/`, `.cursor/rules/`, and `AGENTS.md`.
   - A `scaffold.toml` from an older schema is migrated in place, with a `scaffold.toml.bak` next to it.

   :::warning
   `init` overwrites an existing `AGENTS.md` at the project root without prompting, and unlike `scaffold.toml` it leaves no `.bak` copy. If your project already has an `AGENTS.md`, commit it or copy it somewhere safe before you run `init`, then merge your content back into the new file.
   :::

1. Pin and build Basecamp and [`lgpm`](../../get-started/glossary.md#lgpm), and seed the `alice` and `bob` profiles:

   ```bash
   lgs basecamp setup
   ```

   - The first run evaluates and builds a lot; later runs reuse the build and print `basecamp (.#app) already built at /nix/store/…; skipping nix build`.
   - Projects still on the default pins of an earlier scaffold release, such as Basecamp 0.2.3, are moved to the 0.3.0 set first, one printed line per change. See [Pinned versions](../about-logos-scaffold.md#pinned-versions).
   - Neither binary lands on your `PATH`; both live under scaffold's [cache root](../about-logos-scaffold.md#project-layout). Build logs go to `.scaffold/logs/<timestamp>-setup-*.log`.

   If the build fails with `signal: 9 (SIGKILL)`, the machine ran out of memory. See [Basecamp setup is killed](../troubleshooting/troubleshoot-logos-module-development-with-basecamp.md#basecamp-setup-is-killed).

1. Capture the modules to install, then review what was captured:

   ```bash
   lgs basecamp modules
   lgs basecamp modules --show
   ```

   `basecamp modules` discovers the `flake.nix` at the project root that exposes `packages.<system>.lgx`, or, when the root has none, every immediate sub-directory flake that does. It resolves the dependencies each module declares in `metadata.json` and writes the result to `[modules]` in `scaffold.toml`:

   ```toml
   [modules.tictactoe]
   flake = "path:./tictactoe#lgx"
   role = "project"

   [modules.delivery_module]
   flake = "github:logos-co/logos-delivery-module/<rev>#lgx"
   role = "dependency"
   ```

   - `role = "project"` marks a module you build locally, `role = "dependency"` a runtime companion. The keys are described in the [configuration reference](../reference/logos-scaffold-basecamp-configuration-reference.md#modulesname).
   - The table is hand-editable, and re-running `basecamp modules` never overwrites an existing entry.
   - Modules that Basecamp bundles itself, such as `package_manager`, are never captured.

   **Expected result:** `--show` lists your module under `project_sources`, for example `hello_ui = path:.#lgx`.

:::info
`lgs basecamp docs` prints the full module-project contract, including the dependency-resolution rules. It works outside a scaffold project too, so you can read the contract before running `lgs init`.
:::

## Step 3: Build and install the module

1. Build every captured module and install the results into both profiles:

   ```bash
   lgs basecamp install
   ```

   - Dependencies are built and installed first, then project modules; the first failure stops the run.
   - `lgpm` validates each package's structure and content hashes as it installs it.
   - Output goes to a timestamped log under `.scaffold/logs/`. Pass `--print-output` to stream the Nix output instead.

   **Expected result:** `install complete`.

1. Check the project's Basecamp health:

   ```bash
   lgs basecamp doctor
   ```

   `doctor` checks that `setup` built Basecamp and `lgpm` and seeded the profiles. It also reports the pin set, the captured modules, the platform variant of each installed core module, and drift between `[modules]` and what the project would capture today. Add `--json` for machine-readable output.

   **Expected result:** `Doctor status: Ready`.

## Step 4: Launch Basecamp

1. Start a profile:

   ```bash
   lgs basecamp launch alice
   ```

   `launch` stops the instance this profile started last time, removes the profile's data and cache, rebuilds and reinstalls every captured module, and starts Basecamp with the profile's [launch environment](../reference/logos-scaffold-basecamp-configuration-reference.md#launch-environment). It fails before deleting anything if `[modules]` is empty or the profile's runtime directory cannot be used.

   - Before starting Basecamp it prints a variant check of the installed core modules, such as `launch: profile alice has 3 module(s); all linux-amd64-dev variants present ✓`. The count covers core modules only, so a project of QML-only modules reports `0 module(s)`.
   - Add `--log-file` to also write the output to `.scaffold/basecamp/profiles/<profile>/basecamp.log`, or `--log-file=PATH` to pick the file.

1. Confirm your module appears in the Basecamp window. A UI module gets an entry in the sidebar, showing its icon, or its initials when it ships none; click it to open the module.

:::warning
Every launch starts from a clean profile, so identity keys, conversations, other in-app state, per-module state in `module_data/`, and Basecamp's own `logs/` are discarded. That is what makes runs reproducible. If you need state that survives a restart, run Basecamp yourself with `--user-dir`, as in [Step 6](#step-6-run-two-instances-side-by-side).
:::

To see the directories and environment a profile resolves without launching it, run `lgs basecamp paths alice --json`. To add your own variables to the launch, see [Launch environment](../reference/logos-scaffold-basecamp-configuration-reference.md#launch-environment).

## Step 5: Iterate on a source change

Building a module does not update a running Basecamp. Basecamp loads modules once, at startup, from the copies installed in its base directory, so a rebuilt `.lgx` reaches a running instance only after it is reinstalled there and Basecamp restarts.

1. Edit your source. If you add a file, stage it before the next build:

    ```bash
    git add -A
    ```

    :::warning
    `nix build .#lgx`, `lgs basecamp build`, and `build-portable` only see files that git tracks, so a new file you have not staged is silently left out of the package they produce. `lgs basecamp install` and `launch` build from the directory instead and do include it, which means a module can work in your profiles while the package you ship is missing a `qmldir`, a QML file, or a configuration file. Stage every new file before you build a package to share. See [A new file is missing from the built package](../troubleshooting/troubleshoot-logos-module-development-with-basecamp.md#a-new-file-is-missing-from-the-built-package).
    :::

1. Relaunch every profile you are testing. `launch` rebuilds the module, reinstalls it into the profile, and starts a fresh instance:

    ```bash
    lgs basecamp launch alice
    ```

    - Repeat it for each profile. Relaunching `alice` leaves a running `bob` on the previous build.

### Iterate faster on a single module

These loops skip a full Basecamp launch while you work on one module. Use them for iteration, then go back to Basecamp to verify the module in its real host.

- `lgs basecamp run <module>` runs a captured module in its own standalone app through `nix run`, without the rest of the stack.
- For QML-only changes, `logos-module-builder` 0.3.0 has a `ui-dev` target that reloads QML from your working tree on every save. It prints `hot-reloading QML from <project>/qml`, then `QML reloaded …` after each edit:

  ```bash
  nix build .#ui-dev
  ./result/bin/run-logos-standalone-ui
  ```

- `lgs basecamp develop <module>` opens that module's Nix dev shell when you need to build by hand.
- `lgs basecamp build` builds the captured project modules without installing them, and links the packages under `.scaffold/basecamp/lgx/` and `.scaffold/basecamp/portable/` in load order.

### Iterate without scaffold

To do the same by hand, rebuild the `.lgx`, install it into **every** base directory you test against with an `lgpm` built from the same revision as your Basecamp, and restart Basecamp:

```bash
nix build .#lgx

lgpm --modules-dir /tmp/basecamp-a/modules \
     --ui-plugins-dir /tmp/basecamp-a/plugins \
     install --file result/logos-<module-name>-module.lgx

# Then close and restart the Basecamp instance that uses /tmp/basecamp-a.
```

The Package Manager UI inside Basecamp installs into the base directory of the instance you click in; the restart requirement is the same.

## Step 6: Run two instances side by side

Peer-to-peer features need two instances, each with its own base directory and its own runtime directory. Choose one of the two options below.

### Option A—Scaffold profiles

1. In one terminal at the project root, launch the first profile:

    ```bash
    lgs basecamp launch alice
    ```

1. In a second terminal at the project root, launch the second profile:

    ```bash
    lgs basecamp launch bob
    ```

    **Expected result:** two Basecamp windows, each with its own data under `.scaffold/basecamp/profiles/<profile>/`, its own runtime directory under `/tmp`, and `LOGOS_PROFILE` set to the profile name. An action in `alice` should be observable in `bob`.

To add more profiles, such as a `maker` and a `taker`, declare them under `[basecamp.profiles.<name>]` in `scaffold.toml`; see [`[basecamp.profiles.<name>]`](../reference/logos-scaffold-basecamp-configuration-reference.md#basecampprofilesname). Unknown profiles are seeded on first launch.

### Option B—Your own Basecamp with `--user-dir`

1. Install your module into two base directories, one per instance, as in [Iterate without scaffold](#iterate-without-scaffold), with `/tmp/basecamp-a` and `/tmp/basecamp-b` as the base directories.

1. Start each instance on its own base directory and its own short temporary directory:

    ```bash
    mkdir -p /tmp/bc-a /tmp/bc-b
    TMPDIR=/tmp/bc-a XDG_RUNTIME_DIR=/tmp/bc-a LogosBasecamp --user-dir /tmp/basecamp-a &
    TMPDIR=/tmp/bc-b XDG_RUNTIME_DIR=/tmp/bc-b LogosBasecamp --user-dir /tmp/basecamp-b &
    ```

    - Keep the temporary directories short: module sockets live there, and socket paths are capped at about 100 bytes.
    - The executable is `./result/bin/LogosBasecamp` for a Nix build, `./logos-basecamp.AppImage` for the Linux release, or the application bundle on macOS.
    - Each base directory holds its own copy of the module. After a rebuild, reinstall into both and restart both.

State in these directories survives restarts. Without `--user-dir`, Basecamp picks a default base directory that differs between development and release builds; see [Base directory](../reference/logos-scaffold-basecamp-configuration-reference.md#base-directory).

## Step 7: Test against a released Basecamp

Profiles run the Basecamp build that `basecamp setup` pinned. To test your module against a released AppImage or DMG instead, build the portable variant and load it by hand.

1. Build the portable variant of every project module:

    ```bash
    lgs basecamp build --variant lgx-portable
    ```

    - `lgs basecamp build-portable` is the back-compatible alias.
    - Add `--module <name>` to build one module instead of all of them.
    - `role = "dependency"` entries are skipped, because the released build ships its own copies.
    - A flake that does not expose `lgx-portable` fails the build instead of falling back to `lgx`.

    **Expected result:** scaffold prints the built packages in load order and links them into `.scaffold/basecamp/portable/` as `<NN>-<module_name>.lgx`.

1. In the released Basecamp, install each package through its install button, in the printed order.

To run a portable Basecamp in your scaffold profiles instead, set `attr` in `[repos.basecamp]`; see [`[repos.basecamp]` and `[repos.lgpm]`](../reference/logos-scaffold-basecamp-configuration-reference.md#reposbasecamp-and-reposlgpm).

## Next steps

- [Troubleshoot Logos module development with Basecamp](../troubleshooting/troubleshoot-logos-module-development-with-basecamp.md)
- [Logos Scaffold Basecamp configuration reference](../reference/logos-scaffold-basecamp-configuration-reference.md)
- [About Logos Scaffold](../about-logos-scaffold.md)
- [Install and load a module in Logos Basecamp](../../basecamp/install-and-load-a-module-in-logos-basecamp.md)
- [Write and deploy an LEZ program with `logos-scaffold`](../../lez/programs/write-and-deploy-lez-program-with-scaffold.md), for the other half of scaffold's surface
