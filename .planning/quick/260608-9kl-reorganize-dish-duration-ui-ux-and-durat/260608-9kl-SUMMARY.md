---
status: complete
task_id: 260608-9kl
slug: reorganize-dish-duration-ui-ux-and-durat
completed: 2026-06-08
---

# Quick Task Summary

Completed the dish duration reorganization:

- Made unused duration phases explicitly nullable in the dish model.
- Added `DishDurationHelper` for phase order, labels, colors, presets, normalization, total minutes, active phase extraction, and user-facing formatting.
- Replaced the old duration editor with a phase-card UI using switches, quick minute buttons, presets, and a total-time summary.
- Added the duration editor to dish add/edit forms so duration is editable as part of the dish.
- Updated dish list duration badge/popover, readonly dish detail, export text, and duration suggestor to use the shared helper.

Verification:

- `git diff --check` passed.
- `yarn build` passed with existing project warnings.
