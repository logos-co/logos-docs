# External dev tests the Logos Messaging module via its API

Applies to:

- https://github.com/logos-messaging/nwaku
- https://github.com/logos-messaging/logos-messaging-nim-compose

Runtime target: local
Last checked: 2026-01-28
Status: Stub
Owner: Owner needed
Tracking: GitHub issue [#145](https://github.com/logos-co/logos-docs/issues/145)

## Outcome + value

- Outcome (end goal): An external developer can publish and retrieve a test message by calling the Logos Messaging (nwaku) REST API.
- Why it matters: Proves the messaging backend is reachable and can be exercised via an API surface for v0.1.

## Audience

- developer

## Known gaps

- Doc Packet missing
- Logos testnet specifics missing: which network endpoints/bootstraps to use, whether RLN is required, and what "success" means for v0.1 beyond basic API calls.

## Prerequisites

- OS: Linux/macOS/Windows (UNKNOWN - not validated; Docker required)

- Dependencies:

  - git
  - Docker + Docker Compose
  - curl
  - base64 (or an equivalent encoder)

- Accounts/keys:

  - Linea Sepolia RPC endpoint (required by the provided Docker Compose quickstart for RLN-related setup; provider/account details: UNKNOWN)
  - If RLN registration is required: EVM wallet/private key + testnet funds: UNKNOWN (not confirmed for Logos v0.1)
- Network/chain:
  - Local node exposes REST API on localhost (default: 8645)
  - "Logos testnet v0.1" chain/network identifiers and endpoints: UNKNOWN

- Other:

  - If you use the provided compose stack, it may include Store + RLN by default (exact toggles: UNKNOWN without the .env.example contents)

## Hardware requirements

- Target devices: x86_64 computer
- Minimum: Relay-only node: RAM ~0.5 GB
- Recommended: RAM ~2 GB (especially if WSS is enabled)
- Storage profile: UNKNOWN

## Configuration

- Env vars:

  - UNKNOWN (see `.env.example` in the compose repo). At minimum, you must provide a Linea Sepolia RPC endpoint per the quickstart docs, but the exact variable name is UNKNOWN.
  - Other RLN/Store-related env vars: UNKNOWN

- Flags:

  - UNKNOWN (Docker Compose setup; direct `nwaku` flags not captured for this journey)

- Config file keys:

  - UNKNOWN

- Default endpoints/ports:

  - 8645/tcp - REST API (examples: `/health`, `/debug/v1/version`, `/store/v1/messages`, `/relay/v1/auto/messages`)
  - 3000/tcp - Grafana (when using the Docker Compose stack)
  - Other ports (web UI, p2p, metrics): UNKNOWN

## Steps (happy path)

1. Clone the Docker Compose deployment repo:

   ```sh
   git clone https://github.com/waku-org/nwaku-compose
   cd nwaku-compose
   ```

2. Create your local environment file:

   ```sh
   cp .env.example .env
   ```

3. Edit `.env` with your settings (RPC endpoint and any other required values):

   ```sh
   # Use your editor of choice
   $EDITOR .env
   ```

4. Start the stack:

   ```sh
   docker compose up -d
   ```

5. Check the node is up:

   ```sh
   curl -i http://127.0.0.1:8645/health
   ```

6. Check API responds with version info:

   ```sh
   curl -s http://127.0.0.1:8645/debug/v1/version
   ```

7. Publish a test message (Relay API):

   ```sh
   curl -X POST "http://127.0.0.1:8645/relay/v1/auto/messages" \
     -H "content-type: application/json" \
     -d '{"payload":"ZXhhbXBsZQ==","contentTopic":"/test/0/ephemeral/proto","version":0,"timestamp":1714373499732887000}'
   ```

8. Try retrieving messages from Store (may depend on Store config and which Relay endpoint you used):

   ```sh
   curl -s "http://127.0.0.1:8645/store/v1/messages?contentTopics=%2Ftest%2F0%2Fephemeral%2Fproto&pageSize=10&ascending=true" \
     -H "accept: application/json"
   ```

## Expected outputs

- After step 4: `docker compose ps` shows containers running (exact service names: UNKNOWN).
- After step 5: HTTP 200 response from `/health` (response body: UNKNOWN).
- After step 6: JSON output from `/debug/v1/version` containing version information (exact fields: UNKNOWN).
- After step 7: Successful publish response (commonly "OK"; exact response/body: UNKNOWN).
- After step 8: JSON response from Store query; may be empty depending on Store configuration and publish method.

## Verify

- Command:

  ```sh
  curl -i http://127.0.0.1:8645/debug/v1/version
  ```

- Expected:

  ```sh
  - HTTP 200
  - JSON payload with version information (exact schema: UNKNOWN)
  ```

## Troubleshooting (top 3-5)

- Symptom: POST `/relay/v1/auto/messages` returns `400 Bad Request` with decode/deserialization error.
  Cause: Body includes fields not recognized by the running nwaku version (example: `ephemeral`).
  Fix/workaround: Remove unsupported fields from the JSON body, or upgrade nwaku to a version that supports them.

- Symptom: Messages published via `/relay/v1/auto/messages` do not appear when querying Store (`/store/v1/messages`).
  Cause: Known behavior/issue: `/relay/v1/auto/messages` may not store messages, while `/relay/v1/messages/{pubsub}` may (implementation-dependent).
  Fix/workaround: If you need Store retrieval, use the Store-compatible publish endpoint (if available in your build) and confirm Store is enabled.

- Symptom: POST publish returns `500 Internal Server Error` and logs mention RLN proof / membership problems.
  Cause: RLN membership not registered/loaded, or incorrect RLN credential configuration.
  Fix/workaround: Ensure RLN membership setup steps/scripts (if used by the compose stack) were completed and `.env` contains the required RLN-related values (exact keys: UNKNOWN).

- Symptom: `/health` or `/debug/v1/version` is unreachable (connection refused / timeout).
  Cause: Stack not running, REST API not exposed, port conflict, or container failed to start.
  Fix/workaround: Check `docker compose ps` and `docker compose logs <service>`; confirm port 8645 is free; restart the stack.

## Limits (for Testnet v0.1)

- Not supported: Logos testnet-specific instructions (bootstraps, endpoints, chain IDs, expected v0.1 behavior) are UNKNOWN.
- Known issues/sharp edges:

  - REST API reference link in upstream docs appears broken/outdated (some references point to a 404).
  - `/relay/v1/auto/messages` vs Store persistence behavior may be surprising; confirm expected behavior for v0.1 with SMEs.

## References (links)

- Existing sources:

  - Inventory spreadsheet points to: [https://docs.waku.org/](https://docs.waku.org/) and [https://github.com/logos-messaging/nwaku](https://github.com/logos-messaging/nwaku)
  - Run a Waku Node (nwaku quickstart + system requirements + health check): [https://docs.waku.org/run-node/](https://docs.waku.org/run-node/)
  - Run nwaku with Docker Compose (interaction + store query examples): [https://docs.waku.org/guides/nwaku/run-docker-compose](https://docs.waku.org/guides/nwaku/run-docker-compose)
  - Compose deployment repo (nwaku-compose fork used by Logos Messaging): [https://github.com/logos-messaging/logos-messaging-nim-compose](https://github.com/logos-messaging/logos-messaging-nim-compose)
  - Example publish request + deserialization behavior (`/relay/v1/auto/messages`): [https://github.com/waku-org/nwaku/issues/2643](https://github.com/waku-org/nwaku/issues/2643)
  - Store persistence behavior note (`/relay/v1/auto/messages` vs `/relay/v1/messages/{pubsub}`): [https://github.com/waku-org/nwaku/issues/3362](https://github.com/waku-org/nwaku/issues/3362)
- Optional:

  - REST API reference: some upstream links point to [https://waku-org.github.io/waku-rest-api/](https://waku-org.github.io/waku-rest-api/) but availability/version for Logos v0.1 is UNKNOWN
