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
> **v0.1 draft** — dogfooded on Apple Silicon macOS (2026-06-05). Steps are structurally complete but this page has not been through Docs editorial review or Red Team verification. Expect rough edges on first-run timing and troubleshooting depth.

> [!NOTE]
>
> - **Permissions**: No special permissions required beyond local dev tooling.
> - **Product**: [eth-lez-atomic-swaps](https://github.com/logos-co/eth-lez-atomic-swaps) sample app (Basecamp UI).
> - **Tracking**: [logos-co/ecosystem#108](https://github.com/logos-co/ecosystem/issues/108)

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

Enable Nix flakes if needed:

```bash
mkdir -p ~/.config/nix
echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
```

## Step 1: Clone and run setup

Clone with submodules and run one-time setup from the repo root:

```bash
git clone --recurse-submodules https://github.com/logos-co/eth-lez-atomic-swaps.git
cd eth-lez-atomic-swaps
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

**Primary check (UI):**

- Maker: **Completed Swaps (1+)** and final step **ETH Claimed**
- Taker: swap completes; **Browse More Offers** is available
- Infra terminal: still running without crash

**Optional CLI check** (from repo root, while infra is running):

```bash
cargo run --bin swap-cli -- --env-file .env status --hashlock <hashlock-hex>
```

## Clean up

```bash
# Stop infra: Ctrl-C in the infra terminal
make basecamp-clean   # optional — reset local Basecamp instance state
```

## Known limitations

| Limitation | Notes |
|------------|-------|
| Four terminals | Setup, infra (persistent), maker Basecamp, taker Basecamp |
| Build LGX yourself | `make swap-lgx-build` required; no prebuilt LGX path |
| Maker must be live first | Offers are advertisements; swap only works if maker is listening |
| Delivery warmup | UI may show **Waiting for Delivery...** on startup |
| Intel macOS unsupported | No `macos-x86_64` circuits bundle |
| Dev keys only | `.env` files use Anvil default keys — never reuse on mainnet |
| Logs may contain secrets | Redact Basecamp logs before sharing |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `logos-scaffold: command not found` | Install scaffold; ensure `~/.cargo/bin` is on `PATH` |
| `make setup` fails | Re-run after installing scaffold; check submodule init |
| **No offers found** on taker | Confirm maker clicked **Go Live & Publish Offer** first |
| First run very slow | Cold Nix build for LGX; expect ~10–15 min once |
| Module missing in Basecamp | Re-run `make swap-lgx-build` + both `make basecamp-init-*` |

## See also

- [eth-lez-atomic-swaps README](https://github.com/logos-co/eth-lez-atomic-swaps/blob/master/README.md) — full repo docs (CLI, headless demo, tests)
- [Install and load a module in Logos Basecamp](../../core/build-modules/install-and-load-a-module-in-logos-basecamp.md)
