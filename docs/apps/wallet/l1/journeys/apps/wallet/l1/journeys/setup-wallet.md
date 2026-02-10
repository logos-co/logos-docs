# Set up a user wallet for the Logos base layer

Applies to: 
- https://github.com/logos-co/logos-wallet-ui@506b207  
- https://github.com/logos-co/logos-wallet-module@ef98e6e  
Runtime target: Logos testnet v0.1 (chain connectivity/configuration: UNKNOWN)  
Last checked: 2026-01-28  
Status: Stub  
Owner: Owner needed  
Tracking: [User journey inventory spreadsheet](https://docs.google.com/spreadsheets/d/1V94fhGxwTGbyLy2u8OcZmJQIzIctIGUHHfqyyY01V3E/edit?usp=sharing) num. 8

## Outcome + value

- Outcome (end goal): Build and run the Logos Wallet UI standalone app, which loads the required Logos modules (including the wallet module) so you can use a wallet UI locally.
- Why it matters: This is the minimum “wallet is runnable” proof for Testnet v0.1 so other base-layer journeys (funding, sending, receiving) have a concrete wallet surface to build on.

## Audience

- End user; ecosystem dApp user (but current resources are developer-oriented / build-from-source only).

## Known gaps / Blockers

- No packaged “download/install” flow. The wallet UI repo has no releases published, so setup is currently “build from source.”
- Testnet v0.1 connectivity details are missing: chain/network name, chain ID, RPC endpoints, and how the wallet UI selects/configures them are UNKNOWN.
- Security model is not documented (key storage, seed handling, OS keychain usage, etc.): UNKNOWN.
- Owner/reviewer handle(s): UNKNOWN (spreadsheet lists teams, not individuals).

## Prerequisites

- OS: macOS or Linux (artifacts referenced include `.dylib` for macOS and `.so` for Linux). 
- Dependencies (recommended path): Nix with Flakes enabled (repo calls Nix “Recommended”). 
- Dependencies (manual build path):
  - Wallet UI: CMake (>= 3.16), Ninja, pkg-config, Qt6 (qtbase + Qt Remote Objects), plus listed Logos deps.
  - Wallet module: CMake (>= 3.14), Qt6 (or Qt5), Go compiler, and a C++17 compiler.
- Accounts/keys: UNKNOWN (no wallet creation / key import steps are documented in available sources).
- Network/chain: Logos testnet v0.1 details UNKNOWN (no chain ID / endpoints documented in the wallet repos’ READMEs).
- Other:
  - If you use zsh, you may need to quote flake targets like `'.#app'`.

## Hardware requirements

- Target devices: Desktop/laptop capable of running Nix + Qt (macOS/Linux).
- Minimum: UNKNOWN (no CPU/RAM/storage requirements documented).
- Recommended: UNKNOWN.
- Storage profile: UNKNOWN.
- RPi notes (if supported): UNKNOWN.

## Configuration

- Env vars: UNKNOWN (no documented env vars for RPC endpoints, data directories, or key storage).
- Flags: UNKNOWN (standalone app flags not documented).
- Config file keys: UNKNOWN.
- Default endpoints/ports: UNKNOWN.

## Steps (happy path)

1. Clone the wallet UI repo:

   ```sh
   git clone https://github.com/logos-co/logos-wallet-ui.git
   cd logos-wallet-ui
   ```

2. Install Nix (if needed) and ensure Flakes are enabled.

    - Install guidance (official): follow the Nix install docs for your OS.
    - If flakes are not enabled globally, you can pass experimental flags to the nix command (the wallet UI repo provides an example).

3. Build the standalone Qt wallet app (recommended Nix path):

    ```sh
    nix build '.#app'
    ```

    Notes:
    - In zsh, quote the target to avoid glob expansion (repo note).
    - You can also build everything with nix build (repo example), but building '.#app' targets the runnable app.

4. Run the app:

    ```sh
    ./result/bin/logos-wallet-ui-app
    ```
    The repo states the app will automatically load the required modules (including `capability_module` and `wallet_module`) and the `wallet_ui` Qt plugin.

## Optional: Build the wallet UI plugin only

If you need only the plugin artifact (not the standalone app):

```sh
nix build '.#lib'
```

This produces a `wallet_ui` dynamic library under `result/lib/`.

## Optional: Build the wallet module (manual build)

If you need to build the wallet module plugin outside the wallet UI’s Nix flow:

```sh
git clone https://github.com/logos-co/logos-wallet-module.git
cd logos-wallet-module

git submodule update --init --recursive
./build_wallet_lib.sh

mkdir -p build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DLOGOS_WALLET_MODULE_USE_VENDOR=ON
cmake --build . --target wallet_module_plugin
```

These steps are documented in the wallet module README.

## Expected outputs

- After building the wallet UI app:
    - result/bin/logos-wallet-ui-app exists.
    - The result/ tree includes bundled dependencies and modules (examples listed in the repo include logos_host, logoscore, wallet_module_plugin.*, and libgowalletsdk.*).

- After running the wallet UI app:
    - The UI launches, and (per repo) the app automatically loads capability_module, wallet_module, and the wallet_ui Qt plugin.

## Verify

- Command

    ```sh
    ./result/bin/logos-wallet-ui-app
    ```

- Expected:
    - The Logos Wallet UI app launches successfully.
    - The app loads the wallet module and related required modules automatically (as stated by the repo).

## Troubleshooting (top 3-5)

- Symptom: `error: experimental Nix feature 'nix-command' is disabled` (or flakes-related errors).
    Fix/workaround:
    - Enable flakes (system/user config) or use `--experimental-features 'nix-command flakes'` as described in flakes documentation and hinted by the wallet UI repo’s “extra experimental features” example.

- Symptom: `nix build '.#app'` fails in zsh with globbing/expansion issues.
    Fix/workaround:
    - Quote the flake target (repo note): `nix build '.#app'` (or `'.#default'`).

- Symptom: Build fails due to missing toolchain or Qt dependencies when not using Nix.
    Fix/workaround:
    - Install the required build tools/deps listed by the repo (CMake, Ninja, pkg-config, Qt6, etc.).

- Symptom: Wallet module manual build fails due to missing vendored deps or missing wallet library.
    Fix/workaround:
    - Make sure submodules are initialized and the Go wallet library build step ran (`git submodule update --init --recursive` and `./build_wallet_lib.sh`).

## Limits (for Testnet v0.1)

- Not supported: A user-friendly “download/install” flow (no published releases in wallet-ui repo).

- Known issues/sharp edges:
    - Testnet v0.1 chain connection settings are not documented (RPC endpoints/chain ID/config keys: UNKNOWN).
    - Wallet security model not documented (seed/key handling: UNKNOWN).

## References (links)

- Wallet UI (build + run instructions): https://github.com/logos-co/logos-wallet-ui
- Wallet module (manual build instructions + module purpose): https://github.com/logos-co/logos-wallet-module
- Install Nix: https://nix.dev/install-nix.html
- Enable flakes (reference): https://wiki.nixos.org/wiki/Flakes
