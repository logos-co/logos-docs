---
title: Logos Blockchain API Reference
doc_type: reference
product: blockchain
topics: blockchain
authors: kashepavadan
owner: logos
doc_version: 1
slug: blockchain-api-reference
---

# Logos Blockchain API Reference

## GET

### `GET /blend/info`

### `GET /cryptarchia/info`

Gets the consensus state information for the node.

#### Example response

```json
    {
      "cryptarchia_info": {
        "lib": "3d0c...4e6d",
        "lib_slot": 0,
        "tip": "f44d...e2f5",
        "slot": 70899,
        "height": 120,
        "state": "Bootstrapping"
      },
      "phase": "ProlongedBootstrapPeriod"
    }
```

### `GET /mantle/metrics`

### `GET /network/info`

Gets information about the node's peer connectivity.

#### Example response

```json
    {
      "listen_addresses": ["/ip4/127.0.0.1/udp/3001/quic-v1"],
      "peer_id": "12D3...fuS2",
      "connected_peers": ["12D3...Mxu1", "12D3...sbD3"],
      "discovered_peers": ["12D3...Mxu1", "12D3...sbD3"],
      "n_peers": 16,
      "n_connections": 19,
      "n_discovered_peers": 18,
      "n_pending_connections": 0
    }
```

### `GET /pow/rewards/claimable`

### `GET /pow/status`

### `GET /time/info`

## PUT

### `PUT /pow/auto-claim/start`

### `PUT /pow/auto-claim/stop`

### `PUT /pow/mining/start`

### `PUT /pow/mining/stop`

## POST

### `POST /pow/claim`