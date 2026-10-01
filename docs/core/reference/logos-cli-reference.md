---
title: Logos CLI Reference
doc_type: reference
product: core
topics: core
authors:
owner: logos
doc_version: 1
slug: logos-cli-reference
---

# Logos CLI Reference

`logosctl` is the command-line tool for running Logos [modules](../../get-started/glossary.md#module) without the Basecamp app. It runs the Logos Core runtime as a daemon, which you drive with client commands to install [packages](../../get-started/glossary.md#package), load modules, call their methods and watch their events. It bundles the package manager and package downloader modules, so searching a [catalogue](../../get-started/glossary.md#catalogue), installing with dependencies resolved, loading and calling all go through one binary.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

This reference describes [`logosctl` 0.3.1](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.3.1). The complete manual, including every configuration key, is [`docs/logosctl.md`](https://github.com/logos-co/logos-logoscore-cli/blob/0.3.1/docs/logosctl.md) in `logos-logoscore-cli`.

## Install

| Platform | Command |
|:---|:---|
| Linux x86_64 or aarch64, macOS arm64 | `curl -fsSL https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.sh \| sudo sh` |
| Windows x86_64 (PowerShell) | `irm https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.ps1 \| iex` |

Both scripts install the release assets published on the [release page](https://github.com/logos-co/logos-logoscore-cli/releases/tag/0.3.1). There is no build for macOS on Intel. To build `logosctl` from source, run `nix build github:logos-co/logos-logoscore-cli#ctl`.

## Sessions

Everything `logosctl` needs lives in one directory, a session. `--config-dir` selects it, and so does the `LOGOSCTL_CONFIG_DIR` environment variable. The default is `~/.logosctl`. Each session runs at most one daemon, and two sessions can hold different packages and trust different signers.

| Path | Contents |
|:---|:---|
| `daemon/config.yaml` | Daemon configuration, installed with `logosctl daemon config set` |
| `client/config.yaml` | Dial settings, only needed to reach a daemon on another host |
| `modules/` | Core modules installed into this session |
| `plugins/` | UI plugins installed into this session |
| `keyring/` | Trusted package-signing keys |
| `logs/` | Daemon log; `logs/daemon.log` always points at the current file |
| `cache/downloads/` | Downloaded `.lgx` files |
| `data/` | Per-module persistent data |

Besides the session's own modules, `logosctl` ships with `capability_module` and `modules_state`, which are part of the runtime, and with `package_manager`, `package_downloader` and `storage_module` as embedded packages. A module installed into the session with the same name takes precedence over an embedded one.

## Global options

These options work before or after any command.

| Option | Description |
|:---|:---|
| `--config-dir DIR` | Session directory to act on (default `~/.logosctl`, also `LOGOSCTL_CONFIG_DIR`) |
| `-j`, `--json` | Force JSON output |
| `--no-json`, `--human` | Force human-readable output, even when the output is piped |
| `-q`, `--quiet` | Suppress non-essential output |
| `-v`, `--verbose` | Show debug logs |
| `--version` | Print the version and exit |
| `-h`, `--help` | Show help |
| `-D` | Start the daemon, the same as `daemon start` |
| `-d`, `--detach` | With `-D` or `daemon start`: fork into the background and return once the daemon accepts commands |

Output is human-readable in a terminal and JSON when piped, unless one of the format options says otherwise.

## Commands

Commands are grouped by what they act on. Within a group, `ls` lists and `show` describes one item; `list` and `info` are accepted as aliases.

### Daemon

| Command | Description |
|:---|:---|
| `logosctl daemon start [--detach]` | Start the runtime. `--detach` returns once the daemon accepts commands, unlike `&`, which returns before it is ready. |
| `logosctl daemon stop` | Shut the daemon down and return once it has exited. Also `logosctl stop`. |
| `logosctl daemon status` | Daemon health, uptime and a module summary. Also `logosctl status`. |
| `logosctl daemon config set FILE` | Validate and install the daemon configuration. `FILE` can also be `@file` or `-` for standard input. |
| `logosctl daemon config show` | Print the daemon configuration and where it lives |

### Modules

| Command | Description |
|:---|:---|
| `logosctl module ls [--loaded]` | List known modules, or only the loaded ones |
| `logosctl module show NAME` | Methods and events with their descriptions, dependencies and crash details |
| `logosctl module load NAME [--no-optional]` | Load a module and its dependencies. Installed optional dependencies load too, unless `--no-optional` is passed. |
| `logosctl module unload NAME [--no-dependents]` | Unload a module and, unless `--no-dependents` is passed, the modules that depend on it |
| `logosctl module reload NAME` | Reload a module |
| `logosctl module stats` | CPU and memory use per module. Also `logosctl stats`. |

### Calling and watching

| Command | Description |
|:---|:---|
| `logosctl call MODULE METHOD [ARGS...]` | Call a method on a loaded module. See [argument typing](#argument-typing). |
| `logosctl watch MODULE [--event NAME]` | Stream the events a module emits, or only the named event |

### Packages

| Command | Description |
|:---|:---|
| `logosctl package install NAME\|FILE.lgx ...` | Install from a catalogue, or from a local `.lgx` file. Also `logosctl install`. |
| `logosctl package install --dir DIR` | Install every `.lgx` file in a directory |
| `logosctl package upgrade NAME\|FILE.lgx` | Upgrade an installed package |
| `logosctl package remove NAME` | Remove a package and the packages that depend on it. Also `logosctl package uninstall`. |
| `logosctl package ls [--type core\|ui]` | List the packages installed in this session, including embedded ones |
| `logosctl package show NAME\|FILE.lgx` | Details and every available version of a package, or inspect an `.lgx` file without installing it |
| `logosctl package deps NAME [-r\|--recursive] [--reverse]` | List a package's dependencies, or with `--reverse` the packages that depend on it |
| `logosctl package search [QUERY] [--category C] [--catalog C]` | Search the configured catalogues. Also `logosctl search`. |
| `logosctl package download NAME [--version V] [-o DIR]` | Download an `.lgx` file without installing it |

`install` and `upgrade` take these options:

| Option | Description |
|:---|:---|
| `--file FILE.lgx` | Install a local file. An argument ending in `.lgx` is read as a file too. |
| `--dir DIR` | Install every `.lgx` file in a directory |
| `--version V`, `--root-hash H` | Select an exact release of a catalogue package |
| `--catalog C` | Use only this catalogue |
| `-y`, `--yes` | Apply without asking. Required when no terminal is available to confirm in. |
| `--dry-run` | Print the changes, and which running modules they would stop, without applying them |
| `--no-deps` | Do not install dependencies |
| `--no-optional` | Install only required dependencies, not optional ones |
| `--no-dependents` | Act on the named packages only, leaving the packages that depend on them in place |

`remove` takes `-y`, `--dry-run` and `--no-dependents`.

- Installing does not load a module. Load it with `logosctl module load NAME`.
- The daemon rescans after an install, so no restart is needed. Only modules that were already running and had to be stopped are restarted.
- Catalogue names and local files cannot be mixed in one command.
- All package commands need a running daemon, which hosts the package manager.

### Catalogues

| Command | Description |
|:---|:---|
| `logosctl catalog ls` | List the configured catalogues. The default is `logos-modules-official`. |
| `logosctl catalog add URL` | Add a catalogue by the URL of its `logos-repo.json`. `remove`, `enable` and `disable` take a URL too. |
| `logosctl catalog refresh` | Fetch every enabled catalogue again |
| `logosctl catalog source [any\|logos\|http]` | Show or set where packages download from: Logos Storage first then HTTP (`any`, the default), Logos Storage only (`logos`), or HTTP only (`http`) |

### Signing keys

| Command | Description |
|:---|:---|
| `logosctl key ls` | List the keys this session trusts |
| `logosctl key add NAME --did DID [--display-name N] [--url U]` | Trust a signing key |
| `logosctl key remove NAME` | Stop trusting a key |

The session's keyring is separate from Basecamp's. The `signature_policy` setting in the daemon configuration decides what happens to a package that is unsigned or signed by a key the session does not trust: `none` skips the check, `warn` (the default) installs it with a warning, and `require` refuses it.

### Tokens and remote clients

| Command | Description |
|:---|:---|
| `logosctl token issue --name N [--expires D] [--replace] [--local-only]` | Issue a client token. Works offline, on the session directory. |
| `logosctl token ls` | List issued tokens |
| `logosctl token revoke NAME` | Revoke a token |
| `logosctl client config set FILE` | Install the dial settings for a daemon on another host |
| `logosctl client config show` | Print the client configuration |

On the same host none of this is needed: the daemon writes a working client configuration and token into the session every time it starts.

## Argument typing

`logosctl call` turns each argument into a JSON value with the first rule that matches.

| Argument | Becomes | Example |
|:---|:---|:---|
| `json:VALUE` | `VALUE` parsed as JSON | `json:[1,2,3]`, `json:{"k":"v"}` |
| `json:@FILE` | The file's contents parsed as JSON | `json:@payload.json` |
| `str:TEXT` | `TEXT` as a string, unchanged | `str:42` |
| `@FILE` | The file's contents as a string | `@config.json` |
| `true` or `false` | A Boolean | `true` |
| A decimal whole number | An integer | `42`, `-7` |
| A decimal number | A double | `3.14`, `1e6` |
| Anything else | A string | `hello`, `0xf39F...` |

Binary (`bstr`) arguments are JSON objects holding base64url content without padding: `json:{"_bytes":"aGVsbG8"}`.

## Daemon configuration

The daemon configuration is a YAML document that you install with `logosctl daemon config set`. It replaces the previous configuration, takes effect at the next daemon start, and is validated first: an unknown key or a value of the wrong type is reported by name and nothing is written.

| Key | Description |
|:---|:---|
| `dirs` | Redirect a session directory: `keyring`, `cache`, `modules`, `plugins`, `data` or `logs`. A relative path stays inside the session. |
| `modules_dirs` | Extra read-only directories to scan for modules |
| `signature_policy` | `none`, `warn` (default) or `require`. See [Signing keys](#signing-keys). |
| `modules` | Network listeners per module (`core_service`, `capability_module`): `protocol`, `host`, `port`, `codec`, `cert`, `key`, `ca_file`, `verify_peer` |
| `ssl` | Default `cert`, `key` and `ca` for every `tcp_ssl` listener |
| `insecure_tcp` | Allow unencrypted `tcp` on a non-loopback address |
| `access_group` | Share the daemon with an operating-system group |
| `access_policy` | Which caller modules may call which modules, as a JSON document in a string |
| `logging` | Log file name, rotation size and number of files kept |

A remote client needs `capability_module` reachable as well as `core_service`. See [`docs/logosctl.md`](https://github.com/logos-co/logos-logoscore-cli/blob/0.3.1/docs/logosctl.md) for every key and a TLS example.

## Exit codes

| Code | Meaning |
|:---|:---|
| `0` | Success |
| `1` | General error, or the daemon is not running (for `status`) |
| `2` | No daemon running, or the daemon did not answer |
| `3` | Module error: not found, or loading or unloading failed |
| `4` | Method error: not found, the call failed, or it timed out |

## Other Logos command-line tools

`logosctl` is the tool that Logos releases ship. These standalone tools are for module developers, and the [tutorials](https://github.com/logos-co/logos-tutorial) use them. Build them with Nix:

| Tool | Purpose | Build |
|:---|:---|:---|
| `logoscore` | The runtime `logosctl` is built on, with its own session (`~/.logoscore`) and no package commands. No longer released. | `nix build github:logos-co/logos-logoscore-cli#cli` |
| `lgx` | Create, inspect, merge and sign LGX packages. See the [LGX reference](./lgx-package-format-and-bundling-reference.md). | `nix build github:logos-co/logos-package#lgx` |
| `lgpm` | Install local `.lgx` files into a modules directory | `nix build github:logos-co/logos-package-manager#cli` |
| `lgpd` | Search catalogues and download packages, without installing them | `nix build github:logos-co/logos-package-downloader#cli` |
| `lm` | Show a built module's metadata, methods and events | `nix build github:logos-co/logos-module#lm` |

## Further reading

- [Start a Logos module from the CLI](../build-modules/start-a-logos-module-from-the-cli.md): build a module, install it with `logosctl` and call it.
- [`logosctl` manual](https://github.com/logos-co/logos-logoscore-cli/blob/0.3.1/docs/logosctl.md): every command, configuration key and example.
- [LGX package format and bundling reference](./lgx-package-format-and-bundling-reference.md)
