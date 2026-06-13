---
phase: quick-260613-f6m
plan: 01
subsystem: cooking-session, smart-planner, store
tags: [bugfix, feature, redux, cooking, planner]
dependency_graph:
  requires:
    - "useCookingTimer (audio unlock)"
    - "SmartPlannerEngine config types"
    - "personalReducer / IndexedDB persist root"
  provides:
    - "Scheduled-path cooking audio unlock fallback"
    - "Ingredient insufficient-used reason hint"
    - "SmartPlannerTemplate persisted slice + selector"
    - "Template save/apply/remove UI in dishes-per-meal modal"
  affects:
    - "src/Modules/Dishes/Screens/CookingSession.widget.tsx"
    - "src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx"
    - "src/Store/Store.ts"
    - "src/Store/Selectors.ts"
tech_stack:
  added: []
  patterns:
    - "createSlice slice tolerant of absent persisted state (normalizeTemplate)"
    - "one-shot useEffect guarded by a session-id ref for audio unlock"
key_files:
  created:
    - "src/Store/Models/SmartPlannerTemplate.ts"
    - "src/Store/Reducers/SmartPlannerTemplateReducer.ts"
  modified:
    - "src/Modules/Dishes/Screens/CookingSession.widget.tsx"
    - "src/Store/Store.ts"
    - "src/Store/Selectors.ts"
    - "src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx"
decisions:
  - "Task 1 root cause confirmed as (b): audio never unlocked on the scheduled-meal path, not a render gap."
  - "Task 2: availability + insufficient guard were already correct; only a visible reason for the disabled toggle was missing."
metrics:
  duration: ~25m
  completed: 2026-06-13
---

# Phase quick-260613-f6m Plan 01: Cooking Session Countdown, Ingredient Availability, Planner Templates Summary

Fixed the silent scheduled-meal cooking alarm, surfaced why an under-stocked ingredient cannot be marked used, and added a persisted save/apply/remove template feature to the smart-planner dishes-per-meal modal.

## What Was Built

**Task 1 — Scheduled-meal cooking countdown (bugfix).**
Diagnosed first. On the scheduled-meal path, `ScheduledMealCookingModal._startDish` dispatches `startCooking` (with `timerPhases`) BEFORE `CookingSessionWidget` mounts, so the widget enters the cooking view via the `activeSession` branch with `phase` still `"prep"`. The `CookingTimerCard` render condition is `timerView.hasTimer && !timerView.isFinished` and `hasTimer = Boolean(session.timer)` — since `timerPhases` reaches the reducer, `session.timer` is populated and the card **does** render. So cause (a) (card not rendering) is NOT the bug. The real cause is **(b)**: `_onStartCooking` is the only caller of `timerView.unlockAudio()`, and it never runs on this path, so the `AudioContext` stays suspended and the phase-expiry alarm is silent.
Fix: added a one-shot `useEffect` that, when the widget enters the cooking view via `activeSession` (i.e. `phase !== "cooking"`) and the session has a timer, calls `timerView.unlockAudio()` exactly once per session (guarded by `audioUnlockedSessionIdRef`). On the direct path `phase === "cooking"` so the effect no-ops and does not double-unlock. No per-second Redux writes were introduced; the live countdown stays computed in `useCookingTimer`.

**Task 2 — Ingredient availability visibility + insufficient-used guard (bugfix).**
Diagnosed first. The interactive cooking view already renders `_renderInventoryAvailability(row)` inline under each ingredient name (the `cooking-ingredient-availability-*` block), and the prep view shows it in a trailing `<Space>` — so availability is already surfaced where the user marks usage. The guard `disableUsedToggle = interactive && !row.sufficient && status !== "used"` plus the `onChange` re-guard (`if (checked && !row.sufficient) return;`) is effective and not bypassable; the `status === "used"` edge only lets an already-used item be toggled OFF, and `alwaysAvailable` ingredients are `sufficient` by stock math so they stay markable. The one real gap: a disabled toggle gave no reason.
Fix: wrapped the interactive switch in a `Tooltip` ("Không đủ trong kho để đánh dấu đã dùng") and added a small red "Chưa đủ" caption below it (testid `cooking-ingredient-used-reason-*`) when disabled. Inventory math in the `rows` useMemo was left unchanged.

**Task 3 — Persisted SmartPlannerTemplate slice + selector (feature).**
Created `SmartPlannerTemplate` model (id, name, createdAt, mealSlotDishRanges, mealSlotTagRequirements) and `SmartPlannerTemplateState`. Created `SmartPlannerTemplateReducer` following the `HouseholdHealthReducer` pattern: tolerant `normalizeTemplate`, `addSmartPlannerTemplate` (push to front, dedupe by id, cap at 30), `removeSmartPlannerTemplate`. Registered under `personalReducer` as `smartPlannerTemplate` (auto-persisted by the personal IndexedDB root). Added `selectSmartPlannerTemplates` with `?? []` fallback for devices whose persisted blob predates the slice.

**Task 4 — Template save/apply/remove UI (feature).**
Added a "Mẫu đã lưu" bar at the top of `mealRangeModal`: a "Lưu thành mẫu" button (uses `modal.prompt` for the name, rejects empty), saved templates rendered as removable chips. Choosing a template populates both configs via `setMealSlotDishRanges` / `setMealSlotTagRequirements`, drops tag requirements whose tag is no longer in `tagRequirementOptions` (stale-tag guard), and calls `_clearSuggestions()`. Each chip has a remove affordance dispatching `removeSmartPlannerTemplate`. All copy is Vietnamese; the existing stepper/tag controls were untouched.

## Deviations from Plan

None — plan executed as written. Both bug-fix tasks began with diagnosis as required; Task 2's diagnosis confirmed availability and the guard were already handled, so the change was scoped to only the missing disabled-reason hint.

## Verification

Automated gate per task: `node_modules/.bin/tsc --noEmit -p tsconfig.json` plus the per-task grep — all passed.
- Task 1: tsc OK; `unlockAudio` present in fallback effect (line ~172) and direct path (~228).
- Task 2: tsc OK; `disableUsedToggle` / `_renderInventoryAvailability` present; Tooltip + reason caption added.
- Task 3: tsc OK; `smartPlannerTemplate` registered in Store.ts; `selectSmartPlannerTemplates` exported with `?? []`.
- Task 4: tsc OK; `addSmartPlannerTemplate` / `selectSmartPlannerTemplates` wired into the screen; removed an unused `DeleteOutlined` import that initially failed lint-clean intent.

Jest (blocked: `@store/Store` alias) and Playwright (needs unsandboxed server) were not run — see manual smoke steps in the plan's `<verification>`.

## Commits

- 2ae85240 fix(quick-260613-f6m): unlock cooking audio on scheduled-meal path
- 2fb639e2 fix(quick-260613-f6m): show reason when ingredient cannot be marked used
- 49e2ef8d feat(quick-260613-f6m): add persisted SmartPlannerTemplate slice + selector
- 44edbd02 feat(quick-260613-f6m): save/apply/remove smart planner templates in modal

## Self-Check: PASSED

- src/Store/Models/SmartPlannerTemplate.ts — FOUND
- src/Store/Reducers/SmartPlannerTemplateReducer.ts — FOUND
- 260613-f6m-SUMMARY.md — FOUND
- Commits 2ae85240, 2fb639e2, 49e2ef8d, 44edbd02 — all FOUND in git log
