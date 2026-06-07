---
status: complete
quick_id: 260607-nut
slug: ingredient-nutrition-management
created: 2026-06-07
---

# Ingredient Nutrition Management

## Goal

Add a feature to manage nutrition information on ingredients and populate shared ingredient nutrition data.

## Scope

- Extend the ingredient model with editable nutrition values.
- Add add/edit ingredient UI for calories, protein, carbs, fat, fiber, sugar, sodium, and basis amount/unit.
- Show nutrition information in ingredient detail and ingredient list rows.
- Populate approximate nutrition data for all shared ingredients.
- Refresh shared sync manifest ingredient version and changes.

## Verification

- Confirm all shared ingredients have nutrition data.
- Run `yarn build`.
