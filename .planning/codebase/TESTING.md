# Testing Patterns

**Analysis Date:** 2026-06-05

## Test Framework

**Runner:**
- Unit/component tests use CRA Jest through `react-scripts test`, configured by `package.json` and `src/setupTests.ts`.
- DOM assertions use `@testing-library/react` and `@testing-library/jest-dom`; the only current unit test is `src/App.test.tsx`.
- E2E tests use Playwright-style specs in `tests/e2e/*.spec.ts` with imports from `@playwright/test`.
- No `playwright.config.*` file was found in the repository root during this scan.

**Assertion Library:**
- Jest/Testing Library uses `expect` plus jest-dom matchers, for example `toBeInTheDocument` in `src/App.test.tsx`.
- Playwright tests use Playwright `expect` from `tests/e2e/fixtures/appTest.ts`, with matchers like `toBeVisible`, `toContainText`, `toHaveURL`, `toBeChecked`, and `toHaveCount`.

**Run Commands:**
```bash
npm test                                           # CRA/Jest watch-mode test runner
npm test -- --watchAll=false                      # CRA/Jest non-watch run
npm test -- src/App.test.tsx --watchAll=false     # Single CRA/Jest test file
npm run build                                     # Practical type/lint/build gate through CRACO/CRA
npx playwright test tests/e2e/shopping-list.spec.ts
npx playwright test tests/e2e/performance-regression.spec.ts
PERF_BASELINE=1 npx playwright test tests/e2e/performance-baseline.spec.ts
```

Notes:
- `package.json` currently defines `start`, `build`, `test`, and `eject`; it does not define `test:e2e` or `test:e2e:report`.
- `docs/automated-regression-test-plan.md` documents `npm run test:e2e`, `E2E_PORT=3021 npm run test:e2e`, and `npm run test:e2e:report`; those commands require package script support before they work from this checkout.
- `.env` defines `PORT` and `PUBLIC_URL`; values were not retained in this map. Documented performance runs may set `E2E_PORT` to match the reachable dev server.

## Test File Organization

**Location:**
- Unit/component tests are colocated under `src`, currently `src/App.test.tsx`.
- E2E specs live in `tests/e2e/`.
- Shared E2E fixtures live in `tests/e2e/fixtures/`.
- Performance evidence is written under `test-results/performance/` by performance specs.

**Naming:**
- Unit tests use `*.test.tsx`, for example `src/App.test.tsx`.
- E2E tests use `*.spec.ts`, for example `tests/e2e/dashboard.spec.ts`, `tests/e2e/global-search.spec.ts`, and `tests/e2e/shopping-list.spec.ts`.
- Performance test specs use explicit names, for example `tests/e2e/performance-baseline.spec.ts` and `tests/e2e/performance-regression.spec.ts`.

**Structure:**
```text
src/
  App.test.tsx
  setupTests.ts
tests/
  e2e/
    dashboard.spec.ts
    dish-serving-and-modal.spec.ts
    global-search.spec.ts
    shopping-list.spec.ts
    performance-baseline.spec.ts
    performance-regression.spec.ts
    fixtures/
      appTest.ts
      seedApp.ts
      testData.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { expect, test } from './fixtures/appTest';
import { TEST_IDS } from './fixtures/testData';

test.describe('Shopping list detail', () => {
  test('keeps grouped recipe amounts while showing partial inventory and bought status', async ({ page }) => {
    await page.goto(`shoppingList/detail?shoppingList=${TEST_IDS.shoppingLists.regression}`);
    const chicken = page.getByTestId(`shopping-list-ingredient-${TEST_IDS.ingredients.chicken}`);
    await expect(chicken).toContainText('Ga regression thit dui');
  });
});
```

**Patterns:**
- E2E tests group by feature using `test.describe`, for example `Dashboard`, `Global search`, `Shopping list detail`, and `Dish detail and serving scale`.
- Tests prefer direct user-flow setup with `page.goto`, role selectors, visible text assertions, and `data-testid` selectors for structural elements.
- Shared setup is centralized through the extended `page` fixture in `tests/e2e/fixtures/appTest.ts`.
- Helper functions are local to specs when only one file needs them, for example `openShoppingList` in `tests/e2e/shopping-list.spec.ts`.

## Mocking

**Framework:**
- CRA/Jest mocking patterns are not established beyond the default app test.
- Playwright route mocking is used in `tests/e2e/fixtures/seedApp.ts`.

**Patterns:**
```typescript
await page.route('https://raw.githubusercontent.com/**', async route => {
  await route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
});
```

