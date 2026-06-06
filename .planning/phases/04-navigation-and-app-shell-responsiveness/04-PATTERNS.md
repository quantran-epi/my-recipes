# Phase 04 - Pattern Map

**Mapped:** 2026-06-06
**Phase:** 04 - Navigation and App-Shell Responsiveness
**Status:** Ready for planning

## Pattern Mapping Complete

Phase 4 should reuse the existing app-shell, modal deferral, route builder, and performance evidence patterns. The main implementation risk is not missing UI components; it is mounting too much drawer/navigation work in the first paint and leaving route feedback split across local hook instances.

## Source Files And Roles

| File | Role In Phase 4 | Existing Pattern To Preserve |
|------|------------------|------------------------------|
| `src/Routing/MasterPage.tsx` | Primary app-shell integration point for drawer, bottom tabs, route feedback, cooking pill, global search mount, and drawer tools. | Ant Design `Drawer`, compact route-feedback overlay, `flushSync` before `React.startTransition`, local `useToggle` overlay gates. |
| `src/Modules/Home/Screens/GlobalSearch.screen.tsx` | Global search result navigation should join app-shell feedback. | Manual full-screen overlay with compact result groups, debounced search, recent-search persistence, and `React.startTransition(() => navigate(path))`. |
| `src/Modules/Dishes/Screens/DishesList.screen.tsx` | Dish large-list detail route transition should join route feedback. | Virtualized/paged list, `DeferredModalContent`, modal close before detail-route navigation, rich row preservation. |
| `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx` | Shopping-list large-list detail route transition should join route feedback. | Virtualized/paged list, checklist modal shell-first generation, modal close before detail-route navigation. |
| `src/Components/Modal/Modal.tsx` | Modal deferral pattern to keep and optionally tune. | `DeferredModalContent` waits two animation frames before mounting heavier children and shows a small `Spin`. |
| `tests/e2e/performance-regression.spec.ts` | Strict performance gate extension point. | `measureInteraction` records `shellVisibleMs` and `contentReadyMs`; Phase 2/3 practical budgets stay active. |
| `tests/e2e/performance-baseline.spec.ts` | Drawer baseline reference. | Existing `sidebar-drawer-open` timing sample uses `sidebar-drawer-button`, `My Recipes`, and `Dữ liệu dùng chung`. |
| `tests/e2e/global-search.spec.ts` | Search navigation regression coverage. | Search result clicks verify ingredient and shopping-list route navigation. |
| `docs/performance-audit-plan.md`, `docs/automated-regression-test-plan.md`, `docs/large-list-modal-sidebar-performance-note.md` | User-facing performance evidence and visual checklist updates. | Concise command/evidence documentation and non-technical eye checks. |

## Existing App-Shell Feedback Pattern

`src/Routing/MasterPage.tsx` currently defines a local route loading hook and overlay styles:

- `useRouteLoadingFeedback(pathname)` stores `routeLoading`, `pendingRouteRef`, a fallback timer, and frame/timer cleanup refs.
- `startRouteLoading(href)` sets the pending route and starts a 1200 ms fallback.
- A route-completion effect waits until `pathname` matches the pending route, then clears after two animation frames and an 80 ms timer.
- `SidebarDrawer` and `BottomTabNavigator` duplicate local instances of this hook.
- The compact overlay copy is already locked by context/UI spec: `Đang mở trang` / `Chuẩn bị dữ liệu hiển thị`.

**Planner use:** Plan a small shared app-shell route feedback controller near `MasterPage`, not a route architecture rewrite. Preserve the existing overlay style and completion behavior while adding a central `pendingDestination` duplicate guard and a shared navigation function.

## Existing Drawer Pattern

`SidebarDrawer` currently:

- Opens with `setOpen(true)` from the `sidebar-drawer-button`.
- Uses `Drawer destroyOnClose`, so the drawer body is rebuilt on every open.
- Renders route navigation first, then all drawer tools inside one `Box` body: shared sync, publish, Gist backup, cooking history, user guide, account/admin controls.
- Navigates with `flushSync(() => { setOpen(false); startRouteLoading(href); }); React.startTransition(() => navigate(href));`.

**Planner use:** Split drawer content into immediate shell/nav and deferred tools. Keep the route list visible/tappable before deferred sections mount. Preserve current section order and copy after the deferred content appears.

## Existing Global Search Pattern

`GlobalSearchScreen` currently:

