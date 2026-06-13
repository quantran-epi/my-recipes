---
phase: quick-260613-ea9
plan: 01
subsystem: dishes-and-scheduled-meals
tags: [inventory, leftovers, cooking, redux, ui]
requires:
  - LeftoverTrackerItem model and appContext persist slice
  - DishServingHelper.normalizeTargetServings / getBaseServings
provides:
  - DishServingKind discriminator ('fresh' | 'leftover') on LeftoverTrackerItem
  - consumeDishServings reducer (oldest-eatBy-first, clamps at available stock)
  - selectAvailableServingsByDishKind selector (per-dish fresh/leftover totals)
  - fresh-serving production at cook finish
  - kind-aware serving consumption at meal completion
affects:
  - src/Store/Reducers/AppContextReducer.ts
  - src/Store/Selectors.ts
  - src/Modules/Dishes/Screens/FinishCooking.widget.tsx
  - src/Modules/ScheduledMeal/Screens/LeftoverManagement.screen.tsx
  - src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx
tech-stack:
  added: []
  patterns:
    - Extend existing persist model with optional discriminator instead of new slice
    - normalizeKind treats absent kind as 'leftover' for back-compat (no migration)
key-files:
  created: []
  modified:
    - src/Store/Reducers/AppContextReducer.ts
    - src/Store/Selectors.ts
    - src/Modules/Dishes/Screens/FinishCooking.widget.tsx
    - src/Modules/ScheduledMeal/Screens/LeftoverManagement.screen.tsx
    - src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx
    - src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx
decisions:
  - Reuse LeftoverTrackerItem with a kind discriminator rather than a parallel persist slice
  - Pass dishServings into MealCompletionLeftoverModal so consume-count defaults match planned servings
metrics:
  duration: 18m
  completed: 2026-06-13
---

# Quick Task 260613-ea9: Dish Serving Inventory with Fresh vs Leftover Summary

Adds a dish serving inventory that separates FRESH cooked servings from existing LEFTOVER servings by extending the existing `LeftoverTrackerItem` model with a `kind` discriminator, producing fresh servings on cook finish, and drawing the right stock down (with a kind chooser when both exist) at meal completion.

## What Was Built

### Task 1 — Store: kind discriminator + consumption action
- Added `export type DishServingKind = 'fresh' | 'leftover'` and an optional `kind?: DishServingKind` field on `LeftoverTrackerItem`.
- Added module-level `export const normalizeKind` that maps anything other than `'fresh'` to `'leftover'` (so existing records with no kind behave as leftover — no migration).
- `addLeftoverTrackerItem` now persists `kind: normalizeKind(action.payload.kind)`; existing portions normalization and `status: 'available'` behavior unchanged.
- New `consumeDishServings({ dishId, portions, kind })` reducer: normalizes portions, iterates available items of that dishId+kind oldest-eatBy-first (sorting a copy by `eatBy ?? storedAt`), deducts in place via Immer, flips items to `status: 'finished'` at 0, never goes negative, and stops once the request is satisfied.
- Added `selectAvailableServingsByDishKind` selector returning a `Map<string, { fresh: number; leftover: number }>` summing available portions per dish bucketed by kind.

### Task 2 — Fresh production on finish + management UI labels
- `FinishCooking.widget.tsx`: on `_onFinish`, after inventory deduction and cook-time recording, computes `producedServings = normalizeTargetServings(session.targetServings, getBaseServings(dish))` and dispatches `addLeftoverTrackerItem({ ..., kind: 'fresh', portions: producedServings, cookingSessionId: session.id })` only when `producedServings > 0`. No `eatBy` is set for fresh servings. Added a Vietnamese summary line "Đã thêm {producedServings} phần mới nấu vào kho phần ăn".
- `LeftoverManagement.screen.tsx`: each row now shows a kind tag ("Mới nấu" / "Phần dư"), and a new kind `Segmented` filter (Tất cả / Mới nấu / Phần dư) sits alongside the existing status filter. Classification uses `item.kind === 'fresh' ? 'fresh' : 'leftover'`, so missing kind reads as leftover.

### Task 3 — Kind-aware consumption at meal completion
- `ScheduledMealCooking.widget.tsx` (`MealCompletionLeftoverModal`): reads `selectAvailableServingsByDishKind`, tracks per-dish `consumeKind` and `consumeCount` state, initialized in the open-effect (prefers fresh when both exist, count defaulted to `min(available, dishServings?.[dishId] ?? base servings)`).
- Renders a "Dùng từ kho phần ăn" block per dish that has stock: a `Segmented` chooser when both fresh and leftover exist, a static `Tag` label when only one kind exists, plus an `InputNumber` (min 0, max = available of chosen kind, step 0.5) clamped on change.
- `_save` dispatches `consumeDishServings` per dish with a chosen kind and positive count (capped at stock), and reports the consumed total in the success message.
- Added `dishServings` as an optional prop to `MealCompletionLeftoverModal`; passed `item.dishServings` from `ScheduledMealList.screen.tsx` and `dishServings` from the parent cooking modal so consume defaults match planned servings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `dishServings` prop to `MealCompletionLeftoverModal`**
- **Found during:** Task 3
- **Issue:** The plan's consume-count default references `dishServings?.[dishId]`, but `MealCompletionLeftoverModal` did not receive a `dishServings` prop, so the value was unavailable in scope.
- **Fix:** Added optional `dishServings?: Record<string, number>` to the component props and threaded it from both call sites (`ScheduledMealCooking.widget.tsx` parent modal and `ScheduledMealList.screen.tsx`). Falls back to `DishServingHelper.getBaseServings(dish)` when absent.
- **Files modified:** src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx, src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx
- **Commit:** c0f461b5

## Verification

- `node_modules/.bin/tsc --noEmit -p tsconfig.json` passes cleanly after each task.
- grep markers confirmed: `consumeDishServings` and `selectAvailableServingsByDishKind` present in store and consuming widget; `kind: 'fresh'` in FinishCooking; "Mới nấu" label in LeftoverManagement.
- Manual smoke (UI) not run here — no dev server in this environment; covered by plan's manual verification steps.

## Commits

- ac91a175: feat(quick-260613-ea9-01): add fresh/leftover kind and serving consumption to store
- abbb2f20: feat(quick-260613-ea9-02): produce fresh servings on cook finish and label kinds in inventory
- c0f461b5: feat(quick-260613-ea9-03): consume servings at meal completion with kind selection

## Self-Check: PASSED
