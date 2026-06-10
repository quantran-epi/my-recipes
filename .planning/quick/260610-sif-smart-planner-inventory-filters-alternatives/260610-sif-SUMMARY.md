---
status: complete
completed_at: 2026-06-10T04:18:01Z
---

# Quick Task 260610-sif Summary

Expanded Smart Planner with inventory-aware cost ranking, strict hard constraints, daily alternatives, and a shopping preview before applying the plan.

## Completed

- Added a toggle for inventory-aware budget scoring, comparing daily budget against need-to-buy cost when enabled.
- Split visible cost data into total dish cost and `Cần mua` cost after inventory coverage.
- Added toggleable hard constraints for max cooking time, avoided ingredients, required expiring ingredients, and required dish tags.
- Changed day generation to keep up to three full-day alternatives and let the user choose one per day.
- Added alternative cards with total score, total cost, need-to-buy cost, nutrition fit, household fit, and short reasons.
- Added a shopping preview modal before creating scheduled meals, including selected alternatives and missing ingredient rows.

## Verification

- Source scan confirmed inventory-aware, hard-constraint, alternative, and shopping-preview paths are wired in Smart Planner.
- `yarn build` passed with the existing CRA/Browserslist/ESLint warnings.
- Manual code review confirmed the selected alternative drives the meal cards and scheduled-meal apply flow.
