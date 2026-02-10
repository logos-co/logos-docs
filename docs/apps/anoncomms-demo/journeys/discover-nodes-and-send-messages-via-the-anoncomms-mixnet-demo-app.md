# Discover nodes with specific capabilities and send messages via the AnonComms mixnet demo app

Applies to: UNKNOWN (expected: a Logos Core demo chat app + AnonComms/mix components; likely references include `logos-co/logos-core-poc` and/or a dedicated demo repo)
Runtime target: Logos testnet v0.1  
Last checked: 2026-01-28  
Status: Stub  
Owner: Owner needed  
Tracking: GitHub issue [#148](https://github.com/logos-co/logos-docs/issues/148)  

## Outcome + value

- Outcome (end goal): Send a "mixified" message using a demo app that routes publishing over a libp2p mixnet and discovers eligible mix nodes.
- Why it matters: Demonstrates capability discovery + anonymous routing plumbing that is intended to be exercised in Testnet v0.1.

## Audience

- developer

## Known gaps

- Doc Packet missing.
- Demo app location unclear: the roadmap describes a "demo chat app in Logos Core", but no repo+version to run it was provided.

## Prerequisites

- OS: UNKNOWN
- Dependencies: UNKNOWN
- Accounts/keys: UNKNOWN
- Network/chain: UNKNOWN (endpoints, bootstrap nodes, testnet details not provided)
- Other: UNKNOWN

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

1. UNKNOWN (demo app/repo + exact build/run steps not provided)
2. UNKNOWN

## Expected outputs

- After step 1: UNKNOWN
- After step N: UNKNOWN

## Verify

- Command:

  ```sh
  UNKNOWN
````

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

- Symptom: UNKNOWN
  Cause: UNKNOWN
  Fix/workaround: UNKNOWN

## Limits (for Testnet v0.1)

- Not supported:

  - General "discover nodes with specific capabilities" across arbitrary capabilities (scope is a demo that discovers mix nodes to send mixified messages).
  - Sybil + DoS protection for the mix deployment (explicitly out of scope for the demo/testnet inclusion described in the roadmap).
- Known issues/sharp edges: UNKNOWN (link issues/PRs)

## References (links)

- Existing sources:

  - AnonComms roadmap: [https://roadmap.logos.co/anoncomms/roadmap/](https://roadmap.logos.co/anoncomms/roadmap/)
  - "Establish libp2p mixnet for Logos Core" (includes the demo chat app deliverable + notes): [https://roadmap.logos.co/anoncomms/roadmap/establish_libp2p_mixnet](https://roadmap.logos.co/anoncomms/roadmap/establish_libp2p_mixnet)
  - AnonComms update (context/progress): [https://roadmap.logos.co/anoncomms/updates/2025-12-08](https://roadmap.logos.co/anoncomms/updates/2025-12-08)
  - Logos docs "AnonComms" pointer (states public how-to docs are not published yet): [https://github.com/logos-co/logos-docs#anoncomms-anonymous-communications](https://github.com/logos-co/logos-docs#anoncomms-anonymous-communications)
  - Messaging PM milestone (mix intro context): [https://github.com/waku-org/pm/milestone/48](https://github.com/waku-org/pm/milestone/48)
