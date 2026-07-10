---
title: Connectivity
doc_type: concept
product: storage
topics: storage, connectivity, nat, ports
authors: arnaud
owner: logos
doc_version: 1
slug: connectivity
---

# Connectivity

#### Understand how a storage node joins a network and becomes reachable from the internet.

A node is useful only when it can reach other nodes. This page explains how a node joins a network and how to make it reachable from the outside.

## Joining a network

You can share files once you are part of a network formed by entry points called bootstrap nodes. Once connected, the node discovers other peers on its own. You have two choices.

**Join an existing network.** The easiest way is to set the `network` option to a preset name. The preset already contains that network's bootstrap nodes, so you need nothing else.

| Preset       | Description                       |
| ------------ | --------------------------------- |
| `logos.test` | Logos testnet (default)           |
| `logos.dev`  | Logos devnet                      |
| `codex.dev`  | Codex legacy devnet (deprecated)  |

**Create your own network.** Start the first node with `no-bootstrap-node` set to `true`: it bootstraps from no one and becomes the entry point. Read its address with the `spr` method, then use that address as the `bootstrap-node` of every other node you want in the network.

## Being reachable: NAT

On a home network, your node usually sits behind a router (NAT), so it is not reachable from the internet by default.

An unreachable node still works in one direction: you can download content from other nodes, but you cannot publish to the network — other nodes cannot download your files.

:::info
Automatic NAT traversal (hole punching) is coming. It will let nodes behind a router reach each other without manual port mapping.
:::

Behind a router, the address your node listens on is a private one (e.g. `192.168.1.20`): other peers cannot dial it. Being reachable therefore means two things: the node **announces** a public address to the network, and that address actually **leads back** to your machine (the port is open or mapped on your router). The `nat` option controls how the node finds the address to announce:

| Value        | When to use it                                                                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `any`        | Default. Tries the methods below automatically.                                                                                                                                                        |
| `none`       | No NAT traversal: the node announces the machine's own IP as-is. Use this when the machine already has a public IP (e.g. a cloud server or VPS). With only a private IP, the node stays unreachable.   |
| `upnp`       | If your router has UPnP enabled, the node asks it to open a port so you become reachable from the internet.                                                                                            |
| `pmp`        | Same as `upnp`, but using NAT-PMP. Use it when your router supports NAT-PMP instead.                                                                                                                   |
| `extip:<IP>` | Set your public IP yourself, e.g. `extip:203.0.113.7`. Use this when you know your public IP and have opened your listen port on the router yourself.                                                  |

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

With `nat` set to `any` or `upnp`, the node asks the router to open its ports by itself — but only if UPnP is enabled on the router. Router interfaces differ, but the steps are always the same:

1. Open your router's admin page in a browser. Its address is your default gateway, often `192.168.1.1`. On Linux, find it with `ip route | grep default`.
2. Find the *UPnP* setting, usually under the NAT, network, or advanced settings, and enable it.
3. Restart the node.

### Forwarding ports manually

If your router does not support UPnP, or you prefer not to enable it, map the ports yourself and announce your public IP with `extip`:

1. Set fixed values for `listen-port` and `disc-port` (see [Ports](#ports)): you cannot forward a random port.
2. Find your machine's address on the local network, e.g. with `ip -4 addr`.
3. In your router's admin page, find the *Port forwarding* section (sometimes called *NAT rules* or *Virtual server*) and add two rules pointing to your machine's local address: one TCP rule for `listen-port`, one UDP rule for `disc-port`. Use the same external and internal port numbers.
4. Set the `nat` option to `extip:<your-public-IP>` (see [Finding your public IP](#finding-your-public-ip)).

:::info

Give your machine a fixed address on the local network (a *DHCP reservation* or *static lease* in the router settings). Otherwise the forwarding rules break when the router assigns your machine a different address.

:::

## Ports

The node does two different jobs on the network: *discovering* peers (finding who is out there and where content lives) and *transferring* data. Each job has its own protocol and its own port:

- `disc-port`: the UDP port used for discovery (default `8090`). Peers and content are located through a distributed hash table (DHT) that runs over UDP.
- `listen-port`: the TCP port other peers use to connect to you and transfer files. The default `0` picks a random free port. Set a fixed value if you want to open it on your router or firewall.

If you run a reachable node, fix both ports and allow them through your firewall.
