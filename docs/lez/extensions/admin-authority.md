# Gate program instructions with admin-authority

{% hint style="warning" %}
## Important

This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. We are actively working to complete and verify this content.
{% endhint %}

`admin-authority` is a SPEL extension that adds a single transferable admin role to your LEZ program. The admin is the only account allowed to call admin-gated instructions. The role can be transferred to another signer or PDA, or renounced permanently. This page walks through using `admin-authority` from an app developer's perspective. If you are building a different extension, see [Build a SPEL extension library](build-a-spel-extension-library.md) instead.

## When to use it

Pick `admin-authority` when your program has:

- A configuration or policy account that only one party should mutate (`set_fee_bps`, `update_oracle_address`, `pause`).
- An emergency action that needs guarded access (`recover_funds`, `migrate_state`).
- A handoff scenario where ownership might rotate between parties over time.

If your program needs multi-party approval rather than single-admin gating, `admin-authority` is the wrong primitive, wait for `multisig-authority` (RFP-TBD) or compose admin-authority with a multisig PDA as the admin.

## Add the dependency

In your program's `Cargo.toml`:

```toml
[dependencies]
admin-authority = { git = "https://github.com/mmlado/spel-admin-authority" }
spel-framework  = { git = "https://github.com/logos-co/spel" }
```

The `admin-authority-macros` sub-crate is pulled in transitively. You do not need to declare it directly.

## Annotate the module

Add `#[admin_authority]` inside your `#[lez_program]` module:

```rust
use spel_framework::prelude::*;
use admin_authority::{admin_authority, require_admin};

#[lez_program]
#[admin_authority]
mod my_program {
    use super::*;

    #[instruction]
    pub fn create_pool(
        #[account(init, pda = literal("pool"))] pool: AccountWithMetadata,
        #[account(signer)] caller: AccountWithMetadata,
    ) -> SpelResult { /* ... */ }
}
```

That single annotation exposes three new instructions in your program's IDL:

| Instruction | Purpose |
|---|---|
| `admin_initialize` | Creates the admin Config PDA and installs the caller as the first admin. Must be called once after deployment. |
| `admin_transfer` | Replaces the current admin with a new signer or PDA. |
| `admin_renounce` | Zeros the admin permanently. Terminal, no recovery path. |

{% hint style="warning" %}
## Initialization window

Until `admin_initialize` is called, the admin Config PDA does not exist. Anyone who submits the first `admin_initialize` becomes the admin. Send it as the very next transaction after deployment to prevent a third party from claiming the role. Bundling with the deployment itself is not possible today because a LEZ deployment transaction carries no instructions.
{% endhint %}

## Gate an instruction

Add `#[require_admin]` to any instruction that should only succeed when the caller is the current admin:

```rust
#[instruction]
#[require_admin]
pub fn set_fee_bps(
    #[account(mut, pda = literal("pool_config"))] mut config: AccountWithMetadata,
    new_fee_bps: u16,
) -> SpelResult {
    // Admin check has already run. Just mutate.
    todo!()
}
```

The gate needs two accounts, the `admin_config` PDA holding the current admin state and a signing `caller`. You do not have to write them: the framework injects both from metadata the library declares, and they appear in the IDL like declared params. Declaring them explicitly produces the same program:

```rust
#[instruction]
#[require_admin]
pub fn set_fee_bps(
    #[account(pda = literal("admin_config"))] admin_config: AccountWithMetadata,
    #[account(signer)] caller: AccountWithMetadata,
    #[account(mut, pda = literal("pool_config"))] mut config: AccountWithMetadata,
    new_fee_bps: u16,
) -> SpelResult {
    todo!()
}
```

If your instruction already has params by different names, point the gate at them: `#[require_admin(config = my_cfg, signer = owner)]`.

## Become the first admin

`admin_initialize` takes no arguments. The signing caller becomes the admin (self-election). There is no candidate argument at initialize because the LEZ duplicate-account rule rejects a transaction listing the same account twice, so a caller could never also pass itself as candidate evidence.

```bash
spel --idl program-idl.json --program <program-id> -- \
    admin-initialize --caller <your-account-id>
```

To hand the role to a different keyholder or a PDA, initialize first and then call `admin_transfer`.

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
    --new-admin-account <new-admin-account-id> \
    --new-admin Signer
```

A `Signer` transfer needs the new admin's signature on the same transaction, which proves the keyholder consents. That means two parties sign one message, an off-chain co-signing exchange handled by the CLI's witness exchange flow.

After the transaction lands, the previous admin can no longer call gated instructions.

## Use a program (PDA) as the admin

To delegate admin authority to another program, for example a multisig, use `AdminCandidate::Pda` with the delegating program's ID and PDA seed. Payload variants are passed to the CLI as a one-key JSON object:

```bash
spel --idl program-idl.json --program <program-id> -- \
    admin-transfer \
    --caller <current-admin-account-id> \
    --new-admin-account <pda-account-id> \
    --new-admin '{"Pda": {"program_id": "<multisig-program-id>", "seed": "<32-byte-hex-seed>"}}'
```

The PDA must already be deployed, an undeployed candidate is rejected. When the multisig later wants to invoke a gated instruction on your program, it does so through a chained call and declares its admin PDA in `caller-pda-seeds`. LEZ verifies the seed and propagates `is_authorized = true` to your program; the `#[require_admin]` check then sees the PDA as the legitimate admin. No private key is needed for the PDA, authorization comes from the seed delegation.

## Renounce admin permanently

```bash
spel --idl program-idl.json --program <program-id> -- \
    admin-renounce --caller <current-admin-account-id>
```

This writes `AccountId::default()` to the Config PDA. All future admin-gated instructions reject with an authorization error. There is no recovery path, design your program so renounce is only callable when permanent loss of mutability is the intended outcome (handoff to "immutable" governance, end of life, etc.).

## Verify your integration

After building your program, check that the admin instructions appear in the IDL:

```bash
spel generate-idl path/to/your/program/src/main.rs | jq '.instructions[].name'
```

Expected output includes:

```
"admin_initialize"
"admin_transfer"
"admin_renounce"
```

Plus your own instructions. If the admin trio is missing, the most common causes are:

- `admin-authority` not declared as a path or git dependency in your `Cargo.toml`.
- `#[admin_authority]` placed outside `#[lez_program]` rather than inside.
- Cached macro expansion, run `cargo clean -p <your-crate>` and rebuild.

## Security notes

- **Initialization window**, front-running is possible until the first `admin_initialize` lands. Send it immediately after deployment. Deploy-time bundling is not possible on LEZ today, a deployment transaction carries no instructions.
- **Renounce is terminal**, there is no recovery. Treat it as a one-way switch.
- **PDA admins via CPI**, the delegating program must declare its admin PDA in `caller-pda-seeds` for the gated call. LEZ verifies the seed; the admin check then trusts the propagated `is_authorized`.
- **Transfer history**, not recorded on chain in this release. The current admin is always readable from the Config PDA; historical transfers require an off-chain indexer.

## Reference

Source: [github.com/mmlado/spel-admin-authority](https://github.com/mmlado/spel-admin-authority). The companion repository contains the authority lifecycle state diagram, ADRs for design decisions, and a reference sample program demonstrating end-to-end integration.
