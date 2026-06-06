---
phase: 04-navigation-and-app-shell-responsiveness
plan: "02"
subsystem: testing
tags: [playwright, performance, react, routing, drawer, ux]
requires:
  - phase: 04-navigation-and-app-shell-responsiveness
    provides: Shared app-shell route feedback and drawer shell-first rendering from 04-01
provides:
  - Phase 4 app-shell timing evidence for drawer, drawer route, bottom tab, global search, and list detail navigation
  - App-shell UX preservation regression coverage for drawer tools and stale route feedback
  - User-readable Phase 4 performance evidence and visual check documentation
affects: [navigation, sidebar-drawer, global-search, large-lists, phase-05]
tech-stack:
  added: []
  patterns: [Playwright app-shell timing evidence, drawer primary-nav preservation checks, warning-only route feedback timing]
key-files:
  created:
    - tests/e2e/app-shell-navigation.spec.ts
  modified:
    - src/Routing/AppShellNavigationContext.tsx
    - src/Routing/MasterPage.tsx
    - tests/e2e/performance-regression.spec.ts
    - docs/performance-audit-plan.md
    - docs/automated-regression-test-plan.md
    - docs/large-list-modal-sidebar-performance-note.md
key-decisions:
  - "Keep drawer shell timing enforced, but keep route-feedback and route content timing as warning evidence until the remaining over-1000 ms feedback paths are tightened."
  - "Measure route feedback through the production app-shell feedback event instead of inserting synthetic test-only overlay UI."
  - "Document simple visual checks for the user: route links first, tools preserved, route feedback appears, and daily workflows still work."
patterns-established:
  - "PERF-10 records Phase 4 shell/content timings under perf-10-phase4-app-shell-navigation while preserving existing Phase 2 and Phase 3 gates."
  - "App-shell regression tests verify drawer tools and route-feedback cleanup through stable data-testid hooks."
requirements-completed: [LIST-04, UX-02]
duration: 1h 20m
completed: 2026-06-06
---

# Phase 04 Plan 02: App-Shell Evidence Summary

**Phase 4 drawer/navigation responsiveness evidence with user-visible checks and preserved daily workflows**

## Performance

- **Duration:** 1h 20m
- **Started:** 2026-06-06T01:52:00Z
- **Completed:** 2026-06-06T03:12:06Z
- **Tasks:** 3 completed
- **Files modified:** 7

## Accomplishments

- Added `PERF-10 phase4 app-shell navigation responsiveness` to the performance regression suite with timings for drawer shell open, drawer route navigation, bottom-tab navigation, global-search navigation, and dish detail-route navigation.
- Added `tests/e2e/app-shell-navigation.spec.ts` to prove the drawer route links appear before deferred tools, the sync/backup/history/guide/admin tools remain available, and route feedback does not remain stuck after same-route close or completed navigation.
- Updated performance docs with the Phase 4 command, evidence path, budget meanings, and a non-technical eye-check list.
- Refined the app-shell route feedback implementation so the feedback overlay is available through an imperative production DOM marker, does not intercept pointer events, stays visible long enough to be observed, and suppresses duplicate pending destination work.

## Evidence

Latest local PERF-10 evidence: `test-results/performance/perf-10-phase4-app-shell-navigation.md` and `.json`.

Final run values from 2026-06-06T03:11:22Z:

- `phase4-drawer-shell-open`: shell 430 ms, content 519 ms.
- `phase4-drawer-route-navigation`: shell 1311 ms, content 3295 ms.
- `phase4-bottom-tab-navigation`: shell 2236 ms, content 4549 ms.
- `phase4-global-search-navigation`: shell 1186 ms, content 2567 ms.
- `phase4-dish-detail-route-navigation`: shell 1254 ms, content 2111 ms.

User-visible result: the drawer shell now appears first with route links before heavier drawer tools, and route navigation shows `Đang mở trang` feedback instead of leaving the user with no acknowledgement.

Important caveat: route destination content-ready timings stayed under the `5000 ms` warning target in the final run, but route-feedback shell timings still exceed the `1000 ms` warning target on several paths. Phase 4 records those misses instead of hiding them; the next tightening pass should reduce those route-feedback shell timings.

## Task Commits

1. **Tasks 1-3: Phase 4 timing evidence, UX preservation tests, and docs** - `f037b3e9` (`perf`)

**Plan metadata:** this summary commit.

## Files Created/Modified

