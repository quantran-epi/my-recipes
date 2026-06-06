---
quick_id: 260606-idb
status: complete
completed: 2026-06-06T13:52:46Z
---

# Quick Task 260606-idb Summary

## Completed

- Moved Redux Persist durable storage from `localStorage` to IndexedDB through `localforage`.
- Moved durable tokens and sync metadata to the same IndexedDB storage helper.
- Split shared GitHub sync into `docs/sync/shared/manifest.json`, `ingredients.json`, and `dishes.json` with per-part hash/version checks.
- Split personal Gist backup into one manifest plus one file per personal data type, with changed-part upload/restore behavior.
- Updated legacy personal export/import to read and write the IndexedDB-backed persisted personal root.
- Updated e2e seed/network helpers for IndexedDB and split shared sync paths.
- Deployed the production build to `docs/`.

## Verification

- `yarn build` passed on 2026-06-06 with existing repo warnings.
- `git diff --check` passed.
- Focused GitHub token-pattern scan found no token values.
- Split shared manifest sanity check passed.
