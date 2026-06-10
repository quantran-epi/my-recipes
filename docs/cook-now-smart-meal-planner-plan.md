# Cook Now Smart Meal Planner Plan

## Purpose

Build a decision assistant for the moment when the user asks: "What should I cook now?"

The planner should produce the best immediate meal options for the current household, inventory, budget, nutrition goal, cooking time, and desired variety. It should not feel like a black box. Every suggestion must explain why it is good, what tradeoffs it has, what the user needs to buy, and whether any household member has a safety or preference concern.

This plan is intended as a future implementation handoff for this repo.

## Current App Foundation

The app already has useful foundations that should be reused:

- Household member profiles with favorites, avoided dishes, favorite ingredients, avoided ingredients, preferred tags, avoided tags, nutrition goal, portion preference, and notes.
- Inventory batches, always-available ingredients, expiry helpers, and inventory-aware ingredient availability.
- Ingredient price estimates and cost/shopping-cost helpers.
- Ingredient nutrition data, dish nutrition calculation, and configurable nutrition goals.
- Dish duration phases and total cooking-time helpers.
- Dish suggestion modes for ingredients, inventory, duration, and nutrition.
- Smart Meal Planner scoring for budget, nutrition, household fit, hard constraints, daily alternatives, and shopping preview.
- Cooking-session member feedback exists, which can become the basis for learning and variety scoring.

## Missing Pieces Required For The Best Plan

These are not fully implemented yet, but are required for the planner to work at the quality level described here:

1. Dedicated Cook Now surface
   - Current suggestions are split across inventory, duration, nutrition, and scheduled planner flows.
   - Add a first-class Cook Now mode that combines all decision factors into one ranked answer set.

2. Hard allergy and safety constraints
   - Current household member profiles have avoided ingredients, but allergies are not separate from dislikes.
   - Add explicit hard-block fields so unsafe dishes are never recommended.

3. First-class recommendation categories
   - The Cook Now result should always include these categories when data allows:
     - Best overall
     - Fastest
     - Cheapest
     - Uses expiring food
     - Best for household
     - Best nutrition match
     - No-shopping / Ready from inventory

4. No-shopping mode
   - Inventory suggestions exist, but Cook Now needs a strict no-shopping category and/or mode.
   - In no-shopping mode, dishes with missing required ingredients should be excluded, not merely ranked lower.

5. Unified score breakdown
   - Smart Meal Planner has score detail concepts, but Dish Suggester recommendations need the same level of explanation.
   - Each Cook Now card needs visible reason tags plus a detail view with scoring contributions.

6. Variety and recent-cooked scoring
   - The app has cooking-session feedback data, but recommendation scoring does not yet use recent cooking history enough.
   - Add recent-dish penalties and variety controls so the planner does not repeat the same meals too often.

7. Feedback learning loop
   - Current feedback exists around cooking sessions, but Cook Now should also track dismissed suggestions and post-cooking fit.
   - Use this to improve future recommendations while keeping the logic inspectable.

8. Data quality indicators
   - Missing price, nutrition, inventory, or conversion data should not crash or silently distort suggestions.
   - Show confidence/warning badges so the user knows when a recommendation is based on incomplete data.

9. Category-specific actions
   - Cook Now should let the user start cooking, add missing ingredients to a shopping list, open dish detail, dismiss the suggestion, or swap to another category result.

10. Regression coverage
   - Add focused tests for hard blocks, ranking, empty states, and large-list responsiveness.

## Product Behavior

### Inputs

Cook Now should ask for only the minimum context needed:

- Eating members: default to currently selected household members, with quick edit.
- Meal slot: breakfast, lunch, dinner, snack, or any.
- Time available: 15, 30, 45, 60+ minutes, plus custom value.
- Shopping tolerance: no shopping, small top-up, normal shopping.
- Budget: max extra spend after inventory, optional.
- Nutrition goal: household/default goal or selected goal.
- Inventory priority: normal or prefer expiring food.
- Variety preference: familiar, balanced, or more variety.

