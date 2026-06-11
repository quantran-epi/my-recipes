# Meal-finish feedback + per-slot completion

**Date:** 2026-06-11
**Slug:** 260611-mfb

## Problem

Two design mismatches in the household-feedback feature:

1. **Feedback is collected at the wrong moment.** The "Mọi người thấy sao?" prompt lives in
   `FinishCooking.widget.tsx` — it fires when the *cooking session* ends, before anyone has
   eaten. Reactions belong at meal-completion time (after eating), not when the stove turns off.

2. **Completion granularity is whole-day.** "Hoàn tất bữa" passes `allDishIds` (every dish across
   breakfast + lunch + dinner) to `MealCompletionLeftoverModal`. A household eats the three slots
   at different times with different leftovers and different reactions. Completion should be
   per-slot (breakfast / lunch / dinner).

### Bonus bug

Feedback is stored on `session.memberFeedback`. `clearCookingHistory` deletes finished sessions,
silently wiping all saved feedback and its planner influence. `cookTimeStats` was deliberately
pulled out of the session list to survive that wipe (`CookingSession.ts:30-39`); feedback never was.

## Decision

- Move feedback collection from cooking-finish to meal-completion, collected **per dish**
  (the planner keys feedback by `dishId`, so per-dish keying must be preserved).
- Store feedback in a **durable per-dish store** (`DishFeedbackStat`), sibling to `cookTimeStats`,
  decoupled from cooking sessions entirely. This fixes the history-clear data loss.
- Make completion **per-slot**: each `MealRow` gets its own complete action passing that slot's
  `dishIds`. Whole-day completion stays as a convenience.
- Planner's `getFeedbackImpact` reads the new store, with a fallback that still folds in legacy
  `session.memberFeedback` so existing data isn't lost on upgrade.

## Implementation steps

1. **Durable store** — `CookingSession.ts`: add `DishFeedbackStat` type
   (`dishId`, `liked`, `neutral`, `disliked` counts, `updatedAt`). `CookingSessionReducer.ts`:
   add `dishFeedback: Record<string, DishFeedbackStat>` to state + `recordDishFeedback` reducer
   (increments counts). `Selectors.ts`: add `selectDishFeedback`.

2. **Completion modal** — `ScheduledMealCooking.widget.tsx` `MealCompletionLeftoverModal`:
   add per-dish per-member feedback selects (reuse the liked/neutral/disliked UI from
   `FinishCooking.widget.tsx`); on `_save`, dispatch `recordDishFeedback` per dish.

3. **Per-slot wiring** — `ScheduledMealList.screen.tsx`: add `completionScope` state (mirror
   `cookingScope`), per-slot complete menu items, pass slot `dishIds` to the modal.

4. **Remove old feedback block** — `FinishCooking.widget.tsx`: drop the "Mọi người thấy sao?"
   section and its `setCookingMemberFeedback` dispatch.

5. **Planner read path** — `SmartPlannerEngine.ts`: add `dishFeedback` to `BuildSmartPlannerInput`;
   rewrite `getFeedbackImpact` to read store counts, falling back to legacy session feedback.
   `SmartMealPlanner.screen.tsx`: select and pass `dishFeedback`.

6. **Verify** — `npx tsc --noEmit`, fix errors, commit. (Push is blocked by the corporate proxy;
   the user runs the push.)

## Files touched

- `src/Store/Models/CookingSession.ts`
- `src/Store/Reducers/CookingSessionReducer.ts`
- `src/Store/Selectors.ts`
- `src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx`
- `src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx`
- `src/Modules/Dishes/Screens/FinishCooking.widget.tsx`
- `src/Modules/ScheduledMeal/Helpers/SmartPlannerEngine.ts`
- `src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx`
