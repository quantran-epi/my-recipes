# Serving Size Feature Plan

## Core Concept

Add `baseServings` to each dish. Recipe ingredient amounts stay written for that base serving count.

When cooking or creating a shopping list, choose `targetServings` and calculate:

```txt
scale = targetServings / baseServings
```

Then multiply each required ingredient amount by `scale`.

## Recommended Data Model

Add to `Dishes`:

```ts
baseServings?: number;
```

Use `1` as the safest default for existing dishes, because it avoids silently changing current calculations.

Later, add per-context servings for scheduled meals and shopping lists:

```ts
dishId: string;
servings: number;
```

## UI Recommendation

- Dish create/edit: add `Khẩu phần gốc`.
- Dish detail: show `Khẩu phần` and a small `- / +` serving stepper for preview.
- Cooking session: choose servings before starting, then deduct scaled amounts.
- Shopping list: choose servings per dish, then scale checklist amounts, cost, and inventory coverage.

## Important Rule

Do not mutate original recipe ingredient amounts when serving count changes.

Example:

```txt
Recipe base: 2 servings
200g thịt
100g rau

Cooking: 4 servings
400g thịt
200g rau
```

The recipe remains `200g` and `100g`.

## Rounding Recommendation

For weight and volume units (`g`, `kg`, `ml`, `lít`), allow decimals internally and format nicely.

For count-like units (`quả`, `củ`, `chiếc`, `bó`, `nhánh`, `thanh`, `lá`):

- Recipe/cooking view: show precise scaled amount, for example `1.5 quả`.
- Shopping list: optionally round up to avoid under-buying, for example `Mua 2 quả`.
- Keep original need visible somewhere, for example `Cần 1.5 quả`.

## Included Dishes

Phase 1: when parent dish is scaled, included dish ingredients scale by the same multiplier.

Later improvement:

```ts
includeDishes: {
  dishId: string;
  servings?: number;
}[]
```

## Implementation Order

1. Add `baseServings` to `Dishes`.
2. Add serving field to dish add/edit/detail UI.
3. Create a helper like `DishServingHelper.scaleIngredientAmount`.
4. Use that helper in dish detail modal first.
5. Apply scaling to shopping list creation.
6. Apply scaling to cooking inventory deduction.
7. Apply scaling to cost estimates and suggestion detail.
8. Later: per-meal/per-shopping-list serving overrides.
