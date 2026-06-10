# Family Smart Meal Planner Complete Plan

## Purpose

Build the complete smart meal-planning feature for the user story:

> I have a family with different tastes, allergies, favorites, nutrition plans, meal sizes, budget limits, inventory status, cooking-time constraints, and variety needs. When I do not know what to cook, I want the app to suggest the best options now, or fill my scheduled meals for a day or a whole week.

The feature has three connected modes:

- **Cook Now**: recommend the best immediate dish options.
- **Plan Day**: fill breakfast, lunch, and dinner for one date.
- **Plan Week**: fill seven days of scheduled meals with variety, budget, nutrition, household fit, inventory use, and shopping preview.

This plan supersedes the Cook Now-only plan for future implementation. Cook Now is still part of the feature, but the final product must also create scheduled meals for a day or week.

## Current App Foundation To Reuse

The app already has important pieces. Do not rebuild these from scratch:

- Household profiles: member name, favorites, avoided dishes, favorite ingredients, avoided ingredients, preferred tags, avoided tags, nutrition goal, portion preference, and notes.
- Inventory: inventory batches, always-available ingredients, expiry helpers, low-stock/urgent-expiry config, and ingredient availability helpers.
- Budget/cost: ingredient price estimates, remembered prices, cost estimates, and inventory-aware need-to-buy cost.
- Nutrition: ingredient nutrition, dish nutrition calculation, configurable nutrition goals, and nutrition-goal scoring.
- Cooking time: dish duration phases and total-time helper.
- Suggestions: Dish Suggester modes for ingredients, inventory, duration, and nutrition.
- Scheduled planning: Smart Meal Planner already supports day/week scope, alternatives, daily budget scoring, detail explanations, shopping preview, and creation of `ScheduledMeal` entries.
- Feedback foundation: cooking sessions store member feedback, which can become the learning source for future recommendations.

## Required Missing Pieces

These are not fully implemented yet, but are required for the best complete feature.

1. Unified planner engine
   - Current recommendation logic is split between Dish Suggester and Smart Meal Planner.
   - Add one shared scoring engine that can produce Cook Now recommendations and day/week plan candidates from the same factors.

2. First-class Cook Now mode
   - Current Dish Suggester has inventory/duration/nutrition modes, but not a combined Cook Now decision surface.
   - Add Cook Now with category cards: Best overall, Fastest, Cheapest, Uses expiring food, Best for household, Best nutrition match, and No-shopping / Ready from inventory.

3. True scheduled meal generation from suggestions
   - Day/week Smart Meal Planner already creates scheduled meals, but Cook Now recommendations do not explicitly schedule a dish.
   - Add a Schedule action on recommendation cards and keep Apply plan for day/week.

4. Allergy and hard safety constraints
   - Current household profiles have avoided ingredients, but allergy is not separate from dislike.
   - Add explicit hard-block fields so unsafe dishes are never recommended.

5. Strict no-shopping behavior
   - Inventory suggestions can rank dishes by available ingredients, but a strict no-shopping mode must exclude dishes with missing required ingredients.

6. Day/week variety intelligence
   - Current planning avoids exact repeats inside a generated plan, but the best version should also consider recent cooking history, repeated main ingredients, repeated cooking methods, and favorite frequency caps.

7. Daily and weekly nutrition/budget summaries
   - Current day alternatives show useful totals, but the complete feature should show day and week-level totals, confidence, warnings, and missing data.

8. Planner presets
   - Add user-friendly modes that adjust scoring weights without forcing users to tune many controls: Quick, Budget, Healthy, Family Fit, Use Inventory, No Shopping, and More Variety.

9. Unified explanation details
   - Smart Meal Planner has score details, but Cook Now and day/week should share the same explanation model.
   - Every recommendation and generated plan should explain score, warnings, missing data, and tradeoffs.

10. Feedback learning loop
   - Use cooking-session member feedback and optional dismissal feedback to influence future scores.
   - Keep the logic deterministic and inspectable.

11. Missing data quality indicators
   - Show when price, nutrition, unit conversion, inventory, or duration data is incomplete.
   - Missing data should warn and reduce confidence, not crash or silently produce bad results.

## Product Modes

### Cook Now

Purpose: answer "What should I cook right now?"

Inputs:

