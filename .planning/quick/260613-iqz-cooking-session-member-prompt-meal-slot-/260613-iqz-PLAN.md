---
phase: quick-260613-iqz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/Modules/ScheduledMeal/Components/HouseholdMemberPicker.tsx
  - src/Modules/Dishes/Screens/CookingSession.widget.tsx
  - src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx
  - src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx
  - src/Store/Models/ScheduledMeal.ts
  - src/Store/Reducers/ScheduledMealReducer.ts
  - src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx
  - src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx
  - src/Modules/Home/Screens/Templates.screen.tsx
  - src/Routing/MasterPage.tsx
autonomous: true
requirements: [FEAT-1, FEAT-2, FEAT-3, FEAT-4, FEAT-5, FEAT-6]

must_haves:
  truths:
    - "Starting a cooking session prompts who is cooking, pre-filled with the global selected members, and saves the chosen ids onto the session's householdMemberIds"
    - "Finishing cooking does NOT auto-flip a meal slot to done; the manual 'Đã nấu' toggle remains the only way to mark a slot done"
    - "The finish/leftover modal opens even when a dish has zero available servings"
    - "Inside the finish modal the user can record they ate the planned dish OR a different leftover/other dish (planned-vs-reality), persisted onto the ScheduledMeal and viewable later"
    - "Dish-tag-count template meal-slot items render full width on the page and in the smart-planner modal context, with @ant-design/icons and clearer hierarchy"
    - "Dish-tag-count template management lives as a section inside the reuse-template page (Templates.screen) and its drawer link is removed"
    - "yarn build succeeds and the build output is copied into docs/ per the deployment doc"
  artifacts:
    - path: "src/Store/Models/ScheduledMeal.ts"
      provides: "actualMeals field recording actual-eaten dish/leftover per slot"
      contains: "actualMeals"
    - path: "src/Modules/ScheduledMeal/Components/HouseholdMemberPicker.tsx"
      provides: "shared multi-select of household members for cook-session start"
    - path: "src/Modules/Home/Screens/Templates.screen.tsx"
      provides: "dish-tag-count template management section"
  key_links:
    - from: "src/Modules/Dishes/Screens/CookingSession.widget.tsx"
      to: "startCooking"
      via: "householdMemberIds from in-widget member picker selection"
      pattern: "householdMemberIds"
    - from: "src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx"
      to: "setMealSlotActual"
      via: "persist actual-eaten dish on _save"
      pattern: "setMealSlotActual"
    - from: "src/Routing/MasterPage.tsx"
      to: "sidebarNavGroups"
      via: "dishCountTemplates item removed"
      pattern: "dishCountTemplates"
---

<objective>
Implement a 5-part enhancement to the My Recipes app, then build and deploy.

1. Prompt for who is cooking at each cooking-session start (both start paths), defaulting to the global selected members, saving the choice onto the session's `householdMemberIds`.
2. Keep finishing cooking decoupled from marking a meal slot done; preserve the manual "Đã nấu" toggle. (Investigation shows there is NO auto-mark today — `setMealSlotCooked` is dispatched only by the manual Switch at `ScheduledMealList.screen.tsx:772`. This task verifies and guarantees that, removing any coupling if found.)
3. Let the finish/leftover modal open with zero available servings, and capture planned-vs-reality (user planned dish X but ate dish Y) without editing the plan; persist and surface it.
4. Fix dish-tag-count template meal-slot items to be full width in both contexts and redesign them with icons and clearer hierarchy.
5. Move dish-tag-count template management into the reuse-template page as a new section and remove its drawer link.
6. Build and deploy into `docs/`.

Purpose: Make cooking attribution accurate, decouple state flips the user did not ask for, model reality vs plan, and consolidate template management.
Output: Updated widgets/screens/model/reducer, a shared member picker, a deployed build in `docs/`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Deployment procedure (authoritative)
@docs/deployment.md

# Area 1 — cook-member prompt
@src/Store/Selectors.ts
@src/Store/Reducers/CookingSessionReducer.ts
@src/Modules/Dishes/Screens/CookingSession.widget.tsx
@src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx

# Area 2 & 3 — finish decouple, leftover modal, model
@src/Store/Models/ScheduledMeal.ts
@src/Store/Reducers/ScheduledMealReducer.ts
@src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx
@src/Store/Reducers/AppContextReducer.ts

