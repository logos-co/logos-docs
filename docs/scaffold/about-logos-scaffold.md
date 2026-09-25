---
title: About Logos Scaffold
doc_type: concept
product: core
topics: scaffold, basecamp, modules
authors: weboko
owner: logos
doc_version: 1
slug: about-logos-scaffold
sidebar_position: 1
---

# About Logos Scaffold

#### Understand what Logos Scaffold manages and when to reach for it.

[Logos Scaffold](https://github.com/logos-co/scaffold) is a command-line tool for developers who build on Logos. It bootstraps projects, pins and builds the toolchain a project depends on, and drives the repetitive parts of the development loop: building [`.lgx`](../get-started/glossary.md#lgx) packages, installing them, and launching isolated [Basecamp](../get-started/glossary.md#basecamp) instances to test them.

Scaffold ships two binaries with identical behaviour: `logos-scaffold` and the shorter alias `lgs`. Use either.

:::info
The repository is [`logos-co/scaffold`](https://github.com/logos-co/scaffold); the crate and the binary are named `logos-scaffold`, and the crate is published on [crates.io](https://crates.io/crates/logos-scaffold). The `logos-co/logos-scaffold` URL redirects to the same repository. This section is accurate for `logos-scaffold` **0.4.0**, which supports Basecamp **0.3.0** only.
:::

## What Logos Scaffold covers

Scaffold spans two workflows that a Logos project can use independently or together.

| Workflow | Commands | What it does |
|:---|:---|:---|
| [LEZ](../get-started/glossary.md#lez) programs | `new` (alias `create`), `init`, `setup`, `build`, `deploy`, `localnet`, `test-node`, `wallet`, `spel`, `run` | Bootstraps a project from the `default` or `lez-framework` template, syncs and builds the pinned LEZ and `spel` binaries, runs a local sequencer, funds wallets, and deploys guest programs. |
| Basecamp modules | `basecamp setup`, `modules`, `install`, `launch`, `develop`, `build`, `build-portable`, `run`, `doctor`, `paths`, `docs` | Pins and builds Basecamp and [`lgpm`](../get-started/glossary.md#lgpm), captures which modules a project installs, builds their `.lgx` packages, and launches profile-isolated Basecamp instances. |
| Diagnostics | `doctor`, `report`, `completions` | Reports environment health, bundles redacted logs and state for a bug report, and prints shell completions. |

Both workflows are also exposed as a typed Rust API under `logos_scaffold::api`, so tests and dev tooling can drive a scaffold-managed project without shelling out to the CLI and parsing text.

Each workflow has a one-command inner loop:

- **LEZ programs:** `lgs run` chains build → IDL → localnet → wallet topup → deploy → post-deploy hooks. Steps 4 and 5 can be skipped per profile (`topup = false`, `deploy = false`) for projects that fund or deploy themselves.
- **Basecamp modules:** `lgs basecamp launch <profile>` rebuilds, reinstalls, and starts a clean instance.

:::info
Pick the guide that matches what you are building: [Write and deploy an LEZ program with `logos-scaffold`](../lez/programs/write-and-deploy-lez-program-with-scaffold.md) for guest programs, or [Develop a Logos module with Logos Scaffold](./get-started/develop-a-logos-module-with-logos-scaffold.md) for `.lgx` modules that run in Basecamp.
:::

## Project layout

Scaffold works on a project directory that contains a `scaffold.toml` file at its root, and project-scoped commands such as `setup`, `doctor`, and the `basecamp` workflow refuse to run outside one. The exceptions are `lgs new`, which creates a project, `lgs init`, which adds `scaffold.toml` to an existing one, and `lgs basecamp docs`, which prints the module-project contract from anywhere.

| Path | Purpose |
|:---|:---|
| `scaffold.toml` | The project's configuration: pinned repositories, the captured module set, run profiles, and per-profile launch settings. Hand-editable. |
| `.scaffold/state/` | Resolved binary paths, pin-derived metadata, and the default wallet address in `wallet.state`. |
| `.scaffold/logs/` | Timestamped build and install logs. |
| `.scaffold/wallet/` | The project-local wallet home used by `wallet`, `deploy`, and `run`. |
| `.scaffold/basecamp/profiles/<profile>/` | Per-profile Basecamp state: config, data, and cache directories for one instance. |
| `.scaffold/basecamp/lgx/`, `.scaffold/basecamp/portable/` | Symlinks to `lgs basecamp build` output, one directory per variant, named `<NN>-<module_name>.lgx` in dependency order. |

Scaffold appends `.scaffold` to the project's `.gitignore`, so none of this working state is committed. `scaffold.toml` is meant to be committed: `basecamp modules` records in-project module sources as relative `path:./<dir>#lgx` references so the file stays portable across checkouts.

Two things live outside the project directory:

- **The cache root** holds the pinned LEZ, `spel`, and Basecamp checkouts and their builds, shared by every project on the machine. It defaults to `~/Library/Caches/logos-scaffold` on macOS and `$XDG_CACHE_HOME/logos-scaffold` (usually `~/.cache/logos-scaffold`) on Linux. Point it elsewhere with `--cache-root` on `lgs new`, or with the `LOGOS_SCAFFOLD_CACHE_ROOT` environment variable, which every command honours.
- **The Basecamp runtime directory** of each profile, `/tmp/lgs-<project-hash>-<profile>` by default, holds the Unix sockets modules open while Basecamp runs. See [Runtime directory](./reference/logos-scaffold-basecamp-configuration-reference.md#runtime-directory).

:::warning
Everything under `.scaffold/wallet/` is development-only key material, unlocked by a deterministic local password unless you set `LOGOS_SCAFFOLD_WALLET_PASSWORD`. Never point it at real funds.
:::

## Profiles

A profile is one isolated Basecamp instance: its own configuration, identity keys, installed modules, and message history. Scaffold seeds two profiles, `alice` and `bob`, so that peer-to-peer features can be exercised between two instances on a single machine. A project can declare further profiles under `[basecamp.profiles.<name>]` in `scaffold.toml`, each with its own environment variables, runtime directory, and log file; see the [configuration reference](./reference/logos-scaffold-basecamp-configuration-reference.md).

Profile state is always project-local under `.scaffold/basecamp/profiles/`. Scaffold does not write Basecamp state into your home directory.

:::warning
`lgs basecamp launch <profile>` is clean-slate by design: every launch removes the profile's state and reinstalls the captured modules before starting Basecamp. Identities, conversations, per-module persisted state (`module_data/`), and Basecamp's own `logs/` do not survive a relaunch. To keep state between restarts, run Basecamp yourself against a dedicated base directory with `--user-dir`. See [Run two instances side by side](./get-started/develop-a-logos-module-with-logos-scaffold.md#step-6-run-two-instances-side-by-side).
:::

## Pinned versions

Scaffold builds every tool a project depends on from a pinned commit recorded in `scaffold.toml`, so two machines building the same project get the same toolchain. The defaults in `logos-scaffold` 0.4.0 are:

| Component | Default pin | Override in `scaffold.toml` |
|:---|:---|:---|
| LEZ (sequencer and wallet) | `v0.1.2` | `[repos.lez]` |
| `spel` | `v0.5.0` | `[repos.spel]` |
| Basecamp | `0.3.0` | `[repos.basecamp]` |
| `lgpm` | The `logos-package-manager` revision that Basecamp 0.3.0 locks | `[repos.lgpm]` |
| `delivery_module`, when a module depends on it | The newest `logos-delivery-module` commit built with `logos-module-builder` 0.3.0 | `[modules.delivery_module]` |

The Basecamp and `lgpm` pins move as a set. Basecamp reads installed modules with the same package-manager library that the `lgpm` CLI uses to write them, so bumping one without the other leaves the two disagreeing about the package format. `lgs basecamp doctor` warns when only one of the pair is at scaffold's default.

`lgs basecamp setup` moves a project off pins that an earlier scaffold release wrote as its defaults: Basecamp 0.2.3 or 0.1.1, their `lgpm` pins, and the old default `delivery_module`. It rewrites `scaffold.toml` and prints one line per changed value. The match is on those exact revisions, so a pin you chose yourself is left alone, unless it happens to equal a retired default. To move any other pin, edit it and re-run `lgs setup` or `lgs basecamp setup`.

:::info
Build modules with `logos-module-builder` **0.3.0**, the release that links exactly the `logos-protocol` and `logos-cpp-sdk` revisions Basecamp 0.3.0 does. Pin it in your module's `flake.nix`: an unpinned URL resolves to the newest release, and 0.3.1 is already ahead of Basecamp 0.3.0. The pinned `lgpm` rejects `tutorial-v1`-era packages, which carry no content hashes, but it does not check the builder version. A module with a C++ backend built by 0.2.x can therefore install cleanly and still have its calls refused once Basecamp loads it. See [Install fails with `Missing content hashes in manifest`](./troubleshooting/troubleshoot-logos-module-development-with-basecamp.md#install-fails-with-missing-content-hashes-in-manifest).
:::

## What Logos Scaffold does not do

- **It does not replace [`logos-module-builder`](https://github.com/logos-co/logos-module-builder).** Module builder owns the Nix build of a module: it turns your source tree into `.lgx` packages. Scaffold calls that build and takes care of everything around it.
- **It does not install anything on your `PATH`** besides its own `logos-scaffold` and `lgs`. The sequencer, wallet, `spel`, Basecamp, and `lgpm` binaries it builds stay project-local; reach them through `lgs wallet -- …`, `lgs spel -- …`, and the `basecamp` subcommands.
- **It does not hot-reload a running Basecamp.** A rebuilt module reaches Basecamp only after it is reinstalled and Basecamp restarts. For live QML edits, use the `ui-dev` target of `logos-module-builder` in the standalone app; see [Iterate faster on a single module](./get-started/develop-a-logos-module-with-logos-scaffold.md#iterate-faster-on-a-single-module).

## Related documentation

- [Develop a Logos module with Logos Scaffold](./get-started/develop-a-logos-module-with-logos-scaffold.md)
- [Troubleshoot Logos module development with Basecamp](./troubleshooting/troubleshoot-logos-module-development-with-basecamp.md)
- [Logos Scaffold Basecamp configuration reference](./reference/logos-scaffold-basecamp-configuration-reference.md)
- [Write and deploy an LEZ program with `logos-scaffold`](../lez/programs/write-and-deploy-lez-program-with-scaffold.md)
- [Build and run a Logos core module](../core/build-modules/build-and-run-a-logos-core-module.md)
- [Install Logos Basecamp](../basecamp/install-logos-basecamp.md)
- [Scaffold command reference](https://github.com/logos-co/scaffold/blob/master/docs/commands.md) and [`scaffold.toml` run configuration](https://github.com/logos-co/scaffold/blob/master/docs/configuration.md) in the scaffold repository
