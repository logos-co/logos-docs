---
title: LGX package format and bundling reference
doc_type: reference
product: core
topics: core
authors:
owner: logos
doc_version: 1
slug: lgx-package-format-and-bundling-reference
---

# LGX package format and bundling reference

An LGX file (`.lgx`) is the [package](../../get-started/glossary.md#package) format for distributing a Logos [module](../../get-started/glossary.md#module): a deterministic, gzip-compressed tar archive that bundles one or more platform-specific builds of the module with a signed manifest describing its metadata and dependencies. `lgx` is the CLI that creates, inspects, and signs these archives; `lgpm` and `lgpd` install them on a running system or from a [catalogue](../../get-started/glossary.md#catalogue).

This page summarises the format. The [`logos-package` spec](https://github.com/logos-co/logos-package/blob/master/docs/spec.md) is the authoritative reference for the manifest schema, CLI commands, and signing details; the [catalogue format spec](https://github.com/logos-co/logos-modules-release-tool/blob/main/docs/catalog-format.md) covers how packages are listed and verified for download.

## Package structure

```
package.lgx (tar.gz)
├── manifest.json          # Required - package metadata
├── manifest.sig           # Optional - Ed25519 signature with DID identity
├── assets/                # Optional - variant-independent package assets
│   ├── icon.png           #   Package icon: PNG, exactly 256x256
│   └── lidl/              #   Canonical module interface documents
│       └── <name>.lidl
├── variants/              # Required - one directory per platform build
│   ├── linux-amd64/
│   └── darwin-arm64/
├── docs/                  # Optional - documentation
└── licenses/              # Optional - license files
```

Only these entries are permitted at the archive root. Each entry under `variants/` is a platform build (for example `linux-amd64`, `darwin-arm64`); files directly under `variants/` are not allowed. Everything under `assets/` is platform-independent and stored once, so a registry can read a package's icon or `.lidl` interface documents without unpacking a platform build.

Building a package with `lgx` is deterministic: identical inputs always produce a byte-identical `.lgx`, which lets a catalogue verify a download against a published content hash rather than trusting the transport.

## Manifest fields

`manifest.json` is a UTF-8 JSON file. The fields most relevant to authoring and consuming a package:

| Field | Type | Purpose |
|---|---|---|
| `manifestVersion` | string | Manifest schema version, currently `0.6.0`. Gates the version-dependent rules on this page: the icon contract (`0.4.0`+) and `optional_dependencies` (`0.6.0`+) |
| `name`, `version` | string | Canonical lowercase package identity |
| `type` | string | Package classification, for example `core`, `library`, or `ui_qml` |
| `dependencies` | array | Other packages this one requires to run |
| `optional_dependencies` | array | Packages this one can call but does not require |
| `main` | object | Map of platform variant name to the entry point path for that variant |
| `display_name` | string | Human-readable label shown by UI consumers (Package Manager, App Manager) and CLI tools. Falls back to `name` when absent |
| `provides` | array | App-to-app intents the package can service, for example `chat.group.open` |
| `icon` | string | Path to the package's `assets/icon.png`. Required for `type: "ui_qml"` at `manifestVersion` `0.4.0`+; optional for every other type |

See the [full field reference](https://github.com/logos-co/logos-package/blob/master/docs/spec.md#manifest-schema) for the complete schema, including dependency version ranges and signer pins.

### The `ui_qml` contract

A package's `type` distinguishes a [core module](../../get-started/glossary.md#core-module) from a [UI module](../../get-started/glossary.md#ui-module):

- A **core module** package uses `main` as its per-variant entry point, same as most other package types.
- A **UI module** package sets `type: "ui_qml"` and adds a `view` field: the relative path to its QML entry point, identical across variants. `main` becomes optional for this type—when present, it points at a per-variant backend Qt plugin that the host runs in an isolated process and bridges to the QML view; when absent, the QML view loads directly in-process and the package's variant directories carry only its QML files. `variants/` is required either way: it is the directory that is mandatory, not its contents, so a package with no native binary is still valid. From `manifestVersion` `0.4.0` onward, `type: "ui_qml"` packages must also ship a 256x256 `assets/icon.png`, since these are the packages rendered as tiles in Basecamp's app grid and sidebar.

## Signing and verification

Packages can be signed with an Ed25519 key identified by a `did:jwk:...` DID, producing a `manifest.sig` alongside `manifest.json`. Content hashes (a Merkle tree over the archive) are always present in the manifest regardless of signing, and `lgx verify` recomputes and checks them against the archive contents.

Installers (`lgpm install`, and the package-manager module underlying Basecamp) apply a signature policy at install time: by default an unsigned package installs with a warning, while `--require-signatures` rejects any package not signed by a key in the local trust keyring. A catalogue's `logos-repo.json` can also list `trustedSigners`, so a client can accept a package the catalogue vouches for without a prior manual `lgx keyring add`.

## Further reading

- [`logos-package` spec](https://github.com/logos-co/logos-package/blob/master/docs/spec.md)—manifest schema, `lgx` CLI reference, signing and DID details.
- [Logos catalogue format spec](https://github.com/logos-co/logos-modules-release-tool/blob/main/docs/catalog-format.md)—for `logos-repo.json` and `index.json`, version selection, and download verification.
- [Build and run a Logos core module](../build-modules/build-and-run-a-logos-core-module.md)—building and installing an `.lgx` package end to end.