# Area 4 & 5 — template page UI + reuse-template page + drawer
@src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx
@src/Modules/ScheduledMeal/Screens/ScheduledMealMealPlanner.widget.tsx
@src/Modules/Home/Screens/Templates.screen.tsx
@src/Routing/MasterPage.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Prompt for who is cooking at session start (both paths)</name>
  <files>src/Modules/ScheduledMeal/Components/HouseholdMemberPicker.tsx, src/Modules/Dishes/Screens/CookingSession.widget.tsx, src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx</files>
  <action>Per FEAT-1, make each cooking session prompt for its cooks instead of silently snapshotting the global `selectedHouseholdMembers`.

Create a small shared component `HouseholdMemberPicker` under `src/Modules/ScheduledMeal/Components/`. Props: `value: string[]`, `onChange: (ids: string[]) => void`, optional `label` and `style`. It reads the full roster from `selectHouseholdMembers` (NOT `selectSelectedHouseholdMembers`) and renders an antd `Select` with `mode="multiple"`, `allowClear`, Vietnamese placeholder "Ai nấu?", options mapped from members (`value=member.id`, `label=member.name`), full width. If the roster is empty, render a muted `Typography.Text` "Chưa có thành viên" and nothing else. Match inline-style conventions (no CSS modules).

CookingSession.widget.tsx (direct/prep path): add local state `cookMemberIds` initialized from `selectedHouseholdMembers.map(m => m.id)`, re-synced when `dish.id` changes (extend the existing reset effect at ~line 123). Render `HouseholdMemberPicker` inside the prep view, placed above the start button block (~line 447, inside the prep `Stack`) with label "Người nấu". In `_onStartCooking` (~line 212) change `householdMemberIds: selectedHouseholdMembers.map(member => member.id)` to `householdMemberIds: cookMemberIds`.

ScheduledMealCooking.widget.tsx (ScheduledMealCookingModal, no prep step): `_openDish` (~line 122) calls `_startDish` immediately, so add a lightweight cook-selection step before starting. Add modal-level state `cookMemberIds` (init from `selectedMembers.map(m => m.id)` and reset on modal `open`). Render the `HouseholdMemberPicker` near the top of the dish-list modal body (above the dish list at ~line 152) with label "Người nấu cho bữa này" so the selection applies to dishes started from this modal. In `_startDish` (~line 110) change `householdMemberIds: selectedMembers.map(member => member.id)` to `householdMemberIds: cookMemberIds`. Keep the default pre-selection equal to the current global selection for convenience.

Do not change `StartCookingParams` or the reducer — the field name `householdMemberIds` is unchanged.</action>
  <verify>
    <automated>yarn tsc --noEmit -p tsconfig.json 2>&1 | grep -E "CookingSession.widget|ScheduledMealCooking.widget|HouseholdMemberPicker" | grep -v '^#' | grep -c error | grep -qx 0</automated>
  </verify>
  <done>Both start paths render a member multi-select pre-filled with the global selection, and dispatched `startCooking.householdMemberIds` reflects the user's in-prompt choice. Type-check passes for the touched files.</done>
</task>

<task type="auto">
  <name>Task 2: Guarantee finish-cooking stays decoupled from mark-done</name>
  <files>src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx</files>
  <action>Per FEAT-2. Investigation finding to honor: there is currently NO automatic `setMealSlotCooked` dispatch on cooking-finish — `setMealSlotCooked` is dispatched only by the manual Switch at `ScheduledMealList.screen.tsx:772` (`onChange={checked => dispatch(setMealSlotCooked(...))}`). The completion flow (`_save` in `MealCompletionLeftoverModal`) does not flip `cookedSlots`.

Therefore the deliverable is: (a) confirm no auto-mark exists anywhere in the finish/completion path, and (b) preserve the manual "Đã nấu" toggle as the only path to done. Concretely: search the finish/completion call sites and `FinishCooking.widget.tsx`/`useCookingTimer` for any `setMealSlotCooked` dispatch tied to finishing; if any such auto-dispatch exists, remove ONLY that automatic trigger (keep the model field `cookedSlots` and the reducer intact). Keep the manual `Switch` at line ~767-773 exactly as-is so the user can still mark a slot done. Do not remove `setMealSlotCooked` from the reducer or model.

