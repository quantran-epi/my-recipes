# Quick Task 260609-smh: Scheduled Meal Header Deploy

## Goal

Deploy the scheduled meal polish and blended page header update to the static `docs/` output.

## Tasks

1. Run the production build.
2. Copy generated build output into `docs/` while preserving `docs/manifest.json`.
3. Stage source and deployed docs output according to `docs/deployment.md`.
4. Commit deploy output if generated files changed, then push to remote.

## Verification

- `yarn build`
- Confirm `docs/manifest.json` is not overwritten by `build/manifest.json`.
- Confirm `git push` succeeds.
