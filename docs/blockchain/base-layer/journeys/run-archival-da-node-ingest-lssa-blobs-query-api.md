# Run an archival DA node (Logos base layer)

Applies to: https://github.com/logos-blockchain/logos-blockchain
Runtime target: Logos testnet v0.1  
Last checked: 2026-01-28  
Status: Stub  
Owner: Owner needed  
Tracking: https://github.com/logos-co/logos-docs/issues/138

## Outcome + value

- Outcome (end goal): Run an archival data-availability (DA) node that follows the Logos base layer, ingests LSSA blobs, and exposes an API to query LSSA state.
- Why it matters: This is required for rollup tooling to fetch/verify historical DA data against the base layer during Testnet v0.1.

## Audience

- node operator

## Known gaps / Blockers

- Doc Packet missing: runnable steps for “archival DA node” on Testnet v0.1 (repo version, exact binary/container, required config, ports, expected logs/health checks, API surface, and known limits).
- Doc Packet missing: which component is the “DA node” (service name/binary) in `logos-blockchain/logos-blockchain` and how it connects to LSSA (peering + data flow).
- Doc Packet missing: storage sizing guidance (expected disk growth for “archival” blob retention, SSD requirement, pruning/compaction behavior).
- Notion/repo mapping needed: any internal “DA node” / “archival” instructions that aren’t in the public repo yet. UNKNOWN.

## Prerequisites

- OS: UNKNOWN (likely Linux for operators; not confirmed)
- Dependencies: UNKNOWN (likely Rust toolchain and/or Docker; not confirmed for DA node specifically)
- Accounts/keys: UNKNOWN
- Network/chain: UNKNOWN (chain ID, bootnodes, and endpoints for Testnet v0.1 DA mode not specified)

## Hardware requirements

- Target devices: UNKNOWN
- Minimum: UNKNOWN
- Recommended: UNKNOWN
- Storage profile: UNKNOWN (archival implies significant disk growth; needs SME guidance)

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

1. UNKNOWN (identify the archival DA node binary/container for Testnet v0.1)
2. UNKNOWN (configure DA mode, network peering, and storage paths)
3. UNKNOWN (start the node and confirm it is ingesting LSSA blobs)
4. UNKNOWN (query the node’s API for LSSA state/data)

## Expected outputs

- After step 1: UNKNOWN
- After step N: UNKNOWN (expected logs/metrics that confirm blob ingestion + API readiness)

## Verify

- Command:

  ```sh
  UNKNOWN
````

- Expected:

  ```sh
  - UNKNOWN (clear success indicators: DA sync/integrity + API responds)
  ```

## Troubleshooting (top 3-5)

- Symptom: Node fails to start due to missing dependencies.
  Cause: UNKNOWN
  Fix/workaround: Confirm the official install/run method for the DA node (binary vs container) and its dependencies. UNKNOWN.

- Symptom: Node starts but does not ingest blobs / never “catches up”.
  Cause: UNKNOWN (peering/bootnodes, wrong network, firewall, LSSA connectivity)
  Fix/workaround: Verify network configuration (bootnodes/peers), open required ports, and confirm you are on the correct Testnet v0.1 network. UNKNOWN.

- Symptom: API queries fail or time out.
  Cause: UNKNOWN (API disabled, wrong port/bind address, indexing not complete)
  Fix/workaround: Confirm API bind address/port in config and wait for indexing to complete (if applicable). UNKNOWN.

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN
- Known issues/sharp edges: UNKNOWN (link issues/PRs)

## References (links)

- Tracking issue: [https://github.com/logos-co/logos-docs/issues/138](https://github.com/logos-co/logos-docs/issues/138)
- Logos blockchain node repo (Nomos redirect): [https://github.com/logos-blockchain/logos-blockchain](https://github.com/logos-blockchain/logos-blockchain)
- DAS research repo (background): [https://github.com/logos-storage/das-research](https://github.com/logos-storage/das-research)
- Logos docs repo (use-cases list mentions “Run an archival DA node”): [https://github.com/logos-co/logos-docs](https://github.com/logos-co/logos-docs)