**What to Mock:**
- Shared-data network reads from GitHub are blocked in E2E setup so tests remain deterministic.
- Browser storage is reset and reseeded before React starts.
- Service worker registrations and caches are cleared in E2E setup to avoid stale app shell behavior.

**What NOT to Mock:**
- Internal Redux reducers, selectors, routing, and UI workflows are exercised through the real app in E2E tests.
- Price, inventory, dish, shopping-list, and scheduled-meal calculations are validated through seeded user flows rather than isolated mocks.

## Fixtures and Factories

**Test Data:**
```typescript
export const TEST_IDS = {
  ingredients: { chicken: 'ing-chicken', scrollLast: 'ing-scroll-12' },
  dishes: { comGa: 'dish-com-ga' },
  shoppingLists: { regression: 'sl-regression' },
} as const;
```

**Location:**
- `tests/e2e/fixtures/testData.ts` defines deterministic ingredients, dishes, shopping lists, scheduled meals, inventory, and helper builders.
- `tests/e2e/fixtures/seedApp.ts` injects Redux Persist-compatible `persist:shared` and `persist:personal` values into `localStorage`.
- `tests/e2e/fixtures/appTest.ts` extends Playwright's base test so every E2E test gets seeded state by default.

## Coverage

**Requirements:**
- No coverage threshold or CI coverage gate was found.
- `.gitignore` excludes `/coverage`.
- E2E coverage is tracked manually through the matrix in `docs/automated-regression-test-plan.md`.

**Configuration:**
- CRA/Jest coverage can be requested with `npm test -- --coverage --watchAll=false`.
- Playwright performance specs write JSON and CPU profile evidence to `test-results/performance/`; this directory is not currently ignored by `.gitignore`.

**View Coverage:**
```bash
npm test -- --coverage --watchAll=false
```

## Test Types

**Unit Tests:**
- Minimal current coverage: `src/App.test.tsx` still checks the default CRA `learn react` text and appears stale relative to the real app shell.
- `src/setupTests.ts` only imports `@testing-library/jest-dom`.

**Integration Tests:**
- No separate integration-test convention was found.
- Most cross-module behavior is covered through Playwright E2E flows instead of module-level integration tests.

**E2E Tests:**
- Core user flows are covered by `tests/e2e/dashboard.spec.ts`, `tests/e2e/global-search.spec.ts`, `tests/e2e/shopping-list.spec.ts`, and `tests/e2e/dish-serving-and-modal.spec.ts`.
- E2E selectors intentionally combine `data-testid` for structure with visible text or roles for behavior assertions.
- `docs/automated-regression-test-plan.md` is the source of truth for the E2E matrix and backlog rows.

**Performance Tests:**
- `tests/e2e/performance-baseline.spec.ts` is skipped unless `PERF_BASELINE=1` is set; it records route timings, resource summaries, CDP metrics, and CPU profiles.
- `tests/e2e/performance-regression.spec.ts` runs as a normal regression gate for virtualized row spacing, lazy tab/modal mounting, route budgets, image budgets, and modal visibility timing.
- Performance JSON is written to `test-results/performance/perf-00-baseline.json` and `test-results/performance/perf-07-regression.json`.

## Common Patterns

**Async Testing:**
```typescript
await page.goto('./');
await expect(page.getByTestId('dashboard')).toBeVisible();
```

**Navigation Testing:**
```typescript
await expect(page).toHaveURL(new RegExp(`/my-recipes/shoppingList/detail\\?shoppingList=${TEST_IDS.shoppingLists.regression}$`));
```

**Storage Seeding:**
```typescript
await page.addInitScript(({ shared, personal }) => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('persist:shared', JSON.stringify(shared));
  localStorage.setItem('persist:personal', JSON.stringify(personal));
}, seed);
```

**Performance Budget Testing:**
```typescript
const startedAt = Date.now();
await action();
await expect(target()).toBeVisible({ timeout: budgetMs });
expect(Date.now() - startedAt).toBeLessThanOrEqual(budgetMs);
```

**Snapshot Testing:**
- No snapshot test convention was found.

## Gaps and Maintenance Notes

- Add or repair package scripts for E2E if `docs/automated-regression-test-plan.md` should be executable as written.
- Add `@playwright/test` to package-managed dependencies if the suite is expected to run from a clean install.
- Replace or update `src/App.test.tsx`; the current `learn react` assertion does not match the app behavior observed in `src/App.tsx`.
- Keep E2E seed data aligned with Redux Persist slice keys in `src/Store/Store.ts`.
- Add `data-testid` hooks for stable structural assertions when adding new core flows.

---

*Testing analysis: 2026-06-05*
*Update when test patterns change*
