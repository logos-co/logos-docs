---
title: Wrap a C library as a Logos core module
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: iurimatias, Khushboo-dev-cpp, cheny0
owner: logos
doc_version: 1
slug: wrap-a-c-library-as-a-logos-core-module
---

# Wrap a C library as a Logos core module

#### Expose functions from a C shared library through a Logos core module.

> [!NOTE]
>
> - **Permissions**: No special permissions required.
> - **Product**: Logos Basecamp

A Logos core module that wraps a C library is a C++ plugin that links a C shared library (`.so` on Linux, `.dylib` on macOS) and re-exposes its functions as `Q_INVOKABLE` methods. Other modules and `logoscore` invoke those methods through Qt's meta-object system, so callers use the C library without knowing it is C.

> [!NOTE]
>
> For other module types, check out [Build and run a Logos core module](./build-run-a-logos-core-module.md), [Build a QML UI for your logos module](./build-a-qml-ui-for-your-logos-module.md) and [Build a Logos C++ UI module](./build-a-logos-cpp-ui-module.md).

Before you start, make sure you have the following:

- Nix with flakes enabled
- A C compiler (`gcc` or `clang`), required only if you are building the C library yourself rather than vendoring a pre-built `.so`/`.dylib`
- Basic familiarity with C and C++
- The C library's source files, or a pre-built shared library plus its header

> [!TIP]
>
> If you don't have a C library, you can try the `libtictactoe.h` and `libtictactoe.c` from example [`libtictactoe`](https://github.com/fryorcraken/logos-module-tictactoe/tree/master/tictactoe/lib). Copy them into your `lib/` directory.

## What to expect

- An `.lgx` package with the plugin binary and bundled C library, ready for `logos-basecamp` or `logoscore`.
- One `Q_INVOKABLE` method per exposed C function, callable from other modules and `logoscore` without those callers linking against the C library.
- A `nix build` workflow you can re-run after edits.