If no auto-mark is found (expected), make no functional change beyond confirming; if the codebase is already correct, leave the manual toggle untouched and record the finding in the SUMMARY. Do not introduce new coupling.</action>
  <verify>
    <automated>grep -rn "setMealSlotCooked" src --include=*.tsx --include=*.ts | grep -v '^#' | grep -v "Reducer" | grep -c "onChange" | grep -qx 1</automated>
  </verify>
  <done>The only UI dispatch of `setMealSlotCooked` is the manual per-slot Switch; no finish/completion code path auto-marks a slot done; the `cookedSlots` model field and reducer remain intact.</done>
</task>

<task type="auto">
  <name>Task 3: Open finish modal at zero servings + capture planned-vs-reality</name>
  <files>src/Store/Models/ScheduledMeal.ts, src/Store/Reducers/ScheduledMealReducer.ts, src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx, src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx</files>
  <action>Per FEAT-3.

(a) Remove the open-gate. In `ScheduledMealList.screen.tsx` the `complete-breakfast`/`complete-lunch`/`complete-dinner` menu items (~lines 825-827) are `disabled` partly by `!_slotHasAvailableServings(...)`. Remove ONLY the `!_slotHasAvailableServings(...)` clause from each of the three `disabled` expressions so the completion modal opens regardless of available servings. Keep the other clauses (empty slot, future meal without feedback). The `_slotHasAvailableServings` helper may remain for other uses or be removed if now unused (avoid an unused-var lint error).

(b) Model. In `ScheduledMeal.ts` add a new optional field recording what was actually eaten per slot, keyed by slot:
  - Add type `ScheduledMealActualRecord = { dishIds: string[]; leftoverItemIds?: string[]; note?: string; recordedAt: string }`.
  - Add field `actualMeals?: Partial<Record<ScheduledMealSlotKey, ScheduledMealActualRecord>>` to `ScheduledMeal`.
  Keep `cookedSlots` and `meals` unchanged.

(c) Reducer. In `ScheduledMealReducer.ts` add a `setMealSlotActual` case reducer with payload `{ mealId: string; slot: ScheduledMealSlotKey; record: ScheduledMealActualRecord }` that initializes `meal.actualMeals ??= {}` and assigns `meal.actualMeals[slot] = record`. Export it alongside `setMealSlotCooked`. Also register the new field in `ScheduledMealAdd.widget.tsx`/`ScheduledMealEdit.widget.tsx` ObjectProperty maps as `noMarkup: true` mirroring how `cookedSlots` is registered (so forms ignore it). [Add those two files to your edits.]

(d) Modal — planned vs reality. In `MealCompletionLeftoverModal` (`ScheduledMealCooking.widget.tsx`, ~line 228), when `mealSlot` is a real slot (not 'dish') and `scheduledMealId` is set, add a per-meal "Thực tế đã ăn" control above the existing per-dish list. Provide a choice between:
  - "Đúng món đã lên kế hoạch" (planned): records `dishIds = uniqueDishIds`.
  - "Món khác / phần dư" (reality): an antd `Select mode="multiple"` listing leftover/other dishes available from inventory, sourced from `selectAvailableServingsByDishKind` keys joined with `selectLeftoverTrackerItems` (label = dish name via `dishesById`, fallback to leftover `dishName`); records the chosen dish ids and, where applicable, the originating leftover item ids.
  Use a `Segmented` (mirroring the existing fresh/leftover `Segmented` at ~line 483) for the planned-vs-other choice. In `_save` (~line 318), after the existing leftover/feedback/consume dispatches, dispatch `setMealSlotActual({ mealId: scheduledMealId, slot, record })` ONLY when the user picked "other" or when the recorded dish set differs from the planned set; build `record` with `recordedAt: new Date().toISOString()`. Continue reusing `consumeDishServings`, `addLeftoverTrackerItem`, and (for eating leftover portions) `eatLeftoverServings` where the chosen actual dish maps to a tracked leftover item. Do not gate `_save` on servings being available.

