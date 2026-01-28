# Use an LSSA transaction generator to stress-test Logos testnet

Applies to: https://github.com/logos-blockchain/lssa@UNKNOWN  
Runtime target: Logos testnet v0.1  
Last checked: 2026-01-28  
Status: Stub  
Owner: Owner needed  
Tracking: GitHub issue [#153](https://github.com/logos-co/logos-docs/issues/153)  

## Outcome + value

- Outcome (end goal): Generate a sustained, high-volume stream of LSSA transactions against the v0.1 testnet to measure throughput (TPS) and latency under load.
- Why it matters: Provides an evidence-based performance baseline for v0.1 and helps identify bottlenecks (client/prover, sequencer, networking, node resources) before broader developer adoption.

## Audience

- developer
- tester

## Known gaps

- Doc Packet missing:
- Limits for v0.1 (what is not supported, known sharp edges): UNKNOWN
- Reviewer handle (SME who can confirm correctness): UNKNOWN

## Prerequisites

- OS: UNKNOWN
- Dependencies: UNKNOWN
- Accounts/keys: UNKNOWN (likely needs a funded testnet account/keypair, but details are UNKNOWN)
- Network/chain: UNKNOWN (network name/chain ID + RPC/endpoint(s) to target are UNKNOWN)
- Other: UNKNOWN (metrics collection/observability expectations are UNKNOWN)

## Hardware requirements

- Target devices: UNKNOWN
- Minimum: UNKNOWN
- Recommended: UNKNOWN
- Storage profile: UNKNOWN

## Configuration

- Env vars:
  - UNKNOWN

- Flags:
  - UNKNOWN

- Config file keys:
  - UNKNOWN

- Default endpoints/ports:
  - UNKNOWN

## Steps (happy path)

1. UNKNOWN (how to obtain/build the transaction generator tooling)
2. UNKNOWN (how to point the generator at Logos testnet v0.1 / LSSA chain endpoint)
3. UNKNOWN (how to configure load parameters: rate, concurrency, duration, accounts, tx type)
4. UNKNOWN (how to start the run and collect TPS/latency results)

## Expected outputs

- After step 1: UNKNOWN
- After step N: UNKNOWN (TPS/latency reporting format is UNKNOWN)

## Verify

- Command:

  ```sh
  UNKNOWN
  ```

- Expected:

  ```sh
  UNKNOWN
  ```

## Troubleshooting (top 3-5)

- Symptom: UNKNOWN
  Cause: UNKNOWN
  Fix/workaround: UNKNOWN

- Symptom: UNKNOWN
  Cause: UNKNOWN
  Fix/workaround: UNKNOWN

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN
- Known issues/sharp edges: UNKNOWN

## References (links)

- Existing sources:

  - [https://github.com/logos-blockchain/lssa](https://github.com/logos-blockchain/lssa) (root; integration_tests/, sequencer_runner/, wallet/)
  - [https://vac.dev/rlog/Nescience-state-separation-architecture](https://vac.dev/rlog/Nescience-state-separation-architecture)

- Optional: UNKNOWN
