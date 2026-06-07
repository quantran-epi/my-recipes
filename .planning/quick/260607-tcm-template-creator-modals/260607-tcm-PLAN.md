---
quick_id: 260607-tcm
status: planned
created: 2026-06-07
---

# Quick Task 260607-tcm: Template Creator Modals

## Goal

Keep the Templates page focused on saved template lists by moving the scheduled meal and shopping list template creation forms into modal dialogs.

## Tasks

1. Add modal state for creating meal templates and shopping list templates.
2. Move the existing meal template creator UI into a modal without changing template creation behavior.
3. Move the existing shopping list template creator UI into a modal without changing template creation behavior.
4. Leave the main Templates page showing saved template lists, with compact create actions in each section.

## Verification

- Run `git diff --check`.
- Run `yarn build`.
