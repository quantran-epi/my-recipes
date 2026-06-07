---
quick_id: 260607-ump
status: planned
created: 2026-06-07
---

# Quick Task 260607-ump Plan

Add configurable nutrition goals and use them in Dish Suggestor.

## Tasks

1. Extend shared config with nutrition goals, default goal data, normalization, selectors, and reducer actions.
2. Add a nutrition goal management screen where admin can add/edit/delete goals and criteria amounts.
3. Update Dish Suggestor nutrition mode to pick a saved goal and rank dishes by how well their per-serving nutrition matches that goal.

## Verification

- Run `git diff --check`.
- Run `yarn build`.
