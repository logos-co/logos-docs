---
title: Introduction to Logos SQL
doc_type: concept
product: blockchain
topics:
  - logos-sql
  - channels
authors: andrussal
owner: logos
doc_version: 1
slug: /blockchain/logos-sql
sidebar_position: 0
---

# Introduction to Logos SQL

#### Learn how applications share a database through Logos Blockchain while keeping a local copy of their data.

Logos SQL is a Rust library that gives an application a local SQLite database and synchronises its writes with other participants through Logos Blockchain. Applications create tables, submit SQL transactions and query their own database. The library handles replication.

It is useful when participants need shared data without relying on one organisation to host the database for everyone. Each participant maintains its own copy. Different applications can use the same data by following the same channel.

## State and history

There are two ways to describe a database: the data it contains now, and the writes that produced it. Logos SQL connects these two views:

- **Local SQLite holds the current data.** The application can query it without making a network request for each read.
- **Logos Blockchain carries the shared write history.** It determines the accepted writes and their order. Each participant applies that history to its own database.

The blockchain does not execute the SQL. Logos SQL runs it on each participant's machine and uses the [Zone SDK](../zone-sdk/inscribe-data-on-chain-using-zone-sdk.md) to publish and receive the shared history.

```text
Application A --> Logos SQL A <--> Local SQLite A
                       |
                       |
              Shared channel history
                 Logos Blockchain
                       |
                       |
Application B --> Logos SQL B <--> Local SQLite B
```

Both library instances follow the channel. Instances configured as writers can also publish to it.

## A channel identifies the database

A [channel](../../get-started/glossary.md#channel) is an ordered history of inscriptions on Logos Blockchain. Logos SQL uses these inscriptions to share SQL transactions between participants.

Instances using the same channel follow the same database history. Different channels have separate histories. The channel carries both schema changes, such as creating tables, and writes to the data in those tables.

A writer needs an authorised signing key and funding for inscription fees. A read-only instance follows the history without publishing. Channel permission controls who can submit writes; it does not provide separate SQL permissions for individual tables or rows.

## A write starts locally

An application prepares SQL statements and bound parameters, then calls `execute`.

1. Logos SQL runs the transaction against the local database. Its statements commit together or roll back together.
2. After saving the local changes and recovery information, it returns a transaction ID. The application can already read its changes.
3. The library publishes the write in the background. Other participants receive the channel history and apply it locally.
4. When the chain finalises that history, the write becomes part of the finalised database.

A successful `execute` means **committed locally**, not **finalised on the chain**. This keeps the application responsive while publication and agreement happen over the network.

After startup, applications can continue writing locally during a connection outage while there is room in the pending-write queue. If the queue fills, further writes return `PublishPending` without committing their changes. Saved writes remain available for publication when the connection returns, but changes in channel history can displace them. Starting an instance still requires a connection to catch up with channel history.

## Latest and finalised state

Logos SQL provides two local read connections:

| View | Contents | Use it for |
| --- | --- | --- |
| Latest | The most up-to-date local state, including writes that are not yet finalised. | Showing and working with recent changes. |
| Finalised | The database produced by finalised channel history. | Decisions that must use settled history. |

The latest state can include changes that are undone when the chain switches branches. Finalised history is not undone by those reorganisations, though later finalised writes can still update its rows.

Participants can temporarily see different data while writes are pending or they are catching up. Applying the same accepted history brings their replicas into agreement.

## Respond to changes in history

Two writers can compete for the next channel position, or a chain reorganisation can remove previously accepted writes. A local write may then lose its place in history even though its SQL succeeded.

Logos SQL updates the live database to match the current history. It reports affected local writes as **displaced** and blocks ordinary new writes until the application has considered them. The application can retry the original SQL, continue without retrying it, or prepare a different change.

The library does not automatically decide which action is appropriate. An old update might overwrite a newer value if repeated. A displaced write can also return if its branch becomes canonical again.

See [Handle displaced writes](handle-displaced-writes.md) for the application flow and examples of SQL conditions.

## Join later or restart

A new participant can build its database from channel history. Another application instance does not have to prepare and send a database export. `LogosSql::start` processes the initial history before returning.

Each participant keeps a separate persistent state directory. On restart, it resumes using that directory. Replication runs in the background for as long as the library is running.

## Before building

- **Protect sensitive data before submission.** Logos SQL does not encrypt application SQL or parameter values. Deleting a row does not erase the write from chain history.
- **Submit writes through Logos SQL.** Writes must go through the Logos SQL API to be shared with other participants. Changing the SQLite database directly does not publish those changes.
- **Plan for provisional results.** Use finalised reads where needed, and decide how the application responds to displaced writes.

Follow [Build an application with Logos SQL](replicate-a-database-with-logos-sql.md) to run the password-manager example, follow its writes between participants and review displaced writes.
