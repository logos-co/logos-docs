---
title: FAQ
doc_type: reference
product: storage
topics: storage, troubleshooting, connectivity
authors: arnaud
owner: logos
doc_version: 1
slug: faq
---

# FAQ

#### Fix the most common connectivity problems of a storage node.

Logos Storage requires your node to be reachable from the internet and, to that end, you must open two ports on your router:

- **Discovery port**: UDP, defaults to `8090`. Used for discovery and DHT operations.
- **libp2p listen port**: TCP. Used for data transfer and peer connections. The Storage UI sets it during onboarding; the storage module picks a random free port unless you set `listen-port`.

Problems sharing files are commonly related to one (or both) of these ports not being open or available. See [Connectivity](../concepts/connectivity.md) for how reachability works and how to set it up.

## `logoscore` or `lgpm` fails with a FUSE error

**Symptom**: running a tool installed from the releases fails with `No suitable fusermount binary found on the $PATH` and `Cannot mount AppImage, please check your FUSE setup`.

**Cause**: on Linux, the release binaries are AppImages, which need FUSE to run. Containers (toolbox, Docker) and some minimal distributions do not ship it.

**Fix**: install FUSE (`sudo dnf install fuse` on Fedora, `sudo apt install libfuse2` on Ubuntu). Without root, extract the AppImage instead and run the extracted binary:

```sh
./bin/lgpm --appimage-extract
./squashfs-root/AppRun --help
```

## The node has no peers

**Symptom**: the node starts successfully but never connects to any peer.

**Cause**: this is typically due to discovery being unavailable: for instance, another process is already occupying its port.

**Fix**: ensure that no process is using port `8090`, or change the default port value in the advanced configuration.

## Another application is using the listen port

**Symptom**: the node fails to start, or peers cannot connect, because the TCP listen port is already taken.

**Cause**: another process is occupying the port.

**Fix**: stop the other process or change the listen port in the configuration. If you use manual port forwarding, update the router rule to match the new port.

## I can download files, but nobody can download from me

**Symptom**: downloading from the network works, but files you publish cannot be downloaded by other nodes.

**Cause**: your node is unreachable from the internet. Outgoing connections (your downloads) go through your router normally; incoming connections (peers fetching from you) are blocked by it.

**Fix**: make your node reachable with UPnP or manual port forwarding: see [Connectivity](../concepts/connectivity.md).

## UPnP is not working

**Symptom**: you selected UPnP during setup but the node remains unreachable.

**Cause**: UPnP relies on your router supporting and enabling the UPnP protocol. Many routers have it disabled by default for security reasons.

**Fix**: make sure UPnP is enabled on your router, or switch to manual port forwarding.

## Manual port forwarding is not working

**Symptom**: you configured port forwarding with both UDP and TCP ports but the node remains unreachable.

**Cause**: the ports are not open on your router.

**Fix**: make sure port forwarding is enabled for these ports on your router. Check that both rules exist (TCP for the listen port, UDP for discovery) and point to your machine's current local address: see [Forwarding ports manually](../concepts/connectivity.md#forwarding-ports-manually).

## The ports are forwarded, but the node is still unreachable

**Symptom**: UPnP or port forwarding is correctly set up on the router, but peers still cannot connect to you.

**Cause**: the machine's own firewall blocks incoming connections. Some Linux distributions (such as Fedora) enable a firewall by default.

**Fix**: allow both ports through the firewall, replacing `<listen-port>` with your TCP listen port (shown during onboarding in the Storage UI, or the `listen-port` value of your config). With firewalld (Fedora):

```sh
sudo firewall-cmd --permanent --add-port=<listen-port>/tcp
sudo firewall-cmd --permanent --add-port=8090/udp
sudo firewall-cmd --reload
```

With ufw (Ubuntu):

```sh
sudo ufw allow <listen-port>/tcp
sudo ufw allow 8090/udp
```

## The node was reachable, but is not anymore

**Symptom**: the node worked for days or weeks, then peers suddenly cannot connect to you anymore.

**Cause**: most home ISPs change your public IP from time to time. If `nat` is set to `extip:<IP>`, the node keeps announcing the old address.

**Fix**: check your current public IP (see [Finding your public IP](../concepts/connectivity.md#finding-your-public-ip)), update the `extip` value and restart the node. To avoid this, use `upnp` or `pmp` instead: the address is discovered automatically at startup.

## Downloads time out when downloading from a different machine

**Symptom**: downloading a CID works on the node that published it, but times out from another machine.

**Cause**: NAT is blocking the peer connection: the publishing node is not reachable from the internet.

**Fix**: make the publishing node reachable: see [Connectivity](../concepts/connectivity.md).
