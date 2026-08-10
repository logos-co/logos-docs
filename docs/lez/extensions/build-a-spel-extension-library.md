---
title: Build a SPEL extension library
doc_type: procedure
product: lez
topics: lez
steps_layout: sectioned
authors: mmlado
owner: logos
doc_version: 1
slug: build-a-spel-extension-library
sidebar_position: 2
---

# Build a SPEL extension library

:::warning
This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. We are actively working to complete and verify this content.
:::

SPEL extension libraries ship reusable on-chain primitives, access control, freeze switches, multisig, etc., that consuming programs adopt with a single attribute. This guide is for library authors. App developers consuming an existing extension should follow that extension's own integration guide instead.

## What an extension provides

An extension is a normal Rust crate that:

1. Defines one or more `#[instruction]` functions that consumers can call from the SPEL CLI / wallets.
2. Declares a marker attribute name in its `Cargo.toml` so consumers can opt in.
3. Optionally ships per-instruction gate attributes (like `#[require_admin]`) that consumers apply to their own instructions.

When a consumer puts the marker attribute on a `#[lez_program]` module, the framework discovers the extension via Cargo metadata, scans the library's `src/lib.rs` for `#[instruction]` functions, and merges them into the consumer's dispatcher and IDL automatically. No framework changes are needed per extension.

## Layout

A SPEL extension is typically two crates plus an optional sample:

```
my-extension/
├── my-extension/             # runtime library: types, instruction fns, metadata
│   ├── Cargo.toml
│   └── src/lib.rs
├── my-extension-macros/      # proc-macro sub-crate: marker + gate attributes
│   ├── Cargo.toml
│   └── src/lib.rs
└── my-extension-sample/      # reference SPEL program (optional but recommended)
    └── ...
```

The split exists because Rust requires proc-macro attributes to live in a `proc-macro = true` crate that cannot also export non-macro items. The runtime library re-exports the macros so consumers only declare one dependency.

## The discovery metadata

In `my-extension/Cargo.toml`:

```toml
[package]
name = "my-extension"
version = "0.1.0"
edition = "2021"

[package.metadata.spel]
extension_attr = "my_extension"
```

- `extension_attr` is the attribute name consumers put on their `#[lez_program]` module to opt in. By convention, match it to your crate name (with `_` not `-`).

Per-instruction gate attributes your library defines (e.g. `#[require_admin]` from `admin-authority`) need no metadata for the check itself: they are ordinary proc-macros that re-expand on the emitted handler and consume themselves, so the framework leaves them alone. If your gate needs specific account parameters on every gated instruction, you can declare those in an optional inject block so consumers do not have to write them out (see the gate attribute section below).

## Define the runtime library

`my-extension/src/lib.rs`:

```rust
use borsh::{BorshDeserialize, BorshSerialize};
use spel_framework::prelude::*;

extern crate self as my_extension;

pub use my_extension_macros::{instruction, my_extension};

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct MyState {
    pub value: u64,
}

#[instruction]
pub fn extension_action(
    #[account(mut, pda = literal("my_state"))] mut state: AccountWithMetadata,
    #[account(signer)] caller: AccountWithMetadata,
    new_value: u64,
) -> SpelResult {
    todo!("read state, mutate, write")
}
```

Three things to note:

- `extern crate self as my_extension;`, lets the library reference its own types via the absolute path `::my_extension::MyState`. The framework emits cross-crate calls into the consumer's binary using that path, so the path needs to resolve both in the library's own compile and at the consumer's compile.
- `pub use my_extension_macros::{instruction, my_extension};`, re-exports the marker attribute and the no-op `#[instruction]` shim so consumers (and the library's own `lib.rs`) can use them without importing the macros crate directly.
- `#[account(...)]` attributes on parameters, these are framework helper attributes that describe PDA seeds, signer requirements, etc. The library's own `#[instruction]` shim strips them at the library's compile so rustc accepts the source; the framework reads them during the path-dep scan.

## Define the proc-macro sub-crate

`my-extension-macros/Cargo.toml`:

```toml
[package]
name = "my-extension-macros"
version = "0.1.0"
edition = "2021"

[lib]
proc-macro = true

[dependencies]
proc-macro2 = "1"
quote = "1"
syn = { version = "2", features = ["full"] }
```

`my-extension-macros/src/lib.rs`:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, FnArg, ItemFn};

/// Marker attribute. Pass-through; the framework detects it on a #[lez_program]
/// module by name and triggers the path-dep scan for `my-extension`.
#[proc_macro_attribute]
pub fn my_extension(_attr: TokenStream, item: TokenStream) -> TokenStream {
    item
}

