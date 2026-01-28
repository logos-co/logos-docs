# Run a validator / consensus node (includes staking)

Applies to: https://github.com/logos-blockchain/logos-blockchain@3f15894  
Runtime target: Logos testnet v0.1  
Last checked: 2026-01-28  
Status: Stub  
Owner: Owner needed  
Tracking: https://github.com/logos-co/logos-docs/issues/137 (Spreadsheet: “Testnet  v0.1 -- Docs in scope.xlsx”, row #10)

## Outcome + value

- Outcome (end goal): Run a Logos Blockchain consensus/validator node and (if supported) stake/register it to participate in the testnet.
- Why it matters: Validates that testnet participants can independently operate consensus infrastructure for v0.1.

## Audience

- node operator

## Known gaps / Blockers

- Doc Packet missing: runnable “join testnet + validator registration + staking” steps, required keys/credentials, expected outputs, and v0.1 operational limits (see tracking issue labels: blocker:needs-doc-packet, status:stub).
- Notion/repo mapping needed: README mentions mdBook docs (“book/”) and testnet configs, but direct operator-ready instructions for staking/validator onboarding are not available from the accessible sources.
- Testnet-specific configuration: chain ID, bootnodes/seed peers, required open ports, and monitoring expectations are UNKNOWN.

## Prerequisites

- OS: Linux (recommended for ops) OR Windows (supported for some setup steps) — exact supported OS matrix: UNKNOWN
- Dependencies:
  - Rust (latest stable targeted): required
  - Docker: optional (for Docker-based run)
  - LLVM/clang toolchain: required on Windows for some builds (LIBCLANG_PATH)
- Accounts/keys:
  - Validator identity keys: UNKNOWN
  - Staking/account keys and funding requirements: UNKNOWN
- Network/chain:
  - Network name: Logos testnet v0.1
  - Chain ID: UNKNOWN
  - RPC / peer endpoints: UNKNOWN
- Other:
  - Zero-knowledge circuits binaries/keys installed (see “Setting Up Zero-Knowledge Circuits” in repo README)

## Hardware requirements

- Target devices: x86_64 computer (server or workstation) — exact supported architectures: UNKNOWN
- Minimum: UNKNOWN (CPU/RAM/storage/network)
- Recommended: UNKNOWN (CPU/RAM/storage/network)
- Storage profile: UNKNOWN
- RPi notes (if supported): UNKNOWN

## Configuration

- Env vars:
  - LOGOS_BLOCKCHAIN_CIRCUITS=<path> - points the node/build to a custom circuits install directory (required when not using default install location)
  - LIBCLANG_PATH=<path> - Windows: location of 64-bit libclang.dll directory for builds
  - CONSENSUS_SLOT_TIME=5 - example consensus timing parameter used in local runs (meaning/production value: UNKNOWN)
  - POL_PROOF_DEV_MODE=true - enables development mode behavior used in local runs (security implications: UNKNOWN)

- Flags:
  - --dev-mode-reset-chain-clock - starts node with chain start time set to “now” (dev-mode)

- Config file keys:
  - time.backend.ntp_server=pool.ntp.org - NTP source used by the node (role in production: UNKNOWN)
  - time.chain_start_time=<timestamp> - chain start time; must be close to current time for some local/dev configs
  - global_params_path=<path> - path to global params required by the node (format/content: UNKNOWN)

- Default endpoints/ports:
  - UNKNOWN (P2P ports, metrics, RPC, HTTP APIs)

## Steps (happy path)

> NOTE: The accessible upstream README documents how to run a node locally or via Docker. It does NOT document how to (a) join the public testnet, (b) register as a validator, or (c) stake. Those parts remain UNKNOWN and are tracked as blockers.

1. Clone the repository.

   ```sh
   git clone https://github.com/logos-blockchain/logos-blockchain.git
   cd logos-blockchain
   ```

2. Install the zero-knowledge circuits (recommended path from repo).

    Linux:

    ```sh
    ./scripts/setup-logos-blockchain-circuits.sh

    Windows:

    ```powershell
    .\scripts\setup-logos-blockchain-circuits.ps1
    ```
    If you installed circuits to a custom directory, set `LOGOS_BLOCKCHAIN_CIRCUITS` to that path.

3. Build the node binaries (local build).

    ```sh
    cargo build --all-features --all-targets
    ```

4. Run a single-node local network using the provided example config (dev-mode).

    ```sh
    CONSENSUS_SLOT_TIME=5 POL_PROOF_DEV_MODE=true target/debug/logos-blockchain-node nodes/node/config-one-node.yaml
    ```

5. (If you see chain clock errors) restart with dev-mode chain clock reset.

    ```sh
    CONSENSUS_SLOT_TIME=5 POL_PROOF_DEV_MODE=true target/debug/logos-blockchain-node nodes/node/config-one-node.yaml --dev-mode-reset-chain-clock
    ```

6. OPTIONAL: Run the “one node testnet” integration test (programmatic run path).

    ```sh
    CONSENSUS_SLOT_TIME=5 POL_PROOF_DEV_MODE=true cargo test --all-features local_testnet_one_node -- --ignored --nocapture
    ```

7. Join Logos testnet v0.1 as a validator (network peering, keys, registration, staking).

    ```sh
    UNKNOWN
    ```

## Expected outputs

- After step 2: UNKNOWN (successful install indicators for circuits)
- After step 4: UNKNOWN (expected logs, expected “node started” markers, expected directories/files)
- After step 6: UNKNOWN (what a passing test looks like beyond “test passed”)

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

- Symptom: `ERROR chain_leader: trying to propose a block for slot XXXX but epoch state is not available`
    Cause: `chain_start_time` is too far in the past for the selected config.
    Fix/workaround:
    - Update `time.chain_start_time` in `nodes/node/config-one-node.yaml` to a recent UTC timestamp, OR
    - Start the node with `--dev-mode-reset-chain-clock`.

- Symptom: Node fails after restart / behaves inconsistently.
    Cause: Persisted local state in the `db` directory (for local runs).
    Fix/workaround: Stop the node and remove the `db` directory, then restart.

- Symptom: Circuits-related build/runtime failures (missing binaries/keys).
    Cause: Circuits not installed to the expected default path, or the node cannot find them.
    Fix/workaround: Re-run the circuits setup script; if using a custom install path, set `LOGOS_BLOCKCHAIN_CIRCUITS` accordingly.

- Symptom: Docker run fails due to missing mounted files.
    Cause: The Docker invocation requires both a config and the `global_params_path` file(s) referenced by that config.
    Fix/workaround: Ensure you mount `config.yml` and the global params directory/file to the paths expected inside the container.

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN
- Known issues/sharp edges:
    - Validator registration and staking procedure is not documented in the accessible sources (tracked as “needs doc packet” in the tracking issue).

## References

- Existing sources:
    - https://github.com/logos-blockchain/logos-blockchain (README: “Setting Up Zero-Knowledge Circuits”, “Running a Logos Blockchain Node”)
    - https://github.com/logos-blockchain/logos-blockchain/commits/master/ (example SHA: 3f15894)
    - https://github.com/logos-co/logos-docs/issues/137 (tracking issue)

- Optional:
    - https://github.com/logos-blockchain/logos-blockchain-specs (spec repo; does not currently provide operator steps for validator onboarding/staking)
