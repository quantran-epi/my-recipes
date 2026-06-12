# Smart Planner Advanced Activation, Meal Ranges, and Priority Behavior Plan

**Date:** 2026-06-12
**Status:** Draft for review
**Scope:** Plan only. No app behavior changes in this file.

## User Requirements

1. Advanced section needs an activation switch. When unchecked, Smart Planner must ignore every advanced setting.
2. For day/week planning, before generating a plan, show a modal where the user chooses how many dishes each meal slot should have, as min/max ranges. Example: breakfast min 2, max 4 dishes. The engine should randomize within that range.
3. Quick priority choices should mean:
   - Saving: prioritize dishes that need the least extra buying, or lowest dish cost.
   - Quick: prioritize lowest duration.
   - Healthy: prioritize dishes matching household/member nutrition preferences.
   - Household taste: prioritize household profile and feedback match.
   - Inventory: prioritize dishes that use many currently available ingredients, especially ingredients near expiry.
   - Variety: prioritize dishes not used recently and reduce repeats within a day/week.
4. Advanced section should be simplified to only:
   - Daily budget
   - Weekly budget
   - Buy-more maximum
   - Use inventory data switch
   - Explicit exclusions
5. Clarify whether shopping and nutrition goal controls conflict with Saving or Household Taste.

## Current Code Baseline

- Screen: `src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx`
- Engine: `src/Modules/ScheduledMeal/Helpers/SmartPlannerEngine.ts`
- Current advanced values are always passed into `SmartPlannerEngine.buildSmartPlannerResult`.
- Hard exclusions are partially gated by `hardConstraintsEnabled`, but budget, max extra spend, inventory-aware budget, shopping mode, nutrition goal, and max cook minutes are still active even when the advanced collapse is not being used.
- Current day/week output supports one `PlannedDish` per slot: `breakfast`, `lunch`, `dinner`.
- Existing scheduled meal save already supports arrays of dish IDs per slot, so persistence can support multiple dishes once the planner output shape is expanded.
- Existing priority weighting supports multiple selected priorities. Empty selection means balanced scoring.

## Product Decision: Shopping and Nutrition Conflict

They should not conflict if the UI is simplified this way:

- Remove the separate advanced `shoppingMode` control from day/week planning. Saving becomes the user-facing shopping/cost intent.
- Saving should use the `use inventory data` switch:
  - On: rank by lowest extra buying / least missing ingredients / lowest `shoppingCostAverage`.
  - Off: rank by lowest full dish cost / lowest `costAverage`.
- Nutrition goal should not be an advanced standalone control. Healthy should use member nutrition preferences first.
- Healthy and Household Taste are separate scoring dimensions:
  - Healthy: nutrition targets from selected members, falling back to the shared/default nutrition goal if needed.
  - Household Taste: favorites, avoided dishes/tags/ingredients, suitability, allergies, and saved feedback.
- If the user selects both Healthy and Household Taste, combine both weights. There is no conflict; the engine should score for both.
- Safety constraints from household profiles, especially allergies or hard-blocked ingredients, should remain active even when advanced is disabled.

## Proposed UX

### Main Controls

- Keep scope selector: Cook Now / One Day / One Week.
- Keep date and household member selectors.
- Keep priority buttons as the primary way to express intent.
- Rename priority labels if needed:
  - `Saving`
  - `Quick`
  - `Healthy`
  - `Household Taste`
  - `Inventory`
  - `Variety`

### Advanced Section

- Add an activation row at the top of the advanced card:
  - Label: `Use advanced settings`
  - Switch off by default.
- When off:
  - The advanced body can stay collapsed/disabled visually.
  - The engine receives default/neutral values for all advanced-only inputs.
  - Explicit exclusions are empty.
  - Daily/weekly budget and buy-more max do not constrain or score.
- Inventory data switch does not affect budget scoring unless Inventory or Saving priorities use inventory availability. Inventory priority still means using available and near-expiry ingredients, not simply choosing the cheapest dish.
- When on, show only:
  - Daily budget
  - Weekly budget, only for week scope
  - Buy-more maximum
  - Use inventory data switch
  - Explicit exclusions: ingredient exclusions only

### Meal Count Range Modal

- Applies only to One Day and One Week scopes.
- Trigger flow:
  - User clicks `Gợi ý thực đơn`.
  - If scope is `day` or `week`, open `Meal count ranges` modal before running the engine.
  - User confirms ranges, then suggestions generate.
  - Cook Now skips this modal.
- Modal controls:
  - Breakfast min/max dishes
  - Lunch min/max dishes
  - Dinner min/max dishes
- Use paired `InputNumber` controls or a compact local number-range component. Ant Design does not provide a true numeric range picker for this use case, so paired inputs are clearer.
- Validation:
  - Min >= 0
  - Max >= min
  - Max should be capped, recommended cap: 6 per slot to avoid combinatorial blowups.
  - At least one meal slot must have max > 0.
