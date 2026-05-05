---
title: Build and run a Logos core module
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: cheny0, iurimatias
owner: logos
doc_version: 1
slug: build-run-a-logos-core-module
---

# Build and run a Logos core module

#### Scaffold, build, package, and test a core module on the Logos platform.

> [!NOTE]
>
> - **Permissions**: No special permissions required.
> - **Product**: Logos Basecamp

The Logos platform is a modular application framework built on Qt 6. Applications are composed of dynamically loaded modules (Qt plugins) that provide features and functionality.

Logos core modules are non-UI modules that provide backend functionality. Core modules run in isolated `logos_host` processes and communicate via Qt Remote Objects.

> [!NOTE]
>
> For other module types, check out [Wrap a C Library as a Logos core module](./wrap-a-c-library-as-a-logos-core-module.md), [Build a QML UI for your logos module](./build-a-qml-ui-for-your-logos-module.md) and [Build a Logos C++ UI module](./build-a-logos-cpp-ui-module.md).

Before you start, make sure you have the following:

- Linux (x86_64 or aarch64) or macOS (arm64 or x86_64)
- At least 10 GB of disk space
- [Nix](https://nixos.org/download.html) with flakes enabled
- Git
- Basic familiarity with C++ (C++17), Qt 6 (`QObject`, `Q_INVOKABLE`, signals/slots), CMake, and Nix concepts

## What to expect

- You can scaffold, configure, and build a Logos core module using the templates provided by `logos-module-builder`.
- You can inspect the compiled module's metadata and methods using the `lm` CLI tool or the `logos-module-viewer` graphical tool.
- You can package, install, and call your module's methods through `logoscore` or load it into `logos-basecamp`.

## Step 1: Scaffold the module project

The `logos-module-builder` provides four scaffolding templates for different module types. To create a Logos core module, choose the `default` template that produces a minimal core module with a C++ backend and no UI.

1. Create a new directory using your module's name and initialize it from the module builder template. Replace `<module-name>` with your module's name, for example, `my_module`.

   ```bash
   mkdir <module-name> && cd <module-name>
   nix flake init -t github:logos-co/logos-module-builder/tutorial-v1
   ```

1. Review the project directory. The generated project structure looks like this:

   ```
   my-module/
   ├── flake.nix
   ├── metadata.json
   ├── CMakeLists.txt
   └── src/
       ├── my_module_interface.h
       ├── my_module_plugin.h
       └── my_module_plugin.cpp
   ```

   > [!NOTE]
   >
   > The `metadata.json` file is the single source of truth for your module. Read [LGX package format and bundling reference](./lgx-package-format-and-bundling-reference.md) for more details.

## Step 2: Adapt the template for your module

The template generates files with placeholder names like `my_module` and `doSomething`. Replace these in every generated file to match your module's name and methods.

1. Edit `metadata.json` and set `name`, `version`, `description`, and `main` to match your module.
   - `name` must be a valid C identifier; it is used in filenames, method calls, and module loading.
   - `main` must match the plugin filename without the extension (for example, `my_module_plugin` resolves to `my_module_plugin.so` or `.dylib`).

1. Edit `CMakeLists.txt` and update the `project()` name and the `NAME` and `SOURCES` values inside the `logos_module()` call.
   - The `CMakeLists.txt` uses the `logos_module()` macro to handle Qt plugin setup.
   - `NAME` must match the `name` field in `metadata.json`. A mismatch causes the build to succeed but the install phase to fail.

1. Edit `flake.nix` and update the `description` field.
   - The generated `flake.nix` uses an unpinned `logos-module-builder` URL. For reproducible builds, pin it to a specific commit.

1. Rename the source files in `src/` to match your module name.

   ```bash
   mv src/my_module_interface.h    src/<module_name>_interface.h
   mv src/my_module_plugin.h       src/<module_name>_plugin.h
   mv src/my_module_plugin.cpp     src/<module_name>_plugin.cpp
   ```

1. Edit the interface header (`src/<module_name>_interface.h`) and replace the class name, include guard, and interface ID string.
   - Declare each method your module exposes as `Q_INVOKABLE virtual` and pure-virtual.
   - The interface ID (for example, `"org.logos.MyModuleInterface"`) must be unique across all modules.

1. Edit the plugin header (`src/<module_name>_plugin.h`) and replace the class name, include guard, and interface references.
   - `Q_PLUGIN_METADATA(IID ... FILE "metadata.json")` embeds the metadata into the binary.
   - `Q_INTERFACES` must list both your interface and `PluginInterface`.
   - `name()` must return the same string as the `name` field in `metadata.json`.
   - Declare `initLogos(LogosAPI* api)` as `Q_INVOKABLE` but not `override`.

1. Edit the plugin implementation (`src/<module_name>_plugin.cpp`) and replace the placeholder method bodies with your logic.
   - In `initLogos`, assign the `LogosAPI*` pointer to the global `logosAPI` variable, not to a class member.

> [!TIP]
>
> Run `grep -r "<module_name>" .` after editing to catch any remaining placeholder references before building.

## Step 3: Build the module

1. Initialize a Git repository.

   ```bash
   git init && git add -A
   ```

1. Build the full module output (library and generated SDK headers).

   ```bash
   nix build
   ```

   - Use `nix build '.#lib'` to build only the plugin shared library.
   - Use `nix build '.#include'` to build only the generated SDK headers.
   
   > [!TIP] 
   >
   > For faster iteration on code changes, use `nix develop` to enter a shell with all build dependencies, then run `cmake -B build -GNinja && cmake --build build` manually. The manual build outputs to `build/` instead of `result/`. Switch back to `nix build` before packaging, since downstream steps expect the `result/` path.

1. Verify the build output contains the plugin binary and generated headers:

   ```text
      result/
   ├── lib/
   │   └── my_module_plugin.so       # (or .dylib on macOS)
   └── include/
      ├── my_module_api.h           # Generated type-safe wrapper header
      └── my_module_api.cpp         # Generated wrapper implementation
   ```

## Step 4: Inspect your module

You can inspect the compiled module binary to verify the embedded metadata and exposed methods using the `lm` CLI tool or the `logos-module-viewer` graphical tool.

### Inspect with the CLI tool

The `lm` tool (from `logos-module`) lets you inspect compiled module binaries without loading them into the full runtime. It reads metadata and enumerates methods via Qt's meta-object system.

1. Build the `lm` tool from the `logos-module` repository.

   ```bash
   nix build 'github:logos-co/logos-module/tutorial-v1#lm' --out-link ./lm
   ```

1. View the module metadata and confirm the information is correct.

   ```bash
   ./lm/bin/lm metadata result/lib/<module-name>_plugin.so
   ```

   - Append `--json` for JSON output.

   The JSON output looks like this:
   
   ```json
   {
  "name": "my_module",
  "version": "1.0.0",
  "description": "My first Logos module",
  "author": "",
  "type": "core",
  "dependencies": []
   }
   ```

1. View the module methods.

   ```bash
   ./lm/bin/lm methods result/lib/<module-name>_plugin.so
   ```

   - Append `--json` for JSON output.

   The JSON output looks like this:
   
   ```json
   [
      {
         "name": "initLogos",
         "signature": "initLogos(LogosAPI*)",
         "returnType": "void",
         "isInvokable": true,
         "parameters": [
            { "name": "logosAPIInstance", "type": "LogosAPI*" }
         ]
      },
      {
         "name": "doSomething",
         "signature": "doSomething(QString)",
         "returnType": "QString",
         "isInvokable": true,
         "parameters": [
            { "name": "input", "type": "QString" }
         ]
      }
   ]
   ```

### Inspect with the graphical tool

The `logos-module-viewer`is a graphical tool for inspecting loaded modules. It displays the module's metadata and methods in a graphical interface and lets you call methods interactively.

1. Build the viewer.

   ```bash
   nix build 'github:logos-co/logos-module-viewer/tutorial-v1#app' --out-link ./logos-viewer
   ```

1. Launch the viewer with the module binary.

   ```bash
   ./logos-viewer/bin/logos-module-viewer -m ./result/lib/<module-name>_plugin.so
   ```

## Step 5: Package the module

Before you can run your module with `logoscore` or install it into `logos-basecamp`, you need to package the build output into an `.lgx` package and install it into a `modules/` directory. Check out the [LGX package format and bundling reference](./lgx-package-format-and-bundling-reference.md) for more details on the format and bundling options.

> [!NOTE]
>
> The `manifest.json` is auto-generated from your module's `metadata.json` by the bundler. It maps each variant to its main entry point.

There are two ways to create `.lgx` packages:

- Use the built-in Nix derivation that comes with `logos-module-builder` (preferred). 
- Use the `nix bundle` command directly.

### Use the Nix derivation

When your module uses `logos-module-builder`, LGX package outputs are automatically available as part of your flake (the builder includes `nix-bundle-lgx` internally).

1. Bundle the module into an LGX package that uses `/nix/store` references for local development.

   ```bash
   nix build .#lgx
   ```

   - Use `#lgx-portable` for a self-contained, all dependencies bundled package: `nix build .#lgx-portable`.

1. Check the `result/` directory and confirm the `<module-name>-<version>.lgx` file is present.

### Use the `nix bundle` command

The `nix bundle` command is useful if your module does not use `logos-module-builder`, or if you need the `dual` bundling mode (both `dev` and `portable` in a single `.lgx` file) which is only available via the `nix bundle` command.

1. Bundle the module into an LGX package using the `nix bundle` command.

   ```bash
   nix bundle --bundler github:logos-co/nix-bundle-lgx/tutorial-v1 .#lib
   ```

   - Use `#portable` for a self-contained package with no `/nix/store` references: `nix bundle --bundler github:logos-co/nix-bundle-lgx/tutorial-v1#portable .#lib`.
   - Use `#dual` to produce both dev and portable variants in a single `.lgx` file: `nix bundle --bundler github:logos-co/nix-bundle-lgx/tutorial-v1#dual .#lib`.

1. Check the current directory and confirm the `<module-name>-<version>.lgx` file is present.

> [!TIP]
> 
> Check out [LGX package format and bundling reference](./lgx-package-format-and-bundling-reference.md) for more details on the format and bundling options.

## Step 5: Install the module

Before you can run your module with `logoscore` or `logos-basecamp`, install the LGX package into a `modules/` directory that the runtime can load from.

There are two ways to install `.lgx` packages:

- Install a locally built `.lgx` package
- Download and install a `.lgx` file from a registry

### Install a locally built `.lgx` package

1. Build the Logos Package Manager (`lgpm`) CLI.

   ```bash
   nix build 'github:logos-co/logos-package-manager/e5c25989861f4487c3dc8c7b3bc0062bcbc3221f#cli' --out-link ./package-manager
   ```

1. Create the `modules/` directory and install the `.lgx` package.

   ```bash
   ./package-manager/bin/lgpm --modules-dir ./modules install --file result/<module-name>.lgx
   ```

   - Use `--dir` instead of `--file` to install all LGX packages in a directory at once: `./package-manager/bin/lgpm --modules-dir ./modules install --dir ./packages/`

1. Verify the installed module directory. The directory contains `manifest.json`, the plugin binary (`.so` or `.dylib`), and a `variant` file.

### Download and install a `.lgx` file from a registry

The Logos module catalog is hosted on GitHub Releases in the [logos-modules](https://github.com/logos-co/logos-modules) repository. Use `lgpd` to search and download packages, then `lgpm` to install them locally.

1. Build the Logos Package Manager (`lgpm`) CLI.

   ```bash
   nix build 'github:logos-co/logos-package-manager/e5c25989861f4487c3dc8c7b3bc0062bcbc3221f#cli' --out-link ./package-manager
   ```

1. Build the Logos Package Downloader (`lgpd`) CLI.

   ```bash
   nix build 'github:logos-co/logos-package-downloader/tutorial-v1#cli' --out-link ./downloader
   ```

1. Search the catalog for the module you want to install. Replace `<module-name>` with the name of the module you want to find.

   ```bash
   ./downloader/bin/lgpd search <module-name>
   ```

   > [!TIP]
   >
   > Use `./downloader/bin/lgpd list` to browse all available packages.

1. Download the LGX package to a local directory.

   ```bash
   ./downloader/bin/lgpd download <module-name> -o ./packages/
   ```

   - Use `--release <tag>` to download from a specific release version. For example: `./downloader/bin/lgpd --release v2.0.0 download <module-name> -o ./packages/`

1.  Create the `modules/` directory and install the downloaded package.

   ```bash 
   ./package-manager/bin/lgpm --modules-dir ./modules install --file ./packages/<module-name>.lgx
   ```

   - Use `--ui-plugins-dir` instead of `--modules-dir` when installing UI modules.

## Step 6: Run the module 

There are two Logos runtimes, `logoscore` and `logos-basecamp`, that can load and run your module. However, to interact with your module directly through the `logos-basecamp` interface, you need to [provide a UI module](./build-a-qml-ui-for-your-logos-module.md).

### Run with `logoscore`

The `logoscore` CLI (from `logos-liblogos`) is a headless runtime that can load modules and invoke their methods from the command line. It runs as a daemon that stays alive to host modules.

1. Build `logoscore` from the `logos-logoscore-cli` repository.

   ```bash
   nix build 'github:logos-co/logos-logoscore-cli/tutorial-v1' --out-link ./logos
   ```

1. Start the `logoscore` daemon with the `modules/` directory. 

   ```bash
   ./logos/bin/logoscore -D -m ./modules
   ```

1. From another terminal, load the module and call a method. Replace `<method>` and `<args>` with the method name and arguments you want to call.

   ```bash
   cd <module-name>
   ./logos/bin/logoscore load-module <module-name>
   ./logos/bin/logoscore call <module-name> <method> <args>
   ```

1. Stop the daemon when finished.

   ```bash
   ./logos/bin/logoscore stop
   ```

> [!TIP]
>
> Check out [Logos CLI Reference](./logos-cli-reference.md) for more details on available commands and options.

### Run with `logos-basecamp`

Logos Basecamp is a desktop application that provides a graphical interface for managing and running modules. Core modules run as background services in `logos-basecamp`. Other UI modules can call them through `LogosAPI` or the `logos.callModule()` bridge once they are installed.

> [!IMPORTANT]
>
> The LGX variant type must match the basecamp build type. Dev builds of basecamp expect dev LGX variants (for example, `darwin-arm64-dev`), and portable builds expect portable variants (for example, `darwin-arm64`). Check out the [LGX package format and bundling reference](./lgx-package-format-and-bundling-reference.md) for more details.

1. Build the development version of `logos-basecamp`.

   ```bash
   nix build 'github:logos-co/logos-basecamp/tutorial-v1#app' --out-link ./logos-basecamp
   ```

1. Launch `logos-basecamp` once to create its data directory and preinstall bundled modules, then close it. 

   ```bash
   ./basecamp-result/bin/logos-basecamp
   ```

   - To find the data directory, check the log output for `plugins directory` or look for the directory containing `modules/` and `plugins/` subdirectories at `~/Library/Application Support/Logos/` (macOS) or `~/.local/share/Logos/` (Linux).

1. Set the `BASECAMP_DIR` variable to your platform's path.

   ```bash
   # macOS
   BASECAMP_DIR="$HOME/Library/Application Support/Logos/LogosBasecampDev"

   # Linux
   BASECAMP_DIR="$HOME/.local/share/Logos/LogosBasecampDev"
   ```

1. Install the module's dev LGX package into basecamp's modules directory.

   ```bash
   ./package-manager/bin/lgpm --modules-dir "$BASECAMP_DIR/modules" install --file result/<module-name>.lgx
   ```

## Troubleshooting

### Known constraints

A single `logoscore` instance supports only one instance of a module, so all dependent apps share that state. To run multiple independent instances, start separate `logos-basecamp` instances with their own user directories, and each `logos-basecamp` instance runs its own `logoscore` and module instances in isolation.

### Nix reports an "experimental features" error

If you see errors about experimental features, either pass the flag:

```bash
nix --extra-experimental-features "nix-command flakes" build
```

Or add the following to `~/.config/nix/nix.conf`:

```conf
experimental-features = nix-command flakes
```

### Module not discovered by `logos-basecamp`

Confirm the module is in a subdirectory of the `modules/` directory (for example, `modules/my_module/`) and that the subdirectory contains both the module binary and `metadata.json`. The `name` field in `metadata.json` must match the binary name (for example, `my_module` for `my_module_plugin.so`).

### Module not discovered by `logoscore`

Confirm the module is in a subdirectory of the `modules/` directory (for example, `modules/my_module/`) and that the subdirectory contains a `manifest.json` with a `main` object matching your OS and architecture.

### `lgpm` fails to install a module

Verify the target directory exists and is writable. If installing from a local `.lgx` file, confirm the file path is correct. If installing from the registry, check your internet connection, `lgpm` fetches packages from GitHub Releases. Try pinning a specific release version with `--release <tag>` if the latest release is unavailable.

### LGX variant mismatch

Dev builds of `logos-basecamp` expect dev LGX variants (for example, `darwin-arm64-dev`), and portable builds expect portable variants (for example, `darwin-arm64`). Use `nix build '.#lgx'` for dev and `nix build '.#lgx-portable'` for portable.

### `initLogos` marked 'override', but does not override                     
                                                                               
The compiler reports this when `initLogos` is declared with the `override` keyword, because the base `PluginInterface` class does not declare it as virtual. Logos calls `initLogos` reflectively through `QMetaObject::invokeMethod`, not through the C++ vtable, so the method is `Q_INVOKABLE` rather than `virtual`. Drop the `override` keyword from the declaration.

```cpp
Q_INVOKABLE void initLogos(LogosAPI* api);
```
                                                                               
### `initLogos` stores the API pointer in the wrong variable
                                                                               
If inter-module calls or API features fail silently, make sure `initLogos` assigns to the global `logosAPI` variable (defined in the Logos SDK / `liblogos`), rather than to a class member such as `m_logosAPI`.

```cpp
// CORRECT — uses the global variable from liblogos
void MyPlugin::initLogos(LogosAPI* api)
{
    logosAPI = api;
}

// WRONG — stores in a local member, API calls won't work
void MyPlugin::initLogos(LogosAPI* api)
{
    m_logosAPI = api;
}
```  

### `nix build .#lib` does nothing or fails silently                               
  
Some shells (notably zsh) treats `#` as a comment character outside quotes. Quote the flake reference so the `#` reaches nix intact.         

```bash
nix build '.#lib'
```

### First build is slow

The first `nix build` downloads Qt 6, the Logos C++ SDK, the code generator, and the rest of the build dependencies. This is a one-time cost, subsequent builds reuse the cache and typically complete in under 30 seconds.
