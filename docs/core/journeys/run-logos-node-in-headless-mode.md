# Run Logos Node in headless mode to start Blockchain, Storage, and Chat nodes

Applies to: https://github.com/logos-co/logos-liblogos  
Runtime target: Logos testnet v0.1  
Last checked: 2026-02-13  
Status: Stub  
Owner: @iurimatias  
Tracking: GitHub issue [#167](https://github.com/logos-co/logos-docs/issues/167)

## Outcome + value

- Outcome (end goal): Run “Logos Node (Headless Mode)” so it starts the Blockchain Node module, Storage Node module, and Chat Node (ChatSDK interface) without the Logos App UI.
- Why it matters: Proves the Core “headless” runtime path works for v0.1 and can host the baseline node modules that other journeys depend on (wallet UI, filesharing app, chat app).

## Audience

- node operator
- developer

## Known gaps / Blockers

- Doc Packet missing: exact repo versions for the modules used in testnet v0.1; runnable end-to-end steps for “headless mode” (install/build/run); expected logs/health checks; required config files; module list + load order; how to join the v0.1 network; reviewer handle. (Issue is labeled blocker:needs-doc-packet.)
- Notion/repo mapping needed:
  - What repository (or folder) is the authoritative “Logos Node (Headless Mode)” entry point for v0.1 (the dependency diagram names it as a component, but the runnable packaging isn’t documented here).
- Module identifiers missing:
  - The exact module names to pass to `logoscore --load-modules` for “Blockchain Node”, “Storage Node”, and “Chat Node” are UNKNOWN. (The dependency diagram uses descriptive labels, not CLI identifiers.)

## Prerequisites

- OS: Linux or macOS (supported platforms listed for `logos-liblogos`).
- Dependencies (build tools for `logos-liblogos`):
  - CMake (>= 3.14)
  - Ninja
  - pkg-config
  - Qt6 (qtbase) or Qt5 (Core, RemoteObjects)
  - Qt6 Remote Objects (qtremoteobjects)
- Additional dependencies observed in the Core PoC setup (may be legacy / may not apply to v0.1 packaging):
  - `protobuf-compiler`
  - `patchelf`
- Accounts/keys: UNKNOWN (what keys/identity are required for Blockchain/Storage/Chat nodes in headless mode is not documented in the public sources above).
- Network/chain: UNKNOWN (chain ID, bootnodes, RPC endpoints, and any “join testnet v0.1” parameters are not provided in the sources above).
- Other:
  - If using Nix builds, you need Nix with flakes enabled (or pass `--extra-experimental-features 'nix-command flakes'`).

## Hardware requirements

- Target devices: x86_64 computer (Linux/macOS); aarch64 Linux/macOS also listed as supported by `logos-liblogos`.
- Recommended: UNKNOWN
- Storage profile: UNKNOWN

## Configuration

- Env vars:
  - UNKNOWN

- Flags (documented for `logoscore`):
  - `--modules-dir <path>` / `-m <path>` — directory to scan for modules (plugins).
  - `--load-modules <modules>` / `-l <modules>` — comma-separated list of modules to load; dependency-based auto-loading is mentioned.
  - `--call <call>` / `-c <call>` — call a module method `module.method(...)`, supports `@file` for parameters; can be repeated.
  - `--help` / `-h` — show help.
  - `--version` — show version.

- Config file keys:
  - UNKNOWN (no public v0.1 “headless node” config format found in the sources above)

- Default endpoints/ports:
  - UNKNOWN (the sources above do not list ports for Blockchain/Storage/Chat modules when running under `logoscore`)

## Steps (happy path)

> Notes:
> - The steps below only cover what is directly supported by the public sources: building and starting `logoscore`, and the mechanism for building/copying modules in the (deprecated) Core PoC repo. The exact v0.1 module set and how to connect to testnet are UNKNOWN.

1. Get the Core runtime (`logos-liblogos`):

   - Option A (Nix build, recommended in repo docs):

     ```sh
     git clone https://github.com/logos-co/logos-liblogos.git
     cd logos-liblogos
     nix build '.#logos-liblogos'
     ```

     This produces artifacts under `./result/`, including `./result/bin/logoscore`.

   - Option B (manual build):

     ```sh
     git clone https://github.com/logos-co/logos-liblogos.git
     cd logos-liblogos
     git submodule update --init --recursive
     ./scripts/compile.sh
     ```

     Expected output locations (per repo docs): libraries in `build/lib/`, binaries in `build/bin/`.

2. Obtain/build the required node modules (Blockchain Node, Storage Node, Chat Node):

   - UNKNOWN (no public “Doc Packet” describing which repos, which versions, and which build outputs are required for v0.1 headless mode).

   - Implementation clue (legacy Core PoC approach): build modules separately and copy the resulting `*.so/*.dylib/*.dll` plugin libraries into the Core build’s modules directory (example path: `logos-liblogos/build/modules`).

3. Start Logos Node in headless mode by running `logoscore` and loading the required modules:

   - Minimal “start the runtime”:

     ```sh
     ./result/bin/logoscore
     ```

   - Load modules from a specific directory and request a specific load order:

     ```sh
     ./result/bin/logoscore --modules-dir /path/to/modules --load-modules MODULE_A,MODULE_B,MODULE_C
     ```

     Replace `MODULE_*` with the real module identifiers for Blockchain Node / Storage Node / Chat Node (UNKNOWN).

4. (Optional) Invoke module methods after loading (only if the v0.1 module APIs require explicit start calls):

   ```sh
   ./result/bin/logoscore -m /path/to/modules -l MODULE_A,MODULE_B \
     --call "MODULE_A.start()" \
     --call "MODULE_B.start()"
   ```

The mechanism is supported; actual module method names are UNKNOWN. ([GitHub][1])

## Expected outputs

- After building:

  - Nix build: `./result/bin/logoscore` exists. ([GitHub][1])
  - Manual build: binaries in `build/bin/` and libraries in `build/lib/`. ([GitHub][1])
- After starting `logoscore`:

  - UNKNOWN (no public reference output/log lines for a successful “headless mode” start with Blockchain/Storage/Chat modules)

## Verify

- Command:

  ```sh
  ./result/bin/logoscore --help
  ```

  ([GitHub][1])

- Expected:

  ```sh
  - Help output lists flags such as --modules-dir, --load-modules, and --call.
  ```

  ([GitHub][1])

> NOTE: A real “node is running on testnet v0.1” verification command/output is UNKNOWN (no chain endpoints, health checks, or module-specific “ready” indicators found in the public sources above). ([GitHub][2])

## Troubleshooting (top 3-5)

- Symptom: `nix build '.#logos-liblogos'` fails with `#`-related target parsing in zsh.
  Cause: zsh glob expansion for `#`.
  Fix/workaround: Quote the target, as shown in the repo docs. ([GitHub][1])

- Symptom: `logoscore` starts but loads no modules / can’t find plugins.
  Cause: modules directory not set correctly (or required module plugins not present).
  Fix/workaround: pass `--modules-dir <path>` pointing to the directory containing the built plugin libraries. ([GitHub][1])

- Symptom: Built module `.so` loads fail due to runtime library path issues.
  Cause: rpath / dynamic linker can’t resolve dependent libraries (example: Core PoC uses `patchelf` on Linux to set rpath on plugin `.so`).
  Fix/workaround: ensure plugin rpath is set; the legacy Core PoC uses `patchelf --set-rpath '$ORIGIN' <plugin.so>` for Linux modules. ([GitHub][3])

- Symptom: Build fails due to missing Qt / build tooling.
  Cause: missing dependencies (Qt, CMake/Ninja/pkg-config).
  Fix/workaround: install the dependencies listed by `logos-liblogos` (and, if following the Core PoC legacy flow, also install `protobuf-compiler` and `patchelf`). ([GitHub][1])

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN
- Known issues/sharp edges: UNKNOWN (no v0.1 headless-node issues/PRs linked from the public sources above)

## References (links)

- Journey tracker issue: [https://github.com/logos-co/logos-docs/issues/167](https://github.com/logos-co/logos-docs/issues/167) ([GitHub][2])
- `logos-liblogos` (Core runtime; provides `logoscore`): [https://github.com/logos-co/logos-liblogos](https://github.com/logos-co/logos-liblogos) ([GitHub][4])
- Testnet v0.1 dependency diagram (defines “Logos Node (Headless Mode)” and its relationship to Blockchain/Storage/Chat modules): [https://roadmap.logos.co/testnets/v01_dependencies](https://roadmap.logos.co/testnets/v01_dependencies) ([roadmap.logos.co][5])
- Legacy Core PoC scripts showing how modules were built/copied alongside `logoscore` (may not reflect v0.1 packaging, but illustrates the plugin workflow):

  - [https://github.com/logos-co/logos-core-poc](https://github.com/logos-co/logos-core-poc) (deprecated) ([GitHub][6])
  - `scripts/run_core.sh` ([GitHub][7])
  - `scripts/build_core_modules.sh` ([GitHub][3])
