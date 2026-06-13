---
phase: quick-260613-iqz
plan: 01
subsystem: ScheduledMeal / Dishes / Templates
tags: [cooking-session, member-picker, planned-vs-reality, leftover, smart-planner-templates, deploy]
requires:
  - ScheduledMeal model / reducer
  - selectHouseholdMembers selector
  - SmartPlannerTemplate management UI
provides:
  - HouseholdMemberPicker shared component
  - ScheduledMeal.actualMeals + setMealSlotActual
  - SmartPlannerTemplatesManager extracted component
affects:
  - Cooking start flows (both paths)
  - Meal completion / leftover modal
  - Reuse-template page (Templates.screen)
  - Drawer navigation (MasterPage)
tech-stack:
  added: []
  patterns: [inline-styles, antd, redux-toolkit, vietnamese-labels]
key-files:
  created:
    - src/Modules/ScheduledMeal/Components/HouseholdMemberPicker.tsx
  modified:
    - src/Modules/Dishes/Screens/CookingSession.widget.tsx
    - src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx
    - src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx
    - src/Store/Models/ScheduledMeal.ts
    - src/Store/Reducers/ScheduledMealReducer.ts
    - src/Modules/ScheduledMeal/Screens/ScheduledMealAdd.widget.tsx
    - src/Modules/ScheduledMeal/Screens/ScheduledMealEdit.widget.tsx
    - src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx
    - src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx
    - src/Modules/Home/Screens/Templates.screen.tsx
    - src/Routing/MasterPage.tsx
decisions:
  - Task 2 was a verify-only confirmation; no auto-mark coupling existed, so no code change was made.
  - actualMeals recorded only when user picks "other" and the dish set differs from plan.
metrics:
  duration: ~35m
  completed: 2026-06-13
---

# Phase quick-260613-iqz Plan 01: Cooking-session member prompt, planned-vs-reality, template consolidation Summary

Prompts for who is cooking at both session-start paths, decouples finish from mark-done (verified, already correct), opens the finish modal at zero servings and records planned-vs-reality eaten dishes, redesigns dish-tag-count template slot items full-width with icons, moves template management into the reuse-template page, and deploys the build.

## What was built

- **Task 1 (FEAT-1):** New shared `HouseholdMemberPicker` (reads full roster via `selectHouseholdMembers`, antd multi-select, "Ai nấu?" placeholder, empty-roster fallback). Wired into `CookingSession.widget` (prep path) with `cookMemberIds` state pre-filled from the global selection and re-synced on `dish.id` change; `_onStartCooking` now dispatches `householdMemberIds: cookMemberIds`. Wired into `ScheduledMealCookingModal` with modal-level `cookMemberIds` (reset on open), rendered above the dish list; `_startDish` dispatches the chosen ids.
- **Task 2 (FEAT-2):** Confirmed no finish-driven auto-mark exists. `setMealSlotCooked` is dispatched only by the manual per-slot Switch (`ScheduledMealList.screen.tsx`). `FinishCooking.widget` and `useCookingTimer` contain no `setMealSlotCooked` dispatch. No functional change made; model field and reducer left intact.
- **Task 3 (FEAT-3):** Removed the `_slotHasAvailableServings` clause from the three `complete-*` menu `disabled` expressions (and removed the now-unused helper). Added `ScheduledMealActualRecord` type and `actualMeals` field to the model; added `setMealSlotActual` reducer + export; registered `actualMeals` as `noMarkup` in Add/Edit widgets. Added a "Thực tế đã ăn" `Segmented` (planned vs other) in the completion modal with an other-dish multi-select sourced from in-stock servings + available leftover items, plus a note. `_save` dispatches `setMealSlotActual` only when "other" differs from plan and calls `eatLeftoverServings` for matched leftover items. `MealRow` shows a gold "Thực tế khác kế hoạch" tag with actual dish names when actual differs from planned.
- **Task 4 (FEAT-4):** Redesigned `TemplateDetail` and the edit-modal slot rows in `SmartPlannerTemplates.screen` to full width (`width: 100%`, `boxSizing: border-box`, parent Stack `align='stretch'`) with leading meal-time icons (`CoffeeOutlined`/`ClockCircleOutlined`/`RestOutlined`) tinted by slot tone, `NumberOutlined` count tag, `TagsOutlined` requirement chips. Applied the same full-width + icon treatment to `renderTemplateDetail` in `SmartMealPlanner.screen`.
- **Task 5 (FEAT-5):** Extracted `SmartPlannerTemplatesManager` (list + create/edit modal + handlers, no page hero). `SmartPlannerTemplatesScreen` now renders the hero plus the manager so the standalone route still works. Added a "Mẫu số món" section to `Templates.screen` after "Mẫu mua sắm" hosting the manager. Removed the `dishCountTemplates` drawer item from `MasterPage`. Route registration left intact.
- **Task 6 (FEAT-6):** `yarn build` succeeded; build output copied into `docs/` (manifest.json preserved). Stale `main.fe1ae3b7.js` bundle removed from `docs/static/js`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused `_slotHasAvailableServings` helper**
- **Found during:** Task 3
- **Issue:** After removing the open-gate from the three menu items, the helper became unused, which would trip the no-unused-vars lint/type check.
- **Fix:** Removed the helper definition (plan explicitly allowed this).
- **Files modified:** src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx
- **Commit:** ff4d939b

**2. [Rule 3 - Blocking] Removed stale hashed bundle in docs/static/js**
- **Found during:** Task 6
- **Issue:** A previous deploy left `main.fe1ae3b7.js` (+ its `.LICENSE.txt`) which would otherwise accumulate alongside the new `main.f524d0ee.js`.
- **Fix:** Synced `docs/static/` with the new build output, deleting stale assets scoped to that artifacts-only directory (rest of `docs/` untouched, manifest.json preserved).
- **Commit:** de6e3810

## Authentication Gates

None.

## Verification

- `yarn tsc --noEmit -p tsconfig.json`: 0 errors (whole project).
- Per-task automated verify commands: all passed.
- `yarn build`: compiled successfully; `docs/static/js/main.f524d0ee.js` deployed.

## Known Stubs

None.

## Self-Check: PASSED

- src/Modules/ScheduledMeal/Components/HouseholdMemberPicker.tsx — FOUND
- docs/static/js/main.f524d0ee.js — FOUND
- Commits bfa10e43, ff4d939b, 7d6f3a46, 2810aeaf, de6e3810 — FOUND
