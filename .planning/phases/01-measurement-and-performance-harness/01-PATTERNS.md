# Phase 1: Measurement and Performance Harness - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 16
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | CLI command routing | existing `package.json` scripts | exact |
| `playwright.config.ts` | config | browser test orchestration | `docs/automated-regression-test-plan.md` command contract | role-match |
| `tests/e2e/runPerformanceCommand.cjs` | utility | child-process command wrapper | `package.json` script conventions | partial |
| `tests/e2e/fixtures/performanceSeed.ts` | test fixture | deterministic data transform | `tests/e2e/fixtures/testData.ts` | exact |
| `tests/e2e/fixtures/performanceNetwork.ts` | test fixture | request interception | `tests/e2e/fixtures/seedApp.ts` | exact |
| `tests/e2e/fixtures/seedApp.ts` | test fixture | localStorage injection | `tests/e2e/fixtures/seedApp.ts` | exact |
| `tests/e2e/fixtures/performanceReport.ts` | test utility | file I/O evidence writer | `tests/e2e/performance-baseline.spec.ts` | exact |
| `tests/e2e/performance-baseline.spec.ts` | test | browser measurement | current `tests/e2e/performance-baseline.spec.ts` | exact |
| `tests/e2e/performance-regression.spec.ts` | test | browser regression | current `tests/e2e/performance-regression.spec.ts` | exact |
| `docs/performance-audit-plan.md` | docs | audit evidence summary | existing performance work item entries | exact |
| `docs/automated-regression-test-plan.md` | docs | command/test matrix | existing e2e reporting sections | exact |

## Pattern Assignments

### `package.json` and `playwright.config.ts` (config, CLI command routing)

**Analog:** existing `package.json` and `docs/automated-regression-test-plan.md`

**Current script pattern:** package scripts are short npm-compatible commands. Current scripts are `start`, `build`, `test`, and `eject`; new e2e scripts should follow this flat script style rather than adding a separate task runner.

**Required command contract from docs:** `npm run test:e2e`, `E2E_PORT=3021 npm run test:e2e`, and `npm run test:e2e:report` are already documented and should become executable.

**Config pattern to use:** Playwright config should own `baseURL`, `webServer`, `outputDir`, JSON/HTML reporting, and optional browser-channel selection. Specs should not duplicate server startup logic.

### `tests/e2e/fixtures/performanceSeed.ts` (test fixture, deterministic data transform)

**Analog:** `tests/e2e/fixtures/testData.ts`

**Imports/data pattern:** keep fixture-local domain types and builder helpers near the generated data. Existing fixture exports `TEST_IDS` and `createRegressionSeed()` and returns Redux Persist-compatible `shared` and `personal` roots.

**Core pattern:** deterministic IDs and names are required for selectors. Existing IDs use stable prefixes like `ing-chicken`, `dish-com-ga`, `sl-regression`, and helper functions compose ingredient groups and dish amounts.

**State shape pattern:** shared data must have `{ ingredient: { ingredients }, dishes: { dishes, searchText, currentPage } }`; personal data must have `appContext`, `inventory`, `shoppingList`, `scheduledMeal`, and `cookingSession` slices.

### `tests/e2e/fixtures/performanceNetwork.ts` and `seedApp.ts` (test fixture, request interception)

**Analog:** `tests/e2e/fixtures/seedApp.ts`

**Core network pattern:** use `page.route('https://raw.githubusercontent.com/**', async route => route.fulfill(...))` before React starts so GitHub Raw behavior is deterministic.

**Persistence pattern:** use `page.addInitScript` to clear `localStorage` and `sessionStorage`, set `persist:shared` and `persist:personal`, set `shared_last_checked`, and set `shared_synced_versions` before app bootstrap.

**Service-worker pattern:** deterministic e2e setup unregisters service workers and clears Cache Storage inside `addInitScript`. Keep this default for normal regression runs.

### `tests/e2e/fixtures/performanceReport.ts` (test utility, file I/O evidence writer)

**Analog:** `tests/e2e/performance-baseline.spec.ts` and `tests/e2e/performance-regression.spec.ts`

**File output pattern:** use Node `fs` and `path`, write into `path.join(process.cwd(), 'test-results', 'performance')`, create the directory with `fs.mkdirSync(outputDir, { recursive: true })`, and attach JSON evidence through Playwright `testInfo.attach`.

**Measurement pattern:** current specs measure from action start until a target locator is visible, summarize `PerformanceResourceTiming`, and record browser/project metadata. New helpers should keep this structure while separating shell-visible and content-ready timings.

### `tests/e2e/performance-baseline.spec.ts` (test, browser measurement)

**Analog:** current `performance-baseline.spec.ts`

**Opt-in pattern:** baseline tests are skipped unless `PERF_BASELINE=1` is set. Preserve the explicit opt-in so normal e2e runs do not collect heavy baseline evidence.

**Route case pattern:** route cases are an array of `{ id, path, waitFor }` entries. Extend this rather than hardcoding repeated page navigation blocks.

**Diagnostic pattern:** CPU profiles are currently captured with CDP. Move profile capture behind a diagnostic flag so normal baseline runs stay light.

### `tests/e2e/performance-regression.spec.ts` (test, browser regression)

**Analog:** current `performance-regression.spec.ts`

**Regression pattern:** keep generous smoke budgets as assertions and write JSON evidence. Strict UX targets should be recorded as warnings, not failing assertions, in this phase.

**Selector pattern:** use `data-testid`, roles, and visible text. If a required interaction cannot be selected reliably, add nonvisual `data-testid` or `aria-label` hooks only; do not alter visual layout or performance behavior.

### `docs/performance-audit-plan.md` and `docs/automated-regression-test-plan.md` (docs, audit evidence summary)

**Analog:** existing performance work item and reporting sections.

**Documentation pattern:** docs list stable commands, status, budget summaries, and evidence paths. They should not include every raw timing sample.

## Shared Patterns

### Redux Persist E2E Seeding
**Source:** `tests/e2e/fixtures/seedApp.ts`
**Apply to:** all seeded performance datasets.

Use the existing `persist:shared` and `persist:personal` envelope with slice values stringified inside the root JSON. Do not seed by clicking through large UI setup flows.

### Network Determinism
**Source:** `tests/e2e/fixtures/seedApp.ts`
**Apply to:** normal regression tests and mocked network baselines.

Default tests should stub GitHub Raw requests and disable service-worker/cache interference. Real network and service-worker measurements must be opt-in modes.

### Evidence Output
**Source:** `tests/e2e/performance-baseline.spec.ts`
**Apply to:** performance specs and report helpers.

Write JSON under `test-results/performance/`, attach it to Playwright output, and add markdown summaries only for stable human-readable run summaries.

## No Analog Found

- `tests/e2e/runPerformanceCommand.cjs` has no exact local analog. Use a small Node child-process wrapper only to make environment-variable scripts cross-platform without adding `cross-env`.

