---
status: complete
quick_id: 260607-tco
slug: template-card-overflow-actions
created: 2026-06-07
---

# Template Card Overflow Actions

## Goal

Make template cards cleaner by keeping only the apply-template action visible by default and moving preview, edit, and delete into a top-right dropdown menu.

## Scope

- Update the template list cards on `Templates.screen.tsx`.
- Preserve existing preview, edit, apply, and delete behavior.
- Avoid changing template data behavior or apply/merge behavior.

## Verification

- Run `yarn build`.
