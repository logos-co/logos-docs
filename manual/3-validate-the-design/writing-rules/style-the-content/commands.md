# Commands

## Examples

- Referencing command in text: 

    The `adb devices` command lists connected devices.

- Command block showing one command:

    To transfer tokens from one public account to another, run the following command:

        ```sh
        wallet auth-transfer send \
            --from Public/SENDER-ACCOUNT-ID \
            --to Public/RECEIVER-ACCOUNT-ID \
            --amount TOKEN-AMOUNT
        ```
- Command block showing multiple commands run in sequence:

    From the local clone of the repository on a computer, run the following commands to update the name of the default branch:

        ```sh
        git branch -m OLD-BRANCH-NAME NEW-BRANCH-NAME
        git fetch origin
        git branch -u origin/NEW-BRANCH-NAME NEW-BRANCH-NAME
        git remote set-head origin -a
        ```
- Command block showing a command with output:

    Use the `adb devices` command to list connected devices:

        ```sh
        adb devices
        ```
    
    The output is similar to the following:

        ```text
        List of devices attached
        DEVICE-ID   device
        ```
## Format

- Include a brief description before each command or group of commands to explain their purpose. If there is a command reference, provide a link to it. Use a colon (:) at the end of the description.
- When referencing commands in text, wrap their full names in backticks, including any prefixes (for example, `gcloud compute instances create`).
- Use fenced code blocks (triple backticks) and language identifiers for command blocks.
- When a line exceeds 60 characters, break between flags or arguments. Indent each continuation line by four spaces for readability and use the backslash (`\`) at the end of each line to indicate continuation. For example:

    ```sh
    wallet auth-transfer send \
        --from Public/SENDER-ACCOUNT-ID \
        --to Public/RECEIVER-ACCOUNT-ID \
        --amount TOKEN-AMOUNT
    ```

- Group commands in one block only when they're a single logical step, and the reader should run them together. 
- Separate commands into multiple blocks when you need the reader to check the output between commands, or when they are to be executed in different environments.
- Don't use command prompts like `$`.

    | Usage | Example |
    |:---|:---|
    | **Correct** | `adb devices` |
    | Incorrect   | `$ adb devices` |

- Refer to [placeholders](./placeholders.md) for guidance on using placeholders.
- Refer to [Code examples](./code-examples.md) for guidance on writing code examples.

## Command output

- Add output only if it's necessary to understand the command's effect or if it contains important information.
- Use a separate fenced block for output with the `text` identifier. 
- Replace variable fields with [placeholders](./placeholders.md).
- Introduce the output with a sentence like "The command produces the following output:" or "The output is similar to the following:".
