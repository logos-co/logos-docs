---
title: Handle displaced writes
doc_type: procedure
product: blockchain
topics:
  - logos-sql
  - channels
steps_layout: sectioned
authors: andrussal
owner: logos
doc_version: 1
slug: /blockchain/logos-sql/handle-displaced-writes
sidebar_position: 2
---

# Handle displaced writes

#### Find out why a write was blocked, review displaced writes and decide how to continue.

A write can succeed in your local database but later be removed: another writer may publish before it, or a blockchain reorganisation may replace the branch containing it. Logos SQL reports that write as displaced and blocks new writes until the application has reviewed it.

Review does not have to involve a user. An application can automatically retry writes designed to remain safe after other changes, or mark them handled if they are no longer needed. The [password-manager example](replicate-a-database-with-logos-sql.md) leaves retry decisions to the user.

The flow is: catch the blocked-write error, list the displaced writes, inspect the current data, then retry or continue without each write. The [password-manager guide](replicate-a-database-with-logos-sql.md) shows the terminal commands for this. This page explains the library calls behind them.

:::info[Prerequisites]

- A running `LogosSql` writer and access to its current database.
- An application write path that calls `execute` and handles its result.

:::

## What to expect

- You can identify local writes that need an application decision.
- You can retry a selected write or mark it handled without retrying it.
- You can keep the review correct when more displacements arrive in the meantime.

## Step 1: Recognise a blocked write

1. When submitting a transaction, handle `Error::UnhandledDisplacements` separately from other errors:

   ```rust
   use logos_sql::Error;

   match db.execute(transaction).await {
       Ok(tx_id) => println!("Committed locally as {tx_id}"),
       Err(Error::UnhandledDisplacements) => {
           println!("Earlier writes were displaced. Review them before continuing.");
       }
       Err(error) => return Err(error.into()),
   }
   ```

   This error means earlier writes need review. The new transaction has not run, and no changes from it were committed.

1. Pause ordinary submissions and show the review flow below. Reads still work, so the application can inspect what is in the database now.

## Step 2: Find out what was displaced

1. Fetch the writes awaiting review:

   ```rust
   let displacements = db.unhandled_displacements().await?;

   for displacement in &displacements {
       println!("{}: {:?}", displacement.tx_id, displacement.reason);
   }
   ```

   Each entry identifies one of this participant's writes by its transaction ID and gives the reason it was displaced.

   With multiple writers, another participant's writes can arrive while yours are still waiting to be published. A chain reorganisation can also remove accepted writes, even with only one writer. The reasons below distinguish writes removed from channel history from those removed while still waiting locally:

   | Reason | Meaning |
   | --- | --- |
   | `Orphaned` | The Zone SDK removed a previously tracked write from channel history, for example because a competing channel write replaced it. This can happen without a blockchain reorganisation. |
   | `PendingWriteInvalidated` | The write was still waiting locally to be published when other channel writes or a chain reorganisation changed the database it was based on. Logos SQL removed the local write rather than automatically applying it again to the changed data. |

   Neither reason means the SQL failed a constraint. Even writes to unrelated rows can compete for a channel position.

1. Use the transaction ID to identify the original operation, then read the current data. In the password manager, the user can use `show` or `list` before deciding what to do.

   If your application needs descriptions such as “changed the email password”, save that description with the transaction ID when preparing the original write. The builder exposes it through `transaction.tx_id()`. Save the association persistently if it must survive restart. Logos SQL already retains the SQL needed for a retry; the application does not need to store another copy.

1. Keep the returned `Displacement` value for the retry or handle call. It identifies the specific item you reviewed, so an old action cannot clear a newer displacement of the same write.

   A write that returns to live history or finalises no longer appears in the review list. Refresh the list before showing old review items after a long pause or restart.

## Step 3: Retry or continue without the write

Choose separately for each displaced write. The password manager asks the user; another application may have a policy for particular operations.

1. Compare the intended operation with the current data. Choose whether to retry its original SQL, leave it without a retry, or prepare a different change.

   For example, the password manager checks that the stored password still matches the encrypted value the application originally read:

   ```rust
   fn prepare_password_update(
       label: &str,
       password: &[u8],
       old_password: &[u8],
   ) -> TransactionBuilder {
       TransactionBuilder::new(
           "UPDATE credentials SET password = ?2
            WHERE label = ?1 AND password = ?3",
       )
       .bind(label)
       .bind(password)
       .bind(old_password)
   }
   ```

   Both parameters contain encrypted bytes. The application encrypts the replacement before preparing the SQL and keeps the original stored bytes for the condition. A retry reuses both values without encrypting them again.

   The condition and update execute together. Changes to notes or other entries do not affect this condition. If this entry's stored password is different, the statement changes no rows.

   SQLite considers zero matching rows successful. `execute` returns a transaction ID, not an affected-row count, so success alone does not tell the application whether this update changed the password.

1. Decide which operations the application can retry automatically. Their SQL conditions should express the assumptions that must still hold, and the application must decide what to do when those conditions fail.

   The password-manager example uses manual review as its policy. Logos SQL does not require a person to make this decision; applications can use the same retry and handle calls automatically where appropriate.

Once you have decided, use one of the following calls for the selected `displacement`.

### Option A—Retry the original SQL

1. Pass the selected entry to the retry method:

   ```rust
   use logos_sql::Error;

   match db.retry_displacement(&displacement).await {
       Ok(new_tx_id) => println!("Retry committed locally as {new_tx_id}"),
       Err(Error::StaleDisplacement) => {
           // A reorganisation may have made the branch containing this write
           // canonical again. Fetch the updated list before retrying.
       }
       Err(error) => return Err(error.into()),
   }
   ```

   A successful call executes the original SQL and parameters, creates a new transaction ID and marks the selected displacement handled. It is allowed while other displacements await review. Time and random functions are evaluated again for the new write.

   If the call fails or is interrupted, the retry may already have committed. Do not respond to every error by submitting the same operation again.

### Option B—Continue without retrying the original SQL

1. Mark the selected entry handled:

   ```rust
   db.mark_displacement_handled(displacement).await?;
   ```

   This records that the application has considered it. No replacement write is submitted. Once the remaining displacements are handled, the application may submit a different transaction based on the current data.

:::warning[Marking handled does not withdraw the write]
Marking a displacement handled clears the application's review item; it does not erase the write from the branch that contained it. If that branch becomes canonical again, Logos SQL rebuilds the database from its history and the write returns, even if the application chose not to retry it.
:::

## Step 4: Continue writing

1. Refresh `unhandled_displacements()` after handling the reviewed items. A newly arrived displacement still needs a decision even if you finished an earlier batch.

1. Re-read the data needed for subsequent writes and prepare them again where necessary. Coordinate this with other application tasks that submit writes.

   The write block belongs to the whole participant. Once the list is clear, it does not protect another task from submitting work prepared before the displacement.

1. Submit the next operation and continue to handle `Error::UnhandledDisplacements`. A new displacement can arrive between the list query and the write; the execution check will block that write if it does.

## Troubleshooting

### A reviewed item returns StaleDisplacement

The selected occurrence was handled, cleared or replaced before the retry. Refresh the list. Do not retry it through ordinary `execute` to bypass this check.

### Writes remain blocked after review

Check the current review list. Another displacement may have arrived while the application was reviewing earlier entries. Handling an earlier entry does not clear the new one.

### A handled write becomes live again

This can happen when the chain returns to a branch containing the original write. Use `write_status(tx_id)` and current database reads to update the application's view. Handling a displacement records a local decision, not a permanent chain outcome.
