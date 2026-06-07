---
status: in_progress
task_id: 260608-9df
slug: fix-nutrition-suggestor-expansion-dish-d
created: 2026-06-08
---

# Quick Task Plan

Fix focused UI issues reported by the user:

1. Nutrition dish suggestor: remove the duplicate goal-match percent badge and hide per-dish nutrition metrics behind an expand control.
2. Dish detail page: prevent long dish names from overflowing the top control section and reduce redundant outer padding around detail content.
3. Shopping list detail page: put the back button area into the square white top-control card style.

Verification:

- Run `git diff --check`.
- Run `yarn build`.
