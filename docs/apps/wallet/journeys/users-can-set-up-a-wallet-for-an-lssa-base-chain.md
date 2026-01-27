# Users can set up a wallet for an LSSA-based chain

Applies to: https://github.com/logos-blockchain/lssa@main  
Runtime target: other (local LSSA sequencer + wallet CLI per repo README)  
Last checked: Jan 27, 2026
Status: Stub  
Owner: Owner needed  
Tracking: [User journey inventory spreadsheet](https://docs.google.com/spreadsheets/d/1V94fhGxwTGbyLy2u8OcZmJQIzIctIGUHHfqyyY01V3E/edit?usp=sharing) num. 1

## Outcome + value

- Outcome (end goal): Install and run the LSSA wallet CLI and create an account ID you can use to interact with an LSSA sequencer.
- Why it matters: Confirms the minimum client-side setup needed to exercise LSSA flows (accounts, tokens, programs) as part of Testnet v0.1.

## Audience

- developer
- tester

## Known gaps / Blockers

- [Doc Packet](../../../_shared/templates/doc-packet-testnet-v01.md) missing.
- Notion/repo mapping needed.
- Hardware guidance: no official minimum/recommended specs provided.

## Prerequisites

- OS: Linux (Ubuntu/Debian or Fedora) or macOS (per repository README); Windows: UNKNOWN
- Dependencies:
  - Linux (Ubuntu/Debian): build-essential, clang, libclang-dev, libssl-dev, pkg-config
  - Linux (Fedora): clang, clang-devel, openssl-devel, pkgconf
  - macOS: Xcode command line tools; Homebrew packages pkg-config and openssl
  - Rust toolchain via rustup
  - Risc0 toolchain (rzup)
- Accounts/keys: None required up front; the wallet CLI generates key material when creating accounts.
- Network/chain:
  - Local: sequencer HTTP server listens on 0.0.0.0:3040 when running the sequencer locally.
  - Logos testnet v0.1 endpoints/chain ID: UNKNOWN
- Other: Some wallet operations (proof generation) can take significant time depending on machine; no official minimum specs documented.

## Hardware requirements

- Target devices: x86_64 developer machine (local build + local sequencer); RPi: UNKNOWN
- Minimum: UNKNOWN
- Recommended: UNKNOWN
- Storage profile: UNKNOWN

## Configuration

- Env vars:
  - UNKNOWN (no wallet config env vars documented in the README for the basic "wallet install + connect" flow).
- Flags:
  - UNKNOWN
- Config file keys:
  - UNKNOWN
- Default endpoints/ports:
  - 3040/tcp - sequencer HTTP server (local run).

## Steps (happy path)

1. Clone the repo and install dependencies (example for Ubuntu/Debian; adjust for Fedora/macOS):

   ```sh
   git clone https://github.com/logos-blockchain/lssa.git
   cd lssa
   sudo apt install build-essential clang libclang-dev libssl-dev pkg-config
   ```

2. UNKNOWN
