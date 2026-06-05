# Phase 3: Online and Offline Cost Isolation - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers online/offline cost isolation for the existing browser-only, local-first My Recipes SPA. The phase controls startup shared-data sync, sync prompt workload, dish image/network work, and deterministic online/offline comparison checks so online mode stays responsive without breaking offline use.

This phase preserves the current local-first shared/personal persistence split, keeps GitHub shared-data sync and Gist backup workflows, keeps useful dish/list row information, and keeps normal regression checks service-worker-free. It does not remove online sync, redesign the list UI, migrate storage or backend architecture, make production service-worker behavior a strict phase gate, or take over broad drawer/navigation/app-shell route responsiveness from Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Startup Sync Timing
- **D-01:** Run the shared-data manifest check only after the app shell/list is usable. Do not let the online manifest fetch compete with first startup render or list responsiveness.
- **D-02:** Use a short idle delay, roughly 1-2 seconds after the first usable screen, before starting the deferred manifest check.
- **D-03:** User interaction wins. If the user is typing, searching, scrolling, opening a modal, or navigating, postpone the sync check until another quiet moment.
- **D-04:** Do not show a visible checking-for-updates status for the deferred background check. Only show UI if shared updates are found, or if the user opens an explicit sync area.

### Sync Prompt Workload
- **D-05:** Use a fast prompt first. When shared updates are found, show the sync modal quickly with basic update counts/names, then fetch full shared data and compute heavier impact warnings after the modal is visible.
- **D-06:** Let the user review and select visible update items while full shared data or impact warnings are still loading, but keep the final sync action disabled until required shared data is ready.
- **D-07:** Show impact warnings progressively. The modal can list update items first, then add warning details as they are computed with a clear loading state for warnings still being checked.
- **D-08:** Fix the selective-sync version bug in Phase 3. When only ingredients or only dishes are synced, unchanged version fields must be preserved instead of being saved as empty strings. Repeated prompts or misleading online/offline test noise should not be created by version drift.

### Dish Image Behavior
- **D-09:** Keep dish row images, but tighten controls. Preserve current visual richness while making image request/decode timing safer and measurable.
- **D-10:** Use stable fallback first. Rows should keep their dimensions, show the fallback immediately, and swap in the image only when it loads cleanly without layout shift.
- **D-11:** Measure and guard obvious image risks. Track image request/decode behavior and avoid letting clearly risky remote or huge images affect list rows. Do not turn this phase into a full image-storage redesign.
- **D-12:** Use stricter behavior for list rows and richer behavior for detail/modal surfaces. List rows prioritize responsiveness; detail and modal views may load richer images because the user explicitly opened them.

### Online/Offline Test Proof
- **D-13:** Automated checks should compare sync, image, and offline behavior across `online-normal`, `browser-offline`, and slow/blocked GitHub/image modes.
- **D-14:** Keep service-worker production behavior as optional diagnostic evidence for Phase 3. Normal regression checks stay service-worker-free; production/service-worker checks may be documented or measured separately.
- **D-15:** Reuse Phase 2 hot paths for online/offline comparison: search reset, row menu open, and modal/detail shell open on the dish, ingredient, and shopping-list large screens.
- **D-16:** Phase 3 gates should be no worse than the practical Phase 2 budgets. Keep the 100 ms shell-visible target as an ideal/warning, not as the strict failure threshold for every Phase 3 mode.

### the agent's Discretion
- The planner may choose the exact scheduling mechanism for deferred sync checks, such as idle callbacks, timers, React scheduling, app-ready signals, or interaction-state guards, as long as the visible app/list responds first.
- The planner may choose the exact split of sync modal components and loading states as long as the prompt opens quickly and final sync cannot run before required data is ready.
- The planner may define practical image-risk guardrails and resource metrics, but must preserve useful list imagery unless evidence forces an explicit tradeoff.
- The planner may choose exact test IDs, evidence fields, and script names, reusing the existing performance harness and Phase 2 budgets.
- The planner may document an optional service-worker diagnostic command without making it a strict Phase 3 gate.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Context
- `.planning/PROJECT.md` - Product scope, local-first constraints, online/offline performance concern, and out-of-scope boundaries.
- `.planning/REQUIREMENTS.md` - Phase 3 requirement mapping: `PERF-03`, `NET-01`, `NET-02`, `NET-03`, `NET-04`, and `TEST-03`.
- `.planning/ROADMAP.md` - Phase 3 goal, success criteria, planned work items, and canonical refs.
- `.planning/phases/01-measurement-and-performance-harness/01-CONTEXT.md` - Prior decisions for daily/stress datasets, shell-visible vs content-ready timing, online/offline modes, GitHub/image stubbing, and service-worker diagnostic separation.
- `.planning/phases/02-large-list-interaction-hot-paths/02-CONTEXT.md` - Prior decisions for immediate shell feedback, practical Phase 2 budgets, rich row preservation, and Phase 2 hot paths.

### Codebase Maps
- `.planning/codebase/INTEGRATIONS.md` - GitHub Raw, GitHub Contents API, Gist backup, localStorage, Cache Storage, service worker, and deployment integration behavior.
- `.planning/codebase/CONCERNS.md` - Known sync bug, image/storage/network risks, service-worker fragility, performance bottlenecks, and test coverage gaps.
- `.planning/codebase/TESTING.md` - E2E/performance test patterns and known test-runner constraints.

