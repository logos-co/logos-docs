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
This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. We are actively working to complete and verify this content.

This page tracks unreleased code. The dependency snippets pin a personal fork of the framework and pre-release library tags. The pins move to logos-co sources once the extension mechanism lands upstream ([logos-co/spel#257](https://github.com/logos-co/spel/pull/257)).
:::

`admin-authority` is a SPEL extension that adds a single transferable admin role to your LEZ program. The admin is the only account allowed to call admin-gated instructions. The role can be transferred to another signer or PDA, or renounced permanently. This page walks through using `admin-authority` from an app developer's perspective. If you are building a different extension, see [Build a SPEL extension library](build-a-spel-extension-library.md) instead.

## When to use it

Pick `admin-authority` when your program has:

- A configuration or policy account that only one party should mutate (`set_fee_bps`, `update_oracle_address`, `pause`).
- An emergency action that needs guarded access (`recover_funds`, `migrate_state`).
- A handoff scenario where ownership might rotate between parties over time.

If your program needs multi-party approval rather than single-admin gating, `admin-authority` is the wrong primitive, wait for `multisig-authority` (RFP-TBD) or compose admin-authority with a multisig PDA as the admin.

## Prerequisites

You need a stable Rust toolchain, git, and the native build tools the dependency tree leans on. The `spel` CLI additionally needs `unzip` (a build script unpacks a prebuilt rapidsnark archive) and the Python development library (the CLI links against libpython). The verification step at the end uses `jq`. On a fresh Ubuntu 24.04 this covers everything:

```bash
sudo apt-get update && sudo apt-get install -y curl git build-essential pkg-config libssl-dev ca-certificates unzip python3 python3-dev cmake jq
```

The build and IDL verification steps on this page need a toolchain new enough for edition 2024, `admin-authority` declares `rust-version = "1.88"`. They were verified on a clean Ubuntu 24.04 with rustc 1.94.1 and 1.98. The lifecycle commands were verified against a live LEZ stack during the library's milestone reviews, on the same framework revision this page pins. The co-signing exchange is the one exception, see the transfer section.

## Add the dependency

In your program's `Cargo.toml`:

```toml
[dependencies]
admin-authority = { git = "https://github.com/mmlado/spel-admin-authority", tag = "v0.1.0" }
spel-framework  = { git = "https://github.com/mmlado/spel", rev = "f7aa464b2c6c72ef513a25ede16584bca85b722f" }
nssa_core = { git = "https://github.com/logos-blockchain/logos-execution-zone.git", tag = "v0.2.0", package = "lee_core" }
borsh = { version = "1", features = ["derive"] }
serde = { version = "1", features = ["derive"] }
```

All five are needed: the reference samples use exactly this set. `nssa_core` carries the on-chain account types, `borsh` encodes your state, and `serde` is required by the instruction plumbing even when your own types never touch it. The `admin-authority-macros` sub-crate is pulled in transitively. You do not need to declare it directly.

The `spel-framework` entry points at a fork on purpose. It must be the exact revision `admin-authority` itself pins, and the library README documents that revision for each release. Pointing at `logos-co/spel` instead puts two copies of the framework into your dependency graph, and the build fails with a `From<AdminError>` trait error plus name resolution errors inside the `require_admin` expansion. The dependency moves to `logos-co/spel` once the extension mechanism lands upstream ([logos-co/spel#257](https://github.com/logos-co/spel/pull/257)).

After adding the dependencies, run `cargo fetch` once. The framework's extension scanner resolves your dependency graph with an offline metadata call, which fails deterministically for a fresh consumer whose git dependencies were never fetched.

## Install the `spel` CLI

The lifecycle commands below and the IDL check at the end use the `spel` CLI. Install it from the same fork revision the framework dependency pins:

```bash
cargo install --git https://github.com/mmlado/spel --rev f7aa464b2c6c72ef513a25ede16584bca85b722f spel
```

The package name is `spel`, not `spel-cli` as the repository directory suggests, asking cargo for `spel-cli` fails with "could not find `spel-cli`."

This build also reaches the network beyond fetching crates: a transitive build script downloads a prebuilt `logos-blockchain-circuits` artifact from GitHub releases. It does not honour the usual CA environment variables, so behind a TLS-inspecting proxy it fails with `invalid peer certificate: UnknownIssuer` partway through the build. Set `LBC_ROOT_DIR` to a local circuits build, or unpack the release tarball into `~/.cache/logos/blockchain/` beforehand, if the download cannot reach GitHub directly.

## Annotate the module

If you started from `cargo new`, delete the default `fn main` first. The `#[lez_program]` macro generates the program's entry point, and the leftover stub collides with it as a duplicate `main`.

Add `#[admin_authority]` inside your `#[lez_program]` module:

```rust
use spel_framework::prelude::*;

#[lez_program]
#[admin_authority]
mod my_program {
    #[instruction]
    pub fn create_pool(
        #[account(init, pda = literal("pool"))] pool: AccountWithMetadata,
    ) -> SpelResult { /* ... */ }
}
```

Nothing is imported from the library at this point. The `#[admin_authority]` marker is consumed by the framework's scanner during expansion, not resolved as an import, so importing the name only earns an unused import warning. The gate attribute gets imported when the first instruction uses it, next section. The module body does not need `use super::*;` either, the macro resolves paths to items declared outside the module on its own.

That single annotation exposes three new instructions in your program's IDL:

| Instruction | Purpose |
|---|---|
| `admin_initialize` | Creates the admin Config PDA and installs the caller as the first admin. Must be called once after deployment. |
| `admin_transfer` | Replaces the current admin with a new signer or PDA. |
| `admin_renounce` | Zeros the admin permanently. Terminal, no recovery path. |

:::warning
**Initialisation window.** Until `admin_initialize` is called, the admin Config PDA does not exist. Anyone who submits the first `admin_initialize` becomes the admin. Send it as the very next transaction after deployment to prevent a third party from claiming the role. Bundling with the deployment itself is not possible today because a LEZ deployment transaction carries no instructions.
:::

## Gate an instruction

Add `#[require_admin]` to any instruction that should only succeed when the caller is the current admin:

```rust
#[account_type]
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct PoolConfig {
    pub fee_bps: u16,
}

// ... inside the #[lez_program] module:
use admin_authority::require_admin;

#[instruction]
#[require_admin]
pub fn set_fee_bps(
    #[account(mut, pda = literal("pool_config"))] mut config: AccountWithMetadata,
    new_fee_bps: u16,
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

The `#[account_type]` struct sits outside the `#[lez_program]` module, the instruction inside it. The handler returns `Ok(SpelOutput::execute(post_states, messages))`, where `post_states` lists your declared accounts in declaration order. The injected `admin_config` and `caller` are appended to the post-states automatically, you only handle the parameters you wrote.

The gate needs two accounts, the `admin_config` PDA holding the current admin state and a signing `caller`. You do not have to write them: the framework injects both from metadata the library declares, and they appear in the IDL like declared parameters. Declaring them explicitly produces the same program, and then they are your parameters, appearing in your post-states list like any other account.

If your instruction already has parameters by different names, point the gate at them with the inject-account names as keys: `#[require_admin(admin_config = my_cfg, caller = owner)]`. The framework also recognises declared parameters by role, a `#[account(signer)]` parameter or a PDA parameter with the matching seed is reused under its declared name instead of being injected twice.

## Become the first admin

`admin_initialize` takes no arguments. The signing caller becomes the admin (self-election). There is no candidate argument at initialise because the LEZ duplicate-account rule rejects a transaction listing the same account twice, so a caller could never also pass itself as candidate evidence.

```bash
spel --idl program-idl.json --program <program-id> -- \
    admin-initialize --caller <your-account-id>
```

To hand the role to a different keyholder or a PDA, initialise first and then call `admin_transfer`.

## Transfer admin to another party

`admin_transfer` requires the current admin to sign. It takes an `AdminCandidate` describing the new admin, paired with a matching `AccountWithMetadata` that proves the candidate on chain.

Two candidate shapes:

```rust
pub enum AdminCandidate {
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

A `Signer` transfer needs the new admin's signature on the same transaction, which proves the keyholder consents. That means two parties sign one message. The `spel` CLI at the pinned revision has no co-signing exchange: the command above builds and submits with the caller's signature only, and the sequencer drops the transaction unless the candidate's signature is attached. Collecting that second signature is not yet possible from `spel` itself, the exchange flow is in review ([logos-co/spel#246](https://github.com/logos-co/spel/pull/246)).

After the transaction lands, the previous admin can no longer call gated instructions.

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
    pub admin: AdminConfig,   // bytes 32..64, the embedded slot
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
- **Everything retargets.** Gates read the slot at the declared offset from your account, `admin_transfer` and `admin_renounce` splice only the 32 byte window and leave your neighbouring fields untouched, and the IDL shows your account wherever the dedicated PDA used to appear.
- **The offset is never in a transaction.** It compiles into the program as a literal. The IDL carries no offset argument, and writing `admin_config = ...` or `offset = ...` on a gate by hand is a compile error in embedded mode.
- **One account fewer** on every gated transaction, the slot travels with state you were already passing.

The embedded `AdminConfig` field must sit at the declared offset with only fixed-size fields before it. The library repository ships a reference sample (`admin-authority-sample-embedded`) with the layout, tests, and a committed dry-run walkthrough.

## Renounce admin permanently

```bash
spel --idl program-idl.json --program <program-id> -- \
    admin-renounce --caller <current-admin-account-id>
```

This writes `AccountId::default()` to the Config PDA. All future admin-gated instructions reject with an authorisation error. There is no recovery path, design your program so renounce is only callable when permanent loss of mutability is the intended outcome (handoff to "immutable" governance, end of life, etc.).

## Verify your integration

After building your program, check that the admin instructions appear in the IDL:

```bash
spel generate-idl path/to/your/program/src/main.rs | jq '.instructions[].name'
```

The `spel` binary must be built from the same framework revision your `Cargo.toml` pins. A CLI built without the extension scanner omits the admin instructions from this output without reporting an error, so the check appears to pass while the surface is missing. The install command in [Install the `spel` CLI](#install-the-spel-cli) pins the right revision.

Expected output includes:

```
"admin_initialize"
"admin_transfer"
"admin_renounce"
```

Plus your own instructions. On a framework build that carries the extension scanner, a marker that matches no discoverable extension is a hard compile error naming the marker, so a broken setup refuses loudly rather than building without the trio. That safety net is a property of the pinned framework revision: on a framework without the scanner, upstream `logos-co/spel` main today, the marker is ignored and the program builds cleanly without the trio. When you hit the hard error, the most common causes are:

- `admin-authority` not declared as a direct path or git dependency in your `Cargo.toml`. Transitive dependencies are never discovered.
- `#[admin_authority]` placed outside `#[lez_program]` rather than inside.
- Cached macro expansion, run `cargo clean -p <your-crate>` and rebuild.

## Security notes

- **Initialisation window**, front-running is possible until the first `admin_initialize` lands. Send it immediately after deployment. Deploy-time bundling is not possible on LEZ today, a deployment transaction carries no instructions.
- **Renounce is terminal**, there is no recovery. Treat it as a one-way switch.
- **PDA admins via CPI**, the delegating program must declare its admin PDA in `caller-pda-seeds` for the gated call. LEZ verifies the seed; the admin check then trusts the propagated `is_authorized`.
- **Transfer history**, not recorded on chain in this release. The current admin is always readable from the Config PDA; historical transfers require an off-chain indexer.

## Reference

Source: [github.com/mmlado/spel-admin-authority](https://github.com/mmlado/spel-admin-authority). The companion repository contains the authority lifecycle state diagram, ADRs for design decisions, and a reference sample program demonstrating end-to-end integration.
