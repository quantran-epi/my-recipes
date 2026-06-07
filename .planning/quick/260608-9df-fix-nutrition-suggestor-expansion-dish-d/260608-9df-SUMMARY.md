---
status: complete
task_id: 260608-9df
slug: fix-nutrition-suggestor-expansion-dish-d
completed: 2026-06-08
---

# Quick Task Summary

Completed the requested UI fixes:

- Removed the duplicate top-right percent badge from nutrition dish suggestions.
- Hid per-dish nutrition metrics by default and added a per-card expand action to reveal kcal, protein, fat, fiber, and data coverage.
- Prevented long dish names from forcing the dish detail top control bar wider than the screen.
- Removed redundant horizontal padding around the dish detail page content.
- Put the shopping-list detail back button inside a square white top-control card.
- Added defensive wrapping for long shopping-list and ingredient detail titles.

Verification:

- `git diff --check` passed.
- `yarn build` passed with existing project warnings.
