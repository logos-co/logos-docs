---
title: Gate program instructions with admin-authority
doc_type: procedure
product: lez
topics: lez
steps_layout: sectioned
authors: mmlado
owner: logos
doc_version: 1
slug: admin-authority
sidebar_position: 1
---

# Gate program instructions with admin-authority

:::warning
This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. This content is still being completed and verified.

The dependency snippets pin `admin-authority` v0.2.0 and the framework at the upstream `v0.7.0` tag, the first release that carries the extension mechanism ([logos-co/spel#257](https://github.com/logos-co/spel/pull/257)).
:::

`admin-authority` is a SPEL extension that adds a single transferable admin role to your [LEZ](../../get-started/glossary.md#lez) program. The admin is the only [account](../../get-started/glossary.md#account) allowed to call admin-gated instructions. The role can be transferred to another signer or [PDA](../../get-started/glossary.md#pda), or renounced permanently. This page walks through using `admin-authority` from an app developer's perspective. If you are building a different extension, see [Build a SPEL extension library](build-a-spel-extension-library.md) instead.

## When to use it

Pick `admin-authority` when your [program](../../get-started/glossary.md#program) has:

- A configuration or policy account that only one party should mutate (`set_fee_bps`, `update_oracle_address`, `pause`).
- An emergency action that needs guarded access (`recover_funds`, `migrate_state`).
- A handoff scenario where ownership might rotate between parties over time.

If your program needs multi-party approval rather than single-admin gating, `admin-authority` is the wrong primitive, wait for `multisig-authority` (RFP-TBD) or compose admin-authority with a multisig PDA as the admin.

## Prerequisites

You need a stable Rust toolchain, git, and the native build tools the dependency tree leans on. The `spel` CLI additionally needs `unzip` (the `rust-rapidsnark` build script downloads a prebuilt zip and unpacks it through a helper shell script), the Python development library (a transitive dependency links against libpython through `pyo3`), and the PC/SC smart card library (the wallet crate it builds links `pcsc`). The verification step at the end uses `jq`. On a fresh Ubuntu 24.04 this covers everything:

```bash
sudo apt-get update && sudo apt-get install -y curl git build-essential pkg-config libssl-dev ca-certificates unzip python3 python3-dev cmake libpcsclite-dev jq
```

Two different floors apply here, and neither comes from `admin-authority` itself, which declares only `rust-version = "1.88"`. Building your program needs rustc 1.90 or newer whenever `ruint` resolves freely, the floor its 1.20.0 release sets. A `spel init` scaffold pins `ruint = "=1.17.0"` in its guest manifest, so that particular floor does not apply on the scaffold route. Installing the `spel` CLI needs rustc 1.94.0 or newer: a transitive `logos-blockchain` crate uses `strict_overflow_ops`, which older toolchains reject as an unstable feature. The CLI pins `channel = "1.94.0"` in its own `rust-toolchain.toml`, but `cargo install --git` does not apply a dependency's toolchain file, so your default toolchain has to meet that floor itself. Verified in a clean Ubuntu 24.04 container on rustc 1.99.0: the CLI installs from the tag, the scaffolded program builds and deploys, and every command on this page ran against a local LEZ v0.2.4 sequencer, both handovers included. The deploy and the lifecycle commands, both handovers and renounce included, also ran on the public legacy testnet.

## Add the dependency

In your program's `Cargo.toml`. If you do not have a program crate yet, do [Install the `spel` CLI](#install-the-spel-cli) and the `spel init` command in [Annotate the module](#annotate-the-module) first, then come back here. For a `spel init` scaffold the manifest to edit is `methods/guest/Cargo.toml`, not the root manifest, which is a `[workspace]` excluding `methods/guest`. That guest manifest already carries its own `[dependencies]` table, holding `spel-framework`, `nssa_core`, `risc0-zkvm`, your project's `_core` crate, `serde`, `borsh` and the `ruint = "=1.17.0"` pin from the prerequisites, so merge the entries below into it rather than appending a second table, which cargo rejects outright with `error: duplicate key`. Scaffolded with the source flags from [Annotate the module](#annotate-the-module), its `spel-framework` and `nssa_core` pins already match these, so `admin-authority` is the only line you add:

```toml
[dependencies]
admin-authority = { git = "https://github.com/mmlado/spel-admin-authority", tag = "v0.2.0" }
spel-framework  = { git = "https://github.com/logos-co/spel", tag = "v0.7.0" }
nssa_core = { git = "https://github.com/logos-blockchain/logos-execution-zone.git", tag = "v0.2.4", package = "lee_core" }
borsh = { version = "1", features = ["derive"] }
serde = { version = "1", features = ["derive"] }
```

All five are needed: the reference samples use exactly this set. `nssa_core` carries the on-chain account types, `borsh` encodes your state, and `serde` is required by the instruction plumbing even when your own types never touch it. The `admin-authority-macros` sub-crate is pulled in transitively. You do not need to declare it directly.

The `spel-framework` entry must be the reference `admin-authority` itself pins, the `v0.7.0` tag, spelt the same way. The library README names it for each release. Cargo identifies a git dependency by its reference, so a branch, another tag, or even a `rev` pointing at the same commit puts two copies of the framework into your dependency graph, and the build fails with a `From<AdminError>` trait error plus name resolution errors inside the `require_admin` expansion.

After adding the dependencies, run `cargo fetch` once from `methods/guest`, not from the project root. The scaffold's root `Cargo.toml` excludes `methods/guest`, so a root `cargo fetch` resolves a graph that does not contain `admin-authority`: it still updates the workspace's own registry and git sources and exits 0, so nothing in its output tells you the extension was skipped. The framework's extension scanner resolves your dependency graph with an offline metadata call, which fails deterministically for a fresh consumer whose git dependencies were never fetched.

## Install the `spel` CLI

The lifecycle commands below and the IDL check at the end use the `spel` CLI. Install it from the same upstream tag the framework dependency pins:

```bash
cargo install --git https://github.com/logos-co/spel --tag v0.7.0 spel
```

The package name is `spel`, not `spel-cli` as the repository directory suggests, asking cargo for `spel-cli` fails with "could not find `spel-cli`."

This build also reaches the network beyond fetching crates: a transitive build script downloads a prebuilt `logos-blockchain-circuits` artifact from GitHub releases. It does not honour the usual CA environment variables, so behind a TLS-inspecting proxy it fails with `invalid peer certificate: UnknownIssuer` partway through the build. If the download cannot reach GitHub directly, either point `LBC_ROOT_DIR` at a local circuits build, or pre-seed the cache using a tool that does honour your CA bundle:

```bash
mkdir -p ~/.cache/logos/blockchain
curl -fL https://github.com/logos-blockchain/logos-blockchain-circuits/releases/download/v0.5.3/logos-blockchain-circuits-v0.5.3-linux-x86_64.tar.gz \
  | tar xz -C ~/.cache/logos/blockchain/
```

The version has to match the `logos-blockchain-circuits` version the pinned framework resolves to, `v0.5.3` for `v0.7.0`. The build script reuses any artifact directory it finds there and skips the download entirely.

## Annotate the module

This page assumes you already have an LEZ program crate. A deployable one is a RISC Zero guest, and `spel init` scaffolds it at `methods/guest/src/bin/<name>.rs`, where `<name>` is the project name with hyphens replaced by underscores, so `spel init my-program` writes `my_program.rs`. That is the same layout `spel generate-idl` auto-detects when given no path. Pass both source flags ahead of the project name, the parser stops reading flags at the first argument that is not one, so anything after the name is dropped without a warning. With the default pins the scaffold takes `logos-co/spel` at its `main` branch. A branch never unifies with the tag `admin-authority` pins, and as it moves its `lee_core` can differ too. Either way the guest ends up with two copies of the framework and fails to compile with type errors out of the `#[lez_program]` expansion rather than anything naming the marker. Pass the tag:

```bash
spel init \
    --spel-git https://github.com/logos-co/spel.git \
    --spel-tag v0.7.0 \
    my-program
```

If you only want to check the integration and started from `cargo new`, delete the default `fn main` first. The `#[lez_program]` macro generates the program's entry point, and the leftover stub collides with it as a duplicate `main`.

Add `#[admin_authority]` to your `#[lez_program]` module, directly below the `#[lez_program]` attribute:

```rust
use spel_framework::prelude::*;

#[lez_program]
#[admin_authority]
mod my_program {
    #[instruction]
    pub fn create_pool(
        #[account(init, pda = literal("pool_config"))] config: AccountWithMetadata,
    ) -> SpelResult { /* writes the initial PoolConfig */ }
}
```

Nothing is imported from the library at this point. The `#[admin_authority]` marker is consumed by the framework's scanner during expansion, not resolved as an import, so importing the name only earns an unused import warning. The gate attribute gets imported when the first instruction uses it, next section. The module body does not need `use super::*;` either, the macro resolves paths to items declared outside the module on its own.

That single annotation exposes five new instructions in your program's IDL:

| Instruction | Purpose |
|---|---|
| `admin_initialize` | Creates the admin Config PDA and installs the caller as the first admin. Must be called once after deployment. |
| `admin_transfer` | Replaces the current admin with a new signer or PDA in one transaction. |
| `admin_nominate` | Names the next admin. Nothing changes until the nominee accepts. |
| `admin_accept` | The nominee signs alone and becomes admin. |
| `admin_renounce` | Zeros the admin permanently. Terminal, no recovery path. |

:::warning
**Initialisation window.** Until `admin_initialize` is called, the admin Config PDA does not exist. Unless you build with a genesis key, see [Fix the first admin at build time](#fix-the-first-admin-at-build-time), anyone who submits the first `admin_initialize` becomes the admin. Send it as the very next transaction after deployment to prevent a third party from claiming the role. Bundling with the deployment itself is not possible today because a LEZ deployment transaction carries no instructions.
:::

## Gate an instruction

Add `#[require_admin]` to any instruction that should only succeed when the caller is the current admin:

```rust
#[account_type]
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct PoolConfig {
    pub fee_bps: u32,
}

// ... inside the #[lez_program] module:
use admin_authority::require_admin;

#[instruction]
#[require_admin]
pub fn set_fee_bps(
    #[account(mut, pda = literal("pool_config"))] mut config: AccountWithMetadata,
    new_fee_bps: u32,
) -> SpelResult {
    // The admin check has already run.
    PoolConfig { fee_bps: new_fee_bps }.write_to(&mut config)?;
    Ok(SpelOutput::execute(vec![config], vec![]))
}
```

The `write_to` helper is yours to write, the library does not provide it. The reference sample uses this one:

```rust
impl PoolConfig {
    fn write_to(&self, account: &mut AccountWithMetadata) -> Result<(), SpelError> {
        account.account.data = borsh::to_vec(self)
            .map_err(|_| SpelError::SerializationError { message: "encoding failed".into() })?
            .try_into()
            .map_err(|_| SpelError::SerializationError { message: "data too large".into() })?;
        Ok(())
    }
}
```

Keep the arguments of instructions you call from the `spel` CLI to the types `spel --help` lists, such as `u8`, `u32`, `u64` and byte arrays. It has no encoding for `u16` and refuses such a call before sending it.

The `#[account_type]` struct sits outside the `#[lez_program]` module, the instruction inside it. The handler returns `Ok(SpelOutput::execute(post_states, messages))`, where `post_states` lists your declared accounts in declaration order. The injected `admin_config` and `caller` are prepended to the post-states automatically, ahead of the accounts you declared, you only handle the parameters you wrote.

The gate needs two accounts, the `admin_config` PDA holding the current admin state and a signing `caller`. You do not have to write them: the framework injects both from metadata the library declares, and they appear in the IDL like declared parameters. Declaring them explicitly produces the same program only if you declare them ahead of your own parameters and in the injected order, `admin_config` then `caller`. They are then your parameters, appearing in your post-states list like any other account. Declaring them after your own parameters still compiles, but it reorders the instruction's accounts in the IDL, and that order is the transaction ABI.

If your instruction already has parameters by different names, point the gate at them with the inject-account names as keys: `#[require_admin(admin_config = my_cfg, caller = owner)]`. Use that form whenever either name differs. The framework does reuse a declared `#[account(signer)]` parameter, or a PDA parameter with the matching seed, in the instruction's account list rather than injecting it twice, but the gate's prologue still refers to the accounts by their role names, so a bare `#[require_admin]` over a renamed parameter fails to compile with `cannot find value caller in this scope` pointed at the attribute.

## Build and deploy the program

The scaffold's `make build` runs `cargo risczero build`, which compiles the guest in Docker. With framework `v0.7.0` that build fails for a program whose extensions are git dependencies: inside Docker the extension scanner cannot resolve the dependency graph offline, and it stops with `marker(s) ["admin_authority"] matched no discoverable extension and dependency resolution failed`. Build natively through the scaffold's `methods` crate instead. That needs the RISC Zero toolchain:

```bash
curl -L https://risczero.com/install | bash
rzup install
```

Tell the `methods` crate which guest to build, in `methods/Cargo.toml`:

```toml
[package.metadata.risc0]
methods = ["guest"]
```

Then build from the project root and read the program id:

```bash
cargo build --release -p my_program-methods
spel program-id target/riscv-guest/my_program-methods/my_program-guest/riscv32im-risc0-zkvm-elf/release/my_program.bin
```

The value under `ImageID (hex bytes)` is the program id every command below takes as `--program`. Deploy the same file with the LEZ `wallet` CLI, installed from the LEZ release your `nssa_core` pin names. The wallet and the `spel` CLI both read their configuration, including the sequencer address, from the directory `LEE_WALLET_HOME_DIR` points at.

The public LEZ legacy testnet runs v0.2.4, the release this page builds against. Point a new wallet home at its sequencer, check the connection, and deploy:

```bash
cargo install --git https://github.com/logos-blockchain/logos-execution-zone.git --tag v0.2.4 wallet
export LEE_WALLET_HOME_DIR=~/lez-wallet
wallet change-network https://testnet-legacy.lez.logos.co
wallet check-health
wallet deploy-program target/riscv-guest/my_program-methods/my_program-guest/riscv32im-risc0-zkvm-elf/release/my_program.bin
```

On a new wallet home, `change-network` first sets up the wallet. It asks for a password and prints a recovery phrase. The [legacy testnet explorer](https://explorer.testnet-legacy.lez.logos.co/) shows the blocks.

Blocks on the legacy testnet are about a minute apart, so a command can report `Transaction NOT confirmed: Transaction not found in preconfigured amount of blocks` from `spel`, or `Error: All pollers failed` from `wallet auth-transfer init`, and still land a block later. `wallet account get --account-id Public/<account-id>` shows the `nonce` of a key, which goes up by one when a transaction it signed lands. Wait for that before you send the next transaction from the same key. A transaction built while the previous one is still pending reuses its nonce and does not land.

To test against a local sequencer instead, build the standalone sequencer from the same LEZ release and start it in its own terminal. It listens on `127.0.0.1:3040` and keeps its state in the directory you start it from:

```bash
git clone --branch v0.2.4 https://github.com/logos-blockchain/logos-execution-zone.git ~/lez
(cd ~/lez && cargo build --release --features standalone -p sequencer_service)
mkdir -p ~/lez-sequencer && cp ~/lez/lez/sequencer/service/configs/debug/sequencer_config.json ~/lez-sequencer/
cd ~/lez-sequencer && RUST_LOG=info ~/lez/target/release/sequencer_service ./sequencer_config.json
```

In another terminal, from the project root, point a wallet home at that sequencer and deploy:

```bash
mkdir -p ~/lez-wallet-local && cp ~/lez/lez/wallet/configs/debug/wallet_config.json ~/lez-wallet-local/
export LEE_WALLET_HOME_DIR=~/lez-wallet-local
wallet check-health
wallet deploy-program target/riscv-guest/my_program-methods/my_program-guest/riscv32im-risc0-zkvm-elf/release/my_program.bin
```

## Become the first admin

`admin_initialize` takes no arguments. The signing caller becomes the admin (self-election). There is no candidate argument at initialise because the LEZ duplicate-account rule rejects a transaction listing the same account twice, so a caller could never also pass itself as candidate evidence.

The admin key must be owned by a program. A key that has never been used is owned by none, and on LEZ v0.2.1 to v0.2.4 such a key can sign once and is then rejected in every later transaction. `admin-authority` therefore refuses it as admin with program error 6112, `admin key is owned by no program`. If your wallet has no public account yet, create one. It prints `Generated new account with account_id Public/<your-account-id>`, and the commands below take the id without the `Public/` prefix. Then claim the key:

```bash
wallet account new public
wallet auth-transfer init --account-id Public/<your-account-id>
```

Every lifecycle command below reads your program's IDL from a file. Generate it once from the program you just built:

```bash
# From a `spel init` project root, drop the path entirely and the guest is auto-detected.
spel generate-idl path/to/your/program/src/main.rs > program-idl.json
```

To check a command without submitting it, add `--dry-run=text` before the `--` separator. It resolves the accounts and arguments and prints the transaction it would send, which is the only way to validate an invocation before you have a node to submit to.

```bash
spel --idl program-idl.json --program <program-id> -- \
    admin-initialize --caller <your-account-id>
```

When the sequencer rejects a transaction, the CLI only reports `Transaction NOT confirmed: Transaction not found in preconfigured amount of blocks`. The reason is in the sequencer log as program error 6000 plus the library's error code, for example `Program error [6103]: ... signer is not the current admin`. The public testnet does not publish its log, so to see the code, run the failing call against a local sequencer. The [library README](https://github.com/mmlado/spel-admin-authority#errors) lists the codes.

To hand the role to a different keyholder or a PDA, initialise first and then call `admin_transfer`, or nominate a successor, see [Hand over in two steps](#hand-over-in-two-steps).

## Fix the first admin at build time

Set `SPEL_ADMIN_GENESIS` to an account id, as 64 hex characters, when the program is built, and only that account can run `admin_initialize`. Anyone else is rejected with program error 6115, `signer is not this build's genesis admin`, which closes the initialisation window. Put it in a `.cargo/config.toml` in the project root, where every build picks it up:

```toml
[env]
SPEL_ADMIN_GENESIS = "<64 hex characters>"
```

The key is compiled into the program, so the program id changes with it. Compare `spel program-id` with and without the key to confirm it is in. A malformed or all-zero value fails the build. In embedded mode there is no `admin_initialize`: call `admin_authority::require_genesis(&caller)?` in your account-creating instruction for the same check.

## Transfer admin to another party

`admin_transfer` requires the current admin to sign. It takes an `AdminCandidate` describing the new admin, paired with a matching `AccountWithMetadata` that proves the candidate on chain.

Two candidate shapes:

```rust
// `AdminCandidate` is a re-exported alias for the shared authority type:
// `pub type AdminCandidate = AuthorityCandidate;`
pub enum AuthorityCandidate {
    /// The new admin is a keyholder. Validated by checking the new account
    /// co-signed the transaction.
    Signer,
    /// The new admin is a program-owned PDA. Validated by deriving the address
    /// from (program_id, seed) and confirming the PDA exists on chain.
    Pda { program_id: ProgramId, seed: [u8; 32] },
}
```

```bash
spel --idl program-idl.json --program <program-id> -- \
    admin-transfer \
    --caller <current-admin-account-id> \
    --new-account <new-admin-account-id> \
    --candidate Signer
```

A `Signer` transfer needs the new admin's signature on the same transaction, which proves the keyholder consents. That means two parties sign one message. Run as written, the command above builds and submits with the caller's signature only, and the sequencer drops the transaction unless the candidate's signature is attached. The `spel` CLI collects that second signature through a partial-transaction file ([logos-co/spel#246](https://github.com/logos-co/spel/pull/246)). The current admin adds the global flags `--co-signer` and `--export` before the `--` separator, which writes the transaction to a file instead of submitting it. The new admin signs it in their own wallet, offline, and anyone with a node connection submits it:

```bash
spel --co-signer <new-admin-account-id> --export handover.json \
    --idl program-idl.json --program <program-id> -- \
    admin-transfer \
    --caller <current-admin-account-id> \
    --new-account <new-admin-account-id> \
    --candidate Signer

# The new admin, in their own wallet:
spel sign handover.json

# Anyone with a node connection:
spel submit handover.json
```

`spel sign` prints the decoded instruction and asks for confirmation before it adds the signature. The file records the next `nonce` of both keys, so neither key may send another transaction between the export and the submit, otherwise the sequencer rejects the transfer. The new admin key needs a program owner, like the first admin's. The witness exchange section of the CLI README describes the file format.

After the transaction lands, the previous admin can no longer call gated instructions.

## Hand over in two steps

`admin_nominate` and `admin_accept` move the role without both parties signing one transaction. The current admin names the next admin, and the nominee later accepts on their own signature:

```bash
spel --idl program-idl.json --program <program-id> -- \
    admin-nominate --caller <current-admin-account-id> --new-admin <nominee-account-id-hex>

spel --idl program-idl.json --program <program-id> -- \
    admin-accept --caller <nominee-account-id>
```

`--new-admin` is a raw 32 byte argument, pass the account id as 64 hex characters, not the base58 form the wallet prints. Convert a base58 id with:

```bash
python3 -c 'import sys,functools;a="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";print(functools.reduce(lambda n,c:n*58+a.index(c),sys.argv[1],0).to_bytes(32,"big").hex())' <account-id>
```

Nothing changes until the nominee accepts, so a wrong id only costs a second nomination. A later nomination replaces an earlier one, nominating the all-zero id cancels, and `admin_transfer` and `admin_renounce` both clear a pending nominee. The nominee key needs a program owner. A PDA nominee accepts through its owning program, which chained-calls `admin_accept` with the seeds of the PDA.

## Use a program (PDA) as the admin

To delegate admin authority to another program, for example a multisig, use `AdminCandidate::Pda` with the delegating program's ID and PDA seed. Payload variants are passed to the CLI as a one-key JSON object:

```bash
spel --idl program-idl.json --program <program-id> -- \
    admin-transfer \
    --caller <current-admin-account-id> \
    --new-account <pda-account-id> \
    --candidate '{"Pda": {"program_id": "<multisig-program-id>", "seed": "<32-byte-hex-seed>"}}'
```

The PDA must already exist on chain as a claimed account, an unclaimed candidate is rejected. When the multisig later wants to invoke a gated instruction on your program, it does so through a chained call and declares its admin PDA in `caller-pda-seeds`. LEZ verifies the seed and propagates `is_authorized = true` to your program; the `#[require_admin]` check then accepts the PDA as the legitimate admin. No private key is needed for the PDA, authorisation comes from the seed delegation.

## Embedded mode, the admin slot inside your own account

Instead of a dedicated Config PDA, the admin slot can live inside one of your program's own accounts at a byte offset. Declared once, program wide, on the marker:

```rust
use admin_authority::AdminConfig;

#[account_type]
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct ProgramConfig {
    pub value: u64,           // bytes 0..8
    pub padding: [u8; 24],    // bytes 8..32
    #[admin_slot]
    pub admin: AdminConfig,   // bytes 32..96, the embedded slot
}

#[lez_program]
#[admin_authority(admin_config = config, offset = 32)]
mod my_program {
    use admin_authority::admin_initialize;

    #[admin_initialize]
    #[instruction]
    pub fn initialize(
        #[account(init, pda = literal("program_config"))] mut config: AccountWithMetadata,
    ) -> SpelResult {
        ProgramConfig {
            value: 0,
            padding: [0; 24],
            admin: AdminConfig::default(),
        }
        .write_to(&mut config)?;
        // the signing caller is injected, and the injected bootstrap
        // installs it as admin in this same transaction
        Ok(SpelOutput::execute(vec![config], vec![]))
    }
}
```

`write_to` is the same helper pattern from the gating section, implemented on `ProgramConfig`.

What changes:

- **No `admin_initialize` instruction.** Mark your own account-creating instruction with `#[admin_initialize]` instead. The bootstrap is injected, the caller is installed as admin in the same transaction that creates the account, and the slot is born initialised, so the initialisation window from the warning above does not exist in embedded mode. An account created without the bootstrap is born renounced, permanently.
- **`#[admin_slot]` keeps the layout honest.** The field marker derives an `ADMIN_SLOT_OFFSET` const and a layout test, and the build fails if the marker position and the `offset = ...` declaration ever disagree, for example after a field is added above the slot.
- **Everything retargets.** Gates read the slot at the declared offset from your account, the management instructions splice only the 64 byte window and leave your neighbouring fields untouched, and the IDL shows your account wherever the dedicated PDA used to appear.
- **The offset is never in a transaction.** It compiles into the program as a literal. The IDL carries no offset argument, and writing `admin_config = ...` or `offset = ...` on a gate by hand is a compile error in embedded mode.
- **One account fewer** on every gated transaction, the slot travels with state you were already passing.

The embedded `AdminConfig` field must sit at the declared offset with only fixed-size fields before it. The library repository ships a reference sample (`admin-authority-sample-embedded`) with the layout, tests, and a committed dry-run walkthrough.

## Renounce admin permanently

```bash
spel --idl program-idl.json --program <program-id> -- \
    admin-renounce --caller <current-admin-account-id>
```

This writes `AccountId::default()` to the Config PDA and clears any pending nominee. From then on every admin-gated instruction, `admin_transfer`, `admin_nominate` and `admin_accept` reject with program error 6102, `admin authority renounced`. There is no recovery path, design your program so renounce is only callable when permanent loss of mutability is the intended outcome (handoff to "immutable" governance, end of life, etc.).

## Verify your integration

After building your program, check that the admin instructions appear in the IDL:

```bash
# From a `spel init` project root, drop the path entirely and the guest is auto-detected.
spel generate-idl path/to/your/program/src/main.rs | jq '.instructions[].name'
```

The `spel` binary must be built from the same framework revision your `Cargo.toml` pins. A CLI built without the extension scanner omits the admin instructions from this output without reporting an error, so the check appears to pass while the surface is missing. The install command in [Install the `spel` CLI](#install-the-spel-cli) pins the right revision. This check is also not a substitute for a build: `generate-idl` reads your source rather than compiling it, so it emits a complete IDL for a program that does not compile. Run `cargo check` first and treat the IDL as confirmation of the surface, not of the integration.

Expected output includes:

```
"admin_initialize"
"admin_transfer"
"admin_renounce"
"admin_nominate"
"admin_accept"
```

Plus your own instructions. On a framework build that carries the extension scanner, a marker that matches no discoverable extension is a hard compile error naming the marker, so a broken setup refuses loudly rather than building without the admin instructions. That safety net is a property of the framework version: on a framework without the scanner, any upstream release before `v0.7.0`, the marker is ignored and the program builds cleanly without them. When you hit the hard error, the most common causes are:

- `admin-authority` not declared as a direct path or git dependency in your `Cargo.toml`. Transitive dependencies are never discovered.
- Cached macro expansion, run `cargo clean -p <your-crate>` and rebuild.

Misplacing the marker is a different failure and never reaches that error, because a marker above `#[lez_program]` is consumed before the framework sees it. Since nothing on this page imports `admin_authority`, writing it above `#[lez_program]` stops at name resolution instead, with ``cannot find attribute `admin_authority` in this scope`` and a note that the name is a crate rather than an attribute. Import the name and `admin-authority` v0.2.0 rejects the placement itself: `#[admin_authority] must come after #[lez_program]`.

## Security notes

- **Initialisation window**, front-running is possible until the first `admin_initialize` lands. Build with a genesis key, or send it immediately after deployment. Deploy-time bundling is not possible on LEZ today, a deployment transaction carries no instructions.
- **Admin keys need an owner**, run `wallet auth-transfer init` on a key before it becomes admin. A key no program owns is refused with program error 6112.
- **Declared config accounts need their `pda`**, an instruction that declares `admin_config` itself must give it `pda = literal("admin_config")`. The gate trusts the account it is given.
- **Renounce is terminal**, there is no recovery. Treat it as a one-way switch.
- **PDA admins via CPI**, the delegating program must declare its admin PDA in `caller-pda-seeds` for the gated call. LEZ verifies the seed; the admin check then trusts the propagated `is_authorized`.
- **Transfer history**, not recorded on chain in this release. The current admin is always readable from the Config PDA; historical transfers require an off-chain indexer.

## Reference

Source: [github.com/mmlado/spel-admin-authority](https://github.com/mmlado/spel-admin-authority). The companion repository contains the authority lifecycle state diagram, ADRs for design decisions, and a reference sample program demonstrating end-to-end integration.
