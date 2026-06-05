# Performance Audit Plan

## Overview

Goal: make app performance work systematic, measurable, and auditable. This file is the source of truth for planned performance implementation, audit scope, current status, acceptance criteria, and test evidence.

Default performance targets:

- Route feedback appears immediately after user navigation begins.
- Large list screens avoid heavy synchronous row work and show useful content quickly.
- Modal shells open before expensive modal body work starts.
- Image and network requests stay within a visible budget for the current route.
- Hidden tabs, panels, overlays, and closed dialogs do not perform heavy calculations or mount expensive trees.
- Virtualized list rows preserve visual spacing, allow immediate first scroll, and do not turn drag-scroll gestures into accidental row actions.

## How To Use This File

- To implement one item, prompt: `implement PERF-01`.
- To audit one item, prompt: `audit PERF-01`.
- To audit the whole performance plan, prompt: `run performance audit`.
- Each work item has a status, implementation notes, acceptance criteria, audit checklist, test evidence, and notes.
- When implementation or audit work is completed, update the matching work item and append a row to the audit log.
- Keep evidence concrete: command output summaries, browser observations, screenshots, traces, or file paths.

## Status Legend

- Planned: scoped but not started.
- In Progress: actively being implemented or audited.
- Partially Implemented: some intended changes exist, but the full item has not passed its audit checklist.
- Implemented: code changes are complete and ready for audit.
- Audited: implementation passed the checklist and has evidence recorded.
- Blocked: cannot proceed without a decision, dependency, or missing environment capability.
- Needs Rework: implemented or audited work failed acceptance criteria.

## Performance Work Items

### PERF-00: Baseline Measurement

Status: Audited

Purpose:
- Establish repeatable before-and-after performance evidence so later changes can be judged against a known baseline.

Implementation:
- Identify the highest-traffic routes for dashboard, dish list, ingredient list, shopping list, inventory, and relevant detail pages.
- Record initial route load behavior, list paint behavior, modal open latency, and visible loading feedback.
- Capture browser performance profiles for at least one heavy list route and one heavy modal route.
- Record current request counts, image counts, and large asset sizes for primary routes.
- Document measurement environment, browser, seed data, device profile, and commands used.

Acceptance Criteria:
- Baseline includes at least one route-level measurement for every primary list page.
- Baseline includes at least one modal open measurement from a known heavy modal.
- Baseline identifies the top synchronous work sources visible in browser profiling.
- Baseline records request count and largest image or data payload for sampled routes.
- Baseline evidence is added to the audit log with paths or clear reproduction notes.

Audit Checklist:
- Static inspection checks: confirm sampled routes cover the main page families and not only the fastest screens.
- Automated test checks: run existing regression or smoke tests if available to confirm baseline data is gathered from a working app.
- Manual browser checks if needed: use DevTools Performance and Network panels on representative data, including at least one list page with enough rows to expose slow row work.

Test Evidence:
- 2026-06-04: Added explicit Playwright baseline harness at `tests/e2e/performance-baseline.spec.ts`; it is skipped unless `PERF_BASELINE=1` is set.
- Baseline command: `$env:PERF_BASELINE='1'; $env:E2E_PORT='3026'; npx.cmd playwright test tests/e2e/performance-baseline.spec.ts --output D:\tmp\my-recipes-perf-artifacts`.
- Baseline result: passed 1 Playwright test on `msedge`; evidence written to `test-results/performance/perf-00-baseline.json`.
- Route visible timings: dashboard 1729ms; ingredient list 1370ms; dish list 1335ms; shopping list 1273ms; shopping-list detail 1240ms; scheduled-meal list 1207ms; expense planner 1224ms.
- Request/image snapshot: sampled routes made 6-10 resource requests and 3-7 image requests; largest sampled resource was dev `static/js/bundle.js` at 1,613,453 bytes.
- Heavy interaction profile evidence: `test-results/performance/perf-00-shopping-list-detail.cpuprofile` and `test-results/performance/perf-00-shopping-list-readonly-dish-modal.cpuprofile`.
- Modal shell baseline: shopping-list read-only dish modal became visible in 357ms.
- Regression command: `$env:E2E_PORT='3029'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-artifacts`.
- Regression result: passed 9, skipped 1 explicit `PERF-00` baseline test; report at `playwright-report/index.html` and JSON at `test-results/e2e-results.json`.

Notes:
- This is a dev-server baseline. Compare future measurements against the same browser, seeded data, and dev-server mode unless a production-build baseline is captured separately.
- `RootRouter` does not expose a standalone inventory list route; inventory-related baseline coverage comes through ingredient list, ingredient stock data, shopping-list detail, and dashboard urgent inventory rows.
- Initial e2e verification exposed stale assertions in dashboard, global search, and shopping-list cost tests; those were repaired before the final passing suite run.

### PERF-01: Remove Heavy Work From List Rows

Status: Audited

Purpose:
- Keep list rows cheap to render so navigation, scrolling, filtering, and route transitions are not blocked by repeated per-row calculations or hidden modal work.

