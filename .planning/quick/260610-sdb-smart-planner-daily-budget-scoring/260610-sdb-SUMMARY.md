---
status: complete
completed_at: 2026-06-10T04:00:27Z
---

# Quick Task 260610-sdb Summary

Changed Smart Planner budget scoring so the budget criteria uses the full daily budget instead of splitting it equally across breakfast, lunch, and dinner.

## Completed

- Removed the per-meal `dailyBudget / 3` budget comparison.
- Moved budget scoring to the selected breakfast/lunch/dinner day combination.
- Added low-cost candidates into the budget-enabled search pool so strict daily budgets can find cheaper combinations.
- Updated the suggestion detail modal to explain `Ngân sách ngày` as total day cost versus the daily budget.
- Updated budget field help text to clarify that meals can use uneven portions of the daily budget.

## Verification

- Source scan confirmed `dailyBudget / 3` and `mealBudget` are removed.
- Source scan confirmed detail modal budget rows now use `Tổng ngày` against the daily budget.
- `yarn build` passed with the existing CRA/Browserslist/ESLint warnings.