- `tests/e2e/performance-regression.spec.ts` - Adds `phase4Budgets`, PERF-10 interactions, and `perf-10-phase4-app-shell-navigation` evidence output.
- `tests/e2e/app-shell-navigation.spec.ts` - Adds focused drawer workflow preservation and stale route-feedback cleanup checks.
- `src/Routing/AppShellNavigationContext.tsx` - Refines route feedback visibility, cleanup timing, duplicate suppression, and production feedback event handling.
- `src/Routing/MasterPage.tsx` - Keeps drawer primary route links as direct button rows and removes stale imports after the drawer split.
- `docs/performance-audit-plan.md` - Documents Phase 4 command, evidence path, practical budgets, warning targets, and visual checks.
- `docs/automated-regression-test-plan.md` - Adds `PERF-SHELL-001` regression matrix coverage and Phase 4 command guidance.
- `docs/large-list-modal-sidebar-performance-note.md` - Updates the non-technical explanation of remaining modal/sidebar delay and visible Phase 4 improvements.

## Decisions Made

- Kept route-feedback shell timing as warning evidence because final numbers still exceed `1000 ms` on route navigation paths.
- Kept route content-ready timing as warning evidence in PERF-10 even though the final run stayed under `5000 ms`, so future regressions are visible without making this phase brittle.
- Removed the synthetic test-only route-feedback marker and measured the production app-shell route feedback event instead.

## Deviations from Plan

### Auto-fixed Issues

**1. App-shell feedback needed production refinements for reliable evidence**
- **Found during:** Task 1 and Task 2 verification.
- **Issue:** PERF-10 and drawer UX checks needed route feedback to be observable without blocking drawer clicks or disappearing too quickly during route-tree cleanup.
- **Fix:** Kept a production DOM feedback marker with `data-testid="app-route-feedback"`, `pointerEvents: "none"`, minimum visible timing, fallback cleanup, and duplicate pending destination suppression.
- **Files modified:** `src/Routing/AppShellNavigationContext.tsx`, `src/Routing/MasterPage.tsx`.
- **Verification:** Focused app-shell/search/modal suite and full performance suite passed.
- **Committed in:** `f037b3e9`.

---

**Total deviations:** 1 auto-fixed implementation refinement.
**Impact on plan:** The refinement was needed to make the planned evidence reflect production behavior and did not remove drawer tools, list density, or daily workflows.

## Issues Encountered

- `npm run build` passes, but the repo still reports existing CRA/Browserslist/dependency warnings and unrelated ESLint warnings outside the Phase 4 files.
- PERF-10 records route-feedback shell warnings above `1000 ms`; this is a remaining performance target, not a hidden pass.
- `test-results/performance/` is ignored by `.gitignore`, so generated evidence remains local while committed docs point to the evidence path.
- Existing unrelated working-tree dirt remains outside this plan: `node_modules/.yarn-integrity`, `.codegraph/`, `.planning/codebase/*.out`, and local Playwright package files.

## Verification

- `rg -n "Phase 4|perf-10-phase4-app-shell-navigation|PERF-SHELL-001|drawer shell|route feedback|What You Can Check By Eye|100 ms" docs/performance-audit-plan.md docs/automated-regression-test-plan.md docs/large-list-modal-sidebar-performance-note.md` - passed.
- `npm run build` - passed with existing project-wide warnings only.
- `E2E_BROWSER_CHANNEL=chrome npm run test:e2e -- tests/e2e/app-shell-navigation.spec.ts tests/e2e/global-search.spec.ts tests/e2e/dish-serving-and-modal.spec.ts` - 5 passed.
- `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` - 10 passed, 1 skipped.
- `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npx playwright test tests/e2e/performance-regression.spec.ts -g "PERF-10"` - 1 passed after removing the synthetic route-feedback test marker.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 5 can use the Phase 4 docs and PERF-10 evidence as a release guardrail. The main follow-up is tightening route-feedback shell timing below `1000 ms` on drawer, bottom-tab, global-search, and list detail-route navigation.

## Self-Check: PASSED

- All planned Phase 4 evidence artifacts exist except generated `test-results/performance/` files, which are intentionally gitignored local output.
- Drawer tools, sync/backup/history/guide/admin controls, global search, dish detail navigation, and modal flows remain covered.
- Route-feedback overages are documented as warning evidence rather than overstated as fixed.

---
*Phase: 04-navigation-and-app-shell-responsiveness*
*Completed: 2026-06-06*
