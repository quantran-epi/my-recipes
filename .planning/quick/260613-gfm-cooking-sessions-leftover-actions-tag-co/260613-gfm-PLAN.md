---
phase: quick-260613-gfm
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - src/Modules/DishSuggester/Screens/DishSuggester.screen.tsx
  - src/Store/Reducers/SmartPlannerTemplateReducer.ts
  - src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx
  - src/Modules/ScheduledMeal/Routing/ScheduledMealRouteConfig.ts
  - src/Routing/RootRouter.tsx
  - src/Routing/MasterPage.tsx
  - src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx
  - src/Store/Reducers/AppContextReducer.ts
  - src/Modules/ScheduledMeal/Screens/LeftoverManagement.screen.tsx
  - src/Store/Models/ScheduledMeal.ts
  - src/Store/Reducers/ScheduledMealReducer.ts
  - src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx
requirements: [GFM-01, GFM-02, GFM-03, GFM-04, GFM-05, GFM-06]
must_haves:
  truths:
    - "Cook launched from the dish suggestor starts a session with the live timer/countdown, identical to cooking launched elsewhere"
    - "User can open a dedicated page to create, edit, view, and remove dish-tag-count templates"
    - "In the dish-count picker modal, clicking a saved template reveals its detail plus an Apply button, inside a collapsible section"
    - "Leftover screen shows only the segmented filter (no separate filter icon) and gives each available item Eat-part-of, Eat-all, and Throw-away (with reason) actions"
    - "User can manually add a leftover that did not come from a cooking session"
    - "A meal slot persists a cooked/not-cooked state and shows available servings per dish; finish/specify-leftover actions are disabled when no servings are available"
    - "Finish-meal modal lets the user pick the serving source only when both fresh and leftover servings exist for a dish"
  artifacts:
    - path: "src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx"
      provides: "Dish-tag-count template management page"
    - path: "src/Store/Reducers/ScheduledMealReducer.ts"
      provides: "setMealSlotCooked reducer"
  key_links:
    - from: "DishSuggester._onStartCookingSession"
      to: "startCooking"
      via: "timerPhases derived from DishDurationHelper.getActiveItems"
---

<objective>
Implement 6 user-confirmed changes to the My Recipes app: (1) make the dish-suggestor "Cook" start an identical cooking session with the live timer; (2) add a dish-tag-count template management page and a collapsible template detail/apply section in the picker modal; (3) redesign the leftover screen actions; (4) allow manually adding leftovers; (5) persist meal-slot cooked state and show available servings per dish, gating finish/specify-leftover when none are available; (6) verify/finish the finish-meal serving-source picker.

Purpose: Tighten consistency and usability across cooking, planning, and leftover flows the user reviewed.
Output: Unified cooking-session start, a new template management screen + route + menu entry, redesigned leftover actions with manual add, persisted slot cooked-state with per-dish servings, and verified source picker.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@src/Modules/DishSuggester/Screens/DishSuggester.screen.tsx
@src/Modules/Dishes/Screens/CookingSession.widget.tsx
@src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx
@src/Store/Reducers/CookingSessionReducer.ts
@src/Store/Models/SmartPlannerTemplate.ts
@src/Store/Reducers/SmartPlannerTemplateReducer.ts
@src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx
@src/Modules/ScheduledMeal/Screens/LeftoverManagement.screen.tsx
@src/Store/Reducers/AppContextReducer.ts
@src/Store/Models/ScheduledMeal.ts
@src/Store/Reducers/ScheduledMealReducer.ts
@src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx
@src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx
@src/Store/Selectors.ts
@src/Routing/RootRouter.tsx
@src/Modules/ScheduledMeal/Routing/ScheduledMealRouteConfig.ts
@src/Routing/MasterPage.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Unify the dish-suggestor cooking-session start (Change 1)</name>
  <files>src/Modules/DishSuggester/Screens/DishSuggester.screen.tsx</files>
  <action>
    In `_onStartCookingSession` (around line 393), the suggestor calls `startCooking` WITHOUT `timerPhases`, so the live timer/countdown never initializes — unlike `CookingSession.widget._onStartCooking` (line 212) and `ScheduledMealCooking.widget._startDish` (line 108) which both pass `timerPhases`. Make the suggestor behave identically: for each target dish compute `const timerPhases = DishDurationHelper.getActiveItems(dish.duration).map(item => ({ phaseKey: item.phase.key, plannedMinutes: item.minutes }))` and pass `timerPhases` into the `startCooking` dispatch (DishDurationHelper is already imported). Match the existing field set already passed (dishId, dishName, baseServings, steps, ingredientIds, householdMemberIds). Also pass `targetServings: DishServingHelper.getBaseServings(dish)` for parity if other callsites set it — otherwise leave servings as-is to avoid scope creep. After dispatching, if any dish produced `timerPhases.length > 0`, unlock audio within the tap the same way CookingSession does (the suggestor must obtain the same timer audio-unlock hook the CookingSession widget uses via `useCookingTimer`/`timerView.unlockAudio()`; if that hook is not available in this screen, import and call the same unlock utility the CookingSession widget calls so the first phase chime can play under autoplay policy). Do NOT change unrelated suggestor actions.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "DishSuggester.screen" | grep -v "^#" | head -1; echo "no DishSuggester type errors if blank above"</automated>
  </verify>
  <done>Starting a cook from the dish suggestor dispatches startCooking with non-empty timerPhases for dishes that have active duration phases, so the resulting session has a `timer` object and the countdown UI appears, identical to the CookingSession and ScheduledMealCooking entry points.</done>
