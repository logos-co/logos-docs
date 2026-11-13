---
title: Logos CLI reference
doc_type: reference
product: core
owner: logos
slug: logos-cli-reference
mdx:
  format: md
sidebar_position: 100
description: Look up every logosctl command, option and configuration key.
custom_edit_url: https://github.com/logos-co/logos-logoscore-cli/blob/master/docs/logosctl.md
source_repo: logos-co/logos-logoscore-cli
source_version: 0.3.2
---

# Logos CLI reference

#### Look up every logosctl command, option and configuration key.

:::note[Mirrored page]
This page mirrors [`docs/logosctl.md`](https://github.com/logos-co/logos-logoscore-cli/blob/0.3.2/docs/logosctl.md) from
`logos-logoscore-cli` 0.3.2, and is regenerated automatically after each release. To change it, edit
the source in [`logos-co/logos-logoscore-cli`](https://github.com/logos-co/logos-logoscore-cli), not this page.
:::

The merged CLI: `logoscore` + `lgpd` + `lgpm` in one tool. It runs modules
like [`logoscore`](https://github.com/logos-co/logos-logoscore-cli/blob/0.3.2/docs/logoscore.md) does, and it manages packages itself —
bundling the `package_manager` and `package_downloader` modules, so searching
a catalog, installing with dependencies resolved, loading and calling are all
one binary's job.

**This is the binary releases ship.** It shares the runtime with
`logoscore` but no state — its session lives in `~/.logosctl`, so nothing here
can disturb a `logoscore` deployment.

Build instructions, flake outputs and test targets are in the
[main README](https://github.com/logos-co/logos-logoscore-cli/blob/0.3.2/README.md). The `.#ctl-*` outputs are the ones that ship this
binary; the package commands need a **portable** build, because that is what
the public catalog ships.

## Usage

`logosctl` runs as a **daemon** (long-running process) that you drive with **client commands** to load modules and call methods.

### Daemon Mode

Start a daemon, then use client commands to manage modules and call methods.

#### Sessions

Everything logosctl needs lives in one directory — a **session**. `--config-dir`
picks which one (default `~/.logosctl`, also `LOGOSCTL_CONFIG_DIR`):

```
<session>/
├── daemon/
│   ├── config.yaml     # daemon configuration — you write this
│   ├── daemon.lock     # held by the running daemon: one per session
│   ├── startup.err     # transient: a --detach child's output before logging is up
│   ├── state.json      # live instance: pid, instance id, bound ports
│   ├── tokens.json     # hashed-at-rest accepted tokens
│   └── tokens/<name>.json
├── client/
│   ├── config.yaml     # dial spec + token_file — you write this for remote use
│   └── auto.json       # local token, rewritten by the daemon each boot
├── modules/            # core modules installed into this session
├── plugins/            # UI plugins installed into this session
├── keyring/            # trusted package-signing keys
├── logs/               # daemon.log -> daemon_<timestamp>.log, rotated
├── cache/downloads/    # fetched .lgx
└── data/               # per-module persistence
```

A session is **portable by default**: copy the directory and its packages,
catalogs and trust assumptions come with it. Two sessions can hold different
package sets and disagree about which signers they trust. The only things left
outside are the binary itself and the runtime sockets in `$TMPDIR`.

That default is not a cage — any of the subdirectories can be redirected:

```yaml
dirs:
  keyring: ~/.config/logos/trusted-keys   # share trust across sessions
  cache: /var/cache/logos                 # put downloads on a bigger disk
  modules: /opt/logos/modules             # a tree something else manages
  plugins: plugins-custom                 # relative -> stays inside the session
  data: /var/lib/logos/data
  logs: /var/log/logos                    # ship logs where your collector looks
```

How a value is written decides whether portability survives:

| Form | Resolves to | |
|---|---|---|
| `plugins-custom` | `<session>/plugins-custom` | still portable |
| `~/x` | `$HOME/x` | outside the session |
| `/var/cache/logos` | as given | outside the session |

`persistence_path` is the older spelling of `dirs.data` and still works;
`dirs.data` wins if both are set.

Modules come from two places: the read-only set bundled beside the binary
(`capability_module`, `package_manager`, `package_downloader`) and the writable
`<session>/modules`. On a name collision the session's copy wins, which is how
you override a bundled module.

#### Starting the Daemon

```bash
logosctl daemon start              # runs in the foreground
logosctl daemon start --detach     # forks, returns once it is accepting commands
logosctl daemon status
logosctl daemon stop
```

`--detach` is not the same as `&`: backgrounding returns immediately, before the
transports have bound, so the next command races the boot. `--detach` returns
only after the daemon has published `daemon/state.json`, and tells you where it
is logging.

One daemon per session: a start while one is running exits 1 with "already
running in this config dir". `daemon stop` returns once the daemon has exited,
so `daemon stop && daemon start --detach` restarts it.

#### Logs

Everything the daemon and its module subprocesses write goes to a rotating file
under `logs/`:

```yaml
logging:
  enabled: true          # false -> no log file at all
  file: daemon.log       # inside dirs.logs
  max_size_mb: 10        # rotate past this; 0 = never rotate
  max_files: 5           # keep this many in total, oldest dropped
  console: true          # mirror to the terminal (ignored once detached)
```

Each start writes a **new, timestamped file**, the same scheme Basecamp uses:

```
logs/
├── daemon.log -> daemon_20260729_180411.log   # always the current session
├── daemon_20260729_180404.log
├── daemon_20260729_180409.log
└── daemon_20260729_180411.log
```

`logging.file` names the log; the start time is inserted into the real file, and
that exact name survives as a symlink to whichever file is current — so
`tail -F logs/daemon.log` follows across restarts without anyone working out a
stamp.

`max_files` bounds the **directory**, not just one session's rotations: the
oldest files are pruned at each start, so a daemon restarted a hundred times
does not leave a hundred logs. (spdlog's own retention only prunes within a
single sink's rotation set, which is why this is enforced separately.)

Capture is **pipe-based**, not a file redirect, and that is the point: module
hosts are separate processes holding inherited descriptors. Redirecting to a
file would catch their output but make rotation impossible — renaming a file out
from under a child that has it open just keeps filling the old inode. A pipe
puts one reader in charge, so rotation is safe *and* subprocess output still
lands in the log.

The size cap and retention come from [spdlog](https://github.com/gabime/spdlog)'s
rotating sink, which liblogos already logs through. Lines arriving from the pipe
already carry their own timestamp and level, so they are written verbatim rather
than stamped twice.

#### Configuration

Configuration is a YAML document you install into the session. It is never
passed alongside another command, so `daemon start` and every client command act
on the session exactly as it is on disk.

```bash
logosctl daemon config set ./node.yaml     # also accepts @file, or - for stdin
logosctl daemon config show
```

`set` replaces the file wholesale — there is no merge — and validates the whole
document, through the loader the daemon itself uses, before writing anything. A
document it rejects is never installed, so the previous config stays intact and
the session is never left holding one the daemon would refuse to boot from.
Unknown keys are rejected by name, because the loader ignores what it does not
recognise and a silently-dropped `insecureTcp` (the key is `insecure_tcp`) would
leave the daemon running with your intent missing. A key whose *value* is the
wrong type is reported the same way — `modules_dirs: /single/path` (a scalar
where a list belongs) fails with `modules_dirs: expected a list of strings, but
got a string.` rather than being ignored, half-applied, or fatal.

```yaml
# node.yaml
insecure_tcp: false
dirs:                        # optional; each defaults to <session>/<name>
  keyring: ~/.config/logos/trusted-keys
access_group: logos          # share the daemon with an OS group (see below)
signature_policy: warn       # none | warn | require
modules_dirs:                # extra read-only module directories to scan
  - /opt/logos/modules
ssl:                         # default TLS material for every tcp_ssl listener
  cert: /etc/logos/tls/server.pem
  key:  /etc/logos/tls/server.key
modules:
  core_service:
    - protocol: tcp_ssl
      host: 0.0.0.0
      port: 8645
      codec: json            # json | cbor
  capability_module:
    - protocol: tcp_ssl
      host: 0.0.0.0
      port: 8646
      cert: /etc/logos/tls/other.pem   # overrides the ssl: block for this one
      key:  /etc/logos/tls/other.key
```

Per-listener keys are `protocol`, `host`, `port`, `codec`, `cert`, `key`,
`ca_file` and `verify_peer`. **`cert`, `key` and `ca_file` are opened as
written** — unlike `dirs:`, a relative one resolves against the daemon
process's working directory, not the session, so the same config started from
a different directory silently fails its TLS handshake
(`use_certificate_chain_file: No such file or directory`). Give them absolute
paths.

The top-level `ssl: { cert, key, ca }` block is the **default** for every
`tcp_ssl` listener in the document — the usual case, where one certificate
covers the whole node. A listener that names its own `cert:`/`key:`/`ca_file:`
keeps it; the merge is per field, so a listener that names only a `cert:` still
inherits the block's `key:`. A `tcp_ssl` listener left with no certificate from
either source is refused at startup rather than bound: it would accept
connections and fail every handshake with `no shared cipher`, which reads like
a client fault.

`signature_policy:` is handed to the session's package manager at daemon start
and decides what `logosctl package install` does with an unsigned package or
one signed by a key that is not in the session's `keyring/`: `none` skips the
check, `warn` (the default when the key is absent) installs and prints a
warning, `require` refuses the install. It takes effect on the next daemon
start, like everything else in this file.

If the value cannot be delivered to the package manager at startup — the module
did not load, or its object could not be acquired — the daemon unloads the
package manager rather than leave it enforcing its own `warn` default while
this file, `logosctl config get` and `state.json` all still say `require`.
Package commands are unavailable for that session, and the reason is on stderr.
A failure to set the *directories* is not treated the same way: every directory
fails closed on its own (an install refuses with `User modules directory is not
set`), so that case warns and leaves the manager up.

A `local` listener is always added to every module, so same-host clients and the
daemon's own cross-module calls keep working whatever else you configure. Any
`tcp`/`tcp_ssl` entries are additional, outward-facing listeners.

**Remote clients need `capability_module` exposed too, not just `core_service`.**
Before its first RPC a client performs a `requestModule` handshake against
`capability_module`. On the same host that rides the free local listener; from
another host it has to reach `capability_module` over the network. Exposing only
`core_service` is the single most common remote-setup mistake — client commands
hang at connect time because the handshake never completes.

Plaintext `tcp` on a non-loopback host puts tokens on the wire in cleartext. The
daemon refuses to bind that unless `insecure_tcp: true` is set. Prefer
`tcp_ssl`, or a TLS terminator in front.

The client side is symmetric:

```bash
logosctl client config set ./client.yaml
logosctl client config show
```

```yaml
# client.yaml — only needed to reach a daemon on another host
version: 2
token_file: alice.json       # a bare filename, read from <session>/client/
daemon:
  core_service:      { transport: tcp_ssl, host: node.example, port: 8645, ca: /etc/logos/tls/ca.pem, verify_peer: true }
  capability_module: { transport: tcp_ssl, host: node.example, port: 8646, ca: /etc/logos/tls/ca.pem, verify_peer: true }
```

The accepted top-level keys are exactly `version`, `daemon`, `token_file` and
`instance_id`. `token_file` must be a plain filename — anything containing a
separator or `..` is refused and the client fails closed with "token file not
found". `ca` is opened as written, so give it an absolute path for the same
reason `cert`/`key` need one on the daemon side.

The two documents describe different ends of the same connection, and their key
names were never unified. Per listener:

| | Daemon (`modules:`) | Client (`daemon:`) |
|---|---|---|
| which protocol | `protocol:` | `transport:` |
| where | `host:`, `port:`, `codec:` | `host:`, `port:`, `codec:` |
| CA to trust | `ca_file:` | `ca:` |
| verify the peer | `verify_peer:` | `verify_peer:` |
| own certificate | `cert:`, `key:` | — (no client counterpart) |

So `ca` is the *client's* spelling of the daemon's `ca_file`, and `cert`/`key`
are the daemon's server certificate — a client config has no equivalent. The
validator names the key it expected, so a mix-up fails at `config set` rather
than at connect time.

For same-host use you do not need this at all: the daemon writes a working
`client/config.yaml` and `client/auto.json` into the session on every boot.

> The two documents are kept separate on purpose: the daemon never reads
> `client/`, and the client never reads `daemon/`. Only the files above are
> YAML — everything the daemon and the modules own (`state.json`, `tokens.json`,
> the token files, the downloader's catalog config) stays JSON.

#### Client Commands

Commands are grouped by what they act on. `ls` is the list verb throughout,
`show` the detail verb.

```bash
# Daemon
logosctl daemon start [--detach]     # start the runtime
logosctl daemon stop                 # graceful shutdown
logosctl daemon status               # health, uptime, module summary
logosctl daemon config set FILE      # install/replace the daemon config
logosctl daemon config show          # print it, and where it lives

# Client dial settings (only needed to reach a daemon on another host)
logosctl client config set FILE
logosctl client config show

# Modules — what is running right now
logosctl module ls [--loaded]        # list known / loaded modules
logosctl module show NAME            # methods, events, deps, crash detail
logosctl module load NAME [--no-optional]  # + dependencies; optional ones unless --no-optional
logosctl module unload NAME          # + dependents  (--no-dependents to opt out)
logosctl module reload NAME
logosctl module stats                # per-module CPU / memory

# Calling and watching
logosctl call MODULE METHOD [args...]
logosctl watch MODULE [--event NAME]

# Packages — what is on disk
# install/upgrade share one option set:
#   --file X.lgx  --dir D  --version V  --root-hash H  --catalog C
#   -y|--yes  --dry-run  --no-deps  --no-optional  --no-dependents
# remove takes names only:  -y  --dry-run  --no-dependents
logosctl package install NAME|FILE.lgx ...   # a path installs from disk
logosctl package install --dir D             # every .lgx in a directory
logosctl package upgrade NAME|FILE.lgx
logosctl package remove NAME         # + dependents by default
logosctl package ls [--type core|ui]
logosctl package show NAME|FILE.lgx  # detail + every version, or inspect an .lgx
logosctl package deps NAME [-r|--recursive] [--reverse]
logosctl package search [QUERY] [--category C] [--catalog C]
logosctl package download NAME [--version V] [--root-hash H] [--catalog C] [-o|--output DIR]

# Catalogs
logosctl catalog ls
logosctl catalog add URL | remove URL | enable URL | disable URL
logosctl catalog refresh
logosctl catalog source [any|logos|http]   # where packages download from

# Trusted signing keys (per session)
logosctl key ls
logosctl key add NAME --did DID [--display-name N] [--url U]
logosctl key remove NAME

# Auth tokens (offline; operates on the session dir)
logosctl token issue --name N [--expires D] [--replace] [--local-only]
logosctl token ls
logosctl token revoke NAME
```

Shorthands exist for the things you type most: `status`, `stop`, `call`,
`watch`, `stats`, `install`, and `search` work at the top level. `list` is
accepted wherever `ls` is, `info` wherever `show` is, and `uninstall` for
`package remove`.

`install` and `search` are the only package commands aliased to the top level,
because they are the only ones with no runtime-module meaning — `ls`, `show`
and `remove` would each be ambiguous between a package and a loaded module.

`package search` shows one row per package: the newest version, and `(+N)` when
older releases exist. `package show NAME` names every one of them on an
`available:` line, and answers for a package that is only in a catalog as well
as one that is installed. Pass any of those values to `package install` or
`package download` with `--version` to select that exact release; without it,
the newest version is used.

`catalog source` sets where packages download from: `any` (Logos Storage, then
HTTP; the default), `logos` (Logos Storage only) or `http` (HTTP only). Under
`logos` or `http`, a release the source cannot serve is not available: `search`
leaves it out of the count (a package with none reads `not available`), `show`
lists it on a `not available:` line with the reason, and `install` never picks
it. `--json` output carries the downloader's per-release `sourceAvailable` and
`sourceUnavailableReason`.

Two defaults are worth stating plainly, because they are the opposite of what
some tools do:

- **`install` does not load.** It puts files on disk; `module load` activates
  them. Staging a package without starting it is a thing you may well want.
- **`remove` takes dependents with it**, and `unload` too. Leaving a module
  running against something that no longer exists is the more surprising
  outcome. `--no-dependents` opts out, acting on the named package or module
  alone and leaving its dependents in place.
- **`module load` always resolves dependencies.** There is no `--no-deps` on
  it — that flag exists only on `package install` / `package upgrade`, which
  are about files on disk, not about what is running. Installed optional
  dependencies load too, best effort; `--no-optional` loads the required ones
  only.
- **An argument ending in `.lgx` is a path, not a name.** `install` and
  `upgrade` read it as a file on disk and skip the catalog entirely, so a
  local package installs with no catalog configured and no network. `--file`
  says so explicitly and `--dir` takes every `.lgx` in a directory. Catalog
  names and local files cannot be mixed in one command — they resolve by
  different rules, so run them separately.

Installing does not require a daemon restart: the daemon re-scans afterwards,
and only modules that were *already running* are stopped and restarted. A
running module that depends on one of them is stopped too and is **not**
restarted; the plan names it, and `module load` brings it back.

#### Argument typing

Each positional argument to `call` is turned into a JSON value using the first
rule that matches, so scalars stay ergonomic while lists, maps, and literal
strings are all expressible:

| Argument form | Becomes | Example |
|---------------|---------|---------|
| `json:<value>` | the value parsed as JSON (list / map / number / any nested value) | `json:[1,2,3]`, `json:{"k":"v"}` |
| `json:@<file>` | the file's contents parsed as JSON | `json:@payload.json` |
| `str:<text>` | `<text>` verbatim as a string — no parsing, no coercion | `str:json:x` → `"json:x"`, `str:42` → `"42"` |
| `@<file>` | the file's raw contents as a string | `@config.json` |
| `true` / `false` | a boolean | `true` |
| a whole number, in decimal | an integer | `42`, `-7` |
| a decimal number | a double | `3.14`, `1e6` |
| anything else | a string | `hello`, `0xf39F…` |

`json:` and `str:` are the two explicit escapes, mirroring the convention used
by `jq` (`--arg` / `--argjson`) and HTTPie (`=` / `:=`): the default path never
guesses a container, `json:` opts into parsing, and `str:` forces a literal
string for any value the default rules would otherwise reinterpret (a
number-like string, or one that itself starts with `json:` / `str:` / `@`).

Only decimal notation counts as a number. Hex stays a string: an address or
transaction hash such as `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` reaches
the module verbatim, with no `str:` needed. So do `inf` and `nan`, which JSON
cannot carry. `str:` remains the escape for a value that *is* decimal but must
arrive as text: `str:42`, `str:1e6`.

**Binary (`bstr`) arguments.** JSON has no native byte type, so bytes use the
canonical tagged encoding — a JSON object `{"_bytes": "<base64url, unpadded>"}`.
Pass it like any other JSON value with `json:`:

```bash
# base64url("hello") == "aGVsbG8"
logosctl call blobstore put 'json:{"_bytes":"aGVsbG8"}'
logosctl call blobstore put 'json:@blob.json'   # {"_bytes":"..."} from a file
```

#### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error / daemon not running (for `status`) |
| `2` | No daemon running (also how `watch` ends when its daemon stops) |
| `3` | Module error (not found, load/unload failed) |
| `4` | Method error (not found, call failed, timeout) |

A session left behind by a daemon that is no longer there is exit 2 as well,
and is reported immediately rather than after the RPC deadline — whether the
daemon crashed:

```
$ logosctl module ls --json
{"status":"error","code":"NO_DAEMON","message":"No daemon running (stale state file: pid 51203 is gone)."}
```

or was stopped normally, which leaves no pid to name and is settled by the
socket instead:

```
$ logosctl module ls --json
{"status":"error","code":"NO_DAEMON","message":"No daemon running (no local endpoint at /tmp/logos_core_service_a1b2c3d4e5f6). A daemon that stopped removes it; start one in this session to get it back."}
```

Start a daemon (`logosctl daemon start`) and both are restored; nothing needs
cleaning up by hand. A client dialing a *remote* daemon is unaffected by either
check.

`module ls` and `stats` report an unanswered RPC as `DAEMON_UNREACHABLE`
(exit 2), never as an empty list — `[]` means the daemon answered and nothing
matched.


#### Packages

logosctl installs and manages packages itself — it bundles `package_manager` and
`package_downloader`, the same modules Basecamp uses, so both frontends drive an
identical surface. All package commands need a running daemon, because that is
where those modules live.

```bash
logosctl catalog ls                     # configured catalogs
logosctl catalog add <url>              # add one; also remove/enable/disable
logosctl catalog refresh                # re-fetch every enabled catalog
logosctl catalog source logos           # download from Logos Storage only

logosctl search storage                 # search the merged catalog
logosctl install storage_module --dry-run   # show what would change
logosctl install storage_module -y
logosctl package ls                     # what is installed in this session
logosctl package show storage_module    # or a path to an .lgx to inspect it
logosctl package deps storage_module -r
logosctl package upgrade storage_module -y
logosctl package remove storage_module -y
```

A package you already have on disk needs none of that — no catalog, no
network. Give `install` the path:

```bash
logosctl install ./storage_module.lgx -y      # or: --file ./storage_module.lgx
logosctl install --dir ./downloads -y         # every .lgx in a directory
logosctl package show ./storage_module.lgx    # inspect one without installing
```

`install` puts files on disk; it does **not** load anything. Loading is a
separate, explicit act:

```bash
logosctl install storage_module -y
logosctl module load storage_module
```

The daemon re-scans after an install, so a freshly installed module is loadable
immediately — no restart. What `install` *does* restart is anything that was
already running and had to be stopped to make way. Running modules that depend
on those are stopped with them and left stopped; the plan lists them before
you confirm, and the result says which to load again:

```
$ logosctl install ./worker.lgx -y
The following changes will be made (install):
  reinstall  calc_slow 1.0.0 -> 1.0.0
These running modules will be stopped and restarted: calc_slow
These running modules depend on them and will be stopped, not restarted: calc_fanout
Installed: calc_slow
Restarted: calc_slow
Stopped, not restarted: calc_fanout
Load it again with: logosctl module load calc_fanout
```

Dependencies are handled by default in the direction that avoids breakage:
`install`/`upgrade` pull dependencies in (`--no-deps` opts out), and `remove`
takes dependents with it (`--no-dependents` opts out). `--dry-run` prints the
full change table plus which running modules will be stopped, and without `-y`
you are asked to confirm. With no terminal and no `-y` the operation is refused
rather than assumed — a script that forgot `--yes` should fail loudly.

Catalog installs and upgrades also offer available `optional_dependencies`,
including those declared by a required dependency of an app. The change table
marks their changes `(optional)`, and packages that come only with a selected
optional package `(optional, required by <package>)`. When the plan includes
optional packages, the prompt offers `[A]ll`, `only [M]andatory`, and `[N]o`
(full words or the letter, any case); pressing Enter selects **all**. Otherwise it is the usual `[y/N]`. `-y` also selects all
available optionals. Choosing `only mandatory` prints the reduced plan before
applying it. Use `--no-optional` to keep only mandatory packages in scripts or
dry runs. An unavailable optional package, or one with unavailable required
dependencies, never blocks the mandatory install; one that fails to download or
install is reported as skipped. Optional packages already installed at a
compatible version are kept as they are.

Like Basecamp, the plan accounts for every optional package
(`optional_packages` in `--json`): the change it gets, `installed` (kept),
`not selected`, or `unavailable` with the reason. Those without a change are
listed under `Optional packages not changed`. When a named package is
already installed, optional packages it does not have yet are not selected;
install one by name to add it. logosctl has no per-package or version
selection for optional packages; Basecamp's dialogs do.

Package signatures are verified against the session's own keyring:

```bash
logosctl key ls
logosctl key add acme --did did:jwk:... --display-name "Acme"
logosctl key remove acme
```

Because the keyring lives inside the session, two sessions can hold different
trust assumptions — and this is deliberately *not* shared with Basecamp's
keyring, so a key trusted in one is not automatically trusted in the other.

#### Agent / Script Example

```bash
# Start daemon (--detach returns only once it is accepting commands,
# so no `&` and no sleep are needed)
logosctl daemon start --detach

# Preflight: verify daemon is running
logosctl daemon status --json | jq -e '.daemon.status == "running"' > /dev/null

# Load modules
logosctl module load chat --json

# Discover available methods (with their documentation)
logosctl module show chat --json | jq '.methods[] | {name, description}'

# Discover the events a module emits (with their documentation)
logosctl module show chat --json | jq '.events[] | {name, description}'

# Call a method
logosctl call chat send_message "hello from script" --json

# Auto-reload any crashed modules
logosctl module ls --json | jq -r '.[] | select(.status == "crashed") | .name' | while read mod; do
  logosctl module reload "$mod" --json
done

# Stream events to a log file
logosctl watch chat --event chat-message --json >> events.log &
```

#### Events Example

Modules can emit events that you can listen to in real time. Use `watch` to subscribe and `call` to trigger:

```bash
# Start the daemon (the modules it scans come from the session's
# modules/ directory and any modules_dirs in daemon/config.yaml)
logosctl daemon start --detach

# Load the module
logosctl module load test_basic_module

# Start watching for events in the background, writing to a file
logosctl watch test_basic_module --event testEvent > events.txt &
WATCH_PID=$!

# Trigger the event from another call
logosctl call test_basic_module emitTestEvent "hello world"

# Check the captured event
cat events.txt

# Clean up
kill $WATCH_PID
logosctl daemon stop
```

### Quick start: load modules and call methods

The daemon starts **clean** (it scans the module directories but loads nothing
on its own). Load modules with `module load` — transitive dependencies are
resolved automatically — then call methods:

```bash
# Start a clean daemon on this session's modules
logosctl daemon start --detach

# Load modules (deps resolved automatically)
logosctl module load waku
logosctl module load chat

# Call methods (positional args — see "Argument typing" above)
logosctl call chat send_message hello
logosctl call storage init config 42 true
logosctl call storage loadConfig @config.json           # @file → raw file contents
logosctl call storage setTags 'json:["a","b"]'          # json: → parsed list/map/value
logosctl call storage setLabel 'str:42'                 # str: → literal string "42"

# A throwaway session, isolated from ~/.logosctl
logosctl --config-dir /tmp/test-session daemon start --detach

# Stop the daemon when done
logosctl daemon stop
```

Daemon startup options:

```
  -D                    Start the daemon (same as `daemon start`)
  -d, --detach          Fork and return once the daemon is accepting commands
      --config-dir DIR  Which session to run
```

Everything else — module directories, persistence, transports, the access
policy — is configuration, and lives in `daemon/config.yaml`.

These global flags work before or after any subcommand:

```
  -h, --help            Show help
      --version         Print the version
  -v, --verbose         Show debug logs
  -j, --json            Force JSON output
      --no-json,--human Force human-readable output even when piped
  -q, --quiet           Suppress non-essential output
      --config-dir DIR  Which session to act on (also LOGOSCTL_CONFIG_DIR)
```

#### Access policy

The `access_policy` key declares, per target module, which caller modules may
invoke it. Unlike every other key in this document, its value is **a JSON
document carried as a string** — the daemon hands the text straight to the
runtime rather than interpreting it, so it is not modelled as YAML. A YAML
block scalar (`|`) is the readable way to write it:

```yaml
access_policy: |
  {
    "version": 1,
    "mode": "enforce",
    "restrictions": {
      "package_manager":    { "allowedCallers": ["package_manager_ui"] },
      "package_downloader": { "allowedCallers": ["package_manager_ui"] }
    }
  }
```

> **Do not write it as a YAML mapping.** `access_policy:` followed by an
> indented `version: 1` / `restrictions:` block is read as an object where a
> string is expected. `daemon config set` reports it by name
> (`access_policy: expected a string, but got a mapping.`) and writes nothing.
> Quote the JSON, or use the `|` block above.

The string is handed to the runtime (via `logos_core_set_access_policy`)
before any module is loaded.

> **Note:** the value must be a full policy document. The `enforce` shorthand
> is a `logoscore` flag spelling (`--access-policy enforce`); here, write the
> equivalent document — `{"version":1,"mode":"enforce","restrictions":{}}` —
> which arms deny-by-default with the allow-lists derived from each module's
> declared dependencies.

> **Note:** the legacy inline mode (`-c "module.method(args)"` / `--quit-on-finish`,
> which ran calls in a single short-lived process) has been removed. Use a daemon
> plus `logosctl call ...` as shown above.