Implementation:
- Audit all primary list rows for recursive traversal, aggregation, formatting, sorting, export generation, modal preparation, and selector work performed during render.
- Move repeated calculations from row components to parent-level memoized summaries keyed by stable entity IDs and source data versions.
- Pass precomputed row summaries into row components instead of recalculating from full collections inside each row.
- Mount closed row modal bodies only after the modal is opened.
- Defer expensive export or preview text generation until the user explicitly opens or requests that output.
- Preserve existing row behavior, empty states, sorting, filtering, badges, counts, and navigation actions.
- 2026-06-04 implementation: moved shopping-list row entity selectors to the screen/calendar parents and passed shared dish, scheduled-meal, and ingredient collections through row props.
- 2026-06-04 implementation: moved dish ingredient lookups to parent memoized maps, passed ingredient and inventory snapshots into rows, and kept row edit modal bodies unmounted until opened.
- 2026-06-04 implementation: moved scheduled-meal selection and dish-name lookup work to parent memoized `Set`/`Map` structures and passed compact row props.
- 2026-06-04 implementation: gated closed row modals in shopping-list, dish, dish-ingredient, scheduled-meal, and ingredient-list rows; deferred shopping-list export text and dish duration detail generation until opened.

Acceptance Criteria:
- Dish list, ingredient list, shopping list, inventory list, and any dashboard list rows have no repeated heavy calculations in row render paths.
- Closed row modals do not mount detail bodies or perform detail-only calculations.
- Row components receive compact summaries or IDs instead of full graph-like data when practical.
- Large list navigation and scrolling feel responsive on representative seeded data.
- Existing automated UI flows for list interactions still pass.

Audit Checklist:
- Static inspection checks: inspect row components and their child components for recursive traversal, full-array scans, expensive formatting, and closed modal bodies mounted by default.
- Automated test checks: run list, modal, and navigation regression tests that cover dish, ingredient, shopping-list, and inventory flows.
- Manual browser checks if needed: profile a large list route before and after row audit; confirm row render stacks shrink and closed modal content is absent until opened.

Test Evidence:
- 2026-06-04 static audit: inspected shopping-list rows, dish rows, dish-ingredient rows, scheduled-meal rows, ingredient-list stock rows, and dashboard urgent rows for row-local selectors, full-array scans, closed modal bodies, and hidden export/detail work.
- 2026-06-04 static result: row-local selectors were removed from the changed row hot paths; dashboard urgent rows and ingredient stock rows use parent-computed summaries/snapshots; no standalone inventory route exists.
- 2026-06-04 build command: `npm run build`.
- 2026-06-04 build result: passed with the existing lint/dependency warning set; latest bundle reported `build\static\js\main.0c692a08.js` at 566.96 kB gzip.
- 2026-06-04 e2e command: `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf01-artifacts`.
- 2026-06-04 e2e result: passed 9 Playwright tests and skipped 1 explicit `PERF-00` baseline test; report at `playwright-report/index.html`, JSON at `test-results/e2e-results.json`, artifacts at `D:\tmp\my-recipes-e2e-perf01-artifacts`.
- 2026-06-04 retry note: one earlier full-suite run hit a non-reproducible Playwright page setup timeout in a shopping-list test; targeted shopping-list rerun passed all 5 tests, and the final full-suite rerun passed.

Notes:
- `PERF-02` remains the follow-up for broader selector normalization and shared lookup-map patterns outside the row-render hot paths addressed here.
- No fresh `PERF_BASELINE=1` profile was captured for this item; use the `PERF-00` baseline files for before/after comparison if another timing pass is needed.

### PERF-02: Normalize Selectors And Lookup Maps

Status: Audited

Purpose:
- Reduce repeated full-collection scans by using stable selectors, lookup maps, and memoized derived data near shared state boundaries.

Implementation:
- Identify selectors and components that repeatedly call `find`, `filter`, `map`, `reduce`, or recursive helpers against full entity arrays during render.
- Create or reuse normalized lookup maps for ingredients, dishes, shopping lists, inventory batches, meal plans, and other high-use entities.
- Keep memoization dependencies narrow and stable so updates invalidate only affected summaries.
- Move cross-entity relationship derivation into shared selector helpers when multiple screens need the same calculation.
- Avoid duplicating normalized state if the existing store already provides an equivalent source of truth.
- 2026-06-04 implementation: added memoized `reselect` lookup selectors for ingredients, dishes, dish names, shopping lists, scheduled meals, and selected meal ids in `src/Store/Selectors.ts`.
- 2026-06-04 implementation: migrated feature modules and routing away from direct `RootState` selector lambdas to shared typed selectors.
- 2026-06-04 implementation: replaced repeated cross-entity `find` scans with shared maps in dashboard, global search, dish suggester, dish detail/export/cooking flows, ingredient detail/stats/use-first flows, scheduled-meal summaries, shopping-list detail, and route-level detail screens.
- 2026-06-04 implementation: left local `Set`/`Map` work in place where it is calculation-specific, such as recursive dish scoring, list filter counts, selected row sets, and formatter-local maps built lazily from component props.

Acceptance Criteria:
- High-traffic screens no longer rebuild identical lookup maps independently in many child components.
- Repeated entity lookups use keyed maps or memoized selectors instead of full-array scans where that materially reduces work.
- Selector outputs are stable enough to avoid avoidable rerenders in list rows and detail panels.
- Data correctness is unchanged for edits, deletes, imports, and route transitions.

