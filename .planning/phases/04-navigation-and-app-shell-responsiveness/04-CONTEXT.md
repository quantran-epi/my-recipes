# Phase 4: Navigation and App-Shell Responsiveness - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 makes the app shell feel responsive when the user navigates from large-list screens through the sidebar drawer, bottom tabs, global search, row/detail links, and related overlay entry points. The phase should make drawer/sidebar opening and route feedback appear immediately, prevent stale blocked shell state, and preserve current cooking, shopping, sync, backup, admin, guide, and modal workflows.

This phase is not a broad redesign, not a route architecture rewrite, and not a feature-removal pass. Pagination/virtualization and online/offline isolation were handled in earlier phases; Phase 4 focuses on app-shell, navigation, and overlay perceived responsiveness.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Opening
- **D-01:** Optimize for a fast sidebar shell first. The user should see the drawer respond immediately from large-list screens, even if secondary drawer tools finish after the shell is visible.
- **D-02:** The drawer's immediate content should be logo/title plus route navigation links. Sync, backup, admin, guide/history, and other heavier sections can load progressively after the drawer has opened.
- **D-03:** Use quiet progressive loading for heavier drawer sections. Insert or reveal them after the drawer is visible without noisy explanatory UI or blocking the user's ability to navigate.
- **D-04:** Preserve all current drawer tools: shared-data sync, publish, Gist backup, admin login/logout, cooking history, and user guide. Speed fixes must not silently remove or hide these workflows.

### Route Feedback
- **D-05:** Show immediate route feedback for all relevant navigation paths: sidebar drawer links, bottom tabs, global search result clicks, and large-list-to-detail navigation.
- **D-06:** Use the existing small app-shell overlay pattern, such as the current `Đang mở trang` / `Chuẩn bị dữ liệu hiển thị` feedback, rather than a heavier full-page loading screen.
- **D-07:** While route feedback is active, ignore duplicate taps to the same destination until navigation settles. This avoids repeated work and stale pending state without broadly blocking the user.
- **D-08:** Hide route feedback after the route changes and the browser gets a short paint window. Avoid hiding purely on a fixed timeout if the route has not actually painted yet.

### Overlay Feel
- **D-09:** When opening a modal or sidebar from a large list, show an instant overlay shell with a light body first, such as a small spinner or lightweight starter body, then fill heavier content after the shell paints.
- **D-10:** Keep and tune the existing `DeferredModalContent` pattern instead of replacing it with a new skeleton system. Make shell timing more consistent and prevent heavy bodies from mounting before the shell can paint.
- **D-11:** Keep loading text minimal. Use a quiet spinner or short status only; avoid adding explanatory in-app text about performance mechanics.
- **D-12:** Preserve current layout, information density, and daily workflow placement. Phase 4 should improve responsiveness without redesigning screens.

### UX Proof Flows
- **D-13:** Verify the daily path set after Phase 4: drawer open/close, drawer navigation, bottom-tab navigation, global search navigation, large-list-to-detail navigation, and key modal open behavior.
- **D-14:** Use both automated timing checks and manual eye checks. Automated evidence protects regressions; the final report should also tell the user exactly what to check visually in the app.
- **D-15:** If a performance fix risks changing a daily workflow, stop and preserve UX. Do not simplify, remove, or make a workflow less visible without an explicit product decision.
- **D-16:** The main visible success signal is that drawer/routes feel instant from large-list screens. Sidebar open and navigation feedback should appear right away; heavier content can finish after.
- **D-17:** The final Phase 4 report should emphasize a simple visual checklist plus a short summary of timing evidence, not a long technical-only report.

### the agent's Discretion
- The planner may choose the exact component split, scheduling mechanism, memoization boundaries, and route-feedback plumbing as long as the decisions above hold.
- The planner may choose exact test IDs, timing budgets, and evidence filenames by reusing the existing performance harness patterns.
- The planner may make small implementation-only adjustments to support fast shell rendering, but must avoid visible redesign or workflow simplification.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Context
- `.planning/PROJECT.md` - Product scope, local-first constraints, performance priority, and UX preservation requirements.
- `.planning/REQUIREMENTS.md` - Phase 4 requirements `LIST-04` and `UX-02`, plus surrounding v1 constraints.
- `.planning/ROADMAP.md` - Phase 4 goal, success criteria, canonical refs, and planned work items `04-01` and `04-02`.
- `.planning/STATE.md` - Current project status, Phase 4 pending todos, and latest Phase 3 timing trend.
- `.planning/phases/01-measurement-and-performance-harness/01-CONTEXT.md` - Shell-visible/content-ready timing decisions, online/offline modes, and evidence format.
- `.planning/phases/02-large-list-interaction-hot-paths/02-CONTEXT.md` - Immediate shell feedback, rich row preservation, practical budgets, and Phase 2 hot paths.
- `.planning/phases/03-online-and-offline-cost-isolation/03-CONTEXT.md` - Startup sync deferral, progressive sync prompt behavior, list/detail image split, and online/offline comparison decisions.

