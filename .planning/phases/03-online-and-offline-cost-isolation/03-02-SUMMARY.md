---
phase: 03-online-and-offline-cost-isolation
plan: "02"
subsystem: performance-ui
tags: [react, sync-modal, images, playwright, local-first]

# Dependency graph
requires:
  - phase: 03-online-and-offline-cost-isolation
    provides: Plan 03-01 deferred startup sync and deterministic GitHub fixtures
provides:
  - Progressive shared sync modal shell that renders from manifest data first
  - Selective sync version merging that preserves unchanged version fields
  - Fallback-first dish list image mode with stable row dimensions
  - Slow-image and progressive-sync Playwright coverage
affects: [phase-03, phase-04, sync, dish-images, performance-tests]

# Tech tracking
tech-stack:
  added: []
  patterns: [progressive-modal-fetch, ref-backed-background-status, list-detail-image-surface, shared-data-delay-fixture]

key-files:
  created:
    - test-results/performance/perf-09-phase3-sync-prompt-image.json
    - test-results/performance/perf-09-phase3-sync-prompt-image.md
  modified:
    - src/Components/AppInitializer/SharedSyncModal.tsx
    - src/Hooks/useSharedDataSync.ts
    - src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx
    - src/Modules/Dishes/Screens/DishesList.screen.tsx
    - src/Modules/Dishes/Screens/DishesManageIngredient/DishReadonlyDetail.widget.tsx
    - src/Modules/Dishes/Screens/DishesManageIngredient/DishDetail.widget.tsx
    - tests/e2e/fixtures/performanceNetwork.ts
    - tests/e2e/performance-regression.spec.ts

key-decisions:
  - "The shared sync modal renders manifest rows immediately and loads full shared data after the shell has painted."
  - "The final sync action stays disabled until shared data is loaded and no fetch error exists."
  - "Dish list rows use an explicit list image surface; detail/modal images keep the richer detail surface."

patterns-established:
  - "Use manifest data for the first sync prompt shell, then progressively fill shared data and impact warnings."
  - "Merge synced versions in the hook so one-category sync does not blank the other version."
  - "Keep list image fallback visible until the remote image has loaded and decoded."

requirements-completed: [PERF-03, NET-02, NET-03, NET-04, TEST-03]

# Metrics
duration: not separately tracked during inline execution
completed: 2026-06-05
---

# Phase 03-02: Sync Prompt And Image Isolation Summary

**Shared sync prompts now open from manifest data first, selective sync preserves version state, and dish list images stay stable while slow image work is pending.**

## Performance

- **Duration:** Not separately tracked during inline execution
- **Started:** 2026-06-05T16:03:00Z after 03-01 closeout
- **Completed:** 2026-06-05T16:24:51Z evidence capture, summary closed out later in the same session
- **Tasks:** 3
- **Files modified:** 8 source/test files plus this summary

## Accomplishments

- Refactored `SharedSyncModal` so title, helper copy, ingredient/dish rows, checkboxes, action tags, and footer render before `shared-data.json` completes.
- Added progressive inline states for `Đang tải dữ liệu...` and `Đang kiểm tra ảnh hưởng...` without replacing the whole modal body.
- Fixed selective sync version preservation by merging new synced versions with existing stored versions in `markSynced`.
- Added `DishImageWidget` list/detail behavior: list rows keep an `88px x 122px` stable box, show fallback first, request near-visible images with a stricter margin, and swap only after load/decode.
- Added deterministic Phase 3 tests for delayed shared data, one-category sync, stable image boxes, slow image diagnostics, and Phase 2 practical interaction budgets.

## Task Commits

1. **Tasks 1-2: Progressive sync prompt, version preservation, and image modes** - `c0124077` (`perf(03-02): make sync prompt and dish images progressive`)
2. **Task 3: Sync prompt and image isolation tests** - `ab6f97ff` (`test(03-02): cover sync prompt and image isolation`)

**Plan metadata:** `9b5855a9` (`docs(03): create phase plan`)

## Files Created/Modified

