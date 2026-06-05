# Automated Regression Test Plan

This file tracks the repeatable regression suite for the recipe app. The automated suite uses Playwright, starts the app with npm, seeds deterministic Redux Persist localStorage data, and writes reports to `playwright-report` plus `test-results/e2e-results.json`. On Windows it defaults to the installed Microsoft Edge browser so the suite can run even when the organization blocks Playwright browser downloads.

Run all automated tests:

```bash
npm run test:e2e
```

If port `3010` is already busy, run on a fresh port:

```bash
E2E_PORT=3021 npm run test:e2e
```

PowerShell equivalent:

```powershell
$env:E2E_PORT='3021'; npm run test:e2e
```

Open the HTML report after a run:

```bash
npm run test:e2e:report
```

Run the performance regression smoke suite:

```bash
npm run test:e2e:performance
```

Run the Phase 2 strict large-list responsiveness gate with the deterministic daily dataset:

```bash
E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance
```

The Phase 2 gate covers dish, ingredient, and shopping-list search/reset, modal/detail open, and row-menu/action open. It fails on practical budgets defined in `tests/e2e/performance-regression.spec.ts`: search/reset 2,500 ms shell and 5,000 ms content, row menu/action 3,500 ms shell/content, and modal/detail 2,000 ms shell and 5,000 ms content. The 100 ms shell-visible target remains an ideal warning in evidence, not a hard failure.

Capture Phase 1 performance baseline evidence:

```bash
npm run test:e2e:performance:baseline
```

Capture Phase 2 stress evidence for comparison without making it the daily strict gate:

```bash
E2E_BROWSER_CHANNEL=chrome PERF_DATASET=stress PERF_NETWORK_MODE=online-normal npm run test:e2e:performance:baseline
```

Capture diagnostic baseline evidence with CPU profiles/traces enabled:

```bash
npm run test:e2e:performance:diagnostic
```

Performance evidence is written to `test-results/performance/` as JSON plus markdown summaries. The baseline command records daily and stress datasets across online-normal, browser-offline, and mocked slow-network modes unless narrowed with `PERF_DATASET` or `PERF_NETWORK_MODE`. Phase 1 treats shell visible under 100 ms as the desired UX target; misses are recorded as warnings rather than failing strict gates. Phase 2 keeps that 100 ms warning while enforcing practical daily large-list budgets. Online/offline comparison, GitHub sync isolation, image behavior, and service-worker/network effects remain Phase 3 checks.

## Seed Data

The automation seed is defined in `tests/e2e/fixtures/testData.ts` and injected by `tests/e2e/fixtures/seedApp.ts` before React starts.

Important seeded entities:

| Entity | ID | Purpose |
|---|---|---|
| Shopping list | `sl-regression` | Partial inventory, partial bought amount, many checklist rows, dish tab modal |
| Ingredient | `ing-chicken` | Appears in two dishes, requires 700g, inventory has 100g, bought amount is 200g |
| Ingredient | `ing-rice` | Missing from inventory and contributes to remaining cart cost |
| Ingredient | `ing-water` | Always available and should be checked/covered |
| Ingredient | `ing-expired` | Expired inventory batch for dashboard urgency |
| Ingredient | `ing-scroll-12` | Final checklist item for scroll reachability |
| Dish | `dish-com-ga` | Base servings 2, cooking modal scaling, read-only modal |
| Dish | `dish-salad-ga` | Shares chicken to test grouped shopping-list ingredient amounts |
| Scheduled meal | `meal-today-regression` | Dashboard today summary |

## Test Matrix

