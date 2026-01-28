# Tests the AnonComms capability discovery module via its interface/API

Applies to: https://github.com/vacp2p/logos-capability-discovery-poc@main  
Runtime target: local  
Last checked: 2026-01-28  
Status: Stub  
Owner: Owner needed  
Tracking: [#151](https://github.com/logos-co/logos-docs/issues/151) (Testnet v0.1 docs inventory - journey #17)

## Outcome + value

- Outcome (end goal): Run the capability discovery PoC locally to advertise and discover nodes/services, and validate the intended discovery interface at a basic level.
- Why it matters: This is the discovery primitive that the AnonComms demo app relies on to find mix nodes for sending mixified messages (one concrete "capability discovery" instantiation for v0.1).

## Audience

- developer

## Known gaps

- Doc Packet missing
- Scope risk for v0.1: per SME note, this item may not exist as a standalone journey for v0.1; only an API spec is planned, and the interface may only be instantiated inside the demo app (no separate "capability discovery module showcase").

## Prerequisites

- OS: UNKNOWN
- Dependencies: Go toolchain (version UNKNOWN), git
- Accounts/keys: NONE (local PoC)
- Network/chain: NONE (local PoC). Testnet endpoints/chain ID: UNKNOWN
- Other: For large-scale simulations, machine resources may be a limiting factor (see "Hardware requirements" and `lcd/conf.go`).

## Hardware requirements

- Target devices: x86_64 computer (dev machine).
- Minimum: UNKNOWN (PoC unit tests should run on a typical dev machine; no published minimums)
- Recommended: UNKNOWN
- Storage profile: UNKNOWN (no published expectations)

## Configuration

- Env vars:
  - NONE KNOWN

- Flags:
  - NONE KNOWN

- Config file keys:
  - `lcd/conf.go` - parameters for large-network simulation (exact keys/fields: UNKNOWN)

- Default endpoints/ports:
  - UNKNOWN (PoC uses libp2p; ports/addresses not documented in the inventory)

## Steps (happy path)

1. Clone the PoC repository:

   ```sh
   git clone https://github.com/vacp2p/logos-capability-discovery-poc.git
   cd logos-capability-discovery-poc
   ```

2. Prepare dependencies (if needed):

   ```sh
   go mod tidy
   ```

3. Run the PoC test suite:

   ```sh
   go test ./lcd -v
   ```

4. (Optional) Run the large-network simulation test:

   - Adjust parameters in `lcd/conf.go` (what to change exactly: UNKNOWN)

   ```sh
   cd lcd
   go test -run TestLargeScale_ConfigurableNetwork -v
   ```

5. (Optional) Try the interactive playground:

   - Follow `PLAYGROUND.md` to run a Registrar, Advertiser, and Discoverer and exercise "advertise + discover services".
   - Exact commands/expected logs: UNKNOWN (PLAYGROUND content not captured into this stub).

## Expected outputs

- After step 3: `go test` completes successfully (exit code 0) and reports passing tests (for example, "PASS"/"ok" indicators).
- After step 4: the large-scale test completes successfully (exit code 0). Any detailed success indicators are UNKNOWN.
- After step 5: the Discoverer reports at least one discovered service/node record (exact output format: UNKNOWN).

## Verify

- Command:

  ```sh
  go test ./lcd -v
  ```

- Expected:

  ```sh
  - Test run exits with code 0
  - Output includes success indicators (for example: "PASS" and package "ok" lines)
  ```

## Troubleshooting (top 3-5)

- Symptom: `go: command not found`
  Cause: Go toolchain is not installed or not in PATH
  Fix/workaround: Install Go, reopen the terminal, and retry.

- Symptom: `go test` fails with dependency/module errors
  Cause: Module deps not resolved locally
  Fix/workaround: Run `go mod tidy` and retry `go test`.

- Symptom: Large-scale test is extremely slow or fails due to resource constraints
  Cause: Simulation parameters too large for the current machine
  Fix/workaround: Reduce the large-network parameters in `lcd/conf.go` and retry.

## Limits (for Testnet v0.1)

- Not supported: A documented, stable, standalone "capability discovery module" interface/API that external developers can exercise directly against Logos Testnet v0.1 (surface is unclear; may only exist inside the AnonComms demo app for v0.1).
- Known issues/sharp edges: This appears to be WIP with an RFC + PoC; final API shape, integration point, and v0.1 guarantees are UNKNOWN. (See AnonComms project management issues and roadmap.)

## References (links)

- Existing sources:

  - PoC implementation (Go): [https://github.com/vacp2p/logos-capability-discovery-poc](https://github.com/vacp2p/logos-capability-discovery-poc)
  - PoC playground guide: [https://github.com/vacp2p/logos-capability-discovery-poc/blob/main/PLAYGROUND.md](https://github.com/vacp2p/logos-capability-discovery-poc/blob/main/PLAYGROUND.md)
  - RFC (rendered): [https://dev-rfc.vac.dev/vac/raw/logos-capability-discovery.html](https://dev-rfc.vac.dev/vac/raw/logos-capability-discovery.html)

  - AnonComms v0.1 milestone/issues:

    - [https://github.com/logos-co/anoncomms-pm/issues/2](https://github.com/logos-co/anoncomms-pm/issues/2)
    - [https://github.com/logos-co/anoncomms-pm/issues/3](https://github.com/logos-co/anoncomms-pm/issues/3)

  - Roadmap pages (scope context):

    - [https://roadmap.logos.co/testnets/v01/capability-discovery-module](https://roadmap.logos.co/testnets/v01/capability-discovery-module)
    - [https://roadmap.logos.co/anoncomms/updates/2025-12-08](https://roadmap.logos.co/anoncomms/updates/2025-12-08)

  - Potential integration repos (not verified in this stub):

    - [https://github.com/logos-co/logos-capability-module](https://github.com/logos-co/logos-capability-module)
    - [https://github.com/logos-co/logos-core-poc](https://github.com/logos-co/logos-core-poc) (path mentioned in inventory: `modules/capability_module`)

- Optional:

  - NONE
