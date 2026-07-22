---
title: About DNS discovery
doc_type: concept
product: messaging
topics: peer-discovery, dns-discovery, networking
authors: LordGhostX, fryorcraken
owner: logos
doc_version: 1
slug: dns-discovery
sidebar_position: 3
---

# About DNS discovery

#### Understand how a node retrieves peer connection details from an ENR tree published in DNS.

Built upon the foundation of [EIP-1459: Node Discovery via DNS](https://eips.ethereum.org/EIPS/eip-1459), [DNS Discovery](https://docs.logos.co/get-started/glossary#dns-discovery) allows the retrieval of an `ENR` tree from the `TXT` field of a domain name. This approach enables the storage of essential node connection details, including IP, port, and multiaddr. This [bootstrapping](https://docs.logos.co/get-started/glossary#bootstrapping) method allows anyone to register and publish a domain name for the network, promoting increased decentralisation.

## How DNS discovery works

```mermaid
sequenceDiagram
    Node->>DNS Server: (1) Lookup TXT example.com
    DNS Server-->>Node: (2) enrtree-root:v1 e=U3...3Y ...
    Node->>DNS Server: (3) Lookup TXT U3...3Y.example.com
    DNS Server-->>Node: (4) enrtree-branch:DU...VQ,J3..HU,IC...WE
    Node->> DNS Server: (5) Lookup TXT DU...VQ.example.com
    DNS Server-->>Node: (6) enr:-M-4QLdAB-Kyz...Wt1Mg8
    Node ->> Node: (7) Decode ENR: Peer's connection details
```

1. DNS lookup query to retrieve TXT data stored on `example.com` domain.
1. `enrtree-root` is returned, and the value of `e` is the `enr-root`, the root hash of the node subtree.
1. DNS lookup query to retrieve TXT data stored on `<enr-root>.example.com` domain.
1. `enrtree-branch` is returned; this tree contains hashes of node subtrees.
1. DNS lookup query to retrieve TXT data stored on `DU...VQ.example.com` domain, the first leaf of `enrtree-branch`.
1. `enr` record is returned.
1. Returned value is decoded, and peer connection details such as IP address and port are learned.

## Pros and cons

Pros:

- Low latency, low resource requirements.
- Easy bootstrap list updates by modifying the domain name, eliminating the need for code changes.
- Ability to reference a larger list of nodes by including other domain names in the code or [ENR](https://docs.logos.co/get-started/glossary#enr) tree.

Cons:

- Vulnerable to censorship: Domain names can be blocked or restricted.
- Limited scalability: The listed nodes are at risk of being overwhelmed by receiving all queries. Also, operators must provide their `ENR` to the domain owner for listing.