- Renders only when `open` is true.
- Uses a fixed full-screen overlay with white header and gray body.
- Debounces the query to 300 ms.
- Groups results into `Món ăn`, `Nguyên liệu`, and `Lịch mua sắm`, with `DEFAULT_SHOW = 5` and show-more rows.
- `_navigate(path)` commits the search, closes the overlay, and starts `navigate(path)` inside `React.startTransition`.

**Planner use:** Add an app-shell navigation prop or context hook so `_navigate(path)` starts route feedback before closing/navigating. Do not alter search result density, result grouping, or copy.

## Existing Large-List Detail Navigation Pattern

`DishesList.screen.tsx`:

- Uses `VirtualList` with `data-testid="dish-virtual-list"` and page-status pill `dish-list-page-status`.
- Detail modal body uses `DeferredModalContent`.
- `_onOpenDetailPage` hides the dish detail modal and navigates to `RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(props.item.id)`.

`ShoppingList.screen.tsx`:

- Uses `VirtualList` with `data-testid="shopping-list-virtual-list"` and page-status pill `shopping-list-list-page-status`.
- Checklist modal body uses `DeferredModalContent` and generation is already delayed with two animation frames.
- `_onOpenDetailPage` hides the checklist modal and navigates to `RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(props.item.id)`.

**Planner use:** Route these detail transitions through the same app-shell feedback behavior while preserving modal close behavior and rich row/detail content.

## Route Builder Pattern

Use `RootRoutes` route builders, not ad hoc path strings:

- `RootRoutes.AuthorizedRoutes.Root()` returns `/`.
- `RootRoutes.AuthorizedRoutes.DishesRoutes.List()` and `.ManageIngredient(id)` build dish list/detail paths.
- `RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List()` and `.Detail(id)` build shopping-list list/detail paths.
- `RootRoutes.AuthorizedRoutes.IngredientRoutes.List()` and `.Detail(id)` build ingredient list/detail paths.
- `RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List()` and `ExpensePlanner()` are used by drawer navigation.

## Modal Deferral Pattern

`DeferredModalContent` in `src/Components/Modal/Modal.tsx`:

- Resets `ready` to false when inactive.
- Waits two requestAnimationFrame callbacks before setting `ready` true.
- Shows a centered small `Spin` inside a stable `minHeight` area while not ready.

**Planner use:** Keep this pattern for modal bodies. If the drawer needs equivalent behavior, use the same shell-first scheduling idea locally rather than a new visual skeleton system.

## Performance Evidence Pattern

`measureInteraction` in `tests/e2e/fixtures/performanceReport.ts`:

- Runs an action.
- Waits for `shellLocator()` within `shellBudgetMs` and records `shellVisibleMs`.
- Optionally waits for `contentReadyLocator()` within `contentReadyBudgetMs` and records `contentReadyMs`.
- Emits warnings when shell time exceeds `strictShellTargetMs`, currently 100 ms.

Existing Phase 2 budgets in `tests/e2e/performance-regression.spec.ts`:

- `shellTargetMs: 100`
- row menu/action: `3500/3500 ms`
- modal/detail: `2000/5000 ms`
- search/reset: `2500/5000 ms`

Phase 4 research recommends practical app-shell budgets:

- drawer shell <= `1000 ms`
- route feedback overlay <= `1000 ms`
- route content-ready <= `5000 ms`

**Planner use:** Add Phase 4 interaction IDs to the existing performance spec and write a new evidence pair such as `perf-10-phase4-app-shell-navigation.json` and `.md`. Keep Phase 2/3 gates active.

## Test Hook Pattern

Existing stable hooks:

- `sidebar-drawer-button`
- `sidebar-drawer`
- `global-search-button`
- `global-search-input`
- `global-search-ingredient-{id}`
- `global-search-shopping-list-{id}`
- `dish-list-item-{id}`
- `dish-virtual-list`
- `shopping-list-item-{id}`
- `shopping-list-virtual-list`
- `shopping-list-ingredient-modal`
- `dish-readonly-detail-modal`
- list page status pills with `pointer-events: none`

**Planner use:** Add only the minimum new `data-testid` hooks needed to distinguish route-feedback overlay and deferred drawer-tools readiness. Do not add visible testing text.

## Anti-Patterns To Avoid

- Do not remove drawer tools to make the drawer faster.
- Do not replace Ant Design drawer/modal/search patterns.
- Do not add a full-page loader, landing page, hero, explanatory performance banner, or new skeleton system.
- Do not change `/my-recipes` basename routing or route builders.
- Do not touch Redux Persist state shape, GitHub sync semantics, Gist backup semantics, or service-worker/PWA behavior.
- Do not make the route feedback depend on live network state; Phase 4 feedback is local app-shell feedback.

## PATTERN MAPPING COMPLETE
