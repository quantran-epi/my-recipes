# Phase 3: Online and Offline Cost Isolation - Research

**Researched:** 2026-06-05
**Phase:** 3 - Online and Offline Cost Isolation
**Status:** Ready for planning

## Research Complete

Phase 3 should be planned as three tightly connected implementation tracks:

1. Defer online shared-manifest checks until the app is usable and quiet.
2. Make the shared sync prompt render quickly before full data fetch and impact analysis finish.
3. Tighten dish image behavior and extend the existing performance harness to compare online, offline, and slow/blocked GitHub/image modes.

This phase should not remove GitHub sync, hide row images, migrate storage/backend architecture, or make production service-worker behavior a strict gate.

## Relevant Existing System

### Startup Shared Sync

- `src/Hooks/useSharedDataSync.ts` currently starts its check inside a mount-only `useEffect`.
- Offline mode returns immediately through `if (!navigator.onLine) return;`.
- Online mode checks `shared_last_checked`, then fetches `docs/shared-manifest.json` from GitHub Raw with a cache-busting timestamp.
- `AppInitializer` renders `children` and conditionally renders `SharedSyncModal` when `pendingSync` is set, so the app structure already supports keeping the shell mounted while sync UI appears later.
- `getSyncedVersions` and `saveSyncedVersions` are exported and can support a fix for selective-sync version preservation.

Planning implication: keep `useSharedDataSync` as the owner of manifest detection, but add scheduling/quiet-state gating around the fetch. Prefer a small local helper or hook near `useSharedDataSync` if interaction-idle detection becomes more than a few lines.

### Shared Sync Prompt

- `src/Components/AppInitializer/SharedSyncModal.tsx` currently initializes selected IDs from the manifest, fetches full `shared-data.json` as soon as the modal opens, computes dish impacts with `useMemo`, and dispatches selected changes on sync.
- The modal already has separate state for `isFetching`, `fetchError`, `sharedData`, `selectedIngredients`, and `selectedDishes`.
- The heaviest current work is not needed to show the modal shell: full shared data fetch and impact analysis can be delayed/progressive while the manifest list is visible.
- Current `handleSync` calls `onDone({ ingredientsVersion: hasIngredientChanges ? manifest.ingredientsVersion : "", dishesVersion: hasDishChanges ? manifest.dishesVersion : "" })`, which causes the known selective-sync version bug.

Planning implication: split prompt shell readiness from data readiness. Keep item selection usable from manifest data, keep final sync disabled until `sharedData` is available, and preserve previous synced versions for categories not changed or not synced.

### Dish Images

- `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx` already uses `IntersectionObserver`, `loading="lazy"`, `decoding="async"`, fallback image rendering, and a broken-image label option.
- `src/Modules/Dishes/Screens/DishesList.screen.tsx` renders `DishImageWidget` in a fixed `88px x 122px` grid column. This is good for row stability and should not be collapsed on failure.
- Detail/modal surfaces such as `DishReadonlyDetail.widget.tsx` and `DishDetail.widget.tsx` reuse `DishImageWidget` with larger image areas.
- The shared `src/Components/Image/Image.tsx` wrapper defaults Ant Design images to lazy loading and async decoding.

Planning implication: refine `DishImageWidget` and call-site props rather than replacing the image system. List-row behavior should remain stricter than detail/modal behavior. Rows should render fallback immediately and only swap to remote images after safe/near-visible loading.

### Performance Harness

- `tests/e2e/fixtures/performanceNetwork.ts` already supports `online-normal`, `browser-offline`, and `mocked-slow-network` modes.
- The same helper stubs GitHub Raw by default unless `PERF_REAL_NETWORK=1`, delays GitHub Raw in mocked slow mode, and controls external image requests with `fast`, `slow`, and `blocked` image modes.
- `tests/e2e/fixtures/seedApp.ts` seeds Redux Persist state, sets `shared_last_checked`, sets `shared_synced_versions`, unregisters service workers, and clears caches.
- `tests/e2e/performance-regression.spec.ts` already has a strict daily large-list gate for Phase 2 hot paths across dish, ingredient, and shopping-list screens.
- `tests/e2e/fixtures/performanceReport.ts` already writes JSON and markdown evidence with interactions, warnings, network mode, image mode, and resource summaries.
- `tests/e2e/runPerformanceCommand.cjs` drives baseline and diagnostic commands through Playwright with `PERF_BASELINE=1` and optional `PERF_DIAGNOSTIC=1`.

Planning implication: extend the existing performance regression spec/harness instead of adding a new runner. Phase 3 should reuse Phase 2 interaction IDs or add clearly named Phase 3 equivalents, then run the same interactions under controlled network/image modes.

## Recommended Plan Shape

### Plan 03-01: Startup Shared Sync Isolation

Purpose: make online app startup and first list interactions independent from GitHub manifest fetch timing.

Likely files:
- `src/Hooks/useSharedDataSync.ts`
- `src/Components/AppInitializer/AppInitializer.tsx`
- `tests/e2e/fixtures/performanceNetwork.ts`
- `tests/e2e/fixtures/seedApp.ts`
- `tests/e2e/performance-regression.spec.ts`

Key work:
- Add app-ready/idle scheduling for the manifest check.
- Add interaction-first postponement so active typing/search/scroll/modal/navigation can delay the check.
- Keep deferred background checking invisible unless updates are found.
- Add deterministic test setup where `shared_last_checked` can be absent/expired so tests can prove startup work does not block list interactions.
- Keep service-worker behavior out of the strict gate, but document optional diagnostic handling if touched.

