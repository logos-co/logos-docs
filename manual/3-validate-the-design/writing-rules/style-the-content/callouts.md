# Callouts

## Format

Logos documentation uses four types of callouts. Follow the format of these examples:

> [!NOTE]  
> This project reads the configuration from `config.toml`.

> [!TIP]
> You can use the `--dry-run` flag to preview the changes without modifying any files.

> [!IMPORTANT]  
> Restart the service after you update `config.toml` to apply your changes.

> [!CAUTION]
> This command permanently deletes the database. Back up your data before you continue.

## Rules

- Use different callouts for different purposes:

    | Callout       | Description |
    |:--------------|:------------|
    | **Tip**       | Helpful information that is not required for the task. |
    | **Note**      | Relevant information for completing the task, but does not affect the user's actions. |
    | **Important** | Information that may impact the user's actions or decisions about completing the task. |
    | **Caution**   | Information on actions that can potentially result in data corruption or data loss. |

- Don't use *warning*, *error*, *danger*, *bug*, *important*, or *info*.
- In procedural steps, place the callout after the procedure. If you need a callout for a specific step, write the callout after the step.
- For other content, add the callout after the relevant information.
