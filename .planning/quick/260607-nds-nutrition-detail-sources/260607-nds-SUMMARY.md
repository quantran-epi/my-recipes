---
status: complete
quick_id: 260607-nds
slug: nutrition-detail-sources
completed: 2026-06-07
---

# Summary

Enhanced ingredient nutrition UI, added source transparency, expanded nutrition criteria, and deployed the update.

## Product Changes

- Ingredient detail top tools now use a square white tool card.
- Ingredient cards show calories, protein, and fat.
- Ingredient cards include a non-admin nutrition detail button.
- Nutrition detail shows calories, macros, saturated fat, cholesterol, fiber, sugar, sodium, potassium, calcium, iron, vitamin A, vitamin C, and data sources.

## Data Changes

- Added source metadata for shared ingredient nutrition values.
- Used USDA FoodData Central matches where practical and Vietnamese Food Composition Table reference metadata for local context.
- Corrected Vietnamese seasoning items to category-backed estimates instead of misleading exact USDA spice matches.

## Deployment

- Ran `yarn build`.
- Copied `build/` into `docs/` excluding `build/manifest.json`.

## Verification

- Passed: `yarn build`.
- Confirmed nutrition detail/source data ready: 165/165 ingredients.
