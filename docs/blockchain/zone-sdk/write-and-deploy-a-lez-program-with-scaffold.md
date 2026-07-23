---
title: Write and deploy a LEZ program with logos-scaffold
doc_type: procedure
product: blockchain
topics:
  - lez
  - scaffold
steps_layout: sectioned
authors: ygd58
owner: logos
doc_version: 1
slug: write-and-deploy-a-lez-program-with-scaffold
sidebar_position: 4
---

# Write and deploy a LEZ program with logos-scaffold

#### Use logos-scaffold to create, build, and deploy a guest program on the Logos Execution Zone testnet.

[logos-scaffold](https://github.com/logos-co/scaffold) is a project scaffold and CLI tool that manages the full lifecycle of a LEZ guest program — from project creation to deployment. It pins LEZ and SPEL dependencies, builds a project-local sequencer, and handles wallet interactions, so you can focus on writing your program logic.

Before you begin, ensure you have:

- Linux x86\_64 or macOS
- Rust and Cargo (latest stable)
- Node.js v20 or later
- A running Logos Blockchain node connected to the public testnet (see [Run a Logos Blockchain node from the CLI](../get-started/run-a-logos-blockchain-node-from-cli.md))

## What to expect

- You can create a new LEZ program project with logos-scaffold.
- You can write a guest program that runs inside the RISC0 zkVM.
- You can build and deploy your program to the LEZ testnet.
- You can interact with your deployed program using the wallet CLI.

## Step 1: Install logos-scaffold

1. Download and install the latest `logos-scaffold` binary:

    ```bash
    curl -fsSL https://raw.githubusercontent.com/logos-co/scaffold/master/install.sh | sh
    export PATH="$HOME/.logos-scaffold/bin:$PATH"
    ```

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

## Step 4: Write your guest program

Guest programs run inside the [RISC0 zkVM](https://dev.risczero.com/) and define the on-chain logic of your LEZ program. Each guest program in `methods/guest/src/bin/` becomes a deployable program with its own `program_id`.

1. Open the sample guest program:

    ```bash
    $EDITOR methods/guest/src/bin/hello_world.rs
    ```

2. The program receives an `Input` struct via the zkVM environment, applies your logic, and writes an `Output` struct to the journal. The sequencer verifies the proof and updates the on-chain account state.

    Key concepts:
    - **Instructions** are encoded as `Vec<u8>` (opcode byte followed by payload).
    - **Account data** is stored in `AccountWithMetadata` structs.
    - Use `RISC0_DEV_MODE=1` during development to skip ZK proof generation for faster iteration.

## Step 5: Build the project

1. Build the workspace. In development, use `RISC0_DEV_MODE=1` to skip proof generation:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold build
    ```

    The build compiles your guest programs and produces `.bin` artifacts under `.scaffold/`.

## Step 6: Start a local sequencer

1. Start a project-local sequencer to test your program before deploying to the testnet:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold localnet start
    ```

    The sequencer is daemonized and survives terminal or tmux session closure. Use `logos-scaffold localnet status` to check that it is running and `logos-scaffold localnet stop` to stop it.

## Step 7: Deploy your program

1. Deploy all guest programs to the running sequencer:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold deploy
    ```

    After a successful deployment, `logos-scaffold` prints the `program_id` for each guest program — a hex-encoded RISC0 image ID computed from the submitted ELF. Save the `program_id`; you need it to interact with your program.

2. To deploy a specific program by name:

    ```bash
    RISC0_DEV_MODE=1 logos-scaffold deploy hello_world
    ```

## Step 8: Interact with your program

Use the project-local wallet CLI to submit transactions to your deployed program. The wallet is available at `logos-scaffold wallet`.

1. Check your wallet balance:

    ```bash
    logos-scaffold wallet topup
    logos-scaffold wallet list
    ```

2. Run one of the example runner scripts that submit transactions to your program:

    ```bash
    RISC0_DEV_MODE=1 cargo run --bin run_hello_world
    ```

    The runner scripts in `src/bin/` demonstrate how to construct and sign a `PublicTransaction`, set the `program_id`, encode an instruction, and submit the transaction via the sequencer RPC.

## Deploy to the testnet

To deploy to the LEZ public testnet instead of a local sequencer, ensure your wallet has test tokens (use `logos-scaffold wallet topup` to request from the faucet) and remove the `RISC0_DEV_MODE=1` prefix from the build and deploy commands. Full ZK proof generation can take significantly longer than dev mode.

```bash
logos-scaffold build
logos-scaffold deploy

