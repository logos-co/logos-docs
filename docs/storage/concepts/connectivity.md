---
title: Connectivity
doc_type: concept
product: storage
topics: storage, connectivity, nat, ports
authors: arnaud
owner: logos
doc_version: 1
slug: connectivity
sidebar_position: 1
---

# Connectivity

#### Understand how a storage node joins a network and becomes reachable from the internet.

:::info
This document reflects the state of this Logos component as it will exist on mainnet. Some features described here may not be available on the current testnet.
:::

A node is useful only when it can reach - and be reached from - other nodes. This page explains how a node joins a network and how to make it reachable from
the outside.

## Joining a network

To share files, you need to be part of a _Storage network_ with other peers. To
join a Storage network, you need to know at least one other node that is already
part of that Storage network; that is, you need a _bootstrap peer_ for that
storage network. Once connected to a suitable bootstrap peer, your node should
be able to look up any other peers that are also part of the same storage
network. With Logos Storage, currently, you have two main choices:

**Join an existing public Storage network.** We provide two sets of public
bootstrap peers which define two logically separate, public storage networks.
Bootstrap addresses for those Storage networks are shipped with the Logos Storage
module by default, and you can access them by setting the `network` option to a
preset name. Since presets already contain the Storage network's bootstrap
nodes, you need nothing else. If nothing is specified, Storage will always join
`logos.test` by default.

| Preset       | Description                       |
| ------------ | --------------------------------- |
| `logos.test` | Logos testnet (default)           |
| `logos.dev`  | Logos devnet                      |

**Create your own Storage network.** If you start your node with
`no-bootstrap-node` set to `true`, it will bootstrap from no-one, effectively
becoming the bootstrap peer and only member of a new Storage network. You can
read your node's address with the `spr` method, then use that address in the
`bootstrap-node` option of other nodes to get them to join your Storage network.

:::note
Any node that joins a Storage network can be a bootstrap peer for that
network. Public bootstrap peers are convenient because their addresses are
well-known and they are highly available, but they are a convenience more than a
necessity.
:::

## Being reachable: NAT

On a home network, your node usually sits behind a router which shares your
external IP with other devices using Network Address Translation (NAT), so it is
not reachable from the internet by default.

With NAT traversal, the node will try different ways to become reachable. After
checking the reachability of its listen port, the node will try the following
actions, in this order, if it is unreachable:

1. Try to open the ports: if the router has UPnP, NAT-PMP or PCP enabled,
   the node asks it to open the listen port for incoming connections.
   If that works, the node becomes reachable.
1. Go through a relay: if the previous step fails, the node will use another
   peer as a relay. When another peer tries to connect to this node, it will be
   redirected to the relay, which will forward the connection to the node.
1. Bypass the relay: ideally, when a peer arrives through the relay, the node
   tries to open a direct connection with it anyway (hole punching). If it
   works, the relay is dropped and the two nodes talk directly.

The reachability check is done regularly, every 2 minutes by default
(depending on the configuration).

Being unreachable is not a dead end. Unreachable nodes sit behind the relay
and can still share content, but the performance will be worse than for a
reachable node.

:::info
* Port mapping only works if UPnP, NAT-PMP or PCP is enabled on the router. If
it fails, the node log will show `TCP port mapping failed` and the node will use a relay
instead. 
* Relay resources are limited. You should always do your best to configure your
network in a way that does not require utilising a relay.
:::

:::warning
If you are using [Mix](../../get-started/glossary.md#mix) with `nat:auto`, the
node first needs to get a reachability status, `Reachable` or `Unreachable`,
before it can do private downloads.
:::

The `nat` option controls how the node handles NAT traversal:

| Value        | When to use it                                                                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto`       | Default. Everything described above.                                                                                                                                                                   |
| `extip:<IP>` | Set your public IP yourself, for example `extip:203.0.113.7`. The node announces that address as-is and skips the checks above. Use this when you know the public IP under which your node is reachable from; for example, when you have opened your listen port on the router yourself, or in a machine with a public IP (a cloud server or VPS). |

:::warning

Some Linux distributions (such as Fedora) enable a firewall by default that can block incoming connections even when your port mapping is correct. You may need to allow the port through the firewall.

:::

### Finding your public IP

To use `extip:<IP>` you need your public IP. Two easy ways:

- From a terminal:

    ```sh
    curl -4 https://ifconfig.me
    ```

    The `-4` forces IPv4; without it, the service may return your IPv6 address.
- From a browser: open [https://ifconfig.me](https://ifconfig.me), or check your router's admin page (usually listed as the WAN or external address).

### Enabling UPnP on your router

With `nat` set to `auto` (the default), the node asks the router to open its ports by itself—but only if UPnP is enabled on the router. Router interfaces differ, but the steps are always the same:

1. Open your router's admin page in a browser. Its address is your default gateway, often `192.168.1.1`. On Linux, find it with `ip route | grep default`.
1. Find the *UPnP* setting, usually under the NAT, network, or advanced settings, and enable it.
1. Restart the node.

### Forwarding ports manually

If your router does not support UPnP, or you prefer not to enable it, map the ports yourself and announce your public IP with `extip`:

1. Set a fixed value for `listen-port` (see [Ports](#ports)): you cannot forward a random port.
1. Find your machine's address on the local network, for example with `ip -4 addr`.
1. In your router's admin page, find the *Port forwarding* section (sometimes
   called *NAT rules* or *Virtual server*) and add a rule pointing to your
   machine's local address and port.
1. Set the `nat` option to `extip:<your-public-IP>`.

:::info
Give your machine a fixed address on the local network (a *DHCP
reservation* or *static lease* in the router settings). Otherwise, forwarding
rules may break if the router assigns a different address to your machine.
:::

## Ports

Storage requires a single TCP port, configurable through the `listen-port`
option, to be open for it to work. This is set to `0` by default, which means
picking a random free port. Set it to a fixed value if you want to open it on
your router or firewall; for example, when manually setting up forwarding rules.