- `src/Components/AppInitializer/SharedSyncModal.tsx` - Renders manifest rows first, schedules shared-data fetch and impact checks after paint, keeps final sync disabled until safe, and adds stable test hooks.
- `src/Hooks/useSharedDataSync.ts` - Merges synced version updates with existing stored values and avoids a render-only checking state on no-change background fetches.
- `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx` - Adds `surface="list" | "detail"`, fallback-first loading, decode-before-swap, and stable list image diagnostics hooks.
- `src/Modules/Dishes/Screens/DishesList.screen.tsx` - Uses list image mode at `width={88}` and `height={122}`.
- `src/Modules/Dishes/Screens/DishesManageIngredient/DishReadonlyDetail.widget.tsx` - Uses detail image mode and preserves `height={180}`.
- `src/Modules/Dishes/Screens/DishesManageIngredient/DishDetail.widget.tsx` - Uses detail image mode and preserves `height={150}`.
- `tests/e2e/fixtures/performanceNetwork.ts` - Adds `sharedDataDelayMs` so tests can delay full shared data without delaying the manifest.
- `tests/e2e/performance-regression.spec.ts` - Adds `PERF-09` sync prompt and image isolation coverage.

## Decisions Made

- Kept `Để sau` available even while shared data is loading or has failed.
- Kept final sync disabled while `sharedData` is null, while fetching, when no items are selected, or when a fetch error exists.
- Used a ref-backed `isSyncChecking` flag because no current UI consumes that value and a no-change manifest check should not rerender the app shell.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected Ant Design checkbox test target**
- **Found during:** Task 3 verification
- **Issue:** The new test looked for an `input` under the `data-testid`, but Ant Design applied the test id to the checkbox input itself.
- **Fix:** Updated the test to assert and click the checkbox locator directly.
- **Files modified:** `tests/e2e/performance-regression.spec.ts`
- **Verification:** Full strict performance gate passed 9/9.
- **Committed in:** `ab6f97ff`

**2. [Rule 3 - Blocking] Avoided background checking rerender during startup hot paths**
- **Found during:** Task 3 verification
- **Issue:** One Phase 3 startup run narrowly missed the 2000 ms modal shell budget at 2017 ms while a no-change manifest request could still update internal hook state.
- **Fix:** Changed the unused checking status to a ref-backed internal flag so no visible/no-change checking state forces an app-shell rerender.
- **Files modified:** `src/Hooks/useSharedDataSync.ts`
- **Verification:** `npm run build` passed; full strict performance gate passed 9/9 without widening budgets.
- **Committed in:** `ab6f97ff`

---

**Total deviations:** 2 auto-fixed (test selector and render-avoidance fix)
**Impact on plan:** Both fixes strengthened the planned behavior. No feature scope expanded.

## Issues Encountered

- A focused `PERF-09` grep-only Playwright run failed before test execution because `config.webServer` did not start cleanly. The full strict command started normally and was used for verification.
- One pre-fix full run had a transient existing `PERF-07` shopping-list search reset timeout; it did not reproduce in later full runs.
- The 100 ms ideal shell target still produces warning evidence for row/menu interactions, but Phase 2 practical budgets pass.

## Verification

- `npm run build` passed with existing unrelated CRA/ESLint warnings.
- `npm run test:e2e:performance -- --list` passed and listed 9 performance tests.
- `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` passed: 9/9 tests.

## Evidence

- `test-results/performance/perf-09-phase3-sync-prompt-image.json`
- `test-results/performance/perf-09-phase3-sync-prompt-image.md`
- `test-results/performance/perf-08-phase3-startup-sync.json` was refreshed by the same 9/9 run.

Key strict daily online-normal slow-image timings:

- `phase3-image-dish-row-menu-open`: shell 852 ms, content 926 ms
- `phase3-image-dish-search-reset`: shell 30 ms, content 1412 ms

Image diagnostics recorded `imageDelayMs: 2500`, 1 image request, and 1 delayed image request.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan `03-03` can use the existing startup-sync evidence, progressive sync/image coverage, and network diagnostics to add a dedicated Phase 3 online/offline comparison command and update performance documentation.

---
*Phase: 03-online-and-offline-cost-isolation*
*Completed: 2026-06-05*
