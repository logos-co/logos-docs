# Start a Logos blockchain node

Applies to: https://github.com/logos-blockchain/logos-blockchain @ <!-- TODO: tag or commit SHA -->
Runtime target: Logos testnet v0.1
Last checked: <!-- TODO: YYYY-MM-DD -->
Status: Stub
Owner: @davidrusu
Tracking: https://github.com/logos-co/logos-docs/issues/171

## Outcome + value

- **Outcome (end goal):** A running logos blockchain node participating in consensus and proposing blocks
- **Why it matters:** Participating in consensus is the primary method for securing and decentralizing the network.

## Audience

- Node operator

## Known gaps / Blockers

- Doc Packet missing: runnable steps, expected outputs, v0.1 limits
- Notion source needs mapping: https://nomos-tech.notion.site/Internal-Devnet-Launch-February-2026-2fe261aa09df8025ad94e380933b4cf9

## Prerequisites

- OS: macOS, Linux x86_64
- Dependencies: [Nix](https://nixos.org/download/)
- Accounts/keys: <!-- TODO: e.g. validator key, staking key -->
- Network/chain: <!-- TODO: chain ID, network name, endpoints -->
- Other: <!-- TODO -->

## Hardware requirements

- Target devices: <!-- TODO: e.g. x86_64 computer -->
- Minimum: <!-- TODO: CPU, RAM, storage (type + free space), network -->
- Recommended: <!-- TODO: CPU, RAM, storage, network -->
- Storage profile: <!-- TODO: expected disk growth / SSD required? -->

## Configuration

- Env vars:
  - <!-- TODO: NAME=example - purpose -->

- Flags:
  - <!-- TODO: flag - purpose -->

- Config file keys:
  - <!-- TODO: key=example - purpose -->

- Default endpoints/ports:
  - <!-- TODO: port/proto - what uses it -->

## Steps (happy path)

<!-- TODO: Copy/paste sequence from an empty machine to "it works" (include exact commands). -->

### Run the blockchain UI app

1. Clone the repository:

   ```sh
   git clone https://github.com/logos-blockchain/logos-blockchain-ui.git
   cd logos-blockchain-ui
   ```

2. Build the standalone app:

   ```sh
   nix build '.#app'
   ```

   > If you don't have flakes enabled globally, add experimental flags:
   >
   > ```sh
   > nix build --extra-experimental-features 'nix-command flakes' '.#app'
   > ```

3. Run the app:

   ```sh
   ./result/bin/logos-blockchain-ui-app
   ```

### Generate a node config

4. Copy the initial trusted peer set from the latest [Logos blockchain release notes](https://github.com/logos-blockchain/logos-blockchain/releases), paste it into the trusted peers field, and click **Generate Config**. The output will include the path to the generated config file.

5. Click **Load Config** and select the config file from the path shown in the previous step.

6. Click **Start Node** to start the node.

### Request tokens from the faucet

7. Copy one of the keys from your wallet, which is now visible in the UI after starting the node.

8. Go to the [devnet faucet](https://devnet.blockchain.logos.co/node/0/faucet), paste your key, and click **Request Funds**.

   > It may take up to a minute for the transaction to go through and for the funds to appear in your wallet.

### Participate in consensus

Once funded, your node will automatically participate in the consensus lottery and start producing blocks. The UTXO needs to age before it becomes eligible, which takes approximately 2 hours.

## Expected outputs

- After step 3 (run the app): A window opens displaying buttons for **Start Node**, **Load Config**, and **Generate Config**.
- After step 4 (generate config): The UI displays a message confirming the config was written, along with the file path.
- After step 6 (start node): A green indicator shows the node is running and the wallet appears displaying a balance of 0.
- After step 8 (request funds): The faucet displays a success message with the transaction hash. After up to a minute, the wallet updates to show a balance on the requested public key.
- After consensus participation: <!-- TODO: no way to observe block production yet -->

## Verify

- Check that the blockchain height is increasing:

  ```sh
  curl localhost:8080/cryptarchia/info
  ```

  Example response:

  ```json
  {"lib":"3d0c...4e6d","tip":"f44d...e2f5","slot":70899,"height":120,"mode":"Bootstrapping"}
  ```

  You should see the `height` increasing at an average rate of 1 block every 10 seconds. The timing is probabilistic, so expect some variance.

- Check that your node is connected to peers:

  ```sh
  curl localhost:8080/network/info
  ```

  Example response:

  ```json
  {"listen_addresses":["/ip4/127.0.0.1/udp/3001/quic-v1"],"peer_id":"12D3...fuS2","n_peers":16,"n_connections":19,"n_pending_connections":0}
  ```

  Verify that `n_peers` is greater than 0.

## Troubleshooting (top 3-5)

- Symptom: Balance not updating after requesting funds from the faucet.
  Cause: Only one faucet transaction can be included per block. During high demand, your transaction may be dropped.
  Fix/workaround: Retry the request from the faucet.

## Limits (for Testnet v0.1)

- Not supported: Dynamic wallet key management. To add new keys, you must manually edit the config file and restart the node.
- Known issues/sharp edges: No key generation tooling exists yet.
- Minimal information is displayed in the node UI. Users need to query the HTTP API (e.g. `/cryptarchia/info`, `/network/info`) to check chain health and node status.
- Block rewards are not yet visible through the UI.

## References (links)

- Node repo: https://github.com/logos-blockchain/logos-blockchain
- Blockchain UI repo: https://github.com/logos-blockchain/logos-blockchain-ui
- Internal devnet launch notes: https://nomos-tech.notion.site/Internal-Devnet-Launch-February-2026-2fe261aa09df8025ad94e380933b4cf9
- Docs inventory spreadsheet: https://docs.google.com/spreadsheets/d/1V94fhGxwTGbyLy2u8OcZmJQIzIctIGUHHfqyyY01V3E/edit?usp=sharing
