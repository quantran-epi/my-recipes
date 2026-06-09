# Quick Task 260609-psd: Personal Sync Indicator Deploy

## Goal

Deploy the latest personal sync indicator change to the static `docs/` output.

## Tasks

1. Run the production build.
2. Copy generated build output into `docs/` while preserving `docs/manifest.json`.
3. Stage source and deployed docs output according to `docs/deployment.md`.
4. Commit deploy output if generated files changed, then push to remote.

## Verification

- `yarn build`
- Confirm `docs/manifest.json` is not overwritten by `build/manifest.json`.
- Confirm `git push` succeeds.
