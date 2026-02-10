# Use the Logos Storage module API

Applies to: https://codex.storage/about; https://github.com/logos-storage/logos-storage-nim; https://github.com/logos-storage/logos-storage-installer
Runtime target: local  
Last checked: 2026-01-28  
Status: Stub  
Owner: Owner needed  
Tracking: GitHub issue [#144](https://github.com/logos-co/logos-docs/issues/144)

## Outcome + value

- Outcome (end goal): Call the Logos Storage (Codex) REST API to upload, download, and query stored content from an available Logos Storage node.
- Why it matters: Provides the baseline developer workflow for integrating storage into apps during Testnet v0.1 (even if the node runs locally at first).

## Audience

- developer

## Known gaps / Blockers

- Doc Packet missing: Confirm whether “Logos Storage module API” means:
  - (A) the Codex REST API exposed by a Logos Storage node, or
  - (B) a Logos “module wrapper” API (language bindings / SDK) meant to be called from Logos Core modules.
- Doc Packet missing: Testnet v0.1 target endpoints (public node URL(s), any auth, rate limits, and expected latencies). Current public API docs default to `localhost`.
- Doc Packet missing: which API subset is “in scope” for Testnet v0.1 (upload/download only vs marketplace contracts, retention/proofs, etc.).
- Notion/repo mapping needed: any internal doc packet or “module API” definition used by the team. UNKNOWN.

## Prerequisites

- OS: Windows / macOS / Linux (local API usage via HTTP; node runtime may vary)
- Dependencies:
  - A running Logos Storage node (local or remote). For local setup options:
    - Use the Codex installer CLI (`codexstorage`) to install/run a node, or
    - Build and run `logos-storage-nim` from source. (Both approaches exist; choose one.)
  - HTTP client tooling (for examples): `curl` or an API client (Postman/Insomnia).
- Accounts/keys: UNKNOWN (the REST API docs do not describe auth; confirm if testnet requires any)
- Network/chain: For local node, default API base URL is typically `http://localhost:8080/api/storage/v1` (confirm at runtime).
- Other: If using the installer CLI, Node.js 14+ is required.

## Hardware requirements

- Target devices: x86_64 computer (for running a local node); calling a remote API has no special requirements.
- Minimum: UNKNOWN (depends on whether you run a node locally; no sizing guidance in scope docs)
- Recommended: UNKNOWN
- Storage profile: UNKNOWN
- RPi notes (if supported): UNKNOWN

## Configuration

- Env vars:
  - UNKNOWN

- Flags:
  - Installer CLI:
    - `codexstorage --upload <filename>` - upload a file (CLI helper; not REST)
    - `codexstorage --download <cid>` - download a file (CLI helper; not REST)
  - REST API: typically configured by the node (port/bind address). Specific flags are UNKNOWN.

- Config file keys:
  - UNKNOWN (node-specific; not described in the API reference)

- Default endpoints/ports:
  - `http://localhost:8080/api/storage/v1` - REST API base URL (as shown in API reference)
  - Port(s) used by the p2p protocol and any marketplace/chain integration: UNKNOWN

## Steps (happy path)

1. Install and start a local Logos Storage node (one option: installer CLI).

   ```sh
   # Install globally
   npm install -g codexstorage

   # Or run without installing
   npx codexstorage
   ```
   In interactive mode, run `codexstorage` and use the menu to:

  - Download/install Codex
  - Run Codex node

2. Confirm the REST API is reachable (base URL shown in the API reference):

   ```sh
   curl -sS http://localhost:8080/api/storage/v1/debug/info
   ```

3. Upload a file via REST API (multipart form upload).

   ```sh
   curl -sS \
     -X POST "http://localhost:8080/api/storage/v1/data" \
     -F "file=@PATH-TO-FILE"
   ```

4. Record the returned `cid` value from the upload response.

5. Check whether the content exists.

   ```sh
   curl -sS "http://localhost:8080/api/storage/v1/exists/CID"
   ```

6. Download the file back.

   ```sh
   curl -L \
     "http://localhost:8080/api/storage/v1/data/CID" \
     -o OUTPUT-FILENAME
   ```

7. (Optional) Delete locally-stored content (behavior depends on node policy; confirm for testnet).

   ```sh
   curl -sS -X DELETE "http://localhost:8080/api/storage/v1/data/CID"
   ```

## Expected outputs

- After step 2: a JSON response describing the node (shape may vary; expect HTTP 200).
- After step 3: a JSON response that includes a `cid` field (and potentially manifest metadata).
- After step 5: `true` if the node can resolve the CID; otherwise `false`.
- After step 6: the downloaded file matches the original file bytes (compare hashes to verify).

## Verify

- Command:

  ```sh
  curl -sS http://localhost:8080/api/storage/v1/debug/info
  ```

- Expected:

  ```sh
  - HTTP 200
  - JSON body (node info present)
  ```

## Troubleshooting (top 3-5)

- Symptom: `curl: (7) Failed to connect` / connection refused.
  Cause: Node is not running, or API is bound to a different port/interface.
  Fix/workaround: Start the node, then confirm the actual API bind address/port in logs or config. If using the installer CLI, ensure “Run Codex node” completed successfully.

- Symptom: Upload returns an error (non-2xx).
  Cause: File path incorrect, node not ready, or request exceeds configured limits.
  Fix/workaround: Confirm `PATH-TO-FILE` exists, retry after node is fully started, and check node logs for request size limits. UNKNOWN for exact limits.

- Symptom: `exists/CID` returns `false` right after upload.
  Cause: CID mismatch or eventual consistency across subsystems.
  Fix/workaround: Ensure you’re using the exact `cid` returned by the upload call; retry after a short delay and inspect logs. UNKNOWN if indexing delay exists.

- Symptom: Download returns 404 / not found.
  Cause: CID not available from the node you’re querying.
  Fix/workaround: Confirm you’re querying the same node you uploaded to, or that the node can fetch the CID from the network (peer connectivity). Peer requirements are UNKNOWN.

## Limits (for Testnet v0.1)

- Not supported: UNKNOWN (scope of storage features for Logos Testnet v0.1 not defined in spreadsheet)
- Known issues/sharp edges:

  - `logos-storage-nim` is marked as “pre-alpha / under active development” in repo docs (stability risk).
  - Public testnet specifics (auth, persistence guarantees, retention) are UNKNOWN.

## References (links)

- Spreadsheet row sources (Journey #12):

  - `https://github.com/logos-storage/logos-storage-nim`
  - `https://github.com/logos-storage/logos-storage-installer`
  - `https://docs.codex.storage`
  - `https://api.codex.storage`
- REST API reference (endpoints, schemas): [https://api.codex.storage](https://api.codex.storage)
- Node implementation + release used above: [https://github.com/logos-storage/logos-storage-nim](https://github.com/logos-storage/logos-storage-nim) (v0.3.2)
- Installer CLI (start a node quickly): [https://github.com/logos-storage/logos-storage-installer](https://github.com/logos-storage/logos-storage-installer)
- Blog (helpful context; not authoritative for v0.1 requirements):

  - [https://blog.codex.storage/how-to-install-and-run-the-codex-testnet/](https://blog.codex.storage/how-to-install-and-run-the-codex-testnet/)
  - [https://blog.codex.storage/how-to-interact-with-a-codex-node/](https://blog.codex.storage/how-to-interact-with-a-codex-node/)
