---
status: complete
task_id: 260608-sk4
slug: redesign-analytics-expense-summary-help-
completed: 2026-06-08
---

# Quick Task Summary

Completed the requested analytics and calculator navigation updates:

- Redesigned the top analytics expense signal into a clear "Chi phí còn cần mua" card with total remaining cost, highest-cost shopping list, progress, direct actions, and a question-mark explanation toggle.
- Added nutrition calculator deep links to `/nutrition-goals?calculator=1` with support for `dishes`, `shoppingLists`, and `scheduledMeals` query selections.
- Added an icon-only nutrition calculator action beside the dish suggestor shopping-list and expense-planner footer actions.
- Added a nutrition calculator shortcut from shopping-list detail using the current list.
- Added a selected scheduled-meal nutrition calculator action in the scheduled meal floating action group.

Verification:

- `git diff --check` passed for touched files.
- `yarn build` passed with existing CRA/Browserslist/ESLint warnings.
