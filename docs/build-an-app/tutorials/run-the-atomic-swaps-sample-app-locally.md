---
title: Run the atomic swaps sample app locally
doc_type: quickstart
product: apps
topics:
  - atomic swaps
  - HTLC
  - Basecamp
  - sample app
  - LEZ
  - Ethereum
authors: [danisharora099]
owner: logos
doc_version: 1
slug: atomic-swaps-sample-app-quickstart
---

# Run the atomic swaps sample app locally

#### Build the swap UI, start local infrastructure, and complete a cross-chain LEZ ↔ ETH atomic swap using two Basecamp windows.

> [!IMPORTANT]
>
> **v0.1 draft** — This packet now documents the **scaffold-first flow** adopted in the [eth-lez-atomic-swaps#27](https://github.com/logos-co/eth-lez-atomic-swaps/issues/27) Phase 2 close-out (`lgs basecamp build/setup/install/launch` replaces the retired `make swap-lgx-build` / `make basecamp-*` targets). SME dogfooded; not yet through Docs editorial review or Red Team end-to-end verification. Expect timing estimates and troubleshooting to tighten after Red Team runs a clean machine.

> [!NOTE]
>
> - **Permissions**: No special permissions required beyond local dev tooling.
> - **Product**: [eth-lez-atomic-swaps](https://github.com/logos-co/eth-lez-atomic-swaps) sample app (Basecamp UI).
> - **Tracking**: [logos-co/ecosystem#108](https://github.com/logos-co/ecosystem/issues/108)

### Tested with (SME dogfood, 2026-07-27)

| Item | Value |
|------|-------|
| Sample app | [`eth-lez-atomic-swaps`](https://github.com/logos-co/eth-lez-atomic-swaps) @ [`5858f91`](https://github.com/logos-co/eth-lez-atomic-swaps/commit/5858f91fede91360d8ba95464b1ce2ec42d9fd31) (master; includes [PR #37](https://github.com/logos-co/eth-lez-atomic-swaps/pull/37)) |
| Host | Apple Silicon macOS (`arm64`), darwin 25.5 |
| `logos-scaffold` | commit [`6789ec04`](https://github.com/logos-co/logos-scaffold/commit/6789ec04b2ad256186a5894710c419b42d16e479) (no release tag yet; `~/.cargo/bin/lgs`) |
| Rust (host) | 1.93.0 (repo pin in `rust-toolchain.toml`, installed via rustup) |
| Basecamp | `bin-macos-app` via Nix (`logos-basecamp` @ `a746cdbc`, pinned in `scaffold.toml`) |
| Swap outcome | Headless end-to-end swap completed (`make demo`); two-peer Basecamp launch verified (both UIs rendered, swap plugin loaded); full UI click-through swap pending re-dogfood |

> [!TIP]
> Red Team should clone the **pinned commit** above, not floating `master`, unless intentionally testing tip-of-tree.

This quickstart walks you through the **default manual Basecamp flow**: two isolated Basecamp instances (maker and taker) plus a long-running local infrastructure process (Anvil + LEZ sequencer). By the end, you will have completed a happy-path atomic swap using hash time-locked contracts (HTLCs) on both chains.

> [!NOTE]
>
> This guide covers the **happy path only**. Headless (`make demo`, which runs `lgs run --profile demo`) and CLI-only flows exist in the sample-app README but are out of scope here (`make test` runs the test suite the same way). The README also contains legacy logos-app screenshots; the current UI uses Basecamp tabs (**Config**, **Maker**, **Taker**, **Refund**).

## Before you start

- **Audience**: Developers comfortable with the terminal and multi-terminal workflows.
- **Platform**: Apple Silicon macOS (`arm64`), or Linux (`x86_64` / `aarch64`). **Intel macOS is not supported** (no published circuits bundle).
- **Time**: ~30–45 minutes on a **first cold run** (mostly the Nix module build); ~5 minutes on subsequent runs with warm caches.
- **Terminals**: You need **four** during the swap phase (infra + maker Basecamp + taker Basecamp; setup can share one).

### Install prerequisites

Install the following before cloning the sample app:

| Tool | Purpose |
|------|---------|
| [Rust](https://rustup.rs/) 1.93+ | Orchestrator, CLI, scaffold integration |
| [Foundry](https://book.getfoundry.sh/) (`anvil`, `forge`) | Local Ethereum chain + HTLC contract |
| GNU `make` | Repo automation targets |
| C/C++ toolchain | Native module builds |
| [Nix](https://nixos.org/) with flakes | LGX package builds |
| RISC Zero (`rzup install rust`) | LEZ HTLC program |
| `logos-scaffold` (`lgs`) on `PATH` | Module builds, Basecamp peers, LEZ localnet + wallet setup |

Install `logos-scaffold` from the **pinned upstream commit** (the sample app depends on scaffold features not yet in a tagged release):

```bash
git clone https://github.com/logos-co/logos-scaffold.git
cd logos-scaffold
git checkout 6789ec04b2ad256186a5894710c419b42d16e479
cargo install --path . --locked --bins
```

Enable Nix flakes if needed. The config file depends on how Nix was installed:

| Platform / install | Config file |
|--------------------|-------------|
| macOS (single-user Nix installer) | `~/.config/nix/nix.conf` |
| Linux (multi-user / daemon install) | `/etc/nix/nix.conf` |

Add this line (create the file if it does not exist):

```ini
experimental-features = nix-command flakes
```

> [!NOTE]
> The [Install the Logos Basecamp app](../../basecamp/get-started/install-the-logos-basecamp-app.md) procedure references `/etc/nix/nix.conf` — that path applies to typical Linux daemon installs. On macOS, use `~/.config/nix/nix.conf` (as in the [sample-app README](https://github.com/logos-co/eth-lez-atomic-swaps/blob/master/README.md)).

### First-run timing (SME dogfood, cold Nix cache)

| Step | Approx. duration | Notes |
|------|------------------|-------|
| `make setup` | 2–3 min | Longer if circuits download or `spel` rebuild |
| `lgs basecamp build` | ~26 min (first build; warm cache much faster) | Dominates first run; warm cache much faster |
| `lgs basecamp setup` | ~5 min (first run) | Builds portable Basecamp + LGPM, seeds profiles |
| `lgs basecamp install` | ~20 min (first run; also replayed automatically on first `lgs basecamp launch <profile>` per peer) | Installs LGX into `.scaffold/basecamp/profiles/` |
| `make infra` | ~20 s | Must stay running in its own terminal |
| UI swap | 1–3 min | After maker is live and Delivery connects |

**Total (first cold run):** ~30–45 min. **Subsequent runs:** ~5 min to infra + Basecamp + swap.

## Step 1: Clone and run setup

Clone at the **pinned dogfood commit** (or `master` if you accept tip-of-tree drift):

```bash
git clone --recurse-submodules https://github.com/logos-co/eth-lez-atomic-swaps.git
cd eth-lez-atomic-swaps
git checkout 5858f91fede91360d8ba95464b1ce2ec42d9fd31
make setup
```

**Expected:** `setup complete`. Circuits land under `.scaffold/lez-cache/circuits`; scaffold prepares the LEZ checkout and wallet under `.scaffold/`, and the default wallet address is seeded.

`make setup` wraps `lgs setup` in `scripts/scaffold-setup.sh`, which bridges two gaps scaffold has with the pinned LEZ v0.2.0 repo layout (tracked upstream as [scaffold#240](https://github.com/logos-co/scaffold/issues/240)). Use `make setup` rather than plain `lgs setup` until that lands in the adopted pin.

> [!TIP]
> If you cloned without submodules: `git submodule update --init --recursive`, then re-run `make setup`.

## Step 2: Build and install LGX packages

There is **no prebuilt LGX download path** in this sample app today. Build and install the packages with the scaffold-native commands:

```bash
lgs basecamp build
lgs basecamp setup
lgs basecamp install
```

**Expected:**

- `lgs basecamp build` runs the aggregate Nix module build and writes the `swap`, `swap_ui`, and `delivery_module` LGX artifacts under `.scaffold/basecamp/{lgx,portable}/`.
- `lgs basecamp setup` builds the portable `bin-macos-app` Basecamp and the `cli-portable` LGPM, then seeds scaffold's default profiles.
- `lgs basecamp install` installs the three `#lgx-portable` packages (`delivery_module` + `swap` as modules, `swap_ui` as a plugin; portable `darwin-arm64` variant on Apple Silicon) into scaffold's default profiles via `lgpm cli-portable` as a stack check. The `maker` and `taker` profiles under `.scaffold/basecamp/profiles/` are provisioned the same way automatically on their first `lgs basecamp launch`.

> [!NOTE]
> First `lgs basecamp build` can take **~26 minutes** on a cold Nix cache (see the timing table above). After changing module or UI source, re-run `lgs basecamp build` and `lgs basecamp install`: the modules are declared with `git+file:` flake refs, so any tracked-file edit changes the git tree hash and triggers a rebuild (~10 min cold). Batch tracked edits and rebuild once.

## Step 3: Start local infrastructure

In a **dedicated terminal**, start Anvil, the LEZ sequencer, and contract deployment. **Leave this running:**

```bash
make infra
```

**Expected** (tail of output):

```text
┌──────────────────────────────────────────────────┐
│  Infrastructure Ready                            │
├──────────────────────────────────────────────────┤
│  Anvil (ETH):   ws://localhost:56721             │
│  ETH HTLC:      0x5FbDB2315678afecb367f032d93F642f64180aa3
│  LEZ Sequencer: http://127.0.0.1:3040/           │
│  Maker .env:    .env                             │
│  Taker .env:    .env.taker                       │
└──────────────────────────────────────────────────┘
  Press Ctrl-C to stop all services.
```

The Anvil WebSocket port is chosen at random each run, so it will differ from the example above. `make infra` writes `.env` (maker) and `.env.taker` (taker) with the current run's values. Do not edit these while infra is running.

> [!NOTE]
> **Terminal that must stay running:** the `make infra` session. It owns Anvil, the LEZ sequencer, and the `swap-cli infra` process. If it exits, Basecamp cannot complete swaps.

### Logs and state paths (for debugging / Red Team)

| Path | Contents |
|------|----------|
| `.env`, `.env.taker` | Auto-generated maker/taker config (while infra runs) |
| `.scaffold/basecamp/profiles/maker/basecamp.log` | Maker Basecamp stdout/stderr |
| `.scaffold/basecamp/profiles/taker/basecamp.log` | Taker Basecamp stdout/stderr |
| `.scaffold/logs/` | Scaffold / localnet logs (including `sequencer.log`) |
| `.scaffold/state/` | Scaffold state (wallet state, deployment records) |
| `.scaffold/lez-cache/circuits` | Project-local circuits bundle |
| `/tmp/lgs-maker`, `/tmp/lgs-taker` | Basecamp per-profile runtime dirs |

For a structured snapshot of the resolved scaffold, circuits, module, and profile state, run `lgs doctor --json`; for Basecamp-specific state (portable stack, profiles, installed packages), run `lgs basecamp doctor --json`. Capture both when reporting a failure.

**If the swap fails, capture:** infra terminal output, both `basecamp.log` files, the `lgs doctor --json` / `lgs basecamp doctor --json` output, and note which UI step stalled. Redact logs before sharing — they may contain private keys.

## Step 4: Launch maker and taker Basecamp

Open **two more terminals** in the repo root:

```bash
# Terminal 3 — maker
lgs basecamp launch maker

# Terminal 4 — taker
lgs basecamp launch taker
```

Each window shows a role badge: **MAKER INSTANCE** or **TAKER INSTANCE**.

> [!NOTE]
> `lgs basecamp launch` works identically on macOS and Linux. On macOS the pinned portable Basecamp loads modules from an absolute per-profile `LOGOS_DATA_DIR`, which `launch` computes and sets itself since [scaffold PR #238](https://github.com/logos-co/scaffold/pull/238) — no launch bridge script is involved.

## Step 5: Configure and run the swap (UI)

**Order matters:** the maker must go live **before** the taker discovers offers.

### Maker window

1. Open the **Config** tab → click **Load Maker Env** (loads `.env`).
2. Open the **Maker** tab → click **Go Live & Publish Offer**.
3. Wait for status: **● LIVE — Listening for buyers...**
4. When the taker buys, watch progress through **ETH Claimed**.
5. Confirm **Completed Swaps (1)** appears.

### Taker window

1. Open the **Config** tab → click **Load Taker Env** (loads `.env.taker`).
2. Open the **Taker** tab → wait for Delivery (button may show **Waiting for Delivery...** briefly).
3. Click **Discover Offers** → click an offer in the list.
4. On the confirm card → click **Buy**.
5. Watch progress through **LEZ Claimed**.

## Verify success

### Primary check (UI)

- Maker: **Completed Swaps (1+)** and final step **ETH Claimed**
- Taker: swap completes; **Browse More Offers** is available
- Infra terminal: still running without crash

### Optional CLI check

Use this only after the UI swap completes. You need a **64-character hex hashlock** (32 bytes).

**Where to get the hashlock:**

1. **Refund tab (easiest):** On maker or taker, open **Refund**. After a completed swap, a green hint shows **Hashlock:** with a truncated value. The full 64-char hex is in the underlying swap result JSON.
2. **Basecamp log (Red Team):** From repo root:
   ```bash
   grep -o '"hashlock":"[0-9a-f]*"' .scaffold/basecamp/profiles/maker/basecamp.log | tail -1
   ```
   Strip the `"hashlock":"` / `"` wrapper to get the hex string.

Then run (from repo root, while `make infra` is still running):

```bash
cargo run --bin swap-cli -- --env-file .env status --hashlock <64-char-hex>
```

**Expected:** LEZ escrow state is reported (not `not_found`). You can also check ETH side with `--swap-id <64-char-hex>` using the ETH lock/claim tx hash if you have it from logs.

## Clean up

When you are done, shut everything down so ports and wallets are not left running:

1. Quit both Basecamp windows (maker and taker).
2. Press **Ctrl-C** in the `make infra` terminal.

To reset the Basecamp peers to a clean state, delete the profile directories:

```bash
rm -rf .scaffold/basecamp/profiles/maker .scaffold/basecamp/profiles/taker
```

The next `lgs basecamp launch maker` / `lgs basecamp launch taker` re-seeds each profile and reinstalls the captured packages automatically (`launch` scrubs and replays the module set on every invocation).

## Known limitations

| Limitation | Notes |
|------------|-------|
| Stop processes when done | Quit Basecamp windows and Ctrl-C `make infra`; leftover processes can hold ports and wallets |
| Four terminals | Setup, infra (persistent), maker Basecamp, taker Basecamp |
| Build LGX yourself | `lgs basecamp build` required; no prebuilt LGX path |
| Maker must be live first | Offers are advertisements; swap only works if maker is listening |
| Delivery warmup | UI may show **Waiting for Delivery...** on startup |
| Intel macOS unsupported | No `macos-x86_64` circuits bundle |
| Dev keys only | `.env` files use Anvil default keys — never reuse on mainnet |
| Logs may contain secrets | Redact Basecamp logs before sharing |

## Troubleshooting

Start with the diagnostic commands — they report the resolved scaffold, circuits, module, and profile state and flag most stale-state problems directly:

```bash
lgs doctor --json
lgs basecamp doctor --json
```

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `lgs: command not found` (or `logos-scaffold: command not found`) | Scaffold not installed, or wrong version | Install from the pinned commit: clone `logos-scaffold`, `git checkout 6789ec04b2ad256186a5894710c419b42d16e479`, `cargo install --path . --locked --bins`; add `~/.cargo/bin` to `PATH` |
| `make setup` fails | Incomplete clone or scaffold error | `git submodule update --init --recursive`; re-run `make setup` |
| **Load Maker/Taker Env** does nothing / validation errors | Infra not running or stale `.env` | Start `make infra` first; re-load after infra writes fresh `.env` files |
| **Waiting for Delivery...** for 30+ s | Delivery node starting or network delay | Wait; check internet; inspect `basecamp.log` for `delivery_module` errors |
| **Discover Offers** disabled | Delivery not connected yet | Wait until button label changes from **Waiting for Delivery...** |
| **No offers found** | Maker not live | Maker must click **Go Live & Publish Offer** before taker discovers |
| Offer visible but swap stalls | Maker offline or infra died | Confirm infra terminal still running; maker still **LIVE** |
| `Module not found` / swap tab empty | Stale or wrong LGX packages | `lgs basecamp build` then `lgs basecamp install`; restart Basecamp |
| Maker escrow-funding failure (`Guest panicked: Sender has insufficient balance` in `.scaffold/logs/sequencer.log`) | Maker wallet holds fewer than the required 1000 LEZ | The headless demo self-funds via bounded faucet claims now; for the UI flow, top up the maker with repeated `logos-scaffold wallet topup <maker-account>` calls (each pinata claim credits 150 LEZ; repeat until the maker holds ≥ 1000), then retry |
| First run very slow | Cold Nix cache | Expect ~26 min for the first `lgs basecamp build` (~10 min for cold rebuilds after source edits); subsequent builds faster |
| Port already in use after crash | Leftover infra/Basecamp | Quit Basecamp windows; Ctrl-C infra; `logos-scaffold localnet stop`; kill stray `anvil` if needed |
| Restart from scratch | Mixed stale state | Ctrl-C infra → `rm -rf .scaffold/basecamp/profiles/{maker,taker}` → `make infra` → relaunch Basecamp (`launch` re-provisions the profiles) → reload env in UI |

## See also

- [eth-lez-atomic-swaps README](https://github.com/logos-co/eth-lez-atomic-swaps/blob/master/README.md) — full repo docs (CLI, headless demo, tests)
- [Install and load a module in Logos Basecamp](../../core/build-modules/install-and-load-a-module-in-logos-basecamp.md)