- Default ranges:
  - Breakfast: 1-1
  - Lunch: 1-1
  - Dinner: 1-1
- Randomization:
  - For every generated day and slot, randomly choose a target count between min and max inclusive.
  - Fill that slot with that many unique ranked dishes when enough candidates exist.
  - If there are not enough viable dishes, fill as many as possible and show a warning in the plan summary.

## Engine Design

### Types

Add:

```ts
export type SmartPlannerMealSlotDishRange = {
    min: number;
    max: number;
}

export type SmartPlannerMealSlotDishRanges = Record<PlannerMealSlot, SmartPlannerMealSlotDishRange>;
```

Extend `BuildSmartPlannerInput`:

```ts
advancedEnabled?: boolean;
mealSlotDishRanges?: SmartPlannerMealSlotDishRanges;
```

Refactor day/week output from one dish per slot to arrays:

```ts
type SmartPlannerDayItemsBySlot = Record<PlannerMealSlot, PlannedDish[]>;
```

For compatibility during migration, keep helper methods that expose the first item where older UI code still expects `day.breakfast`, `day.lunch`, or `day.dinner`, then remove those old fields once all render/save paths are updated.

### Advanced Gate

Create a small normalizer before calling/scoring:

```ts
const effectiveAdvanced = input.advancedEnabled ? input : neutralAdvancedInput;
```

When `advancedEnabled` is false:

- `dailyBudget`, `weeklyBudget`, `maxExtraSpend`: undefined for scoring/constraints.
- `inventoryAwareBudget`: true can remain as a display default, but must not activate budget scoring by itself.
- `avoidedIngredientIds`: empty.
- `requiredTags`, `requiredExpiringIngredientIds`, `shoppingMode`, and `maxCookMinutes`: remove from the day/week advanced UI and keep neutral in engine input.
- Household hard safety blocks stay active separately.

### Priority Weights

Update `SmartPlannerPriority` semantics and labels. Current internal names can stay if mapping is clear:

- `budget` -> Saving
- `time` -> Quick
- `nutrition` -> Healthy
- `household` -> Household Taste
- `inventory` -> Inventory
- `variety` -> Variety

Weight behavior:

- If no priority is selected, keep balanced default.
- If one or more priorities are selected, only those primary dimensions get material weight, with the current small variety floor retained to prevent obvious duplicates.
- Saving should score using:
  - Missing ingredient count
  - Extra shopping cost when inventory data is on
  - Total cost when inventory data is off
  - Buy-more maximum only when advanced is on
- Inventory should score using availability ratio and near-expiry usage, not primarily price. Dishes that use more in-stock ingredients and consume urgent/near-expiry inventory should rise above dishes that merely have low cost.
- Healthy should score against nutrition preferences from selected members. If selected members have no goal, use app/shared selected nutrition fallback.
- Household Taste should score using household suitability and saved dish feedback, not nutrition unless member profile suitability already includes member-specific nutrition preferences.

### Multiple Dishes Per Slot

Replace the current triple nested combo builder:

```ts
breakfastCandidates x lunchCandidates x dinnerCandidates
```

with a bounded slot sampler:

1. Build candidates per slot using existing `buildRecommendations`.
2. For each day alternative:
   - Randomize target count for each slot from configured min/max.
   - Select top-weighted candidates for each slot, excluding dishes already used in that day unless duplicate fallback is needed.
   - Update `UsageContext` after a day is picked so week variety can penalize future days.
3. Generate `ALTERNATIVE_COUNT` alternatives without exploding combinations.

This avoids combinatorial growth when breakfast can have 2-4 dishes, because exhaustive combinations would become too expensive.

### Shuffle Variety Alternatives

Current behavior in `SmartPlannerEngine.ts` already anchors the best combo first, but the sampled alternatives come from `pool.slice(1, SHUFFLE_POOL_LIMIT)` with score-weighted odds and then the final list is sorted by score again. In practice this pulls the shuffled result back toward the same top-ranked combinations, so a shuffle can look almost identical to the original suggestion.

Required behavior:

- Keep the best matched plan as the first alternative every time.
- Shuffle only the remaining alternatives, and treat shuffle as a variety action rather than a second “best score” sort.
- The remaining alternatives should intentionally come from lower matched, still-viable combinations, not just the next highest score cluster.
- Do not let shuffled alternatives outrank or replace the best plan.
- Preserve the sampled order after the best plan instead of sorting the whole alternative list by score again.
- Show the lower matched percentage honestly on those alternatives; they are options, not replacements for the best plan.
- Prefer alternatives that are visibly different from the best plan: different dish IDs first, then different primary ingredients, cooking methods/tags, cost profile, and household/nutrition tradeoffs.

Proposed algorithm:

1. Build and sort the full viable combination pool by score.
2. Set `best = pool[0]` and always place it at `alternatives[0]`.
3. Build a shuffle pool from lower-ranked bands instead of only `pool.slice(1, SHUFFLE_POOL_LIMIT)`:
   - Skip exact duplicate keys.
   - Prefer combinations below the top score band, for example lower than `best.score - 3` or outside the top 20% of pool rank.
   - Keep a quality floor, for example no lower than `best.score - 25`, so alternatives are different but not bad.
   - If the filtered pool is too small, gradually relax the rank/score gap before falling back to the near-top pool.
