---
phase: 01-measurement-and-performance-harness
plan: "03"
subsystem: testing
tags: [playwright, performance, baseline, reporting, ux]
requires:
  - phase: 01-measurement-and-performance-harness
    provides: Playwright tooling from 01-01 and performance fixtures from 01-02
provides:
  - Shared performance timing and evidence writer helpers
  - Baseline matrix for daily/stress datasets and online/offline/slow network modes
  - Regression smoke evidence with warning-based strict UX targets
  - Stable docs for commands, evidence paths, schema, and smoke budgets
affects: [performance, e2e, ux, regression-tests]
tech-stack:
  added: []
  patterns: ["JSON plus markdown performance evidence", "warning-based Phase 1 UX target reporting"]
key-files:
  created: [tests/e2e/fixtures/performanceReport.ts]
  modified: [tests/e2e/performance-baseline.spec.ts, tests/e2e/performance-regression.spec.ts, src/Routing/MasterPage.tsx, src/Modules/Ingredient/Screens/IngredientList.screen.tsx, src/Modules/Dishes/Screens/DishesList.screen.tsx, src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx, docs/performance-audit-plan.md, docs/automated-regression-test-plan.md]
key-decisions:
  - "Baseline runs record budget misses as warnings so current large-list slowness is captured instead of blocking Phase 1."
  - "Regression runs keep broad smoke assertions to catch setup/runtime failures and large behavior regressions."
  - "Diagnostic CPU profile output is gated behind PERF_DIAGNOSTIC=1."
patterns-established:
  - "measureInteraction records shellVisibleMs and contentReadyMs for every interaction."
  - "writePerformanceEvidence writes JSON and markdown under test-results/performance/."
requirements-completed: [PERF-02, TEST-01, UX-01]
duration: 2h45m
completed: 2026-06-05
---

# Plan 03 Summary: Performance Evidence Harness

**Daily/stress Playwright performance evidence with shell/content timing, warning policy, and diagnostic profiling**

## Performance

- **Duration:** 2h45m
- **Started:** 2026-06-05T12:58:00+0700
- **Completed:** 2026-06-05T15:42:49+0700
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added `tests/e2e/fixtures/performanceReport.ts` with `measureInteraction`, `summarizeResources`, `writePerformanceEvidence`, and `writePerformanceSummaryMarkdown`.
- Reworked the baseline spec to run daily and stress datasets across `online-normal`, `browser-offline`, and `mocked-slow-network` modes by default.
- Updated the regression spec to write the same JSON/markdown evidence schema and added a daily large-list smoke measurement.
- Added nonvisual `data-testid` hooks for sidebar drawer, list search/filter controls, and dish/shopping-list row menu buttons.
- Documented Phase 1 commands, `test-results/performance/` outputs, evidence schema, warning policy, and proposed smoke budgets.

## Evidence Snapshot

- Full baseline evidence command passed 6/6 with Chrome.
- Performance regression command passed 4/4 with Chrome.
- Diagnostic command passed 1/1 with Chrome and wrote `test-results/performance/perf-00-daily-online-normal.cpuprofile`.
- Stress online-normal evidence captured the current large-list pain point: `dish-search-reset` shell visible at 13,432 ms and content ready at 18,129 ms, recorded as warnings.

## Files Created/Modified

- `tests/e2e/fixtures/performanceReport.ts` - Shared timing/resource/evidence helpers.
- `tests/e2e/performance-baseline.spec.ts` - Opt-in daily/stress baseline matrix with diagnostic CPU profile gating.
- `tests/e2e/performance-regression.spec.ts` - Regression smoke checks plus daily large-list evidence.
- `src/Routing/MasterPage.tsx` - Nonvisual sidebar drawer measurement hooks.
- `src/Modules/Ingredient/Screens/IngredientList.screen.tsx` - Nonvisual search/filter hooks.
- `src/Modules/Dishes/Screens/DishesList.screen.tsx` - Nonvisual search/filter and row-menu hooks.
- `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx` - Nonvisual search/filter and row-menu hooks.
- `docs/performance-audit-plan.md` - Harness commands, schema, warning policy, budgets.
- `docs/automated-regression-test-plan.md` - Performance command contract and evidence path.

## Verification

- `npm run test:e2e:performance -- --list` - passed; 4 tests discovered.
- `npm run test:e2e:performance:baseline -- --list` - passed; 6 baseline tests discovered.
- `E2E_BROWSER_CHANNEL=chrome npm run test:e2e:performance` - passed; 4/4.
- `E2E_BROWSER_CHANNEL=chrome npm run test:e2e:performance:baseline` - passed; 6/6.
- `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance:diagnostic` - passed; 1/1 and wrote CPU profile evidence.
- `rg -n "test:e2e:performance|test-results/performance|shell visible|100 ms|warnings" docs/performance-audit-plan.md docs/automated-regression-test-plan.md` - passed.
- `npm run build` - passed with existing lint/Browserslist/CRA Babel/bundle-size warnings.

## Deviations from Plan

- Baseline broad budgets are warning-only, while regression broad budgets remain enforced. This keeps the baseline command useful on the current slow stress data and still gives regression runs real smoke protection.
- The stress search reset content target uses the virtual list as the stable content-ready locator. A row-specific target proved brittle after debounced reset and virtualized list recycling.

## Issues Encountered

- Playwright managed Chromium is not downloaded locally, so full browser verification used the installed Chrome channel via `E2E_BROWSER_CHANNEL=chrome`.
- CRA dev server cannot bind a port inside the sandbox, so full Playwright runs required approved unsandboxed execution.
- Initial stress runs exposed the app's current long UI block on search reset; budgets were calibrated to record that as warning evidence rather than fail the baseline harness.

## User Setup Required

None. If Playwright's managed Chromium is absent, use `E2E_BROWSER_CHANNEL=chrome` or install browsers separately.

## Next Phase Readiness

The project now has repeatable evidence for the reported large-list slow interactions and online/offline comparison modes. Future performance-fix phases can use the JSON/markdown baseline to target hot paths and convert selected warnings into hard gates after fixes land.

---
*Phase: 01-measurement-and-performance-harness*
*Completed: 2026-06-05*
