# Quick Task 260610-ctw: Deploy Latest Dashboard Summary Update

## Goal

Deploy the latest committed UI changes to the static `docs/` output.

## Scope

- Run `yarn build`.
- Copy `build/` into `docs/` excluding `build/manifest.json`.
- Confirm `docs/manifest.json` is unchanged.
- Stage `src/` and `docs/` as required by `docs/deployment.md`.
- Commit deployed docs output and GSD record if generated output changed.
- Push to remote.

## Verification

- `yarn build` succeeds.
- `git diff -- docs/manifest.json` shows no changes.
- `git push` succeeds.
