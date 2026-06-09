# Quick Task 260609-uxs: Household and scheduled meal UI correction

## Goal

Fix the UI regressions reported after the household/planner polish pass:

- Redesign household member enable/disable controls as clear switches with descriptions.
- Remove cooking-duration fields from household member profiles.
- Make household profile form controls use practical full-width responsive layout instead of narrow centered controls.
- Move Smart Meal Planner access from the sidebar menu into a button on the Scheduled Meal page.
- Use the new diet-plan icon for all Scheduled Meal menu/header icons.
- Repair Scheduled Meal page header/action layout with compact icon-only actions where labels collapse.
- Move scheduled-meal item actions into the dropdown at the top-right and remove the cramped small-button action row.
- Build and deploy after verification.

## Verification

- `yarn build`
- Copy `build/` to `docs/` excluding `build/manifest.json`.
- Confirm `docs/manifest.json` remains unchanged.