### User-Facing Performance Notes And Evidence
- `docs/large-list-modal-sidebar-performance-note.md` - Explanation of the remaining modal/sidebar pause, current visual checks, and why Phase 4 is the next fix area.
- `docs/performance-audit-plan.md` - Existing performance plan, Phase 2/3 budgets, latest evidence, and historical app-shell/navigation work notes.
- `docs/automated-regression-test-plan.md` - Regression matrix and existing navigation/search/detail/modal flow coverage.
- `test-results/performance/perf-08-phase3-daily-online-normal.md` - Latest online Phase 3 large-list comparison timing evidence.
- `test-results/performance/perf-08-phase3-daily-browser-offline.md` - Latest offline Phase 3 comparison timing evidence.
- `test-results/performance/perf-08-phase3-daily-mocked-slow-network.md` - Latest mocked slow network/image Phase 3 comparison timing evidence.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - App shell, route graph, state, sync, and service-worker architecture.
- `.planning/codebase/STRUCTURE.md` - File locations for routing, global search, feature list screens, modal wrappers, and e2e tests.
- `.planning/codebase/CONVENTIONS.md` - Naming, component, selector, modal, and virtual-list conventions.
- `.planning/codebase/STACK.md` - React, React Router, Ant Design, Redux Persist, react-window, Workbox, and testing stack constraints.

### Source Integration Points
- `src/Routing/MasterPage.tsx` - Persistent app shell, sidebar drawer, bottom tabs, route loading feedback, cooking pill, data tools, and global search mount point.
- `src/Routing/RootRouter.tsx` - Root nested route graph under `/my-recipes`.
- `src/Routing/RootRoutes.ts` - Route builders used by drawer, tabs, global search, and feature navigation.
- `src/Modules/Home/Screens/GlobalSearch.screen.tsx` - Global search modal and search-result navigation behavior.
- `src/Modules/Dishes/Routing/DishesRouteConfig.ts` - Dish route construction for list/detail transitions.
- `src/Modules/ShoppingList/Routing/ShoppingListRouteConfig.ts` - Shopping-list route construction for list/detail transitions.
- `src/Components/Modal/Modal.tsx` - Shared Ant Design modal export and `DeferredModalContent` shell/body deferral behavior.
- `src/Modules/Dishes/Screens/DishesList.screen.tsx` - Large-list source for dish row/detail/modal navigation checks.
- `src/Modules/Ingredient/Screens/IngredientList.screen.tsx` - Large-list source for ingredient inventory/modal checks.
- `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx` - Large-list source for shopping-list row/detail/modal navigation checks.

### Test Harness And Existing Flow Coverage
- `tests/e2e/performance-regression.spec.ts` - Current performance timing checks and practical budget patterns.
- `tests/e2e/fixtures/performanceReport.ts` - `measureInteraction`, shell/content timing, warnings, and evidence output helpers.
- `tests/e2e/fixtures/performanceNetwork.ts` - Controlled online/offline/slow-network behavior for comparison gates.
- `tests/e2e/fixtures/seedApp.ts` - Redux Persist seeding, service-worker cleanup, and deterministic browser state setup.
- `tests/e2e/global-search.spec.ts` - Existing global search navigation coverage.
- `tests/e2e/dashboard.spec.ts` - Existing dashboard-to-detail navigation coverage.
- `tests/e2e/dish-serving-and-modal.spec.ts` - Existing dish modal and detail-route navigation coverage.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useRouteLoadingFeedback` in `src/Routing/MasterPage.tsx`: Existing route-feedback hook that starts a compact app-shell overlay, waits for route/path changes, and clears after a short paint window.
- `sidebarTransitionOverlayStyle` and related styles in `src/Routing/MasterPage.tsx`: Existing compact loading overlay style to reuse across drawer, bottom-tab, global-search, and list-to-detail navigation.
- `DeferredModalContent` in `src/Components/Modal/Modal.tsx`: Existing modal body deferral pattern that waits two animation frames before mounting heavier content.
- `useToggle` and existing modal gates: Common local pattern for opening overlays only when requested.
- `measureInteraction` in `tests/e2e/fixtures/performanceReport.ts`: Existing timing utility for separate shell-visible and content-ready evidence.

### Established Patterns
- Ant Design `Drawer`, `Modal`, `Menu`, `Flex`, and image components are the current app-shell UI foundation; Phase 4 should stay within these patterns unless a specific bottleneck requires a local wrapper.
- Route navigation already uses `React.startTransition` and, in some paths, `flushSync` for immediate feedback. Phase 4 should normalize this behavior rather than invent unrelated navigation mechanics.
- Closed heavy modal bodies should stay unmounted or deferred; this was a Phase 2/3 pattern and remains a Phase 4 guardrail.
- Main list screens use virtualized/paged list rendering. Phase 4 should avoid disturbing that list behavior while improving shell and navigation response.

### Integration Points
- `SidebarDrawer` currently renders the drawer with `destroyOnClose` and contains navigation, sync, backup, admin, cooking history, and user guide sections. This is the primary sidebar-opening optimization point.
- `BottomTabNavigator` already owns route feedback for bottom tab navigation and should align with the Phase 4 route-feedback decisions.
- `GlobalSearchScreen` closes and navigates from result clicks; Phase 4 should add/align immediate feedback for these transitions.
- Large-list row/detail navigation should participate in the same route-feedback policy when moving from list screens to detail routes.
- Existing performance specs already cover some route/modal budgets, but Phase 4 should extend them to drawer/sidebar and app-shell navigation paths from large-list screens.

</code_context>

<specifics>
## Specific Ideas

- The user selected all four Phase 4 gray areas for discussion: sidebar opening, route feedback, overlay feel, and UX proof flows.
- The user chose the recommended option for every decision, prioritizing visible responsiveness while preserving current workflows.
- Sidebar should feel fast because users can see the current pause by eye from large lists.
- The final Phase 4 outcome should be understandable to a non-technical user: what got faster, what can be checked visually, and a short timing summary.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 4-Navigation and App-Shell Responsiveness*
*Context gathered: 2026-06-06*
