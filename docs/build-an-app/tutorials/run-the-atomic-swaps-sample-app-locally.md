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
> **v0.1 draft** — SME dogfooded; not yet through Docs editorial review or Red Team end-to-end verification. Expect timing estimates and troubleshooting to tighten after Red Team runs a clean machine.

> [!NOTE]
>
> - **Permissions**: No special permissions required beyond local dev tooling.
> - **Product**: [eth-lez-atomic-swaps](https://github.com/logos-co/eth-lez-atomic-swaps) sample app (Basecamp UI).
> - **Tracking**: [logos-co/ecosystem#108](https://github.com/logos-co/ecosystem/issues/108)

### Tested with (SME dogfood, 2026-06-05)

| Item | Value |
|------|-------|
| Sample app | [`eth-lez-atomic-swaps`](https://github.com/logos-co/eth-lez-atomic-swaps) @ [`608179e`](https://github.com/logos-co/eth-lez-atomic-swaps/commit/608179e7c5285a10d35cc9f5cd727e3d56f6a27a) |
| Host | Apple Silicon macOS (`arm64`), darwin 25.4 |
| `logos-scaffold` | 0.1.1 (`~/.cargo/bin/logos-scaffold`) |
| Rust (host) | 1.95.0 (repo pins 1.93 in `rust-toolchain.toml`) |
| Basecamp | `bin-macos-app` via Nix (`logos-basecamp` @ `a90f7d1`) |
| Swap outcome | Happy-path UI swap completed (maker + taker Basecamp) |

> [!TIP]
> Red Team should clone the **pinned commit** above, not floating `master`, unless intentionally testing tip-of-tree.

This quickstart walks you through the **default manual Basecamp flow**: two isolated Basecamp instances (maker and taker) plus a long-running local infrastructure process (Anvil + LEZ sequencer). By the end, you will have completed a happy-path atomic swap using hash time-locked contracts (HTLCs) on both chains.

> [!NOTE]
>
> This guide covers the **happy path only**. Headless (`make demo`) and CLI-only flows exist in the sample-app README but are out of scope here. The README also contains legacy logos-app screenshots; the current UI uses Basecamp tabs (**Config**, **Maker**, **Taker**, **Refund**).

## Before you start

- **Audience**: Developers comfortable with the terminal and multi-terminal workflows.
- **Platform**: Apple Silicon macOS (`arm64`), or Linux (`x86_64` / `aarch64`). **Intel macOS is not supported** (no published circuits bundle).
- **Time**: ~30–45 minutes on a **first cold run** (mostly Nix LGX build); ~5 minutes on subsequent runs with warm caches.
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
| `logos-scaffold` on `PATH` | LEZ localnet + wallet setup |

Install `logos-scaffold` from a local clone:

```bash
git clone https://github.com/logos-co/logos-scaffold.git
cd logos-scaffold
cargo install --path .
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
> The [Install the Logos Basecamp app](../../basecamp/get-started/install-the-logos-basecamp-app.md) procedure references `/etc/nix/nix.conf` — that path applies to typical Linux daemon installs. On macOS, use `~/.config/nix/nix.conf` (as in the [sample-app README](https://github.com/logos-co/eth-lez-atomic-swaps/blob/608179e7c5285a10d35cc9f5cd727e3d56f6a27a/README.md)).

### First-run timing (SME dogfood, cold Nix cache)

| Step | Approx. duration | Notes |
|------|------------------|-------|
| `make setup` | 2–3 min | Longer if circuits download or `spel` rebuild |
| `make swap-lgx-build` | ~9 min | Dominates first run; warm cache much faster |
| `make basecamp-init-*` | ~40 s each | Installs LGX into `.basecamp/` |
| `make infra` | ~20 s | Must stay running in its own terminal |
| UI swap | 1–3 min | After maker is live and Delivery connects |

**Total (first cold run):** ~30–45 min. **Subsequent runs:** ~5 min to infra + Basecamp + swap.

## Step 1: Clone and run setup

Clone at the **pinned dogfood commit** (or `master` if you accept tip-of-tree drift):

```bash
git clone --recurse-submodules https://github.com/logos-co/eth-lez-atomic-swaps.git
cd eth-lez-atomic-swaps
git checkout 608179e7c5285a10d35cc9f5cd727e3d56f6a27a
make setup
```

**Expected:** `setup complete`. Circuits land under `.scaffold/circuits`; scaffold prepares wallet and LEZ checkout under `.scaffold/`.

> [!TIP]
> If you cloned without submodules: `git submodule update --init --recursive`, then re-run `make setup`.

## Step 2: Build and install LGX packages

There is **no prebuilt LGX download path** in this sample app today. Build installable packages yourself:

```bash
make swap-lgx-build
make basecamp-init-maker
make basecamp-init-taker
```

**Expected (init):** Each init installs `delivery_module`, `swap`, and `swap_ui` (portable `darwin-arm64` variant on Apple Silicon) into `.basecamp/maker/` and `.basecamp/taker/`.

> [!NOTE]
> First `make swap-lgx-build` can take **~10 minutes** on a cold Nix cache. Re-run `make swap-lgx-build` and both `make basecamp-init-*` targets after changing module or UI source.

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

`make infra` writes `.env` (maker) and `.env.taker` (taker). Do not edit these while infra is running.

> [!NOTE]
> **Terminal that must stay running:** the `make infra` session. It owns Anvil, the LEZ sequencer, and the `swap-cli infra` process. If it exits, Basecamp cannot complete swaps.

### Logs and state paths (for debugging / Red Team)

| Path | Contents |
|------|----------|
| `.env`, `.env.taker` | Auto-generated maker/taker config (while infra runs) |
| `.basecamp/maker/basecamp.log` | Maker Basecamp stdout/stderr |
| `.basecamp/taker/basecamp.log` | Taker Basecamp stdout/stderr |
| `.basecamp/maker/data/logs/` | Rotated Basecamp logs (maker) |
| `.basecamp/taker/data/logs/` | Rotated Basecamp logs (taker) |
| `.scaffold/logs/` | Scaffold / localnet logs |
| `/tmp/lbc-maker`, `/tmp/lbc-taker` | Basecamp XDG runtime dirs |

**If the swap fails, capture:** infra terminal output, both `basecamp.log` files, and note which UI step stalled. Redact logs before sharing — they may contain private keys.

## Step 4: Launch maker and taker Basecamp

Open **two more terminals** in the repo root:

```bash
# Terminal 3 — maker
make basecamp-run-maker

# Terminal 4 — taker
make basecamp-run-taker
```

Each window shows a role badge: **MAKER INSTANCE** or **TAKER INSTANCE**.

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
   grep -o '"hashlock":"[0-9a-f]*"' .basecamp/maker/basecamp.log | tail -1
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
3. Optionally reset local Basecamp state:

```bash
make basecamp-clean
```

## Known limitations

| Limitation | Notes |
|------------|-------|
| Stop processes when done | Quit Basecamp windows and Ctrl-C `make infra`; leftover processes can hold ports and wallets |
| Four terminals | Setup, infra (persistent), maker Basecamp, taker Basecamp |
| Build LGX yourself | `make swap-lgx-build` required; no prebuilt LGX path |
| Maker must be live first | Offers are advertisements; swap only works if maker is listening |
| Delivery warmup | UI may show **Waiting for Delivery...** on startup |
| Intel macOS unsupported | No `macos-x86_64` circuits bundle |
| Dev keys only | `.env` files use Anvil default keys — never reuse on mainnet |
| Logs may contain secrets | Redact Basecamp logs before sharing |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `logos-scaffold: command not found` | Scaffold not installed | `cargo install --path .` from `logos-scaffold`; add `~/.cargo/bin` to `PATH` |
| `make setup` fails | Incomplete clone or scaffold error | `git submodule update --init --recursive`; re-run `make setup` |
| **Load Maker/Taker Env** does nothing / validation errors | Infra not running or stale `.env` | Start `make infra` first; re-load after infra writes fresh `.env` files |
| **Waiting for Delivery...** for 30+ s | Delivery node starting or network delay | Wait; check internet; inspect `basecamp.log` for `delivery_module` errors |
| **Discover Offers** disabled | Delivery not connected yet | Wait until button label changes from **Waiting for Delivery...** |
| **No offers found** | Maker not live | Maker must click **Go Live & Publish Offer** before taker discovers |
| Offer visible but swap stalls | Maker offline or infra died | Confirm infra terminal still running; maker still **LIVE** |
| `Module not found` / swap tab empty | Stale or wrong LGX variant | `make swap-lgx-build` then both `make basecamp-init-*`; restart Basecamp |
| First run very slow | Cold Nix cache | Expect ~10 min for `make swap-lgx-build`; subsequent builds faster |
| Port already in use after crash | Leftover infra/Basecamp | Quit Basecamp windows; Ctrl-C infra; `logos-scaffold localnet stop`; kill stray `anvil` if needed |
| Restart from scratch | Mixed stale state | Ctrl-C infra → `make basecamp-clean` → `make infra` → relaunch Basecamp → reload env in UI |

## See also

- [eth-lez-atomic-swaps README](https://github.com/logos-co/eth-lez-atomic-swaps/blob/master/README.md) — full repo docs (CLI, headless demo, tests)
- [Install and load a module in Logos Basecamp](../../core/build-modules/install-and-load-a-module-in-logos-basecamp.md)
