---
status: complete
quick_id: 260606-izu
date: 2026-06-06
---

# Quick Task 260606-izu Summary

## Outcome

The dish suggestor now has compact icon-only actions for creating a shopping list and opening the expense planner. The expense planner action passes the selected dishes into the planner page.

## Changes

- Added an icon-only expense planner action beside the icon-only shopping list action in suggestor result footers.
- Added tooltips, accessible labels, and stable test IDs for the compact action buttons.
- Extended the expense planner route to accept multiple dish IDs through `?dishes=...` while keeping the existing single-dish `?dish=...&servings=...` route.
- Updated the expense planner widget to seed itself from multiple initial dishes.
- Added stable dish suggestion row test IDs and a focused E2E regression for the suggestor-to-expense-planner handoff.

## Verification

- `yarn build` passed with existing unrelated lint warnings.
- `E2E_BROWSER_CHANNEL=chrome yarn test:e2e tests/e2e/dish-suggester.spec.ts` passed, 1 test.
