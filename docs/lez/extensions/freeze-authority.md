---
title: Freeze program execution with freeze-authority
doc_type: procedure
product: lez
topics: lez
steps_layout: sectioned
authors: mmlado
owner: logos
doc_version: 1
slug: freeze-authority
sidebar_position: 2
---

# Freeze program execution with freeze-authority

:::warning
This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. This content is still being completed and verified.

The dependency snippets pin `admin-authority` and `freeze-authority` v0.2.0 and the framework at the upstream `v0.7.0` tag, the first release that carries the extension mechanism ([logos-co/spel#257](https://github.com/logos-co/spel/pull/257)).
:::

`freeze-authority` is a SPEL extension that adds an emergency-stop primitive to your [LEZ](../../get-started/glossary.md#lez) program. A designated freeze authority can pause all [program](../../get-started/glossary.md#program) execution (program-wide freeze) and block specific [accounts](../../get-started/glossary.md#account) from interacting (per-account freeze). The role can be transferred by the admin, handed over in two steps, or renounced. While the program is frozen, only the freeze management carve-outs (unfreeze, authority transfer, nomination and renounce, per-account freeze edits), admin operations, and instructions you marked `#[freeze_exempt]` remain callable. This page walks through using `freeze-authority` from an app developer's perspective. If you are building a different extension, see [Build a SPEL extension library](build-a-spel-extension-library.md) instead.

`freeze-authority` depends on `admin-authority`. The admin governs the freeze authority slot; the freeze authority governs the frozen flags. See [Gate program instructions with admin-authority](admin-authority.md) for the admin layer.

## When to use it

Pick `freeze-authority` when your program needs:

- An emergency circuit breaker for incident response (`freeze` everything until the team can investigate).
- A blocklist for sanctioned or compromised accounts (`block` specific `AccountId`s while the rest of the program keeps running).
- Both layered, global pause plus per-account blocks for graduated response.

If your program needs a permanent pause with no recovery, use `admin_renounce` after deployment instead, freeze-authority is the wrong primitive for one-way upgrades.

## Prerequisites

Same toolchain as the admin-authority page: a stable Rust toolchain, git, the native build packages, and the `spel` CLI. See [Prerequisites](admin-authority.md#prerequisites) and [Install the `spel` CLI](admin-authority.md#install-the-spel-cli) there, plus the `spel init` command in [Annotate the module](admin-authority.md#annotate-the-module) if you do not have a program crate yet, and [Build and deploy the program](admin-authority.md#build-and-deploy-the-program) to get it on chain. Those are all you need from that page. You do not have to work through the admin integration first: the dependency block below already carries `admin-authority`, and its five instructions arrive with your build. Everything below assumes the toolchain and the CLI are in place.

Verified in a clean Ubuntu 24.04 container on rustc 1.99.0: the auto mode example builds and deploys, the manual and embedded examples compile with the IDL shown below, and every command on this page ran against a local LEZ v0.2.4 sequencer, both handovers included. On the public legacy testnet, the deploy, initialisation, program and account freezes, the two-step handover and renounce also ran as documented. The toolchain floors from the admin-authority page apply here unchanged.

## Add the dependency

In your program's `Cargo.toml`. If you do not have a program crate yet, run the `spel init` command in [Annotate the module](admin-authority.md#annotate-the-module) on the admin page first, then come back here. For a `spel init` scaffold the manifest to edit is `methods/guest/Cargo.toml`, not the root manifest, which is a `[workspace]` excluding `methods/guest`. That guest manifest already carries its own `[dependencies]` table, holding `spel-framework`, `nssa_core`, `risc0-zkvm`, your project's `_core` crate, `serde`, `borsh` and the `ruint = "=1.17.0"` pin from the prerequisites, so merge the entries below into that table rather than appending a second one, which cargo rejects with `error: duplicate key`. On that path `admin-authority` and `freeze-authority` are the only two lines you add:

```toml
[dependencies]
admin-authority  = { git = "https://github.com/mmlado/spel-admin-authority", tag = "v0.2.0" }
freeze-authority = { git = "https://github.com/mmlado/spel-freeze-authority", tag = "v0.2.0" }
spel-framework   = { git = "https://github.com/logos-co/spel", tag = "v0.7.0" }
nssa_core = { git = "https://github.com/logos-blockchain/logos-execution-zone.git", tag = "v0.2.4", package = "lee_core" }
borsh = { version = "1", features = ["derive"] }
serde = { version = "1", features = ["derive"] }
```

The `admin-authority` dependency is required because freeze-authority composes with it, and both must be direct dependencies, the framework never discovers extensions transitively. Use the tags above together, `freeze-authority` v0.2.0 pins `admin-authority` v0.2.0, so a consumer on both resolves one copy of each. The framework must be the tag those releases pin, `tag = "v0.7.0"`, spelt the same way. Cargo identifies a git dependency by its reference, so a branch, or a `rev` pointing at the same commit, gives you two copies of the framework and a `From<AdminError>` trait error. `nssa_core` carries the on-chain account types, `borsh` encodes your state, and `serde` is required by the instruction plumbing. The `freeze-authority-macros` sub-crate is pulled in transitively.

After adding the dependencies, run `cargo fetch` once from `methods/guest`, not from the project root. The scaffold's root `Cargo.toml` excludes `methods/guest`, so a root `cargo fetch` resolves a graph that contains neither `admin-authority` nor `freeze-authority`: it still updates the workspace's own registry and git sources and exits 0, so nothing in its output tells you the extensions were skipped. The framework's extension scanner resolves your dependency graph with an offline metadata call, which fails deterministically for a fresh consumer whose git dependencies were never fetched. And if you started from `cargo new`, delete the default `fn main`, the `#[lez_program]` macro generates the program's entry point.

## Annotate the module

`freeze-authority` ships two modes: **auto** (default, F3-strict) and **manual** (explicit opt-in per instruction). Both require the admin marker so the freeze authority slot has an owner.

### Auto mode (recommended default)

Every dispatched instruction except the F3 carve-outs and admin operations is automatically gated by the freeze check. Consumers opt OUT per instruction with `#[freeze_exempt]`.

```rust
use freeze_authority::{freeze_exempt, FreezeCandidate};
use spel_framework::prelude::*;

#[lez_program]
#[admin_authority]
#[freeze_authority]
mod my_program {
    #[instruction]
    #[freeze_exempt]
    pub fn initialize(/* ... */) -> SpelResult { /* ... */ } // creates your account, see below

    #[instruction]
    pub fn transfer(/* ... */) -> SpelResult { /* ... */ }   // auto-gated

    #[instruction]
    #[freeze_exempt]
    pub fn balance_of(/* ... */) -> SpelResult { /* ... */ } // exempt, callable while frozen
}
```

Your own account-creating instruction needs `#[freeze_exempt]` in dedicated mode, because `freeze_config` does not exist yet when it runs and the auto-wrap prologue would reject it as not initialised. In embedded mode the framework works this out for itself, the instruction that creates the embedding account is skipped by that gate automatically.

The `#[admin_authority]` and `#[freeze_authority]` markers are not imported, the framework's scanner consumes them during expansion, importing those names only earns unused import warnings. `freeze_exempt` and `FreezeCandidate` are real imports, and `FreezeCandidate` is the one that must sit outside the module, where the example puts them. It is required even though your own code never names it, the generated `freeze_authority_transfer` instruction references it at the file's outer scope, so an import inside the module fails with `cannot find type FreezeCandidate in this scope` pointed at `#[lez_program]` rather than at the import. `freeze_exempt` resolves from either position, but dropping it altogether fails with `cannot find attribute freeze_exempt in this scope` on every exempt instruction. The module body does not need `use super::*;`.

### Manual mode

Auto-wrap is disabled; the consumer applies `#[require_not_frozen]` only to instructions they want gated. F3 conformance becomes the consumer's responsibility.

```rust
use freeze_authority::{require_not_frozen, FreezeCandidate};
use spel_framework::prelude::*;

#[lez_program]
#[admin_authority]
#[freeze_authority(manual)]
mod my_program {
    #[instruction]
    #[require_not_frozen]
    pub fn transfer(/* ... */) -> SpelResult { /* ... */ }   // explicitly gated

    #[instruction]
    pub fn balance_of(/* ... */) -> SpelResult { /* ... */ } // NOT gated
}
```

That single annotation pair (plus `#[admin_authority]`) exposes nine new instructions in your program's IDL:

| Instruction | Purpose |
|---|---|
| `freeze_initialize` | Creates the freeze Config [PDA](../../get-started/glossary.md#pda) and sets the first freeze authority. Requires admin signature. Must be called once after deployment. |
| `freeze_program` | Sets the program-wide frozen flag to true. Freeze authority only. |
| `freeze_program_release` | Sets the program-wide frozen flag to false. Freeze authority only. Callable while frozen. |
| `freeze_authority_transfer` | Replaces the current freeze authority with a new signer or PDA in one transaction. Admin only. Callable while frozen. |
| `freeze_authority_nominate` | Names the next freeze authority. The holder or the admin signs. Callable while frozen. |
| `freeze_authority_accept` | The nominee signs alone and becomes freeze authority. Callable while frozen. |
| `freeze_authority_renounce` | Vacates the freeze authority slot. Admin OR freeze authority self. Callable while frozen. Recoverable by admin via transfer. |
| `freeze_account(target)` | Sets per-account frozen flag to true for `target`. Freeze authority only. Callable while frozen. |
| `freeze_account_release(target)` | Sets per-account frozen flag to false for `target`. Freeze authority only. Callable while frozen. |

:::warning
**Initialisation window.** Until `freeze_initialize` is called, the freeze Config PDA does not exist, and in auto mode that blocks the program rather than leaving it open: the injected prologue strict-decodes `freeze_config`, so every non-exempt instruction rejects with program error 6201, `freeze authority not initialized`. Unlike `admin_initialize`, freeze initialisation is NOT front-runnable, `freeze_initialize` requires the admin's signature. But it does require `admin_initialize` to have run first. Recommended pattern: submit `admin_initialize` and then `freeze_initialize` as the first two transactions after deployment, back to back and before any of your own instructions. A LEZ transaction carries a single instruction, so they cannot share one.
:::

## Gate an instruction

In auto mode, all instructions are gated by default, you don't add any annotation. In manual mode, add `#[require_not_frozen]` to instructions you want gated:

```rust
#[instruction]
#[require_not_frozen]
pub fn transfer(
    #[account(mut, pda = literal("balance"))] mut balance: AccountWithMetadata,
    #[account(signer)] caller: AccountWithMetadata,
    amount: u64,
) -> SpelResult {
    /* your logic */
}
```

The injected gate performs two checks before the handler body runs:

1. **Program-wide check**, reads `freeze_config.is_frozen`. Rejects if true.
1. **Per-account check**, derives the PDA at `(program_id, "frozen", caller.account_id)` and reads `is_frozen`. Rejects if true. Missing PDA = not frozen.

Both checks pass for the call to proceed.

### Exempt an instruction from auto mode

Use `#[freeze_exempt]` to opt out per instruction:

```rust
#[instruction]
#[freeze_exempt]
pub fn balance_of(/* ... */) -> SpelResult { /* read-only, safe while frozen */ }
```

The framework reads `self_exempt_marker = "freeze_exempt"` from freeze-authority's Cargo metadata and skips the wrap for any function carrying the attribute.

## Initialise the freeze authority

`freeze_initialize` takes no candidate argument. The admin signs, and the admin becomes the initial freeze authority, the same self-election pattern as `admin_initialize`. Hand the role to a dedicated operations key or a PDA afterwards with `freeze_authority_transfer`.

Every command below reads `program-idl.json`, generated once from your built program, and takes `--dry-run=text` before the `--` separator to validate an invocation without submitting it. See [Become the first admin](admin-authority.md#become-the-first-admin) for both.

```bash
spel --idl program-idl.json --program <program-id> -- \
    freeze-initialize --caller <admin-account-id>
```

## Freeze and unfreeze the program

```bash
# Freeze: rejects every interaction except the F3 carve-outs and admin operations.
spel --idl program-idl.json --program <program-id> -- \
    freeze-program --caller <freeze-authority-account-id>

# Unfreeze: restores normal operation.
spel --idl program-idl.json --program <program-id> -- \
    freeze-program-release --caller <freeze-authority-account-id>
```

Both require the current freeze authority to sign. While the program is frozen, gated instructions reject with program error 6217, `program is frozen`.

## Freeze and unfreeze a specific account

```bash
# Block account X from interacting with this program.
spel --idl program-idl.json --program <program-id> -- \
    freeze-account --caller <freeze-authority-account-id> --target <account-id-X-hex>

# Restore X's access.
spel --idl program-idl.json --program <program-id> -- \
    freeze-account-release --caller <freeze-authority-account-id> --target <account-id-X-hex>
```

`target` is a raw 32 byte argument, pass the account id as 64 hex characters, not base58.

When account X is frozen, any instruction in your program that's auto-gated or carries `#[require_not_frozen]` rejects when X is the signer, with program error 6218, `account is frozen`. Other accounts are unaffected. Per-account state survives the program-wide frozen flag toggling, the two layers are independent. Releasing a target that is not currently frozen rejects with program error 6214, `account is not frozen`, so a release cannot silently create marker state for untouched accounts.

## Transfer freeze authority to another party

`freeze_authority_transfer` requires the admin to sign. It takes a `FreezeCandidate` describing the new holder, the same type as `AdminCandidate` (each is an alias for the shared `AuthorityCandidate`, and both libraries pin one copy of that crate), paired with a `new_account` that carries the chain-state evidence.

The two candidate shapes, `Signer` and `Pda`, are documented in [Transfer admin to another party](admin-authority.md#transfer-admin-to-another-party), and the commands below show both in use.

The slot can also be transferred from a Renounced (vacant) state, so admins can rotate the role with or without an interim vacancy:

```bash
spel --idl program-idl.json --program <program-id> -- \
    freeze-authority-transfer \
    --caller <admin-account-id> \
    --new-account <new-freeze-authority-account-id> \
    --candidate Signer
```

A `Signer` candidate is validated on chain by checking that the new holder co-signed the transaction, and the wallet only collects signatures for declared signer accounts. Run as written, the command above builds and submits with the caller's signature only, and the sequencer drops it unless the new holder's signature is attached. The `spel` CLI collects that second signature through a partial-transaction file ([logos-co/spel#246](https://github.com/logos-co/spel/pull/246)): the admin adds the global flags `--co-signer <new-freeze-authority-account-id> --export handover.json` before the `--` separator, the new holder runs `spel sign handover.json` in their own wallet, and anyone with a node connection runs `spel submit handover.json`. Neither key may send another transaction between the export and the submit. See the transfer section of the [admin-authority page](admin-authority.md#transfer-admin-to-another-party) for the full commands. The new holder's key needs a program owner, run `wallet auth-transfer init` on it first, otherwise the transfer is refused with program error 6221.

## Hand over the freeze authority in two steps

The current freeze authority or the admin names the next holder, and the nominee accepts on their own signature:

```bash
spel --idl program-idl.json --program <program-id> -- \
    freeze-authority-nominate \
    --caller <holder-or-admin-account-id> \
    --new-freeze-authority <nominee-account-id-hex>

spel --idl program-idl.json --program <program-id> -- \
    freeze-authority-accept --caller <nominee-account-id>
```

`--new-freeze-authority` takes the account id as 64 hex characters, not the base58 form the wallet prints. The same goes for `--target` above. [Hand over in two steps](admin-authority.md#hand-over-in-two-steps) on the admin page shows how to convert one. Routine rotation needs only the holder, and the admin can nominate over the holder's choice. With the slot vacant only the admin can nominate, so this is also how the admin refills a renounced slot. A later nomination replaces an earlier one, nominating the all-zero id cancels, and transfer and renounce clear a pending nominee. Both instructions stay callable while the program is frozen.

## Use a program (PDA) as freeze authority

To delegate freeze authority to another program (for example, a multisig or a circuit-breaker DAO), pass `FreezeCandidate::Pda`:

```bash
spel --idl program-idl.json --program <program-id> -- \
    freeze-authority-transfer \
    --caller <admin-account-id> \
    --new-account <pda-account-id> \
    --candidate '{"Pda": {"program_id": "<multisig-program-id>", "seed": "<32-byte-hex-seed>"}}'
```

When the multisig invokes `freeze_program` (or any freeze-authority-signed instruction), it does so through a chained call and declares its PDA in `caller-pda-seeds`. LEZ verifies the seed and propagates `is_authorized = true`; the gate accepts the PDA as the legitimate freeze authority.

## Renounce freeze authority

```bash
# Either the current admin OR the current freeze authority can sign.
spel --idl program-idl.json --program <program-id> -- \
    freeze-authority-renounce --caller <admin-or-freeze-authority-account-id>
```

Unlike admin renounce, this is NOT terminal. The freeze authority slot becomes vacant and any pending nominee is cleared. The admin can repopulate it later with `freeze_authority_transfer`, or by nominating a holder who then accepts. While the slot is vacant, `freeze_program`, `freeze_program_release`, `freeze_account`, and `freeze_account_release` all fail with program error 6210, `freeze authority renounced`. The program-wide `is_frozen` flag and per-account states are preserved at the moment of renounce, they don't reset.

If the admin has already been renounced first (terminal), the freeze slot becomes effectively permanent: there is no one left to repopulate it, unless the admin nominated a holder on the vacant slot before renouncing, who can still accept. Plan the order of renounces carefully if you intend to commit to no-future-freeze.

## Embedded mode, the freeze slot inside your own account

Like admin-authority, the freeze state can live inside one of your program's own accounts instead of a dedicated Config PDA, and both extensions can share the same account at distinct offsets:

```rust
use admin_authority::AdminConfig;
use freeze_authority::{FreezeCandidate, FreezeConfig};

#[account_type]
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct ProgramConfig {
    pub value: u64,            // bytes 0..8
    pub padding: [u8; 24],     // bytes 8..32
    #[admin_slot]
    pub admin: AdminConfig,    // bytes 32..96, the admin slot
    #[freeze_slot]
    pub freeze: FreezeConfig,  // bytes 96..161, the freeze slot
}

#[lez_program]
#[admin_authority(admin_config = config, offset = 32)]
#[freeze_authority(freeze_config = config, offset = 96)]
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
            freeze: FreezeConfig::default(),
        }
        .write_to(&mut config)?;
        // the signing caller is injected, the injected bootstrap
        // installs it as admin, and the freeze slot stays vacant
        Ok(SpelOutput::execute(vec![config], vec![]))
    }
}
```

The `write_to` helper is yours to write, the library does not provide it. The reference sample uses this one:

```rust
impl ProgramConfig {
    fn write_to(&self, account: &mut AccountWithMetadata) -> Result<(), SpelError> {
        account.account.data = borsh::to_vec(self)
            .map_err(|_| SpelError::SerializationError { message: "encoding failed".into() })?
            .try_into()
            .map_err(|_| SpelError::SerializationError { message: "data too large".into() })?;
        Ok(())
    }
}
```

What changes:

- **No `freeze_initialize`.** Your account-creating instruction writes the struct, and the freeze slot is born vacant: it rejects every holder-path caller until the admin appoints the first holder via `freeze_authority_transfer` or a nomination, the same paths that repopulate a renounced slot. There is no initialisation ordering to get right because there is no initializer. The admin slot next door is bootstrapped by marking that same instruction with `#[admin_initialize]`, the caller becomes admin in the transaction that creates the account.
- **Slot markers keep the layout honest.** `#[admin_slot]` and `#[freeze_slot]` each derive an offset const and a layout test, and the build fails if a marker position and its `offset = ...` declaration ever disagree, for example after a field is added above a slot.
- **One account per transaction.** When admin and freeze share the embedding account, management instructions that read both carry the shared account once. `freeze_authority_renounce` drops from 3 accounts to 2.
- **Splice-only writes.** Freeze operations write only the 65 byte window (the 64 byte slot plus the frozen flag), your neighbouring fields survive every toggle and transfer.
- **Offsets never appear in a transaction.** They compile into the program as literals, and the IDL carries no offset arguments.

The library repository ships `freeze-authority-sample-embedded` with the full layout, adjacent-window tests, and a committed dry-run walkthrough.

## Verify your integration

After building your program, check that the freeze instructions appear in the IDL:

```bash
# From a `spel init` project root, drop the path entirely and the guest is auto-detected.
spel generate-idl path/to/your/program/src/main.rs | jq '.instructions[].name'
```

The `spel` binary must be built from the same framework revision your `Cargo.toml` pins. A CLI built without the extension scanner omits every extension instruction from this output without reporting an error. The check is also not a substitute for a build, `generate-idl` reads your source rather than compiling it, so run `cargo check` first.

Expected output includes:

```
"admin_initialize"
"admin_transfer"
"admin_renounce"
"admin_nominate"
"admin_accept"
"freeze_initialize"
"freeze_authority_transfer"
"freeze_authority_renounce"
"freeze_program"
"freeze_program_release"
"freeze_account"
"freeze_account_release"
"freeze_authority_nominate"
"freeze_authority_accept"
```

Plus your own instructions. In embedded mode neither `admin_initialize` nor `freeze_initialize` appears, and the config accounts in every instruction are your own embedding account instead of the dedicated PDAs. On the pins above the surface cannot go missing quietly: a marker that matches no discoverable extension is a hard compile error naming the marker, and from `freeze-authority` v0.1.3 a marker written above `#[lez_program]` is rejected on sight rather than skipped. When you hit one of those errors, the most common causes are:

- `freeze-authority` not declared as a path or git dependency in your `Cargo.toml`.
- `admin-authority` missing (freeze-authority hard-depends on it).
- `#[freeze_authority]` placed above `#[lez_program]` rather than below it. An imported marker names the misplacement, an unimported one fails with `cannot find attribute freeze_authority in this scope`.
- Cached macro expansion, run `cargo clean -p <your-crate>` and rebuild.

## Security notes

- **Initialisation order matters.** `freeze_initialize` requires admin signature and an initialised `admin_config`. Send `admin_initialize` right after deployment and `freeze_initialize` as soon as it lands. Both come from the admin key, so the second waits until the first has landed, see [Build and deploy the program](admin-authority.md#build-and-deploy-the-program).
- **Renounce is recoverable (unlike admin).** Vacating the freeze authority slot is reversible by the admin via `freeze_authority_transfer` or a nomination. Plan accordingly if your operational model assumes the role is permanent, only renouncing admin first locks it down.
- **Exempt is shallow.** A `#[freeze_exempt]` consumer function that uses `chained_call` to invoke a gated function still hits the gated function's check. Frozen-state behaviour of chained calls is determined by the called function's exemption status, not the caller's.
- **Auto mode covers all dispatched instructions.** Including admin operations? No, admin-authority's five management instructions are exempt by an explicit entry in freeze-authority's metadata. Admin can still transfer or renounce while the program is frozen. This is by design to avoid deadlock from a lost admin key during freeze.
- **Per-account PDAs persist.** Per-account freeze state writes a PDA per target. Once initialised, the PDA exists for the program's lifetime (LEZ has no close primitive). Toggling release writes `is_frozen = false`; the PDA itself stays. No rent applies in LEZ.

## Reference

Source: [github.com/mmlado/spel-freeze-authority](https://github.com/mmlado/spel-freeze-authority). The companion repository contains the authority lifecycle state diagram, ADRs for design decisions (including ADR-0007 on renounce semantics and ADR-0008 on per-account encoding), the LEZ rent investigation, and reference sample programs demonstrating both auto and manual modes end-to-end.
