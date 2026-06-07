---
quick_id: 260607-ubg
status: complete
completed: 2026-06-07
---

# Quick Task 260607-ubg Summary

## Completed

- Added `DishNutritionHelper` to calculate per-dish nutrition from ingredient nutrition, recipe units, included dishes, and serving size.
- Added a new `Dinh dưỡng` mode in Dish Suggestor with goal-based ranking for balanced, high-protein, lower-calorie, lower-fat, and higher-fiber suggestions.
- Added richer nutrition analytics with dish/ingredient nutrition coverage, macro averages, and ranked dish charts for protein, fiber, and lighter calories.

## Verification

- `git diff --check` passed.
- `yarn build` completed successfully with existing CRA/lint warnings.
