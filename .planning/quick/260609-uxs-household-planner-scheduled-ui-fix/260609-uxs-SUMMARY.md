---
status: complete
completed_at: 2026-06-09T14:10:33Z
---

# Quick Task 260609-uxs Summary

Fixed the household and scheduled-meal UI regressions reported after the previous planner pass.

## Completed

- Reworked Household member rows into a clean list with Switch controls and explanatory inclusion text.
- Replaced the editor's plain include button with a Switch and clear description.
- Removed per-member cook-duration from Household member profile UI, normalization, type shape, and suitability scoring.
- Changed Household profile fields to full-width list rows instead of half-width centered controls.
- Removed Smart Meal Planner from the sidebar menu and added Smart Planner entry buttons on the Scheduled Meal page.
- Replaced Scheduled Meal shell/sidebar/bottom-tab/modal icons with `diet-plan.png`.
- Changed the Scheduled Meal day add/cook controls to compact icon-only actions with tooltips.
- Moved meal-card cooking, completion, detail, copy, edit, and delete actions into the top-right overflow menu.
- Removed cramped per-meal and per-card small action buttons from Scheduled Meal items.
- Rebuilt and copied production output to `docs/` while preserving `docs/manifest.json`.

## Verification

- `yarn install --frozen-lockfile`
- `yarn build` passed with existing CRA/ESLint/Browserslist warnings.
- `rsync -a --exclude 'manifest.json' build/ docs/`
- `shasum -a 256 docs/manifest.json` stayed `c22345c3d7a1ddf32e8e5049a68ca97fdcce4839e89aa4de4f45a55ba52bb932`.
