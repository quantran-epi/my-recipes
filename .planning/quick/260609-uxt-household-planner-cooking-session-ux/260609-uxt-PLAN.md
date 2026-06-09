# Quick Task 260609-uxt: Household, planner, cooking UX correction

## Goal

Address the follow-up UX issues:

- Make Household edit form controls truly full-width and align member switches to the right.
- Add a floating Smart Meal Planner shortcut.
- Redesign Smart Meal Planner into form -> suggest -> accept flow with help toggles and loading state.
- Simplify scheduled-meal cooking session dish list to status + right-aligned start/continue action.
- Simplify single-dish cooking modal with serving control, previous/next step controls, and ingredient used switches.
- Redesign meal-completion leftovers as dish rows with switches that reveal leftover inputs only when enabled.
- Build and deploy after verification.

## Verification

- `yarn build`
- Copy `build/` to `docs/` excluding `build/manifest.json`.
- Confirm `docs/manifest.json` remains unchanged.
