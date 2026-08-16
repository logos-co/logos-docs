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
The repository is [`logos-co/scaffold`](https://github.com/logos-co/scaffold); the crate and the binary are named `logos-scaffold`. The `logos-co/logos-scaffold` URL redirects to the same repository.
:::

## What Logos Scaffold covers

Scaffold spans two workflows that a Logos project can use independently or together.

| Workflow | Commands | What it does |
|:---|:---|:---|
| [LEZ](../get-started/glossary.md#lez) programs | `create`, `init`, `setup`, `build`, `deploy`, `localnet`, `test-node`, `wallet`, `spel`, `run` | Bootstraps a `program_deployment` project, syncs and builds the pinned LEZ and `spel` binaries, runs a local sequencer, funds wallets, and deploys guest programs. |
| Basecamp modules | `basecamp setup`, `modules`, `install`, `launch`, `develop`, `build`, `build-portable`, `run`, `doctor`, `paths`, `docs` | Pins and builds Basecamp and [`lgpm`](../get-started/glossary.md#lgpm), captures which modules a project installs, builds their `.lgx` packages, and launches profile-isolated Basecamp instances. |
| Diagnostics | `doctor`, `report` | Reports environment health and bundles logs and state for a bug report. |

Both workflows are also exposed as a typed Rust API under `logos_scaffold::api`, so tests and dev tooling can drive a scaffold-managed project without shelling out to the CLI and parsing text.

Each workflow has a one-command inner loop:

- **LEZ programs:** `lgs run` chains build → IDL → localnet → wallet topup → deploy → post-deploy hooks. Steps 4 and 5 are skippable per profile (`topup = false`, `deploy = false`) for projects that fund or deploy themselves.
- **Basecamp modules:** `lgs basecamp launch <profile>` rebuilds, reinstalls, and starts a clean instance.

:::info
Pick the guide that matches what you are building: [Write and deploy an LEZ program with `logos-scaffold`](../lez/programs/write-and-deploy-lez-program-with-scaffold.md) for guest programs, or [Develop a Logos module with Logos Scaffold](./get-started/develop-a-logos-module-with-logos-scaffold.md) for `.lgx` modules that run in Basecamp.
:::

## Project layout

Scaffold works on a project directory that contains a `scaffold.toml` file at its root. Every command refuses to run outside such a project, and `lgs init` creates the file for an existing project.

| Path | Purpose |
|:---|:---|
| `scaffold.toml` | The project's configuration: pinned repositories, the captured module set, run profiles, and per-profile launch settings. Hand-editable. |
| `.scaffold/state/` | Resolved binary paths, pin-derived metadata, and the default wallet address in `wallet.state`. |
| `.scaffold/logs/` | Timestamped build and install logs. |
| `.scaffold/wallet/` | The project-local wallet home used by `wallet`, `deploy`, and `run`. |
| `.scaffold/basecamp/profiles/<profile>/` | Per-profile Basecamp state: config, data, and cache directories for one instance. |
| `.scaffold/basecamp/lgx/`, `.scaffold/basecamp/portable/` | Symlinks to `lgs basecamp build` output, one directory per variant, named `<NN>-<module_name>.lgx` in dependency order. |

Scaffold appends `.scaffold` to the project's `.gitignore`, so none of this working state is committed. `scaffold.toml` is meant to be committed.

:::warning
Everything under `.scaffold/wallet/` is development-only key material, unlocked by a deterministic local password unless you set `LOGOS_SCAFFOLD_WALLET_PASSWORD`. Never point it at real funds.
:::

## Profiles

A profile is one isolated Basecamp instance: its own configuration, identity keys, installed modules, and message history. Scaffold seeds two profiles, `alice` and `bob`, so that peer-to-peer features can be exercised between two instances on a single machine. A project can declare further profiles under `[basecamp.profiles.<name>]` in `scaffold.toml`, each with its own environment variables, runtime directory, and log file.

Profile state is always project-local under `.scaffold/basecamp/profiles/`. Scaffold does not write Basecamp state into your home directory.

:::warning
`lgs basecamp launch <profile>` is clean-slate by design: every launch removes the profile's state and reinstalls the captured modules before starting Basecamp. Identities, conversations, and other in-app state do not survive a relaunch. To keep state between restarts, run Basecamp yourself against a dedicated base directory with `--user-dir`. See [Run two instances side by side](./get-started/develop-a-logos-module-with-logos-scaffold.md#step-6-run-two-instances-side-by-side).
:::

## What Logos Scaffold does not do

- **It does not replace [`logos-module-builder`](https://github.com/logos-co/logos-module-builder).** Module builder owns the Nix build of a module: it turns your source tree into `.lgx` packages. Scaffold calls that build and takes care of everything around it.
- **It does not install anything on your `PATH`.** The Basecamp and `lgpm` binaries scaffold builds stay project-local and are invoked directly.
- **It does not hot-reload a running Basecamp.** A rebuilt module reaches Basecamp only after it is reinstalled and Basecamp restarts.

## Related documentation

- [Develop a Logos module with Logos Scaffold](./get-started/develop-a-logos-module-with-logos-scaffold.md)
- [Troubleshoot Logos module development with Basecamp](./troubleshooting/troubleshoot-logos-module-development-with-basecamp.md)
- [Write and deploy an LEZ program with `logos-scaffold`](../lez/programs/write-and-deploy-lez-program-with-scaffold.md)
- [Build and run a Logos core module](../core/build-modules/build-and-run-a-logos-core-module.md)
- [Install Logos Basecamp](../basecamp/install-logos-basecamp.md)
