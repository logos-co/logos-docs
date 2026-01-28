# Use a demo chat app in Logos Core to send and receive messages via Logos ChatSDK and Logos Messaging

Applies to:

- https://github.com/logos-co/logos-chat-ui@27e92b9
- https://github.com/logos-co/logos-chat-module@bce2893
- https://github.com/logos-co/logos-app-poc@b0b1c69

Runtime target: UNKNOWN
Last checked: 2026-01-28
Status: Stub
Owner: owner needed (recent commits by @iurimatias)
Tracking: Testnet v0.1 docs in scope spreadsheet (num. 15) / Issue: [#141](https://github.com/logos-co/logos-docs/issues/141)

## Outcome + value

- Outcome (end goal): Run the demo chat app and confirm you can send and receive chat messages through the Logos Core + Messaging stack.
- Why it matters: Provides an end-to-end smoke test of the demo UX and the integration between the chat UI/module and the underlying messaging backend.

## Purpose

Provide a runnable starting point to build and launch the demo chat application for Logos Core and validate basic send/receive flows.

## Audience

- Developer

## Hardware requirements

- UNKNOWN
- Assumption: standard developer laptop/desktop (this repo set does not document Raspberry Pi / low-power targets).

## Known gaps

- Missing Docs Packet.
- It is unclear what exact "ChatSDK" artifacts/config are required for this journey (naming in journey vs repo naming is not mapped).
- It is unclear what messaging network/backend the demo should connect to by default (local vs testnet; which nodes; which bootstrap peers; which topics).
- No documented "success criteria" beyond "app launches"; send/receive validation steps are not documented end-to-end.

## Prerequisites

- Nix with flakes enabled (recommended path in repos).

  - If flakes are not enabled: enable nix-command + flakes in your Nix config (exact steps vary by distro).

- If not using Nix (fallback / partial guidance from older repos):

  - CMake, Ninja, pkg-config
  - Protobuf compiler
  - patchelf
  - UNKNOWN for the exact supported versions per OS.

## Configuration

- Env vars: UNKNOWN
- Flags: UNKNOWN
- Config file keys: UNKNOWN
- Default endpoints/ports: UNKNOWN
- Network selection (testnet/local): UNKNOWN

## Steps

1. Option A (recommended): Build and run the standalone chat UI app (from `logos-chat-ui`)

   ```sh
   git clone https://github.com/logos-co/logos-chat-ui
   cd logos-chat-ui

   # Build standalone test app
   nix build '.#test-app'

   # Run
   ./result/bin/chat-app
   ```

Notes:

- If you use zsh, you may need to quote the target (same command, different quoting):

  - `nix build '.#test-app'`

- The README indicates the standalone app "automatically loads required modules and the chat_ui plugin".

2. Option B: Build and run Logos App POC (which includes a `logos_dapps/chat_ui` area)

   ```sh
   git clone --recurse-submodules https://github.com/logos-co/logos-app-poc
   cd logos-app-poc

   nix build '.#app'
   ./result/bin/logos-app-poc
   ```

   Notes:

   - The README indicates the app will load required modules/plugins.
   - It’s unclear (without SME confirmation) what exact UI flow corresponds to "send and receive messages" in this build.

3. (Optional / deeper) Build the chat module artifact directly (from `logos-chat-module`)

   ```sh
   git clone https://github.com/logos-co/logos-chat-module
   cd logos-chat-module

   nix build '.#build_module'
   ```

   Expected artifact location (per README):

   - `result/modules/chat_module`

## Expected outputs

- After the Nix build:

  - A `result/` symlink should be created in the repo root.
  - Binaries should be available under `result/bin/...` (exact names depend on the option you built).

- After running the app:

  - A GUI application window should open.
  - Terminal logs may show module/plugin loading messages.

- Send/receive UX:

  - UNKNOWN: no documented UI steps, accounts, peers, or test vectors.

## Verify

- Verification command: UNKNOWN
- Manual verification (best available with current info):

  - Launch the app and confirm it loads without fatal errors.
  - Attempt to send a message and confirm it appears in the conversation history (requires SMEs to confirm the correct network/backends and UI flow).

- Expected: UNKNOWN

## Troubleshooting

- Nix flakes errors:

  - Symptom: "experimental feature ‘nix-command’ is disabled" or "flakes" errors -> Fix: enable `nix-command` and `flakes` in your Nix configuration.

- zsh target parsing:

  - Symptom: `nix build .#test-app` fails in zsh -> Fix: quote the attribute: `nix build '.#test-app'`.

- Qt/C++ build failures (non-Nix path):

  - Symptom: missing Qt/CMake/Ninja/protobuf headers/tools -> Fix: install the required build deps for your OS (exact list/version: UNKNOWN).

## Limits (v0.1)

- This journey is not fully specified for v0.1 (network, backends, and success criteria are undocumented here).
- The older `logos-core-poc` repo is marked as deprecated; avoid basing v0.1 work exclusively on it.

## References

- [https://github.com/logos-co/logos-chat-ui](https://github.com/logos-co/logos-chat-ui)
- [https://github.com/logos-co/logos-chat-module](https://github.com/logos-co/logos-chat-module)
- [https://github.com/logos-co/logos-app-poc](https://github.com/logos-co/logos-app-poc)
- (Legacy / context) [https://github.com/logos-co/logos-core-poc](https://github.com/logos-co/logos-core-poc) (deprecated)
- (Messaging background, per spreadsheet) [https://github.com/logos-messaging](https://github.com/logos-messaging)
