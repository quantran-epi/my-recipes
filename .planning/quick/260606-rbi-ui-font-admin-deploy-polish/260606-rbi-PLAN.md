---
quick_id: 260606-rbi
status: planned
created: 2026-06-06
---

# Quick Task 260606-rbi: UI, Font, Admin Reload, Backup Plan, Deploy

## Goal

Save the future image-storage backup plan, add the requested shopping-list/admin/UI refinements, remove online-only font dependency, then deploy.

## Tasks

1. Save `docs/image-storage-backup-plan.md` with the agreed IndexedDB image and manual ZIP/GitHub backup plan.
2. Add shopping-list detail edit access by reusing the existing edit widget, polish the active cooking floating button, and reload after admin unlock/lock.
3. Replace Google Fonts/Kanit dependency with a system font stack and deploy via `docs/deployment.md`.

## Verification

- Run `yarn build`.
- Confirm generated `docs/index.html` has no Google Fonts or localhost script references.
- Confirm git diff is scoped to source, docs, and GSD artifacts.