> [!TIP]
>
> Check out an [example](https://github.com/fryorcraken/logos-module-tictactoe/tree/master/tictactoe) of a working core module that wraps a small C library.

## Step 1: Scaffold the module project with external-lib support

Use the `with-external-lib` variant of the module builder template. Compared to the plain template, its `metadata.json` is pre-populated with an `external_libraries` block and `extra_include_dirs`, and its `CMakeLists.txt` calls `logos_module()` with `EXTERNAL_LIBS`.

> [!TIP]
>
> For larger libraries with their own build systems, build the C library in a separate project and copy the resulting `.so`/`.dylib` and header into the module's `lib/` directory.

1. Create a new directory and initialize it from the external-lib template. Replace `<module-name>` with your module's name.

   ```bash
   mkdir <module-name> && cd <module-name>
   nix flake init -t github:logos-co/logos-module-builder/tutorial-v1#with-external-lib
   ```

1. Review the generated project. The scaffold uses `external_lib` for the module name and `example_lib` for the library name. You replace both in Step 3.

   ```text
   <module-name>/
   ├── flake.nix
   ├── metadata.json
   ├── CMakeLists.txt
   └── src/
       ├── external_lib_interface.h
       ├── external_lib_plugin.h
       └── external_lib_plugin.cpp
   ```

## Step 2: Add the C library to the lib directory

The `metadata.json` declares `vendor_path: "lib"`, so the build system looks for the C library there.

1. Create the `lib/` directory at the project root.

   ```bash
   mkdir -p lib
   ```

1. Create the C header in `lib/<lib-name>.h`. Wrap the function declarations in an include guard and an `extern "C"` block. A a `libcalc.h` looks like this:

   ```c
   #ifndef LIBCALC_H
   #define LIBCALC_H

   #ifdef __cplusplus
   extern "C" {
   #endif

   /* Declare one function for each operation the module will expose. */
   int calc_add(int a, int b);
   const char* calc_version(void);

   #ifdef __cplusplus
   }
   #endif

   #endif /* LIBCALC_H */
   ```

1. Write the C implementation in `lib/<lib-name>.c`, with one definition per declared function. Skip this item if you are vendoring a pre-built `.so`/`.dylib`. A `libcalc.c` looks like this:

```c
#include "libcalc.h"

int calc_add(int a, int b)
{
    return a + b;
}

const char* calc_version(void)
{
    return "1.0.0";
}
```

1. Place the shared library in `lib/` as `lib<lib-name>.so` (Linux) or `lib<lib-name>.dylib` (macOS). Take one of two paths:

   - **Vendor a pre-built library**. Copy the `.so`/`.dylib` from upstream releases or an existing build into `lib/`.
   - **Compile the implementation from the previous item** as a position-independent shared object.

     ```bash

     cd lib

     # Linux
     gcc -shared -fPIC -o lib/lib<lib-name>.so lib/<lib-name>.c

     # macOS
     gcc -shared -fPIC -o lib/lib<lib-name>.dylib lib/<lib-name>.c
     ```

1. Verify the symbols are exported.

   ```bash
   # Linux
   nm -D lib/lib<lib-name>.so | grep <lib-name>

   # macOS
   nm -gU lib/lib<lib-name>.dylib | grep <lib-name>
   ```

   Each function you intend to wrap should appear with `T`. For example, `libcalc` exports `calc_add` and `calc_version`:
   
   ```text
   0000000000001139 T calc_add
   0000000000001299 T calc_version
   ```
   
## Step 3: Adapt the template for your module and library

The template generates files with placeholder names like `my_module` and `doSomething`. Replace these in every generated file to match your module's name and methods.

1. Edit file names.
   - Rename `external_lib_interface.h`, `external_lib_plugin.h`, and `external_lib_plugin.cpp` to match your module name. For example, if your module is `calc`, the files become `calc_interface.h`, `calc_plugin.h`, and `calc_plugin.cpp`.

1. Edit `metadata.json` to match your module.
   - `name` must be a valid C identifier; it is used in filenames, method calls, and module loading.
   - `main` must match the plugin filename without the extension (for example, `my_module_plugin` resolves to `my_module_plugin.so` or `.dylib`).
   - `nix.external_libraries[].name` must match the library name without the `lib` prefix. The builder searches `vendor_path` for `lib<name>.so`/`.dylib` (Unix `-l<name>` convention). For example, `"calc"` matches `libcalc.so`/`.dylib`.
   - `nix.external_libraries[].vendor_path` is where the builder looks for the pre-built library. Defaults to `"lib"`.
   - `nix.cmake.extra_include_dirs` is the CMake include path. Keep `["lib"]` so source can `#include "lib/<lib-name>.h"`.

1. Edit `CMakeLists.txt` and update the `project()` name, the `NAME` and `SOURCES` values and `EXTERNAL_LIBS` to match your module and library.
   - `project(<ProjectName>)` is the CMake project name. 
   - `NAME` must match the `name` field in `metadata.json`. A mismatch causes the build to succeed but the install phase to fail.
   - `SOURCES` is the renamed interface, plugin header, and plugin implementation files.
   - `EXTERNAL_LIBS` is the names of external libraries to link (must match `nix.external_libraries[].name` in `metadata.json`)
   - Leave the `if/elseif/else` block. It is template boilerplate.

1. Edit `flake.nix` and update the `description` field.
   - The generated `flake.nix` uses an unpinned `logos-module-builder` URL. For reproducible builds, pin it to `tutorial-v1`.

> [!NOTE]
>
> If your C library is in a Git repository rather than available as a pre-built `.so`/`.dylib`, declare it as a non-flake input and pass it to the builder via `externalLibInputs`:
>
> The `externalLibInputs` key must match the `name` field in `nix.external_libraries`. In `metadata.json`, replace `vendor_path` with `flake_input`, `build_command` (e.g. `"make shared"`), and `output_pattern` (e.g. `"build/libfoo.*"`). For Go libraries with cgo bindings, add `"go_build": true` to enable the Go toolchain. The builder clones the source, runs the build command, copies matching output files into `lib/`, then continues the normal build.

## Step 4: Wrap the C functions in the plugin source

The template's plugin headers ship with three placeholder methods (`initLibrary`, `processData`, `cleanup`) and a commented-out `#include "lib/libexample.h"` line. Replace them with declarations and implementations that match your C API.

1. In the interface header, replace the class name, interface ID, include guard, and placeholder `Q_INVOKABLE virtual` methods with one pure-virtual method per C function you want to expose. The header has this shape:

   ```cpp
   #include <QObject>
   #include <logos/PluginInterface.h>

   class <ModuleName>Interface : public PluginInterface {
   public:
       virtual ~<ModuleName>Interface() = default;

       Q_INVOKABLE virtual void initLibrary() = 0;        // placeholder, replace
       Q_INVOKABLE virtual QString processData(...) = 0;  // placeholder, replace
       Q_INVOKABLE virtual void cleanup() = 0;            // placeholder, replace
   };

   Q_DECLARE_INTERFACE(<ModuleName>Interface, "org.logos.<ModuleName>Interface")
   ```

   - Supported parameter and return types: `int`, `bool`, `QString`, `QByteArray`, `QVariant`, `QJsonArray`, `QStringList`, `LogosResult`.
   - The interface ID string (for example, `"org.logos.CalcModuleInterface"`) must be unique across all modules.

1. In the plugin header, replace class name, interface references, `name()/version()` return values, and declare your `Q_INVOKABLE` wrapper methods. Add `#include` for your C library header. 
   - `Q_PLUGIN_METADATA(IID <ModuleName>Interface_iid FILE "metadata.json")` embeds `metadata.json` into the plugin binary. Omitting it causes the runtime to skip the plugin during discovery.
   - `Q_INTERFACES(<ModuleName>Interface PluginInterface)` registers **both** interfaces with Qt's plugin system. Listing only `<ModuleName>Interface` breaks `PluginInterface` discovery and the plugin will not load.
   - `name()` must return the same string as the top-level `name` field in `metadata.json`. A mismatch causes the install phase to fail looking for `<name>_plugin.so`/`.dylib`.
   - Declare `initLogos` as `Q_INVOKABLE` **without** `override`. The base `PluginInterface` class does not declare it virtual; the host calls it reflectively via `QMetaObject::invokeMethod`. Adding `override` produces a compile error.
   - Inside `initLogos`, assign the API pointer to the **global** `logosAPI` variable from `liblogos`, not to a class member like `m_logosAPI`. A class member silently breaks inter-module calls at runtime with no error message.

The header has this shape:

   ```cpp
   #ifndef <MODULE_NAME>_PLUGIN_H
   #define <MODULE_NAME>_PLUGIN_H

   #include <QObject>
   #include <QString>
   #include "<module-name>_interface.h"
   #include "lib/lib<lib-name>.h"

   class LogosAPI;

   class <ModuleName>Plugin : public QObject, public <ModuleName>Interface
   {
      Q_OBJECT
      Q_PLUGIN_METADATA(IID <ModuleName>Interface_iid FILE "metadata.json")
      Q_INTERFACES(<ModuleName>Interface PluginInterface)

   public:
      explicit <ModuleName>Plugin(QObject* parent = nullptr);
      ~<ModuleName>Plugin() override;

      // Required by PluginInterface — must match metadata.json
      QString name() const override { return "<module-name>"; }
      QString version() const override { return "<version>"; }

      // Called by the Logos host on module load. Q_INVOKABLE, NOT override —
      // the base class does not declare it virtual; the host calls it reflectively.
      Q_INVOKABLE void initLogos(LogosAPI* api);

      // One Q_INVOKABLE per wrapped C function (declared in the interface).
      Q_INVOKABLE int add(int a, int b) override;
      // ... declare the rest of your wrapper methods here

   signals:
      // Required for inter-module event forwarding.
      void eventResponse(const QString& eventName, const QVariantList& args);
   };

   #endif
   ```

1. Define the constructor, destructor, and `initLogos` in the plugin implementation. The wrapping pattern for each method is always the same: call the C function with the arguments, convert the C return type to a Qt type if needed (e.g. `const char*` → `QString::fromUtf8(...)`), and return the Qt value.
   - Use the global `logosAPI` variable from liblogos, not a class member.`logosAPI` is defined in the Logos SDK headers and is used by the API internally. Storing the pointer in a local `m_logosAPI` member doesn't work.

A `<module-name>_plugin.cpp` looks like this:

   ```cpp
   #include "<module-name>_plugin.h"
   #include "logos_api.h"

   <ModuleName>Plugin::<ModuleName>Plugin(QObject* parent) : QObject(parent) {}

   <ModuleName>Plugin::~<ModuleName>Plugin() {}

   void <ModuleName>Plugin::initLogos(LogosAPI* api) {
      logosAPI = api;
   }

   int <ModuleName>Plugin::add(int a, int b) {
      return <lib-name>_add(a, b);
   }
   ```

## Step 5: Build, package, and run the module

The remaining work is identical to a [plain core module](./build-run-a-logos-core-module.md). The LGX packager bundles the C library next to the plugin binary, so the RPATH lookup works at runtime.

### Build the module

1. Initialize a Git repository. Nix flakes only evaluate Git-tracked files. Without this, the build cannot find your `metadata.json`, `CMakeLists.txt`, or sources.

   ```bash
   git init && git add -A
   ```

1. Build the full module output (plugin library and generated SDK headers).

   ```bash
   nix build
   ```

   - Use `nix build '.#lib'` to build only the plugin shared library.
   - Use `nix build '.#include'` to build only the generated SDK headers.

   > [!NOTE]
   >
   > Quote the `.#lib` / `.#include` arguments. In zsh and some other shells, an unquoted `#` starts a comment, so `nix build .#lib` silently builds the default attribute instead of `lib`.

   > [!TIP]
   >
   > For faster iteration, use `nix develop` to enter a shell with build dependencies, then run `cmake -B build -GNinja && cmake --build build`. Output goes to `build/` instead of `result/`. Switch back to `nix build` before packaging.

1. Verify the build output contains the plugin binary, the bundled C library, and the generated headers.

   ```text
   result/
   ├── lib/
   │   ├── <module-name>_plugin.so       # (or .dylib on macOS)
   │   └── lib<lib-name>.so              # (or .dylib on macOS), the bundled C library
   └── include/
       ├── <module-name>_api.h           # Generated type-safe wrapper header
       └── <module-name>_api.cpp         # Generated wrapper implementation
   ```

   - If `lib<lib-name>.so`/`.dylib` is missing from `result/lib/`, the RPATH lookup will fail at runtime. See the troubleshooting entry "Library not found at runtime".

### Inspect the module

Inspect the compiled binary to verify metadata and wrapped methods. Use `lm` for headless checks or `logos-module-viewer` for an interactive GUI.

#### Inspect with the CLI tool

The `lm` tool reads metadata and methods via Qt's meta-object system, so you can verify the wrap without loading the module into the full runtime.

1. Build the `lm` tool from the `logos-module` repository.

   ```bash
   nix build 'github:logos-co/logos-module/tutorial-v1#lm' --out-link ./lm
   ```

1. View the module metadata and confirm the information is correct.

   ```bash
   ./lm/bin/lm metadata result/lib/<module-name>_plugin.so
   ```

   - Append `--json` for JSON output. Example:

     ```json
     {
       "name": "<module-name>",
       "version": "1.0.0",
       "description": "Wrap the <lib-name> C library as a Logos module",
       "author": "",
       "type": "core",
       "dependencies": []
     }
     ```

1. View the module methods and confirm every wrapped function from Step 4 appears in the list.

   ```bash
   ./lm/bin/lm methods result/lib/<module-name>_plugin.so
   ```

   - Append `--json` for JSON output. A wrapped function appears alongside `initLogos`:

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
         "name": "libVersion",
         "signature": "libVersion()",
         "returnType": "QString",
         "isInvokable": true,
         "parameters": []
       }
     ]
     ```

#### Inspect with the graphical tool

`logos-module-viewer` displays metadata and methods and lets you call methods interactively. It's useful for sanity-checking the wrap before wiring it into another module.

1. Build the viewer.

   ```bash
   nix build 'github:logos-co/logos-module-viewer/tutorial-v1#app' --out-link ./logos-viewer
   ```

1. Launch the viewer with the module binary.

   ```bash
   ./logos-viewer/bin/logos-module-viewer -m ./result/lib/<module-name>_plugin.so
   ```

### Package the module

Package the build output into an `.lgx` before running with `logoscore` or installing into `logos-basecamp`. See the [LGX package format and bundling reference](./lgx-package-format-and-bundling-reference.md) for details.

> [!NOTE]
>
> The bundler generates `manifest.json` from `metadata.json`, mapping each variant to its main entry point.

There are two ways to create `.lgx` packages:

- Use the built-in Nix derivation from `logos-module-builder` (preferred).
- Use the `nix bundle` command directly.

#### Use the Nix derivation

When your module uses `logos-module-builder`, LGX outputs are available from your flake (the builder includes `nix-bundle-lgx`).

1. Bundle the module into an LGX package that uses `/nix/store` references for local development.

   ```bash
   nix build .#lgx
   ```

   - Use `#lgx-portable` for a self-contained package with all dependencies bundled: `nix build .#lgx-portable`.