Audit Checklist:
- Static inspection checks: inspect selectors, hooks, and page components for repeated full-array scans and duplicated lookup-map construction.
- Automated test checks: run regression tests for entity edit/delete flows and cross-entity screens that consume normalized selectors.
- Manual browser checks if needed: use React profiling or browser Performance traces to confirm selector recalculation drops on large seeded data.

Test Evidence:
- 2026-06-04 static audit command: `rg -n "useSelector\(\(state: RootState\)|RootState" src/Modules src/Routing src/Hooks`.
- 2026-06-04 static result: no direct `RootState` selector lambdas remain under modules, routing, or hooks.
- 2026-06-04 static audit: confirmed shared lookup selector usage across dashboard, global search, dish suggester, cooking, dish detail/export, ingredient detail/stats/use-first, scheduled-meal, shopping-list detail, and master-page cooking pill flows.
- 2026-06-04 build command: `npm run build`.
- 2026-06-04 build result: passed with the existing lint/dependency warning set; latest bundle reported `build\static\js\main.895b0909.js` at 566.76 kB gzip.
- 2026-06-04 e2e command: `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf02-artifacts`.
- 2026-06-04 e2e result: passed 9 Playwright tests and skipped 1 explicit `PERF-00` baseline test; report at `playwright-report/index.html`, JSON at `test-results/e2e-results.json`, artifacts at `D:\tmp\my-recipes-e2e-perf02-artifacts`.

Notes:
- Used existing `reselect` dependency only; no new state library, store migration, or duplicated normalized state was introduced.
- Reducer-local scans remain unchanged because they mutate scoped reducer state or operate on action payloads rather than render selectors.

### PERF-03: Lazy Tabs, Panels, And Modal Bodies

Status: Audited

Purpose:
- Prevent inactive UI surfaces from mounting expensive trees, fetching data, or running calculations before the user asks for them.

Implementation:
- Audit tabs, accordions, panels, drawers, overlays, and dialogs for hidden content that mounts by default.
- Render inactive tab and panel bodies only when selected, unless preserving internal state is required.
- Render modal shells immediately, then mount heavy body content after open state is true.
- Use lightweight placeholders or skeletons when deferred body content needs one frame to prepare.
- Keep focus management, accessibility labels, keyboard close behavior, and transition behavior intact.
- 2026-06-04 implementation: gated global search, cooking history, user guide, dish suggester, ingredient-detail suggester, scheduled-meal estimate detail, and nested dish-suggester shopping-list overlays so closed overlays do not mount their heavy trees.
- 2026-06-04 implementation: lazy-rendered shopping-list detail tabs by active key and skipped grouped-ingredient work unless the ingredients tab is active.
- 2026-06-04 implementation: wrapped scheduled-meal add/edit/detail/copy/range shopping, shopping-list add/calendar, cooking-session shopping-list, active cooking session, session switcher, and backup import/export bodies in `DeferredModalContent`.
- 2026-06-04 implementation: kept modal shells available for focus/transition behavior while deferring form, detail, calendar, export, and shopping-list generation bodies until open.

Acceptance Criteria:
- Closed modals do not run detail-only selectors, exports, charts, or expensive formatting.
- Inactive tabs and panels avoid mounting heavy bodies until selected.
- Opening a modal shows a shell quickly and then fills body content without layout jumps.
- Existing modal, drawer, tab, and keyboard interaction tests still pass.

Audit Checklist:
- Static inspection checks: inspect modal and tab call sites for unconditional child rendering while closed or inactive.
- Automated test checks: run modal, drawer, tab, and route navigation regression tests.
- Manual browser checks if needed: profile route load and modal open paths; confirm hidden content disappears from initial render stacks.

Test Evidence:
- 2026-06-04 static audit command: `rg -n -C 4 "<ShoppingListAddWidget|<ScheduledMealAddWidget|<ScheduledMealEditWidget|<ShoppingListMealDetailWidget|<CookingSessionWidget|<ShoppingListCalendarWidget" src/Modules src/Routing`.
- 2026-06-04 static result: heavy modal body widgets are either parent-gated or wrapped in `DeferredModalContent` at the audited call sites.
- 2026-06-04 static audit command: `rg -n "<Tabs|children: activeTab|children: \(" src/Modules src/Routing`.
- 2026-06-04 static result: shopping-list detail tabs render active-tab bodies only; remaining collapse children are either light guide/search summaries or behind already-gated modal screens.
- 2026-06-04 build command: `npm run build`.
- 2026-06-04 build result: passed with the existing lint/dependency warning set; latest bundle reported `build\static\js\main.4c625560.js` at 566.95 kB gzip.
- 2026-06-04 e2e command: `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf03-artifacts`.
- 2026-06-04 e2e result: passed 9 Playwright tests and skipped 1 explicit `PERF-00` baseline test; report at `playwright-report/index.html`, JSON at `test-results/e2e-results.json`, artifacts at `D:\tmp\my-recipes-e2e-perf03-artifacts`.