### Hard Constraints

Hard constraints block dishes completely:

- Any selected member has an allergen ingredient in the dish.
- Any selected member has a hard-excluded ingredient in the dish.
- No-shopping mode is active and the dish is missing required ingredients.
- Strict time mode is active and total dish time exceeds the selected max.
- Required meal slot or required tags are configured and the dish does not match.

### Soft Ranking Factors

Soft factors rank otherwise valid dishes:

- Household fit: favorite dishes, avoided dishes, favorite ingredients, avoided ingredients, preferred tags, avoided tags, member nutrition goals, portion needs.
- Inventory readiness: how many required ingredients are available, how much extra shopping is needed, and whether expiring inventory will be used.
- Budget: estimated extra cost after subtracting inventory, cost per serving, and missing price confidence.
- Nutrition: match against selected goal and per-member goals, with missing nutrition warnings.
- Cooking time and effort: total time, number of steps, number of ingredients, and included sub-dishes.
- Variety: recent cooked history, repeated dish penalty, repeated main ingredient/protein penalty where ingredient/category data supports it.

### Default Weights

Use this as the default scoring model, then adjust through presets:

- Household fit: 25%
- Inventory readiness: 20%
- Nutrition match: 15%
- Budget fit: 15%
- Cooking time/effort: 15%
- Variety/recently cooked: 10%

Preset adjustments:

- Budget mode increases budget weight.
- Healthy mode increases nutrition weight.
- Quick mode increases time/effort weight.
- Use-inventory mode increases inventory and expiry weight.
- Family mode increases household fit weight.
- More-variety mode increases recent-cooked and repetition penalties.

## Implementation Plan

### 1. Data Model

Extend `HouseholdMemberProfile` with explicit hard safety fields:

```ts
allergenIngredientIds: string[];
hardExcludedIngredientIds: string[];
```

Update normalization, reducers, selectors, and household profile editing UI so users can manage these fields separately from soft dislikes.

Add optional Cook Now feedback state only if existing cooking-session feedback is not enough:

```ts
type CookNowDismissReason = 'too_expensive' | 'too_slow' | 'not_in_mood' | 'missing_ingredient' | 'other';

type CookNowRecommendationFeedback = {
  id: string;
  dishId: string;
  createdAt: string;
  memberIds: string[];
  reason: CookNowDismissReason;
};
```

Prefer deriving recent-cooked history from existing cooking sessions before adding new persisted history.

### 2. Scoring Helper

Create a dedicated Cook Now helper near the existing dish-suggestion helpers, reusing existing helpers for inventory, cost, nutrition, household suitability, and duration.

Recommended types:

```ts
type CookNowCategory =
  | 'best_overall'
  | 'fastest'
  | 'cheapest'
  | 'uses_expiring'
  | 'best_household'
  | 'best_nutrition'
  | 'no_shopping';

type CookNowShoppingMode = 'no_shopping' | 'small_top_up' | 'normal';
type CookNowVarietyMode = 'familiar' | 'balanced' | 'more_variety';

type CookNowOptions = {
  memberIds: string[];
  mealSlot?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
  maxCookMinutes?: number;
  strictTime?: boolean;
  maxExtraCost?: number;
  shoppingMode: CookNowShoppingMode;
  nutritionGoalId?: string;
  preferExpiring: boolean;
  varietyMode: CookNowVarietyMode;
};

type CookNowRecommendation = {
  dish: Dishes;
  categories: CookNowCategory[];
  score: number;
  scoreDetails: PlannerScoreDetail[];
  reasons: string[];
  warnings: string[];
  missingIngredientIds: string[];
  extraShoppingCost?: IngredientPriceRange | null;
  nutritionMatch?: NutritionGoalMatch;
  householdSuitability?: HouseholdDishSuitability;
};
```

The helper should return both an overall ranked list and a category map containing the best candidate for each required category.

### 3. Cook Now UI

Add a Cook Now mode to the existing Dish Suggester or a dedicated route linked from the current suggester entrypoint.

