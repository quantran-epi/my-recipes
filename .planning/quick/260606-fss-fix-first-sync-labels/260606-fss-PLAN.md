---
quick_id: 260606-fss
status: planned
created: 2026-06-06
---

# Quick Task 260606-fss: Fix First Shared Sync Labels

## Goal

Make first-device shared sync easier to understand by showing remote items missing locally as `Mới`, even if the latest remote manifest marks one of those items as `modified`.

## Tasks

1. Normalize shared sync change labels against the local snapshot after split part data loads.
2. Keep existing update/remove behavior for items that already exist locally.
3. Build, deploy to `docs/`, commit, and push.

## Verification

- `yarn build` passes.
- Fresh/empty local shared data displays remote items as `Mới`, not `Thay đổi`.
