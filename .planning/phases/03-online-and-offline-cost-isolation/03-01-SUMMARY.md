---
phase: 03-online-and-offline-cost-isolation
plan: "01"
subsystem: performance
tags: [react, sync, github, playwright, local-first]

# Dependency graph
requires:
  - phase: 02-large-list-interaction-hot-paths
    provides: Phase 2 practical interaction budgets and large-list hot-path measurements
provides:
  - Deferred, interaction-quiet startup shared-data manifest checks
  - Deterministic e2e sync freshness states for fresh, due, and missing checks
  - Controlled GitHub Raw fixtures and startup-sync performance evidence
affects: [phase-03, phase-04, sync, performance-tests]

# Tech tracking
tech-stack:
  added: []
  patterns: [requestIdleCallback-fallback, deterministic-network-fixtures, sync-freshness-seeding]

key-files:
  created:
    - test-results/performance/perf-08-phase3-startup-sync.json
    - test-results/performance/perf-08-phase3-startup-sync.md
  modified:
    - src/Hooks/useSharedDataSync.ts
    - tests/e2e/fixtures/performanceNetwork.ts
    - tests/e2e/fixtures/seedApp.ts
    - tests/e2e/performance-regression.spec.ts

key-decisions:
  - "Startup shared-data manifest checks wait for a 1500 ms deferral plus an 800 ms interaction-quiet window before fetching."
  - "Routine deferred sync checks keep checking state internal and do not add visible app-shell UI."
  - "Strict performance evidence uses deterministic GitHub Raw fixtures instead of live GitHub or secrets."

patterns-established:
  - "Track recent user interactions before background sync so first list interactions stay responsive."
  - "Seed sync freshness explicitly in e2e setup instead of depending on localStorage clock state."
  - "Record network request counters with performance evidence for online/offline comparison."

requirements-completed: [PERF-03, NET-01, NET-02, TEST-03]

# Metrics
duration: not separately tracked during resumed closeout
completed: 2026-06-05
---

# Phase 03-01: Startup Shared-Sync Isolation Summary

**Online due-sync startup now waits behind a usable app/list path and a short quiet window while preserving offline local-first startup.**

## Performance

- **Duration:** Not separately tracked during resumed closeout
- **Started:** 2026-06-05T15:51:01Z
- **Completed:** 2026-06-05T15:58:05Z evidence capture, summary closed out later in the same execution session
- **Tasks:** 3
- **Files modified:** 4 source/test files plus this summary

## Accomplishments

- Deferred GitHub shared-manifest checks with `DEFERRED_SYNC_DELAY_MS = 1500` and `SYNC_INTERACTION_QUIET_MS = 800` so online startup does not fetch on the urgent mount path.
- Added deterministic sync freshness seeding and GitHub Raw fixtures for fresh, due, missing, online, and offline performance checks.
- Added `PERF-08 phase3 startup sync isolation` coverage proving the Phase 2 hot paths stay inside practical budgets while a delayed GitHub manifest check is pending.

## Task Commits

1. **Tasks 1-3: Startup sync isolation, fixtures, and performance proof** - `896e5a4b` (`perf(03-01): isolate startup shared sync`)

**Plan metadata:** `9b5855a9` (`docs(03): create phase plan`)

## Files Created/Modified

- `src/Hooks/useSharedDataSync.ts` - Schedules startup shared-manifest checks after a deferral and interaction-quiet window, with idle callback support and cleanup.
- `tests/e2e/fixtures/seedApp.ts` - Adds `syncCheckState` so tests can force fresh, due, or missing shared sync checks.
- `tests/e2e/fixtures/performanceNetwork.ts` - Adds deterministic shared manifest/data fixtures and request counters for GitHub Raw and image behavior.
- `tests/e2e/performance-regression.spec.ts` - Adds Phase 3 startup-sync and offline local-first checks with `phase3-startup-*` timing ids.
- `test-results/performance/perf-08-phase3-startup-sync.json` - Captures strict daily online-normal startup-sync evidence.
- `test-results/performance/perf-08-phase3-startup-sync.md` - Human-readable evidence summary.

## Decisions Made

- Kept `isSyncChecking` true only during the actual manifest fetch, not during the waiting period, so no routine checking banner or app-shell status appears.
- Preserved the existing offline short-circuit and `isCheckDue()` throttling before any network scheduling.
- Used controlled GitHub Raw responses in strict tests so the gate does not depend on live network availability or secret values.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed timer typing issue found by build**
- **Found during:** Task 1 verification
- **Issue:** The initial timer typing did not compile cleanly under the CRA TypeScript build.
- **Fix:** Adjusted timer typing before committing the implementation.
- **Files modified:** `src/Hooks/useSharedDataSync.ts`
- **Verification:** `npm run build` passed.
- **Committed in:** `896e5a4b`

**2. [Rule 3 - Blocking] Removed unused import warning introduced during edit**
- **Found during:** Task 1 verification
- **Issue:** A temporary import added during implementation triggered an unused import warning.
- **Fix:** Removed the unused import before committing.
- **Files modified:** `src/Hooks/useSharedDataSync.ts`
- **Verification:** `npm run build` passed with only existing unrelated CRA/ESLint warnings.
- **Committed in:** `896e5a4b`

---

**Total deviations:** 2 auto-fixed (blocking build/static-check issues)
**Impact on plan:** Both fixes were necessary to satisfy verification. No scope expansion.

## Issues Encountered

- Existing CRA/ESLint warnings remain outside this plan's touched behavior; no new TypeScript errors remained after fixes.
- Phase 3 startup evidence still warns when shell-visible time exceeds the 100 ms ideal target for inventory modal and shopping-list row menu, but all measured interactions stay inside Phase 2 practical budgets.

## Verification

- `npm run build` passed with existing unrelated warnings.
- `npm run test:e2e:performance -- --list` passed and listed 7 performance tests.
- `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` passed: 7/7 tests.

## Evidence

- `test-results/performance/perf-08-phase3-startup-sync.json`
- `test-results/performance/perf-08-phase3-startup-sync.md`

Key strict daily online-normal timings:

- `phase3-startup-dish-search-reset`: shell 28 ms, content 1266 ms
- `phase3-startup-ingredient-inventory-modal-open`: shell 1709 ms, content 1771 ms
- `phase3-startup-shopping-list-row-menu-open`: shell 681 ms, content 724 ms

GitHub fixture diagnostics recorded `githubDelayMs: 3000`, 3 GitHub Raw requests, 3 shared-manifest requests, 0 shared-data requests, and 1 image request.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan `03-02` can rely on deterministic sync freshness and GitHub shared-data fixtures. It should focus on making the visible sync prompt progressive and isolating dish image loading/decoding from list-row interaction paths.

---
*Phase: 03-online-and-offline-cost-isolation*
*Completed: 2026-06-05*
