# Build a SPEL extension library

{% hint style="warning" %}
## Important

This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. We are actively working to complete and verify this content.
{% endhint %}

SPEL extension libraries ship reusable on-chain primitives, access control, freeze switches, multisig, etc., that consuming programs adopt with a single attribute. This guide is for library authors. App developers consuming an existing extension should follow that extension's own integration guide instead.

## What an extension provides

An extension is a normal Rust crate that:

1. Defines one or more `#[instruction]` fns that consumers can call from the SPEL CLI / wallets.
2. Declares a marker attribute name in its `Cargo.toml` so consumers can opt in.
3. Optionally ships per-instruction gate attributes (like `#[require_admin]`) that consumers apply to their own instructions.

When a consumer puts the marker attribute on a `#[lez_program]` module, the framework discovers the extension via Cargo metadata, scans the library's `src/lib.rs` for `#[instruction]` fns, and merges them into the consumer's dispatcher and IDL automatically. No framework changes are needed per extension.

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

Per-instruction gate attributes your library defines (e.g. `#[require_admin]` from `admin-authority`) need no metadata: they are ordinary proc-macros that re-expand on the emitted handler and consume themselves, so the framework leaves them alone.

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

If your extension provides a check that consumers apply to specific instructions (analogous to `#[require_admin]` in `admin-authority`), add another `#[proc_macro_attribute]` to the macros crate:

```rust
use quote::ToTokens;

#[proc_macro_attribute]
pub fn require_my_gate(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let func: syn::ItemFn = match syn::parse(item.clone()) {
        Ok(f) => f,
        Err(e) => return e.to_compile_error().into(),
    };

    // Validate the consumer's instruction shape (e.g. required accounts present).
    // Emit compile_error! via syn::Error::new_spanned(...).to_compile_error() on
    // failure. Return the unchanged item on success, body injection (the
    // actual runtime check) is your library's responsibility.

    item
}
```

Add the attribute name to `instruction_attrs` in your `Cargo.toml`. The framework will strip it from emitted handler fns so it doesn't re-expand after `#[lez_program]` runs.

## Consumer integration

A consumer adds your extension to their `Cargo.toml`:

```toml
[dependencies]
my-extension = { git = "https://github.com/you/my-extension" }
spel-framework = { git = "https://github.com/logos-co/spel" }
```

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

After compilation, the consumer's binary contains your extension's instructions in its `Instruction` enum, dispatcher, and `PROGRAM_IDL_JSON` const. `spel generate-idl` shows them too. The consumer never sees the extension's source copied into their module; calls dispatch directly to your library via `::my_extension::extension_action(...)`.

## Multiple extensions on one program

Consumers can stack extensions without coordination between library authors:

```rust
#[lez_program]
#[admin_authority]
#[my_extension]
mod my_program { ... }
```

Each extension is discovered independently by its own `extension_attr`. Each contributes its own instructions to the dispatcher. Each library's `instruction_attrs` are collected into a single strip list for handler emit.

## Verifying your extension

Build a small sample program that consumes your extension. Then:

```bash
spel generate-idl path/to/sample/src/main.rs
```

The IDL should contain your extension's instructions alongside the consumer's own. If they are missing, the most common causes are:

- `[package.metadata.spel.extension_attr]` not declared, or value does not match the attribute name the consumer wrote.
- Library's `Cargo.toml` not listed as a path dependency in the consumer's `Cargo.toml` (registry / git deps are not scanned).
- Cached macro expansion, try `cargo clean -p <sample-crate>` and rebuild. Cargo doesn't know proc-macros read external `Cargo.toml` files, so metadata changes don't always invalidate the cache.

## Why this design

Earlier iterations of SPEL handled the same use case by hardcoding extension support in `spel-framework-macros`, adding an `#[admin_authority]` macro to the framework itself with templates baked in. That approach required a framework PR per extension and coupled every extension to the framework's release cycle. The metadata-driven scanner replaces it: framework knows nothing specific about any extension, libraries ship independently, and the same mechanism scales to any number of extension crates.
