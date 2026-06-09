# Quick Task 260609-qua: Deploy app

## Goal

Deploy the current app build to the static `docs/` output following `docs/deployment.md`.

## Tasks

1. Run `yarn build`.
2. Copy generated `build/` output into `docs/` while preserving `docs/manifest.json` and excluding `build/manifest.json`.
3. Stage `src` and `docs`, commit the deploy output plus GSD artifacts, and push to remote.

## Verification

- `yarn build` passes.
- `docs/manifest.json` remains unchanged after the copy.
