---
title: Building Modules for Logos Core (LEZ)
doc_type: 
product: logos-core
topics:
authors: 
owner: logos
doc_version: 1
slug: 
---

# Building Modules for Logos Core (LEZ)

A practical guide to building LEZ programs and Logos Core plugins, based on real experience building `lez-registry` and `lez-multisig`.

**Target audience:** Developers familiar with Rust but new to Logos Core / LEZ.

**What you'll build:** A complete module — from Rust program logic, through C FFI bindings, to a Qt/QML plugin that loads in Logos Core.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Part 1: Building a LEZ Program (Rust)](#part-1-building-a-lez-program-rust)
3. [Part 2: FFI Layer](#part-2-ffi-layer)
4. [Part 3: Qt Module (Plugin)](#part-3-qt-module-plugin)
5. [Part 4: Registration & Installation](#part-4-registration--installation)
6. [Part 5: Common Hurdles & Tips](#part-5-common-hurdles--tips)

---

## Architecture Overview

A Logos Core module has three layers:

```
┌─────────────────────────────┐
│   Logos Core (Qt/QML app)   │  ← User-facing desktop app
│   └── Your Qt Plugin        │  ← C++ plugin + QML views
├─────────────────────────────┤
│   C FFI (.so / .dylib)      │  ← Rust → C bindings (cbindgen)
├─────────────────────────────┤
│   LEZ Program (Rust)        │  ← Core logic, runs in risc0 zkVM
│   ├── core lib              │
│   ├── program (handlers)    │
│   └── methods/guest (zkVM)  │
└─────────────────────────────┘
```

**Terminology:**
- **LEZ** — Logos Execution Zone (the execution environment)
- **LSSA/NSSA** — Legacy names you'll see in upstream crate names (`nssa_core`, `nssa`). These haven't been renamed yet.
- **risc0** — Zero-knowledge VM that executes LEZ programs

---

## Part 1: Building a LEZ Program (Rust)

### Project Structure

Follow this layout (based on `lez-multisig`):

```
my-lez-program/
├── Cargo.toml              # workspace root
├── my_core/                # shared types, instructions, PDA helpers
│   ├── Cargo.toml
│   └── src/lib.rs
├── my_program/             # on-chain handlers
│   ├── Cargo.toml
│   └── src/lib.rs
├── methods/                # risc0 zkVM guest build
│   └── guest/
│       ├── Cargo.toml
│       └── src/bin/my_program.rs
└── cli/                    # optional: standalone CLI
    ├── Cargo.toml
    └── src/main.rs
```

**Workspace `Cargo.toml`:**

```toml
[workspace]
members = ["my_core", "my_program", "methods/guest", "cli"]
resolver = "2"

[workspace.dependencies]
nssa_core = { git = "https://github.com/logos-blockchain/lssa", branch = "main" }
nssa = { git = "https://github.com/logos-blockchain/lssa", branch = "main" }
risc0-zkvm = { version = "=3.0.5", features = ["std"] }
risc0-build = "=3.0.5"
borsh = "1.5.7"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### Key Types from `nssa_core`

These are the building blocks you'll use constantly:

```rust
use nssa_core::{
    AccountWithMetadata,  // Input: { account, is_authorized, account_id }
    AccountPostState,     // Output: new or modified account state
    ProgramId,            // [u32; 8] — risc0 image ID identifying your program
    AccountId,            // [u8; 32] — 32-byte account identifier (base58 display)
    PdaSeed,              // [u8; 32] — seed for PDA (Program Derived Address)
};
```

**PDA derivation** (deterministic account addresses):

```rust
// Derive an account address from program ID + seed
let seed = PdaSeed::new([/* 32 bytes */]);
let pda_account_id = AccountId::from((&program_id, &seed));
```

### Writing Core Logic (`my_core/`)

Define your instructions and state:

```rust
// my_core/src/lib.rs
use serde::{Deserialize, Serialize};

/// Instructions your program can handle
#[derive(Serialize, Deserialize, Debug)]
pub enum MyInstruction {
    Initialize { name: String },
    UpdateEntry { key: String, value: String },
    DeleteEntry { key: String },
}

/// On-chain state for your program
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct MyState {
    pub owner: [u8; 32],
    pub entries: Vec<Entry>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Entry {
    pub key: String,
    pub value: String,
}

/// PDA helper — derive the state account address
pub fn state_pda(program_id: &nssa_core::ProgramId, name: &str) -> nssa_core::AccountId {
    let mut seed_bytes = [0u8; 32];
    let name_bytes = name.as_bytes();
    let len = name_bytes.len().min(32);
    seed_bytes[..len].copy_from_slice(&name_bytes[..len]);
    let seed = nssa_core::PdaSeed::new(seed_bytes);
    nssa_core::AccountId::from((program_id, &seed))
}
```

### Writing Program Handlers (`my_program/`)

The program processes transactions inside the zkVM:

```rust
// my_program/src/lib.rs
use nssa_core::{AccountWithMetadata, AccountPostState};
use my_core::{MyInstruction, MyState};

/// Main program entry point — called by the zkVM guest
pub fn process(
    instruction_data: &[u8],
    accounts: &[AccountWithMetadata],
) -> Vec<AccountPostState> {
    let instruction: MyInstruction = serde_json::from_slice(instruction_data)
        .expect("Invalid instruction");

    match instruction {
        MyInstruction::Initialize { name } => handle_initialize(&name, accounts),
        MyInstruction::UpdateEntry { key, value } => handle_update(&key, &value, accounts),
        MyInstruction::DeleteEntry { key } => handle_delete(&key, accounts),
    }
}

fn handle_initialize(
    name: &str,
    accounts: &[AccountWithMetadata],
) -> Vec<AccountPostState> {
    // accounts[0] = the state PDA (should be empty/unclaimed)
    // accounts[1] = the owner/initializer (must be authorized)
    assert!(accounts.len() >= 2, "Expected at least 2 accounts");
    assert!(accounts[1].is_authorized, "Owner must be authorized");

    let state = MyState {
        owner: accounts[1].account_id.0,
        entries: vec![],
    };

    let state_bytes: Vec<u8> = serde_json::to_vec(&state).unwrap();
    let mut account = accounts[0].account.clone();
    account.data = state_bytes.try_into().unwrap();

    // new_claimed = this program now owns this account
    vec![AccountPostState::new_claimed(account)]
}

fn handle_update(
    key: &str,
    value: &str,
    accounts: &[AccountWithMetadata],
) -> Vec<AccountPostState> {
    assert!(accounts[1].is_authorized, "Must be authorized");

    // Deserialize current state
    let data: Vec<u8> = accounts[0].account.data.clone().try_into().unwrap();
    let mut state: MyState = serde_json::from_slice(&data).unwrap();

    // Verify caller is owner
    assert_eq!(state.owner, accounts[1].account_id.0, "Not owner");

    // Update or insert
    if let Some(entry) = state.entries.iter_mut().find(|e| e.key == key) {
        entry.value = value.to_string();
    } else {
        state.entries.push(my_core::Entry {
            key: key.to_string(),
            value: value.to_string(),
        });
    }

    let state_bytes: Vec<u8> = serde_json::to_vec(&state).unwrap();
    let mut account = accounts[0].account.clone();
    account.data = state_bytes.try_into().unwrap();

    vec![AccountPostState::new(account)]
}

fn handle_delete(key: &str, accounts: &[AccountWithMetadata]) -> Vec<AccountPostState> {
    // Similar pattern: deserialize, verify auth, modify, serialize, return
    todo!()
}
```

### zkVM Guest Binary (`methods/guest/`)

This tiny binary is what actually runs inside risc0:

```rust
// methods/guest/src/bin/my_program.rs
#![no_main]

risc0_zkvm::guest::entry!(main);

fn main() {
    // Read inputs from the zkVM host
    let instruction_data: Vec<u8> = risc0_zkvm::guest::env::read();
    let accounts: Vec<nssa_core::AccountWithMetadata> = risc0_zkvm::guest::env::read();

    // Process
    let results = my_program::process(&instruction_data, &accounts);

    // Commit results back to the host
    risc0_zkvm::guest::env::commit(&results);
}
```

### Building & Testing

```bash
# Check core and program compile (no special deps needed)
cargo check -p my_core -p my_program

# Run unit tests
cargo test -p my_program

# Build the zkVM guest (needs risc0 toolchain)
cargo risczero build --manifest-path methods/guest/Cargo.toml
# Output: target/riscv32im-risc0-zkvm-elf/docker/my_program.bin
```

**Install risc0 toolchain:**
```bash
cargo install cargo-risczero
cargo risczero install
```

---

## Part 2: FFI Layer

The FFI layer exposes your Rust program logic to C/C++ (and therefore to Qt).

### Creating FFI Bindings

Add an `ffi` module or separate crate:

```rust
// src/ffi.rs (or ffi/src/lib.rs)
use std::ffi::{CStr, CString};
use std::os::raw::c_char;

/// List all entries — returns JSON string. Caller must free with free_string().
#[no_mangle]
pub extern "C" fn my_program_list_entries(input_json: *const c_char) -> *mut c_char {
    let result = std::panic::catch_unwind(|| {
        let input = unsafe { CStr::from_ptr(input_json) }
            .to_str()
            .unwrap_or("{}");

        // Your logic here — query state, build response
        let entries = vec![
            serde_json::json!({"key": "example", "value": "hello"}),
        ];

        serde_json::to_string(&entries).unwrap_or_else(|e| {
            format!(r#"{{"error": "{}"}}"#, e)
        })
    });

    let response = result.unwrap_or_else(|_| r#"{"error": "panic"}"#.to_string());
    CString::new(response).unwrap().into_raw()
}

/// Get the IDL (Interface Description Language) for dynamic form generation
#[no_mangle]
pub extern "C" fn my_program_get_idl() -> *mut c_char {
    let idl = serde_json::json!({
        "instructions": [
            {
                "name": "Initialize",
                "fields": [
                    {"name": "name", "type": "string", "required": true}
                ]
            },
            {
                "name": "UpdateEntry",
                "fields": [
                    {"name": "key", "type": "string", "required": true},
                    {"name": "value", "type": "string", "required": true}
                ]
            }
        ]
    });
    CString::new(idl.to_string()).unwrap().into_raw()
}

/// Returns the version string
#[no_mangle]
pub extern "C" fn my_program_version() -> *mut c_char {
    CString::new(env!("CARGO_PKG_VERSION")).unwrap().into_raw()
}

/// Free a string allocated by this library. MUST be called by the consumer.
#[no_mangle]
pub extern "C" fn my_program_free_string(s: *mut c_char) {
    if !s.is_null() {
        unsafe { drop(CString::from_raw(s)); }
    }
}
```

**Key patterns:**
1. **All functions return `*mut c_char`** (JSON strings)
2. **All inputs are `*const c_char`** (JSON strings)
3. **Always provide `free_string()`** — the caller must free returned strings
4. **Catch panics** — `catch_unwind` prevents Rust panics from unwinding into C++
5. **Error handling via JSON** — return `{"error": "..."}` instead of crashing

### Cargo.toml for FFI

```toml
[lib]
name = "my_program"
crate-type = ["cdylib"]  # produces .so / .dylib

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### Generating C Headers

```bash
# Install cbindgen
cargo install cbindgen

# Generate header
cbindgen src/ffi.rs -l c > include/my_program.h
```

This produces:

```c
// include/my_program.h
char *my_program_list_entries(const char *input_json);
char *my_program_get_idl(void);
char *my_program_version(void);
void my_program_free_string(char *s);
```

### IDL for Dynamic UI Forms

The IDL (returned by `get_idl()`) lets the Qt module generate forms automatically:

```json
{
  "instructions": [
    {
      "name": "UpdateEntry",
      "fields": [
        { "name": "key", "type": "string", "required": true },
        { "name": "value", "type": "string", "required": true }
      ]
    }
  ]
}
```

If you use `lez-framework`, the `generate_idl!` macro can auto-generate this from your Rust structs.

### Build

```bash
cargo build --release
# Output: target/release/libmy_program.so (Linux) or .dylib (macOS)
```

---

## Part 3: Qt Module (Plugin)

### Cookie-Cutter from Registry

The fastest way to start: clone `logos-lez-registry-module` and adapt it.

```bash
git clone https://github.com/logos-blockchain/logos-lez-registry-module
cp -r logos-lez-registry-module my-lez-module
cd my-lez-module

# Rename everything: "registry" → "my_program", "Registry" → "MyProgram"
find . -type f -exec sed -i 's/registry/my_program/g; s/Registry/MyProgram/g' {} +
```

### Module Structure

```
my-lez-module/
├── CMakeLists.txt                  # Build config
├── my_program_module.json          # Module metadata
├── src/
│   ├── my_program_plugin.cpp       # Qt plugin entry point
│   ├── MyProgramBridge.h           # QML ↔ FFI bridge
│   ├── MyProgramBridge.cpp
│   └── initLogos.cpp               # Logos SDK init
├── qml/
│   ├── MyProgramView.qml           # Main view
│   ├── EntryCard.qml               # List item
│   └── CreateEntryForm.qml         # Form view
├── include/
│   └── my_program.h                # Generated C header
└── flake.nix                       # Nix build
```

### The Bridge Pattern (C++ ↔ QML ↔ FFI)

`MyProgramBridge` is a `QObject` that QML can call, which delegates to your Rust FFI:

```cpp
// src/MyProgramBridge.h
#pragma once
#include <QObject>
#include <QString>

extern "C" {
    char* my_program_list_entries(const char* input_json);
    char* my_program_get_idl();
    char* my_program_version();
    void my_program_free_string(char* s);
}

class MyProgramBridge : public QObject {
    Q_OBJECT
public:
    explicit MyProgramBridge(QObject* parent = nullptr);

    Q_INVOKABLE QString listEntries(const QString& inputJson);
    Q_INVOKABLE QString getIdl();
    Q_INVOKABLE QString version();
};
```

```cpp
// src/MyProgramBridge.cpp
#include "MyProgramBridge.h"

MyProgramBridge::MyProgramBridge(QObject* parent) : QObject(parent) {}

QString MyProgramBridge::listEntries(const QString& inputJson) {
    char* result = my_program_list_entries(inputJson.toUtf8().constData());
    QString response = QString::fromUtf8(result);
    my_program_free_string(result);
    return response;
}

QString MyProgramBridge::getIdl() {
    char* result = my_program_get_idl();
    QString response = QString::fromUtf8(result);
    my_program_free_string(result);
    return response;
}

QString MyProgramBridge::version() {
    char* result = my_program_version();
    QString response = QString::fromUtf8(result);
    my_program_free_string(result);
    return response;
}
```

### QML Views with Logos Design System

```qml
// qml/MyProgramView.qml
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import Logos.Theme 1.0
import Logos.Controls 1.0

Item {
    id: root

    property var bridge  // Injected MyProgramBridge instance

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: Logos.Theme.spacing.medium

        Text {
            text: "My LEZ Program"
            font: Logos.Theme.fonts.heading
            color: Logos.Theme.colors.text
        }

        ListView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            model: ListModel { id: entriesModel }

            delegate: EntryCard {
                width: parent.width
                entryKey: model.key
                entryValue: model.value
            }
        }

        Logos.Button {
            text: "Refresh"
            onClicked: loadEntries()
        }
    }

    Component.onCompleted: loadEntries()

    function loadEntries() {
        var json = bridge.listEntries("{}");
        var entries = JSON.parse(json);
        entriesModel.clear();
        for (var i = 0; i < entries.length; i++) {
            entriesModel.append(entries[i]);
        }
    }
}
```

**Key design tokens:**
- Colors: `Logos.Theme.colors.text`, `Logos.Theme.colors.background`, `Logos.Theme.colors.accent`
- Fonts: `Logos.Theme.fonts.heading`, `Logos.Theme.fonts.body`
- Spacing: `Logos.Theme.spacing.small`, `.medium`, `.large`
- Actual accent color: `#FF8800` (orange), background: `#171717` (dark)

### Module Metadata

```json
// my_program_module.json
{
    "name": "LEZ My Program",
    "version": "0.1.0",
    "description": "My custom LEZ program module",
    "author": "Your Name",
    "dependencies": ["logos-execution-zone-module"]
}
```

### CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.16)
project(lez_my_program_module LANGUAGES CXX)

find_package(Qt6 REQUIRED COMPONENTS Core Quick Qml)

qt_add_qml_module(lez_my_program_module
    URI LezMyProgram
    VERSION 1.0
    QML_FILES
        qml/MyProgramView.qml
        qml/EntryCard.qml
        qml/CreateEntryForm.qml
    SOURCES
        src/my_program_plugin.cpp
        src/MyProgramBridge.cpp
        src/MyProgramBridge.h
)

target_include_directories(lez_my_program_module PRIVATE include)
target_link_libraries(lez_my_program_module PRIVATE
    Qt6::Core Qt6::Quick Qt6::Qml
    ${CMAKE_CURRENT_SOURCE_DIR}/lib/libmy_program.so
)
```

---

## Part 4: Registration & Installation

### Local Install

Register your module with `logos_host`:

```bash
# Copy the shared library where logos_host can find it
cp target/release/libmy_program.so ~/.local/lib/logos/modules/

# Copy the Qt plugin
cp build/liblez_my_program_module.so ~/.local/lib/logos/plugins/
```

### Nix Build (Recommended)

The build produces three things, each with its own Nix flake:

1. **FFI library** (Rust → C shared library) — built with [crane](https://crane.dev/)
2. **Qt module plugin** (C++ `.so` that Logos Core loads) — built with CMake
3. **Standalone app** (logoscore + logos_host + your module bundled) — built with CMake

#### Architecture

```
my-lez-program/
├── my_program_ffi/
│   └── flake.nix          # 1. Crane-based FFI build (Rust → .so + .h)
├── module/
│   ├── CMakeLists.txt     # Qt module build config
│   └── ...
├── nix/
│   ├── default.nix        # Common CMake settings (Qt6, SDK paths)
│   ├── lib.nix            # 2. Builds the Qt module plugin .so
│   └── app.nix            # 3. Builds standalone app with logoscore
└── flake.nix              # Root flake — imports everything, outputs .lib and .app
```

#### Step 1: FFI Flake (my_program_ffi/flake.nix)

Uses [crane](https://crane.dev/) instead of `buildRustPackage` — crane handles git dependencies
(like `nssa_core`) from `Cargo.lock` automatically, no manual `outputHashes` needed.

```nix
# my_program_ffi/flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    crane.url = "github:ipetkov/crane";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, crane, rust-overlay, ... }:
    let
      # Support multiple systems
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAll = nixpkgs.lib.genAttrs systems;
    in {
      packages = forAll (system:
        let
          pkgs = import nixpkgs {
            inherit system;
            overlays = [ (import rust-overlay) ];
          };
          craneLib = (crane.mkLib pkgs).overrideToolchain
            (pkgs.rust-bin.stable.latest.default.override {
              extensions = [ "rust-src" ];
            });
          src = craneLib.cleanCargoSource ./..;  # workspace root
          commonArgs = {
            inherit src;
            pname = "my-program-ffi";
            version = "0.1.0";
            cargoExtraArgs = "-p my_program_ffi";
            nativeBuildInputs = with pkgs; [ pkg-config protobuf ];
            buildInputs = with pkgs; [ openssl ];
            RISC0_SKIP_BUILD = "1";
          };
          cargoArtifacts = craneLib.buildDepsOnly commonArgs;
        in {
          default = craneLib.buildPackage (commonArgs // {
            inherit cargoArtifacts;
            postInstall = ''
              mkdir -p $out/lib $out/include
              find target -name "libmy_program_ffi.so" | head -1 | xargs -I{} cp {} $out/lib/
              cp my_program_ffi/include/*.h $out/include/ 2>/dev/null || true
            '';
          });
        }
      );
    };
}
```

#### Step 2: Root Flake (flake.nix)

The root flake imports the Logos Core ecosystem and your FFI library, then builds the Qt module and app:

```nix
# flake.nix
{
  inputs = {
    nixpkgs.follows = "logos-liblogos/nixpkgs";

    # Logos Core ecosystem
    logos-liblogos.url = "github:logos-co/logos-liblogos";
    logos-cpp-sdk.url = "github:logos-co/logos-cpp-sdk";
    logos-capability-module.url = "github:logos-co/logos-capability-module";

    # Your FFI library (points to the sub-flake)
    my-program-ffi.url = "path:./my_program_ffi";
    # Or from GitHub: my-program-ffi.url = "github:you/my-program?dir=my_program_ffi";
  };

  outputs = { self, nixpkgs, logos-liblogos, logos-cpp-sdk,
              logos-capability-module, my-program-ffi, ... }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAll = nixpkgs.lib.genAttrs systems;
    in {
      packages = forAll (system:
        let
          pkgs = import nixpkgs { inherit system; };
          logosSdk = logos-cpp-sdk.packages.${system}.default;
          logosLiblogos = logos-liblogos.packages.${system}.default;
          logosCapModule = logos-capability-module.packages.${system}.default;
          myFfi = my-program-ffi.packages.${system}.default;

          common = import ./nix/default.nix { inherit pkgs logosSdk logosLiblogos; };

          lib = import ./nix/lib.nix {
            inherit pkgs common logosSdk logosLiblogos myFfi;
            src = ./.;
          };

          app = import ./nix/app.nix {
            inherit pkgs common logosLiblogos logosSdk logosCapModule myFfi;
            src = ./.;
            myModule = lib;
          };
        in {
          inherit lib app;
          default = lib;
        }
      );
    };
}
```

#### Step 3: Nix helper files

**`nix/default.nix`** — common CMake settings shared by lib and app:

```nix
# nix/default.nix
{ pkgs, logosSdk, logosLiblogos }:
{
  version = "0.1.0";
  pname = "my-program-module";

  nativeBuildInputs = with pkgs; [ cmake ninja pkg-config ];

  buildInputs = with pkgs; [
    qt6.qtbase qt6.qtdeclarative qt6.qtremoteobjects
    zstd krb5 abseil-cpp
  ];

  cmakeFlags = [ "-GNinja" "-DCMAKE_BUILD_TYPE=Release" ];
}
```

**`nix/lib.nix`** — builds the Qt module plugin `.so`:

```nix
# nix/lib.nix — see logos-lez-multisig-module/nix/lib.nix for full example
{ pkgs, common, src, logosSdk, logosLiblogos, myFfi }:

let
  mergedLogosCore = pkgs.symlinkJoin {
    name = "logos-core-merged";
    paths = [ logosSdk logosLiblogos ];
  };
in pkgs.stdenv.mkDerivation {
  pname = "${common.pname}-lib";
  version = common.version;
  inherit src;
  inherit (common) nativeBuildInputs buildInputs;

  cmakeFlags = common.cmakeFlags ++ [
    "-DLOGOS_CORE_ROOT=${mergedLogosCore}"
    "-DMY_PROGRAM_LIB=${myFfi}/lib"
    "-DMY_PROGRAM_INCLUDE=${myFfi}/include"
  ];

  installPhase = ''
    mkdir -p $out/lib
    find . -name "libmy_program_module.so" | head -1 | xargs -I{} cp {} $out/lib/
  '';
}
```

**`nix/app.nix`** — bundles logoscore + your module into a standalone app:

```nix
# nix/app.nix — see logos-lez-multisig-module/nix/app.nix for full example
{ pkgs, common, src, logosLiblogos, logosSdk, logosCapModule, myFfi, myModule }:

pkgs.stdenv.mkDerivation {
  pname = "${common.pname}-app";
  version = common.version;
  inherit src;
  inherit (common) nativeBuildInputs buildInputs;

  # Build the app binary linking against logos_host
  cmakeFlags = common.cmakeFlags ++ [
    "-DLOGOS_LIBLOGOS_ROOT=${logosLiblogos}"
    "-DLOGOS_CPP_SDK_ROOT=${logosSdk}"
  ];

  configurePhase = ''
    cmake -S app -B build ''${cmakeFlags[@]}
  '';
  buildPhase = ''
    cmake --build build
  '';

  installPhase = ''
    mkdir -p $out/bin $out/lib $out/modules

    # Core binaries
    cp -L ${logosLiblogos}/bin/logoscore $out/bin/ 2>/dev/null || true
    cp -L ${logosLiblogos}/bin/logos_host $out/bin/ 2>/dev/null || true

    # Libraries
    cp -L ${logosLiblogos}/lib/liblogos_core.* $out/lib/ 2>/dev/null || true
    cp -L ${myFfi}/lib/*.so $out/lib/ 2>/dev/null || true

    # Module plugins
    cp -L ${logosCapModule}/lib/*_plugin.so $out/modules/ 2>/dev/null || true
    cp -L ${myModule}/lib/*.so $out/modules/ 2>/dev/null || true
  '';
}
```

> **Full working reference:** See [logos-lez-multisig-module](https://github.com/jimmy-claw/logos-lez-multisig-module)
> for a production example with all the details (circuits, artifact injection, cross-platform support, patchelf).

#### Build Commands

```bash
# Build just the FFI library (Rust)
cd my_program_ffi && nix build

# Build the Qt module plugin
nix build .#lib

# Build the full standalone app
nix build .#app

# Run it
./result/bin/logoscore
```

### Testing with logoscore CLI

```bash
# Call your module's function directly
logoscore --call "liblez_my_program_module.listEntries({})"

# Check version
logoscore --call "liblez_my_program_module.version()"
```

### ⚠️ Critical: flake.lock Pinning

When you update upstream dependency commits (e.g., pointing to a newer `logos-core` or `lssa` commit), **you MUST update flake.lock**:

```bash
# Update a specific input
nix flake lock --update-input logos-core

# Or update everything
nix flake update
```

**If you skip this, Nix will silently use the OLD pinned commit.** Your `flake.nix` can point to a new commit, but `flake.lock` overrides it. This has caused hours of debugging (see Part 5).

---

## Part 5: Common Hurdles & Tips

### 1. flake.lock Not Updating (The 2-Hour Mystery)

**Symptom:** You changed an upstream commit hash in `flake.nix`, ran `nix build`, but the old code is still being used.

**Cause:** `flake.lock` pins dependencies. Editing `flake.nix` input URLs does NOT automatically update the lock file.

**Fix:**
```bash
nix flake lock --update-input <input-name>
# or
nix flake update
```

**Prevention:** Always run `nix flake update` after changing any input in `flake.nix`. Make it muscle memory.

### 2. `logos-blockchain-circuits` Dependency

The `wallet` crate from `lssa` transitively pulls in `logos-blockchain-circuits`:

```
wallet → common → logos-blockchain-common-http-client
       → logos-blockchain → logos-blockchain-pol → circuits (build.rs)
```

**Impact:** Your CLI or any crate depending on `wallet` won't build without circuits installed.

**Solutions:**
1. **Accept it:** Install circuits from [releases](https://github.com/logos-blockchain/logos-blockchain-circuits/releases) to `~/.logos-blockchain-circuits/` or set `LOGOS_BLOCKCHAIN_CIRCUITS` env var
2. **Avoid `wallet`:** Implement your own sequencer client using `nssa` + `reqwest` directly
3. **Core/program crates are fine:** `nssa_core` and `nssa` don't have this dependency — only `wallet` does

### 3. Theme Singleton: `module` Declaration Required

**Symptom:** `Logos.Theme` is undefined at runtime, even though the import compiles.

**Fix:** Your `qmldir` file must declare the module:

```
module LezMyProgram
```

And your QML files must explicitly import the theme:

```qml
import Logos.Theme 1.0
```

Without the `module` declaration in `qmldir`, the Qt QML engine can't resolve the `Logos.Theme` singleton properly.

### 4. arm64 Build Considerations

- risc0 zkVM guest builds target `riscv32im` — works on any host architecture
- Native Rust FFI library must be built for your target arch (arm64 if deploying on ARM)
- Nix cross-compilation: use `pkgsCross.aarch64-multiplatform` if building on x86_64 for ARM
- Some CI runners are x86_64-only — you may need self-hosted ARM runners

### 5. Account Layout Matters

Programs are strict about account ordering. Document your expected layout:

```
accounts[0] = state PDA (program-owned)
accounts[1] = caller/authority (must have is_authorized = true)
accounts[2..] = additional accounts as needed
```

Getting this wrong produces cryptic assertion failures inside the zkVM. Always document and test account layouts.

### 6. General Tips

- **Start with `cargo check`** before attempting full builds. Core and program crates compile fast without special deps.
- **Test without zkVM first.** Write unit tests that call your `process()` function directly with mock `AccountWithMetadata` inputs.
- **JSON everywhere.** The FFI boundary is all JSON strings. This makes debugging easy — you can test FFI functions with `curl` or simple C programs.
- **`free_string` is not optional.** Every string returned from FFI must be freed. Memory leaks in Qt apps compound fast.
- **Use `lez-framework`** if available — it provides `generate_idl!` and other macros that reduce boilerplate.

---

## Quick Reference

| What | Command |
|------|---------|
| Check core compiles | `cargo check -p my_core -p my_program` |
| Run tests | `cargo test -p my_program` |
| Build FFI .so | `cargo build --release` |
| Generate C header | `cbindgen src/ffi.rs -l c > include/my_program.h` |
| Build zkVM guest | `cargo risczero build --manifest-path methods/guest/Cargo.toml` |
| Nix build lib | `nix build .#lib` |
| Nix build app | `nix build .#app` |
| Update flake deps | `nix flake update` |
| Test via logoscore | `logoscore --call "libmy_module.myFunction({})"` |

---

## Further Reading

- [lssa repository](https://github.com/logos-blockchain/lssa) — upstream LEZ framework
- [lez-registry](https://github.com/logos-blockchain/lez-registry) — reference FFI module
- [lez-multisig](https://github.com/jimmy-claw/lez-multisig) — complex program example with proposals
- [risc0 documentation](https://dev.risczero.com/) — zkVM guest development