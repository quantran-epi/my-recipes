---
phase: 01-measurement-and-performance-harness
plan: "02"
subsystem: testing
tags: [playwright, fixtures, performance, network]
requires:
  - phase: 01-measurement-and-performance-harness
    provides: Repo-local Playwright commands and config from plan 01-01
provides:
  - Daily and stress performance seed generators
  - Selectable GitHub, offline, slow-network, and image request modes
  - Parameterized seedApp options while preserving the default regression seed
affects: [performance, e2e, regression-tests]
tech-stack:
  added: []
  patterns: ["Fixture-only deterministic data generators", "Playwright route-based network simulation"]
key-files:
  created: [tests/e2e/fixtures/performanceSeed.ts, tests/e2e/fixtures/performanceNetwork.ts]
  modified: [tests/e2e/fixtures/seedApp.ts]
key-decisions:
  - "Keep seedApp(page) behavior on the existing regression seed and make performance datasets opt-in through options."
  - "Simulate browser-offline mode by exposing navigator.onLine=false and blocking external requests while still allowing the local app shell to load."
patterns-established:
  - "Performance fixture options carry dataset, networkMode, imageMode, realNetwork, and delay controls into app setup."
requirements-completed: [PERF-01]
duration: 50min
completed: 2026-06-05
---

# Plan 02 Summary: Performance Fixtures

**Deterministic daily/stress datasets and controllable offline/slow-network fixture modes for large-list measurement**

## Performance

- **Duration:** 50 min
- **Started:** 2026-06-05T13:57:00+0700
- **Completed:** 2026-06-05T14:56:55+0700
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `createPerformanceSeed(datasetName)` with exact planned sizes: daily `200` ingredients, `150` dishes, `100` shopping lists; stress `1000` ingredients, `750` dishes, `500` shopping lists.
- Generated realistic relationship data: inventory batches, shopping-list ingredient groups, scheduled meals, dish ingredients, included dishes, and cooking sessions.
- Added mixed image states across generated dishes: remote `https://` images, data/local-like images, and mostly empty image states.
- Added `applyPerformanceNetworkMode(page, options)` with `online-normal`, `browser-offline`, and `mocked-slow-network` plus `fast`, `slow`, and `blocked` image modes.
- Updated `seedApp(page, options?)` so existing tests still use `createRegressionSeed()` by default while performance tests can opt into `daily` or `stress` data and network/image controls.

## Files Created/Modified

- `tests/e2e/fixtures/performanceSeed.ts` - Creates deterministic daily/stress Redux Persist-compatible datasets.
- `tests/e2e/fixtures/performanceNetwork.ts` - Installs GitHub, image, offline, and slow-network Playwright routes.
- `tests/e2e/fixtures/seedApp.ts` - Adds `SeedAppOptions` and routes performance options into seed/network setup.

## Verification

- `npm run test:e2e -- --list` - passed; 13 tests discovered.
- `npm run test:e2e:performance -- --list` - passed; 3 performance regression tests discovered.
- `npm run build` - passed with existing lint/Browserslist/bundle-size warnings.
- Dataset validation via `ts-node` - passed; both datasets matched planned counts and included inventory, scheduled meals, cooking sessions, included dishes, populated shopping-list relations, and mixed image states.
- `E2E_BROWSER_CHANNEL=chrome npm run test:e2e -- tests/e2e/dashboard.spec.ts` - passed outside the sandbox; 1 existing default-seed test passed.

## Deviations from Plan

- Browser-offline mode blocks external requests and marks `navigator.onLine` false while allowing localhost requests. This keeps the app shell loadable in Playwright because setting the browser context fully offline before `page.goto()` would also block the local CRA server.

## Issues Encountered

- The local sandbox prevents CRA from binding a dev-server port (`listen EPERM`). The dashboard smoke spec passed when rerun with approved unsandboxed execution.
- A `Map.entries()` spread in the new seed generator was incompatible with the repo's older TypeScript target under `ts-node`; replaced it with `Array.from(groups.entries())`.

## User Setup Required

None. No external service configuration required.

## Next Phase Readiness

Plan 01-03 can now measure daily/stress datasets and compare online, offline, slow-network, and image modes using stable fixture options.

---
*Phase: 01-measurement-and-performance-harness*
*Completed: 2026-06-05*
