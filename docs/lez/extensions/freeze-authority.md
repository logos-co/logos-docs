# Freeze program execution with freeze-authority

{% hint style="warning" %}
## Important

This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. We are actively working to complete and verify this content.
{% endhint %}

`freeze-authority` is a SPEL extension that adds an emergency-stop primitive to your LEZ program. A designated freeze authority can pause all program execution (program-wide freeze) and block specific accounts from interacting (per-account freeze). The role can be transferred by the admin or renounced; while the program is frozen, only unfreeze, authority management, and admin operations remain callable. This page walks through using `freeze-authority` from an app developer's perspective. If you are building a different extension, see [Build a SPEL extension library](build-a-spel-extension-library.md) instead.

`freeze-authority` depends on `admin-authority`. The admin governs the freeze authority slot; the freeze authority governs the frozen flags. See [Gate program instructions with admin-authority](admin-authority.md) for the admin layer.

## When to use it

Pick `freeze-authority` when your program needs:

- An emergency circuit breaker for incident response (`freeze` everything until the team can investigate).
- A blocklist for sanctioned or compromised accounts (`block` specific `AccountId`s while the rest of the program keeps running).
- Both layered — global pause plus per-account blocks for graduated response.

If your program needs a permanent pause with no recovery, use `admin_renounce` after deployment instead — freeze-authority is the wrong primitive for one-way upgrades.

## Add the dependency

In your program's `Cargo.toml`:

```toml
[dependencies]
admin-authority  = { git = "https://github.com/mmlado/spel-admin-authority" }
freeze-authority = { git = "https://github.com/mmlado/spel-freeze-authority" }
spel-framework   = { git = "https://github.com/logos-co/spel" }
```

The `admin-authority` dependency is required because freeze-authority composes with it. The `freeze-authority-macros` sub-crate is pulled in transitively.

## Annotate the module

`freeze-authority` ships two modes: **auto** (default, F3-strict) and **manual** (explicit opt-in per instruction). Both require the admin marker so the freeze authority slot has an owner.

### Auto mode (recommended default)

Every dispatched instruction except the F3 carve-outs and admin operations is automatically gated by the freeze check. Consumers opt OUT per instruction with `#[freeze_exempt]`.

```rust
use spel_framework::prelude::*;
use admin_authority::admin_authority;
use freeze_authority::{freeze_authority, freeze_exempt};

#[lez_program]
#[admin_authority]
#[freeze_authority]
mod my_program {
    use super::*;

    #[instruction]
    pub fn transfer(/* ... */) -> SpelResult { /* ... */ }   // auto-gated

    #[instruction]
    #[freeze_exempt]
    pub fn balance_of(/* ... */) -> SpelResult { /* ... */ } // exempt — callable while frozen
}
```

### Manual mode

Auto-wrap is disabled; the consumer applies `#[require_not_frozen]` only to instructions they want gated. F3 conformance becomes the consumer's responsibility.

```rust
use spel_framework::prelude::*;
use admin_authority::admin_authority;
use freeze_authority::{freeze_authority, require_not_frozen};

#[lez_program]
#[admin_authority]
#[freeze_authority(manual)]
mod my_program {
    use super::*;

    #[instruction]
    #[require_not_frozen]
    pub fn transfer(/* ... */) -> SpelResult { /* ... */ }   // explicitly gated

    #[instruction]
    pub fn balance_of(/* ... */) -> SpelResult { /* ... */ } // NOT gated
}
```

That single annotation pair (plus `#[admin_authority]`) exposes seven new instructions in your program's IDL:

| Instruction | Purpose |
|---|---|
| `freeze_initialize` | Creates the freeze Config PDA and sets the first freeze authority. Requires admin signature. Must be called once after deployment. |
| `freeze_program` | Sets the program-wide frozen flag to true. Freeze authority only. |
| `freeze_program_release` | Sets the program-wide frozen flag to false. Freeze authority only. Callable while frozen. |
| `freeze_authority_transfer` | Replaces the current freeze authority with a new signer or PDA. Admin only. Callable while frozen. |
| `freeze_authority_renounce` | Vacates the freeze authority slot. Admin OR freeze authority self. Callable while frozen. Recoverable by admin via transfer. |
| `freeze_account(target)` | Sets per-account frozen flag to true for `target`. Freeze authority only. Callable while frozen. |
| `freeze_account_release(target)` | Sets per-account frozen flag to false for `target`. Freeze authority only. Callable while frozen. |

{% hint style="warning" %}
## Initialization window

Until `freeze_initialize` is called, the freeze Config PDA does not exist and no gates are active. Unlike `admin_initialize`, freeze initialization is NOT front-runnable — `freeze_initialize` requires the admin's signature. But it does require `admin_initialize` to have run first. Recommended pattern: bundle `admin_initialize` and `freeze_initialize` in the same transaction immediately after deployment.
{% endhint %}

## Gate an instruction

In auto mode, all instructions are gated by default — you don't add any annotation. In manual mode, add `#[require_not_frozen]` to instructions you want gated:

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

1. **Program-wide check** — reads `freeze_config.is_frozen`. Rejects if true.
2. **Per-account check** — derives the PDA at `(program_id, "frozen", caller.account_id)` and reads `is_frozen`. Rejects if true. Missing PDA = not frozen.

Both checks pass for the call to proceed.

### Exempt an instruction from auto mode

Use `#[freeze_exempt]` to opt out per instruction:

```rust
#[instruction]
#[freeze_exempt]
pub fn balance_of(/* ... */) -> SpelResult { /* read-only, safe while frozen */ }
```

The framework reads `self_exempt_marker = "freeze_exempt"` from freeze-authority's Cargo metadata and skips the wrap for any fn carrying the attribute.