### Source Integration Points
- `src/Hooks/useSharedDataSync.ts` - Startup manifest check, offline skip, throttling keys, `getSyncedVersions`, and `saveSyncedVersions`.
- `src/Components/AppInitializer/AppInitializer.tsx` - Mount point that wires shared sync detection into the app shell.
- `src/Components/AppInitializer/SharedSyncModal.tsx` - Sync prompt, full shared-data fetch, item selection, impact analysis, and selective-sync version behavior.
- `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx` - Dish image lazy loading, async decode, fallback image, and broken-image state.
- `src/serviceWorkerRegistration.ts` - Production service-worker registration, update callbacks, and localhost/offline registration behavior.
- `src/service-worker.ts` - Workbox app-shell precache and same-origin PNG runtime image cache.

### Test Harness And Evidence
- `tests/e2e/fixtures/seedApp.ts` - Redux Persist seeding, network mode setup, sync metadata, service-worker unregister, and cache cleanup.
- `tests/e2e/fixtures/performanceNetwork.ts` - `online-normal`, `browser-offline`, `mocked-slow-network`, GitHub Raw stubbing, and image delay/block controls.
- `tests/e2e/fixtures/performanceReport.ts` - Interaction measurement, shell/content timing, resource summaries, warnings, and evidence output helpers.
- `tests/e2e/performance-baseline.spec.ts` - Existing online/offline baseline flow across datasets and network modes.
- `tests/e2e/performance-regression.spec.ts` - Current performance regression checks and Phase 2 daily large-list hot-path evidence pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useSharedDataSync` already centralizes manifest fetching, online/offline branching, throttling, and synced-version storage. Phase 3 should adjust scheduling and version preservation here or in a small adjacent helper.
- `AppInitializer` already renders children before `SharedSyncModal`, making it the natural place to keep the app shell visible while sync work is deferred.
- `SharedSyncModal` already has manifest-level change data, selection state, full shared-data fetching, and impact-analysis logic. It can be split so the shell opens before full fetch/analysis completes.
- `DishImageWidget` already uses `IntersectionObserver`, `loading="lazy"`, `decoding="async"`, and a fallback image. Phase 3 can refine timing/fallback behavior without inventing a new image component.
- `performanceNetwork.ts`, `seedApp.ts`, and `performanceReport.ts` already provide controlled GitHub/image/network modes and JSON evidence output.

### Established Patterns
- The app is a browser-only React/Redux Persist SPA; online work must be controlled inside the browser runtime, not moved to a backend in this milestone.
- Shared sync reads GitHub Raw files directly and appends cache-busting timestamps. Normal e2e tests already stub GitHub Raw requests rather than relying on live network.
- Existing performance evidence separates shell-visible timing from content-ready timing. Phase 3 should keep that distinction for sync prompts, image behavior, and list interactions.
- Normal performance tests unregister service workers and clear caches; optional production/service-worker checks should remain separate to avoid noisy default regression gates.
- Primary list screens use virtualized fixed-row layouts. Image behavior must preserve row dimensions, spacing, and scroll/click behavior.

### Integration Points
- Startup sync scheduling connects through `src/Hooks/useSharedDataSync.ts` and `src/Components/AppInitializer/AppInitializer.tsx`.
- Sync prompt workload connects through `src/Components/AppInitializer/SharedSyncModal.tsx`, especially the full shared-data fetch, impact analysis, selected item state, and `onDone` version payload.
- Dish image behavior connects through `DishImageWidget` plus dish list/detail/modal call sites that choose image loading mode and dimensions.
- Online/offline proof connects through the existing Playwright performance specs, `performanceNetwork.ts`, and Phase 2 daily large-list checks.

</code_context>

<specifics>
## Specific Ideas

- The user selected all four Phase 3 gray areas for discussion: startup sync timing, sync prompt workload, dish image behavior, and online/offline test proof.
- The user wants online mode to stop feeling slower than offline mode without deleting GitHub sync, images, or local-first behavior.
- The existing source explains the offline speed difference: `useSharedDataSync` returns immediately when `navigator.onLine` is false, while online mode can fetch the shared manifest and later full shared data.
- The user chose responsiveness-preserving defaults throughout: defer online checks until the app is usable, open sync prompts quickly, keep stable image fallbacks, and prove behavior with deterministic online/offline checks.

</specifics>

<deferred>
## Deferred Ideas

- Making production service-worker behavior a strict gate is deferred. Phase 3 may document or run optional service-worker diagnostics, but normal regression gates stay service-worker-free.
- Full image-storage redesign, hard global image-size limits, external object storage, and removal of remote list images are deferred unless implementation evidence shows a narrow guardrail is required.
- Backend/server migration for shared sync or publish workflows remains out of scope for this milestone.
- Broad drawer/navigation/app-shell route responsiveness remains Phase 4 unless a narrow Phase 3 change is required to prevent online work from blocking the shell.

</deferred>

---

*Phase: 3-Online and Offline Cost Isolation*
*Context gathered: 2026-06-05*
