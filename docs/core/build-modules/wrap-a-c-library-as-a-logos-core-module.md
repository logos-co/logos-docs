---
title: Wrap a C library as a Logos module
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: iurimatias, kashepavadan
owner: logos
doc_version: 2
slug: wrap-a-c-library-as-a-logos-core-module
sidebar_position: 3
---

# Wrap a C library as a Logos module

#### Expose functions from a C shared library through a Logos core module.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

This procedure walks you through wrapping a C shared library (`.so` on Linux, `.dylib` on macOS) as a Logos [module](../../get-started/glossary.md#module). You write one plain C++ class, with no Qt code and no plugin boilerplate, and `logos-module-builder` generates the Qt plugin around it. By the end, you have a `calc_module` that builds, loads into `logosctl` and answers method calls, and unit tests that run it against a mock of the C library.

For a production example, see [logos-libp2p-module](https://github.com/logos-co/logos-libp2p-module), which wraps the `nim-libp2p` library compiled to a C shared library.

:::info[Prerequisites]

- A supported OS:
   - Linux x86_64 or aarch64
   - macOS arm64 (Apple Silicon)
- Git
- A C compiler (`gcc` or `clang`) to build the C library.
- [`logosctl`](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.3.1) installed.
   - Install it by running `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh | sudo sh`
- **Nix** with flakes enabled.
   - Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

   ```bash
   mkdir -p ~/.config/nix
   echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
   ```
- Basic familiarity with C and C++.
:::

## What to expect

- You can wrap a C library in a Logos module by writing one plain C++ class, and let the build generate the Qt plugin around it.
- You can inspect the built module with `lm` and call its methods from the command line with `logosctl`.
- You can unit-test the module against a link-time mock of the C library, without starting a daemon.

## Step 1: Scaffold the module project

The `with-external-lib` template of `logos-module-builder` provides the `flake.nix`, `metadata.json`, `CMakeLists.txt` and directory layout that a module wrapping a library needs.

1. Create the project directory and initialise it from the template:

   ```bash
   mkdir logos-calc-module && cd logos-calc-module
   nix flake init -t github:logos-co/logos-module-builder/0.3.2#with-external-lib
   ```

   - The template already follows the pure C++ pattern that this procedure uses: one plain class in `src/external_lib_impl.h` and `src/external_lib_impl.cpp`, and `"interface": "universal"` in `metadata.json`.
   - For a module that wraps no external library, use the default template instead: `nix flake init -t github:logos-co/logos-module-builder/0.3.2`.

1. Remove the template's example class. The following steps replace it with the sources of `calc_module`:

   ```bash
   rm -f src/external_lib_impl.h src/external_lib_impl.cpp
   ```

## Step 2: Write the C library

Create the C library that the module wraps, in the `lib/` directory. To wrap an existing library instead, place its pre-built `.so` or `.dylib` and its header file in `lib/` and continue at [Step 3](#step-3-configure-the-logos-module).

1. Create the `lib` directory:

   ```bash
   mkdir -p lib
   ```

1. Create `lib/libcalc.h`:

   ```c
   #ifndef LIBCALC_H
   #define LIBCALC_H

   #ifdef __cplusplus
   extern "C" {
   #endif

   /** Add two integers. */
   int calc_add(int a, int b);

   /** Multiply two integers. */
   int calc_multiply(int a, int b);

   /** Compute factorial of n (n must be >= 0). Returns -1 on error. */
   int calc_factorial(int n);

   /** Compute the nth Fibonacci number (n must be >= 0). Returns -1 on error. */
   int calc_fibonacci(int n);

   /** Return the library version string. Caller must NOT free. */
   const char* calc_version(void);

   #ifdef __cplusplus
   }
   #endif

   #endif /* LIBCALC_H */
   ```

   The `extern "C"` block prevents C++ name mangling, so the module can find the symbols.

1. Create `lib/libcalc.c`:

   ```c
   #include "libcalc.h"

   int calc_add(int a, int b)
   {
       return a + b;
   }

   int calc_multiply(int a, int b)
   {
       return a * b;
   }

   int calc_factorial(int n)
   {
       if (n < 0) return -1;
       if (n <= 1) return 1;
       int result = 1;
       for (int i = 2; i <= n; i++) {
           result *= i;
       }
       return result;
   }

   int calc_fibonacci(int n)
   {
       if (n < 0) return -1;
       if (n == 0) return 0;
       if (n == 1) return 1;
       int a = 0, b = 1;
       for (int i = 2; i <= n; i++) {
           int tmp = a + b;
           a = b;
           b = tmp;
       }
       return b;
   }

   const char* calc_version(void)
   {
       return "1.0.0";
   }
   ```

1. Build the shared library:

   ```bash
   cd lib

   # Linux
   gcc -shared -fPIC -o libcalc.so libcalc.c

   # macOS
   # gcc -shared -fPIC -o libcalc.dylib libcalc.c

   cd ..
   ```

1. Confirm that the symbols are exported:

   ```bash
   # Linux
   nm -D lib/libcalc.so | grep calc

   # macOS
   # nm -gU lib/libcalc.dylib | grep calc
   ```

   Each function is listed with `T` (the text section). Addresses vary, and macOS prefixes each name with `_`:

   ```text
   0000000000001139 T calc_add
   0000000000001179 T calc_factorial
   00000000000011f5 T calc_fibonacci
   0000000000001159 T calc_multiply
   0000000000001299 T calc_version
   ```

## Step 3: Configure the Logos module

With the pure C++ (`universal`) pattern you write a single C++ class. `metadata.json`, `CMakeLists.txt` and `flake.nix` tell the build system the rest, and `logos-cpp-generator` generates the Qt plugin around the class. After this step, the project looks like this:

```text
logos-calc-module/
├── flake.nix          # Nix build configuration (~10 lines)
├── metadata.json      # Module metadata, build settings, and runtime config
├── CMakeLists.txt     # CMake build file
├── lib/
│   ├── libcalc.h      # C library header
│   └── libcalc.c      # C library source (compiled by CMake)
└── src/
    ├── calc_module_impl.h     # Plain C++ class (no Qt, no plugin macros)
    └── calc_module_impl.cpp   # Implementation (wrapping logic)
```

1. Replace `metadata.json` with the following. Set `"interface": "universal"` and declare the library under `nix.external_libraries`:

   ```json
   {
     "name": "calc_module",
     "version": "1.0.0",
     "type": "core",
     "category": "general",
     "description": "Calculator module wrapping libcalc C library",
     "main": "calc_module_plugin",
     "interface": "universal",
     "dependencies": [],

     "nix": {
       "packages": {
         "build": [],
         "runtime": []
       },
       "external_libraries": [
         {
           "name": "calc",
           "vendor_path": "lib"
         }
       ],
       "cmake": {
         "find_packages": [],
         "extra_sources": [],
         "extra_include_dirs": ["lib"],
         "extra_link_libraries": []
       }
     }
   }
   ```

   This file is the single source of truth for the module. It is embedded in the plugin, read by `logos-module-builder` to configure the Nix build, used by CMake to link the external library, and used to write the [LGX](../../get-started/glossary.md#lgx) package manifest.

   | Field | What it does |
   | --- | --- |
   | `name` | Module name. It must be a valid C identifier, because it is used in file names and method calls. |
   | `main` | The name of the generated plugin, `<name>_plugin`. You don't write this file: the build produces `calc_module_plugin.so` or `calc_module_plugin.dylib`. |
   | `interface` | `"universal"` selects the pure C++ pattern. The build parses `src/calc_module_impl.h` into the module's interface contract and generates the Qt plugin from it. |
   | `nix.external_libraries` | The C or C++ libraries the module wraps. `name` is the CMake target and `vendor_path` is the directory that holds the source or binary. The build links each library into the plugin. |
   | `nix.cmake.extra_include_dirs` | Directories added to the include path, so your C++ code can `#include "lib/libcalc.h"`. |

1. Replace `CMakeLists.txt` with the following:

   ```cmake
   cmake_minimum_required(VERSION 3.14)
   project(CalcModulePlugin LANGUAGES CXX)

   # Include the Logos Module CMake helper (provided by logos-module-builder)
   if(DEFINED ENV{LOGOS_MODULE_BUILDER_ROOT})
       include($ENV{LOGOS_MODULE_BUILDER_ROOT}/cmake/LogosModule.cmake)
   elseif(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/cmake/LogosModule.cmake")
       include(cmake/LogosModule.cmake)
   else()
       message(FATAL_ERROR "LogosModule.cmake not found")
   endif()

   # Define the module with its external library dependency.
   # Because metadata.json sets `interface: universal`, the builder runs
   # logos-cpp-generator over src/calc_module_impl.h before configuring,
   # and LogosModule.cmake compiles the generated glue automatically.
   logos_module(
       NAME calc_module
       SOURCES
           src/calc_module_impl.h
           src/calc_module_impl.cpp
       EXTERNAL_LIBS
           calc
   )
   ```

   - List only your own source files under `SOURCES`. `LogosModule.cmake` compiles the generated plugin code automatically.
   - `NAME` must match `name` in `metadata.json`, and `EXTERNAL_LIBS` must match `nix.external_libraries[].name`. If `NAME` differs, the build can succeed and the install phase still fail, because it looks for the plugin file named after `metadata.json`.
   - `logos_module()` finds `libcalc.so` or `libcalc.dylib` in `lib/`, links it to the plugin and sets the RPATH so the plugin finds it at runtime.
   - The `if`/`elseif`/`else` block is boilerplate. Don't change it.

1. Replace `flake.nix` with the following. It pins `logos-module-builder` to the release this procedure was tested with:

   ```nix
   {
     description = "Calculator module - wraps libcalc C library for Logos";

     inputs = {
       logos-module-builder.url = "github:logos-co/logos-module-builder/0.3.2";
     };

     outputs = inputs@{ logos-module-builder, ... }:
       logos-module-builder.lib.mkLogosModule {
         src = ./.;
         configFile = ./metadata.json;
         flakeInputs = inputs;
       };
   }
   ```

   - `mkLogosModule` fetches Qt, the Logos SDK and the code generators, and derives the build from `metadata.json`.
   - To depend on another module, add it as a flake input named after the `name` in that module's `metadata.json`. For example, a dependency on `waku_module` is the input `waku_module.url = "github:logos-co/logos-waku-module"`.
   - To fetch and build the library from source instead of placing it in `lib/`, see [Wrapping a library from a flake input](https://github.com/logos-co/logos-tutorial/blob/master/outputs/tutorial-wrapping-c-library.md#advanced-wrapping-a-library-from-a-flake-input) in the Logos tutorials.

1. Create `src/calc_module_impl.h`. This is the only interface you write, and it is plain C++:

   ```cpp
   #pragma once

   #include <cstdint>
   #include <string>

   #include <logos_module_context.h>  // LogosModuleContext base + `logos_events:`

   // Include the C library header (extern "C" already in the header).
   extern "C" {
       #include "lib/libcalc.h"
   }

   class CalcModuleImpl : public LogosModuleContext {
   public:
       CalcModuleImpl() = default;
       ~CalcModuleImpl() = default;

       // ── Public API — every method here is callable over IPC ──────────
       // The generator maps C++ types onto the contract automatically:
       //   int64_t  ↔ int      std::string ↔ tstr      bool ↔ bool
       //
       // A doc comment directly above a method becomes that method's
       // `description` in the module's method introspection — surfaced
       // by `lm`, `logosctl module show`, and Basecamp's Methods list.
       // Use `///` (one or more lines) or a `/** ... */` block; the
       // comment's line breaks are preserved. (Plain `//` comments like
       // this block are ignored, so they never leak into the API.)

       /// Adds two integers and returns the sum.
       int64_t add(int64_t a, int64_t b);

       /// Multiplies two integers and returns the product.
       int64_t multiply(int64_t a, int64_t b);

       // A multi-line description: consecutive `///` lines keep their breaks.
       /// Computes the factorial n! of a non-negative integer.
       /// Defined as n * (n-1) * ... * 1, with 0! = 1.
       int64_t factorial(int64_t n);

       /// Returns the nth Fibonacci number (0-indexed).
       int64_t fibonacci(int64_t n);

       // A `/** ... */` block comment works too (line breaks preserved).
       /**
        * Returns the version string of the wrapped libcalc C library.
        * Read straight from the linked native library, not metadata.json.
        */
       std::string libVersion();

       /// Looks up the library version and emits it as a `versionReady`
       /// event instead of returning it. Used by the QML tutorial (Part 2).
       void libVersionNotify();

       // ── Events ───────────────────────────────────────────────────────
       // Declared like Qt signals. The generator emits the body (in
       // calc_module_events.cpp) that routes the typed args to subscribers
       // via the host's `eventResponse` mechanism. QML subscribes with
       // logos.onModuleEvent("calc_module", "versionReady").
       //
       // A `///` doc comment documents the event too — it surfaces as the
       // event's `description` alongside methods (`lm events`, `logosctl
       // module show`, and Basecamp's Interface screen).
   logos_events:
       /// Emitted by libVersionNotify() once the library version is known.
       /// Carries the version string read from libcalc.
       void versionReady(const std::string& version);
   };
   ```

   - Every `public` method is callable by other modules and by `logosctl`. `private` members are not exposed.
   - A doc comment directly above a method or event (`///`, or a `/** ... */` block) becomes its description, which `lm`, `logosctl module show` and Basecamp display. Plain `//` comments are ignored.
   - Events are declared in a `logos_events:` section. Inheriting `LogosModuleContext` lets the class emit them and call other modules.
   - Use `int64_t` for integers, not `int`. The code generator reads the header as text and recognises only the types in this table:

   | C++ type | Contract type | A Qt caller sees |
   | --- | --- | --- |
   | `void` | `void` | `void` |
   | `bool` | `bool` | `bool` |
   | `int64_t` | `int` | `qlonglong` |
   | `uint64_t` | `uint` | `qulonglong` |
   | `double` | `float64` | `double` |
   | `std::string` | `tstr` | `QString` |
   | `std::vector<std::string>` | `[tstr]` | `QStringList` |
   | `std::vector<uint8_t>` | `bstr` | `QByteArray` |
   | `LogosMap` / `LogosList` (from `<logos_json.h>`) | `{tstr: any}` / `[any]` | `QVariantMap` / `QVariantList` |
   | `StdLogosResult` | `result` | `LogosResult` (from `<logos_result.h>`) |

   The contract type is what the module publishes about itself, in LIDL, its interface definition language. It is what `lm` prints in [Step 5](#step-5-inspect-the-module), and what a caller in any language binds to. The last column is what a C++ caller built on Qt compiles against.

1. Create `src/calc_module_impl.cpp`. Each method calls the C function, converts the result to a C++ type if needed, and returns it:

   ```cpp
   #include "calc_module_impl.h"

   int64_t CalcModuleImpl::add(int64_t a, int64_t b)
   {
       return calc_add(static_cast<int>(a), static_cast<int>(b));
   }

   int64_t CalcModuleImpl::multiply(int64_t a, int64_t b)
   {
       return calc_multiply(static_cast<int>(a), static_cast<int>(b));
   }

   int64_t CalcModuleImpl::factorial(int64_t n)
   {
       return calc_factorial(static_cast<int>(n));
   }

   int64_t CalcModuleImpl::fibonacci(int64_t n)
   {
       return calc_fibonacci(static_cast<int>(n));
   }

   std::string CalcModuleImpl::libVersion()
   {
       return std::string(calc_version());
   }

   void CalcModuleImpl::libVersionNotify()
   {
       // Emit the event declared in `logos_events:`. When the module is
       // loaded by a host, this reaches every subscriber. When the class
       // is constructed outside a host (e.g. in unit tests), it is a
       // safe no-op.
       versionReady(std::string(calc_version()));
   }
   ```

   You don't write `initLogos`, `Q_INVOKABLE`, `name()`, `version()` or `lidl()`. The code generator produces them from the header and `metadata.json`.

## Step 4: Build the module

1. Create `.gitignore`, so build output stays out of the repository:

   ```text
   # Nix build output
   result
   result-*

   # CMake build directory
   build/
   ```

1. Initialise the Git repository, stage the files and lock the flake inputs:

   ```bash
   git init
   git add -A
   nix flake update
   git add flake.lock
   ```

   - Nix only sees files that Git tracks.

1. Build the plugin library:

   ```bash
   nix build '.#lib'
   ```

   - The first build takes 5 to 15 minutes while Nix downloads Qt, the Logos SDK and their dependencies. Later builds use the Nix cache.
   - Keep the quotes around `'.#lib'`. Some shells, notably zsh, interpret `#` otherwise.

1. Build the full package:

   ```bash
   nix build
   ```

   - This build derives the module's LIDL contract from `src/calc_module_impl.h` and generates the Qt plugin from it before CMake compiles it.

1. Inspect the output:

   ```bash
   ls -la result/lib/
   ```

   The plugin and the C library sit side by side, so the plugin finds the library at runtime through its RPATH:

   ```text
   # Linux
   calc_module_plugin.so   # Your Logos module plugin
   libcalc.so              # The C library (copied alongside)

   # macOS
   calc_module_plugin.dylib
   libcalc.dylib
   ```

## Step 5: Inspect the module

Use the [`lm`](../../get-started/glossary.md#lm) tool from `logos-module` to inspect the compiled plugin.

1. Build `lm`:

   ```bash
   nix build 'github:logos-co/logos-module/0.3.0#lm' --out-link ./lm
   ```

1. View the module's metadata:

   ```bash
   # Linux
   ./lm/bin/lm metadata result/lib/calc_module_plugin.so

   # macOS
   ./lm/bin/lm metadata result/lib/calc_module_plugin.dylib
   ```

   ```text
   Plugin Metadata:
   ================
   Name:         calc_module
   Display name: (unset — falls back to name)
   Version:      1.0.0
   Description:  Calculator module wrapping libcalc C library
   Author:
   Type:         core
   Protocol:     0.9.0
   Dependencies: (none)
   ```

1. List the module's methods:

   ```bash
   # Linux
   ./lm/bin/lm methods result/lib/calc_module_plugin.so

   # macOS
   ./lm/bin/lm methods result/lib/calc_module_plugin.dylib
   ```

   ```text
   Plugin Methods:
   ===============

   int add(int a, int b)
     Signature: add(int,int)
     Invokable: yes
     Description: Adds two integers and returns the sum.

   ...

   int factorial(int n)
     Signature: factorial(int)
     Invokable: yes
     Description:
       Computes the factorial n! of a non-negative integer.
       Defined as n * (n-1) * ... * 1, with 0! = 1.

   ...

   tstr lidl()
     Signature: lidl()
     Invokable: yes
     Description: The module's canonical LIDL interface document.
   ```

   - Signatures use the contract types (`int`, `tstr`), not the C++ types you wrote. In LIDL, `int` is 64-bit, so a value that fits your `int64_t` is never truncated on the way across.
   - Each `Description` is the method's doc comment, with its line breaks kept.
   - `name()`, `version()` and `lidl()` are generated for every module. The last one returns the module's LIDL contract.
   - Add `--json` for output that scripts and CI can parse.

1. List the module's events:

   ```bash
   # Linux
   ./lm/bin/lm events result/lib/calc_module_plugin.so

   # macOS
   ./lm/bin/lm events result/lib/calc_module_plugin.dylib
   ```

   ```text
   Plugin Events:
   ==============

   void versionReady(tstr version)
     Signature: versionReady(tstr)
     Description:
       Emitted by libVersionNotify() once the library version is known.
       Carries the version string read from libcalc.
   ```

   Running `lm` with no subcommand prints the metadata, methods and events together.

## Step 6: Install the module with `logosctl`

`logosctl` installs modules from LGX packages, which carry the plugin, its libraries and a `manifest.json`. Build a portable package, start a daemon in a session of its own and install the package into it.

1. Build the portable LGX package:

   ```bash
   nix build '.#lgx-portable' --out-link result-lgx-portable
   ```

   - Build `lgx-portable`, not `lgx`. The `lgx` output is a development build that keeps its libraries in the Nix store (variant `darwin-arm64-dev` on Apple Silicon, for example), and `logosctl` refuses to install it. See [Troubleshooting](#logosctl-cannot-find-the-module).

1. Point `logosctl` at a session for this project. Run this in every terminal you use for the rest of this procedure:

   ```bash
   export LOGOSCTL_CONFIG_DIR="$PWD/session"
   ```

   - A [session](https://github.com/logos-co/logos-logoscore-cli/blob/master/docs/logosctl.md#sessions) holds its own modules, logs and data, so packages from other projects stay out of it. Without `LOGOSCTL_CONFIG_DIR`, `logosctl` uses `~/.logosctl`.

1. Start the daemon, detached so this terminal stays free:

   ```bash
   logosctl daemon start --detach
   ```

   - The command returns once the daemon accepts commands.

1. Install the package:

   ```bash
   logosctl package install --file ./result-lgx-portable/*.lgx -y
   ```

   - `-y` applies the install without asking for confirmation.

   The plugin, the C library and the manifest unpack into the session's `modules/` directory:

   ```text
   session/modules/calc_module/
   ├── calc_module_plugin.dylib   # (or .so on Linux)
   ├── libcalc.dylib              # (or .so on Linux)
   ├── assets/lidl/               # The module's interface, in LIDL
   ├── manifest.json              # Package manifest
   ├── variant                    # Platform variant identifier
   └── ...                        # Runtime libraries bundled by the portable build
   ```

1. Confirm that the package is installed:

   ```bash
   logosctl package ls
   ```

   `calc_module` is listed with the source `user`, next to the packages embedded in `logosctl`.

## Step 7: Call the module from `logosctl`

1. Load the module:

   ```bash
   logosctl module load calc_module
   ```

1. Inspect the module's methods and events:

   ```bash
   logosctl module show calc_module
   ```

   ```text
   Name:          calc_module
   Version:       v1.0.0
   Status:        loaded
   ...

   Methods:
     add(a: int, b: int) -> int
         Adds two integers and returns the sum.
     multiply(a: int, b: int) -> int
         Multiplies two integers and returns the product.
     factorial(n: int) -> int
         Computes the factorial n! of a non-negative integer.
         Defined as n * (n-1) * ... * 1, with 0! = 1.
     ...

   Events:
     versionReady(version: tstr)
         Emitted by libVersionNotify() once the library version is known.
         Carries the version string read from libcalc.
   ```

   - The descriptions are the doc comments from `src/calc_module_impl.h`, the same ones `lm` showed.

1. Call its methods:

   ```bash
   logosctl call calc_module add 3 5
   logosctl call calc_module factorial 5
   logosctl call calc_module fibonacci 10
   logosctl call calc_module libVersion
   ```

   Each call prints its result:

   ```text
   8
   120
   55
   1.0.0
   ```

   - The daemon writes its log, including the output of every module, to `session/logs/daemon.log`.

1. Stop the daemon:

   ```bash
   logosctl daemon stop
   ```

## Step 8: Unit-test the module

Because the module is a plain C++ class, you can unit-test it directly, with no Qt and no daemon. The [Logos Test Framework](https://github.com/logos-co/logos-test-framework) provides a test runner (`LOGOS_TEST` and `LOGOS_ASSERT_*`) and link-time mocks of your C library, so each test decides what the C functions return and checks how the wrapper behaves.

1. Enable tests in `flake.nix` by adding a `tests` block to the `mkLogosModule` call. `mockCLibs` lists the external libraries to replace with link-time mocks, so the tests don't link the real `libcalc`:

   ```nix
   {
     description = "Calculator module - wraps libcalc C library for Logos";

     inputs = {
       logos-module-builder.url = "github:logos-co/logos-module-builder/0.3.2";
     };

     outputs = inputs@{ logos-module-builder, ... }:
       logos-module-builder.lib.mkLogosModule {
         src = ./.;
         configFile = ./metadata.json;
         flakeInputs = inputs;
         tests = {
           dir = ./tests;
           mockCLibs = [ "calc" ];
         };
       };
   }
   ```

1. Create `tests/CMakeLists.txt`. The test build configures `tests/` as its own CMake project, which calls `logos_test()` from the framework:

   ```cmake
   cmake_minimum_required(VERSION 3.14)
   project(CalcModuleTests LANGUAGES CXX)

   include(LogosTest)

   logos_test(
       NAME calc_module_tests
       MODULE_SOURCES
           ../src/calc_module_impl.cpp
           mocks/calc_module_events_stub.cpp
       TEST_SOURCES
           main.cpp
           test_calc.cpp
       MOCK_C_SOURCES
           mocks/mock_libcalc.cpp
   )
   ```

   - `MODULE_SOURCES`: your implementation, compiled into the test binary, and the events stub from the next action.
   - `TEST_SOURCES`: the runner entry point and your test files.
   - `MOCK_C_SOURCES`: the link-time replacement for `libcalc`.
   - `logos_test()` puts the repository root and `../src` on the include path, so `#include "calc_module_impl.h"` and `#include "lib/libcalc.h"` both resolve.

1. Create `tests/mocks/calc_module_events_stub.cpp`. In a normal build, the code generator writes the body of every method in `logos_events:`. The test build skips that step, so `libVersionNotify()` needs a no-op body for `versionReady` to link:

   ```cpp
   // Stub bodies for the impl's `logos_events:` methods.
   // In the real build the codegen generates calc_module_events.cpp with
   // bodies that route through LogosModuleContext. The test build skips
   // that codegen, so we provide no-op stubs to satisfy the linker.
   #include "calc_module_impl.h"

   void CalcModuleImpl::versionReady(const std::string&) {}
   ```

   - Add a matching no-op line for each event you add to `logos_events:`. A module without events doesn't need this file.

1. Create `tests/main.cpp`, which pulls in the framework's `main()`:

   ```cpp
   #include <logos_test.h>

   LOGOS_TEST_MAIN()
   ```

1. Create `tests/mocks/mock_libcalc.cpp`. Each function has the signature of a `libcalc` function, records the call and returns the value the test set:

   ```cpp
   // Link-time replacement for libcalc. Each function records the call
   // and returns whatever the active test configured via mockCFunction().
   #include <logos_clib_mock.h>

   extern "C" {
       #include "lib/libcalc.h"
   }

   extern "C" int calc_add(int a, int b) {
       LOGOS_CMOCK_RECORD("calc_add");
       return LOGOS_CMOCK_RETURN(int, "calc_add");
   }

   extern "C" int calc_multiply(int a, int b) {
       LOGOS_CMOCK_RECORD("calc_multiply");
       return LOGOS_CMOCK_RETURN(int, "calc_multiply");
   }

   extern "C" int calc_factorial(int n) {
       LOGOS_CMOCK_RECORD("calc_factorial");
       return LOGOS_CMOCK_RETURN(int, "calc_factorial");
   }

   extern "C" int calc_fibonacci(int n) {
       LOGOS_CMOCK_RECORD("calc_fibonacci");
       return LOGOS_CMOCK_RETURN(int, "calc_fibonacci");
   }

   extern "C" const char* calc_version(void) {
       LOGOS_CMOCK_RECORD("calc_version");
       return LOGOS_CMOCK_RETURN_STRING("calc_version");
   }
   ```

1. Create `tests/test_calc.cpp`. Each test constructs `CalcModuleImpl` directly, sets what the C functions return, calls a method and asserts on the result. `LogosTestContext` resets the mocks between tests:

   ```cpp
   #include <logos_test.h>
   #include "calc_module_impl.h"

   LOGOS_TEST(add_forwards_to_calc_add) {
       auto t = LogosTestContext("calc_module");
       t.mockCFunction("calc_add").returns(8);

       CalcModuleImpl calc;
       LOGOS_ASSERT_EQ(calc.add(3, 5), 8);
       LOGOS_ASSERT(t.cFunctionCalled("calc_add"));
   }

   LOGOS_TEST(multiply_forwards_to_calc_multiply) {
       auto t = LogosTestContext("calc_module");
       t.mockCFunction("calc_multiply").returns(42);

       CalcModuleImpl calc;
       LOGOS_ASSERT_EQ(calc.multiply(6, 7), 42);
       LOGOS_ASSERT(t.cFunctionCalled("calc_multiply"));
   }

   LOGOS_TEST(factorial_returns_mocked_value) {
       auto t = LogosTestContext("calc_module");
       t.mockCFunction("calc_factorial").returns(120);

       CalcModuleImpl calc;
       LOGOS_ASSERT_EQ(calc.factorial(5), 120);
   }

   LOGOS_TEST(libVersion_converts_cstring_to_string) {
       auto t = LogosTestContext("calc_module");
       t.mockCFunction("calc_version").returns("1.0.0");

       CalcModuleImpl calc;
       LOGOS_ASSERT_EQ(calc.libVersion(), std::string("1.0.0"));
   }
   ```

   - `<logos_test.h>` also provides `LOGOS_ASSERT_TRUE`, `LOGOS_ASSERT_FALSE`, `LOGOS_ASSERT_NE`, `LOGOS_ASSERT_GT`, `LOGOS_ASSERT_GE` and `LOGOS_ASSERT_LT`.

1. Track the new files, then build and run the tests:

   ```bash
   git add tests/ flake.nix
   nix build '.#unit-tests' -L
   ```

   The build compiles the implementation against the mocks and runs every test. A passing run ends with a summary:

   ```text
   logos-calc_module-tests>    PASS  add_forwards_to_calc_add  0ms
   logos-calc_module-tests>    PASS  multiply_forwards_to_calc_multiply  0ms
   logos-calc_module-tests>    PASS  factorial_returns_mocked_value  0ms
   logos-calc_module-tests>    PASS  libVersion_converts_cstring_to_string  0ms
   logos-calc_module-tests>
   logos-calc_module-tests>  ── Results: 4 passed (0ms) ──────
   ```

   - A failed assertion prints its file and line and fails the build.

## Troubleshooting Logos module wrapping

### A method doesn't appear in `lm` or can't be called

The code generator exposes only `public` methods whose parameter and return types it recognises. Check that the method is in the `public:` section, that it uses only the types in the table in [Step 3](#step-3-configure-the-logos-module) (notably `int64_t`, not `int`, and `std::string`, not `char*` or `QString`), and that each method is declared on its own.

### The build fails with an unknown type or a method the generator can't parse

The generator reads `src/calc_module_impl.h` as text to derive the module's contract. Qt types or unusual templates in a public method signature confuse it. Keep Qt out of the header entirely, and move helpers that need other types into the `private:` section or the `.cpp` file.

### The plugin fails with `Cannot load library`

```text
Cannot load library calc_module_plugin.so: libcalc.so: cannot open shared object file
```

The C library must sit in the same directory as the plugin. The build sets the plugin's RPATH to `$ORIGIN` on Linux and `@loader_path` on macOS, so it looks for libraries in its own directory.

### Events never reach subscribers

Check that the event is declared in a `logos_events:` section and that the class inherits `LogosModuleContext`. Events fire only when a host such as `logosctl` or Basecamp loads the module; constructed directly, as in unit tests, emitting is a no-op. Subscribers must use the exact event name, for example `logos.onModuleEvent("calc_module", "versionReady")`.

### `logosctl` cannot find the module

Check that:

- The module is installed in the current session: `logosctl package ls` lists it with the source `user`. If you opened a new terminal, export `LOGOSCTL_CONFIG_DIR` again.
- The install did not stop at the variant check. `logosctl` installs only the portable variant for its own platform. A package from `.#lgx` fails with `Package does not contain variant for platform: … (package provides: …-dev)`, so build `.#lgx-portable`.
- You load the module by the `name` in `metadata.json` (`calc_module`), not by the package file name.

### `nix build .#lib` does nothing or fails silently

Some shells, notably zsh, treat `#` specially. Put the flake reference in quotes: `nix build '.#lib'`.

### The first build is slow

The first `nix build` downloads Qt 6, the Logos C++ SDK, the code generator and their dependencies. This is a one-time cost; later builds use the Nix cache.

### The build fails with undefined symbols from the C library

Check that the `.so` or `.dylib` is in `lib/` before you build, that the header has `extern "C"` guards, and that the symbols are exported: `nm -D lib/libcalc.so | grep calc` on Linux, or `nm -gU lib/libcalc.dylib | grep calc` on macOS.