1. Check the `result/` directory and confirm the `<module-name>-<version>.lgx` file is present.

#### Use the `nix bundle` command

Use `nix bundle` if your module does not use `logos-module-builder`, or if you need `dual` mode (both `dev` and `portable` in one `.lgx`), which is only available via `nix bundle`.

1. Bundle the module into an LGX package.

   ```bash
   nix bundle --bundler github:logos-co/nix-bundle-lgx/tutorial-v1 .#lib
   ```

   - Use `#portable` for a self-contained package with no `/nix/store` references: `nix bundle --bundler github:logos-co/nix-bundle-lgx/tutorial-v1#portable .#lib`.
   - Use `#dual` to produce both dev and portable variants in a single `.lgx` file: `nix bundle --bundler github:logos-co/nix-bundle-lgx/tutorial-v1#dual .#lib`.

1. Check the current directory and confirm the `<module-name>-<version>.lgx` file is present.

### Install the module

Install the LGX package into a `modules/` directory that the runtime can load from. There are two ways:

- Install a locally built `.lgx` package.
- Download and install a `.lgx` file from a registry.

#### Install a locally built `.lgx` package

1. Build the Logos Package Manager (`lgpm`) CLI.

   ```bash
   nix build 'github:logos-co/logos-package-manager/tutorial-v1#cli' --out-link ./package-manager
   ```

