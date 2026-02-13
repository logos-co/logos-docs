# Store and retrieve a file using the simple filesharing app

Applies to: https://github.com/logos-co/logos-storage-ui@master; https://github.com/logos-co/logos-storage-module@master  
Runtime target: Logos testnet v0.1
Last checked: 2026-02-13  
Status: Stub  
Owner: @gemga 
Tracking: GitHub issue [#175] https://github.com/logos-co/logos-docs/issues/175   

## Outcome + value

- Outcome (end goal): Run the simple filesharing app UI, store a local file via the Storage module, then retrieve that same file by CID.
- Why it matters: Confirms the Storage module integration is usable end-to-end in testnet v0.1 (store a file, then fetch it back by CID).

## Audience

- developer

## Known gaps / Blockers

- Doc Packet missing: runnable “store file” + “retrieve by CID” steps --inside the app UI-- (exact fields/buttons), expected UI outputs (CID format, where it appears, where downloaded file is written), and any limits (max file size, supported file types).
- Notion/repo mapping needed: what “simple filesharing app” corresponds to in repos beyond `logos-storage-ui` (UI plugin + standalone app) and whether running it is expected to connect to a local Storage node or uses an embedded/default configuration.
- Storage backend version pinning: storage-module references a `libstorage` link that currently 404s, so the authoritative backend repo/version for v0.1 is unclear.

## Prerequisites

- OS: Linux or macOS (Windows support UNKNOWN).
- Dependencies:
  - Nix installed (with flakes enabled or enabled via flags).
  - If developing in Qt Creator: Qt Creator + build tooling is required, but this journey should not require Qt Creator if using Nix build/run.
- Accounts/keys: None (for local demo app) (Logos App integration / accounts UNKNOWN).
- Network/chain: Logos testnet v0.1 (specific endpoints/chain IDs UNKNOWN).
- Other:
  - On SELinux-enabled Linux (example: Fedora), Nix may require a Toolbox-based workaround. 

## Hardware requirements

- Target devices: x86_64 computer (others UNKNOWN)
- Minimum: UNKNOWN
- Recommended: UNKNOWN
- Storage profile: UNKNOWN

## Configuration

- Env vars:
  - UNKNOWN

- Flags:
  - `nix build '.#default'` (quote the target in zsh to avoid glob expansion). :contentReference[oaicite:11]{index=11}
  - `nix build --extra-experimental-features 'nix-command flakes'` (if flakes aren’t enabled globally). :contentReference[oaicite:12]{index=12}

- Config file keys:
  - `~/.config/nix/nix.conf`: `experimental-features = nix-command flakes` (to enable flakes globally). :contentReference[oaicite:13]{index=13}

- Default endpoints/ports:
  - UNKNOWN

## Steps (happy path)

1. Clone the UI repo:

   ```sh
   git clone https://github.com/logos-co/logos-storage-ui
   cd logos-storage-ui
   ```

2. Build the standalone app with Nix:

   ```sh
   nix build
   ```

   Notes:

   - If you use zsh and build a specific flake target, quote it (example: `nix build '.#default'`). ([GitHub][1])
   - If flakes aren’t enabled globally, use the experimental-features flag shown in --Configuration--. ([GitHub][1])

3. Run the standalone app:

   ```sh
   ./result/bin/logos-storage-ui-app
   ```

   The app is expected to auto-load the required modules (capability_module, storage_module) and the storage_ui Qt plugin. ([GitHub][1])

4. In the app, store a local file (exact UI steps UNKNOWN).

   Expected behavior for v0.1: “store a file”. ([roadmap.logos.co][2])

5. In the app, retrieve a file by CID (exact UI steps UNKNOWN).

   Expected behavior for v0.1: “enter a CID and get the file”. ([roadmap.logos.co][2])

## Expected outputs

- After step 2: A `result/` directory exists with a runnable binary at `./result/bin/logos-storage-ui-app`. ([GitHub][1])
- After step 3: The UI launches (what you should see on screen is UNKNOWN).
- After step 4: The app displays/returns a CID for the stored file (where/how the CID appears is UNKNOWN). ([roadmap.logos.co][2])
- After step 5: The app retrieves the file content for the CID (download location / file name behavior UNKNOWN). ([roadmap.logos.co][2])

## Verify

- Command:

  ```sh
  UNKNOWN
  ```

- Expected:

  ```sh
  - The app successfully stores a file and returns a CID.
  - Entering that CID retrieves the same file content.
  ```

## Troubleshooting (top 3-5)

- Symptom: `nix build '.#default'` fails or behaves oddly in zsh
  Cause: zsh glob expansion on unquoted flake targets
  Fix/workaround: Quote the target, for example: `nix build '.#default'`. ([GitHub][1])

- Symptom: Nix installation/build doesn’t work on SELinux-enabled Linux (for example Fedora)
  Cause: SELinux restrictions can prevent installing/using Nix normally
  Fix/workaround: Use a Toolbox container workflow as described in `SETUP.md` (create toolbox, install nix in toolbox, then build). ([GitHub][3])

- Symptom: Flake build fails due to flakes not enabled
  Cause: Nix flakes not enabled globally
  Fix/workaround: Use `--extra-experimental-features 'nix-command flakes'` for builds, or set `experimental-features = nix-command flakes` in `~/.config/nix/nix.conf`. ([GitHub][1])

- Symptom: You want to use Qt Creator/QML preview but headers/imports are missing (development workflow)
  Cause: Host environment can’t access the Nix store layout (especially when using Toolbox)
  Fix/workaround: Follow `SETUP.md` to copy generated headers into `libs/` (for example `rsync -aL result/include/ libs/`). ([GitHub][3])

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN
- Known issues/sharp edges: The tracking issue is labeled “blocker:needs-doc-packet” and “ready:blocked”, so this journey is currently not runnable from docs alone. ([GitHub][4])

## References (links)

- Existing sources:

  - Testnet v0.1 roadmap (mentions simple filesharing app; “store a file” and “enter a CID and get the file”). ([roadmap.logos.co][2])
  - `logos-storage-ui` README (build/run instructions for `logos-storage-ui-app`). ([GitHub][1])
  - `logos-storage-ui` SETUP (Toolbox + Qt Creator dev setup notes). ([GitHub][3])
  - `logos-storage-module` README (build instructions; mentions dependency on libstorage). ([GitHub][5])
  - Tracking issue #175. ([GitHub][4])
- Optional:

  - Repo list (HackMD) that groups storage repos used by Logos Core. ([HackMD][6])