Notes:
- `DataBackup` still renders a lightweight restore button while the import modal is closed; the heavy `SmartForm` and textarea body are deferred.
- Dish suggester and user-guide collapse panels remain within parent-gated modal screens; no separate state-preservation exception was needed for the audited heavy modal bodies.

### PERF-04: Image And Network Budget

Status: Audited

Purpose:
- Keep route loading predictable by limiting unnecessary image requests, oversized assets, and background network work.

Implementation:
- Audit primary routes for image count, image dimensions, encoded size, lazy-loading behavior, and cache behavior.
- Ensure below-the-fold and hidden images use lazy loading or deferred rendering.
- Use appropriately sized image variants where the app has control over source assets.
- Avoid preloading or fetching detail-only assets before the user opens the relevant route, tab, or modal.
- Define a route-level image and request budget that can be checked during future audits.
- 2026-06-04 implementation: wrapped the shared `@components/Image` export so app icons and Ant Design images default to `preview={false}`, `loading="lazy"`, and `decoding="async"` unless a caller opts into eager loading.
- 2026-06-04 implementation: kept the current header feature icon and drawer logo eager because they are above-the-fold identity/navigation signals.
- 2026-06-04 implementation: converted global-search and drawer raw icon `<img>` tags to the shared `Image` component with decorative `alt=""`, eliminating eager raw icon requests and the related missing-alt warnings.
- 2026-06-04 implementation: preserved `DishImageWidget`'s existing intersection-observer gate plus native lazy image loading for user dish photos.
- 2026-06-04 budget: primary dev routes should stay at or below 10 total resource requests, 7 image requests, and 1.9 MB transfer size under the current seeded Playwright baseline; production audits should record a separate production-build transfer budget.

Acceptance Criteria:
- Primary list routes do not eagerly load hidden modal images or below-the-fold detail images.
- Large image assets have an explicit reason or a smaller replacement path.
- Network panel evidence shows route request counts and transfer size within the documented budget.
- Existing visual behavior is preserved, including thumbnails, placeholders, and fallback images.

Audit Checklist:
- Static inspection checks: inspect image components, modal content, route preloads, and data fetching hooks for eager hidden work.
- Automated test checks: run visual or smoke tests that cover image-heavy routes if available.
- Manual browser checks if needed: inspect DevTools Network with cache disabled and enabled; confirm lazy images are not requested before they are visible or needed.

Test Evidence:
- 2026-06-04 static audit command: `rg -n "<img" src/Modules src/Routing src/Components`.
- 2026-06-04 static result: only `DishImageWidget` and `ImageInput` still use raw `<img>`; dish photos are intersection-observer/native lazy loaded, and image-input previews are local user-selected data.
- 2026-06-04 asset audit: largest bundled icons are 512x512 PNGs; top sizes were `noodles.png` 70,103 bytes, `clock (1).png` 57,007 bytes, `vegetable1.png` 45,428 bytes, `budget.png` 35,624 bytes, and `logo.png` 35,228 bytes.
- 2026-06-04 route budget command: `$env:PERF_BASELINE='1'; $env:E2E_PORT='3026'; npx.cmd playwright test tests/e2e/performance-baseline.spec.ts --output D:\tmp\my-recipes-perf04-artifacts`.
- 2026-06-04 route budget result: passed 1 Playwright baseline test; route evidence written to `test-results/performance/perf-00-baseline.json` and artifacts at `D:\tmp\my-recipes-perf04-artifacts`.
- 2026-06-04 route budget counts: dashboard 7 requests/4 images; ingredient list 7/4; dish list 7/4; shopping list 6/3; shopping-list detail 10/7; scheduled-meal list 10/7; expense planner 7/4.
- 2026-06-04 route transfer snapshot: sampled dev routes were 1,748,551-1,850,250 bytes transfer; largest resource remained dev `static/js/bundle.js` at 1,615,283 bytes.
- 2026-06-04 build command: `npm run build`.
- 2026-06-04 build result: passed with the existing lint/dependency warning set; latest bundle reported `build\static\js\main.a13010e4.js` at 567.01 kB gzip.
- 2026-06-04 e2e command: `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf04-artifacts`.
- 2026-06-04 e2e result: passed 9 Playwright tests and skipped 1 explicit `PERF-00` baseline test; report at `playwright-report/index.html`, JSON at `test-results/e2e-results.json`, artifacts at `D:\tmp\my-recipes-e2e-perf04-artifacts`.

Notes:
- The budget numbers are dev-server measurements for the current seeded Playwright data. Re-record budgets separately for production-build profiling before using transfer-size thresholds in CI.
- Icon source files remain 512x512 PNGs; replacing them with smaller encoded variants is a future asset-pipeline optimization, not required for this step because current route image counts and transfer sizes are within budget.

### PERF-05: Navigation And Loading Overlay

Status: Audited

Purpose:
- Make route transitions feel immediate and prevent loading indicators from adding avoidable delay or masking blocked main-thread work.