</task>

<task type="auto">
  <name>Task 2: Dish-tag-count template management page + collapsible picker detail (Change 2)</name>
  <files>src/Store/Reducers/SmartPlannerTemplateReducer.ts, src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx, src/Modules/ScheduledMeal/Routing/ScheduledMealRouteConfig.ts, src/Routing/RootRouter.tsx, src/Routing/MasterPage.tsx, src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx</files>
  <action>
    (a) Reducer: `addSmartPlannerTemplate` already upserts by id (filters same id then prepends), but editing reorders the list. Add an `updateSmartPlannerTemplate` reducer that replaces the matching template in place (same index) when the id exists, normalizing via the existing `normalizeTemplate`; export its action. Keep `addSmartPlannerTemplate`/`removeSmartPlannerTemplate` as-is.
    (b) New management screen `SmartPlannerTemplates.screen.tsx` following the structure/style of `LeftoverManagement.screen.tsx` (hero header via Box/Stack/Typography, `useScreenTitle`, antd components already used in repo). Read templates via `selectSmartPlannerTemplates`. Show each template as a card displaying its detail: per-slot dish ranges (min-max) and per-slot required tag counts, using the same `mealSlotMeta`/labels concept as SmartMealPlanner (breakfast/lunch/dinner, "min-max món", "N món bắt buộc" derived from `mealSlotTagRequirements`). Provide Create (modal/prompt for name; new template seeded from `DEFAULT_MEAL_SLOT_DISH_RANGES`/`DEFAULT_MEAL_SLOT_TAG_REQUIREMENTS` or empty), Edit (rename + adjust ranges/tag counts reusing the same stepper pattern as SmartMealPlanner `renderStepperControl`/`_stepMealSlotDishRange`/`_stepSlotTagRequirement` — extract or replicate locally), and Remove (dispatch `removeSmartPlannerTemplate`). Persist edits via `updateSmartPlannerTemplate` and creates via `addSmartPlannerTemplate`. Do not introduce new libraries; reuse `@components` + antd already in use. Tag options come from dishes via the same `collectDishTagOptions(dishes)` helper SmartMealPlanner uses (import it or replicate).
    (c) Route: add `Templates: () => RouteHelpers.CreateRoute(scheduledMealRoot, ["dish-count-templates"])` (or similarly named, avoid clashing with the existing top-level `/templates` route) to `ScheduledMealRouteConfig.ts`; register the screen in `RootRouter.tsx` under the ScheduledMeal route group (import `SmartPlannerTemplatesScreen`); add a menu entry in `MasterPage.tsx` near the existing `leftovers`/`prepTasks`/`dishFeedback` entries (reuse an existing icon import; label e.g. "Mẫu số món").
    (d) Picker modal in `SmartMealPlanner.screen.tsx` (`mealRangeModal`, the "Mẫu đã lưu" Box around lines 1631-1644): wrap the saved-template section in a `Collapse` (the repo already uses antd `Collapse` ghost size='small' in this same file at line 1663) so it is collapsible. Inside, change each template chip so clicking it shows the template's detail (per-slot ranges + required tag counts, same rendering as the management cards) plus an explicit "Áp dụng" (Apply) button that calls the existing `_applySmartPlannerTemplate(template)`. Keep the existing remove control. Keep "Lưu thành mẫu".
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "SmartPlannerTemplates|SmartMealPlanner.screen|SmartPlannerTemplateReducer|ScheduledMealRouteConfig" | grep -v "^#" | head; echo "no related type errors if blank above"</automated>
  </verify>
  <done>A new dish-tag-count template page is reachable from the menu and supports create/edit/view/remove; the picker modal's template section is collapsible and clicking a template reveals its detail plus an Apply button that applies the config.</done>
