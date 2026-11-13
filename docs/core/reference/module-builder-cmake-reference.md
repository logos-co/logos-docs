---
title: Module builder CMake reference
doc_type: reference
product: core
owner: logos
mdx:
  format: md
sidebar_position: 100
description: Look up the CMake functions, variables and targets logos-module-builder provides.
custom_edit_url: https://github.com/logos-co/logos-module-builder/blob/master/docs/cmake-reference.md
source_repo: logos-co/logos-module-builder
source_version: 0.3.3
---

# Module builder CMake reference

#### Look up the CMake functions, variables and targets logos-module-builder provides.

:::note[Mirrored page]
This page mirrors [`docs/cmake-reference.md`](https://github.com/logos-co/logos-module-builder/blob/0.3.3/docs/cmake-reference.md) from
`logos-module-builder` 0.3.3, and is regenerated automatically after each release. To change it, edit
the source in [`logos-co/logos-module-builder`](https://github.com/logos-co/logos-module-builder), not this page.
:::

Complete reference for `LogosModule.cmake` functions and options.

## Overview

`LogosModule.cmake` is a CMake module that handles all the boilerplate for building Logos plugins. It provides:

- Automatic SDK and liblogos detection
- Qt6/Qt5 finding and configuration
- Code generation setup
- External library handling
- Platform-specific RPATH configuration
- Install targets

## Including LogosModule.cmake

```cmake
# Method 1: Via environment variable (recommended for nix builds)
include($ENV{LOGOS_MODULE_BUILDER_ROOT}/cmake/LogosModule.cmake)

# Method 2: Local copy
include(cmake/LogosModule.cmake)

# Method 3: Vendor directory
include(vendor/logos-module-builder/cmake/LogosModule.cmake)
```

## logos_module()

The main function to define a Logos module.

### Syntax

```cmake
logos_module(
    NAME <module_name>
    SOURCES <source_files>...
    [REP_FILE <rep_file>]
    [QML_URI <uri>]
    [QML_TYPE_NAME <type_name>]
    [INCLUDE_DIRS <dirs>...]
    [EXTERNAL_LIBS <library_names>...]
    [FIND_PACKAGES <package_names>...]
    [LINK_LIBRARIES <library_names>...]
    [LINK_TARGETS <target_names>...]
    [AUTOGEN_DEPENDS <target_names>...]
)
```

### Parameters

#### NAME (required)
The module name. Used for:
- Output filename: `{NAME}_plugin.so` / `{NAME}_plugin.dylib`
- CMake target name: `{NAME}_module_plugin`

```cmake
logos_module(
    NAME my_module
    ...
)
```

#### SOURCES (required)
List of source files for the module. In the universal authoring model you list
only your impl (or backend) sources — the generated glue is picked up from
`generated_code/` automatically (see below) and must **not** be listed. For a
core module that glue is `{name}_cdylib_glue.{h,cpp}` (the Qt plugin) plus
`{name}_module_impl.cpp` / `{name}_types.h` (the Qt-free C ABI around your impl);
the older `{name}_interface.h` + `{name}_plugin.{h,cpp}` file names are no longer
emitted.

For a core module, this is the impl class:
- `src/{name}_impl.h` - Impl class declaration (public methods = API)
- `src/{name}_impl.cpp` - Impl class implementation

plus any extra helpers you add:

```cmake
logos_module(
    NAME my_module
    SOURCES 
        src/my_module_impl.h
        src/my_module_impl.cpp
        src/helper.cpp
        src/utils.cpp
)
```

> Classic modules used to omit `"interface"` from `metadata.json` and list the
> hand-written `src/{name}_interface.h`, `src/{name}_plugin.h` and
> `src/{name}_plugin.cpp` here. A `core` module that ships a plugin (declares
> `main`) and names no `interface` is now **refused at evaluation** — no glue
> would be generated and every call into it would fail at runtime instead of at
> build time. Use `"universal"`, or `"cdylib"` if you bring your own C ABI.
> Legacy `type: "ui"` widget modules still build this way.

#### REP_FILE (optional)
Path to a `.rep` Qt Remote Objects contract for a universal C++ UI backend
(`"type": "ui_qml"` + `"interface": "universal"`). `repc` is run on it and the
generated source (`rep_<name>_source.h`) is made available to your `*Backend`
class. Pair it with `INCLUDE_DIRS src` so the generated header resolves.

```cmake
logos_module(
    NAME my_ui
    REP_FILE src/my_ui.rep
    SOURCES
        src/my_ui_backend.h
        src/my_ui_backend.cpp
    INCLUDE_DIRS
        src
)
```

#### INCLUDE_DIRS (optional)
Additional include directories added to the plugin target. Commonly `src` for
universal UI backends so the generated `rep_*_source.h` is found.

```cmake
logos_module(
    NAME my_module
    SOURCES ...
    INCLUDE_DIRS
        src
        vendor/include
)
```

#### EXTERNAL_LIBS (optional)
External libraries to link. Libraries are searched in `lib/` directory.

```cmake
logos_module(
    NAME my_module
    SOURCES ...
    EXTERNAL_LIBS
        libfoo
        libbar
)
```

The function will:
1. Search for `lib/libfoo.so` or `lib/libfoo.dylib`
2. Add `lib/` to include directories
3. Link the library
4. Copy the library to the output directory
5. Fix install names on macOS

#### FIND_PACKAGES (optional)
CMake packages to find via `find_package()`.

```cmake
logos_module(
    NAME my_module
    SOURCES ...
    FIND_PACKAGES
        Protobuf
        Threads
        ZLIB
)
```

#### LINK_LIBRARIES (optional)
Additional libraries to link (after find_package).

```cmake
logos_module(
    NAME my_module
    SOURCES ...
    FIND_PACKAGES Threads
    LINK_LIBRARIES
        Threads::Threads
        ${ZLIB_LIBRARIES}
)
```

#### generated_code/ (automatic)
If `generated_code/` exists next to `CMakeLists.txt`, all `*.cpp` and `*.h` files there are added to the plugin target, except `logos_sdk.cpp` and every per-dependency `*_api.cpp` — those are `#include`d by `logos_sdk.cpp` rather than compiled separately. You do not need to list glue or dispatch sources manually. (`core_manager_api.cpp` used to be excluded by name; it is not generated at all any more — a universal module exposes only its declared dependencies, and an app that must manage the core uses liblogos' C API directly.)

#### metadata.json (automatic)
`metadata.json` is copied to `CMAKE_CURRENT_BINARY_DIR` so `Q_PLUGIN_METADATA` can resolve it during the build.

#### Go static archives (CMake cache variable)
When `mkLogosModule` passes `-DLOGOS_MODULE_GO_STATIC_LIBS=name1;name2` (from `go_build: true` entries in `metadata.json`), `LogosModule.cmake` finds `lib/lib<name>.a` under `lib/`, links with whole-archive (Linux) or `-force_load` (macOS), and adds CoreFoundation/Security frameworks on Apple platforms.

#### LINK_TARGETS (optional)
CMake targets to link directly, as opposed to `LINK_LIBRARIES`, which takes
names resolved after `find_package`. Use this for a target you define yourself
in the same `CMakeLists.txt` — e.g. a protobuf library you build. Each target
must already be defined when `logos_module()` runs; an undefined one is a
`FATAL_ERROR` rather than a silently dropped link.

#### AUTOGEN_DEPENDS (optional)
Sets `AUTOGEN_TARGET_DEPENDS` on the plugin target, so AUTOMOC waits for the
named targets. Needed when something in `LINK_TARGETS` generates headers the
plugin's own sources include.

> **`PROTO_FILES` no longer exists.** `logos_module()` used to accept it and run
> `find_package(Protobuf)` + `protoc` for you. It is not among the keywords
> `logos_module()` parses today, so passing it is silently ignored. Compile
> `.proto` files in your own `CMakeLists.txt` (declare `protobuf` under
> `nix.packages.build` and `Protobuf` under `nix.cmake.find_packages`, then add
> the generated sources with `nix.cmake.extra_sources` / `LINK_LIBRARIES`).

## Helper Functions

### logos_find_dependencies()

Find and configure the Logos SDK and logos-module.

```cmake
logos_find_dependencies()
```

Sets variables:
- `LOGOS_MODULE_ROOT` - Path to logos-module (this is the plugin `interface.h`
  root; there is no `LOGOS_LIBLOGOS_ROOT` — the plugin never links liblogos)
- `LOGOS_CPP_SDK_ROOT` - Path to logos-cpp-sdk
- `LOGOS_MODULE_IS_SOURCE` - TRUE if source layout
- `LOGOS_CPP_SDK_IS_SOURCE` - TRUE if source layout
- `LOGOS_QT_HOST_ROOT` - Path the Qt host runtime is taken from
- `LOGOS_QT_HOST_IS_SOURCE` - TRUE if that root is a repo checkout
- `LOGOS_QT_HOST_PACKAGE` / `LOGOS_QT_HOST_TARGET` - the CMake package and
  imported target the plugin links for the host runtime

The Qt host runtime — `LogosAPI`, `LogosAPIProvider`, `LogosProviderBase` and
the legacy `PluginInterface` — lives in **logos-plugin-qt** and ships as the
`logos-qt-host` package. Point `LOGOS_QT_HOST_ROOT` at it (nix builds do).
logos-qt-sdk still forwards the same code, so a build that supplies only
`LOGOS_QT_SDK_ROOT` keeps working, with a message saying it took the legacy
package; a build that supplies neither is a `FATAL_ERROR`. `LOGOS_QT_SDK_ROOT`
stays required regardless — it is where `logos_qt_lp_bridge.h` and
`logos_qt_wire.h` come from.

`logos_ui_plugin_context.h` comes from `LOGOS_VIEW_INCLUDE_DIR`
(logos-view-module), which is placed on the include path AHEAD of
`LOGOS_QT_SDK_ROOT`. That header and the view glue emitter are one matched pair
— the emitted glue calls `maybeUiPluginAboutToUnload()`, which only that header
declares — so both ship from one pin. logos-qt-sdk may still install an older
copy of the same header name; the ordering is what keeps it from being found.

### logos_find_qt()

Find Qt6 (or Qt5 fallback) with required components.

```cmake
logos_find_qt()
```

Sets:
- `QT_VERSION_MAJOR` - 5 or 6

## Environment Variables

### LOGOS_MODULE_BUILDER_ROOT
Path to logos-module-builder. Set automatically by nix builds.

```bash
export LOGOS_MODULE_BUILDER_ROOT=/path/to/logos-module-builder
```

### LOGOS_CPP_SDK_ROOT
Override path to logos-cpp-sdk.

```bash
export LOGOS_CPP_SDK_ROOT=/path/to/logos-cpp-sdk
```

### LOGOS_MODULE_ROOT
Override path to logos-module (source checkout or installed prefix).

```bash
export LOGOS_MODULE_ROOT=/path/to/logos-module
```

### LOGOS_QT_SDK_ROOT
Override path to logos-qt-sdk. Required — see `logos_find_dependencies()` above.

### LOGOS_PROTOCOL_ROOT
Override path to logos-protocol (transports + the `lp_*` C ABI).

### LOGOS_QT_HOST_ROOT
Path to the Qt host runtime — an installed `logos-qt-host` prefix, or a
logos-plugin-qt checkout.

```bash
export LOGOS_QT_HOST_ROOT=/path/to/logos-plugin-qt
```

### LOGOS_VIEW_TEMPLATE_DIR
Directory holding the four `LogosView*.in` templates that `REP_FILE`
instantiates. Required when — and only when — `logos_module()` is given a
`REP_FILE`; `logos_module()` hard-errors rather than guessing.

The templates are owned by **logos-view-module** (`cmake/`), not by this repo,
even though `LogosModule.cmake` is what instantiates them: that repo owns the
whole `ui_qml` authoring flavour (`LogosViewModule.cmake`, the view glue
generator, and the `rep-file-plugin` fixture that instantiates the templates
and proves the built plugin still loads and casts). It is a leaf — its only
input is `logos-nix` — so every consumer can read one copy from it, which is
the property logos-plugin-qt did not have. See
`logos-view-module/cmake/README.md`.

Set automatically by this repo's nix builds and module dev shells —
`lib/mkLogosModule.nix` and `lib/buildCppPlugin.nix` pass both the cache
variable and the environment variable. Also accepted as a CMake cache variable
(`-DLOGOS_VIEW_TEMPLATE_DIR=...`), which takes precedence.

```bash
export LOGOS_VIEW_TEMPLATE_DIR=/path/to/logos-view-module/cmake
```

## Generated Targets

For a module named `my_module`, the following are created:

| Target | Description |
|--------|-------------|
| `my_module_module_plugin` | Main library target |
| `run_cpp_generator_my_module` | Code generation target (source layout) |
| `my_module_replica_factory` | QML replica-factory plugin (only if `REP_FILE`) |

## Output Files

```
build/
└── modules/
    ├── my_module_plugin.so      # or .dylib
    ├── libfoo.so                # external libs copied here
    └── ...
```

## Complete Example

```cmake
cmake_minimum_required(VERSION 3.14)
project(ChatModulePlugin LANGUAGES CXX)

# Include the helper
include($ENV{LOGOS_MODULE_BUILDER_ROOT}/cmake/LogosModule.cmake)

# Define the module (universal model: list only the impl + helpers)
logos_module(
    NAME chat
    SOURCES 
        src/chat_impl.h
        src/chat_impl.cpp
        src/chat_api.cpp
        src/chat_api.h
    FIND_PACKAGES
        Protobuf
        Threads
    LINK_LIBRARIES
        absl::base
        absl::strings
)
```

## Customization

For advanced customization, you can use the helper functions directly:

```cmake
cmake_minimum_required(VERSION 3.14)
project(CustomModulePlugin LANGUAGES CXX)

# Include helpers
include($ENV{LOGOS_MODULE_BUILDER_ROOT}/cmake/LogosModule.cmake)

# Find dependencies manually
logos_find_dependencies()
logos_find_qt()

# Create library manually
add_library(my_plugin SHARED
    my_plugin.cpp
    # ... more sources
)

# Custom configuration
target_compile_definitions(my_plugin PRIVATE MY_CUSTOM_DEFINE)
target_include_directories(my_plugin PRIVATE ${CUSTOM_INCLUDE_DIR})

# Link Qt (required)
target_link_libraries(my_plugin PRIVATE 
    Qt${QT_VERSION_MAJOR}::Core 
    Qt${QT_VERSION_MAJOR}::RemoteObjects
)
```