Implementation:
- Audit sidebar, header, global search, detail-link, and row-link navigation paths.
- Ensure navigation starts promptly after user intent and does not wait for nonessential animation or cleanup.
- Keep route feedback visible during data preparation or lazy component loading.
- Avoid loading overlays that block interaction longer than necessary after the target route is ready.
- Confirm back/forward navigation and query-param navigation preserve expected behavior.
- 2026-06-04 implementation: extracted duplicated sidebar/bottom-tab route feedback timers into `useRouteLoadingFeedback`, with stable callback dependencies and shared fallback cleanup.
- 2026-06-04 implementation: removed the sidebar drawer's 80ms navigation delay; sidebar navigation now closes the drawer, shows feedback, and starts route navigation immediately.
- 2026-06-04 implementation: kept bottom-tab navigation feedback immediate by flushing the loading state before starting route navigation.
- 2026-06-04 implementation: changed global-search result navigation to close the search overlay before starting the route transition.
- 2026-06-04 implementation: wrapped dashboard card/action navigation, list-row detail navigation, and read-only dish detail navigation in `React.startTransition` so heavy route updates are not scheduled as urgent UI work.

Acceptance Criteria:
- Clicking navigation controls produces immediate visual feedback.
- Route changes are not delayed by drawer close animations, unnecessary timeouts, or synchronous cleanup.
- Loading overlay appears only while useful and disappears promptly after route content is usable.
- Existing navigation regression tests still pass.

Audit Checklist:
- Static inspection checks: inspect navigation handlers for delayed route changes, broad synchronous work before navigation, and overlay state that can remain stuck.
- Automated test checks: run global search, sidebar, row navigation, and detail navigation tests.
- Manual browser checks if needed: use slow CPU throttling and click through primary routes; confirm feedback appears before heavy work completes.

Test Evidence:
- 2026-06-04 static audit command: `rg -n "navigationDelay|navigationTimerRef|useRouteLoadingFeedback|startRouteLoading|React\.startTransition\(\(\) => navigate|openRoute" src/Routing/MasterPage.tsx src/Modules/Home/Screens/GlobalSearch.screen.tsx src/Modules/Home/Screens/Dashboard.screen.tsx src/Modules/Dishes/Screens/DishesList.screen.tsx src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx src/Modules/Dishes/Screens/DishesManageIngredient/DishReadonlyDetail.widget.tsx`.
- 2026-06-04 static result: no `navigationDelay` or `navigationTimerRef` matches remain; route feedback is centralized in `useRouteLoadingFeedback`, and high-traffic dashboard/search/list/detail links use transition-wrapped navigation.
- 2026-06-04 build command: `npm run build`.
- 2026-06-04 build result: passed with the existing lint/dependency warning set; the previous `MasterPage.tsx` `finishRouteLoading` dependency warnings are gone; latest bundle reported `build\static\js\main.9ac9d2ba.js` at 566.95 kB gzip.
- 2026-06-04 e2e command: `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf05-artifacts`.
- 2026-06-04 e2e result: passed 9 Playwright tests and skipped 1 explicit `PERF-00` baseline test; report at `playwright-report/index.html`, JSON at `test-results/e2e-results.json`, artifacts at `D:\tmp\my-recipes-e2e-perf05-artifacts`.

Notes:
- Direct browser back/list actions and post-create callbacks remain functionally unchanged unless they were part of a heavy route-entry path audited here.

### PERF-06: Heavy Calculation Scheduling

Status: Audited

Purpose:
- Keep unavoidable heavy calculations from blocking urgent user interactions, route feedback, and modal shell rendering.

Implementation:
- Identify heavy calculations that cannot be removed through memoization or normalized lookup maps.
- Schedule nonurgent calculations after first paint, after modal shell open, or during idle periods where practical.
- Split large calculations into smaller chunks if they can block interaction on representative data.
- Cache derived results with clear invalidation rules based on source data changes.
- Keep user-visible totals, badges, and warnings correct when scheduled work finishes.
- 2026-06-04 implementation: added `useScheduledCalculation` to run nonurgent derived calculations after two animation frames and publish results through transition state updates.
- 2026-06-04 implementation: moved dashboard inventory dish scoring and shopping-list cost aggregation out of render and added pending-safe dashboard cost/suggestion states.
- 2026-06-04 implementation: scheduled dish suggester ingredient scoring, inventory scoring, and duration filtering with pending result panels and disabled create-cart actions while current results are stale.
- 2026-06-04 implementation: scheduled dish detail cost estimates, full expense planner ingredient/cost rollups, scheduled-meal estimate summaries, and shopping-list cost-tab summaries with visible pending states.

Acceptance Criteria:
- Heavy nonurgent work does not run before initial route feedback or modal shell render.
- Scheduled work has a visible loading, pending, or stale-safe state when needed.
- Derived values update correctly after source data changes.
- Browser profiling shows reduced long tasks in the interaction path being optimized.

Audit Checklist:
- Static inspection checks: inspect expensive helpers, recursive graph calculations, recommendation engines, export generation, and statistics panels for synchronous interaction-path work.
- Automated test checks: run tests that validate derived totals, suggestions, summaries, and update-after-edit behavior.
- Manual browser checks if needed: profile representative heavy interactions and confirm long tasks move out of urgent paths or are split.

