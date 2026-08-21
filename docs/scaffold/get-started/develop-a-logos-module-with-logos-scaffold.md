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

[Logos Scaffold](../about-logos-scaffold.md) drives the loop a module author repeats all day: build the [`.lgx`](../../get-started/glossary.md#lgx) package, install it into a [Basecamp](../../get-started/glossary.md#basecamp) instance, restart Basecamp, and check the result. This guide covers that loop, including running two instances side by side to exercise peer-to-peer features.

Before you start, make sure you have the following:

- Linux (x86_64 or aarch64) or macOS (arm64 or x86_64). Scaffold is Unix-only.
- [Nix](https://nixos.org/download.html) with flakes enabled. Required by every `basecamp` subcommand.
- `git`, `rustc`, and `cargo` to install scaffold.
- A module project that exposes `packages.<system>.lgx` from a `flake.nix`, as produced by [`logos-module-builder`](https://github.com/logos-co/logos-module-builder). See [Build and run a Logos core module](../../core/build-modules/build-and-run-a-logos-core-module.md) if you do not have one yet.
- A graphical environment. Basecamp is a desktop application.

## What to expect

- You can install Logos Scaffold and prepare a module project for Basecamp.
- You can build your module and install it into isolated Basecamp profiles.
- You can apply a source change and see it in a running Basecamp.
- You can run two Basecamp instances at once and exercise peer-to-peer features between them.

## Step 1: Install Logos Scaffold

1. Clone the repository and install both binaries:

   ```bash
   git clone https://github.com/logos-co/scaffold.git
   cd scaffold
   cargo install --path .
   ```

   This installs `logos-scaffold` and its shorter alias `lgs`. They are functionally identical; this guide uses `lgs`.

1. Confirm the install and check the environment:

   ```bash
   lgs --version
   lgs doctor
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

   `init` writes `scaffold.toml`, creates `.scaffold/`, and appends `.scaffold` to `.gitignore`. Run it once per project. If the project already has a `scaffold.toml` from an older schema, `init` migrates it in place and leaves a `scaffold.toml.bak` next to it.

1. Pin and build the Basecamp toolchain:

   ```bash
   lgs basecamp setup
   ```

   `setup` pins the Basecamp and [`lgpm`](../../get-started/glossary.md#lgpm) versions the project builds against, builds both with Nix, and seeds the `alice` and `bob` profile directories under `.scaffold/basecamp/profiles/`. The first run downloads and builds a lot; later runs are cheap and do nothing when the pin has not changed.

   Neither binary lands on your `PATH`. Scaffold invokes the project-local copies directly.

1. Capture the set of modules to install:

   ```bash
   lgs basecamp modules --show
   ```

   Without `--show`, `basecamp modules` discovers every `flake.nix` at the project root and in immediate sub-directories that exposes `packages.<system>.lgx`, resolves the runtime dependencies each module declares in `metadata.json`, and writes the result to the `[modules]` table in `scaffold.toml`:

   ```toml
   [modules.tictactoe]
   flake = "path:/abs/path/to/tictactoe#lgx"
   role = "project"

   [modules.delivery_module]
   flake = "github:logos-co/logos-delivery-module/<rev>#lgx"
   role = "dependency"
   ```

   `role = "project"` marks a module you build locally, `role = "dependency"` a runtime companion. The table is hand-editable, and re-running `basecamp modules` never overwrites an entry you wrote yourself.

:::info
`lgs basecamp docs` prints the full module-project contract, including the dependency-resolution rules and the `[modules]` schema. It works outside a scaffold project too, so you can read the contract before running `lgs init`.
:::

## Step 3: Build and install the module

1. Build every captured module and install the results into both seeded profiles:

   ```bash
   lgs basecamp install
   ```

   Each source is built through Nix and installed with `lgpm`. Output goes to a timestamped log under `.scaffold/logs/`; pass `--print-output` to stream the Nix output to your terminal instead.

1. Check that the installed state matches what the project captured:

   ```bash
   lgs basecamp doctor
   ```

   `doctor` reports the captured module set, the manifest variant each profile resolves, and any drift between `[modules]` in `scaffold.toml` and what is actually installed. Drift means you changed the table or the sources without reinstalling.

## Step 4: Launch Basecamp

1. Start a profile:

   ```bash
   lgs basecamp launch alice
   ```

   `launch` performs four steps in order: it kills any leftover processes for that profile, removes the profile's state, replays the install of every captured module, and then starts Basecamp with the profile's environment.

1. Confirm your module appears in the Basecamp window and behaves as expected.

   To keep a copy of the window's output, add `--log-file`. Bare `--log-file` writes to `.scaffold/basecamp/profiles/<profile>/basecamp.log` and still tees to your terminal; `--log-file=PATH` picks the file.

:::warning
The scrub in step 3 is deliberate: every launch starts from a clean profile, so identity keys, conversations, and any other in-app state are discarded. That is what makes runs reproducible. If you need state that survives a restart, run Basecamp yourself against a fixed base directory as described in [Step 6](#step-6-run-two-instances-side-by-side).
:::

To see the paths a profile resolves without launching or changing anything:

```bash
lgs basecamp paths alice --json
```

### What `launch` sets on the Basecamp process

`launch` adds these variables to the environment `lgs` itself inherited; it clears nothing. `<profile-dir>` is `.scaffold/basecamp/profiles/<profile>/`.

| Variable | Value | Set when |
|:---|:---|:---|
| `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME` | `<profile-dir>/xdg-config`, `xdg-data`, `xdg-cache` | Always |
| `TMPDIR` | The resolved `runtime_dir`, otherwise `<profile-dir>/xdg-tmp` | Always |
| `XDG_RUNTIME_DIR` | The resolved `runtime_dir` | Only when one resolves: a configured `runtime_dir`, or the `/tmp/lgs-<profile>` macOS default |
| `LOGOS_PROFILE` | The profile name | Always |
| `LOGOS_DATA_DIR`, `LOGOS_USER_DIR` | `<profile-dir>/xdg-data/Logos/LogosBasecamp` | macOS **and** a portable `[repos.basecamp].attr` (`bin-macos-app`, `bin-appimage`, `bin-bundle-dir`) |

Values you declare in `[basecamp.env]` or `[basecamp.profiles.<name>.env]` win over these defaults. The last row is the exception: an absolute value you set is kept, a relative one is rewritten to absolute against the project root, and an empty one counts as unset and falls back to the profile default.

## Step 5: Iterate on a source change

This is the part that surprises most newcomers.

**Building a module does not update a running Basecamp.** `nix build .#lgx` produces a new package in the Nix store and points `result` at it. It does not touch the copy that was installed into a Basecamp base directory, and Basecamp loads modules once, at startup. A rebuilt module therefore reaches a running instance only after two more things happen: the new `.lgx` is installed into that instance's base directory, and Basecamp restarts.

The loop is always the same three moves:

1. Rebuild the `.lgx`.
1. Reinstall it into **every** base directory you are testing against.
1. Restart Basecamp.

With scaffold, `launch` collapses all three, because it rebuilds, reinstalls, and starts a fresh instance:

```bash
# 1. Edit your source.
# 2. Relaunch. Rebuild and reinstall happen automatically.
lgs basecamp launch alice
```

If you are testing with two instances, repeat the relaunch for each profile. Reinstalling into one profile leaves the other running the previous build.

Without scaffold, do the three moves by hand for each base directory, using an [`lgpm`](../../get-started/glossary.md#lgpm) on your `PATH`:

```bash
nix build .#lgx

lgpm --modules-dir /tmp/basecamp-a/modules \
     --ui-plugins-dir /tmp/basecamp-a/plugins \
     install --file result/<module-name>.lgx

# Then close and restart the Basecamp instance that uses /tmp/basecamp-a.
```

You can also install a `.lgx` through the Package Manager UI inside Basecamp, which installs into the base directory of the instance you clicked in. The restart requirement is unchanged.

To produce artifacts without installing them anywhere, use `lgs basecamp build`. It builds the captured project modules and writes load-ordered symlinks under `.scaffold/basecamp/lgx/` and `.scaffold/basecamp/portable/`:

```bash
lgs basecamp build                              # both variants (the default)
lgs basecamp build --variant lgx --module swap  # one variant, one module
```

:::tip
Two faster loops skip a full Basecamp launch while you work on a single module:

- `lgs basecamp run <module>` runs a captured module through `nix run` in its own standalone app, so you exercise the module without the rest of the stack.
- For QML-only changes, `logos-module-builder` exposes a `ui-dev` target that hot-reloads QML on save:

  ```bash
  nix build .#ui-dev
  ./result/bin/run-logos-standalone-ui
  ```

Use them for iteration, then go back to Basecamp to verify the module in its real host. `lgs basecamp develop <module>` drops you into that module's Nix dev shell when you need to build by hand.
:::

:::warning
A Nix flake whose `src = ./.` only sees files that git tracks. A new file that you have not staged is silently absent from the build: the build succeeds, the `.lgx` is produced, and the module misbehaves at runtime. Run `git add -A` before you build after adding any file, including `qmldir` files, QML assets, and configuration files. See [A new file is missing from the built package](../troubleshooting/troubleshoot-logos-module-development-with-basecamp.md#a-new-file-is-missing-from-the-built-package).
:::

## Step 6: Run two instances side by side

Peer-to-peer features need two instances. Each one needs its own base directory, otherwise both write to the same state.

### With scaffold profiles

Open two terminals, both at the project root:

```bash
# Terminal 1
lgs basecamp launch alice
```

```bash
# Terminal 2
lgs basecamp launch bob
```

Each window gets its own configuration, data, cache, and runtime directories under `.scaffold/basecamp/profiles/<profile>/`, plus `LOGOS_PROFILE` set to the profile name. An action in `alice` should be observable in `bob`.

To add more profiles, declare them in `scaffold.toml`. Unknown profiles are seeded on first launch:

```toml
[basecamp.profiles.maker]
env_file    = ".env"
env         = { SWAP_UI_AUTO_ROLE = "maker" }
runtime_dir = "/tmp/lgs-maker"
log_file    = ".scaffold/basecamp/profiles/maker/basecamp.log"

[basecamp.profiles.taker]
env_file = ".env.taker"
env      = { SWAP_UI_AUTO_ROLE = "taker" }
```

### With `--user-dir`

When you run Basecamp yourself instead of through scaffold, isolate the instances with `--user-dir` (short form `-u`), which sets the base directory holding `plugins/`, `modules/`, `module_data/`, and `logs/`:

```bash
LogosBasecamp --user-dir /tmp/basecamp-a &
LogosBasecamp --user-dir /tmp/basecamp-b &
```

The path is used verbatim. Setting the `LOGOS_USER_DIR` environment variable is equivalent.

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
The macOS portable bundle does not honour `XDG_DATA_HOME`: it finds its modules and plugins through an environment override instead, and falls back to the shared `~/Library/Application Support/Logos/LogosBasecamp/` when none is set. Basecamp 0.1.x reads `LOGOS_DATA_DIR` for this; 0.2.x renamed it to `LOGOS_USER_DIR`, the env equivalent of `--user-dir`. `lgs basecamp launch` sets **both**, as absolute per-profile paths, so it works whichever generation the project pins. Set them yourself only if you need a different tree, and always use an absolute path — a relative value scatters state and can leave the UI unable to resolve its libraries.
:::

### Keep runtime paths short

When a module loads, the Logos runtime opens a Unix domain socket named `logos_token_<module>` under the temp root, which is `TMPDIR`. The operating system caps the full socket path — 104 bytes on macOS, 108 on Linux — and a long runtime root overflows that budget before the socket name is even appended. Module loading then aborts with:

```
[SubprocessContainer] Unix socket path too long (122 >= 104)
```

Keep the runtime root short, `/tmp/...` rather than a path under a deep project directory. Scaffold resolves it in this order and exports a resolved value as both `TMPDIR` and `XDG_RUNTIME_DIR`:

1. `[basecamp.profiles.<name>].runtime_dir`, if set.
1. `/tmp/lgs-<profile>`, the automatic default on macOS.
1. Otherwise the in-profile `xdg-tmp`, which is what Linux gets by default. Its four extra bytes are not much headroom, so set `runtime_dir` explicitly if a deep project path trips the limit there too.

```toml
[basecamp.profiles.alice]
runtime_dir = "/tmp/lgs-alice"
```

A distinct runtime root per instance matters for a second reason on every platform: two instances sharing one temp root collide on the same `logos_token_<module>` socket, and the second instance to bind takes the socket away from the first.

## Step 7: Test against a released Basecamp

Profiles run the Basecamp build that `basecamp setup` pinned. To test your module against a released AppImage or DMG instead, build the portable variant:

```bash
lgs basecamp build --variant lgx-portable
# or the back-compatible alias:
lgs basecamp build-portable
```

This builds `.#lgx-portable` for every `role = "project"` entry, orders the artifacts by their declared dependencies, and symlinks them into `.scaffold/basecamp/portable/` as `<NN>-<module_name>.lgx`. Load them into the released Basecamp through its install button in the printed order. `role = "dependency"` entries are skipped, because the released build ships its own copies. Add `--module <name>` to build one module instead of all of them.

Portable builds never fall back to the regular `#lgx` output. If a flake does not expose `lgx-portable`, the command fails and tells you so, rather than installing a package that cannot run in a portable host.

## Next steps

- [Troubleshoot Logos module development with Basecamp](../troubleshooting/troubleshoot-logos-module-development-with-basecamp.md)
- [About Logos Scaffold](../about-logos-scaffold.md)
- [Install and load a module in Logos Basecamp](../../basecamp/install-and-load-a-module-in-logos-basecamp.md)
- [Write and deploy an LEZ program with `logos-scaffold`](../../lez/programs/write-and-deploy-lez-program-with-scaffold.md), for the other half of scaffold's surface
