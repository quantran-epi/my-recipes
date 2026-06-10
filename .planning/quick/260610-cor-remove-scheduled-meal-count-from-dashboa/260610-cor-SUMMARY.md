---
status: complete
completed_at: 2026-06-10T02:10:42Z
---

# Quick Task 260610-cor Summary

Removed scheduled-meal counting from the dashboard hero summary.

## Completed

- Removed the `Thực đơn` metric chip from the dashboard hero summary metrics.
- Stopped including today's scheduled meals in the hero total count.
- Left the Today section's scheduled-meal detail rows unchanged.

## Verification

- Focused source scan confirmed the meal summary metric and unused `todayDishCount` were removed.
- `yarn build` passed with existing CRA/Browserslist/ESLint warnings.
