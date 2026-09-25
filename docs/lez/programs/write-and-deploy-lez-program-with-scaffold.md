---
title: Write and deploy an LEZ program with `logos-scaffold`
doc_type: procedure
product: blockchain
topics:
  - lez
  - scaffold
steps_layout: sectioned
authors: ygd58, kashepavadan, weboko
owner: logos
doc_version: 1
slug: write-and-deploy-lez-program-with-scaffold
sidebar_position: 1
---

# Write and deploy an LEZ program with `logos-scaffold`

#### Use `logos-scaffold` to create, build, and deploy a guest program on a local Logos Execution Zone sequencer.

:::tip[Version]
This document is accurate for **Testnet v0.2.1**.
:::

[`logos-scaffold`](https://github.com/logos-co/scaffold) is a project scaffold and CLI tool that manages the full lifecycle of a [LEZ](../../get-started/glossary.md#lez) guest [program](../../get-started/glossary.md#program)—from project creation to deployment. It pins LEZ and SPEL dependencies, builds a project-local sequencer, and handles wallet interactions, so you can focus on writing your program logic.

This guide walks each stage separately so you can see what the tool does. Once the pieces are familiar, [`logos-scaffold run`](#use-logos-scaffold-run-for-the-inner-loop) chains them into a single command. For what else scaffold manages, including Basecamp modules, see [About Logos Scaffold](../../scaffold/about-logos-scaffold.md).

:::info[Prerequisites]

- A supported OS:
    - Linux: x86_64
    - macOS
- `git`, and Rust 1.81 or newer with `cargo`.
- The Unix process helpers `lsof`, `ps`, and `kill`, and `curl`.
- The [RISC Zero toolchain](https://dev.risczero.com/api/zkvm/install), installed with `rzup`:

    ```bash
    curl -L https://risczero.com/install | bash   # installs rzup; restart your shell afterwards
    rzup install rust
    rzup install cargo-risczero 3.0.5
    ```

    `rust` builds the guest programs. `cargo-risczero` provides `r0vm`, which the sequencer needs to execute transactions, and it must be the version LEZ `v0.1.2` pins, `3.0.5`: scaffold only looks for that version. Without it, `localnet start` still reports `localnet ready`, with a warning about `RISC0_SERVER_PATH`, and `deploy` then fails.
- Optionally, [Docker](https://docs.docker.com/get-docker/) or Podman. `logos-scaffold doctor` checks for one, but guest programs build with the local RISC Zero toolchain.
- About 5 GB of free disk space for the pinned LEZ and `spel` builds.

Nix is not needed for this guide, only for scaffold's `basecamp` commands. If it is not installed, `logos-scaffold doctor` reports a `tool nix` warning that you can ignore.
:::

## What to expect

- You can create a new LEZ program project with logos-scaffold.
- You can write a guest program that runs inside the RISC0 zkVM.
- You can build your program and deploy it to a project-local LEZ sequencer.
- You can interact with your deployed program using the wallet CLI.

## Step 1: Install logos-scaffold

1. Install the CLI from crates.io:

    ```bash
    cargo install logos-scaffold
    ```

    This installs two binaries on your PATH: `logos-scaffold` and the shorter alias `lgs`. They are functionally identical. To build from source instead, clone [`logos-co/scaffold`](https://github.com/logos-co/scaffold) and run `cargo install --path .` in it.

1. Verify the installation:

    ```bash
    logos-scaffold --version
    ```

## Step 2: Create a new project

1. Create a new LEZ program project. Replace `my-program` with your project name:

    ```bash
    logos-scaffold new my-program
    cd my-program
    ```

    This generates a project with the `default` template, which includes sample guest programs and runner scripts. For an Anchor-style framework with IDL and generated client bindings, pass `--template lez-framework` instead; this guide follows the default template.

    :::info
    `new` also clones the pinned LEZ source into scaffold's shared cache; with the builds from [Step 3](#step-3-set-up-the-project) the cache grows to about 3.5 GB. To keep it somewhere else, pass `--cache-root <path>` or set `LOGOS_SCAFFOLD_CACHE_ROOT`.
    :::

1. Inspect the project layout:

    ```text
    my-program/
    ├── scaffold.toml          # Project configuration and dependency pins
    ├── methods/
    │   └── guest/
    │       └── src/bin/       # Guest programs run inside the RISC0 zkVM
    ├── src/
    │   └── bin/               # Runner scripts that submit transactions
    ├── AGENTS.md              # Guidance for AI coding assistants
    ├── .claude/skills/        # The same guidance for Claude Code
    ├── .cursor/rules/         # The same guidance for Cursor
    └── .scaffold/             # Local state, wallet home, and build artifacts
    ```

## Step 3: Set up the project

1. Run `setup` to sync the LEZ and SPEL repositories to their pinned commits, build the project-local sequencer and wallet binaries, and seed the default wallet:

    :::warning
    Scaffold unlocks the wallet it seeds with a deterministic local password, so the onboarding flow needs no prompts. To use your own, export it **before the first `setup`** (or the first `run`, which chains `setup`):

    ```bash
    export LOGOS_SCAFFOLD_WALLET_PASSWORD='<your-local-dev-password>'
    ```

    If the storage was already created under the default password, export the override and re-seed with `logos-scaffold run --reset`. These are development-only keys; never use them for real funds.
    :::

    ```bash
    logos-scaffold setup
    ```

    On a cold cache this step builds the sequencer, wallet, and `spel` from source, which takes about 20 minutes on a four-core machine. Later runs reuse the build.

1. Check the project's environment. `doctor` reports missing tools and configuration problems, with a next step for each:

    ```bash
    logos-scaffold doctor
    ```

    At this point expect three `WARN` rows about the sequencer, because the localnet is not running yet. [Step 6](#step-6-start-a-local-sequencer) clears them.

## Step 4: Write your guest program

Guest programs run inside the [RISC0 zkVM](https://dev.risczero.com/) and define the on-chain logic of your LEZ program. Each guest program in `methods/guest/src/bin/` becomes a deployable program with its own `program_id`.

1. Open the sample guest program:

    ```bash
    $EDITOR methods/guest/src/bin/hello_world.rs
    ```

1. The program receives a `ProgramInput` struct via the zkVM environment, applies your logic, and writes a `ProgramOutput` struct to the journal. The sequencer verifies the proof and updates the on-chain [account](../../get-started/glossary.md#account) state.

    Key concepts:
    - **Instructions** are passed as bytes. `hello_world` takes its instruction as a raw `Vec<u8>` and appends it to the account's data.
    - **Account data** is stored in `AccountWithMetadata` structs.
    - Use `RISC0_DEV_MODE=1` during development to skip ZK proof generation for faster iteration.

## Step 5: Build the project

1. Build the workspace. In development, use `RISC0_DEV_MODE=1` to skip proof generation:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold build
    ```

    The build compiles your guest programs and produces `.bin` artifacts under `target/riscv-guest/…/riscv32im-risc0-zkvm-elf/release/`. The first build takes a few minutes.

## Step 6: Start a local sequencer

1. Start a project-local sequencer to deploy your program to:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold localnet start
    ```

    `start` returns once the sequencer process is alive and its RPC port answers. The sequencer is daemonised and survives terminal or tmux session closure. Use `logos-scaffold localnet status` to check that it is running and `logos-scaffold localnet stop` to stop it.

    :::info
    If `start` fails, read the sequencer log with `logos-scaffold localnet logs --tail 200`. If `status` reports `ownership: foreign`, another process already holds the sequencer port, `127.0.0.1:3040`; stop it first. To wipe chain state and start over, run `logos-scaffold localnet reset --yes`.
    :::

    :::warning
    The local sequencer always uses port `3040`. If something else is already listening there—another
    scaffold project, or a sequencer left running by an earlier session—`localnet start` fails with:

    ```text
    Error: Failed to build RPC server

    Caused by:
        Address already in use (os error 98)
    ```

    Free port `3040` before starting. Changing `port` under `[localnet]` in `scaffold.toml` is not a
    workaround in `logos-scaffold` 0.4.0: it moves the readiness check and the generated
    `sequencer_config.json`, but the sequencer binary still binds `3040` (its `--port` default) and
    `.scaffold/wallet/wallet_config.json` keeps pointing at `http://127.0.0.1:3040`. The result is
    that `deploy` and `wallet topup` silently talk to whatever is already on `3040` instead of your
    own sequencer.
    :::

## Step 7: Deploy your program

1. Deploy all guest programs to the running sequencer:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold deploy
    ```

    - After each successful submission, `logos-scaffold` prints `program_id: <hex>`, the RISC0 image ID computed locally from the submitted ELF. It prints `program_id: unavailable` if the project's `spel` binary has not been built yet. The example runner scripts in [Step 8](#step-8-interact-with-your-program) load the program from its embedded ELF, so you do not need to copy a `program_id` to complete this guide.
    - `deploy` checks that the sequencer is reachable before submitting, and stops with a hint if it is not. It submits one program per block, so deploying the five sample programs takes about a minute.

    :::info
    `deploy` confirms submission, not inclusion. Redeploying a program that is already on the sequencer still reports `submitted`, while the sequencer skips the transaction and logs `ProgramAlreadyExists`, which you can see with `logos-scaffold localnet logs`.
    :::

1. To deploy a specific program by name:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold deploy hello_world
    ```

## Step 8: Interact with your program

Use the project-local wallet CLI to submit transactions to your deployed program. The wallet is available at `logos-scaffold wallet`.

1. With the sequencer from [Step 6](#step-6-start-a-local-sequencer) running, top up the default wallet from the faucet, then list your accounts (`wallet list` shows accounts, not a balance):

    ```bash
    logos-scaffold wallet topup
    logos-scaffold wallet list
    ```

    `topup` initialises the account first if it is new, then claims from the Piñata faucet. To confirm the wallet can reach the sequencer, run `logos-scaffold wallet -- check-health`. Everything after `--` goes to the project's wallet binary unchanged.

1. Create a fresh public account for the program to claim. `hello_world` only writes to an account that is uninitialised or already owned by the program, so the topped-up default account does not work:

    ```bash
    logos-scaffold wallet -- account new public
    ```

    The output includes `account_id Public/<ID>`. Pass the part after `Public/` to the runner.

1. Run one of the example runner scripts that submit transactions to your program:

    ```bash
    export NSSA_WALLET_HOME_DIR="$(pwd)/.scaffold/wallet"
    export LEE_WALLET_HOME_DIR="$(pwd)/.scaffold/wallet"
    RISC0_DEV_MODE=1 cargo run --bin run_hello_world -- <ID>
    ```

    The LEZ `v0.1.2` wallet that scaffold pins by default reads `NSSA_WALLET_HOME_DIR`, and LEZ v0.2.0 and later read `LEE_WALLET_HOME_DIR`. Exporting both keeps the runner working on either pin.

    The runner prints the transaction hash. Once the next block is produced, the account holds the greeting `Hola mundo!`, hex-encoded in `data`:

    ```bash
    logos-scaffold wallet -- account get --account-id Public/<ID>
    ```

    ```json
    {"balance":0,"program_owner":"...","data":"486f6c61206d756e646f21","nonce":1}
    ```

    The runner scripts in `src/bin/` demonstrate how to construct and sign a `PublicTransaction`, set the `program_id`, encode an instruction, and submit the transaction via the sequencer RPC.

## Use `logos-scaffold run` for the inner loop

Steps 5 to 8 are often repeated when working on developing an LEZ program. `logos-scaffold run` chains them into one command, and works with no configuration:

```bash
RISC0_DEV_MODE=1 logos-scaffold run
```

It runs these steps in order, printing progress for each:

1. **Build**, which chains `setup` internally.
1. **Build the IDL**, a no-op for projects that are not built on the `lez-framework` template.
1. **Start localnet**, or reuse the one already running.
1. **Top up** the default wallet.
1. **Deploy**, skipped when the guest binaries, IDL, config, and sequencer are all unchanged since the last `run`. A manual `logos-scaffold deploy` does not count, so the first `run` deploys again.
1. **Run `post_deploy` hooks**, if the project configures any.

Useful flags:

| Flag | Effect |
|:---|:---|
| `--profile NAME` | Select a named pipeline from `[run.profiles.<name>]`. |
| `--reset` / `--no-reset` | Wipe sequencer state and wallet and re-seed before the run, or override a config-set default. |
| `--post-deploy <cmd>` | Replace the configured hooks for this run. Repeatable. |
| `--no-post-deploy` | Skip hooks entirely. |
| `--watch` | Re-run the pipeline when files change. |

Configure the loop in `scaffold.toml`:

```toml
[run]
post_deploy = ["cargo run --bin run_hello_world -- <ID>"]

[run.profiles.demo]
topup = false
deploy = false
post_deploy = ["scripts/demo.sh"]
```

- `topup = false` suits a project that funds its own accounts, and `deploy = false` one that deploys from a hook. Both default to `true`.

:::warning
A named profile is used as-is: selecting one shadows the inline `[run]` values instead of inheriting them. A key the profile does not state falls back to its own default, not to your `[run]` value. Set every key you need in each profile.
:::

Hooks run through `sh -c` from the project root with these variables set:

| Variable | Value |
|:---|:---|
| `SEQUENCER_URL` | The localnet RPC URL. |
| `NSSA_WALLET_HOME_DIR`, `LEE_WALLET_HOME_DIR` | The project wallet directory, under both the name LEZ `v0.1.2` reads and the one v0.2.0 and later read. |
| `SCAFFOLD_PROJECT_ROOT`, `SCAFFOLD_IDL_DIR` | Absolute paths to the project root and the IDL output directory. |
| `SCAFFOLD_TOPUP_SKIPPED`, `SCAFFOLD_DEPLOY_SKIPPED` | `1` or `0`. Always set, so branch on the value rather than on whether the variable exists. |
| `SCAFFOLD_PROGRAM_ID`, `SCAFFOLD_GUEST_BIN` | The deployed program's image ID and guest binary. Set only when the project has exactly one deployable program, so a multi-program project fails loudly instead of picking the wrong one. |

`run` covers the deploy loop only. It does not run any `basecamp` command; for that side of scaffold see [Develop a Logos module with Logos Scaffold](../../scaffold/get-started/develop-a-logos-module-with-logos-scaffold.md).

## Deploy to the testnet

:::warning
`logos-scaffold` 0.4.0 cannot deploy to the current LEZ public testnet. Use the local sequencer from this guide.
:::

The public testnet runs a newer LEZ release than the `v0.1.2` that scaffold 0.4.0 pins by default. Pointing the project wallet at `https://testnet.lez.logos.co/` fails the compatibility check: `logos-scaffold wallet -- check-health` stops with `Local ID for authenticated transfer program is different from remote`, and `logos-scaffold doctor` reports the wallet as unusable.

To deploy to the testnet today, set up a standalone wallet as described in [Run an LEZ wallet via the CLI](../get-started/run-lez-wallet-via-cli.md), built from the LEZ release the testnet runs, and use its `deploy-program` command with a guest program built against that same release. Check the wallet with `wallet check-health` first: at the time of writing, a wallet built from LEZ `v0.2.4` passes against the testnet and one built from `v0.2.1` does not.

Add `--json` to `deploy` for machine-readable output. `--program-path … --json` prints one program object; the discovery path prints `{"deploys": [...]}` with an object per program.

## Related documentation

- [About Logos Scaffold](../../scaffold/about-logos-scaffold.md)
- [Develop a Logos module with Logos Scaffold](../../scaffold/get-started/develop-a-logos-module-with-logos-scaffold.md)
- [Troubleshoot Logos module development with Basecamp](../../scaffold/troubleshooting/troubleshoot-logos-module-development-with-basecamp.md)
- [Run the LEZ wallet via CLI](../get-started/run-lez-wallet-via-cli.md)
- [Scaffold command reference](https://github.com/logos-co/scaffold/blob/master/docs/commands.md) and [`scaffold.toml` run configuration](https://github.com/logos-co/scaffold/blob/master/docs/configuration.md) in the scaffold repository
