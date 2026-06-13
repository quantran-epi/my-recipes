---
phase: quick-260613-gfm
plan: 01
subsystem: ui
tags: [react, redux-toolkit, cooking-session, leftover-tracker, smart-planner, scheduled-meal]

# Dependency graph
requires:
  - phase: quick-260613-ea9
    provides: dish-serving inventory with fresh vs leftover kinds (selectAvailableServingsByDishKind, LeftoverTrackerItem)
  - phase: quick-260613-f6m
    provides: persisted SmartPlannerTemplate slice + selector, cooking timer/countdown
provides:
  - Unified dish-suggestor cooking-session start with live timer + audio unlock
  - Dish-tag-count template management page (CRUD) reachable from the sidebar menu
  - Collapsible saved-template detail + Apply button in the planner picker modal
  - Redesigned leftover screen (segmented-only filter, eat-part-of with count, eat-all, throw-away with reason)
  - Manual leftover add (existing dish or custom name) on the leftover screen
  - Persisted per-slot cooked state + per-dish available servings on the meal list
  - Finish/specify-leftover gating when a slot has dishes but no available servings
affects: [scheduled-meal, leftover, smart-planner, cooking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reuse useCookingTimer(undefined) purely for its session-independent audio-unlock gesture"
    - "antd Collapse for per-template detail/apply sections, mirroring existing planner Collapse usage"
    - "Per-slot boolean map (cookedSlots) on ScheduledMeal, delete-on-false to keep state lean (mirrors skipMeals)"

key-files:
  created:
    - src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx
  modified:
    - src/Modules/DishSuggester/Screens/DishSuggester.screen.tsx
    - src/Store/Reducers/SmartPlannerTemplateReducer.ts
    - src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx
    - src/Modules/ScheduledMeal/Routing/ScheduledMealRouteConfig.ts
    - src/Routing/RootRouter.tsx
    - src/Routing/MasterPage.tsx
    - src/Store/Reducers/AppContextReducer.ts
    - src/Modules/ScheduledMeal/Screens/LeftoverManagement.screen.tsx
    - src/Store/Models/ScheduledMeal.ts
    - src/Store/Reducers/ScheduledMealReducer.ts
    - src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx

key-decisions:
  - "Suggestor reuses useCookingTimer(undefined) for audio unlock since it dispatches startCooking then closes (no live session in scope)"
  - "Reused antd Collapse already present in SmartMealPlanner for the collapsible template section rather than adding a new pattern"
  - "Added updateSmartPlannerTemplate (in-place replace) so editing a template keeps its list position"
  - "cookedSlots stored as Partial<Record<slot, boolean>> with delete-on-false, following markSkipMeal/unmarkSkipMeal style"
  - "Gating applied to the complete-* dropdown items (finish entry point); the specify-leftover step lives inside the finish modal so gating the entry is sufficient"

patterns-established:
  - "Template detail renderer shared between management cards and picker collapse"
  - "Per-dish available servings shown inline on meal slot tags via selectAvailableServingsByDishKind"

requirements-completed: [GFM-01, GFM-02, GFM-03, GFM-04, GFM-05, GFM-06]

# Metrics
duration: 38min
completed: 2026-06-13
---

# Phase quick-260613-gfm Plan 01: Cooking sessions, leftover actions, tag-count templates Summary

**Unified dish-suggestor cooking start with the live timer, a new dish-tag-count template CRUD page with a collapsible apply section in the picker, a redesigned leftover screen (eat-part/eat-all/throw-away-with-reason + manual add), and persisted per-slot cooked state with per-dish serving display and finish gating.**

## Performance

- **Duration:** ~38 min
- **Tasks:** 4
- **Files created:** 1
- **Files modified:** 12

## Accomplishments
- Cooking launched from the dish suggestor now passes timerPhases and unlocks audio, so it starts an identical live-timer session to the other entry points.
- New `SmartPlannerTemplates.screen.tsx` page (create/edit/view/remove) reachable from the sidebar "Mẫu số món" entry, plus a new ScheduledMeal route.
- Planner picker's saved-template section is now a Collapse; each template reveals its per-slot range + tag-count detail and an explicit "Áp dụng" button.
- Leftover screen dropped the standalone filter icon (segmented-only), gained eat-part-of (with serving count), eat-all, throw-away (with reason), and a manual "Thêm phần còn lại" add form.
- Meal slots persist a cooked/not-cooked switch and display per-dish available servings ("2 phần" or "1 mới · 1 dư"); complete-* actions are disabled when a slot has dishes but no available servings.

## Task Commits

1. **Task 1: Unify the dish-suggestor cooking-session start** - `71041160` (feat)
2. **Task 2: Dish-tag-count template page + collapsible picker detail** - `41f1e411` (feat)
3. **Task 3: Leftover screen redesign + manual add** - `b4a34a35` (feat)
4. **Task 4: Meal-slot cooked-state, per-dish servings, finish gating** - `fe3cde65` (feat)

## Files Created/Modified
- `src/Modules/DishSuggester/Screens/DishSuggester.screen.tsx` - Adds timerPhases + audio unlock to the suggestor's startCooking dispatch.
- `src/Store/Reducers/SmartPlannerTemplateReducer.ts` - New `updateSmartPlannerTemplate` in-place replace reducer.
- `src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx` - New template management page (CRUD).
- `src/Modules/ScheduledMeal/Routing/ScheduledMealRouteConfig.ts` - New `Templates` route (`dish-count-templates`).
- `src/Routing/RootRouter.tsx` - Registers the template screen under the ScheduledMeal route group.
- `src/Routing/MasterPage.tsx` - "Mẫu số món" sidebar entry.
- `src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx` - Collapsible template section with detail + Apply button.
- `src/Store/Reducers/AppContextReducer.ts` - `eatLeftoverServings` reducer, `discardReason` field + reason on `discardLeftoverItem`.
- `src/Modules/ScheduledMeal/Screens/LeftoverManagement.screen.tsx` - Redesigned actions + manual add modal.
- `src/Store/Models/ScheduledMeal.ts` - `cookedSlots` field.
- `src/Store/Reducers/ScheduledMealReducer.ts` - `setMealSlotCooked` reducer.
- `src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx` - Per-slot cooked toggle, per-dish servings, finish gating.

## Decisions Made
- Suggestor reuses `useCookingTimer(undefined)` for the audio-unlock gesture because it dispatches `startCooking` and closes without holding a live session.
- Reused the antd `Collapse` already used elsewhere in SmartMealPlanner for the collapsible template detail rather than introducing a new component.
- Gating was applied to the complete-* dropdown menu items (the finish entry point); the specify-leftover step lives inside `MealCompletionLeftoverModal`, so gating the entry is sufficient.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated SmartForm itemDefinitions for new model field**
- **Found during:** Task 4 (model change)
- **Issue:** Adding `cookedSlots` to the `ScheduledMeal` type broke `Record<keyof ScheduledMeal, SmartFormItemProps>` in `ScheduledMealAdd.widget.tsx` and `ScheduledMealEdit.widget.tsx` (TS2741).
- **Fix:** Added a `cookedSlots` item definition (`noMarkup: true`) to both forms.
- **Files modified:** src/Modules/ScheduledMeal/Screens/ScheduledMealAdd.widget.tsx, src/Modules/ScheduledMeal/Screens/ScheduledMealEdit.widget.tsx
- **Verification:** `npx tsc --noEmit` clean after the fix.
- **Committed in:** fe3cde65 (Task 4 commit)

**2. [Rule 3 - Blocking] Updated Dashboard caller for changed discardLeftoverItem signature**
- **Found during:** Task 3 (reducer signature change)
- **Issue:** `discardLeftoverItem` payload changed from `string` to `{ id; reason? }`; `Dashboard.screen.tsx` still passed a string.
- **Fix:** Updated the caller to `discardLeftoverItem({ id: item.id })`.
- **Files modified:** src/Modules/Home/Screens/Dashboard.screen.tsx
- **Verification:** `npx tsc --noEmit` clean.
- **Committed in:** b4a34a35 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both were mechanical type-contract follow-ups from intentional model/reducer changes. No scope creep.

## Issues Encountered
- During Task 3 the LeftoverManagement edit landed in a half-applied state (mixed old/new imports and handlers). Resolved by rewriting the screen file cleanly with the full set of new actions and modals, then verifying the type-check.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 confirmed changes implemented; project type-checks with no new errors in the touched files.
- Manual smoke verification (dev server) still recommended for the visual/behavioral acceptance criteria.

---
*Phase: quick-260613-gfm*
*Completed: 2026-06-13*

## Self-Check: PASSED
- All created files verified on disk.
- All 4 task commits verified in git history (71041160, 41f1e411, b4a34a35, fe3cde65).
