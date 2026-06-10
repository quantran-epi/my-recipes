---
status: complete
completed_at: 2026-06-10T01:33:28Z
---

# Quick Task 260610-bmi Summary

Completed the requested household, modal, button, cooking, nutrition, and deployment fixes.

## Completed

- Kept household member switches on the same row as member names, including mobile layouts.
- Converted household profile editing to a local draft with an explicit `Lưu` action before dispatching profile updates.
- Made dish suggestor household suitability member items span the full modal width.
- Removed the nutrition calculator shortcut and nested modal for creating scheduled meals, leaving only the shopping-list creation shortcut.
- Changed the shared app `Button` wrapper to the compact small-corner style while preserving explicit icon-only circle buttons such as page-header actions.
- Highlighted the scheduled cooking `Tiếp tục` action separately from start/new-cook actions.
- Fixed modal stacking by releasing auto overlay stack tokens and raised nested dish-detail cooking/shopping modal z-indexes.
- Built production assets and copied `build/` into `docs/` while preserving `docs/manifest.json`.

## Verification

- `yarn build` passed with existing CRA/Browserslist/ESLint warnings.
- `rsync -a --exclude manifest.json build/ docs/`
- `git diff -- docs/manifest.json` showed no changes.
