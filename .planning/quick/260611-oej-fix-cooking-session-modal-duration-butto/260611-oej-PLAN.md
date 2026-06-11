---
status: in_progress
quick_id: 260611-oej
created_at: "2026-06-11T10:34:15Z"
---

# Fix Cooking Session Modal Duration Buttons

## Task

Shorten overflowing cooking session modal duration labels and require confirmation before updating a dish's saved duration from the real cook time.

## Plan

1. Shorten the cooking timer phase advance button labels while preserving clear accessible labels.
2. Shorten the finish-cooking real-duration update button label.
3. Add a confirmation dialog before dispatching `updateDishDuration`.
4. Run TypeScript/build verification, update quick summary/state, and commit.

## Verification

- `npx tsc --noEmit`
- `git diff --check`
- `yarn build`
