---
title: Build and run a Logos core module
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: iurimatias, Khushboo-dev-cpp, cheny0
owner: logos
doc_version: 2
slug: build-and-run-a-logos-core-module
sidebar_position: 2
---

# Build and run a Logos core module

#### Scaffold, build, package, and test a core module on Logos.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

Logos is a modular application framework built on Qt 6. Applications are composed of dynamically loaded modules that provide features and functionality. Logos [core modules](../../get-started/glossary.md#core-module) are non-UI modules that provide backend functionality, loaded by a Logos runtime such as `logosctl` or Logos Basecamp.

You write a core module as one plain C++ class: its public methods are the module's API, and `logos-module-builder` generates the Qt plugin around it. This procedure scaffolds a module from the builder's template, builds and inspects it, packages it, and runs it with `logosctl` and with Logos Basecamp.

:::info[Prerequisites]

- A supported OS:
   - Linux x86_64 or aarch64
   - macOS arm64 (Apple Silicon)
   - Windows 10 or 11 x86_64, building inside WSL2. Nix does not run on Windows itself, so Windows packages are cross-compiled from Linux. See [Build a Windows package](#build-a-windows-package).
- At least 10 GB of disk space
- Git
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.3.2) installed.
   - Install it by running `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh | sudo sh`
- **Nix** with flakes enabled.
   - Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

   ```bash
   mkdir -p ~/.config/nix
   echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
   ```
- Basic familiarity with C++ (C++17), CMake, and Nix concepts
:::

## What to expect

- You can scaffold and build a Logos core module from the `logos-module-builder` template.
- You can inspect the compiled module's metadata, methods and events with the `lm` CLI tool.
- You can package the module, install it with `logosctl` and call its methods, or call them from Logos Basecamp.

## Step 1: Scaffold the module project

The `logos-module-builder` provides a template for each kind of module. The default template produces a minimal core module: one C++ class and no UI.

1. Create a new directory using your module's name and initialise it from the module builder template. Replace `<module-name>` with your module's name, for example, `my_module`.

   ```bash
   mkdir <module-name> && cd <module-name>
   nix flake init -t github:logos-co/logos-module-builder/0.3.2
   ```

   - The other templates are `#with-external-lib` (see [Wrap a C library as a Logos module](wrap-a-c-library-as-a-logos-core-module.md)), `#ui-qml-backend` (see [Build a Logos C++ UI module](build-a-logos-cpp-ui-module.md)), `#ui-qml`, `#rust` and `#rust-with-external-lib`.

1. Review the project directory. The generated project structure looks like this:

   ```text
   <module-name>/
   ├── flake.nix
   ├── metadata.json
   ├── CMakeLists.txt
   └── src/
       ├── minimal_impl.h
       └── minimal_impl.cpp
   ```

   The template is a complete module named `minimal`. `src/minimal_impl.h` declares its API, two methods (`greet` and `getStatus`) and an event (`greeted`), and the build generates the Qt plugin from it. You replace the `minimal` placeholders with your module's name in Step 2.

   :::info
   The `metadata.json` file is the single source of truth for your module. Read [LGX package format and bundling reference](../reference/lgx-package-format-and-bundling-reference.md) for more details.
   :::

## Step 2: Adapt the template for your module

Rename the `minimal` placeholders in the generated files to your module's name, then replace the example methods with your own. In this step, `<ModuleName>` is your module's name in PascalCase, for example, `MyModule` for `my_module`.

1. Edit `metadata.json` and set `name`, `display_name`, `description`, and `main` to match your module.
   - `name` must be a valid C identifier; it is used in file names, method calls, and module loading.
   - `main` is `<module-name>_plugin`, the plugin file name without its extension (`.so` or `.dylib`).
   - Leave the other fields in place, including `"interface": "universal"` and the `nix` block, which the build and the bundler rely on.

1. Rename the source files in `src/` to match your module name.

   ```bash
   mv src/minimal_impl.h   src/<module-name>_impl.h
   mv src/minimal_impl.cpp src/<module-name>_impl.cpp
   ```

   - The build looks for `src/<module-name>_impl.h` and a class named `<ModuleName>Impl`. To use other names, set `codegen.impl_header` and `codegen.impl_class` in `metadata.json`.

1. Edit both source files: rename the class `MinimalImpl` to `<ModuleName>Impl`, and make `src/<module-name>_impl.cpp` include `<module-name>_impl.h`.

1. Edit `CMakeLists.txt` and update the `project()` name and the two `SOURCES` entries to the renamed files.
   - `logos_module()` reads `NAME` from `metadata.json`, so the two cannot drift apart.

1. Edit `flake.nix` and update the `description` field.
   - The generated `flake.nix` uses an unpinned `logos-module-builder` URL. For reproducible builds, pin it: `logos-module-builder.url = "github:logos-co/logos-module-builder/0.3.2";`.

1. Replace the example methods and event in `src/<module-name>_impl.h` and `src/<module-name>_impl.cpp` with your own, or keep them for now to follow the examples in this procedure.
   - Every `public` method is part of the module's API. Use the parameter and return types in the table in [Wrap a C library as a Logos module](wrap-a-c-library-as-a-logos-core-module.md#step-3-configure-the-logos-module), for example `int64_t` and `std::string`, not `int` or `QString`.
   - A `///` comment directly above a method or event becomes its description, which `lm`, `logosctl module show` and Logos Basecamp display.

:::tip
Run `grep -ri "minimal" .` after editing to catch any remaining placeholder references (`minimal`, `Minimal`, `MinimalImpl`) before building.
:::

## Step 3: Build the module

1. Initialise a Git repository.

   ```bash
   git init && git add -A
   ```

   - Nix only sees files that Git tracks. Run `git add` again after you add new files.

1. Build the full module output (library and generated SDK headers).

   ```bash
   nix build
   ```

   - Use `nix build '.#lib'` to build only the plugin shared library.
   - Use `nix build '.#include'` to build only the generated SDK headers.
   - The first build downloads Qt, the Logos SDK, and the code generators, and can take several minutes.

1. Verify the build output contains the plugin binary and generated headers:

   ```text
   result/
   ├── lib/
   │   └── <module-name>_plugin.so   # (or .dylib on macOS)
   └── include/
       ├── <module-name>_api.h       # Generated type-safe wrapper header
       └── <module-name>_api.cpp     # Generated wrapper implementation
   ```

## Step 4: Inspect your module

The [`lm`](../../get-started/glossary.md#lm) tool (from `logos-module`) inspects compiled module binaries without loading them into a runtime.

1. Build the `lm` tool from the `logos-module` repository.

   ```bash
   nix build 'github:logos-co/logos-module/0.3.0#lm' --out-link ./lm
   ```

1. View the module metadata and confirm the information is correct.

   ```bash
   # Linux
   ./lm/bin/lm metadata result/lib/<module-name>_plugin.so

   # macOS
   ./lm/bin/lm metadata result/lib/<module-name>_plugin.dylib
   ```

   - Append `--json` for JSON output.

   For example, for `my_module` with the display name `My Module`:

   ```text
   Plugin Metadata:
   ================
   Name:         my_module
   Display name: My Module
   Version:      1.0.0
   Description:  My first Logos module
   Author:
   Type:         core
   Protocol:     0.9.0
   Dependencies: (none)
   ```

1. View the module methods.

   ```bash
   # Linux
   ./lm/bin/lm methods result/lib/<module-name>_plugin.so

   # macOS
   ./lm/bin/lm methods result/lib/<module-name>_plugin.dylib
   ```

   - Append `--json` for JSON output.
   - `lm events` lists the module's events the same way.

   With the template's example methods, the output looks like this:

   ```text
   Plugin Methods:
   ===============

   tstr greet(tstr name)
     Signature: greet(tstr)
     Invokable: yes
     Description: Returns a greeting and announces it as a typed `greeted` event.

   tstr getStatus()
     Signature: getStatus()
     Invokable: yes
     Description: Returns a short status string.

   tstr name()
     Signature: name()
     Invokable: yes
     Description: The module's name, as declared in its metadata.

   tstr version()
     Signature: version()
     Invokable: yes
     Description: The module's version, as declared in its metadata.

   tstr lidl()
     Signature: lidl()
     Invokable: yes
     Description: The module's canonical LIDL interface document.
   ```

   - Types are shown as the module's interface contract publishes them: `tstr` is a string, and `int` is a 64-bit integer.
   - `name()`, `version()` and `lidl()` are generated for every module. `lidl()` returns the module's interface contract.

1. To browse the methods in a window instead, build the graphical `logos-module-viewer` and open the module with it:

   ```bash
   nix build 'github:logos-co/logos-module-viewer/f8914691f3ac8be78b894d01b5d5ec6ce25d44f3#app' --out-link ./logos-viewer

   # Linux
   ./logos-viewer/bin/logos-module-viewer -m ./result/lib/<module-name>_plugin.so

   # macOS
   ./logos-viewer/bin/logos-module-viewer -m ./result/lib/<module-name>_plugin.dylib
   ```

   - The viewer has no release yet, so the command pins the commit this procedure was tested with.
   - The viewer only loads modules that don't call other modules.

## Step 5: Package the module

Before you can run your module with `logosctl` or install it into Logos Basecamp, you need to package the build output into an [LGX](../../get-started/glossary.md#lgx) package. Check out the [LGX package format and bundling reference](../reference/lgx-package-format-and-bundling-reference.md) for more details on the format and bundling options.

:::info
The `manifest.json` is auto-generated from your module's `metadata.json` by the bundler. It maps each variant to its main entry point.
:::

1. Build the portable package, which bundles every dependency and has no `/nix/store` references:

   ```bash
   nix build '.#lgx-portable' --out-link result-lgx-portable
   ```

   - Released builds of `logosctl` and Logos Basecamp install only portable variants (for example, `linux-amd64` or `darwin-arm64`).

1. Build the development package, for development builds of Logos Basecamp:

   ```bash
   nix build '.#lgx' --out-link result-lgx
   ```

   - The development variant (for example, `darwin-arm64-dev`) references `/nix/store` paths, so it works only on a machine with that Nix store. Development builds of `logosctl` and Logos Basecamp install only `-dev` variants.

1. Check that each output holds the package, `logos-<module-name>-module-lib.lgx`:

   ```bash
   ls result-lgx-portable/ result-lgx/
   ```

### Build a Windows package

Windows packages are cross-compiled: Nix runs on Linux and targets `x86_64-windows`. On a Windows machine, that Linux is WSL2. The result installs with the Windows build of `logosctl`.

1. Set up WSL2 with Ubuntu. In PowerShell, run:

   ```powershell
   wsl --install -d Ubuntu-24.04
   ```

   - Restart Windows if prompted, then open **Ubuntu 24.04** from the Start menu and create your Linux user.
   - WSL2 needs hardware virtualisation. If Windows itself runs in a virtual machine, enable nested virtualisation for that VM.

1. In the Ubuntu terminal, install Nix and open a new terminal afterwards:

   ```bash
   sh <(curl -L https://nixos.org/nix/install) --daemon
   ```

1. Enable flakes and the Logos binary cache, which serves the prebuilt Windows toolchain (Qt, the MinGW libraries, and the Logos SDK) so that you don't compile it yourself. The Nix daemon reads these settings from `/etc/nix/nix.conf`:

   ```bash
   sudo tee -a /etc/nix/nix.conf <<'EOF'
   experimental-features = nix-command flakes
   extra-substituters = https://cache.nix.logos.co/public
   extra-trusted-public-keys = public:l4HrXgL4nw246+LBh2SOJyhz64BoGegOYLheT/iIAPU=
   EOF
   sudo systemctl restart nix-daemon
   ```

1. Scaffold or clone your module in the Linux file system, for example under `~/`, rather than under `/mnt/c`. Nix and Git are much slower on the Windows drive.

1. Build the portable Windows package:

   ```bash
   nix build .#packages.x86_64-windows.lgx-portable
   ```

   - `result/logos-<module-name>-module-lib.lgx` holds a `windows-x86_64` variant whose plugin is a `.dll`.
   - Build the portable variant: a `-dev` variant references `/nix/store` paths that don't exist on Windows.
   - Every dependency of your module needs a Windows build too.

1. Copy the package to your Windows user folder:

   ```bash
   cp -L result/logos-<module-name>-module-lib.lgx /mnt/c/Users/<windows-user>/Downloads/
   ```

1. In PowerShell, with `logosctl` installed by `install-logosctl.ps1`, install, load, and call the module. Confirm the install prompt, or pass `-y`:

   ```powershell
   logosctl daemon start --detach
   logosctl package install --file $HOME\Downloads\logos-<module-name>-module-lib.lgx
   logosctl module load <module-name>
   logosctl call <module-name> <method> <args>
   ```

   The first build in a fresh WSL2 Ubuntu downloads about 500 MB from the binary cache and takes a few minutes; later builds reuse it.

## Step 6: Install the module

Before you can run your module with `logosctl`, install the LGX package. `logosctl package install` unpacks it into the current [session's](https://github.com/logos-co/logos-logoscore-cli/blob/master/docs/logosctl.md#sessions) `modules/` directory (`~/.logosctl/modules/` unless `--config-dir` or `LOGOSCTL_CONFIG_DIR` says otherwise), the same session that `logosctl daemon start` reads from.

There are two ways to install a module:

- Install a locally built `.lgx` package
- Install a package by name from the catalogue

### Install a locally built `.lgx` package

1. Start the `logosctl` daemon in detached mode.

   ```bash
   logosctl daemon start --detach
   ```

   - The command returns once the daemon accepts commands.

1. Install the portable `.lgx` package:

   ```bash
   logosctl package install --file ./result-lgx-portable/*.lgx -y
   ```

   - `-y` applies the install without asking for confirmation.
   - Use `--dir` instead of `--file` to install all LGX packages in a directory at once: `logosctl package install --dir ./packages/ -y`

1. Verify the installed module:

   ```bash
   logosctl package ls
   ```

   Your module is listed with the source `user`, next to the packages embedded in `logosctl`. The session's `modules/` directory now contains a subdirectory with `manifest.json`, the plugin binary (`.so` or `.dylib`), and a `variant` file.

### Install a package by name from the catalogue

The Logos module [catalogue](../../get-started/glossary.md#catalogue) is hosted on GitHub Releases in the [logos-modules-release](https://github.com/logos-co/logos-modules-release) repository. `logosctl package install` fetches a named package straight from the catalogue and installs it in one step.

:::warning
Catalogue packages ship portable variants only (for example, `linux-amd64`, `darwin-arm64`). They install into `logosctl` and into released builds of Logos Basecamp, but not into a development build of Logos Basecamp, which expects `-dev` variants.
:::

1. Start the `logosctl` daemon in detached mode, if it is not running yet.

   ```bash
   logosctl daemon start --detach
   ```

1. Refresh the catalogue, then search it for the module you want to install. Replace `<query>` with what you're looking for (for example, `chat`).

   ```bash
   logosctl catalog refresh
   logosctl package search <query>
   ```

   :::tip
   Run `logosctl package search` with no query to browse all available packages.
   :::

1. Install it by the name from the search results (for example, `chat_module`). `logosctl` resolves the name against the catalogue, downloads the package and its dependencies, and unpacks them into the session's `modules/` (or `plugins/`, for a UI module) in one step.

   ```bash
   logosctl package install <module-name> --yes
   ```

   - Add `--version` to pin a specific release instead of the newest one, and `--root-hash` to pin the exact published package identity.

## Step 7: Run the module

There are two Logos runtimes that can load and run your module: `logosctl` and Logos Basecamp.

### Run with `logosctl`

The `logosctl` CLI (from [`logos-logoscore-cli`](https://github.com/logos-co/logos-logoscore-cli)) is a headless runtime that can load modules and invoke their methods from the command line. It runs as a daemon that stays alive to host modules.

1. Load the module and call a method. Replace `<method>` and `<args>` with the method name and arguments you want to call.

   ```bash
   logosctl module load <module-name>
   logosctl call <module-name> <method> <args>
   ```

   - With the template's example methods, `logosctl call my_module greet World` prints `Hello, World! Greetings from the minimal module.`
   - `logosctl module show <module-name>` lists the module's methods and events with their descriptions.

1. Stop the daemon when finished.

   ```bash
   logosctl daemon stop
   ```

:::tip
Check out [Logos CLI Reference](../reference/logos-cli-reference.md) for more details on available commands and options.
:::

### Run with Logos Basecamp

Logos [Basecamp](../../get-started/glossary.md#basecamp) is a desktop shell that provides a graphical interface for managing and running modules. Its **Module Inspector** lists every loaded core module and lets you call its methods, so you can try your module without writing a UI module for it.

These steps use a development build of Logos Basecamp, which installs the development package from Step 5, with a data directory of its own. To use the released Logos Basecamp instead, install the portable package as described in [Install and load a module in Logos Basecamp](../../basecamp/install-and-load-a-module-in-logos-basecamp.md).

1. Build the development version of Logos Basecamp and the `lgpm` package manager, which installs packages into a directory of your choice:

   ```bash
   nix build 'github:logos-co/logos-basecamp/0.3.2' --out-link ./logos-basecamp
   nix build 'github:logos-co/logos-package-manager/0.3.0#cli' --out-link ./pm
   ```

1. Create a data directory for Logos Basecamp, and install the development package into its `modules/` directory:

   ```bash
   mkdir -p basecamp-data/modules basecamp-data/plugins
   ./pm/bin/lgpm --modules-dir basecamp-data/modules install --file ./result-lgx/*.lgx
   ```

   - `lgpm` warns that the package is unsigned, which is expected for a package you built yourself.

1. Launch Logos Basecamp with that data directory:

   ```bash
   ./logos-basecamp/bin/LogosBasecamp --user-dir "$PWD/basecamp-data"
   ```

   - `--user-dir` keeps this data apart from any other Logos Basecamp you run. Logos Basecamp reads core modules from its `modules/` subdirectory and UI modules from `plugins/`.

1. Open **Settings**, select **Module Inspector**, and click **Load** in your module's row.

   **Expected result:** the button changes to **Unload** once the module is loaded.

1. Click **Interface** in your module's row.

   **Expected result:** each method is listed with its signature, its description and a **Call** button.

1. Click **Call** next to a method that takes no arguments, such as the template's `getStatus`.

   **Expected result:** the **Result** area shows what the method returned, as JSON. For `getStatus`, that is `{"result":"Minimal module is running."}`.

   - **Call** passes no arguments, so a method that takes parameters reports `invalid_args`. Call those methods with `logosctl call` instead.

:::tip
Try running the [Blockchain module](../../blockchain/get-started/run-a-logos-blockchain-node-from-cli.md), [Storage module](../../storage/get-started/run-logos-storage-node.md) or [Chat module](../../messaging/get-started/send-1-1-messages-logos-chat.md) or browse the [Logos module catalogue](https://github.com/logos-co/logos-modules-release#module-set). `logosctl package search` lists it from the command line.
:::

## Troubleshooting

### Known constraints

A single `logosctl` daemon instance supports only one instance of a module, so all dependent apps share that state. To run multiple independent instances from the CLI, start separate daemons under separate sessions (`logosctl daemon start --config-dir <dir>` for each), so each gets its own installed modules and state. From Logos Basecamp, start separate instances with their own user directories (`--user-dir`); each one runs its own embedded runtime and module instances in isolation.

### Nix reports an "experimental features" error

If you see errors about experimental features, either pass the flag:

```bash
nix --extra-experimental-features "nix-command flakes" build
```

Or add the following to `~/.config/nix/nix.conf`:

```conf
experimental-features = nix-command flakes
```

### The build fails with `Failed to open header file` or `unknown type name`

The build derives the implementation from the module's `name` in `metadata.json`: it parses `src/<module-name>_impl.h` and expects a class named `<ModuleName>Impl` in it.

- A header with another name stops the build with `Error parsing impl header: Failed to open header file: src/<module-name>_impl.h`.
- A class with another name fails in the generated code with `error: unknown type name '<ModuleName>Impl'`.

Rename the file or the class to match `name`, or set `codegen.impl_header` and `codegen.impl_class` in `metadata.json` to the names you use.

### The build reports that the module declares no `interface`

A core module must keep `"interface": "universal"` in `metadata.json`. Without it, the build stops with `logos-module-builder: module '<module-name>' is a core module shipping a plugin (main: <module-name>_plugin) but declares no interface`. Add the field back.

### Module not discovered by Logos Basecamp

Confirm that you launched Logos Basecamp with the `--user-dir` you installed into, and that the module is in a subdirectory of its `modules/` directory (for example, `basecamp-data/modules/my_module/`) containing the module binary and `manifest.json`. A development build of Logos Basecamp needs the `-dev` variant from `.#lgx`; a released build needs the portable variant from `.#lgx-portable`.

Also confirm you installed the module into the base directory the running instance actually reads, and restarted it afterwards. A rebuilt package never reaches a running Basecamp on its own. See [Troubleshoot Logos module development with Basecamp](../../scaffold/troubleshooting/troubleshoot-logos-module-development-with-basecamp.md).

### Module not discovered by `logosctl`

Confirm the module is in a subdirectory of the session's `modules/` directory (for example, `modules/my_module/`) and that the subdirectory contains a `manifest.json` with a `main` object matching your OS and architecture. Run `logosctl package ls` to see what the current session actually has installed.

### `logosctl package install` fails

Verify the session's `modules/` directory (under `--config-dir`, default `~/.logosctl`) exists and is writable. If installing from a local `.lgx` file, confirm the file path is correct (the bundler writes `logos-<module-name>-module-lib.lgx`, not `<module-name>.lgx`). If installing from the catalogue, check your internet connection and that you've run `logosctl catalog refresh` recently. To pin a specific version instead of the newest one, pass `--version` (and optionally `--root-hash`) to `logosctl package install`.

If installing into Logos Basecamp's data directory with the standalone `lgpm`, verify that the target directory exists and is writable instead.

### LGX variant mismatch

If `logosctl package install` fails with an error such as `Package does not contain variant for platform: darwin-arm64 (package provides: darwin-arm64-dev)`, the package has no variant of the kind that `logosctl` installs.

- `nix build '.#lgx'` produces a single `-dev` variant (for example, `linux-amd64-dev`) for development builds of `logosctl` and Logos Basecamp. Released builds reject it.
- `nix build '.#lgx-portable'` produces a single portable variant (for example, `linux-amd64`) for released builds of `logosctl` and Logos Basecamp.

Catalogue packages ship portable variants only. To put both variants, or variants for several platforms, in one package, see the [LGX package format and bundling reference](../reference/lgx-package-format-and-bundling-reference.md).

### `nix build .#lib` does nothing or fails silently

Some shells (notably zsh) treat `#` as a comment character outside quotes. Quote the flake reference so the `#` reaches Nix intact.

```bash
nix build '.#lib'
```

### First build is slow

The first `nix build` downloads Qt 6, the Logos C++ SDK, the code generator, and the rest of the build dependencies. This is a one-time cost; subsequent builds reuse the cache.