Test Evidence:
- 2026-06-04 static audit: CodeGraph context/explore plus focused diff review identified render-path cost/scoring call sites in dashboard, dish suggester, dish cost estimate, expense planner, scheduled-meal estimate summary, and shopping-list cost tab.
- 2026-06-04 diff review command: `git diff --stat -- src\Hooks\useScheduledCalculation.ts src\Hooks\index.ts src\Modules\Home\Screens\Dashboard.screen.tsx src\Modules\DishSuggester\Screens\DishSuggester.screen.tsx src\Modules\Dishes\Screens\DishesManageIngredient\DishCostEstimate.widget.tsx src\Modules\Dishes\Screens\DishesManageIngredient\DishExpensePlanner.widget.tsx src\Modules\ScheduledMeal\Screens\ScheduledMealEstimateSummary.widget.tsx src\Modules\ShoppingList\Screens\ShoppingListDetail.widget.tsx`.
- 2026-06-04 build command: `npm run build`.
- 2026-06-04 build result: passed with the existing warning set; latest bundle reported `build\static\js\main.84d532a9.js` at 567.81 kB gzip.
- 2026-06-04 e2e command: `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf06-artifacts`.
- 2026-06-04 e2e result: passed 9 Playwright tests and skipped 1 explicit `PERF-00` baseline test; JSON stats were `expected: 9`, `skipped: 1`, `unexpected: 0`, `flaky: 0`; report at `playwright-report/index.html`, artifacts at `D:\tmp\my-recipes-e2e-perf06-artifacts`.

Notes:
- The shared scheduler currently defers work until after the first two animation frames. Chunking or workerization remains a follow-up only if larger representative data still shows long tasks after this scheduling pass.

### PERF-07: Performance Regression Suite

Status: Audited

Purpose:
- Add repeatable checks that prevent the same performance regressions from returning after implementation work is complete.

Implementation:
- Define a small set of performance smoke flows for list navigation, row rendering, modal opening, tab activation, and image-heavy routes.
- Seed enough deterministic data to expose row and selector work without making the suite too slow.
- Add assertions for user-visible responsiveness where feasible, such as route feedback, modal shell visibility, and lazy content behavior.
- Record request counts or asset budgets for key routes if the test environment supports stable network inspection.
- Keep the suite maintainable and focused on regressions that have already occurred or are likely to recur.
- 2026-06-04 implementation: added `tests/e2e/performance-regression.spec.ts` to the normal Playwright suite.
- 2026-06-04 implementation: added assertions that inactive shopping-list detail tabs and read-only dish modal bodies stay unmounted until requested.
- 2026-06-04 implementation: added smoke budgets for dashboard-to-shopping-list-detail navigation, lazy dishes-tab activation, read-only dish modal visibility, route request count, route image count, and hidden external dish-image requests before modal open.
- 2026-06-04 implementation: wrote repeatable PERF-07 evidence to `test-results/performance/perf-07-regression.json`.

Acceptance Criteria:
- Regression suite covers at least one heavy list route and one heavy modal interaction.
- Tests fail when closed modal bodies, inactive heavy tabs, or hidden images are mounted or requested too early where assertions are practical.
- Suite can be run locally with documented commands.
- Test results and artifact paths are recorded in the audit log after each relevant run.

Audit Checklist:
- Static inspection checks: confirm test names, seeded data, and assertions map back to the performance risks in this file.
- Automated test checks: run the performance regression suite and relevant existing e2e smoke tests.
- Manual browser checks if needed: compare automated coverage against a manual DevTools profile and document gaps that automation cannot catch reliably.

Test Evidence:
- 2026-06-04 targeted command: `$env:E2E_PORT='5000'; npx.cmd playwright test tests/e2e/performance-regression.spec.ts --output D:\tmp\my-recipes-e2e-perf07-artifacts`.
- 2026-06-04 targeted result: passed 2 PERF-07 Playwright tests.
- 2026-06-04 full-suite command: `$env:E2E_PORT='5000'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf07-full-artifacts`.
- 2026-06-04 full-suite result: passed 11 Playwright tests and skipped 1 explicit `PERF-00` baseline test.
- 2026-06-04 PERF-07 evidence: `test-results/performance/perf-07-regression.json` recorded dashboard-to-detail at 405ms, dishes-tab visibility at 132ms, read-only dish modal visibility at 327ms, route resources at 7 requests and 6 images, and zero external dish-image requests before modal open.

Notes:
- The repo's `.env` pins CRA to `PORT=5000`, so the verified PERF-07 Playwright commands used `E2E_PORT=5000` to reuse the reachable dev server.
- The explicit `PERF-00` baseline test remains opt-in; the new PERF-07 regression spec runs in the standard suite.

### PERF-08: Dynamic Virtualized List Paging And Interaction Guard

Status: Audited

Purpose:
- Cover the class of regressions that remained after the original performance plan: virtualized row spacing, dynamic card height, scroll intent handling, first-scroll behavior, local list paging, and visible-card/modal rerender churn while overlays open.

