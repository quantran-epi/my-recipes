---
quick_id: 260607-ctw
status: planned
created: 2026-06-07
---

# Quick Task 260607-ctw: Calendar and Template Workflow Backfill

## Goal

Track the completed calendar, scheduled meal template, shopping list template, and expense planner label update that was implemented and deployed in commit `b588ccbc`.

## Tasks

1. Make app calendars and week pickers start weeks on Monday through Vietnamese locale configuration and Monday-based week helpers.
2. Add day/week scheduled meal template workflows, including create from existing data, create from scratch, apply from Templates, and apply from the Scheduled Meal calendar.
3. Add shopping list template workflows for creating from an existing shopping list or from scratch.
4. Simplify the expense planner label to `Tính chi phí` / `Tính phí`.
5. Build and deploy the generated app output to `docs/`.

## Verification

- `yarn build`
- Deployment output copied to `docs/` while preserving `docs/manifest.json`.
- Commit `b588ccbc` pushed to `main`.
