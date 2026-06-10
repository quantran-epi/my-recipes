# Quick Task 260610-sdb: Smart Planner Daily Budget Scoring

## Goal

Change Smart Planner budget criteria so the configured budget is treated as a whole-day budget, not an equal per-meal split.

## Scope

- Remove the `dailyBudget / 3` per-meal budget comparison from dish scoring.
- Score breakfast/lunch/dinner as a day combination when budget criteria is enabled.
- Allow uneven daily allocation such as 50,000 breakfast, 70,000 lunch, and 30,000 dinner under a 150,000 daily budget.
- Update the suggestion detail modal and control help copy to describe whole-day budget scoring.
- Run `yarn build`.
- Commit the source and GSD tracking files.

## Verification

- Source scan confirms `dailyBudget / 3` is removed.
- Detail modal explains daily total cost against daily budget.
- `yarn build` succeeds.
