---
title: About Cryptarchia
doc_type: concept
product: blockchain
topics: Cryptarchia
authors: kashepavadan
owner: logos
doc_version: 1
slug: about-cryptarchia
---

# About Cryptarchia

#### Understand how Cryptarchia reaches consensus while keeping block proposers private.

[Cryptarchia](https://docs.logos.co/get-started/glossary#cryptarchia), the [Logos Blockchain](https://docs.logos.co/get-started/glossary#logos-blockchain)'s consensus protocol, ensures that the entire Logos network reaches an agreement on the correct state of the blockchain. Cryptarchia uses a [Private Proof of Stake](https://docs.logos.co/get-started/glossary#private-proof-of-stake) ([PPoS](https://docs.logos.co/get-started/glossary#ppos)) consensus mechanism, ensuring that nodes cannot be linked to blocks they propose. PPoS also ensures that the proposer's relative stake cannot be deduced based on its activity. This separation reinforces the neutrality of the network, since nodes cannot be linked to any specific activity on the network. At the same time, Cryptarchia has no stake barrier for participating in consensus, fostering further decentralisation.

## The basics

- Cryptarchia is a Private Proof of Stake (PPoS) consensus protocol, so nodes cannot be linked to the blocks they propose and their relative stake cannot be deduced from activity.
- Cryptarchia maintains block production during failures, allowing the network to keep operating even if competing forks emerge temporarily.
- Cryptarchia has low entry barriers, so validator nodes can run on a basic laptop with no minimum stake requirement.

## Properties of Cryptarchia

### Resilience via liveness

In designing a resilient consensus protocol to use for the Logos Blockchain, it was necessary to decide whether to prioritise [safety or liveness](https://eprint.iacr.org/2016/889.pdf) in the event of a catastrophic failure. If safety is deemed a priority, the chain can never fork in order to ensure that the blockchain state is always agreed-upon, even if activity has to halt while the network recovers. Protocols that provide such safety guarantees generally rely on quorum-based consensus, which requires a permissioned set of participants with extensive communication and a low fault tolerance. These requirements introduce high barriers to entry that are antithetical to the Logos vision.

Prioritising liveness means that block production will continue during a failure, but competing forks will be created before the network settles on one honest chain. These protocols involve participants systematically making local choices about which fork to follow, with no need for a permissioned network or for extensive communication. Accordingly, Cryptarchia was designed to prioritise liveness during a failure.

### Proposer privacy

Cryptarchia provides PPoS consensus that hides the identity of a block proposer both before and after a proposal. Hiding a proposer’s identity before the proposal is accomplished by using a secret leadership election. This mechanism selects consensus leaders without revealing the leader schedule ahead of time.

For full proposer privacy, a secret leadership election is not enough: once a leader proposes a block, it is [trivial to link them](https://eprint.iacr.org/2021/409.pdf) to their proposed block without additional privacy measures in place. Cryptarchia is designed to work together with the [Blend Network](./about-the-blend-network.md), which obfuscates the link between a proposer and their block. This property creates a much more powerful layer of privacy, resilience and neutrality.

### Low barrier to entry

In order to achieve maximum decentralisation, Cryptarchia was designed to have low barriers to entry to encourage a greater circle of contributors. Participating as a Cryptarchia validator node is as simple as having the [Logos node](https://docs.logos.co/get-started/glossary#logos-node) application run in the background on a laptop, with a “set it and forget it” approach to maintenance. This design makes it easy to contribute to the security and continued operation of the Logos Blockchain.

## How Cryptarchia works

### Time units

Following the [Ouroboros](https://www.drwx.org/papers/crypsinous.pdf) model, Cryptarchia divides time into basic units called slots that are grouped into larger units called epochs. Each [slot](https://docs.logos.co/get-started/glossary#slot) allows for the addition of at most one block to a given chain, while each new [epoch](https://docs.logos.co/get-started/glossary#epoch) refreshes the randomness and eligibility set used for the leadership election. Every Cryptarchia slot is 1 second long, and an epoch is about 7.5 days long. These time units are illustrated in the diagram below.

![The time units used by the Logos Blockchain.](../.gitbook/assets/about-cryptarchia-time-units.png)

### Fork choice rule

As mentioned earlier, Cryptarchia’s preference for liveness produces competing forks fairly often - even under honest behaviour. The way Logos nodes decide on which fork represents the correct, or canonical, blockchain depends on how long that node has been offline. The node will compare parallel chains it sees on the network to its own preferred chain, switching to the observed chain if it is selected by the fork choice rule.

When a Logos node is connected to the broader network and sees new honest blocks relatively quickly, it will use the online fork choice rule to select the honest chain. Under this rule, the node will select the chain with the most blocks - the “longest chain” - as long as it diverges from the node’s chain less than $k$ blocks ago. This $k$ parameter, known as the security parameter, describes how many blocks deep a transaction needs to be before it is considered immutable.

When a Logos node is joining the network for the first time, or after a prolonged absence, it must use the boostrapping fork choice rule. Like the online rule, the [bootstrapping](https://docs.logos.co/get-started/glossary#bootstrapping) rule selects the longest chain when competing chains diverged from the node’s preferred chain less than $k$ blocks ago. However, forks diverging more than $k$ blocks ago are not dismissed. On the contrary, such a chain is selected if it has the most blocks (i.e. is the most dense) in the period immediately after the fork. The contrast between these two rules can be seen in the diagram below.

![The Cryptarchia bootstrapping fork choice rule.](../.gitbook/assets/about-cryptarchia-fork-choice.png)

The bootstrapping rule ensures that honest parties can join or rejoin the protocol after prolonged absences without having to trust another node to select their canonical chain. During normal operations, such a costly fork choice rule is not needed, allowing active nodes to use the online rule without compromising on security.

### Leadership election

Cryptarchia uses Logos notes (fungible assets) to select block proposers. Each [note](https://docs.logos.co/get-started/glossary#note) that has existed since the beginning of the previous epoch is eligible to win the Cryptarchia slot lottery. The owner of a winning note can then propose a block. Notes held by anyone can be used for consensus, with no minimum value requirement.

Each slot presents an opportunity for a block proposer to add a block to the chain, so long as they win the leadership election for that slot. The leadership election is run locally by each individual eligible note, without any public leadership schedule. Whether a particular note wins the leadership election for a given slot is determined by comparing a random “ticket” value to a threshold derived from the note’s relative stake. Due to the privacy properties of Cryptarchia, this relative stake relies on an estimate of the total participating stake derived from the block production rate.

If the ticket, generated by hashing the lottery randomness together with the note data, is less than the threshold value, that note is eligible to serve as a leader for that slot. The owner of a note that won an election can submit a block proposal, which will contain a zero-knowledge [Proof of Leadership](https://docs.logos.co/get-started/glossary#proof-of-leadership) ([PoL](https://docs.logos.co/get-started/glossary#pol)). Most slots will have no leader in order to allow parties to synchronise, while some will have one or even several leaders. A [key deletion protocol](https://www.drwx.org/papers/crypsinous.pdf) used in the maintenance of the note’s secret key ensures that an adaptive adversary who corrupts an honest participant will not be able to generate proofs of leadership for past slots.
