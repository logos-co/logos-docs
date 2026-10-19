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
This document is accurate for `logos-scaffold` **0.4.0** built from `master` at commit `d4b15ff`, which pins LEZ **v0.1.2**. It deploys to a local sequencer only; see [Deploy to the testnet](#deploy-to-the-testnet).
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

    `rust` builds the guest programs. `cargo-risczero` provides `r0vm`, which the sequencer needs to execute transactions, and it must be the version LEZ `v0.1.2` pins, `3.0.5`: scaffold only looks for that version, under `~/.risc0/extensions/`. Without it, `localnet start` still reports `localnet ready`, with a warning about `RISC0_SERVER_PATH`, and `deploy` then fails. If you installed `rzup` with a custom `RISC0_HOME`, export `RISC0_SERVER_PATH` with the full path to that `r0vm`.
- [Docker](https://docs.docker.com/get-docker/), with the daemon running. Scaffold builds guest programs inside the pinned `risczero/risc0-guest-builder` container by default, so that a `program_id` is the same on every machine. Without Docker, opt out as described in [Step 5](#step-5-build-the-project).
- About 5 GB of free disk space for the pinned LEZ and `spel` builds.

Nix is not needed for this guide, only for scaffold's `basecamp` commands. If it is not installed, `logos-scaffold doctor` reports a `tool nix` warning that you can ignore.
:::

## What to expect

- You can create an LEZ program project and write a guest program that runs inside the RISC0 zkVM.
- You can build your program and deploy it to a project-local LEZ sequencer.
- You can call your deployed program and repeat the whole loop with one command.

## Step 1: Install logos-scaffold

1. Install the CLI from the scaffold repository, pinned to the commit this guide was tested with:

    ```bash
    cargo install --locked --git https://github.com/logos-co/scaffold --rev d4b15ff logos-scaffold
    ```

    This installs two binaries on your PATH: `logos-scaffold` and the shorter alias `lgs`. They are functionally identical. The `logos-scaffold` 0.4.0 release on [crates.io](https://crates.io/crates/logos-scaffold) predates the Docker guest build in [Step 5](#step-5-build-the-project), so `cargo install logos-scaffold` gives you a CLI without `--guest` and with guest artifacts in a different place.

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

    At this point expect three `WARN` rows about the sequencer, because the localnet is not running yet. [Step 6](#step-6-start-a-local-sequencer) clears them. A `FAIL` on the `guest build` row means `docker` or `cargo-risczero` is not on your `PATH`; see [Step 5](#step-5-build-the-project).

## Step 4: Write your guest program

Guest programs run inside the [RISC0 zkVM](https://dev.risczero.com/) and define the on-chain logic of your LEZ program. Each guest program in `methods/guest/src/bin/` becomes a deployable program with its own `program_id`.

1. Open the sample guest program:

    ```bash
    $EDITOR methods/guest/src/bin/hello_world.rs
    ```

1. Read how the program works. It receives a `ProgramInput` struct via the zkVM environment, applies your logic, and writes a `ProgramOutput` struct to the journal. The sequencer verifies the proof and updates the on-chain [account](../../get-started/glossary.md#account) state.

    Key concepts:
    - **Instructions** are passed as bytes. `hello_world` takes its instruction as a raw `Vec<u8>` and appends it to the account's data.
    - **Account data** is stored in `AccountWithMetadata` structs.
    - Use `RISC0_DEV_MODE=1` during development to skip ZK proof generation for faster iteration.

## Step 5: Build the project

1. Build the workspace. In development, use `RISC0_DEV_MODE=1` to skip proof generation:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold build
    ```

    The build compiles the workspace, then builds each guest program inside the pinned `risczero/risc0-guest-builder` Docker image and writes the `.bin` artifacts to `target/riscv-guest-docker/riscv32im-risc0-zkvm-elf/docker/`. The same source then produces the same bytes, and therefore the same `program_id`, on any machine. The first build takes several minutes.

    If the Docker daemon is not running, `build` stops straight away:

    ```text
    error: [build].guest = "docker" needs a running Docker daemon; `docker info` failed.
    ```

1. To build without Docker, use the host RISC Zero toolchain instead. For one build, pass `--guest local`:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold build --guest local
    ```

    To make it the project default, which [`logos-scaffold run`](#use-logos-scaffold-run-for-the-inner-loop) needs because it has no `--guest` flag, add this to `scaffold.toml`:

    ```toml
    [build]
    guest = "local"
    ```

    A local build writes the artifacts to `target/riscv-guest/…/riscv32im-risc0-zkvm-elf/release/` instead. Its `program_id` depends on your host's Rust and clang versions, so it can differ from the one another machine builds from the same source. Each `build` removes the other mode's artifacts, so `deploy` always ships the output of the last `build`. `logos-scaffold doctor` shows the active mode in its `guest build` row.

## Step 6: Start a local sequencer

1. Start a project-local sequencer to deploy your program to:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold localnet start
    ```

    `start` returns once the sequencer process is alive and its RPC port answers. The sequencer is daemonised and survives terminal or tmux session closure. Use `logos-scaffold localnet status` to check that it is running and `logos-scaffold localnet stop` to stop it.

    :::warning
    The local sequencer always uses port `3040`. If something else already listens there, such as another scaffold project's sequencer, `localnet start` fails with `Address already in use (os error 98)`, and `localnet status` reports `ownership: foreign`. Stop the other process first. Changing `port` under `[localnet]` in `scaffold.toml` does not help: the sequencer still binds `3040` and the wallet keeps pointing at it, so `deploy` and `wallet topup` would talk to the other sequencer.

    For any other failure, read the sequencer log with `logos-scaffold localnet logs --tail 200`. To wipe chain state and start over, run `logos-scaffold localnet reset --yes`.
    :::

## Step 7: Deploy your program

1. Deploy all guest programs to the running sequencer:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold deploy
    ```

    - After each successful submission, `logos-scaffold` prints `program_id: <hex>`, the RISC0 image ID computed locally from the submitted ELF. It prints `program_id: unavailable` if the project's `spel` binary has not been built yet. The example runner scripts in [Step 8](#step-8-interact-with-your-program) load the program from its embedded ELF, so you do not need to copy a `program_id` to complete this guide.
    - `deploy` checks that the sequencer is reachable before submitting, and stops with a hint if it is not. It submits one program per block, so deploying the five sample programs takes about a minute.
    - Add `--json` for machine-readable output: one object per program under `{"deploys": [...]}`, or a single object with `--program-path … --json`.

    :::info
    `deploy` confirms submission, not inclusion. Redeploying a program that is already on the sequencer still reports `submitted`, while the sequencer skips the transaction and logs `ProgramAlreadyExists`, which you can see with `logos-scaffold localnet logs`.
    :::

1. To deploy a specific program by name:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold deploy hello_world
    ```

## Step 8: Interact with your program

Use the project-local wallet CLI to submit transactions to your deployed program. The wallet is available at `logos-scaffold wallet`.

1. With the sequencer from Step 6 running, top up the default wallet on your local network, then list your accounts (`wallet list` shows accounts, not a balance):

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
| `SCAFFOLD_PROGRAMS` | Space-separated names of the project's deployable programs. |
| `SCAFFOLD_PROGRAM_ID`, `SCAFFOLD_GUEST_BIN` | The deployed program's image ID and guest binary. Set only when the project has exactly one deployable program, so a multi-program project fails loudly instead of picking the wrong one. |

`run` covers the deploy loop only. It does not run any `basecamp` command; for that side of scaffold see [Develop a Logos module with Logos Scaffold](../../scaffold/get-started/develop-a-logos-module-with-logos-scaffold.md).

## Deploy to the testnet

:::warning
`logos-scaffold` cannot deploy to the current LEZ public testnet. Use the local sequencer from this guide.
:::

The public testnet runs LEZ v0.3, and scaffold pins `v0.1.2` by default. Pointing the project wallet at `https://testnet.lez.logos.co/` fails the compatibility check: `logos-scaffold wallet -- check-health` panics with `Missing authenticated transfer ID from remote`, and `logos-scaffold doctor` reports `FAIL | wallet usability`.

To deploy to the testnet today, set up a standalone wallet as described in [Run an LEZ wallet via the CLI](../get-started/run-lez-wallet-via-cli.md), built from the LEZ release the testnet runs, and use its `deploy-program` command with a guest program built against that same release. Check the wallet with `wallet check-health` first: at the time of writing, a wallet built from LEZ `v0.3.1` passes against the testnet and one built from scaffold's `v0.1.2` pin does not.

## Related documentation

- [About Logos Scaffold](../../scaffold/about-logos-scaffold.md)
- [Develop a Logos module with Logos Scaffold](../../scaffold/get-started/develop-a-logos-module-with-logos-scaffold.md)
- [Troubleshoot Logos module development with Basecamp](../../scaffold/troubleshooting/troubleshoot-logos-module-development-with-basecamp.md)
- [Run the LEZ wallet via CLI](../get-started/run-lez-wallet-via-cli.md)
- [Scaffold command reference](https://github.com/logos-co/scaffold/blob/master/docs/commands.md) and [`scaffold.toml` run configuration](https://github.com/logos-co/scaffold/blob/master/docs/configuration.md) in the scaffold repository
