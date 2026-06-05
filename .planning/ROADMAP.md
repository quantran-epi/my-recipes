# Roadmap: My Recipes

## Overview

The first milestone establishes a responsiveness foundation for the existing My Recipes product. The work starts by making large-list performance measurable from repo-local commands, then fixes high-frequency virtualized-list interactions, isolates online-only costs from sync/image/network behavior, stabilizes app-shell navigation, and ends with release guardrails that protect future rich feature, UI, and UX work.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Measurement and Performance Harness** - Make large-list and online/offline responsiveness reproducible and measurable. (completed 2026-06-05)
- [ ] **Phase 2: Large-List Interaction Hot Paths** - Remove visible freezes from common virtualized-list interactions.
- [ ] **Phase 3: Online and Offline Cost Isolation** - Control sync, image, service-worker, and network work so online mode stays responsive.
- [ ] **Phase 4: Navigation and App-Shell Responsiveness** - Keep drawers, navigation, and detail-route transitions responsive from large-list screens.
- [ ] **Phase 5: Release Gate and Product Guardrails** - Ship the responsiveness foundation with verification evidence and future-work guardrails.

## Phase Details

### Phase 1: Measurement and Performance Harness

**Goal:** Maintainer can reproduce large-list performance problems and measure online/offline interaction latency from repo-local commands.
**Mode:** mvp
**UI hint:** no
**Depends on:** Nothing (first phase)
**Requirements:** [PERF-01, PERF-02, TEST-01, UX-01]
**Canonical refs:** `docs/performance-audit-plan.md`, `docs/automated-regression-test-plan.md`, `tests/e2e/performance-regression.spec.ts`, `tests/e2e/performance-baseline.spec.ts`, `tests/e2e/fixtures/testData.ts`, `package.json`, `.planning/codebase/TESTING.md`
**Success Criteria** (what must be TRUE):

  1. Maintainer can run a repo-local command that seeds deterministic large-list data and reaches ingredient, dish, and shopping-list screens.
  2. Maintainer can capture timing samples for modal, drawer, detail view, row menu, and list navigation interactions.
  3. Maintainer can run the same smoke checks with online behavior enabled and disabled or stubbed.
  4. Performance evidence is written to a predictable path under `test-results/performance/` or an equivalent documented artifact path.
  5. The baseline names the smoke budgets that later phases must preserve or improve.

**Plans:** 3/3 plans complete

Plans:

**Wave 1**

- [x] 01-01: Wire repo-local performance tooling and package scripts.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02: Add deterministic large-list seed coverage for ingredient, dish, and shopping-list screens.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03: Capture baseline timing/resource evidence and document smoke budgets.

### Phase 2: Large-List Interaction Hot Paths

**Goal:** User can open and use high-frequency controls on ingredient, dish, and shopping-list virtualized lists without visible pre-open freezes.
**Mode:** mvp
**UI hint:** yes
**Depends on:** Phase 1
**Requirements:** [LIST-01, LIST-02, LIST-03, TEST-02]
**Canonical refs:** `src/Modules/Ingredient/Screens/IngredientList.screen.tsx`, `src/Modules/Dishes/Screens/DishesList.screen.tsx`, `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx`, `src/Components/Modal/Modal.tsx`, `src/Components/List/VirtualListRowFrame.tsx`, `src/Components/List/VirtualListScrollTopButton.tsx`, `tests/e2e/performance-regression.spec.ts`, `.planning/codebase/CONCERNS.md`
**Success Criteria** (what must be TRUE):

  1. User can open add, edit, detail, inventory, cooking, and shopping-list modals from large virtualized lists within the chosen smoke budget.
  2. User can open row menus and trigger row actions without a list-wide pause or accidental scroll/click regression.
  3. User can search, filter, reset, and scroll large lists while row spacing and touch/desktop behavior remain correct.
  4. Closed modal bodies and inactive heavy content stay unmounted until the user requests them.
  5. Focused performance tests fail when modal, detail, or menu open timing exceeds the chosen budget.

**Plans:** 1/3 plans executed
Plans:
**Wave 1**

- [x] 02-01: Profile and reduce list row rerender triggers and heavy row props.

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 02-02: Defer or split expensive modal/detail work so shells open promptly.

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 02-03: Extend large-list interaction timing tests for modal, menu, search, filter, and scroll behavior.

### Phase 3: Online and Offline Cost Isolation

