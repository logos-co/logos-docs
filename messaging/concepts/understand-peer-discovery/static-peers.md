> Source: https://docs.logos.co/messaging/concepts/understand-peer-discovery/static-peers
> Markdown index of all Logos docs: https://docs.logos.co/llms.txt

# About static peers

#### Understand how hard-coded bootstrap peers work and the trade-offs they carry.

[Logos Delivery](https://docs.logos.co/get-started/glossary.md#logos-delivery) applications have the flexibility to embed bootstrap node addresses directly into their codebase. Developers can either use static peers operated by [Status](https://status.im/) or [run a node](https://docs.logos.co/messaging/delivery/run-delivery-node-from-cli.md).

## How static peers work

```mermaid
sequenceDiagram
Alice->>Bob: Connect to Bob (static peer details)
Alice->>Carol: Connect to Carol (static peer details)
```

Alice establishes connections with Bob and Carol using their node details, which are predefined (hard-coded) into Alice's node.

## Pros and cons

Pros:

- Low latency.
- Low resource requirements.

Cons:

- Vulnerable to censorship: Node IPs can be blocked or restricted.
- Limited scalability: The number of nodes is fixed and cannot easily be expanded.
- Maintenance challenges: Updating the node list requires modifying the code, which can be cumbersome and involves releasing and deploying.