### Plan 03-02: Sync Prompt and Dish Image Workload Isolation

Purpose: make update prompts and dish images safe for perceived responsiveness while preserving current workflows and visual richness.

Likely files:
- `src/Components/AppInitializer/SharedSyncModal.tsx`
- `src/Hooks/useSharedDataSync.ts`
- `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx`
- `src/Modules/Dishes/Screens/DishesList.screen.tsx`
- `src/Modules/Dishes/Screens/DishesManageIngredient/DishReadonlyDetail.widget.tsx`
- `src/Modules/Dishes/Screens/DishesManageIngredient/DishDetail.widget.tsx`
- `tests/e2e/performance-regression.spec.ts`

Key work:
- Render the sync modal shell from manifest data before full shared data and impact analysis complete.
- Let users inspect/select items while data is loading, but disable final sync until required shared data exists.
- Add progressive warning/loading states for impact analysis.
- Fix the selective-sync version bug by merging with existing synced versions rather than saving empty strings for unchanged categories.
- Preserve row image dimensions and fallback-first behavior.
- Make list-row image behavior stricter than detail/modal image behavior using props or a small mode option.
- Add image request/decode/resource evidence to prove list rows do not pull risky image work into hot interactions.

### Plan 03-03: Online/Offline Comparison Gate

Purpose: turn the Phase 3 behavior into repeatable proof that online/offline/network image costs stay inside Phase 2 practical budgets.

Likely files:
- `tests/e2e/performance-regression.spec.ts`
- `tests/e2e/fixtures/performanceNetwork.ts`
- `tests/e2e/fixtures/performanceReport.ts`
- `tests/e2e/runPerformanceCommand.cjs`
- `docs/automated-regression-test-plan.md`
- `docs/performance-audit-plan.md`

Key work:
- Add or extend a Phase 3 comparison check for `online-normal`, `browser-offline`, and mocked slow/blocked GitHub/image modes.
- Reuse Phase 2 hot paths: search reset, row menu open, modal/detail shell open on dish, ingredient, and shopping-list large screens.
- Keep strict failure budgets aligned with Phase 2 practical budgets: search/reset 2500 ms shell and 5000 ms content, row menu/action 3500 ms shell/content, modal/detail 2000 ms shell and 5000 ms content.
- Keep 100 ms shell-visible as warning/ideal evidence.
- Write JSON and markdown evidence to `test-results/performance/` with network mode and image mode clearly recorded.
- Document optional production/service-worker diagnostic command separately from the strict Phase 3 gate.

## Validation Architecture

### What Must Be Proven

- `PERF-03`: maintainers can compare online/offline runs and identify whether sync, image loading, service worker, or network work affects responsiveness.
- `NET-01`: online startup shared-data checks do not delay normal list interactions.
- `NET-02`: offline local-first behavior still works after online scheduling changes.
- `NET-03`: dish image loading/decode work does not create visible list interaction lag.
- `NET-04`: shared-data sync prompts can appear without full fetch/impact-analysis work blocking the app shell.
- `TEST-03`: GitHub requests are stubbed/controlled in online/offline comparison checks.

### Required Verification Commands

- `npm run build` should pass or document only existing warnings.
- `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` should still pass the Phase 2 daily gate.
- Add a Phase 3 comparison command or documented invocation that runs the same large-list interactions under online-normal, browser-offline, and mocked slow/blocked GitHub/image modes.

### Evidence To Inspect

- `test-results/performance/*.json` and matching `.md` summaries for Phase 3 comparison runs.
- Evidence must include `networkMode`, `imageMode`, interaction shell/content timings, warnings, and resource summaries.
- Service-worker production behavior may have optional diagnostic evidence, but it is not a strict Phase 3 blocker.

### Acceptance Thresholds

- Phase 3 strict gates should remain no worse than practical Phase 2 budgets.
- The 100 ms shell-visible target remains warning evidence, not the strict failure threshold for every checked interaction.
- Any online/offline comparison failure should identify whether the likely source is sync, GitHub request delay, image delay/blocking, or unrelated list/rendering regression.

## Risks and Mitigations

- **Timer-only sync deferral may still collide with user activity.** Mitigate with interaction-first postponement and tests that trigger list interactions while sync is pending.
- **Idle callbacks are not universally guaranteed.** Mitigate with a safe fallback timer and cancellation on unmount.
- **Progressive sync warnings can confuse users if final sync is available too early.** Mitigate by disabling final sync until required shared data is present and warning status is explicit.
- **Image guardrails can accidentally remove useful row context.** Mitigate by keeping list images by default and only guarding obvious risky sources/loads.
- **Service-worker diagnostics can make the strict gate flaky.** Mitigate by keeping service-worker checks separate and optional for Phase 3.
- **Stress dataset remains diagnostic.** Phase 2 daily gate is strict; stress mode can expose limits but should not block Phase 3 unless explicitly promoted later.

## Research Notes for Planner

- Prefer small, localized changes in the sync hook, sync modal, image widget, and performance harness.
- Avoid adding broad abstractions unless the same scheduling/resource evidence logic is needed in multiple files.
- Preserve existing route basename `/my-recipes`, Redux Persist state shape, and service-worker/PWA behavior.
- Do not read or expose `.env` values. Only reference env key names if needed.
- Plans should list every requirement ID: `PERF-03`, `NET-01`, `NET-02`, `NET-03`, `NET-04`, `TEST-03`.

## RESEARCH COMPLETE
