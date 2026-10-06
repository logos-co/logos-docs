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

An LGX file (`.lgx`) is the [package](../../get-started/glossary.md#package) format for distributing a Logos [module](../../get-started/glossary.md#module): a deterministic, gzip-compressed tar archive that bundles one or more platform-specific builds of the module with a signed manifest describing its metadata and dependencies. `lgx` is the CLI that creates, inspects, and signs these archives. [`logosctl`](./logos-cli-reference.md) installs them into a session, from a [catalogue](../../get-started/glossary.md#catalogue) or from a local file; the standalone `lgpm` installs local files, and `lgpd` downloads packages from a catalogue without installing them.

This page summarises the format. The [`logos-package` spec](https://github.com/logos-co/logos-package/blob/master/docs/spec.md) is the authoritative reference for the manifest schema and signing details, and the `logos-package` [command reference](https://github.com/logos-co/logos-package#command-reference) lists every `lgx` command; the [catalogue format spec](https://github.com/logos-co/logos-modules-release-tool/blob/main/docs/catalog-format.md) covers how packages are listed and verified for download.

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
│   ├── darwin-arm64/
│   └── windows-x86_64/
├── docs/                  # Optional - documentation
└── licenses/              # Optional - license files
```

Only these entries are permitted at the archive root. Each entry under `variants/` is a platform build, named as described in [Variants and bundling](#variants-and-bundling); files directly under `variants/` are not allowed. Everything under `assets/` is platform-independent and stored once, so a registry can read a package's icon or `.lidl` interface documents without unpacking a platform build.

Building a package with `lgx` is deterministic: identical inputs always produce a byte-identical `.lgx`. A catalogue publishes each package's content hash (`rootHash`, the root of the Merkle tree over its contents), and installers check a download against it before installing, rather than trusting the transport.

## Variants and bundling

A variant is named after the platform it runs on. A development variant adds `-dev`: its libraries still resolve from the Nix store, so only an installer built with Nix accepts it. A portable variant bundles its libraries and runs anywhere.

| Platform | Portable variant | Development variant |
|---|---|---|
| Linux x86_64 | `linux-amd64` | `linux-amd64-dev` |
| Linux aarch64 | `linux-arm64` | `linux-arm64-dev` |
| macOS arm64 | `darwin-arm64` | `darwin-arm64-dev` |
| macOS x86_64 | `darwin-amd64` | `darwin-amd64-dev` |
| Windows x86_64 | `windows-x86_64` | `windows-x86_64-dev` |

An installer accepts only variants for its own platform, and only of its own kind: a released `logosctl`, `lgpm` or Basecamp takes portable variants, and a development build of one takes `-dev` variants. Installers from `logos-package-manager` 0.3.0 onwards also accept the other spelling of an architecture (`x86_64` or `amd64`, `aarch64` or `arm64`), but older ones do not, so build packages with the names in the table.

A module built with `logos-module-builder` has these package outputs:

| Output | Produces |
|---|---|
| `nix build .#lgx` | The development variant for the build machine |
| `nix build .#lgx-portable` | The portable variant for the build machine |
| `nix build '.#packages.x86_64-windows.lgx-portable'` | The `windows-x86_64` variant, cross-built on Linux, since Nix does not run on Windows |

The outputs are made with [`nix-bundle-lgx`](https://github.com/logos-co/nix-bundle-lgx), which can package the `lib/` output of any Nix build: `#default` makes the development variant, `#portable` the portable one, and `#dual` a package carrying both. To ship one package for several platforms, build a variant on each and combine them with `lgx merge`.

`lgx` has no release binaries; build it with `nix build github:logos-co/logos-package#lgx`.

## Manifest fields

`manifest.json` is a UTF-8 JSON file. The fields most relevant to authoring and consuming a package:

| Field | Type | Purpose |
|---|---|---|
| `manifestVersion` | string | Manifest schema version, currently `0.6.0`. Gates the version-dependent rules on this page: the icon contract (`0.4.0`+), `provides` (`0.5.0`+), and `optional_dependencies` and `interface_dependencies` (`0.6.0`+) |
| `name`, `version` | string | Canonical lowercase package identity |
| `description`, `author`, `category` | string | Required human-readable metadata |
| `type` | string | Package classification, for example `core`, `library`, or `ui_qml` |
| `dependencies` | array | Other packages this one requires to run |
| `optional_dependencies` | array | Packages this one can call but does not require |
| `interface_dependencies` | array | Names of interfaces the module binds to a provider at run time. Not resolved to packages; carried so a catalogue or UI can show them |
| `main` | object | Map of platform variant name to the entry point path for that variant |
| `display_name` | string | Human-readable label shown by UI consumers (Package Manager, Apps Inspector) and CLI tools. Falls back to `name` when absent |
| `provides` | array | App-to-app intents the package can service, for example `chat.group.open` |
| `icon` | string | Path to the package's `assets/icon.png`. Required for `type: "ui_qml"` at `manifestVersion` `0.4.0`+; optional for every other type |

See the [full field reference](https://github.com/logos-co/logos-package/blob/master/docs/spec.md#manifest-schema) for the complete schema, including dependency version ranges and signer pins.

### The `ui_qml` contract

A package's `type` distinguishes a [core module](../../get-started/glossary.md#core-module) from a [UI module](../../get-started/glossary.md#ui-module):

- A **core module** package uses `main` as its per-variant entry point, same as most other package types.
- A **UI module** package sets `type: "ui_qml"` and adds a `view` field: the relative path to its QML entry point, identical across variants. `main` becomes optional for this type—when present, it points at a per-variant backend Qt plugin that the host runs in an isolated process and bridges to the QML view; when absent, the QML view loads directly in-process and the package's variant directories carry only its QML files. `variants/` is required either way: it is the directory that is mandatory, not its contents, so a package with no native binary is still valid. From `manifestVersion` `0.4.0` onwards, `type: "ui_qml"` packages must also ship a 256x256 `assets/icon.png`, since these are the packages rendered as tiles in Basecamp's app grid and sidebar.

## Signing and verification

Packages can be signed with an Ed25519 key identified by a `did:jwk:...` DID, producing a `manifest.sig` alongside `manifest.json`. Content hashes (a Merkle tree over the archive) are always present in the manifest regardless of signing, and `lgx verify` recomputes and checks them against the archive contents. A package without them, made by older tooling, fails validation, so installers reject it; rebuild it with current tooling.

Installers apply a signature policy at install time. By default an unsigned package, or one signed by a key the installer does not trust, installs with a warning:

- `logosctl` reads the policy from the `signature_policy` setting of its daemon configuration (`none`, `warn` or `require`) and trusts the keys added with `logosctl key add`, which are kept per session.
- `lgpm install` rejects such a package with `--require-signatures`, and trusts the keys added with `lgx keyring add`.
- Basecamp's package manager keeps its own keyring.

Trust comes only from the keyring of the installer itself. A signer named in a package, in a catalogue entry, or in a catalogue's `trustedSigners` list is not trusted until you add its key.

## Further reading

- [`logos-package` spec](https://github.com/logos-co/logos-package/blob/master/docs/spec.md)—manifest schema, `lgx` CLI reference, signing and DID details.
- [Logos catalogue format spec](https://github.com/logos-co/logos-modules-release-tool/blob/main/docs/catalog-format.md)—for `logos-repo.json` and `index.json`, version selection, and download verification.
- [Build and run a Logos core module](../build-modules/build-and-run-a-logos-core-module.md)—building and installing an `.lgx` package end to end.
- [Logos CLI reference](./logos-cli-reference.md)—installing packages and managing trusted keys with `logosctl`.
- [`nix-bundle-lgx`](https://github.com/logos-co/nix-bundle-lgx)—the tool behind the builder's package outputs.
