# Phase 1: Measurement and Performance Harness - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers a repo-local measurement harness for large-list responsiveness. It should seed deterministic data, run ingredient/dish/shopping-list performance checks, compare online/offline/network-stub behavior, and write evidence that later fix phases can use as the baseline.

This phase does not fix the slow modal, drawer, row menu, route, image, sync, or service-worker hot paths except where minimal harness plumbing is required to make measurements reproducible.

</domain>

<decisions>
## Implementation Decisions

### Dataset Scale
- **D-01:** Use both a realistic daily baseline and a stress baseline.
- **D-02:** Daily baseline should be approximately 200 ingredients, 150 dishes, and 100 shopping lists.
- **D-03:** Stress baseline should be approximately 1,000 ingredients, 750 dishes, and 500 shopping lists.
- **D-04:** Fixtures must include realistic relationships, not flat lists only: inventory batches, shopping-list ingredients, scheduled meals, dish ingredients, and some included dishes.
- **D-05:** Dish image data should be mixed: some local/base64-like images, some remote URLs, and most fallback/simple image states. Do not make every row image-heavy.

### Timing Budgets
- **D-06:** Phase 1 is baseline-first. It should capture timings and propose budgets, but should not fail strict UX interaction thresholds until later fix phases.
- **D-07:** The UX target to report is that the interaction shell should visibly respond in under 100 ms. Heavy body/content may complete later and must be measured separately.
- **D-08:** Measure all requested interaction classes: modal shell, drawer/sidebar, row menu, detail route navigation, and search/filter reset.
- **D-09:** Track shell-visible timing separately from content-ready timing so later phases can optimize perceived responsiveness without hiding remaining body work.

### Online/Offline Setup
- **D-10:** Implement three comparison modes: online normal, browser offline, and mocked slow/blocked GitHub plus image network.
- **D-11:** Stub GitHub shared-data requests by default for deterministic regression tests. Provide an opt-in real-network baseline command for diagnosis.
- **D-12:** Stub remote images with controllable delay so fast-image and slow-image modes are deterministic.
- **D-13:** Keep normal regression tests with service workers disabled. Add an optional production/service-worker measurement path rather than mixing service-worker behavior into every run.

### Evidence Format
- **D-14:** Write machine-readable JSON plus a short markdown summary for each baseline run.
- **D-15:** Store raw run outputs under `test-results/performance/`.
- **D-16:** Update docs with stable commands, summary, and proposed budgets only. Do not commit or document every raw timing run as product documentation.
- **D-17:** Normal runs should avoid heavy traces/profiles. Provide an optional diagnostic command that captures traces, CPU profiles, or similarly heavier artifacts.
- **D-18:** Phase 1 should fail setup/runtime errors and generous smoke thresholds only. Strict UX target misses should be warnings in JSON/markdown, not failing assertions, until the later fix phases convert them into gates.

### Agent Discretion
- Use existing Playwright-style e2e patterns and existing localStorage seeding shape unless there is a concrete blocker.
- Planner may choose exact script names and JSON field names, but they must be repo-local, deterministic, and documented.
- If clean-install Playwright wiring requires dependency/config updates, include that in Phase 1 because `TEST-01` requires repo-local execution.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Context
- `.planning/PROJECT.md` - Product scope, milestone goal, constraints, and confirmation that main list screens use virtualization rather than page-level pagination.
- `.planning/REQUIREMENTS.md` - Phase 1 requirement mapping: `PERF-01`, `PERF-02`, `TEST-01`, and `UX-01`.
- `.planning/ROADMAP.md` - Phase 1 goal, success criteria, and three planned work items.
- `.planning/codebase/STRUCTURE.md` - Source layout and key feature/test files.
- `.planning/codebase/TESTING.md` - Current test runner state, e2e fixture patterns, performance evidence paths, and known Playwright wiring gaps.
- `.planning/codebase/CONCERNS.md` - Known issues around Jest alias failure, Playwright not being repo-wired, virtualized-list fragility, storage/network limits, and performance bottlenecks.
- `.planning/codebase/INTEGRATIONS.md` - GitHub Raw/Gist/service-worker/localStorage behavior and existing e2e stubbing patterns.

### Existing Performance/Test Docs
- `docs/performance-audit-plan.md` - Existing performance goals, audit history, route/modal evidence examples, and virtualized-list regression guard expectations.
- `docs/automated-regression-test-plan.md` - Current e2e matrix, seed data purpose, expected command names, and reporting expectations.

### Existing Specs And Fixtures
- `tests/e2e/performance-regression.spec.ts` - Current normal performance regression examples for virtualized list spacing, lazy content, modal timing, resource summaries, and JSON evidence.
- `tests/e2e/performance-baseline.spec.ts` - Existing opt-in `PERF_BASELINE=1` baseline pattern for route timings, resource summaries, CDP metrics, modal timing, and CPU profiles.
- `tests/e2e/fixtures/testData.ts` - Current deterministic seed shape for ingredients, dishes, shopping lists, inventory, scheduled meals, and dish images.
- `tests/e2e/fixtures/seedApp.ts` - Current localStorage seeding, GitHub Raw stubbing, service-worker unregistering, and cache clearing.
- `tests/e2e/fixtures/appTest.ts` - Shared Playwright fixture wrapper.