## Choose an initial freeze authority

`freeze_initialize` takes a `FreezeCandidate` — same shape as `AdminCandidate` from admin-authority:

```rust
pub enum FreezeCandidate {
    /// The new freeze authority is a keyholder. Validated by checking that
    /// `new_freeze_account.is_authorized == true` (co-signed the tx).
    Signer,
    /// The new freeze authority is a program-owned PDA. Validated by deriving
    /// the address from (program_id, seed) and confirming the PDA exists on chain.
    Pda { program_id: AccountId, seed: [u8; 32] },
}
```

From the SPEL CLI (note the required admin signature):

```bash
spel tx send freeze_initialize \
    --admin-signer <admin-account-id> \
    --new-freeze Signer \
    --new-freeze-account <new-freeze-authority-account-id>
```

## Freeze and unfreeze the program

```bash
# Freeze: rejects every interaction except the F3 carve-outs and admin operations.
spel tx send freeze_program

# Unfreeze: restores normal operation.
spel tx send freeze_program_release
```

Both require the current freeze authority to sign.

## Freeze and unfreeze a specific account

```bash
# Block account X from interacting with this program.
spel tx send freeze_account --target <account-id-X>

# Restore X's access.
spel tx send freeze_account_release --target <account-id-X>
```

When account X is frozen, any instruction in your program that's auto-gated or carries `#[require_not_frozen]` rejects when X is the signer. Other accounts are unaffected. Per-account state survives the program-wide frozen flag toggling — the two layers are independent.

## Transfer freeze authority to another party

`freeze_authority_transfer` requires the admin to sign. The freeze authority slot can also be transferred from a Renounced (vacant) state, so admins can rotate the role with or without an interim vacancy:

```bash
spel tx send freeze_authority_transfer \
    --admin-signer <admin-account-id> \
    --new-freeze Signer \
    --new-freeze-account <new-freeze-authority-account-id>
```

## Use a program (PDA) as freeze authority

To delegate freeze authority to another program (e.g. a multisig or a circuit-breaker DAO), pass `FreezeCandidate::Pda`:

```bash
spel tx send freeze_authority_transfer \
    --admin-signer <admin-account-id> \
    --new-freeze 'Pda { program_id: <multisig-program-id>, seed: <32-byte-seed> }' \
    --new-freeze-account <pda-account-id>
```

When the multisig invokes `freeze_program` (or any freeze-authority-signed instruction), it does so through a chained call and declares its PDA in `caller-pda-seeds`. LEZ verifies the seed and propagates `is_authorized = true`; the gate sees the PDA as the legitimate freeze authority.

## Renounce freeze authority

```bash
# Either the current admin OR the current freeze authority can sign.
spel tx send freeze_authority_renounce
```

Unlike admin renounce, this is NOT terminal. The freeze authority slot becomes vacant; the admin can repopulate it later via `freeze_authority_transfer`. While the slot is vacant, `freeze_program`, `freeze_program_release`, `freeze_account`, and `freeze_account_release` all fail. The program-wide `is_frozen` flag and per-account states are preserved at the moment of renounce — they don't reset.

If the admin has already been renounced first (terminal), the freeze slot becomes effectively permanent: there is no one to call `freeze_authority_transfer` to repopulate it. Plan the order of renounces carefully if you intend to commit to no-future-freeze.

## Verify your integration

After building your program, check that the freeze instructions appear in the IDL:

```bash
spel generate-idl path/to/your/program/src/main.rs | jq '.instructions[].name'
```

Expected output includes:

```
"admin_initialize"
"admin_transfer"
"admin_renounce"
"freeze_initialize"
"freeze_program"
"freeze_program_release"
"freeze_authority_transfer"
"freeze_authority_renounce"
"freeze_account"
"freeze_account_release"
```

Plus your own instructions. If the freeze instructions are missing, the most common causes are:

- `freeze-authority` not declared as a path or git dependency in your `Cargo.toml`.
- `admin-authority` missing (freeze-authority hard-depends on it).
- `#[freeze_authority]` placed outside `#[lez_program]` rather than inside.
- Cached macro expansion, run `cargo clean -p <your-crate>` and rebuild.

## Security notes

- **Initialization order matters.** `freeze_initialize` requires admin signature and an initialized `admin_config`. Bundle both inits in the same transaction immediately after deployment.
- **Renounce is recoverable (unlike admin).** Vacating the freeze authority slot is reversible by the admin via `freeze_authority_transfer`. Plan accordingly if your operational model assumes the role is permanent — only renouncing admin first locks it down.
- **Exempt is shallow.** A `#[freeze_exempt]` consumer fn that uses `chained_call` to invoke a gated fn still hits the gated fn's check. Frozen-state behavior of chained calls is determined by the called fn's exemption status, not the caller's.
- **Auto mode covers all dispatched instructions.** Including admin operations? No — admin-authority's three management instructions are exempt by an explicit entry in freeze-authority's metadata. Admin can still transfer or renounce while the program is frozen. This is by design to avoid deadlock from a lost admin key during freeze.
- **Per-account PDAs persist.** Per-account freeze state writes a PDA per target. Once initialized, the PDA exists for the program's lifetime (LEZ has no close primitive). Toggling release writes `is_frozen = false`; the PDA itself stays. No rent applies in LEZ.

## Reference

Source: [github.com/mmlado/spel-freeze-authority](https://github.com/mmlado/spel-freeze-authority). The companion repository contains the authority lifecycle state diagram, ADRs for design decisions (including ADR-0007 on renounce semantics and ADR-0008 on per-account encoding), the LEZ rent investigation, and reference sample programs demonstrating both auto and manual modes end-to-end.
