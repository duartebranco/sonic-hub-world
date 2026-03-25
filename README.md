# Sonic Hub World

This is a 3D Sonic the Hedgehog hub world (based on the Sonic Jam's one) made with three.js

Still in development.

Being done for the [Introduction to Computer Graphics](https://www.ua.pt/en/uc/7930) class.

## Code Quality

This project uses **CodeQL**, **ESLint**, and **Prettier** to maintain code quality and consistency.

| Tool | Purpose |
|------|---------|
| [CodeQL](https://codeql.github.com/) | Security and semantic analysis via GitHub code scanning |
| [ESLint](https://eslint.org/) | JavaScript correctness and maintainability rules |
| [Prettier](https://prettier.io/) | Automatic code formatting |

### Running checks locally

Install dev dependencies once:

```bash
npm install
```

Then use the npm scripts:

```bash
npm run lint          # Check for ESLint issues
npm run lint:fix      # Auto-fix ESLint issues
npm run format        # Format all source files with Prettier
npm run format:check  # Verify formatting without writing changes
```

### CI enforcement

Two GitHub Actions workflows run automatically on every push and pull request:

- **CodeQL** (`.github/workflows/codeql.yml`) — performs deep security and quality analysis; also runs on a weekly schedule.
- **Code Quality** (`.github/workflows/quality.yml`) — runs ESLint and Prettier checks to catch lint errors and formatting drift before merging.
