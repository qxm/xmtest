# Continuous integration

`.github/workflows/ci.yml` runs on pushes, pull requests and manual dispatch after it is pushed to GitHub. It uses Ubuntu and Node 22 from `.nvmrc`, installs the lockfile with `npm ci`, runs `npm run check` and `npm run build`, and checks that the built MSW worker and preference bootstrap exist.

The workflow needs only `contents: read` and no custom secrets. It does not deploy or change branch protection. New runs cancel superseded runs for the same workflow/ref.

Local equivalents:

```sh
npm ci
npm run check
npm run build
```

PowerShell may use `npm.cmd` in place of `npm`. Vite and Vitest scripts now select `--configLoader runner` directly, so no extra flag is needed. This avoids the default configuration bundling path that encountered directory permissions in the development environment.

Validation so far: the YAML parses, expected triggers/permissions/commands were checked, and local check/build pass. The GitHub-hosted workflow itself must be verified after pushing; a local pass is not a remote CI result.

Official action references: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node).