1. Create the `modules/` directory and install the `.lgx` package.

   ```bash
   ./package-manager/bin/lgpm --modules-dir ./modules install --file result/<module-name>.lgx
   ```

   - Use `--dir` instead of `--file` to install all LGX packages in a directory at once: `./package-manager/bin/lgpm --modules-dir ./modules install --dir ./packages/`.

1. Verify the installed module directory. It should contain `manifest.json`, the plugin binary (`.so` or `.dylib`), the bundled C library (`lib<lib-name>.so` / `.dylib`), and a `variant` file.

#### Download and install from a registry

The Logos module catalog is hosted on GitHub Releases in the [logos-modules](https://github.com/logos-co/logos-modules) repository. Use `lgpd` to search and download packages, then `lgpm` to install them locally.

1. Build the Logos Package Manager (`lgpm`) CLI if you have not already.

   ```bash
   nix build 'github:logos-co/logos-package-manager/tutorial-v1#cli' --out-link ./package-manager
   ```

1. Build the Logos Package Downloader (`lgpd`) CLI.

   ```bash
   nix build 'github:logos-co/logos-package-downloader/tutorial-v1#cli' --out-link ./downloader
   ```

1. Search the catalog for the module you want to install.

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

   - Use `--release <tag>` to download from a specific release version. For example: `./downloader/bin/lgpd --release v2.0.0 download <module-name> -o ./packages/`.

1. Create the `modules/` directory and install the downloaded package.

   ```bash
   ./package-manager/bin/lgpm --modules-dir ./modules install --file ./packages/<module-name>.lgx
   ```

### Run the module

Two runtimes can load your module: `logoscore` and `logos-basecamp`. To interact with the module through the `logos-basecamp` UI, you also need to [provide a UI module](./build-a-qml-ui-for-your-logos-module.md).

#### Run with `logoscore`

The `logoscore` CLI is a headless daemon that loads modules and invokes their methods from the command line.

1. Build `logoscore` from the `logos-logoscore-cli` repository.

   ```bash
   nix build 'github:logos-co/logos-logoscore-cli/tutorial-v1' --out-link ./logos
   ```

1. Start the `logoscore` daemon with the `modules/` directory.

   ```bash
   ./logos/bin/logoscore -D -m ./modules
   ```

1. From another terminal, load the module and call one of the wrapped methods. Replace `<method>` and `<args>` with the method name and arguments you want to call.

   ```bash
   ./logos/bin/logoscore load-module <module-name>
   ./logos/bin/logoscore call <module-name> <method> <args>
   ```

1. Stop the daemon when finished.

   ```bash
   ./logos/bin/logoscore stop
   ```

> [!TIP]
>
> Check out the [Logos CLI Reference](./logos-cli-reference.md) for more details on available commands and options.

#### Run with `logos-basecamp`

`logos-basecamp` is a desktop application for managing and running modules. Core modules run as background services. UI modules call them through `LogosAPI` or the `logos.callModule()` bridge.

> [!IMPORTANT]
>
> The LGX variant must match the basecamp build type. Dev basecamp expects dev variants (e.g. `darwin-arm64-dev`). Portable expects portable variants (e.g. `darwin-arm64`). See the [LGX package format and bundling reference](./lgx-package-format-and-bundling-reference.md).

1. Build the development version of `logos-basecamp`.

   ```bash
   nix build 'github:logos-co/logos-basecamp/tutorial-v1#app' --out-link ./logos-basecamp
   ```

1. Launch `logos-basecamp` once to create its data directory and preinstall bundled modules, then close it.

   ```bash
   ./logos-basecamp/bin/logos-basecamp
   ```

   - To find the data directory, check the log for `plugins directory`, or look for the directory containing `modules/` and `plugins/` at `~/Library/Application Support/Logos/` (macOS) or `~/.local/share/Logos/` (Linux).

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

### `initLogos` marked 'override', but does not override                     
                                                                               
The compiler reports this when `initLogos` is declared with the `override` keyword, because the base `PluginInterface` class does not declare it as virtual. Logos calls `initLogos` reflectively through `QMetaObject::invokeMethod`, not through the C++ vtable, so the method is `Q_INVOKABLE` rather than `virtual`. Drop the `override` keyword from the declaration.

```cpp
Q_INVOKABLE void initLogos(LogosAPI* api);
```

### `initLogos` stores the API pointer in the wrong variable
                                                                               
If inter-module calls or API features fail silently, make sure `initLogos` assigns to the global `logosAPI` variable (defined in the Logos SDK / `liblogos`), rather than to a class member such as `m_logosAPI`.

```cpp
// CORRECT: uses the global variable from liblogos
void MyPlugin::initLogos(LogosAPI* api)
{
    logosAPI = api;
}

// WRONG: stores in a local member, API calls won't work
void MyPlugin::initLogos(LogosAPI* api)
{
    m_logosAPI = api;
}
```  

### Library not found at runtime

Confirm `lib<name>.so` (Linux) or `lib<name>.dylib` (macOS) sits in the same directory as the plugin binary. The build system sets RPATH to `$ORIGIN` (Linux) or `@loader_path` (macOS), so the loader looks alongside the plugin. If the library is missing, re-run `nix build` and check `result/lib/`.

### Undefined symbol errors when linking

Verify the C header has `extern "C"` guards and that the library exports the expected symbols (`nm -D lib/lib<name>.so | grep <symbol>`). Without the guards, C++ name mangling produces symbol names that do not match what the C library exports.

### Build succeeds but link phase fails with a missing library

Check that `EXTERNAL_LIBS` in `CMakeLists.txt` matches `nix.external_libraries[].name` in `metadata.json` exactly. Both omit the `lib` prefix. A mismatch passes the configure and compile phases but fails at link time.
