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

### Bonus bugs

1. Feedback is stored on `session.memberFeedback`. `clearCookingHistory` deletes finished
   sessions, silently wiping all saved feedback and its planner influence. `cookTimeStats` was
   deliberately pulled out of the session list to survive that wipe (`CookingSession.ts`); feedback
   never was.
2. The Gist backup (`useGistBackup.ts`) only serialized `cookingSession.sessions`, dropping
   `cookTimeStats` (pre-existing) and the new `dishFeedback`. On restore/pull the whole personal
   root is replaced, so both durable stores were wiped across a device restore. The "durable" store
   wasn't actually durable until this was fixed.

## Decision

- Move feedback collection from cooking-finish to meal-completion, collected **per dish per member**
  (the planner keys feedback by `dishId` and scopes to selected members, so both must be preserved).
- Store feedback in a **durable per-dish store** (`DishFeedbackStat`), sibling to `cookTimeStats`,
  decoupled from cooking sessions entirely. Tallies are kept **per member**
  (`members: Record<memberId, {liked, neutral, disliked}>`) so the planner can scope to the
  currently selected household members. This fixes the history-clear data loss.
- Make completion **per-slot**: each slot (breakfast / lunch / dinner) gets its own complete action
  passing that slot's `dishIds`, via a `completionScope` mirroring `cookingScope`.
- Planner's `getFeedbackImpact` reads the new store scoped to selected members, with a fallback that
  still folds in legacy `session.memberFeedback` so existing data isn't lost on upgrade.
- Fix the Gist backup to serialize the full `cookingSession` slice (sessions + cookTimeStats +
  dishFeedback) so the durable stores survive a device restore.

## Implementation steps

1. **Durable store** — `CookingSession.ts`: add `MemberFeedbackTally` and `DishFeedbackStat`
   (`dishId`, `members: Record<memberId, tally>`, `updatedAt`). `CookingSessionReducer.ts`:
   add `dishFeedback: Record<string, DishFeedbackStat>` to state + `recordDishFeedback` reducer
   (takes `dishId` + `memberId`, accumulates into the per-member tally). `Selectors.ts`:
   add `selectDishFeedback`.

2. **Completion modal** — `ScheduledMealCooking.widget.tsx` `MealCompletionLeftoverModal`:
   add per-dish per-member feedback selects (reuse the liked/neutral/disliked UI from
   `FinishCooking.widget.tsx`); on `_save`, dispatch `recordDishFeedback` per dish per member.

3. **Per-slot wiring** — `ScheduledMealList.screen.tsx`: add `completionScope` state (mirror
   `cookingScope`), per-slot complete menu items, pass slot `dishIds` to the modal.

4. **Remove old feedback block** — `FinishCooking.widget.tsx`: drop the "Mọi người thấy sao?"
   section and its `setCookingMemberFeedback` dispatch + now-unused imports.

5. **Planner read path** — `SmartPlannerEngine.ts`: add `dishFeedback` to `BuildSmartPlannerInput`;
   rewrite `getFeedbackImpact` to read per-member tallies scoped to `memberIds`, falling back to
   legacy session feedback. `SmartMealPlanner.screen.tsx`: select and pass `dishFeedback`.

6. **Backup fix** — `useGistBackup.ts`: include `cookTimeStats` + `dishFeedback` in the
   `cookingSession` backup slice and in `emptyPersonalSlice`, so the durable stores survive a
   restore.

7. **Verify** — `npx tsc --noEmit`, fix errors, commit. (Push is blocked by the corporate proxy;
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
- `src/Hooks/useGistBackup.ts`