(e) Surface it. In `ScheduledMealList.screen.tsx` `MealRow` (~line 752), when `item.actualMeals?.[slot]` exists and its `dishIds` differ from the planned `dishIds`, render a small inline note/indicator (e.g. a `Tag color='gold'` "Thực tế khác kế hoạch" with the actual dish names) so the user can see planned-vs-actual at a glance. Keep inline styles, antd, Vietnamese labels.</action>
  <verify>
    <automated>grep -q "actualMeals" src/Store/Models/ScheduledMeal.ts && grep -q "setMealSlotActual" src/Store/Reducers/ScheduledMealReducer.ts && ! grep -E "complete-(breakfast|lunch|dinner)" src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx | grep -q "_slotHasAvailableServings" && yarn tsc --noEmit -p tsconfig.json 2>&1 | grep -E "ScheduledMeal" | grep -v '^#' | grep -c error | grep -qx 0</automated>
  </verify>
  <done>Completion menu items are enabled at zero servings; the modal records an actual-eaten dish set (planned or other) onto `ScheduledMeal.actualMeals[slot]` via `setMealSlotActual`; the slot card shows a planned-vs-actual indicator when they differ; existing leftover/consume actions are reused; type-check passes.</done>
</task>

<task type="auto">
  <name>Task 4: Full-width + redesign dish-tag-count meal-slot items</name>
  <files>src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx, src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx</files>
  <action>Per FEAT-4. The meal-slot items inside each dish-tag-count template are not full width and need a neater, more hands-on layout with icons.

In `SmartPlannerTemplates.screen.tsx`:
  - `TemplateDetail` (~line 89): make each slot `Box` full width — add `width: '100%'` and `boxSizing: 'border-box'` to the per-slot Box style; ensure the wrapping `Stack` children stretch (use `align='stretch'`). Redesign each row to a clear hierarchy: a leading meal-time icon (import from `@ant-design/icons`: use `CoffeeOutlined` for breakfast, `AppstoreOutlined`/`ClockCircleOutlined` for lunch, `MoonOutlined`-equivalent — pick existing icons such as `CoffeeOutlined`, `ClockCircleOutlined`, `RestOutlined`/`StarOutlined`) tinted with `meta.tone`, the slot label, the `min-max món` count tag, and the required-tag chips below. Add small count/tag icons (e.g. `NumberOutlined` for the dish-count tag, `TagsOutlined` for the required-loại-món tag). Keep `mealSlotMeta` colors.
  - The edit-modal slot rows (~line 248) and the `renderStepperControl` row: ensure the slot `Box` is full width (`width: '100%'`, `boxSizing: 'border-box'`) and aligns cleanly; apply the same icon treatment to the slot header for consistency.

In `SmartMealPlanner.screen.tsx` `renderTemplateDetail` (~line 1606): apply the same full-width fix (per-slot Box `width: '100%'`, `boxSizing: 'border-box'`, parent Stack `align='stretch'`) and the same icon treatment so the template detail renders identically inside the smart-planner modal context.

Keep the inline-style approach; no new dependencies; reuse `@ant-design/icons` only. Do not change template data shape or save logic.</action>
  <verify>
    <automated>grep -c "width: '100%'" src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx | grep -qvx 0 && yarn tsc --noEmit -p tsconfig.json 2>&1 | grep -E "SmartPlannerTemplates|SmartMealPlanner" | grep -v '^#' | grep -c error | grep -qx 0</automated>
  </verify>
  <done>Dish-tag-count meal-slot items render full width on the standalone page and in the smart-planner modal detail, with @ant-design/icons and clearer visual hierarchy; type-check passes.</done>
</task>

<task type="auto">
  <name>Task 5: Move dish-tag-count management into reuse-template page; remove drawer link</name>
  <files>src/Modules/ScheduledMeal/Screens/SmartPlannerTemplates.screen.tsx, src/Modules/Home/Screens/Templates.screen.tsx, src/Routing/MasterPage.tsx</files>
  <action>Per FEAT-5. Integrate dish-tag-count (SmartPlannerTemplate) management into the reuse-template page and drop its drawer destination.

Refactor to avoid duplicating the editor: in `SmartPlannerTemplates.screen.tsx`, extract the template management UI (the card list of templates + create/edit modal + create/edit/delete handlers) into an exported component, e.g. `export const SmartPlannerTemplatesManager: React.FC = () => {...}` containing everything currently inside `SmartPlannerTemplatesScreen` EXCEPT the page-level header Box (the `LayoutOutlined` hero ~lines 294-306) and `useScreenTitle`. Keep `SmartPlannerTemplatesScreen` working by rendering its hero header plus `<SmartPlannerTemplatesManager />` (so the standalone route still works if reached directly).