</task>

<task type="auto">
  <name>Task 3: Leftover screen redesign + manual add (Changes 3 leftover-item actions, 4)</name>
  <files>src/Store/Reducers/AppContextReducer.ts, src/Modules/ScheduledMeal/Screens/LeftoverManagement.screen.tsx</files>
  <action>
    (a) Reducer (`AppContextReducer.ts`): add `eatLeftoverServings` accepting `PayloadAction<{ id: string; count: number }>` that, for an `available` item, subtracts `normalizePortions(count)` (clamped to the item's portions, min 0) and flips status to `finished` when portions reach 0 — mirror the existing `eatLeftoverPortion` shape. Add a `discardReason?: string` field to the `LeftoverTrackerItem` type (line ~99) and change `discardLeftoverItem` to accept `PayloadAction<{ id: string; reason?: string }>`, storing the trimmed reason on `discardReason` when discarding. Update the exported actions list. Keep existing `eatLeftoverPortion`, `finishLeftoverItem`, `addLeftoverTrackerItem`, `consumeDishServings` intact (other callers depend on them). The `addLeftoverTrackerItem` reducer already normalizes portions/status/kind and is suitable for manual adds.
    (b) Screen (`LeftoverManagement.screen.tsx`): remove the redundant `FilterOutlined` icon from the filter row (line 232) and its import; keep both `Segmented` controls. Replace the three row actions: "Ăn 1 phần" becomes "Ăn một phần" which opens a small confirm/prompt to specify how many servings were eaten (InputNumber min 0.5/step 0.5 max = item.portions) and dispatches `eatLeftoverServings({ id, count })`; "Đã hết" / "Eat all" keeps dispatching `finishLeftoverItem`; "Bỏ" / "Throw away" opens a confirm that captures a reason (Input/TextArea) and dispatches `discardLeftoverItem({ id, reason })`. Use the existing `modal.confirm` pattern already in `_confirmLeftoverAction` (extend it to support a numeric input for eat-part and a reason input for discard, or add a dedicated small modal — reuse antd components already imported). Optionally surface `discardReason` on discarded rows near the existing note display.
    (c) Manual add (Change 4): add an "Thêm phần còn lại" (Add leftover) button in the screen header/toolbar that opens a form modal collecting: dish (select an existing dish via `selectDishes`/`selectDishesById` OR a free-text custom name for outside food), servings (InputNumber), eatBy date (use the same "Ăn trước" day-offset Select pattern as `MealCompletionLeftoverModal` lines 455-458, or a date picker already used in the repo), kind (default 'leftover'; allow 'fresh'), and optional note. On submit dispatch `addLeftoverTrackerItem({ id: nanoid(10), dishId: <selected dish id or nanoid>, dishName, portions, storedAt: now ISO, eatBy: computed ISO, note, kind, status: 'available' })`. Do not set scheduledMealId/mealSlot for manual adds. Match the model in `AppContextReducer` (LeftoverTrackerItem) exactly.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "LeftoverManagement|AppContextReducer" | grep -v "^#" | head; echo "no related type errors if blank above"</automated>
  </verify>
  <done>The leftover screen has no standalone filter icon (segmented only); each available item offers Eat-part-of (with serving count), Eat-all, and Throw-away (with reason); and a header action lets users manually add a leftover that has no cooking-session origin.</done>
</task>

<task type="auto">
  <name>Task 4: Meal-slot cooked-state persistence, per-dish servings, finish gating + source-picker verify (Changes 5, 3 scheduled-part, 6)</name>
  <files>src/Store/Models/ScheduledMeal.ts, src/Store/Reducers/ScheduledMealReducer.ts, src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx</files>
  <action>
    (a) Model (`ScheduledMeal.ts`): add `cookedSlots?: Partial<Record<ScheduledMealSlotKey, boolean>>` to the `ScheduledMeal` type (cooked/not-cooked persisted per slot).
    (b) Reducer (`ScheduledMealReducer.ts`): add `setMealSlotCooked` accepting `PayloadAction<{ mealId: string; slot: ScheduledMealSlotKey; cooked: boolean }>` that finds the meal, initializes `cookedSlots` if absent, and sets the boolean (delete the key when false to keep state lean). Export the action. Follow the existing `markSkipMeal`/`unmarkSkipMeal` reducer style.
    (c) Screen (`ScheduledMealList.screen.tsx`, `ScheduledMealItem`/`MealRow` around lines 609-762): 
      - Subscribe to `selectAvailableServingsByDishKind` (already in Selectors) to compute, per slot, the available servings of that slot's dishes. In `MealRow`, for each dish render its available servings (fresh + leftover, e.g. "2 phần" or split "1 mới · 1 dư") next to/under the dish tag using the per-dish stock from the selector. 
      - Add a persisted cooked-state control on each slot (a Switch or toggle "Đã nấu/Chưa nấu") that reads `item.cookedSlots?.[slot]` and dispatches `setMealSlotCooked({ mealId: item.id, slot, cooked })`. Reflect cooked state visually in the row.
      - Gating: compute `slotHasAvailableServings` = any dish in the slot has fresh+leftover > 0. In the meal dropdown menu (lines 798-800) disable the per-slot "Hoàn tất bữa ..." (complete-*) items when the slot has dishes but no available servings AND the slot is not already finished (combine with the existing `isFutureMeal`/feedbackDone disabling). The "specify leftover" step lives inside `MealCompletionLeftoverModal`; the finish action is the entry point — gating the complete-* menu item is sufficient to stop offering finish/specify-leftover when no servings exist. Do not break the existing "Xem phản hồi" (view feedback done) path which must remain enabled.
    (d) Change 6 verify (no expected code change): `MealCompletionLeftoverModal` (`ScheduledMealCooking.widget.tsx` lines 464-499) already shows a `Segmented` source picker when `bothKinds` (fresh > 0 && leftover > 0) and a single `Tag` otherwise. Confirm this still compiles and behaves; only adjust if the gating in (c) regresses it.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "ScheduledMealList|ScheduledMealReducer|ScheduledMeal.ts|ScheduledMealCooking" | grep -v "^#" | head; echo "no related type errors if blank above"</automated>
  </verify>
  <done>Each meal slot persists a cooked boolean and displays per-dish available servings; finish/specify-leftover actions are disabled for slots with no available servings; the finish-meal source picker appears only when both fresh and leftover servings exist.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit -p tsconfig.json` reports no NEW type errors in the modified files (pre-existing repo errors unrelated to these files are acceptable; compare against baseline if needed).
- Manual smoke (dev server): cook from suggestor shows countdown; template page reachable from menu and supports CRUD; picker template section collapses and applies; leftover screen has no filter icon, offers eat-part/eat-all/throw-away(reason) and manual add; meal slots show servings + cooked toggle and disable finish when no servings; finish-meal shows source picker only when both kinds exist.
</verification>

<success_criteria>
All 6 confirmed changes implemented, reusing existing Redux slice/selector/component patterns with no new libraries, and the project type-checks without new errors in the touched files.
</success_criteria>

<output>
Create `.planning/quick/260613-gfm-cooking-sessions-leftover-actions-tag-co/260613-gfm-SUMMARY.md` when done.
</output>
