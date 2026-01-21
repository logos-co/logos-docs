# Contributing to Logos documentation

Thanks for contributing to Logos documentation! This guide explains how to propose changes and submit contributions.

> TL;DR: if you know how to create GitHub issues and pull requests, skip the [Contribute using a pull request](#contribute-using-a-pull-request) section.

## What to contribute

- Bug fixes: Fix typos, broken links, formatting issues, or outdated information.
- Updates: Update existing articles to reflect the latest information, features, or best practices.
- New articles: Write new articles to cover missing topics or expand existing content.

    > Refer to the [Logos technical documentation guide](./manual/README.md) for your writing workflow. Create new articles using [templates](./manual/2-populate-the-structure/templates/README.md). If you have doubts about how to write something, check the [writing rules](./manual/3-validate-the-design/writing-rules/README.md).

## How to contribute

You can contribute using GitHub issues or pull requests.

Consider these guidelines when creating issues or pull requests:

- In one issue or pull request, address only one document.
- If your pull request is related to an existing issue, [link the pull request to the issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue#manually-linking-a-pull-request-to-an-issue) on the GitHub website.
- Mention the document title in the issue and pull request title. An issue and its corresponding pull request must have the same title.

    | Usage   | Issue and pull request title                       |
    |:--------|:---------------------------------------------------|
    | Correct | Run a Logos base-layer node                             |
    | Correct | Fix typo in Track transactions through an LSSA explorer |

- Use the issue number and title as the branch name for the pull request. Separate words with dashes.

    | Usage    | Branch name                                             |
    |:---------|:--------------------------------------------------------|
    | Correct  | `1234-run-a-logos-base-layer-node`                             |
    | Correct  | `5678-fix-typo-in-track-transactions-through-an-lssa-explorer` |

- Use the `documentation` label for all issues and pull requests.
- Select `type` for issues.
  - Bug: for reporting bugs or typos.
  - Enhancement: for suggesting improvements or new features.
  - Task: for new documents.
- Include your issue in the [Logos docs](https://github.com/orgs/logos-co/projects/9) project board.

## File name rules

Your article's title determines the Markdown file name:

- Use the article's title in all-lowercase letters for the Markdown file name.
- Use a dash symbol ("-") to replace spaces.
- Don't exclude articles, prepositions, or any other word in the Markdown file name.
- If the name includes apostrophes, remove them from the Markdown file name.

    | Article name                          | Markdown file name                        |
    |:--------------------------------------|:------------------------------------------|
    | Do's and don'ts of node security      | `dos-and-donts-of-node-security.md`       |
    | FAQ: Build a dApp on Logos blockchain | `faq-build-a-dapp-on-logos-blockchain.md` |

## Contribute using a pull request

### 1. Fork and clone this repository

To understand how a repository fork works, see [About forks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-forks) in the GitHub documentation.

1. Using the terminal, go to the directory where you want to clone the Logos documentation repository.
1. Fork and clone the repository:

    ```sh
    gh repo fork 'logos-co/logos-docs' --remote --clone=true
    ```

### 2. Create a topic branch and make changes to your own branch

1. Update your local `main` branch:

    ```sh
    git checkout main
    git pull
    ```

1. Using the `main` branch, create a topic branch to include your changes:

    ```sh
    git checkout -b your-topic-branch-name main
    ```

1. Using the editor of your choice, write the required changes.

### 3. Commit and push your work to your own fork

1. Stage your changes:

    ```sh
    git add --all
    ```

1. Commit your changes with a description of what's included:

    ```sh
    git commit -m "description of your changes"
    ```

1. Set the `upstream` to push your changes:

    ```sh
    git push --set-upstream origin your-topic-branch-name
    ```

1. If you need to add more changes, you don't need to set the `upstream` branch again:

    ```sh
    git push
    ```

### 4. Submit your pull request

1. Create a pull request with your proposed changes:

    ```sh
    gh pr create --base main --title "your pull request title"
    ```

1. When asked for the **Body**, type `e` to launch the default terminal editor. Include a description of the proposed changes:

    `? Body [(e) to launch nano, enter to skip]`

    > You can also skip this step and add the pull request description using the GitHub webpage.

1. In the **What's next** question, select `Submit` to submit your pull request, or `Continue in browser` to finish your pull request in the GitHub website:

    ```bash
    ? What's next?  [Use arrows to move, type to filter]
    > **Submit**
      Continue in browser
      Add metadata
      Cancel
    ```

### 5. Review and merge

- We may ask for changes to be made before a PR can be merged, either using [suggested changes](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/incorporating-feedback-in-your-pull-request) or pull request comments.
- As you update your PR and apply changes, mark each conversation as [resolved](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/commenting-on-a-pull-request#resolving-conversations).
- Merge your pull request using **Squash and merge** on your pull request page.
