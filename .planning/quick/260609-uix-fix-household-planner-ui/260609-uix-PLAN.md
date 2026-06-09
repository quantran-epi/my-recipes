# Quick Task 260609-uix: Fix household, planner, scheduled meal UI regressions

## Goal

Correct the UI regressions from the household and smart planner implementation:

- Use the new `family.png` icon for Household and `diet-plan.png` for Smart Meal Planner.
- Localize Smart Meal Planner labels/menu to Vietnamese.
- Fix Smart Meal Planner header overflow.
- Redesign Household as a cleaner list-first management page.
- Redesign Smart Meal Planner with full-width, practical controls and cleaner plan output.
- Repair Scheduled Meal card item layout so new cooking/completion actions do not break text wrapping.
- Build and deploy after verification.

## Verification

- `yarn build`
- Copy `build/` to `docs/` excluding `build/manifest.json` and confirm `docs/manifest.json` remains unchanged.