| ID | Feature | Automation | Prerequisite | Flow | Input | Expected Result | Status |
|---|---|---|---|---|---|---|---|
| DASH-001 | Dashboard overview | `tests/e2e/dashboard.spec.ts` - `shows seeded overview cards and opens a shopping-list detail` | Seeded dashboard data | Open dashboard, inspect metric labels, inspect expired ingredient row, click shopping-list row | `sl-regression`, `ing-expired` | Dashboard renders, expired batch is visible, shopping-list row navigates to `/shoppingList/detail?shoppingList=sl-regression` | Automated |
| NAV-001 | Global search navigation | `tests/e2e/global-search.spec.ts` - `navigates to ingredient and shopping-list details from search results` | Seeded ingredient and shopping list | Open global search, search ingredient, click result, search shopping list, click result | `Tuong ot regression`, `Regression shopping list` | Ingredient result navigates to ingredient detail, shopping-list result navigates to shopping-list detail | Automated |
| SHOP-CHK-001 | Shopping-list grouped checklist | `tests/e2e/shopping-list.spec.ts` - `keeps grouped recipe amounts while showing partial inventory and bought status` | `ing-chicken` appears in two dishes | Open shopping list, inspect chicken group, expand group, inspect dish amount rows | Chicken 500g in `Com ga regression`, 200g in `Goi ga regression` | Group shows required 700g, available 100g, buy 400g, bought 200g, remains unchecked, expanded rows preserve original dish amounts | Automated |
| SHOP-CHK-002 | Auto done by bought amount | `tests/e2e/shopping-list.spec.ts` - `marks an ingredient done when the entered bought amount covers the missing amount` | Chicken needs 600g after inventory | Expand chicken group and enter bought amount | `600` g | Chicken group becomes checked and displays bought amount 600g | Automated |
| SHOP-EXP-001 | Shopping-list expense summary | `tests/e2e/shopping-list.spec.ts` - `shows separate remaining-cart and bought expense totals` | Price estimates on chicken and rice | Open expense tab and inspect cost cards | Seeded partial buy: chicken remaining 400g, rice missing 200g, chicken bought 200g | Cart cost is `36.000đ - 46.000đ`; bought cost is `16.000đ - 20.000đ`; values are not incorrectly equal | Automated |
| SHOP-COMP-001 | Purchase completion review | `tests/e2e/shopping-list.spec.ts` - `opens the completion review before importing bought ingredients` | Shopping list has bought import plan | Click complete shopping button | `Hoàn tất mua sắm` | Confirmation/review modal appears before import and lists bought chicken | Automated |
| LAYOUT-001 | Detail screen scroll reachability | `tests/e2e/shopping-list.spec.ts` - `can scroll the final checklist item fully into view` | Shopping list has extra checklist rows | Scroll to final seeded checklist item | `ing-scroll-12` | Final item's bottom is inside `#app-content` viewport | Automated |
| DISH-SERV-001 | Dish serving scaling | `tests/e2e/dish-serving-and-modal.spec.ts` - `starts cooking with base servings and scales ingredient requirements` | Dish base servings is 2 | Open dish detail, start cooking, inspect serving input and ingredient amount, change servings | Serving `2` then `1` | Default serving is 2; chicken requirement changes from 500g to 250g when serving changes to 1 | Automated |
| DISH-MODAL-001 | Read-only dish modal from shopping list | `tests/e2e/dish-serving-and-modal.spec.ts` - `opens read-only dish detail from shopping-list dishes tab and can navigate to the detail page` | Shopping list contains `dish-com-ga` | Open shopping-list dishes tab, click dish, inspect modal, click open-detail button | `Com ga regression` | Read-only modal opens with ingredient inventory status and detail button navigates to dish detail page | Automated |
| PERF-LIST-001 | Phase 2 large-list responsiveness | `tests/e2e/performance-regression.spec.ts` - `captures required large-list interaction timings` | Daily performance seed, GitHub Raw stubbed unless `PERF_REAL_NETWORK=1` | Open dish, ingredient, and shopping-list screens; measure search reset, modal/detail open, and row-menu/action open | `perf-daily-*` generated IDs | Each interaction records separate shell/content timing and stays inside Phase 2 practical budgets; 100 ms shell misses are warnings | Automated |
| PERF-LIST-002 | Virtualized row stability | `tests/e2e/performance-regression.spec.ts` row spacing and drag-scroll tests | Regression seed plus large paged ingredient rows | Inspect row gaps, dynamic row frames, page-status pills, drag over row action, then click intentionally | `ing-chicken`, `ing-paged-last`, `perf-daily-*` generated IDs | Rows do not overlap or clip, page-status pills have `pointer-events: none`, drag does not open a modal, and intentional click still opens one | Automated |
| ING-001 | Ingredient detail and inventory status | Backlog | Ingredient detail data seeded | Open ingredient detail, inspect preservation, expiry, unit rules, price range | `ing-chicken`, `ing-water` | Detail shows unit constraints, always available flag, preservation/expiry fields, price range | Planned |
| INV-001 | Inventory batch expiry and discard | Backlog | Expired and non-expired batches seeded | Open inventory modal/detail, inspect expired batch, discard expired batch with confirmation | `ing-expired` | Expired batch is marked expired, unusable for suggestions, can be discarded after confirmation | Planned |
| COOK-001 | Cooking session completion | Backlog | Dish has steps and inventory | Start cooking, advance steps, finish cooking | `dish-com-ga` | Cooking session progresses step by step and deducts usable inventory on finish | Planned |
| SHOP-HIST-001 | Shopping-list history/audit | Backlog | Completed shopping-list import history seeded | Complete a shopping list, inspect audit history | Completion import entries | Completed list becomes read-only and audit shows imported batches/costs | Planned |
| SUGG-001 | Dish suggestion explanation | Backlog | Inventory covers, partially covers, and misses ingredients | Open fridge suggestion, inspect urgent badges and explanation | Seeded inventory | Always-available ingredients do not dominate ranking; urgent ingredients are promoted with visible explanation | Planned |

## Reporting Expectations

For each future run, report:

| Field | Meaning |
|---|---|
| Command | Exact command used, normally `npm run test:e2e` |
| Result | Pass/fail count from Playwright |
| Failed IDs | Test matrix IDs connected to failures |
| Evidence | Screenshot/trace path for failures, or note that no artifacts were needed |
| Follow-up | Bug or test gap discovered during the run |

Video artifacts are disabled because Playwright requires a separate `ffmpeg` download for video recording, and that download may be blocked by the organization certificate chain. Failure screenshots and traces remain enabled.

## Maintenance Rules

- Keep seed data deterministic and isolated from the user's real persisted data.
- Prefer `data-testid` for structural E2E selectors and user-visible text for behavior assertions.
- Add a matrix row whenever a new core workflow is added.
- Move backlog rows to `Automated` once a Playwright spec covers the expected result.