- Selected household members, defaulting to current selected members.
- Meal slot: any, breakfast, lunch, dinner, or snack.
- Time available.
- Shopping mode: no shopping, small top-up, or normal.
- Max extra spend after inventory.
- Nutrition goal.
- Inventory priority: normal or prefer expiring ingredients.
- Variety preference: familiar, balanced, or more variety.

Required result categories:

- Best overall.
- Fastest.
- Cheapest.
- Uses expiring food.
- Best for household.
- Best nutrition match.
- No-shopping / Ready from inventory.

Required actions:

- Start cooking.
- Schedule meal.
- Add missing ingredients to shopping list.
- Open dish detail.
- View score details.
- Dismiss for now with optional reason.

### Plan Day

Purpose: fill breakfast, lunch, and dinner for one selected date.

Inputs:

- Date.
- Selected household members.
- Daily budget.
- Shopping mode.
- Nutrition goal.
- Max cooking time per meal.
- Required or avoided tags/ingredients.
- Inventory/expiry priority.
- Variety preference.

Behavior:

- Generate multiple daily alternatives.
- Each alternative includes breakfast, lunch, and dinner when possible.
- Score the whole day, not just each dish separately.
- Allow switching between alternatives.
- Allow opening score detail for each meal.
- Preview shopping needs before applying.
- Apply creates or updates scheduled meals for that date.

Day summary should show:

- Total estimated dish cost.
- Need-to-buy cost after inventory.
- Nutrition match.
- Household fit.
- Missing ingredient count.
- Expiring ingredients used.
- Warnings for missing data or hard constraints.

### Plan Week

Purpose: fill seven days of scheduled meals from a start date.

Inputs:

- Start date.
- Selected household members.
- Daily budget and optional weekly budget.
- Shopping mode.
- Nutrition goal.
- Max cooking time per meal.
- Inventory/expiry priority.
- Variety preference.

Behavior:

- Generate seven planned days.
- Avoid repeating the same dish too often.
- Avoid overusing the same main ingredient, protein type, or cooking method when data is available.
- Use expiring inventory early in the week.
- Balance nutrition over the week, while still showing daily fit.
- Show daily alternatives and allow replacing one day before applying.
- Preview combined shopping needs before applying.
- Apply creates scheduled meals for every non-empty day.

Week summary should show:

- Total estimated cost.
- Total need-to-buy cost.
- Average daily budget fit.
- Average nutrition fit.
- Average household fit.
- Repeated dish/protein/method warnings.
- Expiring inventory used.
- Shopping preview grouped by ingredient.

## Hard Constraints

Hard constraints block a dish from recommendation or plan placement:

- Any selected member has an allergy to an ingredient in the dish.
- Any selected member has a hard-excluded ingredient in the dish.
- No-shopping mode is active and required ingredients are missing.
- Strict time mode is active and the dish exceeds max cooking minutes or has no duration data.
- Required meal slot or required tags are configured and the dish does not match.
- Required expiring ingredient mode is active and the dish does not use the required ingredient.

Keep these separate from soft preferences. Allergies and hard exclusions are safety rules, not scoring penalties.

## Soft Scoring Factors

Soft factors rank valid dishes and plan alternatives:

- Household fit: favorites, avoided dishes, favorite ingredients, avoided ingredients, preferred tags, avoided tags, per-member nutrition goal, and portion needs.
- Inventory readiness: available ingredients, missing ingredients, always-available ingredients, and extra shopping required.
- Expiry value: uses ingredients that are urgent or near expiry.
- Budget fit: total estimated cost, need-to-buy cost, cost per serving, and missing price confidence.
- Nutrition fit: selected household goal, individual member goals, and missing nutrition confidence.
- Cooking time and effort: total duration, step count, ingredient count, included sub-dishes, and easy/complex tags when available.
- Variety: recent cooking history, repeated dish penalty, repeated main ingredient/protein penalty, repeated cooking method penalty, and favorite frequency cap.
- Meal-slot fit: breakfast/lunch/dinner/snack tags and duration suitability.

Default weighting:

- Household fit: 25%.
- Inventory readiness and expiry: 20%.
- Nutrition match: 15%.
- Budget fit: 15%.
- Cooking time and effort: 15%.
- Variety: 10%.

Preset weighting:

- Quick increases cooking time/effort.
- Budget increases budget fit.
- Healthy increases nutrition fit.
- Family Fit increases household fit.
- Use Inventory increases inventory and expiry value.
- No Shopping makes inventory availability a hard constraint.
- More Variety increases recent-cooked and repetition penalties.

## Data Model Changes

Extend household member profiles with hard safety fields:

```ts
type HouseholdMemberProfile = {
  allergenIngredientIds: string[];
  hardExcludedIngredientIds: string[];
};
```

Add planner option/result types for the shared engine:

```ts
type SmartPlannerScope = 'cook_now' | 'day' | 'week';
type SmartPlannerMealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
type SmartPlannerShoppingMode = 'no_shopping' | 'small_top_up' | 'normal';
type SmartPlannerVarietyMode = 'familiar' | 'balanced' | 'more_variety';
type SmartPlannerPreset = 'balanced' | 'quick' | 'budget' | 'healthy' | 'family_fit' | 'use_inventory' | 'no_shopping' | 'more_variety';

type SmartPlannerOptions = {
  scope: SmartPlannerScope;
  startDate: string;
  memberIds: string[];
  mealSlots: SmartPlannerMealSlot[];
  dailyBudget?: number;
  weeklyBudget?: number;
  maxCookMinutes?: number;
  strictTime?: boolean;
  shoppingMode: SmartPlannerShoppingMode;
  nutritionGoalId?: string;
  preferExpiring: boolean;
  varietyMode: SmartPlannerVarietyMode;
  preset: SmartPlannerPreset;
  requiredTags: string[];
  avoidedIngredientIds: string[];
  requiredExpiringIngredientIds: string[];
};
```

Use a shared score-detail structure for Cook Now, day alternatives, and week summaries:

```ts
type SmartPlannerScoreDetail = {
  label: string;
  value: string;
  impact: number;
  description: string;
};
```

Recommended output shape:

```ts
type SmartPlannerDishRecommendation = {
  dish: Dishes;
  score: number;
  reasons: string[];
  warnings: string[];
  scoreDetails: SmartPlannerScoreDetail[];
  missingIngredientRows: ShoppingPreviewRow[];
  totalCostLabel?: string;
  needToBuyCostLabel?: string;
  nutritionMatch?: NutritionGoalMatch;
  householdSuitability?: HouseholdDishSuitability;
};

type SmartPlannerDayAlternative = {
  id: string;
  breakfast?: SmartPlannerDishRecommendation;
  lunch?: SmartPlannerDishRecommendation;
  dinner?: SmartPlannerDishRecommendation;
  totalScore: number;
  summary: SmartPlannerPlanSummary;
};

type SmartPlannerPlanResult = {
  cookNowCategories?: Record<string, SmartPlannerDishRecommendation | undefined>;
  rankedRecommendations?: SmartPlannerDishRecommendation[];
  plannedDays?: SmartPlannerPlannedDay[];
  summary: SmartPlannerPlanSummary;
};
```

Only add feedback persistence if existing cooking-session feedback is insufficient:

```ts
type SmartPlannerDismissReason = 'too_expensive' | 'too_slow' | 'not_in_mood' | 'missing_ingredient' | 'other';

type SmartPlannerSuggestionFeedback = {
  id: string;
  dishId: string;
  createdAt: string;
  memberIds: string[];
  scope: SmartPlannerScope;
  reason: SmartPlannerDismissReason;
};
```

## Implementation Plan

### 1. Shared planner engine

- Extract shared scoring from Dish Suggester and Smart Meal Planner into a reusable helper.
- Keep heavy calculations scheduled/deferred so large recipe lists stay responsive.
- Return both individual dish recommendations and composed day/week alternatives.
- Keep all score details available for UI explanation.

### 2. Household safety upgrade

- Add allergy and hard-exclusion fields to household member normalization, reducer actions, selectors, and profile UI.
- Update household suitability logic so allergies/hard exclusions produce hard blocks.
- Keep existing avoided dishes/ingredients/tags as soft preference penalties.

### 3. Cook Now UI

- Add a combined Cook Now mode to Dish Suggester or a dedicated route.
- Show category cards for the seven required categories.
- Show a ranked recommendation list below the category cards.
- Add actions: Start cooking, Schedule meal, Add missing ingredients, Detail, Dismiss.