In `Templates.screen.tsx`: add a new `<section style={sectionStyle}>` after the "Mẫu mua sắm" section, following the existing card-section pattern (`sectionHeaderStyle`, `SectionTitle`, `bodyStyle`). Title "Mẫu số món", subtitle e.g. "Số món mỗi bữa và loại món bắt buộc để áp dụng nhanh.", icon `LayoutOutlined` (import from `@ant-design/icons`). Render `<SmartPlannerTemplatesManager />` inside the section `bodyStyle`. Match the page's visual style (the manager's internal cards already use bordered Box; keep them but ensure they sit naturally inside the section body — the manager should NOT render its own page hero).

In `MasterPage.tsx` `sidebarNavGroups` (~line 494): REMOVE the `{ key: 'dishCountTemplates', ... label: 'Mẫu số món' }` item from the `planning` group. Leave the `templates` item ("Mẫu dùng lại") which now hosts the section. Do not remove the route registration in `RootRouter.tsx`/`ScheduledMealRouteConfig.ts` (keep the standalone route functional/unlinked). Verify no other nav (e.g. BottomTabNavigator) references `dishCountTemplates` — grep confirms it is drawer-only.</action>
  <verify>
    <automated>grep -q "SmartPlannerTemplatesManager" src/Modules/Home/Screens/Templates.screen.tsx && ! grep -q "dishCountTemplates" src/Routing/MasterPage.tsx && yarn tsc --noEmit -p tsconfig.json 2>&1 | grep -E "Templates.screen|SmartPlannerTemplates|MasterPage" | grep -v '^#' | grep -c error | grep -qx 0</automated>
  </verify>
  <done>The reuse-template page shows a "Mẫu số món" section using the shared manager component with full create/edit/delete; the `dishCountTemplates` drawer item is gone; the standalone route still resolves; type-check passes.</done>
</task>

<task type="auto">
  <name>Task 6: Build and deploy into docs/</name>
  <files>docs/</files>
  <action>Per FEAT-6 and `docs/deployment.md`. Run a production build and deploy:
  1. Run `yarn build` and confirm it completes successfully (CRACO build; `GENERATE_SOURCEMAP=false`).
  2. Copy every file from `build/` into `docs/` EXCEPT `build/manifest.json` (preserve the existing `docs/manifest.json`). Include `build/index.html`, `build/asset-manifest.json`, `build/service-worker.js`, and the entire `build/static/` tree. Do not delete the whole `docs/` folder (it also holds deployment data and docs).
  3. Stage with `git add ./src/*` and `git add ./docs/*`. Do NOT push (leave pushing to the user unless they ask).
  Report the resulting `docs/static/js/main.*.js` hash so the deploy is verifiable.</action>
  <verify>
    <automated>yarn build 2>&1 | tail -5 | grep -qiE "compiled|build folder is ready|done" && test -f docs/index.html && test -d docs/static/js</automated>
  </verify>
  <done>`yarn build` succeeds, build output is copied into `docs/` (manifest.json preserved), and changes are staged.</done>
</task>

</tasks>

<verification>
- `yarn tsc --noEmit -p tsconfig.json` reports no new errors across the touched files.
- `yarn build` completes successfully.
- Manual smoke (executor judgment): both cook-start paths show a pre-filled member picker; completion menu opens at zero servings; planned-vs-actual indicator appears when actual differs; template section renders in the reuse-template page; drawer no longer lists "Mẫu số món" under planning.
</verification>

<success_criteria>
- FEAT-1: Both cooking-start paths prompt for cooks (default = global selection) and persist the choice to `session.householdMemberIds`.
- FEAT-2: No finish-driven auto-mark; manual "Đã nấu" toggle preserved as the sole done path.
- FEAT-3: Finish modal opens at zero servings; actual-eaten dish (planned or other) persisted to `ScheduledMeal.actualMeals[slot]` and surfaced on the slot card; existing leftover/consume actions reused.
- FEAT-4: Dish-tag-count meal-slot items full width in both contexts, redesigned with icons.
- FEAT-5: Dish-tag-count management lives in the reuse-template page; drawer link removed.
- FEAT-6: Build succeeds and is deployed into `docs/`.
</success_criteria>

<output>
Create `.planning/quick/260613-iqz-cooking-session-member-prompt-meal-slot-/260613-iqz-SUMMARY.md` when done.
</output>
