---
title: Logos Scaffold command reference
doc_type: reference
product: core
owner: logos
mdx:
  format: md
sidebar_position: 100
description: Look up every logos-scaffold command and what it does.
custom_edit_url: https://github.com/logos-co/scaffold/blob/master/docs/commands.md
source_repo: logos-co/scaffold
source_version: v0.4.1
---

# Logos Scaffold command reference

#### Look up every logos-scaffold command and what it does.

:::note[Mirrored page]
This page mirrors [`docs/commands.md`](https://github.com/logos-co/scaffold/blob/v0.4.1/docs/commands.md) from
`scaffold` v0.4.1, and is regenerated automatically after each release. To change it, edit
the source in [`logos-co/scaffold`](https://github.com/logos-co/scaffold), not this page.
:::

Every command works under both binary names: `logos-scaffold` and the shorter
alias `lgs`. They are functionally identical.

Each subcommand documents copy-paste examples under `--help`:

```bash
lgs deploy --help
lgs test-node start --help
```

Global `-q` / `--quiet` (or `LOGOS_SCAFFOLD_QUIET=1`) suppresses echoed
external commands.

The flags below were verified against `logos-scaffold 0.3.0`. `--help` is
always authoritative.

## Create or adopt a project

```bash
logos-scaffold create <name> [--template NAME] [--vendor-deps] [--lez-path PATH] [--cache-root PATH]
logos-scaffold new <name> [--template NAME] [--vendor-deps] [--lez-path PATH] [--cache-root PATH]
logos-scaffold init [--dry-run] [--no-backup]
```

## Set up, build, generate

```bash
logos-scaffold setup [--prebuilt]
logos-scaffold build [project-path] [--prebuilt] [--guest <local|docker>]
logos-scaffold build idl [project-path]
logos-scaffold build client [project-path]
```

`--guest` overrides `[build].guest` for one invocation. See
[configuration.md](https://github.com/logos-co/scaffold/blob/v0.4.1/docs/configuration.md#build--guest-program-build-strategy) for
the durable setting and what each mode costs.

## Run the local sequencer

```bash
logos-scaffold localnet start [--timeout-sec N]
logos-scaffold localnet stop
logos-scaffold localnet status [--json]
logos-scaffold localnet logs [--tail N] [--json]
logos-scaffold localnet reset (--yes | --dry-run) [--reset-wallet] [--verify-timeout-sec N]
```

## Deploy

```bash
logos-scaffold deploy [program-name] [--program-path PATH] [--json]
```

## The inner loop

```bash
logos-scaffold run [--profile NAME] [--reset | --no-reset] [--post-deploy <cmd>...] [--no-post-deploy] [--watch] [--watch-debounce-ms MS] [--localnet-timeout N]
```

See [configuration.md](https://github.com/logos-co/scaffold/blob/v0.4.1/docs/configuration.md) for `[run]` profiles, post-deploy
hooks, and watch mode.

## Wallet

```bash
logos-scaffold wallet list [--long] [--json]
logos-scaffold wallet topup [<address> | --address <address-ref>] [--dry-run] [--json]
logos-scaffold wallet default set <address-ref>
logos-scaffold wallet default set --address <address-ref>
logos-scaffold wallet -- <wallet-command...>
```

## Pass through to `spel`

```bash
logos-scaffold spel -- <spel-command...>
```

## Test nodes

Isolated, short-lived sequencer instances for integration tests. Unlike
`localnet` (one long-lived developer sequencer per project on a fixed port),
each test node gets its own RPC port, config, database, log, and runtime
directory under `.scaffold/test-nodes/<id>`.

Lifecycle:

```bash
logos-scaffold test-node pins [--project DIR] [--lez-source URL|DIR] [--lez-ref REF] [--json]
logos-scaffold test-node prepare [--project DIR] [--cache-root DIR] [--lez-source URL|DIR] [--lez-ref REF] [--json]
logos-scaffold test-node doctor [--project DIR] [--json]
logos-scaffold test-node start [--project DIR] [--state DIR] [--port N] [--work-dir DIR] [--preserve-work-dir] [--timeout-sec N] [--block-create-timeout-ms MS] [--retry-pending-blocks-timeout-ms MS] [--json]
logos-scaffold test-node status --node <id|dir> [--json]
logos-scaffold test-node stop --node <id|dir> [--preserve-work-dir]
logos-scaffold test-node run [--project DIR] [--state DIR] [--timeout-sec N] [--block-create-timeout-ms MS] [--retry-pending-blocks-timeout-ms MS] [--serial | --parallel N] -- <command...>
```

Transactions:

```bash
logos-scaffold test-node tx submit --url URL --file PATH [--encoding borsh-base64|borsh] [--json]
logos-scaffold test-node tx wait --url URL --hash HASH [--after-block N] [--timeout-sec N] [--json]
logos-scaffold test-node tx submit-and-wait --url URL --file PATH [--encoding borsh-base64|borsh] [--timeout-sec N] [--json]
```

Blocks and clock:

```bash
logos-scaffold test-node blocks head --url URL [--json]
logos-scaffold test-node blocks range --url URL --from N --to N [--json]
logos-scaffold test-node blocks wait --url URL --after N [--count N] [--timeout-sec N] [--json]
logos-scaffold test-node clock read --url URL [--json]
logos-scaffold test-node clock wait-stable --url URL [--samples N] [--timeout-sec N] [--json]
```

Account and proof reads:

```bash
logos-scaffold test-node account get --url URL --account-id ID [--at-block N] [--json]
logos-scaffold test-node account batch-get --url URL --account-id ID... [--at-block N] [--json]
logos-scaffold test-node proof get --url URL --commitment HEX|BASE58 [--at-block N] [--json]
logos-scaffold test-node snapshot accounts --url URL --account-id ID... --output PATH [--json]
```

State snapshots and seeding:

```bash
logos-scaffold test-node state schema [--project DIR] [--json]
logos-scaffold test-node state export --url URL --account-id ID... --output PATH [--json]
logos-scaffold test-node state seed [--project DIR] --input PATH [--output DIR] [--json]
```

The same surface is available in Rust via
`logos_scaffold::api::testnode::{TestNode, TestNodeConfig}`.

## Basecamp

```bash
logos-scaffold basecamp setup
logos-scaffold basecamp modules [--path PATH]... [--flake REF]... [--show]
logos-scaffold basecamp install [--print-output]
logos-scaffold basecamp launch <profile> [--log-file[=PATH]]
logos-scaffold basecamp develop <module> [--dev-shell ATTR]
logos-scaffold basecamp build [--variant lgx|lgx-portable|all] [--module NAME]
logos-scaffold basecamp build-portable [--module NAME]
logos-scaffold basecamp run <module> [--host standalone]
logos-scaffold basecamp paths <profile> [--json]
logos-scaffold basecamp doctor [--json]
logos-scaffold basecamp docs
```

Project contract for modules: [basecamp-module-requirements.md](https://github.com/logos-co/scaffold/blob/v0.4.1/docs/basecamp-module-requirements.md).

## Diagnostics

```bash
logos-scaffold doctor [--json]
logos-scaffold report [--out PATH] [--tail N]
logos-scaffold completions <bash|zsh>
logos-scaffold help
```

## Command semantics

- `create` and `new` are aliases.
- `init` writes `scaffold.toml` (schema v0.2.0) with defaults into the current directory so an existing project can use the scaffold workflow. It creates `.scaffold/{state,logs}` and appends `.scaffold` to `.gitignore`. When `scaffold.toml` already exists at an older schema, `init` migrates it in place via `toml_edit` so comments, key ordering, and unrelated sections survive the rewrite — old `[basecamp].pin` / `.source` / `.lgpm_flake` move to `[repos.basecamp]` / `[repos.lgpm]`; old `[basecamp.modules.*]` move to top-level `[modules.*]`; legacy `url` fields on `[repos.{lez,spel}]` are dropped. Migrations write a `scaffold.toml.bak` next to the original by default (skip with `--no-backup`); preview either form with `--dry-run`. Already-current configs succeed, leave `scaffold.toml` unchanged, and refresh the shipped AI skills. Run `setup` next after a fresh init or migration.
- `setup` syncs LEZ and `spel` to their pinned commits (read from `[repos.lez]` / `[repos.spel]`), builds the standalone `sequencer_service`, `wallet`, and `spel` binaries locally, and seeds a project default wallet when none is set. From LEZ v0.2.4 wallet commands need a running sequencer, so with no localnet up `setup` reports the seeding as deferred; `run` seeds right after it starts localnet, and any later `setup`/`build` with localnet up does too. Seeding takes the first preconfigured public account from the pinned LEZ debug wallet config when it ships any (deterministic); when it ships none — LEZ v0.2.0 does not — `setup` instead runs the wallet CLI once so it creates its own storage and adopts the first public account it lists, which is freshly generated key material guarded by `LOGOS_SCAFFOLD_WALLET_PASSWORD` (see [SECURITY.md](https://github.com/logos-co/scaffold/blob/v0.4.1/SECURITY.md)). All binaries are project-local and are not installed to PATH — use `logos-scaffold wallet ...` / `logos-scaffold spel -- ...` to interact with them. By default `[repos.lez].path` / `[repos.spel].path` are empty in `scaffold.toml`; the on-disk location is resolved at runtime from `<cache_root>/repos/<name>/<pin>` (`<pin>-src-<hash>` when `[repos.<name>].source` is not scaffold's default, e.g. after `create --lez-path`, so projects on the same pin but different sources never share a checkout; `basecamp setup` keys `repos/basecamp/` the same way, and `test-node` resolves a `--lez-path` source to that same cache copy), so the file is portable across machines and CI. `--vendor-deps` projects keep relative `.scaffold/repos/{lez,spel}` literals; an explicit absolute `path` set in `scaffold.toml` is honored as-is.
- `build [project-path]` runs `setup` and then `cargo build --workspace`. When the project has a `methods/Cargo.toml`, it then builds the risc0 guest programs using the strategy in `[build].guest` — `docker` (default) with the pinned `risczero/risc0-guest-builder` container for a reproducible `program_id`, or `local` with the host toolchain. `--guest <local|docker>` overrides the config for one run. Spel projects (`framework.kind = "spel"`) ignore `[build].guest`: they always build the guest in Docker through `make build` (`cargo risczero build`), and `--guest local` prints a note saying so instead of switching to the host toolchain. Guest artefacts from the mode that did *not* run are removed, so the last `build` is unambiguously what `deploy` ships. In default-template projects `build` also edits two guest sources in place: `simple_tail_call.rs` and `tail_call_with_pda.rs` hardcode their callee's program id (`HELLO_WORLD_PROGRAM_ID_HEX`, `HELLO_WORLD_WITH_AUTHORIZATION_PROGRAM_ID_HEX`), which depends on the build mode and toolchain. When the built callee differs, `build` rewrites the constant, prints `Updated … program id …` and rebuilds the guests once, leaving those files modified in the worktree. A hand-set value in either constant does not survive the next `build`; there is no opt-out.
- `deploy [program-name]` deploys one or all guest programs discovered in `methods/guest/src/bin/*.rs` using prebuilt `.bin` artifacts. Artefacts from a deterministic build outrank host-toolchain ones (`.../release/`), which outrank debug builds. Only the deterministic output scaffold itself writes earns that top rank — `target/riscv-guest-docker/.../docker/` in default projects, `methods/guest/target/.../docker/` in spel projects — so a `docker/` leftover elsewhere (e.g. a hand-run `cargo risczero build` in a default project) cannot shadow a fresh `build`; `deploy` names any it ignores in a `note:` on stderr. After each successful submission it prints `program_id: <hex>` (the risc0 image ID, computed locally from the submitted ELF) and includes it in `--json` output on both code paths. Use `--json` for machine-readable output (recommended for automation): `--program-path … --json` emits the bare per-program object, and the discovery path emits `{"deploys":[…]}` with one such object per attempted program (see FURPS Functionality #9 for the field contract).
- `build idl [project-path]` regenerates the IDL from the project source using the vendored `spel` binary.
- `build client [project-path]` regenerates client bindings from the current IDL using the vendored `spel` binary.
- `localnet start` waits until localnet is actually ready (`pid alive` + `127.0.0.1:3040` reachable), otherwise fails with diagnostics. The sequencer is daemonized via `setsid` so it survives shell/tmux session closure — closing the terminal or detaching a tmux session does not kill the localnet.
- `localnet status` distinguishes managed process, stale state, and foreign listeners.
- `localnet reset` stops the sequencer, clears sequencer chain state, restarts, and verifies blocks. Destructive: `--yes` is required unless `--dry-run` is passed (`--dry-run` prints the plan without changing anything). `--reset-wallet` also deletes the project wallet home and default-address state (irrecoverable).
- `test-node` manages isolated, short-lived sequencer instances for integration tests — unlike `localnet` (one long-lived developer sequencer per project on a fixed port), each test node gets its own RPC port, config, database, log, and runtime directory under `.scaffold/test-nodes/<id>`. Test-node commands follow the **caller project's pins**: `pins` reports the LEZ source/ref, resolved commit, checkout location and ownership, sequencer binary path, and circuits version/path that test-node commands will use — each value annotated with where it came from (CLI override → `scaffold.toml` → scaffold default). `prepare` resolves those pins, materialises the LEZ checkout and circuits release, and builds the standalone sequencer for them; managed cache checkouts may be cloned/re-synced, while caller-provided checkouts (`[repos.lez].path`, or a local directory passed via `--lez-source`) are only validated — clean worktree at the requested commit, any origin URL form — and never reset or force-checked-out. `doctor` reports pin drift, missing/dirty/mismatched checkouts, missing binaries, missing circuits, and unsupported platforms as separate categorized checks. `start` spawns a node (`--port 0`/default picks a free port; `--state DIR` seeds the database from a caller-provided state directory; `--block-create-timeout-ms` / `--retry-pending-blocks-timeout-ms` override sequencer block timing in milliseconds, from 1 to 3,600,000) and prints connection details — machine-readable with `--json` (`rpc_url`, `pid`, `state_dir`, `config_path`, `log_path`, `genesis_block_id`, `block_height`). `status --node <id>` reports health and the served RPC URL. `stop --node <id>` terminates only that node and removes its runtime state unless `--preserve-work-dir` is passed. `run -- <cmd>` starts a node, waits for health, runs the command with `LGS_TEST_NODE_RPC_URL` / `LGS_TEST_NODE_PORT` / `LGS_TEST_NODE_STATE_DIR` (and friends) exported, forwards the command's exit status, and stops the node; `--serial` caps machine-wide node concurrency at one for low-resource CI, `--parallel N` at N. The same surface is available in Rust via `logos_scaffold::api::testnode::{TestNode, TestNodeConfig}`, with timing overrides through `BlockTimingOverrides` helper APIs. `tx submit` / `tx wait` / `tx submit-and-wait` give test harnesses definitive transaction outcomes: `submit` returns the tx hash or a structured stateless rejection; `submit-and-wait --json` prints exactly one terminal outcome object — `committed` (with the actual sequencer `block_id` and `timestamp`), `rejected` (`phase: stateless|stateful`, with reason or `observed_after_block_id`), `timeout` (`last_observed_block_id`), `transport_error`, or `wire_mismatch` — and exits non-zero for anything but `committed`. Stateful rejection follows an explicit observation rule (a configurable number of new blocks past the submission boundary without inclusion, confirmed by scanning the chain's blocks for the hash, since a node resumed from a database forgets `getTransaction` lookups), never a single sleep — a scan that meets a block it cannot fully parse (a privacy-preserving transaction) ends in `timeout`, not `rejected`; transport failures are never reported as business rejections. In Rust: `node.client().submit_and_wait(&TransactionBytes::borsh_base64(..)?, &WaitOptions::default())`. `blocks head|range|wait` expose deterministic block context for replay: per block they report the real sequencer `block_id` and `timestamp`, transaction count, and explicit classification — genesis (block 1: empty up to LEZ v0.2.3; from v0.2.4 it carries the genesis setup transactions ending in a `clock(0)` initialisation; either way there is no clock tick to replay), clock-only (empty post-genesis blocks still advance clock state via the mandatory clock transaction), and user transactions — plus per-transaction hashes for public/deployment transactions. `clock read` returns all three `/LEZ/ClockProgramAccount/…` accounts with their decoded `block_id`/`timestamp` data; `clock wait-stable` is a read barrier that requires consecutive identical samples (head + clock state) before returning, so tests comparing local expected state against an always-ticking sequencer get a consistent snapshot or a retryable timeout. In Rust: `client.block_head()`, `client.blocks(BlockRange { from, to })`, `client.wait_blocks(after, count, timeout)`, `client.clock_snapshot(ClockReadMode::Stable { samples, timeout })`. `account get` / `account batch-get` / `proof get` give parity assertions stable, block-scoped state reads: every read reports the `block_id` it was performed at (head verified identical before and after, retried when a clock block landed mid-read, structured retryable error when the head keeps advancing); `batch-get` reads all accounts at ONE consistent boundary. Account values distinguish `present` (with lossless base64 account bytes plus decoded balance/nonce/owner/data), `missing` (never written), and `decode_error` (raw payload preserved); proof reads distinguish a missing commitment (`proof: null`), an invalid commitment (local error before any RPC), and transport failures. `snapshot accounts` writes a block-consistent JSON snapshot for later comparison. In Rust: `client.account(id, ReadAt::Latest)`, `client.accounts(&ids, ReadAt::Block(n))`, `client.proof(commitment, ReadAt::Latest)`. `state schema|export|seed` support caller-provided state: `schema` identifies the exact snapshot formats the project's pins accept; `seed` validates a snapshot (`lgs-state-snapshot/1` JSON with public balances (+ private commitment accounts before LEZ v0.2.4), the `lgs-account-snapshot/1` output of `snapshot accounts`, or a rocksdb state directory) and produces a state directory for `test-node start --state` — validation distinguishes format mismatch, storage-schema mismatch (e.g. public-account data, which the pinned genesis config cannot seed), LEZ pin mismatch, and account decode errors, and the output reports the LEZ commit, state format version, and account counts. Config-seeded nodes fund exactly the snapshot's accounts at genesis. On LEZ v0.2.4+ each public account becomes a `supply_account` entry in the runtime config's `genesis` list, replacing the debug config's sample accounts. That entry credits the account's **vault PDA**, not the account itself (`state seed` warns about this). The sequencer's built-in testnet state is always present, and private accounts cannot be seeded (`storage schema mismatch`). Pins before v0.2.4 use `initial_public_accounts` / `initial_private_accounts` with no defaults. Until `test-node prepare` has materialised a non-default pin's checkout, `state schema` and `state seed` refuse rather than guess its config shape. Database-seeded nodes resume from the copied rocksdb exactly. `export` writes named public-account balances from a running node (the pinned RPC has no account enumeration or private-state export; for full fidelity, stop a node with `--preserve-work-dir` and seed from its state directory). In Rust: `StateSchema::for_project`, `StateSnapshot::from_file/new`, `api::testnode::seed_state(&project, input, output)`.
- `wallet list` shows known wallet accounts (`wallet account list`).
- `wallet topup` checks account state first (`wallet account get --account-id ...`), runs `wallet auth-transfer init --account-id ...` only when the destination is uninitialized, then performs Piñata faucet claim (`wallet pinata claim --to ...`). If address is omitted, scaffold uses project default wallet from `.scaffold/state/wallet.state`.
- `wallet default set` stores a project-scoped default wallet address in `.scaffold/state/wallet.state`.
- `wallet -- ...` forwards raw wallet CLI arguments to the project-local wallet binary while preserving project wallet environment.
- `run` combines build (which chains `setup`), IDL build, localnet start, wallet topup, and deploy into a single command — the inner loop for day-to-day development. It works with no configuration. If a `[run]` section with `post_deploy` is present in `scaffold.toml`, each hook is executed after deploy via `sh -c` (cwd = project root) with `SEQUENCER_URL`, `NSSA_WALLET_HOME_DIR`, `LEE_WALLET_HOME_DIR`, `SCAFFOLD_PROJECT_ROOT`, `SCAFFOLD_IDL_DIR`, `SCAFFOLD_TOPUP_SKIPPED`, and `SCAFFOLD_DEPLOY_SKIPPED` env vars; when the project has exactly one deployable program, `SCAFFOLD_PROGRAM_ID` and `SCAFFOLD_GUEST_BIN` are also set. If a localnet is already running it is reused; otherwise it is started, and deploy is skipped when the guest binaries + IDL + config and the sequencer instance are unchanged. `--profile NAME` selects a named pipeline from `[run.profiles.<name>]`; `--reset` wipes sequencer state + wallet and re-seeds before the run (`--no-reset` overrides a config-set default); `--post-deploy <cmd>` (repeatable) overrides the configured hooks and `--no-post-deploy` skips them entirely; `--watch` re-runs the pipeline on file changes. `run` covers the deploy loop only — it does not run `wallet -- check-health` or any `basecamp` command.
- `spel -- ...` forwards raw spel CLI arguments to the project-vendored `spel` binary so any spel subcommand (`inspect`, `pda`, `generate-idl`, …) runs against the project's pinned version without a global install. Like `wallet -- ...`, it always points spel at the project wallet (`[wallet].home_dir`, exported as both `LEE_WALLET_HOME_DIR` and `NSSA_WALLET_HOME_DIR`), overriding any value exported in the shell; to drive spel against another wallet, run the vendored binary directly.
- `basecamp setup` pins basecamp + `lgpm` (read from `[repos.basecamp]` / `[repos.lgpm]` — both `build = "nix-flake"`), builds both (logged to `.scaffold/logs/<timestamp>-setup-*.log`), and seeds per-profile XDG directories for `alice` and `bob` under `.scaffold/basecamp/profiles/`. The two pins move as a set: scaffold's default `lgpm` rev is the one the pinned basecamp release locks, because that same package-manager library is what the app uses to read the modules `lgpm` installed. Scaffold supports basecamp 0.3.0 only; the defaults are that release's set. A project still on a default set an earlier scaffold wrote (basecamp 0.2.3 or v0.1.1, or a captured default `delivery_module` flake) is moved forward by `setup`, which prints each rewritten value; the match is on the exact retired revs (a deliberate pin to one is moved too); any other pin is kept, and moving it means editing both and re-running `setup`. A commit pin that is already built is reused rather than re-evaluated, so a second `setup` does not pay the basecamp flake's multi-GB evaluation again. Runtime config (`port_base`, `port_stride`) is in `[basecamp]`.
- `basecamp modules` is the sole writer of the captured module set, which lives in top-level `[modules.<name>]` sections (each with `flake` and `role = "project" | "dependency"`). Modules aren't basecamp's property — they're the project's Logos modules, which basecamp happens to be one consumer of. Zero-arg runs auto-discovery: walks project flakes (root `.#lgx` first, else immediate sub-flakes), derives a `module_name` per source (from `metadata.json.name` for local paths; heuristic from the github repo slug for remote refs, with a one-line assumption note you can correct in `scaffold.toml`), then resolves each declared dep name (plain names and 0.3.0's `{name, version, signer}` objects, from `dependencies` and `optional_dependencies`) by: (1) already keyed in `[modules]`, (2) the list of modules basecamp bundles itself, (3) the source's own `flake.lock`, (4) scaffold-default pin. Unresolved required deps **fail fast** — no silent skip; an unresolved optional dep is skipped with a note. `--flake <ref>` / `--path <file>` capture explicit project sources; `--show` prints the current set without mutating. Re-runs are idempotent: existing `[modules]` entries are preserved so hand-edits survive. Project contract: see [docs/basecamp-module-requirements.md](https://github.com/logos-co/scaffold/blob/v0.4.1/docs/basecamp-module-requirements.md).
- `basecamp install` is pure replay: builds every captured source (dependencies first, then project modules — fail-fast on a broken companion pin) and installs them into both `alice` and `bob` via `lgpm`. No source-set flags. If the state is empty on first call it transparently invokes `basecamp modules` in auto-discover mode, prints what was captured, and proceeds. Each nix build logs to `.scaffold/logs/<timestamp>-install.log` with a one-line progress status (duration on both success and failure); `--print-output` (or `LOGOS_SCAFFOLD_PRINT_OUTPUT=1`) opts back into streaming nix output directly for CI.
- `basecamp launch <profile>` scrubs the profile's data/cache under `.scaffold/basecamp/profiles/<profile>/`, replays captured modules, assigns per-profile ports, and execs `basecamp` with the profile's XDG environment, a per-profile `HOME` (`<profile>/home`, kept across launches so modules that store identity under `$HOME` stay distinct per profile and out of the developer's real home), plus an absolute `LOGOS_USER_DIR` (basecamp resolves its data tree from that; on macOS it ignores `XDG_DATA_HOME`, so without it every profile would share one tree). The scrub also discards the profile's `module_data/` and basecamp's own `logs/`, both of which live under that root. `--log-file` tees basecamp's output to `.scaffold/basecamp/profiles/<profile>/basecamp.log`, or to `--log-file=PATH`. Before exec, prints a one-line variant-check summary of installed modules so the freeze-on-first-click case (upstream manifest variant mismatch) is visible. The scrub is scoped to the project's own profiles directory and is the whole point of the command — clean-slate semantics on every launch. Custom launch env is declarative via `scaffold.toml`: `[basecamp.env]` sets plain vars on every profile, `[basecamp.env_append]` `:`-joins path lists (e.g. `QT_PLUGIN_PATH`, `LD_LIBRARY_PATH`) onto the value `lgs` inherited so basecamp's own paths aren't clobbered, and `[basecamp.profiles.<name>.env]` sets per-profile vars that win over the global `[basecamp.env]` (e.g. distinct `LOGOS_STORAGE_API_PORT` for `alice` vs `bob`).
- `basecamp develop <module>` resolves the module's flake from `[modules.<module>]`, strips its `#lgx` output fragment, and execs `nix develop <flake>` from the project root — so an in-shell `lgs` resolves this project via its normal cwd-upward search (the dev shell starts in the project root). It also exports `SCAFFOLD_PROJECT_ROOT` / `LOGOS_PROFILE` as context for scripts in the shell (project discovery itself doesn't read them). `--dev-shell <attr>` selects a non-default dev shell (`nix develop <flake>#<attr>`). An unknown module name fails fast with the captured-module list before any `nix` invocation. This is the verb-set-symmetry wrapper so contributors stop reaching for raw `cd <module> && nix develop`.
- `basecamp build-portable` rebuilds every `role = "project"` entry in `[modules]` with attr-swapped `#lgx-portable` for hand-loading into a basecamp AppImage. Sources come from scaffold.toml (managed via `basecamp modules`); `--module NAME` narrows the run to one of them. `role = "dependency"` entries are intentionally skipped — the target AppImage provides its own release companion modules via its Package Manager catalog. Output is ordered topologically by `metadata.json` dependencies (leaves first, so basecamp's AppImage can resolve each module's deps before loading it), and symlinked into `.scaffold/basecamp/portable/` as `<NN>-<module_name>.lgx` so the AppImage's "install lgx" file picker has browsable, human-named files in the right order. The directory is wiped and recreated per run.
- `basecamp build` builds the project's `.lgx` artefacts without installing them. `--variant` picks `lgx`, `lgx-portable`, or `all` (the default); `--module NAME` restricts the build to one captured project module. `build-portable` is the alias for `build --variant lgx-portable`.
- `basecamp run <module>` runs a captured module standalone via `nix run <flake>`, without starting basecamp itself. Like `install`, `build` and `develop`, it passes `--override-input <name> path:<sibling>` for each `path:../<sibling>` input that names another captured project module, so multi-flake projects resolve their siblings from the working tree.
- `basecamp paths <profile>` prints the resolved per-profile path manifest: XDG dirs, the per-profile `home` (exported as `HOME`), runtime dir, module and plugin dirs, and the log file. `--json` for machine-readable output.
- `basecamp docs` prints the embedded copy of [basecamp-module-requirements.md](https://github.com/logos-co/scaffold/blob/v0.4.1/docs/basecamp-module-requirements.md), so the project contract is available offline and at the pinned version.
- `basecamp doctor` emits a basecamp-specific health report: the resolved basecamp/`lgpm` pin set (warning when one of the pair is at scaffold's default and the other isn't — the two are read as one set — or when basecamp is still on a retired scaffold default, which `basecamp setup` upgrades), captured modules summary (each entry's flake ref, parsed tag/commit annotation for github refs, and any API headers already installed in alice's profile), manifest variant check per seeded profile (flags modules whose `main` is missing the current-platform `-dev` key — the freeze-on-first-click failure mode), dep-pin drift (captured `role = "dependency"` rev vs. scaffold default), and auto-discovery drift (project sources discoverable today but absent from the captured set). `--json` for machine-readable output.
- `doctor` prints actionable checks and next steps; `--json` is for CI/machine parsing.
- `report` creates a `.tar.gz` diagnostics bundle for GitHub issues using strict allowlist collection with redaction and explicit skip reporting.
- `completions <shell>` prints a shell completion script to stdout. Supported shells: `bash`, `zsh`. The generated script covers both `lgs` and `logos-scaffold`.
- Wallet-facing commands accept `LOGOS_SCAFFOLD_WALLET_PASSWORD` for password override (fallback: local dev default).