Implementation:
- Extend the shared `VirtualListRowFrame` with dynamic-row mode so measured rows keep stable box sizing, consistent padding, visible overflow for measurement, mobile scroll hints, and drag-click suppression for pointer and touch gestures.
- Add `usePagedVirtualItems` for client-side incremental paging over already-filtered local arrays so large lists do not mount every matching item at first paint.
- Switch dish and ingredient lists from fixed row-height assumptions to `react-window` dynamic row-height measurement with sensible default heights.
- Load more local dish/ingredient rows near the end of the visible page and show a lightweight `Đã tải x/y` status chip while more rows remain.
- Keep dish and ingredient virtual-list style objects stable and reduce overscan to lower extra rich-card work.
- Move ingredient inventory modal ownership to the ingredient list screen so each row no longer owns inventory modal state or an inventory modal subtree.
- Expand deterministic e2e seed data to expose local paging without changing shopping-list cost totals.
- Extend `tests/e2e/performance-regression.spec.ts` with checks for dish gap consistency, ingredient dynamic height/clipping, local paging to the last seeded ingredient, drag-scroll suppression, and normal modal opening after an intentional click.

Acceptance Criteria:
- Dish and ingredient rows are visually separated, including the first-to-second dish gap.
- Ingredient rows with wrapped badges/content are measured dynamically and are not clipped in representative mobile-sized viewports.
- Large local dish and ingredient lists initially render a bounded page and incrementally expose more rows during scroll.
- Dragging or scrolling over a row action does not open a detail or inventory modal by accident.
- A normal intentional click still opens the expected modal or row action.
- Opening modal chrome while a large list is visible avoids per-row inventory modal work and does not mount hidden row-owned modal bodies.
- Build and focused performance regression tests pass.

Audit Checklist:
- Static inspection checks: confirm dynamic virtualized rich rows use `VirtualListRowFrame layout="dynamic"`, dynamic row-height measurement, stable list styles, bounded page counts, and parent-owned modal state where row-owned modal state would multiply work.
- Automated test checks: run the focused Playwright performance regression suite and confirm it covers row spacing, clipping, local paging, drag-click suppression, and intentional modal opening.
- Manual browser checks if needed: visually inspect dish and ingredient screens after build with representative seeded data; confirm rows are separated, wrapped cards are not clipped, scrolling feels immediate, and modal/sidebar interactions do not visibly stall.

Test Evidence:
- 2026-06-05 build command: `npm.cmd run build`.
- 2026-06-05 build result: passed with the existing lint/dependency warning set.
- 2026-06-05 e2e command: `$env:E2E_PORT='5000'; npx.cmd playwright test tests/e2e/performance-regression.spec.ts --reporter=list`.
- 2026-06-05 e2e result: passed 4 Playwright tests covering dish gap consistency, ingredient dynamic row spacing/clipping/paging, drag-scroll intent, lazy tab/modal mounting, and route/modal smoke budgets.
- 2026-06-05 fixture regression command: `$env:E2E_PORT='5000'; npx.cmd playwright test tests/e2e/shopping-list.spec.ts -g "shows separate remaining-cart" --reporter=list`.
- 2026-06-05 fixture regression result: passed 1 Playwright test confirming the expanded ingredient seed did not change shopping-list remaining-cart and bought expense totals.

Notes:
- The original plan was not broad enough for this regression class. It targeted heavy calculations, hidden work, image budgets, and modal lazy mounting, but it did not require dynamic virtualization layout assertions, local paging assertions, or gesture-intent checks.
- This item should remain in the plan as a required audit gate whenever virtualized list measurement, row actions, list paging, or row-owned modal state changes.

## Audit Log

