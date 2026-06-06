# Quick Task 260606-izu: Suggestor Expense Planner Action

**Date:** 2026-06-06
**Task:** Add suggestor icon-only actions for creating a shopping list and navigating selected dishes to the expense planner.

## Plan

1. Extend the expense planner route/screen/widget to accept multiple selected dish IDs through a query parameter while preserving existing single-dish links.
2. Add a suggestor action that navigates selected dishes to the expense planner.
3. Replace visible labels on the suggestor shopping-list and expense-planner action buttons with icon-only buttons, plus tooltips and accessible labels.

## Verification

- Run `yarn build`.
- Run focused E2E or static checks around app-shell/suggestor navigation if feasible.
