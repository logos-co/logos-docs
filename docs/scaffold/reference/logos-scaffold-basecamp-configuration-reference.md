---
title: Logos Scaffold Basecamp configuration reference
doc_type: reference
product: core
topics: scaffold, basecamp, modules, configuration
authors: weboko
owner: logos
doc_version: 1
slug: logos-scaffold-basecamp-configuration-reference
sidebar_position: 1
---

# Logos Scaffold Basecamp configuration reference

#### Look up the `scaffold.toml` keys, launch environment, and directories behind `lgs basecamp`.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**, `logos-scaffold` **0.4.0**, and Basecamp **0.3.0**.
:::

This page lists what [Logos Scaffold](../about-logos-scaffold.md) reads and sets when it builds, installs, and launches Logos modules in Basecamp. For the workflow itself, see [Develop a Logos module with Logos Scaffold](../get-started/develop-a-logos-module-with-logos-scaffold.md). The full module-project contract is also available offline with `lgs basecamp docs`.

## `scaffold.toml` keys

### `[repos.basecamp]` and `[repos.lgpm]`

`lgs basecamp setup` builds Basecamp and `lgpm` from these entries. Keep the two pins a matching pair; see [Pinned versions](../about-logos-scaffold.md#pinned-versions).

| Key | Meaning |
|:---|:---|
| `source` | Git URL or flake reference of the repository. |
| `pin` | Commit to build. |
| `build` | Always `"nix-flake"`. |
| `attr` | Flake output to build: `app` (development build) or a portable output such as `bin-appimage`, `bin-macos-app`, or `bin-bundle-dir` for Basecamp; `cli` for `lgpm`. |

`attr` can also be a table keyed by Nix system, with the scalar form as the fallback for unlisted systems:

```toml
[repos.basecamp.attr]
aarch64-darwin = "bin-macos-app"
x86_64-linux   = "bin-appimage"
```

With a portable Basecamp output, `setup` builds the portable `lgpm`, and `install` and `launch` build each captured flake module's `lgx-portable` output instead of `lgx`, because a portable Basecamp loads only portable variants.

### `[modules.<name>]`

One entry per module that `install` and `launch` act on. `lgs basecamp modules` writes these entries and never overwrites an existing one; you can also write them by hand.

| Key | Meaning |
|:---|:---|
| `flake` | Flake reference of the module's `.lgx` output, for example `path:.#lgx`, `path:./ui#lgx`, or `github:<owner>/<repo>/<rev>#lgx`. A prebuilt package can be captured by path with `lgs basecamp modules --path <file.lgx>`. |
| `role` | `"project"` for a module you build and ship, `"dependency"` for a runtime companion. `build` and `build-portable` skip dependencies. |
| `standalone_app` | Optional flake app that `lgs basecamp run <name>` starts instead of the flake's default app. |

The `<name>` key must match the `name` in the module's `metadata.json`, because other modules refer to it by that name in their `dependencies`.

### `[basecamp]`

| Key | Meaning |
|:---|:---|
| `env` | Table of variables set on every profile's Basecamp process. |
| `env_append` | Table of lists. Each list is `:`-joined and appended to the value `lgs` inherited, for path-style variables. |

### `[basecamp.profiles.<name>]`

Any profile name is accepted. Profiles other than `alice` and `bob` are seeded on first launch.

| Key | Meaning |
|:---|:---|
| `env_file` | Dotenv-style `KEY=VALUE` file, relative to the project root or absolute. |
| `env` | Table of variables for this profile only, written as a `[basecamp.profiles.<name>.env]` table. |
| `runtime_dir` | Temporary and runtime directory for this profile. See [Runtime directory](#runtime-directory). |
| `log_file` | File that every launch of this profile tees its output to. `launch --log-file` overrides it. |

```toml
[basecamp.profiles.maker]
env_file    = ".env"
runtime_dir = "/tmp/lgs-maker"
log_file    = ".scaffold/basecamp/profiles/maker/basecamp.log"

[basecamp.profiles.maker.env]
SWAP_UI_AUTO_ROLE = "maker"
```

:::warning
Write each `env` as its own `[… .env]` table, as above. `logos-scaffold` 0.4.0 silently ignores the inline form, `env = { KEY = "value" }`, for both `[basecamp]` and profiles.
:::

## Launch environment

`lgs basecamp launch <profile>` adds these variables to the environment `lgs` itself inherited; it clears nothing. `<profile-dir>` is `.scaffold/basecamp/profiles/<profile>/`.

| Variable | Value |
|:---|:---|
| `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME` | `<profile-dir>/xdg-config`, `xdg-data`, `xdg-cache` |
| `TMPDIR`, `XDG_RUNTIME_DIR` | The profile's [runtime directory](#runtime-directory) |
| `LOGOS_PROFILE` | The profile name |
| `LOGOS_USER_DIR` | `<profile-dir>/xdg-data/Logos/LogosBasecamp`, with `Dev` appended for a development build. This is Basecamp's [base directory](#base-directory) for the profile. |

Your own variables are layered on top in this order, last writer wins:

1. `[basecamp.env_append]`
1. The profile's `env_file`
1. `[basecamp.env]`
1. `[basecamp.profiles.<name>.env]`

`LOGOS_USER_DIR` is post-processed after that layering: an absolute value you set is kept, a relative one is rewritten to absolute against the project root, and an empty one counts as unset and falls back to the profile default.

`[basecamp.env_append]` cannot extend `QT_PLUGIN_PATH`, `QML2_IMPORT_PATH`, or `LD_LIBRARY_PATH` with Basecamp 0.3.0: its launcher script sets those three variables outright, replacing whatever it inherits.

To see what a profile resolves without launching it, run `lgs basecamp paths <profile> --json`.

## Runtime directory

Each module Basecamp loads opens a Unix domain socket under `TMPDIR`: `logos_<module>_<id>` in Basecamp 0.2.3 and later, `logos_token_<module>` before that. Scaffold gives every profile its own runtime directory and exports it as both `TMPDIR` and `XDG_RUNTIME_DIR`:

1. `[basecamp.profiles.<name>].runtime_dir`, if set. A relative path is joined to the project root.
1. Otherwise `/tmp/lgs-<project-hash>-<profile>`, where `<project-hash>` is the first eight hex characters of a SHA-256 of the project's path. The hash keeps two checkouts of the same project apart.

Three constraints shape that default, and apply to any `runtime_dir` you set:

- **Short.** The operating system caps a socket path at 104 bytes on macOS and 108 on Linux. A long runtime directory overflows the cap once the socket name is appended, and module loading aborts with `Unix socket path too long`.
- **Outside the project.** A module flake is often the project root, and `nix build` refuses to copy the sockets a running Basecamp leaves behind, so a runtime directory inside the project breaks every build after the first launch.
- **One per instance.** Two instances sharing a runtime directory can bind the same socket, and the second takes it from the first.

Scaffold creates the directory with mode `0700` before it touches the profile, and refuses one that is a symbolic link, is not a directory, or belongs to another user and cannot be restricted to `0700`.

## Base directory

Basecamp keeps its installed modules, UI plugins, per-module state, and logs in one base directory, with `modules/`, `plugins/`, `module_data/`, and `logs/` inside it. `logs/` holds one file per launch plus a `basecamp.log` link to the newest.

| How Basecamp runs | Base directory |
|:---|:---|
| Through `lgs basecamp launch` | `<profile-dir>/xdg-data/Logos/LogosBasecamp`, with `Dev` appended for a development build |
| `--user-dir <path>` (short form `-u`) | `<path>`, made absolute and created if it is missing |
| `LOGOS_USER_DIR=<path>` | `<path>`, exactly as given, so use an absolute path |
| Portable build with no override | `~/.local/share/Logos/LogosBasecamp` on Linux, `~/Library/Application Support/Logos/LogosBasecamp` on macOS |
| Development build (`nix build .#app`) with no override | The same path with `Dev` appended, for example `~/.local/share/Logos/LogosBasecampDev` |

On macOS, Basecamp does not honour `XDG_DATA_HOME`, so without `LOGOS_USER_DIR` every instance of a build shares the one directory in `~/Library/Application Support`. `launch` always sets it. Basecamp 0.1.x's `LOGOS_DATA_DIR` is no longer read or set.

Modules that Basecamp bundles (`capability_module`, `modules_state`, `package_downloader`, `package_manager`, and `package_manager_ui`) load from next to its own binary, not from the base directory, so a `modules/` directory that lists only your own modules is expected.

## Related documentation

- [Develop a Logos module with Logos Scaffold](../get-started/develop-a-logos-module-with-logos-scaffold.md)
- [Troubleshoot Logos module development with Basecamp](../troubleshooting/troubleshoot-logos-module-development-with-basecamp.md)
- [About Logos Scaffold](../about-logos-scaffold.md)
- [Scaffold command reference](https://github.com/logos-co/scaffold/blob/master/docs/commands.md) in the scaffold repository
