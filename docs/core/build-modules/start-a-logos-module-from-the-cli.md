---
title: Start a Logos module from the CLI
doc_type: procedure
product: core
topics: core
steps_layout: flat
authors: iurimatias, kashepavadan
owner: logos
doc_version: 1
slug: start-a-logos-module-from-the-cli
sidebar_position: 1
---

# Start a Logos module from the CLI

#### Explore how to load and call a Logos module from the command line using `logosctl`.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

This guide covers how to build and install a Logos [module](../../get-started/glossary.md#module), start the `logosctl` daemon, and call module methods from the command line. It is intended for users who want to run a module locally, or developers who want to test a module they are building. You create the module from the `logos-module-builder` template, so there is no code to write. By the end you will have a running `logosctl` instance that loads the template's `minimal` module and returns results from its `greet` and `getStatus` methods.

:::info[Prerequisites]

- A supported OS:
   - Linux x86_64 or aarch64
   - macOS arm64 (Apple Silicon)
- Git
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.3.1) installed.
   - Install it by running `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh | sudo sh`
- **Nix** with flakes enabled.
   - Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

   ```bash
   mkdir -p ~/.config/nix
   echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
   ```
- Basic familiarity with the command line and Nix concepts
:::

## What to expect

- You can build a module from the `logos-module-builder` template, load it into a running `logosctl` daemon and call its methods.
- You can list the methods and events a module exposes, with the descriptions its author wrote.
- You have a `logosctl` session with a `modules` directory that future modules install into.

## Install the module

`logosctl` expects each module in its own subdirectory containing a `manifest.json`. `logosctl package install` handles this layout automatically when given an [LGX](../../get-started/glossary.md#lgx) package, and unpacks it into the current [session's](https://github.com/logos-co/logos-logoscore-cli/blob/master/docs/logosctl.md#sessions) own `modules/` directory.

1. Create a module from the `logos-module-builder` template and build its LGX package:

   ```bash
   mkdir hello-module
   cd hello-module
   nix flake init -t github:logos-co/logos-module-builder
   git init && git add -A

   nix build '.#lgx-portable'

   cd ..
   ```

   - The template is a complete module named `minimal`: `src/minimal_impl.h` declares its methods, and the build generates the rest.
   - Nix only sees files that Git tracks, so `git add` comes before the build.
   - Build `lgx-portable`, not `lgx`: the `lgx` output is a development build (variant `darwin-arm64-dev` on Apple Silicon, for example) that `logosctl package install` rejects. See [Troubleshooting](#troubleshooting-logosctl-module-startup).

1. Start the daemon, detached so this terminal stays free:

   ```bash
   logosctl daemon start --detach
   ```

   - The detached command returns after the Logos node is ready to accept commands.

1. Check the status of `logosctl`:

   ```bash
   logosctl daemon status
   ```

1. Install the LGX package into the current session:

   ```bash
   logosctl package install --file ./hello-module/result/*.lgx
   ```

   `logosctl` lists the change and asks you to confirm. Pass `-y` to skip the prompt. Without a terminal, for example in a script, `-y` is required.

   This unpacks into the `logosctl` session's `modules/` directory:

   ```
   modules/minimal/
   ├── minimal_plugin.dylib     # (or .so on Linux)
   ├── assets/lidl/minimal.lidl # The module's interface, in LIDL
   ├── manifest.json            # Package manifest
   ├── variant                  # Platform variant identifier
   └── ...                      # Runtime libraries bundled by the portable build
   ```

1. Confirm the module was installed correctly:

   ```bash
   logosctl package ls
   ```

   `minimal` is listed with the source `user`, next to the packages embedded in `logosctl`.

## Call module methods

With the module installed, load the module with `logosctl` and call its methods.

1. Load the module and confirm that it was loaded:

   ```bash
   logosctl module load minimal

   logosctl module ls --loaded
   ```

1. Call `greet` with a name:

   ```bash
   logosctl call minimal greet World
   ```

   ```
   Hello, World! Greetings from the minimal module.
   ```

1. Call `getStatus`, which takes no arguments:

   ```bash
   logosctl call minimal getStatus
   ```

   ```
   Minimal module is running.
   ```

1. Inspect the methods and events that `minimal` exposes:

   ```bash
   logosctl module show minimal
   ```

   ```
   Methods:
     greet(name: tstr) -> tstr
         Returns a greeting and announces it as a typed `greeted` event.
     getStatus() -> tstr
         Returns a short status string.
     ...

   Events:
     greeted(greeting: tstr)
         Emitted by greet() with the greeting it produced. Other modules
         subscribe with `modules().minimal.onGreeted(...)`.
   ```

   - The descriptions are the `///` comments in `src/minimal_impl.h`.
   - Every module also has `name()`, `version()` and `lidl()`, which the output lists after `getStatus`.

1. Stop the daemon:

   ```bash
   logosctl daemon stop
   ```

## Troubleshooting `logosctl` module startup

### The platform key in `manifest.json` does not match

`logosctl package install` fails with an error such as:

```
Error: install failed at step 'install': Package does not contain variant for platform: darwin-arm64 (package provides: darwin-arm64-dev)
```

An LGX package holds one variant per platform, and the released `logosctl` installs only the portable variant for the platform it runs on. A `-dev` variant comes from the `lgx` output, so build `lgx-portable` instead. A variant for another platform means the package was built there; rebuild it on the target platform and reinstall.

### The install is refused without confirmation

`logosctl package install` reports `Refusing to proceed without confirmation. Pass -y to continue.` when no terminal is available to confirm in. Pass `-y`.

### The module is not loaded after a restart

Restarting the daemon does not reload modules, so `logosctl call` reports `Module 'minimal' is not loaded`. Load it again with `logosctl module load minimal`.
