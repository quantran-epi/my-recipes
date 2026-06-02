# Enhancement Suggestions

Last updated: 2026-06-02

## Current Foundation

The app already has several strong building blocks:

- Ingredient unit constraints for inventory batches.
- Recipe unit conversions per ingredient.
- Inventory-aware shopping list checklist groups.
- Bought amount input and shopping-list completion into inventory batches.
- Always-available ingredients.
- Preservation condition and expiry data.
- Dish detail pages and read-only dish modals.
- Ingredient and shopping-list detail pages.
- Dish images, recipe data, and ingredient price estimates in shared data.
- Estimated dish cost and shopping-list cost summary.

## Recommended Next Enhancements

### 1. Data Quality Dashboard

Priority: High

Add an admin/debug page that checks shared data health.

Useful checks:

- Dish missing image.
- Broken dish image URL.
- Ingredient missing price estimate.
- Suspicious price range, such as min greater than max.
- Ingredient missing unit rules.
- Recipe ingredient uses a unit not allowed by that ingredient.
- Recipe ingredient cannot convert to base unit.
- Dish has no steps.
- Dish has no required ingredients.
- Ingredient exists but is unused by all dishes.

Reason: The app now depends heavily on populated shared data. A data-quality page will make future bulk imports safer.

### 2. Price Source Metadata

Priority: High

Extend ingredient price estimate with source and freshness metadata.

Example shape:

```ts
priceEstimate: {
  min: number;
  max: number;
  amount: number;
  unit: IngredientUnit;
  currency: "VND";
  source?: string;
  note?: string;
  updatedAt?: string;
}
```

UI can then show:

- Source name.
- Last updated date.
- Whether the price is manually estimated.

Reason: Price ranges are useful, but they become more trustworthy when the app can show where they came from and when they were last reviewed.

### 3. Per-Ingredient Cost Breakdown

Priority: High

The current app shows total estimated cost. Add a breakdown inside dish detail and shopping-list cost tab.

For each ingredient, show:

- Required amount.
- Estimated cost range.
- Whether inventory covers it.
- Missing price warning if unavailable.

Reason: Users can understand which ingredients drive the cost instead of only seeing the total.

### 4. Purchase Completion Review

Priority: High

Before completing a shopping list, show a confirmation review table.

Fields:

- Ingredient name.
- Amount that will be added to inventory.
- Unit.
- Estimated cost.
- Optional expiry date.
- Optional storage condition.

Reason: Completion currently imports batches automatically. A review step reduces mistakes before the irreversible action.

### 5. Expiry-Aware Inventory Consumption

Priority: Medium

Use FEFO behavior: first-expired, first-out.

Places to apply:

- Cooking session inventory usage.
- Dish suggestion urgency score.
- Shopping-list inventory coverage calculation.

Reason: If two batches exist, the app should encourage using the one that expires sooner.

### 6. Image Health And Fallbacks

Priority: Medium

Remote images can break. Add image resilience.

Suggested behavior:

- Fallback placeholder when image fails to load.
- Mark failed image URL in a data-quality report.
- Lazy-load dish images.
- Optional image source metadata.

Reason: The dish list and detail screens should not look broken if a CDN removes an image.

### 7. Unit Conversion Confidence

Priority: Medium

Some conversions are exact, while others are approximate. For example, kg to g is exact, but spoon to gram depends on ingredient density.

Possible model:

```ts
recipeUnitConversionMeta: {
  spoon: {
    approximate: true,
    note: "Depends on ingredient density"
  }
}
```

Reason: This prevents the app from treating rough cooking conversions as exact inventory math.

### 8. Ingredient Merge Tool

Priority: Medium

Add a utility to merge duplicate ingredients.

Merge should update:

- Dish recipe references.
- Shopping-list references.
- Inventory batches.
- Unit rules.
- Price estimates.

Reason: As shared data grows, duplicate ingredients become likely. Manual cleanup is risky because ingredient IDs are referenced in many places.

### 9. Bulk Import Preview

Priority: Medium

Add an import screen for shared data patches.

Flow:

1. Paste or upload JSON patch.
2. Preview changed dishes and ingredients.
3. Run validation.
4. Create backup.
5. Apply changes.

Reason: You often want bulk data updates. A preview workflow makes this safer than editing JSON directly.

### 10. Shopping List History And Audit

Priority: Low

For completed shopping lists, show what was imported into inventory.

Useful fields:

- Imported batch IDs.
- Imported amount and unit.
- Completion time.
- Estimated bought cost.

Reason: Completed shopping lists become useful records, not only readonly snapshots.

### 11. Dish Suggestion Explanation

Priority: Low

Enhance fridge suggestion cards with an explanation section.

Show:

- Matched ingredients.
- Missing ingredients.
- Urgent ingredients used.
- Estimated extra shopping cost.

Reason: Users can understand why a dish is suggested and decide faster.

### 12. Shared Data Versioning

Priority: Low

Add a schema/data version to shared data.

Example:

```json
{
  "version": "2026-06-02",
  "ingredients": [],
  "dishes": []
}
```

Reason: This helps future migrations, backups, and data sync debugging.

## Suggested Build Order

1. Data Quality Dashboard.
2. Price Source Metadata.
3. Per-Ingredient Cost Breakdown.
4. Purchase Completion Review.
5. Image Health And Fallbacks.
6. Bulk Import Preview.

This order improves reliability first, then makes the new cost and shared-data features easier to trust and maintain.
