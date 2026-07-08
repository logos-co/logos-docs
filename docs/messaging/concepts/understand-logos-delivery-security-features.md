---
title: Understand Logos Delivery security features
doc_type: concept
product: messaging
topics: Delivery
authors: LordGhostX, fryorcraken
owner: logos
doc_version: 1
slug: security-features
---

# Understand Logos Delivery security features

#### See the services that keep Logos Delivery communication private and abuse-resistant.

Logos Delivery's protocol layers offer different services and security considerations, shaping the overall security of Logos Delivery. We document the security models in the [RFCs of the protocols](https://rfc.vac.dev/), aiming to provide transparent and open-source references. This empowers Logos Delivery users to understand each protocol's security guarantees and limitations.

## Pseudonymity

Logos Delivery ensures [pseudonymity](https://lip.logos.co/messaging/core/draft/10/waku2.html#pseudonymity) across its protocol layers, using libp2p `PeerID` as identifiers instead of disclosing true identities. However, it is important to note that pseudonymity does not provide complete anonymity. Actions performed under the same pseudonym (`PeerID`) can be linked, leading to the potential re-identification of the actual actor.

## Anonymity/unlinkability

[Anonymity](https://lip.logos.co/messaging/core/draft/10/waku2.html#anonymity--unlinkability) means an adversary cannot connect an actor to their actions or data. To achieve anonymity, avoiding linking activities with actors or their Personally Identifiable Information (PII) is crucial. In Logos Delivery, the following anonymity features are provided:

- [Publisher-message unlinkability](https://lip.logos.co/messaging/core/stable/11/relay.html#security-analysis): Ensures that the publisher of messages in the `Relay` protocol cannot be linked to their published messages.
- [Subscriber-topic unlinkability](https://lip.logos.co/messaging/core/stable/11/relay.html#security-analysis): Ensures that the subscriber of topics in the `Relay` protocol cannot be linked to the topics they have subscribed to.

## Spam protection

The [spam protection](https://lip.logos.co/messaging/core/draft/10/waku2.html#spam-protection) feature in `Relay` ensures that no adversary can flood the system with many messages, intentionally or not, regardless of the content's validity or usefulness. This protection is achieved through the [scoring mechanism](https://github.com/libp2p/specs/blob/master/pubsub/gossipsub/gossipsub-v1.1.md#spam-protection-measures) of `GossipSub v1.1`. Peers assign scores to their connections based on their behaviour and remove peers with low scores.

Ongoing research is being conducted, including developing [Rate Limit Nullifiers (RLN)](./understand-logos-messaging-protocols.md#rln-relay), which can be explored further at: [https://github.com/vacp2p/research/issues/148](https://github.com/vacp2p/research/issues/148).

## Data confidentiality, integrity, and authenticity

[Confidentiality](https://lip.logos.co/messaging/core/draft/10/waku2.html#data-confidentiality-integrity-and-authenticity) in Logos Delivery is ensured through data encryption, while integrity and authenticity are achieved through digital signatures. These security measures are available in [Waku Message (version 1)](https://rfc.vac.dev/waku/standards/core/14/message/#version-1) and Noise protocols, which offer payload encryption and encrypted signatures.

## Security considerations

In protocols like `Store` and `Filter`, where direct connections are required for the designated service, anonymity or unlinkability is not guaranteed. This is because nodes use their `PeerID` to identify each other during direct connections, making the service obtained in these protocols linkable to the beneficiary's `PeerID`, considered Personally Identifiable Information (PII). In `Store`, the queried node can link the querying node's `PeerID` to the topics being queried. Similarly, in `Filter`, a node can link the `PeerID` of a light node to its content filter. Check out the [Security considerations](https://lip.logos.co/messaging/core/draft/10/waku2.html#security-considerations) section in the Waku2 RFC for more details.