### 4. Day/week planner UI

- Update Smart Meal Planner to use the shared engine.
- Keep day/week segmented control.
- Keep daily alternatives and shopping preview.
- Add week-level summary, variety warnings, and missing-data indicators.
- Allow selecting alternatives before applying.

### 5. Scheduled meal creation

- Cook Now Schedule action asks for date and meal slot, then creates or appends to that date's scheduled meal.
- Plan Day Apply creates one scheduled meal for the selected date.
- Plan Week Apply creates one scheduled meal for each non-empty planned day.
- All scheduled meals must include `dishServings` calculated from selected member portion preferences.
- If a scheduled meal already exists for a date, append to the matching slot instead of silently creating duplicate conflicting entries, unless the user explicitly chooses to create a separate plan.

### 6. Shopping follow-through

- Reuse the current shopping preview for day/week plans.
- Cook Now should expose Add missing ingredients from a single recommendation.
- Day/week shopping preview should group missing rows across selected alternatives.
- Need-to-buy cost must be calculated after subtracting current inventory.

### 7. Feedback and variety

- Derive recent-cooked history from scheduled/cooking sessions where available.
- Penalize recently cooked dishes in Cook Now and week planning.
- Use member cooking feedback to boost or reduce future household fit.
- Add optional dismissal feedback only if needed for useful learning.

## UI Acceptance Criteria

- A user can choose Cook Now, Plan Day, or Plan Week from the planner experience.
- Cook Now shows the seven required recommendation categories.
- Cook Now can schedule one suggestion into a selected date and meal slot.
- Plan Day fills breakfast, lunch, and dinner for one date and can apply them to scheduled meals.
- Plan Week fills seven days and can apply all non-empty days to scheduled meals.
- Day/week results show alternatives before applying.
- The user can preview combined shopping needs before applying day/week plans.
- Every recommendation or planned meal has an explanation of score, warnings, and missing data.
- Allergies and hard exclusions never appear in recommendations for selected members.
- No-shopping mode only recommends or plans dishes that can be cooked from available required inventory.

## Test Plan

### Scoring and constraints

- Allergens block dishes completely.
- Hard-excluded ingredients block dishes completely.
- Avoided ingredients reduce score but do not block.
- No-shopping mode excludes dishes with missing required ingredients.
- Strict time mode excludes dishes over the selected max.
- Cheapest category uses extra shopping cost, not total dish cost.
- Uses-expiring category prefers dishes that consume urgent inventory.
- Best-household category prefers higher household suitability.
- Best-nutrition category prefers stronger nutrition goal match.
- Recent-cooked penalty lowers repeated dishes.
- Missing price/nutrition/conversion data creates warnings and does not crash.

### Cook Now flows

- Cook Now loads with defaults and produces recommendations.
- The seven category cards are visible when data allows.
- Score details open from a recommendation.
- Start cooking works from a recommendation.
- Schedule meal creates or appends to a scheduled meal with correct slot and servings.
- Add missing ingredients opens or creates a shopping list path.
- Empty state explains when all dishes are blocked.

### Day/week flows

- Plan Day generates breakfast/lunch/dinner alternatives.
- Plan Day applies a selected alternative to one `ScheduledMeal` entry.
- Plan Week generates seven planned days.
- Plan Week applies selected alternatives to scheduled meals for every non-empty day.
- Selected alternatives are preserved when applying.
- Shopping preview groups missing ingredients across the selected plan.
- Household member portion preferences produce correct `dishServings`.
- Week planning avoids repeated dishes where enough candidates exist.

### Verification commands

- `git diff --check`
- `yarn build`
- Relevant Playwright/e2e tests if available in the branch.
- Performance regression checks for large dish/inventory lists if planner scoring changes hot paths.

## Implementation Defaults

- The complete feature must support Cook Now, Plan Day, and Plan Week.
- Reuse the existing Smart Meal Planner and Scheduled Meal model instead of creating a separate scheduling system.
- Keep the app local-first and browser-only.
- Keep scoring deterministic, inspectable, and explainable.
- Add new persistence only when existing app-context, scheduled-meal, or cooking-session state is insufficient.
- Do not remove existing Dish Suggester modes or scheduled meal workflows while adding the unified planner.