The first screen should be usable without configuration:

- Default members from selected household members.
- Default time from household preference profile.
- Default shopping mode `small_top_up`.
- Default nutrition goal from household/default selection when available.
- Default variety mode `balanced`.

The results area should show category cards first:

- Best overall
- Fastest
- Cheapest
- Uses expiring food
- Best for household
- Best nutrition match
- No-shopping / Ready from inventory

Below category cards, show the full ranked list with filters/sorting.

Each card should show:

- Dish name and image when available.
- Score percentage.
- Time.
- Serving estimate.
- Missing ingredient count.
- Need-to-buy cost.
- Household fit badge.
- Nutrition fit badge.
- Reason tags.
- Warning tags.

Each card should support:

- Start cooking.
- Add missing ingredients to shopping list.
- Open dish detail.
- View score details.
- Dismiss for now.

### 4. Explanation Details

Use a detail drawer/modal with these sections:

- Why this was suggested.
- Score breakdown by factor.
- Household member fit, including per-member positives/warnings.
- Allergy/hard-exclusion status.
- Inventory status and missing ingredients.
- Expiring ingredients used.
- Budget estimate and missing price data.
- Nutrition match and missing nutrition data.
- Cooking time/effort facts.
- Variety/recent-cooked notes.

The detail view must make it clear when a dish is recommended despite incomplete data.

### 5. Actions And Follow-Through

Start cooking should pass selected household members and target servings into the existing cooking-session flow.

Add missing ingredients should create or append to a shopping list using the same serving scale and inventory-aware missing amount calculation used by the recommendation.

Dismiss should record a lightweight feedback entry if feedback persistence is added, or keep session-only state for the MVP.

After cooking, reuse existing cooking-session member feedback so future scoring can learn:

- loved it
- okay
- disliked it
- portion too small/large, if later added

### 6. Testing

Add focused tests for scoring:

- Allergens block dishes completely.
- Hard-excluded ingredients block dishes completely.
- Avoided ingredients reduce score but do not block.
- No-shopping mode excludes dishes with missing required ingredients.
- Fastest category returns the highest-ranked short-time dish.
- Cheapest category uses extra shopping cost, not total dish cost.
- Uses-expiring category prefers dishes that consume urgent inventory.
- Best-household category prefers higher household suitability.
- Best-nutrition category prefers stronger nutrition goal match.
- Recent-cooked penalty lowers repeated dishes.
- Missing price/nutrition data produces warnings and does not crash.

Add UI or integration coverage:

- Cook Now loads with defaults and produces recommendations.
- Category cards are visible and selectable.
- Score detail modal/drawer opens and shows breakdown.
- Start cooking works from a recommendation.
- Add missing ingredients opens or creates a shopping list flow.
- Empty state is useful when every dish is blocked.

Run verification:

- `git diff --check`
- `yarn build`
- Existing relevant e2e/performance test command if available in the current branch.

## Acceptance Criteria

- A user can open Cook Now and immediately see useful recommendations without configuring every field.
- The result includes the seven required categories: Best overall, Fastest, Cheapest, Uses expiring food, Best for household, Best nutrition match, and No-shopping / Ready from inventory.
- Allergies and hard exclusions are never recommended for selected members.
- No-shopping recommendations require no missing required ingredients.
- Each recommendation explains its score and warnings.
- Recommendations can start cooking or produce a shopping-list path.
- The planner remains local-first, works with existing persisted data, and does not require a backend.
- Large recipe/inventory lists remain responsive.

## Implementation Defaults

- Optimize for Cook Now first, not full week planning.
- Keep scoring deterministic and transparent.
- Treat allergies/hard exclusions as safety blockers.
- Treat dislikes and avoided tags as soft ranking penalties.
- Reuse existing Smart Meal Planner and Dish Suggester helpers where practical.
- Add new persistence only when existing cooking-session/app-context state is insufficient.
- Do not remove current ingredient, inventory, duration, nutrition, or scheduled planner flows.
