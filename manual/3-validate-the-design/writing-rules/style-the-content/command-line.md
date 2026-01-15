# Command line

## Example

Inli

Provide an inline link to the command reference. A good place for that link is in the text that introduces the command or a series of steps.


## Format

- Use fenced code blocks (triple backticks) and language identifiers like `bash` and `sh` depending on what you are showing.
- Show the command and its output in separate code blocks.
- When showing multiple commands to be run in sequence, put them in the same code block if there's no output. Otherwise, separate them into different code blocks.
- When a line exceeds 60 characters, break it at a logical point, such as after a hyphen or question mark. Indent each continuation line by four spaces for readability and use the backslash (`\`) at the end of each line to indicate continuation. For example:

    ```shell
    gcloud ml-engine jobs submit training ${JOB_NAME} \
    --package-path=trainer \
    --module-name=trainer.task \
    --staging-bucket=gs://${BUCKET} \
    --job-dir=gs://${BUCKET}/${JOB_NAME} \
    --runtime-version=1.2 \
    --region=us-central1 \
    --config=config/config.yaml \
    -- \
    --data_dir=gs://${BUCKET}/data \
    --output_dir=gs://${BUCKET}/${JOB_NAME} \
    --train_steps=10000
    ```

## Arguments

- Use square brackets (`[ ]`) to indicate optional arguments.
- Use angle brackets (`< >`) to indicate required arguments.
- Use ellipses (`...`) to indicate that an argument can be repeated.
- Use a pipe (`|`) to indicate a choice between options.

- Refer to [placeholders](./placeholders.md) for guidance on using placeholders.



