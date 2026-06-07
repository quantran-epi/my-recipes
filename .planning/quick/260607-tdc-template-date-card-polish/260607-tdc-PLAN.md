---
quick_id: 260607-tdc
status: planned
created: 2026-06-07
---

# Quick Task 260607-tdc: Template Date Text and Card Polish

## Goal

Make template list items cleaner by showing the updated date as subtle text instead of a tag, while keeping preview/edit/apply controls focused.

## Tasks

1. Replace `Cập nhật DD/MM/YYYY` tags with plain secondary text in meal and shopping template cards.
2. Redesign template card layout so title, metadata, tags, and actions are easier to scan.
3. Keep preview modal, edit, apply, and delete behavior unchanged.

## Verification

- Run `git diff --check`.
- Run `yarn build`.
