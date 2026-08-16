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

#### Use `logos-scaffold` to create, build, and deploy a guest program on the Logos Execution Zone testnet.

[`logos-scaffold`](https://github.com/logos-co/scaffold) is a project scaffold and CLI tool that manages the full lifecycle of a [LEZ](../../get-started/glossary.md#lez) guest [program](../../get-started/glossary.md#program) — from project creation to deployment. It pins LEZ and SPEL dependencies, builds a project-local sequencer, and handles wallet interactions, so you can focus on writing your program logic.

This guide walks each stage separately so you can see what the tool does. Once the pieces are familiar, [`logos-scaffold run`](#use-logos-scaffold-run-for-the-inner-loop) chains them into a single command. For what else scaffold manages, including Basecamp modules, see [About Logos Scaffold](../../scaffold/about-logos-scaffold.md).

:::info[Prerequisites]

- A supported OS:
    - Linux: x86_64
    - macOS
- An [LEZ CLI wallet](../get-started/run-lez-wallet-via-cli.md) set up and funded.
- [Docker](https://docs.docker.com/get-docker/) or Podman installed.
- The [RISC Zero toolchain](https://dev.risczero.com/api/zkvm/install).
    - To install, run `rzup install rust`
- **Nix** with flakes enabled. Install from [nixos.org](https://nixos.org/download.html), then enable flakes:

    ```bash
    mkdir -p ~/.config/nix
    echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
    ```
:::

## What to expect

- You can create a new LEZ program project with logos-scaffold.
- You can write a guest program that runs inside the RISC0 zkVM.
- You can build and deploy your program to the LEZ testnet.
- You can interact with your deployed program using the wallet CLI.

## Step 1: Install logos-scaffold

1. Clone the logos-scaffold repository and install the CLI:

    ```bash
    git clone https://github.com/logos-co/scaffold.git
    cd scaffold
    cargo install --path .
    ```

    This installs two binaries on your PATH: `logos-scaffold` and the shorter alias `lgs`. They are functionally identical.

2. Verify the installation:

    ```bash
    logos-scaffold --version
    ```

## Step 2: Create a new project

1. Create a new LEZ program project. Replace `my-program` with your project name:

    ```bash
    logos-scaffold new my-program
    cd my-program
    ```

    This generates a project with the default template, which includes a sample guest program and runner scripts.

2. Inspect the project layout:

    ```text
    my-program/
    ├── scaffold.toml          # Project configuration and dependency pins
    ├── methods/
    │   └── guest/
    │       └── src/bin/       # Guest programs run inside the RISC0 zkVM
    ├── src/
    │   └── bin/               # Runner scripts that submit transactions
    └── .scaffold/             # Local state, wallet home, and build artifacts
    ```

## Step 3: Set up the project

1. Run `setup` to sync the LEZ and SPEL repositories to their pinned commits, build the project-local sequencer and wallet binaries, and seed the default wallet:

    ```bash
    logos-scaffold setup
    ```

    This step can take several minutes on a cold cache as it builds the sequencer from source.

    How the default wallet is seeded depends on the pinned LEZ version. When the pinned debug wallet config ships preconfigured public accounts, `setup` adopts the first one, which is deterministic. LEZ v0.2.0 ships none, so `setup` instead runs the wallet CLI once, which creates the wallet storage and generates fresh key material. Either way the resulting address is recorded in `.scaffold/state/wallet.state` as the default top-up destination.

    :::warning
    Scaffold unlocks that wallet with a deterministic local password so the onboarding flow needs no prompts. To use your own, export it **before the first `setup`** (or the first `run`, which chains `setup`):

    ```bash
    export LOGOS_SCAFFOLD_WALLET_PASSWORD='<your-local-dev-password>'
    ```

    If the storage was already created under the default password, export the override and re-seed with `logos-scaffold run --reset`. These are development-only keys — never use them for real funds.
    :::

## Step 4: Write your guest program

Guest programs run inside the [RISC0 zkVM](https://dev.risczero.com/) and define the on-chain logic of your LEZ program. Each guest program in `methods/guest/src/bin/` becomes a deployable program with its own `program_id`.

1. Open the sample guest program:

    ```bash
    $EDITOR methods/guest/src/bin/hello_world.rs
    ```

1. The program receives a `ProgramInput` struct via the zkVM environment, applies your logic, and writes a `ProgramOutput` struct to the journal. The sequencer verifies the proof and updates the on-chain [account](../../get-started/glossary.md#account) state.

    Key concepts:
    - **Instructions** are encoded as `Vec<u8>` (opcode byte followed by payload).
    - **Account data** is stored in `AccountWithMetadata` structs.
    - Use `RISC0_DEV_MODE=1` during development to skip ZK proof generation for faster iteration.

## Step 5: Build the project

1. Build the workspace. In development, use `RISC0_DEV_MODE=1` to skip proof generation:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold build
    ```

    The build compiles your guest programs and produces `.bin` artifacts under `target/riscv-guest/…/riscv32im-risc0-zkvm-elf/release/`.

## Step 6: Start a local sequencer

1. Start a project-local sequencer to test your program before deploying to the testnet:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold localnet start
    ```

    The sequencer is daemonised and survives terminal or tmux session closure. Use `logos-scaffold localnet status` to check that it is running and `logos-scaffold localnet stop` to stop it.

## Step 7: Deploy your program

1. Deploy all guest programs to the running sequencer:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold deploy
    ```

    After a successful deployment, `logos-scaffold` prints a per-program summary; when the vendored `spel` tooling is available it also prints a `program_id` — a hex-encoded RISC0 image ID computed from the submitted ELF. The example runner scripts in Step 8 load the program from its embedded ELF, so you do not need to copy a `program_id` to complete this guide.

1. To deploy a specific program by name:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold deploy hello_world
    ```

## Step 8: Interact with your program

Use the project-local wallet CLI to submit transactions to your deployed program. The wallet is available at `logos-scaffold wallet`.

1. With the sequencer from Step 6 running, top up the default wallet from the faucet, then list your accounts (`wallet list` shows accounts, not a balance):

    ```bash
    logos-scaffold wallet topup
    logos-scaffold wallet list
    ```

1. Run one of the example runner scripts that submit transactions to your program:

    ```bash
    export NSSA_WALLET_HOME_DIR="$(pwd)/.scaffold/wallet"
    export LEE_WALLET_HOME_DIR="$(pwd)/.scaffold/wallet"
    RISC0_DEV_MODE=1 cargo run --bin run_hello_world -- <PUBLIC_ACCOUNT_ID>
    ```

    Both variables point at the same directory. LEZ up to v0.1.2 reads `NSSA_WALLET_HOME_DIR`, and v0.2.0 reads `LEE_WALLET_HOME_DIR`; exporting both keeps the runner working on either pin. Scaffold sets both for `post_deploy` hooks, so this export is only needed when you run a binary yourself.

    The runner scripts in `src/bin/` demonstrate how to construct and sign a `PublicTransaction`, set the `program_id`, encode an instruction, and submit the transaction via the sequencer RPC.

## Use `logos-scaffold run` for the inner loop

Steps 5 to 8 are the cycle you repeat all day. `logos-scaffold run` chains them into one command, and works with no configuration:

```bash
RISC0_DEV_MODE=1 logos-scaffold run
```

It runs these steps in order, printing progress for each:

1. **Build**, which chains `setup` internally.
1. **Build the IDL**, a no-op for projects that are not built on the `lez-framework` template.
1. **Start localnet**, or reuse the one already running.
1. **Top up** the default wallet.
1. **Deploy**, skipped when the guest binaries, IDL, config, and sequencer are all unchanged since the last deploy.
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
post_deploy = ["cargo run --bin run_hello_world"]

[run.profiles.demo]
topup = false
deploy = false
post_deploy = ["scripts/demo.sh"]
```

`topup = false` suits a project that funds its own accounts, and `deploy = false` one that deploys from a hook. Both default to `true`.

:::warning
A named profile is used as-is: selecting one shadows the inline `[run]` values instead of inheriting them. A key the profile does not state falls back to its own default, not to your `[run]` value. Set every key you need in each profile.
:::

Hooks run through `sh -c` from the project root with these variables set:

| Variable | Value |
|:---|:---|
| `SEQUENCER_URL` | The localnet RPC URL. |
| `NSSA_WALLET_HOME_DIR`, `LEE_WALLET_HOME_DIR` | The project wallet directory, under both the name LEZ v0.1.2 reads and the one v0.2.0 reads. |
| `SCAFFOLD_PROJECT_ROOT`, `SCAFFOLD_IDL_DIR` | Absolute paths to the project root and the IDL output directory. |
| `SCAFFOLD_TOPUP_SKIPPED`, `SCAFFOLD_DEPLOY_SKIPPED` | `1` or `0`. Always set, so branch on the value rather than on whether the variable exists. |
| `SCAFFOLD_PROGRAM_ID`, `SCAFFOLD_GUEST_BIN` | The deployed program's image ID and guest binary. Set only when the project has exactly one deployable program, so a multi-program project fails loudly instead of picking the wrong one. |

`run` covers the deploy loop only. It does not run any `basecamp` command; for that side of scaffold see [Develop a Logos module with Logos Scaffold](../../scaffold/get-started/develop-a-logos-module-with-logos-scaffold.md).

## Deploy to the testnet

To deploy to the LEZ public testnet instead of a local sequencer, ensure your wallet has test tokens (use `logos-scaffold wallet topup` to request from the faucet) and remove the `RISC0_DEV_MODE=1` prefix from the build and deploy commands. Full ZK proof generation can take significantly longer than dev mode.

```bash
logos-scaffold build
logos-scaffold deploy
```

Add `--json` to `deploy` for machine-readable output. `--program-path … --json` prints one program object; the discovery path prints `{"deploys": [...]}` with an object per program.

## Related documentation

- [About Logos Scaffold](../../scaffold/about-logos-scaffold.md)
- [Develop a Logos module with Logos Scaffold](../../scaffold/get-started/develop-a-logos-module-with-logos-scaffold.md)
- [Troubleshoot Logos module development with Basecamp](../../scaffold/troubleshooting/troubleshoot-logos-module-development-with-basecamp.md)