/// No-op `#[instruction]` for the library's own source. Strips `#[account(...)]`
/// helper attrs from params so rustc accepts the library's compile.
#[proc_macro_attribute]
pub fn instruction(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut func = parse_macro_input!(item as ItemFn);
    for arg in &mut func.sig.inputs {
        if let FnArg::Typed(pt) = arg {
            pt.attrs.retain(|a| !a.path().is_ident("account"));
        }
    }
    quote!(#func).into()
}
```

The framework treats `#[my_extension]` as a marker by attribute name only, it does not invoke the library's macro to discover anything. The macro is required to exist (so rustc accepts the consumer's attribute syntactically) but its expansion is irrelevant; pass-through is correct.

## Per-instruction gate attributes (optional)

If your extension provides a check that consumers apply to specific instructions (analogous to `#[require_admin]` in `admin-authority`), add another `#[proc_macro_attribute]` to the macros crate. The pattern is body injection by re-expansion: `#[lez_program]` leaves your attribute on the handler it emits, so your macro runs after the framework, prepends its check to the handler body, and removes itself by returning the function without the attribute.

```rust
use syn::{parse_quote, ItemFn};

#[proc_macro_attribute]
pub fn require_my_gate(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut func: ItemFn = match syn::parse(item) {
        Ok(f) => f,
        Err(e) => return e.to_compile_error().into(),
    };

    // Prepend the runtime check. It references params by their conventional
    // names; accept attribute args to let consumers override the names.
    let prologue: syn::Stmt = parse_quote! {{
        let __state = ::my_extension::MyState::from_account(&my_state)?;
        __state.assert_allowed(&caller)?;
    }};
    func.block.stmts.insert(0, prologue);

    quote::quote!(#func).into()
}
```

Never read or strip `#[account(...)]` attributes in a gate macro. That attribute belongs to the framework, which reads it for validation and the IDL. Your gate should only reference parameter names, taken from its own attribute args with sensible defaults.

**The kwarg contract.** Your gate's attribute keys must be exactly the inject-account names you declare in metadata (`#[require_my_gate(my_state = their_cfg, caller = owner)]`). The framework's auto-wrap and gate stamping emit every kwarg with the resolved parameter name, so your macro receives the framework's naming decisions instead of guessing from convention. Ship an alignment self-test so the two cannot drift: read your own metadata with `spel_framework_core::extension::read_inject_specs(Path::new(env!("CARGO_MANIFEST_DIR")))` and assert the declared account names equal the kwarg set a probe function hands your gate. A name the macro rejects fails the probe's compile, a metadata rename fails the runtime assert.

To spare consumers declaring your gate's account parameters on every gated instruction, declare them in your `Cargo.toml`:

```toml
[[package.metadata.spel.inject]]
wrapper = "require_my_gate"

  [[package.metadata.spel.inject.account]]
  name = "my_state"
  seed = { const = "my_state" }

  [[package.metadata.spel.inject.account]]
  name = "caller"
  signer = true
```

Any consumer instruction carrying `#[require_my_gate]` gets the listed parameters synthesized at expansion time unless it already declares them (skip-if-declared). The injected parameters are exactly what the explicit declaration would have been, land after a leading `ProgramContext` in the block's declaration order, and appear in the IDL like any declared account. Compound PDA seeds work too: `seed = [{ const = "frozen" }, { account = "caller" }]` derives from a literal plus another account's id.

## Auto-wrap every instruction (optional)

If your extension is a circuit-breaker primitive (an emergency stop, a re-entrancy guard, a global rate limit), you may want EVERY consumer instruction gated, not just the ones the consumer remembered to annotate. The framework supports this via a `wrap_instructions` metadata field that activates a module-level wrap hook:

```toml
[package.metadata.spel.wrap_instructions]
wrapper = "my_extension::require_my_gate"
skip = "manual"
self_exempt_marker = "my_extension_exempt"
exempt = [
  "admin_authority::admin_initialize",
  "admin_authority::admin_transfer",
  "admin_authority::admin_renounce",
]
```

- `wrapper`: a qualified path to the per-instruction attribute the framework prepends onto each non-exempt dispatched function, including other extensions' discovered instructions. Reuses the same `#[require_my_gate]` attribute consumers apply by hand in manual mode — one proc-macro, two callers.
- `skip`: the arg literal on your `#[my_extension]` marker that DISABLES auto-wrap. With `skip = "manual"`, `#[my_extension(manual)]` opts out of the wrap and `#[my_extension]` (bare) opts in.
- `self_exempt_marker`: an attribute name the framework recognises as "skip this function from wrap". Add another pass-through proc-macro of that name to your macros crate; consumers carry it on any instruction they want to remain callable while gated.
- `exempt`: a list of cross-crate dispatched instructions to skip unconditionally. Use this when composing with another extension whose ops must stay operable even when your wrap is active. (Self-exemptions for your own instructions go on the function via `self_exempt_marker` instead.)

When the consumer puts `#[my_extension]` on their `#[lez_program]` mod, the framework walks the dispatcher table and prepends `#[require_my_gate]` to every function that is not in `exempt` and does not carry `#[my_extension_exempt]`. Consumers write normal code, the gate arrives with the wrap. Injection and wrapping compose: a wrapped instruction gets your gate's parameters injected like an annotated one.

The hook is opt-in, omit `wrap_instructions` from your metadata and the framework leaves all instructions alone. This is the right choice for most extensions (pure data primitives, single-instruction gates, etc.).

## Embedded mode (optional)

An extension whose per-program state is one fixed-size slot can let consumers embed that slot inside one of their own accounts instead of a dedicated PDA. The consumer declares it on your marker, role name plus byte offset:

```rust
#[my_extension(my_state = config, offset = 32)]
```

To support this as an author: ship windowed state accessors that splice only your slot's byte window (`decode_at`, `write_to_at`, `bootstrap_at` and friends), give the affected instruction functions a trailing `offset: usize` parameter, and declare it as a bound arg so the framework fills it at the dispatch call site as a compile-time literal. Bound args must be the trailing parameters of the function, in the same order as their metadata blocks. Any other position is a hard error at discovery naming the function, because the framework always appends the literals last:

```toml
[package.metadata.spel.embedded]
skip = ["my_extension_initialize"]
state_type = "my_extension::MyConfig"

[[package.metadata.spel.bound_args]]
arg = "offset"
from = "offset"
default = 0
```

`embedded.skip` names instructions not emitted in embedded mode (typically your initializer, the consumer's own account creation replaces it). `state_type` is mandatory for embedded mode and names the Rust type that lives in your window. The framework reads the window's size through it and emits a compile-time assert per pair of extensions embedding into the same consumer account, so genuinely overlapping windows refuse to compile instead of silently corrupting each other. Discovery fails closed when an embedded extension omits it. Bound args are stripped from the IDL and the transaction entirely, a caller can never supply an offset, and dedicated mode is the degenerate case offset 0 through the declared default. `from` also accepts a peer marker's kwarg (`from = "admin_authority::offset"`) so an extension can read state a peer embedded, without depending on the peer's crate. A missing marker or kwarg without a declared default is a hard compile error, never a silent zero.

**Slot field markers.** The framework derives a marker name from your role, the role name minus a `_config` suffix plus `_slot` (role `admin_config` gives `#[admin_slot]`, role `my_state` gives `#[my_state_slot]`). A consumer who puts that marker on the embedding field of an `#[account_type]` struct gets a derived `<MARKER>_OFFSET` const, an emitted layout test, and a compile-time assert that the derived offset equals the `offset = ...` declared on your marker, so a field added above the slot fails the build instead of silently moving the window. Adoption is optional (no marker, no check), and two structs carrying the same marker is a compile error. Nothing to implement on your side, the mechanism ships with `#[account_type]`, but document the marker name your role produces.

**Born-initialized slots.** If your slot must never exist uninitialized (the way an admin slot without a holder is a takeover window), ship a bootstrap attribute consumers put on their own account-creating instruction (the way `admin-authority` ships `#[admin_initialize]`). Implement it as a proc macro that injects your `bootstrap_at` call into the handler body, and declare it as an inject wrapper in metadata so your role parameters synthesize on the marked instruction like they do on gates. Make it embedded-mode only and let the framework stamp the location kwargs, and reject instructions whose embedding account is not `init`, a bootstrap against an existing account is a takeover. A slot that can start empty (the way freeze starts vacant and the admin appoints the first holder via transfer) needs no bootstrap attribute at all.

When two extensions embed into the same consumer account at distinct offsets, the framework merges the duplicated account into one transaction account (listed once in the IDL with unioned constraints, cloned into each position of the call) and your instruction must emit exactly one post-state per unique account id. Same account at the same offset is a compile error.

### Attribute-order convention in library source

When a per-instruction gate attribute does shape validation on parameters (the way `#[require_admin]` checks for an `#[account(pda = literal("admin_config"))]` parameter and an `#[account(signer)]` parameter), the order of attributes on the library's own `#[instruction]` functions matters:

```rust
#[require_my_gate]   // runs first — sees params with #[account(...)] intact
#[instruction]       // shim runs second — strips #[account(...)] for rustc
pub fn gated_op(/* ... */) -> SpelResult { /* ... */ }
```

Rust expands attribute macros top-down. The library's `#[instruction]` shim strips `#[account(...)]` from parameters. If `#[require_my_gate]` is placed below `#[instruction]`, it runs after the strip, no PDA or signer parameters are left for its shape check, and it emits a confusing error.

The rule only applies inside libraries that re-export the shim (like the one shown in this guide). Consumer code uses SPEL's no-op `#[instruction]` from the prelude, which doesn't strip anything; order doesn't matter there.

## Composing with another extension (hard dep)

Some extensions naturally build on others. `freeze-authority` depends on `admin-authority` — its freeze-authority slot is governed by admin signatures. When your extension does this:

1. **Declare a normal Cargo path dep** on the other extension in your `Cargo.toml`. Consumers get both extensions in their dep graph automatically.
2. **Add both markers to the consumer's mod.** Consumers write `#[admin_authority] #[my_extension]` on their `#[lez_program]` mod. Each marker triggers its own discovery.
3. **Import the gate attributes you compose with.** E.g. `use admin_authority::require_admin;` in your library source, then `#[require_admin]` on instructions that should require admin sig (like an initialization that creates your config PDA).
4. **List the other extension's exempt-while-wrapped instructions** in your `wrap_instructions.exempt` if applicable. freeze-authority lists admin-authority's three management instructions so they stay callable while the program is frozen.

The framework deduplicates path-dep dirs, so admin-authority is scanned once even if both your extension and the consumer name it as a path dep.

## Consumer integration

A consumer adds your extension to their `Cargo.toml`:

```toml
[dependencies]
my-extension = { git = "https://github.com/you/my-extension" }
spel-framework = { git = "https://github.com/logos-co/spel" }
```

Path, git, and registry dependencies are all discoverable. Discovery is restricted to the consumer's direct dependencies, a transitive crate can never contribute instructions by claiming a matching `extension_attr`, and the generated call paths use your `[package].name`, never a directory name.

Then puts the marker on their `#[lez_program]` module:

```rust
use spel_framework::prelude::*;
use my_extension::my_extension;

#[lez_program]
#[my_extension]
mod my_program {
    #[instruction]
    pub fn my_user_instr(...) -> SpelResult { ... }
}
```

After compilation, the consumer's binary contains your extension's instructions in its `Instruction` enum, dispatcher, and `PROGRAM_IDL_JSON` const. `spel generate-idl` shows them too. The extension's source is never copied into the consumer's module; calls dispatch directly to your library via `::my_extension::extension_action(...)`.

## Multiple extensions on one program

Consumers can stack extensions without coordination between library authors:

```rust
#[lez_program]
#[admin_authority]
#[my_extension]
mod my_program { ... }
```

Each extension is discovered independently by its own `extension_attr`. Each contributes its own instructions to the dispatcher, and each gate attribute re-expands on its own gated handlers without touching the others.

Marker order is the cross-extension ABI: the first marker's instructions and injected parameters come first in the dispatcher, the IDL, and the account order. When two extensions inject the same parameter name with identical constraints they share one account, conflicting constraints are a compile error naming both extensions. Duplicate instruction names between extensions (or an extension and a consumer function) are a compile error naming both sources. Two extensions can even embed into the same consumer account at distinct offsets, see embedded mode above.

## Verifying your extension

Build a small sample program that consumes your extension. Then:

```bash
spel generate-idl path/to/sample/src/main.rs
```

The IDL should contain your extension's instructions alongside the consumer's own. A marker that matches no discoverable extension is a hard compile error naming the marker, regardless of why it did not match, so a broken setup refuses loudly instead of building a program silently missing its extension surface. When you hit that error, the most common causes are:

- `[package.metadata.spel.extension_attr]` not declared, or value does not match the attribute name the consumer wrote.
- The library is a transitive dependency rather than a direct one. Only the consumer's own `[dependencies]` are scanned, by design.
- Cached macro expansion, try `cargo clean -p <sample-crate>` and rebuild. Cargo doesn't know proc-macros read external `Cargo.toml` files, so metadata changes don't always invalidate the cache.

Malformed `[package.metadata.spel]` is a hard compile error too, never a silent skip. When dependency resolution itself degrades (for example `cargo metadata` failing in a constrained environment) but every marker still matched a path dependency, the degradation stays a warning and the build continues.

## Why this design

Earlier iterations of SPEL handled the same use case by hardcoding extension support in `spel-framework-macros`, adding an `#[admin_authority]` macro to the framework itself with templates baked in. That approach required a framework PR per extension and coupled every extension to the framework's release cycle. The metadata-driven scanner replaces it: framework knows nothing specific about any extension, libraries ship independently, and the same mechanism scales to any number of extension crates.
