---
status: complete
quick_id: 260607-tmf
slug: template-menu-corner-fix
created: 2026-06-07
---

# Template Menu Corner Fix

## Goal

Fix the broken template item action layout so the overflow dropdown button stays at the top-right corner of each template card.

## Scope

- Pin the dropdown button to the card corner instead of letting it participate in the card action flex layout.
- Keep `Áp dụng` visible by default.
- Preserve preview, edit, and delete actions inside the dropdown.

## Verification

- Run `yarn build`.
