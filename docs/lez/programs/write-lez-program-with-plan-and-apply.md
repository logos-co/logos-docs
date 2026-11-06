---
title: Write an LEZ program that updates an account via `plan` and `apply`
doc_type: procedure
product: lez
topics:
  - lez
  - programs
steps_layout: sectioned
authors: kashepavadan
owner: logos
doc_version: 1
slug: write-lez-program-with-plan-and-apply
sidebar_position: 2
---

# Write an LEZ program that updates an account via `plan` and `apply`

#### Walk through the example guest programs to learn how an LEZ program declares effects in `plan` and writes one shard at a time in `apply`.

:::tip[Version]
This document is accurate for **Testnet v0.3**.
:::

When a [Logos Execution Zone (LEZ)](../../get-started/glossary.md#logos-execution-zone) [program](../../get-started/glossary.md#program) executes and consequently modifies an LEZ [account](../../get-started/glossary.md#account), it does not receive full account states or return full post-states. Instead, it has two distinct entry points that have access only to what the execution engine gives them:

- **`plan`** sees the instruction and a list of account handles, but no account data. It turns the instruction into a list of intents: effects on account data [shards](../../get-started/glossary.md#shard), chained calls to other programs, and events.
- **`apply`** materialises one effect against exactly one shard of one account, and sees nothing else.

For more information about this two-step update process, see [Introduction to the Logos Execution Zone](../introduction-to-the-logos-execution-zone.md#how-programs-update-account-state).

This procedure walks through the example programs in the [`examples/program_deployment`](https://github.com/logos-blockchain/logos-execution-zone/tree/v0.3.2/examples/program_deployment) directory of the LEZ repository, from a short program to one that chains calls and emits events. It is intended for developers writing or reviewing LEZ programs who want to understand the interface before writing their own.

:::info[Prerequisites]

- [Git](https://git-scm.com/) and the [Rust toolchain](https://www.rust-lang.org/tools/install).
- Familiarity with Rust and the [`borsh`](https://borsh.io/) serialisation format.
- The [RISC Zero toolchain](https://dev.risczero.com/api/zkvm/install) (`rzup`) and [Docker](https://docs.docker.com/get-docker/), to build the guest programs.
- An [LEZ CLI wallet](../get-started/run-lez-wallet-via-cli.md) funded and connected to the testnet.
- `xxd` installed. Install it with `sudo apt install xxd` on Ubuntu or Debian.
:::

## What to expect

- You can write a program's `plan` function that declares effects on account handles without reading account data.
- You can write a program's `apply` function that keeps, clears, or replaces exactly one shard.
- You can compose programs by chaining calls, delegating PDA authorisation, and emitting events from `plan`.
- You can deploy the example programs to the testnet and run them against public and private accounts.

## Step 1: Get the example programs

1. Clone the LEZ repository at the release the testnet runs and open the example programs:

   ```bash
   git clone https://github.com/logos-blockchain/logos-execution-zone.git
   cd logos-execution-zone
   git checkout v0.3.2
   ls examples/program_deployment/methods/guest/src/bin
   ```

   **Expected result:**

   ```text
   hello_world.rs
   hello_world_with_authorization.rs
   hello_world_with_move_function.rs
   simple_tail_call.rs
   tail_call_with_pda.rs
   ```

   Each file is a standalone program. The rest of this procedure reads them in order of complexity.

## Step 2: Understand how account data is stored

Before writing a program, you need to know what `apply` is allowed to change. An account is a nonce plus a map of **shards**, each keyed by the account ID of the program that owns it (`AccountData { shards: BTreeMap<AccountId, ShardData> }`). A program may only write the shard keyed by its own account ID. There is no claiming of accounts: any program can write its own shard on any account it is given.

1. Note the types that name a shard, which you pass around instead of account data:

   | Type | Fields | Purpose |
   | :--- | :--- | :--- |
   | `ProgramShardSelector` | `account_id`, `program_account_id` | Names one (account, shard) pair. A client uses it to select a program's inputs, and a program uses it to select the inputs of a program it calls. |
   | `AccountMeta` | `account_id`, `is_authorized`, `program_account_id` | The handle `plan` receives for each input. It carries no data. The engine computes `is_authorized`. |
   | `ShardData` | Wrapped `Vec<u8>`, at most 100 KiB | The contents of one shard, as `apply` receives and returns it. |

1. Note where the native balance lives. Balances sit in the native token shard, whose program ID is all zeros (`NATIVE_TOKEN_PROGRAM_ID`). Transfers are planned and applied by protocol code, and no guest can write that shard. A program moves native tokens by chaining a call to the native token program, as [Step 7](#step-7-combine-effects-calls-and-events) shows.

## Step 3: Wire the entry point with `run_program`

Every guest that writes data starts the same way. `run_program` reads one invocation from the zkVM, decides whether it is a plan call or an apply call, runs the matching function, and writes a tagged `GuestOutput` to the journal. Because the journal is tagged, a plan receipt can never satisfy an apply slot.

1. Open `examples/program_deployment/methods/guest/src/bin/hello_world.rs`. It appends its instruction bytes to its own shard on a single input account. Its `main` function is one line:

   ```rust
   use lee_core::{
       account::ShardData,
       program::{Plan, PlanInput, run_program},
   };

   type Instruction = Vec<u8>;

   fn main() {
       run_program(plan, apply)
   }
   ```

   `run_program(plan, apply)` takes your two entry points and never returns:

   - `plan: FnOnce(&PlanInput, I) -> Plan`. `I` is your instruction type. `run_program` Borsh-decodes it from the transaction's instruction data before calling `plan`.
   - `apply: FnOnce(E, &P) -> Option<D>`. `E` is your effect type, Borsh-decoded from the effect that `plan` emitted. `P` is the shard's current data, as `&ShardData` or `&[u8]`. `D` is anything that converts into `ShardData`, such as `Vec<u8>`.
   - A panic in either function fails the whole transaction.

## Step 4: Declare effects in `plan`

`plan` is state-blind: it receives account handles but never account data. Its job is to validate the instruction and the shape of the inputs, then declare what should happen.

1. Read the `plan` function in `hello_world.rs`:

   ```rust
   fn plan(input: &PlanInput, instruction: Instruction) -> Plan {
       let mut plan = Plan::new(input);
       let [account] = input.accounts.as_slice() else {
           panic!("Input accounts should consist of a single account");
       };
       plan.effect(account, &instruction);
       plan
   }
   ```

   - `Plan::new(input)` starts a builder that echoes the engine's input back. The engine rejects a plan whose echoed input differs from the one it computed (`PlanInputMismatch`), so always build from the `input` you were given.
   - `plan.effect(account, &instruction)` declares one effect on the program's own shard of `account`. The effect value is Borsh-encoded and handed to `apply` later. Here the effect is the raw instruction bytes.

   `PlanInput` carries:

   | Field | Description |
   | :--- | :--- |
   | `self_account_id` | The account ID of the program being run. |
   | `caller_account_id` | The calling program for a chained call, or `None` for a top-level transaction. |
   | `accounts` | One `AccountMeta` handle per input the caller selected, in order. |
   | `instruction_data` | The raw instruction bytes. `run_program` has already decoded these into your instruction type. |

1. Check authorisation in `plan` when the program must only modify an account that is authorised. Open `hello_world_with_authorization.rs`. The only difference from `hello_world.rs` is one assertion:

   ```rust
   // Fail if the input account is not authorized
   assert!(account.is_authorized, "Missing required authorization");
   ```

   :::info
   The engine sets `is_authorized` in one of three ways:
   - For a [public account](../../get-started/glossary.md#public-account): if it signed the transaction that ran the program
   - For a [private account](../../get-started/glossary.md#private-account): from knowledge of the [authorisation secret key](../../get-started/glossary.md#authorisation-secret-key)
   - For a delegated PDA: if the calling program attaches a seed to delegate authorisation
   :::

1. Use the other `Plan` builder methods as your program needs them:

   | Method | What it declares |
   | :--- | :--- |
   | `effect(account, &effect)` | An effect on this program's own shard of `account`. Panics if the handle names another program's shard. |
   | `inspect(account, owner, &guard)` | A read-only check routed through `owner`'s own `apply`, for a shard this program does not own. |
   | `call(ChainedCall)` | A call to another program, run after this one. |
   | `event(ProgramEvent)` | An event for off-chain consumers to read from an indexer. It does not change the state. |
   | `block_window(..)`, `timestamp_window(..)` | Narrows the block ID or timestamp range in which the transaction is valid, for example `plan.block_window(..100)`. |

   An effect may only target a shard that is an input of the call. The engine rejects anything else with `EffectOutsideInputs`.

## Step 5: Write one shard in `apply`

The engine calls `apply` once per effect, with the shard that effect targets and nothing else. A shard that does not exist yet arrives empty.

1. Read the `apply` function in `hello_world.rs`:

   ```rust
   fn apply(greeting: Vec<u8>, pre_data: &ShardData) -> Option<Vec<u8>> {
       let mut bytes = pre_data.clone().into_inner();
       bytes.extend(greeting);
       Some(bytes)
   }
   ```

   `greeting` is the effect `plan` emitted, and `pre_data` is the current contents of the program's shard on the account. The return value decides what happens to the shard:

   | Return value | Result |
   | :--- | :--- |
   | `None` | Keep the shard unchanged. Use this for a check that writes nothing. |
   | `Some(empty)` | Clear the shard. |
   | `Some(data)` | Replace the shard with `data`. |

   - `run_program` wraps the result in an `ApplyOutput` that echoes the engine's `ApplyInput { self_account_id, selector, pre_data, effect_data }`. The engine rejects an output that does not match (`ApplyInputMismatch`), and rejects a write to a shard the program does not own (`ForeignShardWrite`).
   - `apply` cannot chain calls. The engine rejects an apply output that carries any (`ChainedCallsFromApply`).

1. Split a change that touches several accounts into one effect per shard. Open `hello_world_with_move_function.rs`, which moves bytes from one account's shard to another's:

   ```rust
   const WRITE_FUNCTION_ID: u8 = 0;
   const MOVE_DATA_FUNCTION_ID: u8 = 1;

   type Instruction = (u8, Vec<u8>);

   #[derive(borsh::BorshSerialize, borsh::BorshDeserialize)]
   enum Effect {
       Append(Vec<u8>),
       MoveOut(Vec<u8>),
   }

   fn plan(input: &PlanInput, instruction: Instruction) -> Plan {
       let mut plan = Plan::new(input);
       let (function_id, data) = instruction;

       match (input.accounts.as_slice(), function_id) {
           ([account], WRITE_FUNCTION_ID) => plan.effect(account, &Effect::Append(data)),
           ([from, to], MOVE_DATA_FUNCTION_ID) => {
               plan.effect(from, &Effect::MoveOut(data.clone()));
               plan.effect(to, &Effect::Append(data));
           }
           _ => panic!("invalid params"),
       }
       plan
   }
   ```

   A program-defined `Effect` enum lets one `apply` handle several kinds of change. `move_data` emits two effects, so the destination's `apply` never sees the source's contents.

1. Pin values that `plan` cannot read. `plan` cannot see what the source shard holds, so the instruction states it, and the source's `apply` refuses unless the shard holds exactly those bytes:

   ```rust
   fn apply(effect: Effect, pre_data: &[u8]) -> Option<Vec<u8>> {
       Some(match effect {
           Effect::Append(data) => {
               let mut bytes = pre_data.to_vec();
               bytes.extend_from_slice(&data);
               bytes
           }
           Effect::MoveOut(data) => {
               assert_eq!(
                   pre_data, data,
                   "the source account does not hold the bytes the instruction moves out of it"
               );
               Vec::new()
           }
       })
   }
   ```

   Because the transaction fails if any effect panics, the value the destination appends is the real one, not just a caller's claim. Use this pattern whenever one shard's new value depends on another shard's old value.

## Step 6: Chain a call to another program

A program composes with others by declaring chained calls in `plan`. A caller names `(account, shard)` pairs only. It cannot hand the called program an account value or an authorisation bit, because the engine resolves each selector against live execution state and computes `is_authorized` itself. Calls run depth-first, and a transaction may prepare at most 10 chained calls in total (`MAX_NUMBER_CHAINED_CALLS`), counted across the whole traversal rather than per branch.

1. Open `simple_tail_call.rs`. It writes nothing itself, so it skips `run_program`, reads the call with `read_program_call`, and refuses an apply call:

   ```rust
   type Instruction = AccountId;

   fn main() {
       let ProgramCall::Plan(input, instruction) = read_program_call::<Instruction>() else {
           panic!("simple_tail_call emits no effect to apply")
       };
       let callee_account_id = instruction;

       let [account] = <[_; 1]>::try_from(input.accounts.clone())
           .unwrap_or_else(|_| panic!("Input accounts should consist of a single account"));

       let greeting: Vec<u8> = b"Hello from tail call".to_vec();

       let mut plan = Plan::new(&input);
       plan.call(ChainedCall::new(
           callee_account_id,
           vec![ProgramShardSelector::new(
               account.account_id,
               callee_account_id,
           )],
           &greeting,
       ));
       plan.write()
   }
   ```

   - The account ID of the called program comes from the instruction, because a deployed program's address is not known until deploy time.
   - `ChainedCall::new(program_account_id, shard_selectors, &instruction)` encodes the instruction for the called program. Here it selects that program's own shard on the same account, so `hello_world` can write it.
   - Without `run_program`, you must end with `plan.write()`. Building a `Plan` has no effect until it is written.

1. Delegate authorisation over a [Program Derived Address](../../get-started/glossary.md#program-derived-address) by attaching seeds to the call. Open `tail_call_with_pda.rs`:

   ```rust
   const PDA_SEED: PdaSeed = PdaSeed::new([37; 32]);

   plan.call(
       ChainedCall::new(
           callee_account_id,
           vec![ProgramShardSelector::new(
               account.account_id,
               callee_account_id,
           )],
           &greeting,
       )
       .with_pda_seeds(vec![PDA_SEED]),
   );
   ```

   For each seed, the engine authorises the called program, and any program it calls in turn, to act on the account derived from `(caller program ID, seed)`. Here the input account is `AccountId::for_public_pda(&self_account_id, &PDA_SEED)`, so `hello_world_with_authorization` sees `is_authorized == true` and writes its shard.

## Step 7: Combine effects, calls and events

Production programs mix all three outputs in one `plan`. The bridge program's deposit, in [`lez/programs/bridge/src/main.rs`](https://github.com/logos-blockchain/logos-execution-zone/blob/v0.3.2/lez/programs/bridge/src/main.rs), is a compact example.

1. Read the deposit branch of the bridge's `plan`:

   ```rust
   let [bridge, recipient, receipt] = <&[_; 3]>::try_from(input.accounts.as_slice())
       .expect("Deposit requires exactly 3 accounts");

   assert_eq!(
       bridge.account_id,
       bridge_core::compute_bridge_account_id(input.self_account_id),
       "First account must be bridge PDA"
   );
   // ... similar checks pin the recipient and the deposit-receipt PDA

   let mut plan = Plan::new(input);
   plan.effect(receipt, &Effect::RecordDeposit);
   plan.call(custody_transfer(
       bridge.account_id,
       bridge_core::compute_bridge_seed(),
       recipient.account_id,
       u128::from(amount),
   ));
   plan.event(ProgramEvent {
       selector: bridge_core::event::Deposit::SELECTOR,
       data: bridge_core::event::Deposit {
           l1_deposit_op_id,
           recipient_id,
           amount,
       }
       .to_bytes(),
   });
   plan
   ```

   - **Pin every handle.** Account handles are chosen by the transaction, so `plan` asserts each one is the PDA it expects before declaring anything.
   - **Effect as replay guard.** `RecordDeposit` writes a one-byte receipt, and its `apply` panics if the receipt shard is already written, so the same deposit cannot be credited twice.
   - **Native balance through a call.** `custody_transfer(from, seed, to, amount)` returns a `ChainedCall` to the native token program, with the bridge's PDA seed attached so it can debit its own custody account.
   - **Event for off-chain consumers.** The event carries no state and changes nothing on chain.

## Step 8: See the example programs in action

### Build the example programs

Each example ships with a runner in `examples/program_deployment/src/bin` that deploys its program to the testnet and submits a transaction to it. Before you run them, build the guest binaries and set up the accounts the runners need.

1. From the repository root, build the example guest programs and export the directory they are written to:

   ```bash
   cargo risczero build --manifest-path examples/program_deployment/methods/guest/Cargo.toml
   export EXAMPLE_PROGRAMS_BUILD_DIR=$(pwd)/target/riscv32im-risc0-zkvm-elf/docker
   ls $EXAMPLE_PROGRAMS_BUILD_DIR
   ```

   **Expected result:** one `.bin` file per program from [Step 1](#step-1-get-the-example-programs), such as `hello_world.bin`.

1. Change to the example directory. Run all remaining commands from here:

   ```bash
   cd examples/program_deployment
   ```

1. Choose a funded public account to pay deployment fees, and export its account ID without the `Public/` prefix:

   ```bash
   export PAYER=<funded_public_account_id>
   ```

   Every runner first deploys its program through the program loader, which takes one transaction per bytecode segment and one for the program header. The payer covers all of them: each deployment of an example program costs about 3.2 million native units on the testnet. The runners take account IDs as bare base58 strings, so drop the `Public/` or `Private/` prefix that the wallet prints.

1. Give the wallet more time to wait for each transaction. A deployment submits about five transactions in sequence, and by default the wallet waits less than a minute for each one. When testnet blocks are slower than that, the runner panics with `segment <n> transaction did not finalize`, and running it again deploys and pays for a new copy:

   ```bash
   wallet config set seq_tx_poll_max_blocks 300
   ```

:::note
Each run of a runner deploys a new copy of its program at a new program account ID. Because a program owns the shard keyed by its own account ID, a run never sees data that an earlier run wrote.
:::

### Run `hello_world` publicly and privately

1. Create a public account and record its account ID:

   ```bash
   wallet account new public
   ```

   **Expected result:** `Generated new account with account_id Public/<account_id> at path /0`

1. Deploy `hello_world` and append the greeting `Hola mundo!` to its shard on the account:

   ```bash
   cargo run --bin run_hello_world \
       $EXAMPLE_PROGRAMS_BUILD_DIR/hello_world.bin \
       <public_account_id> \
       $PAYER
   ```

   The runner selects the program's shard with `ProgramShardSelector::new(account_id, program_account_id)` and submits a public transaction. The sequencer runs `plan` and `apply` for you.

1. Inspect the account:

   ```bash
   wallet account get --raw --scope all --account-id Public/<public_account_id>
   ```

   **Expected result:** the `shards` map has an entry keyed by the new program's account ID, with the hex value `486f6c61206d756e646f21`. Decode it with `echo 486f6c61206d756e646f21 | xxd -r -p` to see `Hola mundo!`.

1. Run the same program against a private account. Create the account and record its account ID:

   ```bash
   wallet account new private
   ```

1. Run the private runner:

   ```bash
   cargo run --bin run_hello_world_private \
       $EXAMPLE_PROGRAMS_BUILD_DIR/hello_world.bin \
       <private_account_id> \
       $PAYER
   ```

   The guest binary is the same: only the privacy of the input account differs. Your machine runs `plan` and `apply` locally and generates the proofs, which can take several minutes.

1. Sync private state, then inspect the account:

   ```bash
   wallet account sync-private
   wallet account get --raw --scope all --account-id Private/<private_account_id>
   ```

   **Expected result:** the program's shard holds `486f6c61206d756e646f21`. Before the sync, the wallet still reports `Account is Uninitialized`, because the new state exists on chain only as an encrypted commitment.

### Check authorisation with `hello_world_with_authorization`

1. Create a public account for this example and record its account ID:

   ```bash
   wallet account new public
   ```

1. Run the authorised runner:

   ```bash
   cargo run --bin run_hello_world_with_authorization \
       $EXAMPLE_PROGRAMS_BUILD_DIR/hello_world_with_authorization.bin \
       <public_account_id> \
       $PAYER
   ```

   Unlike `run_hello_world`, this runner loads the account's signing key, includes its current nonce in the message, and signs the transaction. The engine therefore sets `is_authorized` on the account, and the assertion from [Step 4](#step-4-declare-effects-in-plan) passes.

1. Inspect the account as in the previous step.

   **Expected result:** the program's shard holds `486f6c61206d756e646f21`.

1. Optionally, run the unauthorised runner against the same program:

   ```bash
   cargo run --bin run_hello_world \
       $EXAMPLE_PROGRAMS_BUILD_DIR/hello_world_with_authorization.bin \
       <public_account_id> \
       $PAYER
   ```

   **Expected result:** `plan` panics with `Missing required authorization`, so the transaction fails and the account gains no new shard.

### Move data and chain calls

1. Write to a public account with `hello_world_with_move_function`. Note that `$PAYER` comes before the subcommand for this runner:

   ```bash
   cargo run --bin run_hello_world_with_move_function \
       $EXAMPLE_PROGRAMS_BUILD_DIR/hello_world_with_move_function.bin \
       $PAYER \
       write-public <public_account_id> mundo!
   ```

   The runner also has `write-private`, `move-data-public-to-public` and `move-data-public-to-private` subcommands. Before a move, the runner reads the source shard and puts those bytes in the instruction, which is the pinning pattern from [Step 5](#step-5-write-one-shard-in-apply). A `move-data-*` run deploys a new copy of the program, though, so the source shard it reads is the empty shard of that new copy, not the one an earlier `write-*` run wrote.

1. Run `simple_tail_call`, which chains a call to `hello_world`. The runner deploys both programs and passes the account ID of `hello_world` as the instruction:

   ```bash
   cargo run --bin run_hello_world_through_tail_call \
       $EXAMPLE_PROGRAMS_BUILD_DIR/simple_tail_call.bin \
       $EXAMPLE_PROGRAMS_BUILD_DIR/hello_world.bin \
       <public_account_id> \
       $PAYER
   ```

   **Expected result:** inspecting the account shows a new shard, keyed by the new `hello_world` deployment, that decodes to `Hello from tail call`. `simple_tail_call` itself writes no shard.

   To run the same chain privately, use `run_hello_world_through_tail_call_private` with the same arguments and a private account ID, then sync private state before you inspect it. The runner proves both programs locally, so it takes longer than the earlier private run.

1. Run `tail_call_with_pda`, which delegates authorisation over its PDA to `hello_world_with_authorization`. The runner computes the PDA itself, so it takes no account ID:

   ```bash
   cargo run --bin run_hello_world_with_authorization_through_tail_call_with_pda \
       $EXAMPLE_PROGRAMS_BUILD_DIR/tail_call_with_pda.bin \
       $EXAMPLE_PROGRAMS_BUILD_DIR/hello_world_with_authorization.bin \
       $PAYER
   ```

   **Expected result:** `The program derived account id is: <pda_account_id>`

1. Inspect the PDA:

   ```bash
   wallet account get --raw --scope all --account-id Public/<pda_account_id>
   ```

   **Expected result:** the shard of `hello_world_with_authorization` decodes to `Hello from tail call with Program Derived Account ID`. Nobody signed for the PDA: the engine authorised it because `tail_call_with_pda` attached its seed to the call.

## Troubleshooting

### A program written for an earlier LEZ release no longer compiles

The `ProgramOutput`, `AccountPostState` and `AccountDiff` types were removed. Rewrite the program as a `plan` that emits effects and an `apply` that returns a shard's new data, as in [Step 4](#step-4-declare-effects-in-plan) and [Step 5](#step-5-write-one-shard-in-apply).

### A plan-only program has no effect

A `Plan` does nothing until it is written. If your guest does not use `run_program`, end `main` with `plan.write()`.

### The transaction fails with `EffectOutsideInputs` or `ForeignShardWrite`

The program declared an effect on a shard that is not an input of the call, or tried to write a shard keyed by another program. Check that the client, or the calling program, selects `ProgramShardSelector::new(account_id, <your program's account ID>)` for every account your `plan` writes.
