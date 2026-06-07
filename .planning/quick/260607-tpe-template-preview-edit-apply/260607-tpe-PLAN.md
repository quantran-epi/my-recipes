---
quick_id: 260607-tpe
status: planned
created: 2026-06-07
---

# Quick Task 260607-tpe: Template Preview, Edit, and Apply Entry Points

## Goal

Improve template workflows by adding shopping-list create-from-template access, making scheduled meal page actions fit in one row, and adding preview/edit controls to template list items.

## Tasks

1. Add a shopping-list screen action to create a new shopping list from a saved shopping template.
2. Reorganize the scheduled meal top action area into a single responsive row with one action aligned left and one right.
3. Add preview affordances to meal and shopping template cards so users can inspect template contents before applying.
4. Add edit affordances for both meal and shopping templates without changing the current multi-card scheduled meal apply behavior.

## Verification

- Run `git diff --check`.
- Run `yarn build`.
