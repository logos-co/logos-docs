# Build and run Logos App (alpha) to access Testnet v0.1 UIs

Applies to: https://github.com/logos-co/logos-app-poc@master
Runtime target: Logos testnet v0.1 (Logos App runs locally, and provides alpha UIs for v0.1 modules/apps)  
Last checked: 2026-02-13  
Status: Stub  
Owner: @iurimatias
Tracking: GitHub issue [#174](https://github.com/logos-co/logos-docs/issues/174)

## Outcome + value

- Outcome (end goal): Build and run the Logos App (alpha) locally so you can open the v0.1 “Simple App” UIs (wallets, explorer, chat, filesharing, mix push).
- Why it matters: Confirms the v0.1 module integration path works end-to-end: the Logos App can expose UI surfaces that interact with Logos Core modules/backends.

## Audience

- developer
- tester

## Known gaps / Blockers

- Doc Packet missing:
  - repo@sha/tag: missing pinned commit / release tag for `logos-app-poc`
  - runnable steps inside the app: exact UI clicks to open each v0.1 UI and how to connect each UI to its backend (local vs remote testnet)
  - expected outputs: screenshots / success indicators for “app launched” and for each v0.1 UI
  - v0.1 limits: which UIs are guaranteed to work, and what “alpha” means for user-facing behavior
  - reviewer handle: UNKNOWN
- Notion/repo mapping needed:
  - Confirm whether “Logos App (alpha)” for v0.1 is exclusively `logos-app-poc` or also includes other repos (for example module repos, UI repos, or “Logos Node” tooling referenced on the roadmap page).
- Backend wiring unclear:
  - The v0.1 roadmap states that “Logos Node can load and start the Blockchain, Storage, and ChatSDK nodes,” but the doc packet does not explain how the Logos App triggers that (or whether this journey assumes backends are already running).

## Prerequisites

- OS: macOS or Linux (Windows support UNKNOWN)
- Dependencies:
  - Nix (with flakes enabled, or you use the extra experimental-features flags)
  - Git
  - If not using Nix: CMake (>= 3.16), Ninja, pkg-config, Qt6, and various project dependencies (exact non-Nix setup steps are not documented in this journey and may be painful).
- Accounts/keys: UNKNOWN (depends on whether you run backends locally or connect to a shared testnet deployment)
- Network/chain:
  - Logos testnet v0.1: endpoints / chain IDs for connecting UIs are UNKNOWN
- Other:
  - If you use zsh, you must quote Nix flake targets like `'.#default'` to avoid glob expansion.

## Hardware requirements

- Target devices: x86_64 computer (others UNKNOWN)
- Minimum: UNKNOWN
- Recommended: UNKNOWN
- Storage profile: UNKNOWN

## Configuration

- Env vars:
  - UNKNOWN

- Flags:
  - `nix build` - build the complete app (default target)
  - `nix build '.#default'` - explicitly build the default flake target (quote it in zsh)
  - `nix build '.#app'` - build only the main application target
  - `nix develop` - enter a development shell with dependencies
  - `nix build --extra-experimental-features 'nix-command flakes'` - use when flakes are not enabled globally

- Config file keys:
  - `~/.config/nix/nix.conf`: `experimental-features = nix-command flakes` - enable flakes globally (optional)

- Default endpoints/ports:
  - UNKNOWN (depends on which modules/backends are started and how they are configured)

## Steps (happy path)

1. Clone the repo:

   ```sh
   git clone https://github.com/logos-co/logos-app-poc
   cd logos-app-poc
   ```

2. Build the app (recommended Nix path):

   ```sh
   nix build
   ```

   Notes:

   - If you use zsh and build a specific target, quote it, for example:

     ```sh
     nix build '.#default'
     ```

   - If flakes are not enabled globally, run:

     ```sh
     nix build --extra-experimental-features 'nix-command flakes'
     ```

3. Run the app:

   ```sh
   ./result/bin/logos-app-poc
   ```

4. In the Logos App, open one of the v0.1 “Simple App” UIs:

   - Blockchain Wallet (steps UNKNOWN)
   - LEZ Wallet (steps UNKNOWN)
   - LEZ Explorer (steps UNKNOWN)
   - Simple Chat App (steps UNKNOWN)
   - Simple Filesharing App (steps UNKNOWN)
   - Simple Mix Push Message App (steps UNKNOWN)

   Note: The v0.1 roadmap indicates these UIs are “alpha-state” and controlled via the Logos App. Exact UX flows are not documented here.

## Expected outputs

- After step 2: a `result/` directory exists with an executable at `./result/bin/logos-app-poc`.
- After step 3: the Logos App window opens successfully (what you see first is UNKNOWN).
- After step 4: the selected v0.1 UI screen opens inside the Logos App (what “success” looks like for each UI is UNKNOWN).

## Verify

- Command:

  ```sh
  ./result/bin/logos-app-poc
  ```

- Expected:

  ```sh
  - The app launches without crashing.
  - At least one v0.1 UI can be opened from within the app (exact UI navigation is UNKNOWN).
  ```

## Troubleshooting (top 3-5)

- Symptom: `nix build '.#default'` fails or behaves oddly in zsh
  Cause: zsh glob expansion on unquoted flake targets
  Fix/workaround: Quote the target, for example: `nix build '.#default'`.

- Symptom: `nix build` fails with errors about flakes / nix-command not enabled
  Cause: flakes aren’t enabled in your Nix configuration
  Fix/workaround: Use `--extra-experimental-features 'nix-command flakes'`, or enable globally in `~/.config/nix/nix.conf`.

- Symptom: App launches but no data appears in a UI (wallet/explorer/chat/filesharing/etc.)
  Cause: The UI likely expects a backend/module/node to be running or configured, but the required endpoints and boot sequence are not documented in this journey.
  Fix/workaround: UNKNOWN (needs doc packet describing how the Logos App starts or connects to the v0.1 backends).

- Symptom: Build is slow or fails due to missing native deps
  Cause: Trying to build outside Nix or on an unsupported environment
  Fix/workaround: Use the Nix build path (`nix build`) unless you have an explicit non-Nix setup guide.

## Limits (for Testnet v0.1)

- Not supported:

  - Stable, production-grade UX/DevEx (v0.1 explicitly prioritizes backend testing; “alpha” UIs)
  - Other limitations: UNKNOWN
- Known issues/sharp edges: UNKNOWN (link issues/PRs once identified)

## References (links)

- Existing sources:

  - Testnet v0.1 roadmap (Logos App + list of alpha UIs; module integration focus): [https://roadmap.logos.co/testnets/v01](https://roadmap.logos.co/testnets/v01)
  - logos-app-poc README (Nix build + run instructions): [https://github.com/logos-co/logos-app-poc](https://github.com/logos-co/logos-app-poc)
  - Tracking issue: [https://github.com/logos-co/logos-docs/issues/174](https://github.com/logos-co/logos-docs/issues/174)
  - Optional repo map (helps find related module/UI repos): [https://hackmd.io/%40logos-core/B1yfUrcLZl](https://hackmd.io/%40logos-core/B1yfUrcLZl)
