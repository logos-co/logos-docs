# Placeholders

## Example

Create a new topic branch and give the branch a name. Replace `BRANCH-NAME` with a short descriptive name for your branch (for example: `fix-sync-bug`).

    ```bash
    git checkout -b BRANCH-NAME
    ```

## Formatting

- Use a descriptive word or phrase to indicate what type of value is in that position. 
- Use uppercase for placeholders.
- Connect the words in a placeholder with dashes (kebab-case).
- Don't use angle brackets (< >) around placeholders.
- Don't use bold or italics for placeholders.
- When mentioning placeholders text, use backticks. For example `BRANCH-NAME`.

    | Usage | Example |
    |:---|:---|
    | **Correct** | git checkout -b BRANCH-NAME |
    | Incorrect   | git checkout -b BRANCH_NAME |
    | Incorrect   | git checkout -b <branch-name> |
    | Incorrect   | git checkout -b _BRANCH_NAME_ |

## Usage

- When mentioning a placeholder the first time, describe what the placeholder represents and the expected replacement value.
