# Quick Task 260609-uyv: Scheduled planner, cooking, household polish

## Goal

Fix the requested UI/UX issues and deploy the app.

- Smart planner shortcut from scheduled meal day should carry the current selected day.
- Dish suggestor bottom back action should be icon-only.
- Use the neat rounded button style from shopping list item bought section where appropriate.
- Make multi-dish cooking list full modal width; add progress bar to single-dish step section.
- Make finish-meal dish rows full width with switches aligned right.
- Capitalize first weekday character in smart planner suggestions.
- Align household member list switches right, align detail name left beside icon, and make color choices horizontal.

## Verification

- `yarn build`
- Search/check affected UI code paths.
- Copy `build/` to `docs/` excluding `build/manifest.json`.
- Confirm `docs/manifest.json` remains unchanged.
