---
status: in_progress
quick_id: 260611-dpl
created_at: "2026-06-11T10:42:57Z"
---

# Deploy Cooking Duration Button Fix

## Task

Deploy the committed cooking session modal duration button fix to the static `docs/` output.

## Plan

1. Run `yarn build` using the existing CRA/CRACO build command.
2. Copy generated `build/` output into `docs/` while excluding `build/manifest.json`.
3. Verify `docs/manifest.json` is preserved.
4. Stage source and deployed docs output, commit the deployment artifacts, and push.

## Verification

- `yarn build`
- `docs/manifest.json` checksum unchanged after copy
- `git status --short -- docs src`
