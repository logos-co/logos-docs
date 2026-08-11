# Logos Documentation

Source repository for the Logos documentation site, built with [Docusaurus](https://docusaurus.io/).

Read the documentation at [docs.logos.co](https://docs.logos.co/).

If you are looking for an introduction to the Logos project itself, see the [Logos website](https://logos.co/) for an overview or the [Get started](https://docs.logos.co/get-started/what-is-logos) section of the documentation for a deeper introduction.

## Repository structure

Documents about a single component live in that component's doc set. The persona-based paths are curated views that link to documents in the component doc sets while also including path-specific documents. To follow the path that matches your role, visit [docs.logos.co](https://docs.logos.co/).

Content is never duplicated between paths and component doc sets: a document lives in exactly one place and is linked from wherever else it is needed.

```
docs/
├── get-started/         # Project introduction and orientation
├── run-an-app/          # ┐
├── run-a-node/          # ├ Persona paths: indexes linking into the
├── build-an-app/        # ├ component doc sets, plus path-specific guides
├── contribute/          # ┘ 
├── basecamp/            # ┐
├── blockchain/          # | 
├── lez/                 # | 
├── core/                # ├ Component doc sets:
├── messaging/           # ├ documents about a single component
├── storage/             # | 
├── mixnet/              # | 
└── peer-discovery/      # ┘ 
```

The Logos ecosystem spans multiple GitHub organisations. If you are looking for a specific codebase rather than its documentation, see the [repository orientation](https://docs.logos.co/get-started/logos-ecosystem-repositories).

## Contributing

Documentation is maintained by the Logos docs team. New documents, doc sets, and structural changes are planned and created by Logos core contributors.

External contributions are welcome in the following forms:

- **Reviewing open pull requests.** Comments on accuracy, clarity, and completeness help verify content before it is merged.
- **Giving feedback on published content.** If you find a typo, an error, or a passage that is unclear or outdated, open an issue in this repository.

All changes should be made through pull requests instead of direct commits to `main`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Local development

Prerequisites: Node.js 20.0 or later.

```bash
git clone https://github.com/logos-co/logos-docs.git
cd logos-docs
npm install
npm start
```

`npm start` serves the site locally with hot reload at `http://localhost:3000`.

To create a production build:

```bash
npm run build
```
