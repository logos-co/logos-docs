---
title: Wrap a C library as a Logos module
doc_type: procedure
product: core
topics: core
steps_layout: sectioned
authors: iurimatias, kashepavadan
owner: logos
doc_version: 1
slug: wrap-a-c-library-as-a-logos-core-module
---

# Wrap a C library as a Logos module

#### Expose functions from a C shared library through a Logos core module.

This tutorial walks you through wrapping a C shared library (`.so` on Linux, `.dylib` on macOS) as a Logos module. By the end, you will have a `calc_module` that compiles, loads, and responds to method calls via `logoscore`. You write one plain C++ class — no Qt, no plugin boilerplate — and the build system generates the Qt plugin around it.

For an example used in production, refer to [logos-lib2p2-module](https://github.com/logos-co/logos-libp2p-module) - a module that wraps the `nim-libp2p` library (compiled to a C shared library).

You need:

- OS: Linux (x86_64 or aarch64) or macOS (x86_64 or aarch64). Tested on Ubuntu 22.04+ and recent macOS.
- RAM: 4 GB minimum, 8 GB recommended.
- Disk: ~2 GB free for the application + installed modules.
- **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

  ```bash
  mkdir -p ~/.config/nix
  echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
  ```

  Verify: `nix flake --help >/dev/null 2>&1 && echo "Flakes enabled"`

- **A C compiler** (gcc or clang) for building the C library. Only needed if you are building the `.so`/`.dylib` yourself rather than using a pre-built library.
- Basic familiarity with C and C++.

## What to expect

- You will write a `calc_module` that exposes arithmetic functions to the Logos platform using the pure C++ (`interface: universal`) pattern.
- You will build, inspect, and call the module with `lm` and `logoscore`, seeing your `int64_t` methods appear as Qt-typed signals.
- You will unit-test the module directly against a link-time mock of the C library.

## Step 1: Scaffold the module project

Before writing any C code, scaffold the Logos module project using the official template. This gives you the correct `flake.nix`, `metadata.json`, directory structure, and build configuration out of the box.

1. Create the project directory and run the module builder template:

    ```bash
   mkdir logos-calc-module && cd logos-calc-module

    # To wrap an external C library
   nix flake init -t github:logos-co/logos-module-builder/tutorial-v3#with-external-lib

   # Or for a plain module (no external library):
   # nix flake init -t github:logos-co/logos-module-builder/tutorial-v3
   ```

   This generates skeleton files (`flake.nix`, `metadata.json`, `CMakeLists.txt`, and a `src/` directory) pre-configured for the `logos-module-builder`. You then customize them for your specific library.

    {% hint style="info" %}
    
    As the time of writing, `nix flake init` scaffolds a hand-written Qt plugin (`*_interface.h` + `*_plugin.h` + `*_plugin.cpp`). This tutorial uses the newer **pure-C++ pattern** instead: you write one plain `*_impl.h` / `*_impl.cpp` class with no Qt, set `"interface": "universal"` in `metadata.json`, and the build generates the Qt plugin wrapper for you. The steps below replace the template's `src/` files entirely. The `nix flake init` command is still used to get the `flake.nix` / `CMakeLists.txt` skeleton and directory layout.
    
    {% endhint %}

1. Remove the template's example sources. The `with-external-lib` template ships an example Qt plugin (`external_lib_*`). Delete those files — this tutorial supplies its own pure-C++ `src/` files:

   ```bash
   rm -f src/external_lib_interface.h src/external_lib_plugin.h src/external_lib_plugin.cpp
   ```

## Step 2: Write the C library

Create the C library that your module will wrap. Place the header and implementation in the `lib/` directory.

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

   The `extern "C"` block is essential — it prevents C++ name mangling so the Logos module can find the symbols.

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

1. Verify the symbols are exported:

   ```bash
   # Linux
   nm -D lib/libcalc.so | grep calc

   # macOS
   # nm -gU lib/libcalc.dylib | grep calc
   ```

   Each symbol should be marked with `T` (text/code section). Addresses will vary:

   ```
   0000000000001139 T calc_add (or _calc_add on macOS)
   0000000000001179 T calc_factorial
   00000000000011f5 T calc_fibonacci
   0000000000001159 T calc_multiply
   0000000000001299 T calc_version
   ```

   {% hint style="info" %}
   
   If you are wrapping an existing library (for example, from a system package or a GitHub repo), you don't need to write the C code — just place the pre-built `.so`/`.dylib` and its header file in `lib/`.
   
   {% endhint %}

## Step 3: Configure the Logos module

Write the files that turn your C library into a Logos module. With the pure-C++ (`universal`) pattern you only hand-write a single C++ class — `metadata.json`, `CMakeLists.txt`, and `flake.nix` tell the build system the rest, and `logos-cpp-generator` synthesizes the Qt plugin wrapper.

After this step, your project will look like this:

```
logos-calc-module/
├── flake.nix          # Nix build configuration (~10 lines)
├── metadata.json      # Module metadata, build settings, and runtime config
├── CMakeLists.txt     # CMake build file
├── lib/
│   ├── libcalc.h      # C library header
│   └── libcalc.c      # C library source (compiled by CMake)
└── src/
    ├── calc_module_impl.h     # Plain C++ class
    └── calc_module_impl.cpp   # Implementation (wrapping logic)
```

1. Create `metadata.json`. Set `name`, `description`, `main`, add `"interface": "universal"`, and declare your library under `nix.external_libraries`. This file is the single source of truth: it is embedded into the generated plugin binary, read by `logos-module-builder` to configure the Nix build, used by CMake to resolve and link external libraries, and used by `nix-bundle-lgx` to generate the LGX manifest.

To fetch and build external libraries from source, add `"build_command": "make shared"` and `"output_pattern": "build/<libname>"` to `"external_libraries"`.

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

   Key fields explained:

   | Field                          | What it does                                                                                                                                                                                                       |
   | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | `name`                         | Module name — must be a valid C identifier (used in filenames, method calls)                                                                                                                                       |
   | `main`                         | The generated plugin's name, `<name>_plugin`. You don't write this file; the builder produces `calc_module_plugin.so` / `.dylib`                                                                                   |
   | `interface`                    | `"universal"` selects the pure-C++ pattern. The builder runs `logos-cpp-generator --from-header` over `src/calc_module_impl.h` and emits the Qt plugin, so you never touch Qt directly                        |
   | `nix.external_libraries`       | Declares C/C++ libraries vendored in the repo. Each entry has a `name` (the CMake target) and `vendor_path` (directory with the source/binary). The build compiles the library and links it into the plugin        |
   | `nix.cmake.extra_include_dirs` | Added to the include path so your C++ code can use `#include "lib/libcalc.h"`                                                                                                                                          |

1. Create `CMakeLists.txt`. Set `project()` name, `NAME`, the `SOURCES` (your two implementation files), and `EXTERNAL_LIBS`. For a universal module you list only your plain C++ source files; the generated glue (`generated_code/*.cpp`) is picked up automatically by `LogosModule.cmake`.

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

   Keep these three fields in sync with `metadata.json`:

   - **`NAME`** — your module name (must match `name` in `metadata.json`, e.g., `calc_module`)
   - **`SOURCES`** — your implementation files (`src/calc_module_impl.h`, `src/calc_module_impl.cpp`)
   - **`EXTERNAL_LIBS`** — external libraries to link (must match `nix.external_libraries[].name` in `metadata.json`)

   The `if/elseif/else` block is boilerplate — don't change it.

1. Create `flake.nix` and change `description`. External libraries can be added in `inputs`, allowing `nix` to fetch and build them from source.

   ```nix
   {
     description = "Calculator module - wraps libcalc C library for Logos";

     inputs = {
       logos-module-builder.url = "github:logos-co/logos-module-builder/tutorial-v3";

       # Fetch the library source (non-flake)
       # libfoo-src = {
       # url = "github:example/libfoo";
       # flake = false;
       # };
     };

     outputs = inputs@{ logos-module-builder, ... }:
       logos-module-builder.lib.mkLogosModule {
         src = ./.;
         configFile = ./metadata.json;
         flakeInputs = inputs;
       };
   }
   ```

   {% hint style="info" %}
   
   When adding module dependencies, the flake input attribute name must match the `name` field in that dependency's `metadata.json`. For example, if you depend on a module whose `metadata.json` has `"name": "waku_module"`, your flake input must be `waku_module.url = "github:logos-co/logos-waku-module"`.
   
   {% endhint %}

1. Create `src/calc_module_impl.h`. This is the only interface you need to write. It allows every `public` method becomes callable by other modules and by `logoscore`. The code generator parses this header as text to derive the wire signatures, so keep it to the supported types (see the table below). Inheriting `LogosModuleContext` lets the class emit events and call other modules without touching the raw `LogosAPI`.

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
       // The generator maps C++ types onto the wire automatically:
       //   int64_t  ↔ int      std::string ↔ QString      bool ↔ bool
       int64_t add(int64_t a, int64_t b);
       int64_t multiply(int64_t a, int64_t b);
       int64_t factorial(int64_t n);
       int64_t fibonacci(int64_t n);
       std::string libVersion();

       // Fire-and-forget: looks up the version, then emits it as an event
       // instead of returning it. Used by the QML tutorial (Part 2).
       void libVersionNotify();

       // ── Events ───────────────────────────────────────────────────────
       // Declared like Qt signals. The generator emits the body (in
       // calc_module_events.cpp) that routes the typed args to subscribers
       // via the host's `eventResponse` mechanism. QML subscribes with
       // logos.onModuleEvent("calc_module", "versionReady").
   logos_events:
       void versionReady(const std::string& version);
   };
   ```

   Supported parameter and return types:

     | C++ type                    | Qt                                                 |
     | --------------------------- | ------------------------------------------------------------------ |
     | `void`                      | `void`                                                             |
     | `bool`                      | `bool`                                                             |
     | `int64_t`                   | `int`                                                              |
     | `uint64_t`                  | `uint`                                                             |
     | `double`                    | `double`                                                           |
     | `std::string`               | `QString`                                                          |
     | `std::vector<std::string>`  | `QStringList`                                                      |
     | `std::vector<uint8_t>`      | `QByteArray`                                                       |
     | `LogosMap` / `LogosList`    | `QVariantMap` / `QVariantList` (from `<logos_json.h>`)             |
     | `StdLogosResult`            | `LogosResult` (from `<logos_result.h>`) — `{ success, value, error }` |

1. Create `src/calc_module_impl.cpp`. Each method calls the corresponding C function and converts the result. No Qt types appear anywhere — you work in plain C++ and the generated glue handles the conversion.

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

   The wrapping pattern is always the same: call the C function (converting `int64_t` → `int` for libcalc's `int` API), convert the C result to a C++ type if needed (for example, `const char*` → `std::string`), and return it.

## Step 4: Build the module

1. Initialize the Git repository. Nix flakes require a git repository. First create a `.gitignore` to exclude build artifacts:

   ```text
   # Nix build output
   result
   result-*

   # CMake build directory
   build/
   ```

   Then initialise the repo and stage all files:

   ```bash
   git init
   git add -A
   
   nix flake update

   git add flake.lock
   ```

1. Build just the plugin library (`.so` / `.dylib`):

   ```bash
   nix build '.#lib'
   ```

   {% hint style="info" %}
   
   The first build takes 5–15 minutes as Nix downloads Qt, the Logos SDK, and other dependencies. Subsequent builds are fast due to caching.
   
   {% endhint %}

1. Build everything - both the library and generated SDK headers. For a `universal` module this is also where `logos-cpp-generator --from-header` runs over `src/calc_module_impl.h` to produce the Qt plugin glue under `generated_code/` before CMake compiles it:

   ```bash
   nix build
   ```

1. Inspect the output:

   ```bash
   ls -la result/lib/
   ```

   You should see two files (extensions depend on your platform):

   ```
   # Linux
   calc_module_plugin.so   # Your Logos module plugin
   libcalc.so              # The C library (copied alongside)

   # macOS
   calc_module_plugin.dylib
   libcalc.dylib
   ```

   Both library files are placed together so the plugin can find the C library at runtime via RPATH.

## Step 5: Inspect the module

Use the `lm` CLI tool (from `logos-module`) to inspect the compiled module binary.

1. Build the `lm` tool:

   ```bash
   nix build 'github:logos-co/logos-module/tutorial-v3#lm' --out-link ./lm
   ```

1. View metadata:

   ```bash
   # Linux
   ./lm/bin/lm metadata result/lib/calc_module_plugin.so

   # macOS
   ./lm/bin/lm metadata result/lib/calc_module_plugin.dylib
   ```

   Expected output:

   ```
   Plugin Metadata:
   ================
   Name:         calc_module
   Version:      1.0.0
   Description:  Calculator module wrapping libcalc C library
   Author:
   Type:         core
   Dependencies: (none)
   ```

1. List methods:

   ```bash
   # Linux
   ./lm/bin/lm methods result/lib/calc_module_plugin.so

   # macOS
   ./lm/bin/lm methods result/lib/calc_module_plugin.dylib

   # Add --json for scripting and CI

   # Linux
   ./lm/bin/lm methods result/lib/calc_module_plugin.so --json

   # macOS
   ./lm/bin/lm methods result/lib/calc_module_plugin.dylib --json
   ```

   Expected output:

   ```
   Plugin Methods:
   ===============

   int add(int a, int b)
     Signature: add(int,int)
     Invokable: yes

    ...
   ```

   Expected output with `--json`:

   ```json
   [
       {
           "isInvokable": true,
           "name": "add",
           "parameters": [
               { "name": "a", "type": "int" },
               { "name": "b", "type": "int" }
           ],
           "returnType": "int",
           "signature": "add(int,int)"
       },
       ...
   ]
   ```

## Step 6: Test with logoscore

1. Build logoscore:

   ```bash
   nix build 'github:logos-co/logos-logoscore-cli/tutorial-v3' --out-link ./logos
   ```

1. Set up the modules directory. `logoscore` expects modules in subdirectories, each with a `manifest.json`. Use the Nix derivation to create an LGX package and install it with the package manager:

   ```bash
   nix build '.#lgx'
   nix build 'github:logos-co/logos-package-manager/tutorial-v3#cli' --out-link ./pm
   
   mkdir -p modules
   
   ./pm/bin/lgpm --modules-dir ./modules install --file result/*.lgx
   ```

   This extracts the plugin, external libraries, and manifest into the correct directory structure:

   ```
   modules/calc_module/
   ├── calc_module_plugin.dylib   # (or .so on Linux)
   ├── libcalc.dylib              # (or .so on Linux)
   ├── manifest.json              # Auto-generated by lgx
   └── variant                    # Platform variant identifier
   ```

1. Start the daemon and call methods:

   ```bash
   ./logos/bin/logoscore -D -m ./modules &
   sleep 3

   ./logos/bin/logoscore load-module calc_module
   
   ./logos/bin/logoscore call calc_module add 3 5
   ./logos/bin/logoscore call calc_module factorial 5
   ./logos/bin/logoscore call calc_module fibonacci 10
   ./logos/bin/logoscore call calc_module libVersion

   ./logos/bin/logoscore stop
   ```

## Step 7: Unit-test the module

Because your module is a plain C++ class, you can unit-test it directly. The [Logos Test Framework](https://github.com/logos-co/logos-test-framework) adds a tiny test runner (`LOGOS_TEST` and `LOGOS_ASSERT_*`) and link-time mocking of your C library, so each test can make functions return whatever you want and allows you to assert how your wrapper should behave.

1. Enable tests in `flake.nix`. Add a `tests` block to the `mkLogosModule` call. `mockCLibs` lists the external libraries to replace with link-time mocks:

   ```nix
   {
     description = "Calculator module - wraps libcalc C library for Logos";

     inputs = {
       logos-module-builder.url = "github:logos-co/logos-module-builder/tutorial-v3";
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

1. Create `tests/CMakeLists.txt`. The test harness configures and builds `tests/` as its own CMake project. It includes `LogosTest` (provided by the framework) and calls `logos_test()`, listing your impl source (`MODULE_SOURCES`), the test sources (`TEST_SOURCES`), and the C-library mock (`MOCK_C_SOURCES`):

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

   `logos_test()` automatically puts the repo root and `../src` on the include path, so `#include "calc_module_impl.h"` and `#include "lib/libcalc.h"` both resolve.

1. Create `tests/mocks/calc_module_events_stub.cpp`. In a normal build, `logos-cpp-generator` emits `calc_module_events.cpp` containing the body of every `logos_events:` method. The test harness runs the generator in a reduced mode that does not emit that file, so `libVersionNotify()` would fail to link. Provide a no-op stub:

   ```cpp
   // Stub bodies for the impl's `logos_events:` methods.
   // In the real build the codegen generates calc_module_events.cpp with
   // bodies that route through LogosModuleContext. The test build skips
   // that codegen, so we provide no-op stubs to satisfy the linker.
   #include "calc_module_impl.h"

   void CalcModuleImpl::versionReady(const std::string&) {}
   ```

   If you add more events to `logos_events:`, add a matching no-op line here. A module with no events does not need this stub.

1. Create `tests/main.cpp`:

   ```cpp
   #include <logos_test.h>

   LOGOS_TEST_MAIN()
   ```

1. Create `tests/mocks/mock_libcalc.cpp`. When building tests, the real `libcalc` is not linked. Instead you provide functions with the same signatures backed by the framework's mock store:

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

1. Create `tests/test_calc.cpp`. Each `LOGOS_TEST` constructs your impl directly, configures the C-function return values, calls a method, and asserts. `LogosTestContext` resets the mock store between tests:

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

   `LOGOS_ASSERT_EQ`, `LOGOS_ASSERT`, `LOGOS_ASSERT_TRUE/FALSE`, and `LOGOS_ASSERT_NE/GT/GE/LT` are all available from `<logos_test.h>`.

1. Track the new files (Nix only sees git-tracked files), then build and run:

   ```bash
   git add tests/ flake.nix
   nix build '.#unit-tests' -L
   ```

   The build compiles your impl against the mock library and the test sources, then runs every `LOGOS_TEST`. A passing run ends with a summary line; a failed assertion prints the file/line and fails the build.

## Troubleshooting Logos module wrapping

### A method doesn't appear in `lm` or can't be called

The generator only exposes `public` methods whose parameter and return types it recognizes. Check that the method is in the `public:` section, that all types are supported (notably `int64_t` not `int`, `std::string` not `char*` or `QString`), and that each signature is on one line.

### Build error: unknown type or generator can't parse a method

The `--from-header` parser reads `*_impl.h` as text. Pulling Qt types or unusual templates into a public method signature will confuse it. Keep Qt out of the impl header entirely and move helpers that need exotic types into the `private:` section or the `.cpp`.

### "Cannot load library"

Ensure `libcalc.so` / `libcalc.dylib` is in the same directory as the plugin. The build system sets RPATH to `$ORIGIN` (Linux) or `@loader_path` (macOS) so the plugin looks for libraries in its own directory.

### Events never reach subscribers

Check that the event is declared in a `logos_events:` section and that the class inherits `LogosModuleContext`. Events only fire when the module is loaded by a host; constructed standalone (for example in unit tests), emission is a safe no-op. The subscriber must use the exact event name string, for example `logos.onModuleEvent("calc_module", "versionReady")`.

### Plugin not discovered by logoscore

Verify that the module is in a subdirectory of the modules dir (for example `modules/calc_module/`), that the subdirectory contains a `manifest.json` with a valid `main` object, and that the platform key in `main` matches your OS/arch (for example `linux-aarch64`, `darwin-arm64`).

### `nix build .#lib` does nothing or fails silently

Some shells (notably zsh) treat `#` as a comment character. Always put the flake reference in quotes, like so: `nix build '.#lib'`.

### First build is slow

The first `nix build` downloads Qt 6, the Logos C++ SDK, the code generator, and other dependencies. This is a one-time cost — subsequent builds use the Nix cache and are fast (usually under 30 seconds).

### Symbol not found errors

If you get "undefined symbol" errors for your C library functions, verify that the `.so`/`.dylib` is in `lib/` before building, that the header has `extern "C"` guards, and that the symbols are exported: `nm -D lib/libcalc.so | grep calc`.
