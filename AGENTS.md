# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains no application code, dependencies, tests, or build configuration. Keep this guide aligned with the actual implementation as the project develops.

When adding the initial implementation, use a simple, documented layout:

- `src/` for application code, grouped by responsibility.
- `tests/` for automated tests that mirror source modules.
- `assets/` for static images and other bundled resources.
- `README.md` for setup instructions, architecture, and usage.

Create directories only when they contain useful files. Document any different layout in this guide.

## Build, Test, and Development Commands

No build, test, lint, or development commands are configured yet. Do not assume commands such as `npm test` or `npm run build` are available.

When introducing tooling, add executable scripts to the chosen build configuration and document their exact commands in `README.md`. Include installation steps, required runtime versions, local startup instructions, and verification commands. Commit the appropriate dependency lockfile.

## Coding Style & Naming Conventions

Follow the formatter and language conventions established by the first implementation. Until tooling is configured, keep indentation consistent within each file, use descriptive identifiers, and avoid unrelated formatting changes.

Prefer filenames that describe a module's responsibility. Add formatter and linter configuration alongside the code that requires it; document how to run both.

## Testing Guidelines

No testing framework or coverage threshold is established. Add focused tests for new behavior and regression tests for bug fixes once a test runner is selected. Use descriptive test names that state the expected outcome, and document the test file naming pattern and execution command.

## Commit & Pull Request Guidelines

This directory has no Git history, so no existing commit convention can be inferred. Use concise, imperative commit subjects, such as `Add translation settings`, and keep commits focused.

Pull requests should explain the change, its purpose, and verification performed. Link related issues when available, include screenshots for visible interface changes, and disclose any checks that could not run.

## Security & Configuration

Never commit credentials, access tokens, or personal data. Document required configuration using examples with placeholder values, and exclude local secrets and generated artifacts through `.gitignore` when introduced.