### Source Integration Points
- `package.json` - Current scripts only include `start`, `build`, `test`, and `eject`; Playwright dependency/config/scripts are not yet repo-local.
- `src/Store/Store.ts` - Redux Persist split between shared and personal persisted state.
- `src/Store/Selectors.ts` - Existing selector/lookup-map patterns that seed data and tests must respect.
- `src/Modules/Ingredient/Screens/IngredientList.screen.tsx` - Primary ingredient large-list screen.
- `src/Modules/Dishes/Screens/DishesList.screen.tsx` - Primary dish large-list screen.
- `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx` - Primary shopping-list large-list screen.
- `src/Components/List/VirtualListRowFrame.tsx` - Shared row frame used by virtualized rich rows.
- `src/Components/List/VirtualListScrollTopButton.tsx` - Shared virtual-list scroll helper.
- `src/Components/Modal/Modal.tsx` - Shared Ant Design modal export and `DeferredModalContent` implementation.
- `src/Hooks/useSharedDataSync.ts` - Online startup shared-manifest check; skips when `navigator.onLine` is false.
- `src/Components/AppInitializer/AppInitializer.tsx` - Mount point for shared sync prompt logic.
- `src/Components/AppInitializer/SharedSyncModal.tsx` - Shared-data import prompt and heavier sync impact path.
- `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx` - Dish image loading surface relevant to online/offline and slow-image measurements.
- `src/index.tsx`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts` - Service-worker registration and production/PWA measurement path.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/e2e/fixtures/testData.ts` and `createRegressionSeed()` already build Redux Persist-compatible shared/personal data. Phase 1 should extend or add adjacent builders for daily and stress datasets rather than inventing a separate persistence format.
- `tests/e2e/fixtures/seedApp.ts` already seeds `persist:shared` and `persist:personal`, stubs `https://raw.githubusercontent.com/**`, sets shared sync metadata, unregisters service workers, and clears caches.
- `tests/e2e/performance-baseline.spec.ts` already writes `test-results/performance/perf-00-baseline.json` and optional `.cpuprofile` files. This is the closest existing pattern for opt-in diagnostic evidence.
- `tests/e2e/performance-regression.spec.ts` already writes JSON evidence and shows how to measure click-to-visible timings with Playwright locators.
- `src/Components/Modal/DeferredModalContent` waits two animation frames before mounting heavy modal content. Measurements must distinguish shell-visible from content-ready because this component intentionally decouples them.

### Established Patterns
- The app is a React 18 CRA/CRACO SPA using Redux Toolkit, Redux Persist, React Router, Ant Design, Workbox, and `react-window`.
- The primary ingredient, dish, and shopping-list list screens use virtualization. The pagination observed in codebase mapping is not the main large-list mechanism; it is in `src/Modules/ShoppingList/Screens/ShoppingListCalendar.widget.tsx`.
- Browser localStorage is the primary persisted data boundary. Large fixtures should seed localStorage through Redux Persist-compatible payloads, not by dispatching long setup flows through the UI.
- Existing e2e tests prefer real app flows, seeded state, role/text selectors, and `data-testid` hooks. Keep that style for performance harness coverage.
- Existing deterministic e2e setup disables service-worker interference. Phase 1 should preserve that for normal regression checks and add a separate optional production/service-worker path.

### Integration Points
- Package scripts/config need attention because `package.json` does not currently define `test:e2e`, `test:e2e:report`, or Playwright dependency/config, even though docs/specs reference Playwright.
- The online/offline comparison should control `navigator.onLine`, GitHub Raw routes, and remote image requests. Default regression mode should not depend on live GitHub or real image hosts.
- The reported offline speed difference is plausible from code: `useSharedDataSync` returns immediately when `navigator.onLine` is false, while online mode may fetch GitHub Raw manifest data and later sync data.
- Normal Phase 1 verification should not read or document `.env` secret values. It may reference env key names or command env vars only.

</code_context>

<specifics>
## Specific Ideas

- The user specifically wants confirmation and evidence around large-list behavior: current main list screens use virtualization, not page-level pagination. Pagination exists elsewhere but is not the large-list display strategy for the primary problem screens.
- The user specifically observed that the app feels faster with no internet connection. Phase 1 should make that observable by separating online normal, browser offline, and mocked slow/blocked network modes.
- For UX reporting, the important number is not only full content readiness. The shell should respond visibly under 100 ms where possible; content-ready timing can be longer and should be reported separately.

</specifics>

<deferred>
## Deferred Ideas

- Actual performance fixes for row rerenders, modal/drawer opening, route transitions, image handling, sync deferral, service-worker behavior, and app-shell navigation belong in Phases 2-4.
- Strict CI performance gates belong after the baseline and fixes are in place. Phase 1 should warn on strict UX misses and only fail setup/runtime errors or generous smoke thresholds.

</deferred>

---

*Phase: 1-Measurement and Performance Harness*
*Context gathered: 2026-06-05*