| Date | Step ID | Command/test run | Result | Evidence path | Follow-up |
|---|---|---|---|---|---|
| 2026-06-04 | PERF-00 | `$env:PERF_BASELINE='1'; $env:E2E_PORT='3026'; npx.cmd playwright test tests/e2e/performance-baseline.spec.ts --output D:\tmp\my-recipes-perf-artifacts` | Passed 1 Playwright baseline test; captured route timings, request/image counts, CDP metrics, and CPU profiles. | `test-results/performance/perf-00-baseline.json`; `test-results/performance/perf-00-shopping-list-detail.cpuprofile`; `test-results/performance/perf-00-shopping-list-readonly-dish-modal.cpuprofile` | Use as comparison baseline for `PERF-01` through `PERF-04`. |
| 2026-06-04 | PERF-00 | `$env:E2E_PORT='3029'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-artifacts` | Passed 9, skipped 1 explicit baseline test. | `playwright-report/index.html`; `test-results/e2e-results.json` | None for `PERF-00`; stale e2e selectors were repaired before the final run. |
| 2026-06-04 | PERF-01 | Static row audit; `npm run build`; `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf01-artifacts` | Audited row render hot paths; build passed with existing warnings; final full e2e passed 9 and skipped 1 explicit `PERF-00` baseline test. | `playwright-report/index.html`; `test-results/e2e-results.json`; `D:\tmp\my-recipes-e2e-perf01-artifacts` | Continue with `PERF-02` selector and lookup normalization. |
| 2026-06-04 | PERF-02 | Static selector audit; `npm run build`; `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf02-artifacts` | Added shared memoized lookup selectors; migrated feature modules/routing to typed selectors; build passed with existing warnings; full e2e passed 9 and skipped 1 explicit `PERF-00` baseline test. | `src/Store/Selectors.ts`; `playwright-report/index.html`; `test-results/e2e-results.json`; `D:\tmp\my-recipes-e2e-perf02-artifacts` | Continue with `PERF-03` lazy tabs, panels, and modal bodies. |
| 2026-06-04 | PERF-03 | Static lazy-render audit; `npm run build`; `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf03-artifacts` | Lazy-rendered shopping-list detail tabs and deferred heavy modal bodies across scheduled meals, shopping lists, cooking, global overlays, and backup dialogs; build passed with existing warnings; full e2e passed 9 and skipped 1 explicit `PERF-00` baseline test. | `src/Components/Modal/Modal.tsx`; `playwright-report/index.html`; `test-results/e2e-results.json`; `D:\tmp\my-recipes-e2e-perf03-artifacts` | Deploy `PERF-03`, then continue with `PERF-04` image and network budget. |
| 2026-06-04 | PERF-04 | Static image audit; `npm run build`; `$env:PERF_BASELINE='1'; $env:E2E_PORT='3026'; npx.cmd playwright test tests/e2e/performance-baseline.spec.ts --output D:\tmp\my-recipes-perf04-artifacts`; `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf04-artifacts` | Added shared lazy/async image defaults, converted remaining route raw icon images, documented route request/image/transfer budgets, and verified build plus e2e. | `src/Components/Image/Image.tsx`; `test-results/performance/perf-00-baseline.json`; `playwright-report/index.html`; `test-results/e2e-results.json`; `D:\tmp\my-recipes-perf04-artifacts`; `D:\tmp\my-recipes-e2e-perf04-artifacts` | Deploy `PERF-04`, then continue with `PERF-05` navigation and loading overlay. |
| 2026-06-04 | PERF-05 | Static navigation audit; `npm run build`; `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf05-artifacts` | Centralized sidebar/bottom-tab route feedback, removed sidebar navigation delay, transition-wrapped high-traffic dashboard/search/list/detail navigation, and verified build plus e2e. | `src/Routing/MasterPage.tsx`; `src/Modules/Home/Screens/Dashboard.screen.tsx`; `src/Modules/Home/Screens/GlobalSearch.screen.tsx`; `playwright-report/index.html`; `test-results/e2e-results.json`; `D:\tmp\my-recipes-e2e-perf05-artifacts` | Deploy `PERF-05`, then continue with `PERF-06` heavy calculation scheduling. |
| 2026-06-04 | PERF-06 | CodeGraph static audit; focused diff review; `npm run build`; `$env:E2E_PORT='3032'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf06-artifacts` | Added shared scheduled calculation hook, moved dashboard/suggester/planner/cost-tab heavy calculations out of urgent render paths, added pending-safe UI states, and verified build plus e2e. | `src/Hooks/useScheduledCalculation.ts`; `src/Modules/DishSuggester/Screens/DishSuggester.screen.tsx`; `src/Modules/Dishes/Screens/DishesManageIngredient/DishExpensePlanner.widget.tsx`; `playwright-report/index.html`; `test-results/e2e-results.json`; `D:\tmp\my-recipes-e2e-perf06-artifacts` | Deploy `PERF-06`, then continue with `PERF-07` performance regression suite. |
| 2026-06-04 | PERF-07 | `$env:E2E_PORT='5000'; npx.cmd playwright test tests/e2e/performance-regression.spec.ts --output D:\tmp\my-recipes-e2e-perf07-artifacts`; `$env:E2E_PORT='5000'; npx.cmd playwright test --output D:\tmp\my-recipes-e2e-perf07-full-artifacts` | Added normal-suite performance regression tests for lazy tab/modal mounting, route/modal smoke budgets, route request/image budget, and hidden dish-image requests; targeted PERF-07 passed 2 tests; full suite passed 11 and skipped 1 explicit baseline. | `tests/e2e/performance-regression.spec.ts`; `test-results/performance/perf-07-regression.json`; `playwright-report/index.html`; `test-results/e2e-results.json`; `D:\tmp\my-recipes-e2e-perf07-artifacts`; `D:\tmp\my-recipes-e2e-perf07-full-artifacts` | Deploy `PERF-07`; performance plan implementation is complete. |
| 2026-06-05 | PERF-08 | `npm.cmd run build`; `$env:E2E_PORT='5000'; npx.cmd playwright test tests/e2e/performance-regression.spec.ts --reporter=list`; `$env:E2E_PORT='5000'; npx.cmd playwright test tests/e2e/shopping-list.spec.ts -g "shows separate remaining-cart" --reporter=list` | Added dynamic virtual row framing, local list paging, dynamic row-height measurement, parent-owned ingredient inventory modal state, expanded paging fixture data, and verified row spacing, clipping, paging, drag-scroll intent, and fixture totals. | `src/Components/List/VirtualListRowFrame.tsx`; `src/Hooks/usePagedVirtualItems.ts`; `src/Modules/Dishes/Screens/DishesList.screen.tsx`; `src/Modules/Ingredient/Screens/IngredientList.screen.tsx`; `tests/e2e/performance-regression.spec.ts`; `tests/e2e/fixtures/testData.ts` | Keep `PERF-08` as the regression gate for future virtualized list measurement, paging, and row action work. |