4. Sample alternatives with a mixed weight:
   - Higher score still helps.
   - Variety from the best plan has explicit weight, measured by different dish IDs, lower ingredient overlap, different method/tag overlap, and different slot composition.
   - Recent duplicate penalties still apply.
5. Return `[best, ...sampledAlternatives]` without re-sorting the sampled alternatives.

Implementation note:

```ts
const selected = [best, ...sampled];
return selected.map((combo, index) => buildAlternative(combo.itemsBySlot, index, input));
```

The non-shuffle path can still return the top `ALTERNATIVE_COUNT` sorted alternatives. Only the shuffle path should preserve sampled order after the best plan.

### Save Plan Flow

Update the save path in `SmartMealPlanner.screen.tsx`:

- `_appendToScheduledMeal` should receive `Record<MealSlot, PlannedDish[]>` instead of `Partial<Record<MealSlot, PlannedDish>>`.
- Existing scheduled meal arrays should append all planned dish IDs for each slot.
- Dish serving defaults should be generated for every dish ID in each slot.
- Shopping preview aggregation should aggregate all slot items, not first item only.

## Implementation Steps

1. Add Smart Planner range and advanced types in `SmartPlannerEngine.ts`.
2. Add screen state in `SmartMealPlanner.screen.tsx`:
   - `advancedEnabled`
   - `mealSlotDishRanges`
   - `mealRangeModalOpen`
3. Simplify the advanced UI:
   - Add activation switch.
   - Remove shopping mode, nutrition goal, required tags, required expiring ingredients, and max cook time from visible advanced controls for day/week.
   - Keep explicit ingredient exclusions.
4. Implement `getEffectivePlannerInput` or equivalent in the screen/engine boundary so disabled advanced settings are truly ignored.
5. Add the meal count range modal for day/week generation.
6. Refactor planned day/alternative data structures to support arrays per slot.
7. Replace day alternative generation with bounded per-slot sampling.
8. Fix shuffle behavior:
   - Anchor the best plan first.
   - Sample lower matched but viable alternatives from score/rank bands.
   - Preserve sampled order after the best plan.
   - Add variety weighting so alternatives visibly differ from the original suggestion by dish, ingredient overlap, method/tag overlap, and slot composition.
9. Update rendering:
   - Day cards show multiple dishes per breakfast/lunch/dinner.
   - Detail modal can still open for each individual dish.
   - Alternative cards summarize all dishes.
10. Update save/schedule/shopping preview aggregation to use all dishes per slot.
11. Update score detail copy so Saving, Quick, Healthy, Household Taste, Inventory, and Variety explain the exact behavior above.
12. Run verification.

## Verification Plan

- `yarn build`
- Manual browser checks:
  - Advanced off: changing advanced values does not alter result inputs after regeneration.
  - Advanced on: daily budget, weekly budget, buy-more maximum, inventory switch, and exclusions affect results.
  - Day range example breakfast 2-4 creates breakfast slots with 2, 3, or 4 dishes across repeated generations.
  - Shuffle keeps the best matched plan first.
  - Shuffle changes the lower alternatives across repeated clicks, with visibly different dish combinations and lower displayed match percentages where appropriate.
  - Shuffle does not replace the top plan with a lower-quality plan.
  - Week plan avoids repeating dishes across days when Variety is selected.
  - Saving with inventory on prefers lower extra-buying options.
  - Saving with inventory off prefers lower total-cost options.
  - Inventory prefers dishes that use available ingredients and near-expiry inventory, even when they are not the absolute cheapest option.
  - Quick prefers shorter duration dishes.
  - Healthy prefers selected members' nutrition preferences.
  - Household Taste prefers household suitability and feedback.
  - Saving plus Household Taste combines both, with neither control hiding the other.

## Risks

- Multiple dishes per slot is a real model refactor. It touches engine output, planner rendering, scheduling, shopping preview, and save paths.
- Exhaustive combinations will not scale with range counts, so the implementation should use bounded sampling rather than nested cartesian products.
- Removing visible nutrition goal selection means Healthy needs a clear fallback source from member profiles/shared nutrition goals. If no member has a nutrition goal, the UI should show that Healthy has limited data.
- Advanced-off behavior must be enforced at the engine input layer, not only by hiding the UI.

## Open Review Questions

1. Should priority buttons remain multi-select, or should they behave as single-choice presets?
2. Should default meal ranges stay 1-1 for all slots, or should breakfast/lunch/dinner have different defaults?
3. Should explicit exclusions include only ingredients, or also dish tags? Your current wording says explicit exclusion, so this plan assumes ingredient exclusions only.
4. When a slot range min is 0, should the UI allow that meal to be skipped entirely?