**Goal:** User can use the app online and offline with consistent list responsiveness while sync and image/network work is controlled.
**Mode:** mvp
**UI hint:** yes
**Depends on:** Phase 2
**Requirements:** [PERF-03, NET-01, NET-02, NET-03, NET-04, TEST-03]
**Canonical refs:** `src/Hooks/useSharedDataSync.ts`, `src/Components/AppInitializer/AppInitializer.tsx`, `src/Components/AppInitializer/SharedSyncModal.tsx`, `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`, `tests/e2e/fixtures/seedApp.ts`, `.planning/codebase/INTEGRATIONS.md`
**Success Criteria** (what must be TRUE):

  1. User can open the app online without shared-data manifest checks blocking normal list interactions.
  2. User can use the same local-first data offline with no regression in existing behavior.
  3. Dish image loading or decode work no longer creates visible interaction lag on list screens.
  4. Shared-data sync prompts can appear without heavy fetch or impact-analysis work blocking the app shell.
  5. Maintainer can run online/offline comparison checks with GitHub requests stubbed, controlled, or clearly measured.

**Plans:** 3 plans

Plans:

- [ ] 03-01: Instrument and isolate startup shared-sync and service-worker effects.
- [ ] 03-02: Control dish image request/decode behavior on list and detail surfaces.
- [ ] 03-03: Add online/offline comparison checks with deterministic GitHub request handling.

### Phase 4: Navigation and App-Shell Responsiveness

**Goal:** User can navigate from large-list screens through drawers, tabs, and detail routes with responsive feedback and no stale blocked shell state.
**Mode:** mvp
**UI hint:** yes
**Depends on:** Phase 3
**Requirements:** [LIST-04, UX-02]
**Canonical refs:** `src/Routing/MasterPage.tsx`, `src/Routing/RootRouter.tsx`, `src/Routing/RootRoutes.ts`, `src/Modules/Home/Screens/GlobalSearch.screen.tsx`, `src/Modules/Dishes/Routing/DishesRouteConfig.ts`, `src/Modules/ShoppingList/Routing/ShoppingListRouteConfig.ts`, `.planning/codebase/ARCHITECTURE.md`
**Success Criteria** (what must be TRUE):

  1. User can navigate from large-list screens to detail routes with immediate loading feedback and no stale drawer state.
  2. User can open and close drawer/sidebar navigation without blocking list interactions.
  3. User-facing fixes preserve current information density and daily cooking/shopping workflows.
  4. Navigation timing remains within the chosen smoke budget after list and online/offline fixes.

**Plans:** 2 plans

Plans:

- [ ] 04-01: Stabilize drawer, route transition, and app-shell loading feedback paths.
- [ ] 04-02: Verify UX preservation across daily list, modal, and navigation workflows.

### Phase 5: Release Gate and Product Guardrails

**Goal:** Maintainer can ship responsiveness fixes with passing build/regression evidence and documented guardrails for future rich feature, UI, and UX work.
**Mode:** mvp
**UI hint:** no
**Depends on:** Phase 4
**Requirements:** [TEST-04]
**Canonical refs:** `package.json`, `docs/performance-audit-plan.md`, `docs/automated-regression-test-plan.md`, `tests/e2e/performance-regression.spec.ts`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/TESTING.md`
**Success Criteria** (what must be TRUE):

  1. Existing build passes or exact remaining blockers are documented with commands and failure messages.
  2. Relevant performance regression checks pass or exact remaining blockers are documented with commands and failure messages.
  3. Performance evidence and smoke budgets are documented so future feature/UI/UX work can preserve responsiveness.
  4. Known unresolved issues are carried forward as v2 or future milestone candidates rather than hidden in implementation notes.

**Plans:** 2 plans

Plans:

- [ ] 05-01: Run final build, regression, and performance verification gates.
- [ ] 05-02: Update performance documentation and future-work guardrails.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Measurement and Performance Harness | 3/3 | Complete    | 2026-06-05 |
| 2. Large-List Interaction Hot Paths | 0/3 | Planned    |  |
| 3. Online and Offline Cost Isolation | 0/3 | Not started | - |
| 4. Navigation and App-Shell Responsiveness | 0/2 | Not started | - |
| 5. Release Gate and Product Guardrails | 0/2 | Not started | - |

**Coverage:**

- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Roadmap created: 2026-06-05*
