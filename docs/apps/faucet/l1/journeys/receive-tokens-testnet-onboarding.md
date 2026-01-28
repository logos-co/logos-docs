# Receives tokens from a faucet (testnet onboarding)

Applies to: https://faucet.rymnc.com (implementation appears to be based on https://github.com/pk910/PoWFaucet@UNKNOWN) 
Runtime target: Logos testnet v0.1 (dependency network appears to be Linea Sepolia; confirm) 
Last checked: 2026-01-28  
Status: Stub  
Owner: Owner needed 
Tracking: [User journey inventory spreadsheet](https://docs.google.com/spreadsheets/d/1V94fhGxwTGbyLy2u8OcZmJQIzIctIGUHHfqyyY01V3E/edit?usp=sharing) num. 9 

## Outcome + value

- Outcome (end goal): The user obtains enough testnet funds (“ETH” on Linea Sepolia) from a faucet to pay for test transactions.  
- Why it matters: Without testnet funds, a user can’t pay gas for transactions required to onboard and interact with testnet components that rely on Linea Sepolia.

## Audience

- Developer (testnet onboarding)

## Known gaps / Blockers

- Doc Packet missing: authoritative statement of **which network(s)** Logos testnet v0.1 requires for faucet funds, the **official faucet URL(s)**, **rate limits**, **eligibility**, and **what the funds are used for** in the Logos base-layer onboarding flow.  
- Primary URL in spreadsheet appears to be stale/unavailable: `https://roadmap.vac.dev/updates/2024-07-01` currently returns 404/private. 
- Scope ambiguity: the only publicly discoverable faucet reference is a **Linea Sepolia** faucet created “to bootstrap new operators for Waku”; it’s not clearly documented as a Logos base-layer faucet. Needs confirmation from SMEs.

## Prerequisites

- OS: Any (macOS, Linux, Windows)
- Dependencies:
  - A modern web browser with JavaScript enabled (the faucet requires JavaScript).
- Accounts/keys:
  - An EVM address (an “ETH Address”) to receive funds.
- Network/chain:
  - Network name: Linea Sepolia (Linea Testnet / Sepolia).
  - Chain ID: 59141  
  - RPC endpoint: https://rpc.sepolia.linea.build  
- Other:
  - UNKNOWN (rate limits / mining difficulty / minimum claim threshold are not documented in the sources we found). 

## Hardware requirements

- Target devices: Laptop/desktop capable of running a modern browser
- Minimum: UNKNOWN (browser-based; PoW mining will be slower on low-power devices)
- Recommended: UNKNOWN
- Storage profile: N/A
- RPi notes (if supported): UNKNOWN

## Configuration

- Env vars:
  - NONE (browser-based flow)

- Flags:
  - NONE

- Config file keys:
  - NONE

- Default endpoints/ports:
  - HTTPS (443) to access the faucet website: https://faucet.rymnc.com
  - RPC (HTTPS) to broadcast transactions (wallet-dependent): https://rpc.sepolia.linea.build

## Steps (happy path)

1. Open the Linea Sepolia faucet in a browser: https://faucet.rymnc.com
2. In the faucet page, enter your **ETH Address** (your EVM wallet address).
3. Start the faucet’s mining process and keep it running until you’ve collected enough testnet funds. 
4. Stop mining and claim your rewards (the faucet describes this as “claim your rewards”). 
5. In your wallet, ensure you’re viewing the **Linea Sepolia** network (chain ID **59141**) and confirm the received balance.

## Expected outputs

- After step 1: The faucet page loads and indicates JavaScript is required.
- After step 3: The faucet shows progress toward “collected enough ETH” (exact UI text/threshold UNKNOWN).
- After step 4: Your wallet address receives a testnet ETH balance on Linea Sepolia (confirmation method depends on wallet; exact amount UNKNOWN).

## Verify

- Command:

  ```sh
  UNKNOWN
  ```
(Verification is wallet- or explorer-based in the available sources. If Logos wants CLI verification, we need the intended tooling + RPC method.)

- Expected:

  ```sh
  - Your wallet shows a non-zero balance on Linea Sepolia (chain ID 59141).
  - You can later submit at least one test transaction that consumes gas (amount/rate limits UNKNOWN).
  ```

## Troubleshooting (top 3-5)

- Symptom: The faucet page says JavaScript is required, or the UI doesn’t work.
    Cause: JavaScript is disabled or blocked by extensions.
    Fix/workaround: Enable JavaScript for the site, disable script-blocking extensions for the faucet domain, and reload.

- Symptom: You mined but your wallet balance didn’t change after claiming.
    Cause: You entered the wrong address, selected the wrong network, or you’re checking a different chain.
    Fix/workaround: Confirm you’re checking Linea Sepolia (chain ID 59141) and re-check the address you submitted.

- Symptom: Mining is extremely slow.
    Cause: PoW-based faucets deliberately require “some mining work” to limit abuse; performance depends on your device.
    Fix/workaround: Use a more powerful machine, close heavy browser tabs, and let mining run longer.

- Symptom: Faucet appears drained or unusable.
    Cause: UNKNOWN (could be service downtime or low reserves).
    Fix/workaround: Check back later. If you already have excess funds, the faucet page includes a replenish address (but Logos should confirm whether this is appropriate for contributors).

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN (no authoritative Logos testnet v0.1 faucet spec found).
- Known issues/sharp edges:
    - The faucet currently described is PoW-based and requires browser JavaScript; this may be a poor fit for fully automated onboarding flows.
    - The spreadsheet’s “Primary URL” reference may be out of date or private, so the source of truth is unclear.

## References (links)

- VAC weekly update referencing the faucet creation: https://roadmap.vac.dev/archive/2024h1/vac/updates/2024-07-01
- Faucet UI: https://faucet.rymnc.com
- Upstream faucet software (likely): https://github.com/pk910/PoWFaucet
- Linea Sepolia chain ID / RPC evidence (referenced in related deployment tooling): https://github.com/logos-messaging/logos-messaging-rlnv2-contract/commit/28a8cc00b5a25a111add03ea36aeb64a30e8387b
