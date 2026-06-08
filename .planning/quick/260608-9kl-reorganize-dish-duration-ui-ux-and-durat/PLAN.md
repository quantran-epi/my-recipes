---
status: in_progress
task_id: 260608-9kl
slug: reorganize-dish-duration-ui-ux-and-durat
created: 2026-06-08
---

# Quick Task Plan

Reorganize dish duration handling with a compatible persisted shape:

1. Update the `DishDuration` type to explicitly allow `null` for unused phases.
2. Add a duration helper that centralizes phase order, labels, colors, normalization, total minutes, active phases, and formatting.
3. Replace the old duration form with phase cards, switches, quick time buttons, presets, and a clearer summary.
4. Add the duration editor into dish add/edit forms so duration is not hidden behind list-row actions only.
5. Use the shared helper in list rows, readonly detail, export text, and duration suggestor calculations.

Verification:

- Run `git diff --check`.
- Run `yarn build`.
