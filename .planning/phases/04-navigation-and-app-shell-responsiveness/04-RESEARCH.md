# Phase 4: Navigation and App-Shell Responsiveness - Research

**Researched:** 2026-06-06
**Phase:** 4 - Navigation and App-Shell Responsiveness
**Status:** Ready for UI design contract, then planning

## Research Complete

Phase 4 should be planned as two connected tracks:

1. Make the app shell respond immediately when opening the sidebar drawer or starting navigation from large-list screens.
2. Extend performance evidence and user-facing checks so drawer, tab, global-search, and list-to-detail navigation stay responsive without removing existing workflows.

This phase should not redesign the app shell, remove drawer tools, replace list virtualization, remove GitHub/Gist workflows, or change the local-first storage model. It should make the first visible shell cheap, then let heavier drawer or route content finish after the browser has painted.

## Relevant Existing System

### App-Shell Route Feedback

- `src/Routing/MasterPage.tsx` already has `useRouteLoadingFeedback(pathname)`, which tracks a pending route, shows a compact overlay, waits for the route path to match, then clears after two `requestAnimationFrame` callbacks plus an 80 ms timer.
- The feedback overlay already uses the desired small app-shell copy: `Dang mo trang` / `Chuan bi du lieu hien thi` in source-visible Vietnamese text.
- `SidebarDrawer` and `BottomTabNavigator` each create their own `useRouteLoadingFeedback` instance, so pending navigation state is duplicated instead of shared across the shell.
- The hook currently does not expose a duplicate-destination guard. It can be started again for the same destination while the previous navigation is still settling.
- The fallback timeout is 1200 ms. This protects against stuck overlays, but route completion should still be primarily path-change-plus-paint based.

Planning implication: extract or centralize route feedback in the app shell so sidebar links, bottom tabs, global search result clicks, and list-to-detail transitions share the same pending destination, compact overlay, duplicate-click behavior, and route-complete cleanup.

### Sidebar Drawer

- `SidebarDrawer` uses Ant Design `Drawer` with `destroyOnClose`.
- The first drawer render mounts navigation links and all secondary tools together: shared-data sync, admin publish, personal Gist backup, cooking history entry, user guide entry, and admin login/logout controls.
- The drawer navigation handler already uses `flushSync` before `React.startTransition(() => navigate(href))`, which is a useful pattern for immediate visible feedback.
- Opening the drawer itself only calls `setOpen(true)`, so drawer open can wait behind large-list work and then mount all drawer body content before the user sees a useful shell.
- Keeping all tools is a locked Phase 4 decision. The optimization target is render timing and progressive body loading, not feature removal.

Planning implication: split the drawer into an immediate shell and deferred tool content. The immediate shell should include logo/title and route navigation links. The sync, publish, Gist backup, history, guide, and account sections should mount after the drawer is visible and after at least one paint window. Consider `destroyOnClose={false}` or a small local mounted-state strategy if it reduces repeated rebuild cost without stale state.

### Bottom Tabs

- `BottomTabNavigator` already calls `flushSync(() => startRouteLoading(href))` and navigates inside `React.startTransition`.
- It only skips navigation when `location.pathname === href`; it does not know whether another shell navigation is already pending to the same destination.
- Because the feedback hook is local, bottom tabs cannot coordinate with drawer, global search, or detail-route feedback.

Planning implication: keep the bottom-tab visual behavior, but route it through the same app-shell navigation controller used by the rest of Phase 4.

### Global Search Navigation

- `src/Modules/Home/Screens/GlobalSearch.screen.tsx` is a manual full-screen overlay, not the shared Ant Design modal wrapper.
- `_navigate(path)` saves recent search, calls `onClose()`, then starts `navigate(path)` inside `React.startTransition`.
- Global search does not currently trigger the compact app-shell route feedback overlay. A result click can close the search overlay before the user gets any navigation feedback from the shell.
- Existing coverage in `tests/e2e/global-search.spec.ts` verifies search result navigation, but not route-feedback timing.

Planning implication: pass an app-shell navigation callback into `GlobalSearchScreen` or expose a shared hook/context that lets result clicks start route feedback before closing/navigating. Preserve the current search overlay layout and result density.

### Large-List Detail Navigation

- `DishesList.screen.tsx` uses `_onOpenDetailPage` to hide the detail modal and navigate to the dish detail route with `React.startTransition`.
- `ShoppingList.screen.tsx` uses `_onOpenDetailPage` to hide the checklist modal and navigate to the shopping-list detail route with `React.startTransition`.
- These detail-route transitions are part of `LIST-04`, but they currently do not participate in the app-shell feedback controller.
- Ingredient detail route navigation is less prominent in the large-list hot path, but Phase 4 should audit it so navigation behavior remains consistent where applicable.

Planning implication: provide a lightweight shared app-shell navigation API that list screens can use when opening detail routes, without changing row information density or modal workflows.

### Modal Deferral

- `src/Components/Modal/Modal.tsx` exports `DeferredModalContent`, which waits two animation frames before mounting heavy children and shows a small `Spin` fallback while not ready.
- Many Phase 2/3 modal call sites already wrap heavy bodies with `DeferredModalContent` and gate children on the modal open state.
- The remaining issue is not that this helper is absent; it is that some overlay shells, especially drawer/sidebar work, still have too much body content in the first visible render.

Planning implication: keep `DeferredModalContent` and use a similar shell-first scheduling idea for the drawer. Only tune the modal helper if the planner finds concrete call sites where heavy content mounts before the shell can paint.

### Performance Harness

- `tests/e2e/fixtures/performanceReport.ts` already measures separate `shellVisibleMs` and `contentReadyMs` values through `measureInteraction`.
- `tests/e2e/performance-regression.spec.ts` currently covers Phase 2 large-list hot paths and Phase 3 online/offline comparison, but it does not yet measure sidebar drawer opening, drawer route navigation, bottom-tab route feedback, global-search route feedback, or large-list-to-detail shell feedback as one Phase 4 matrix.
- Existing practical Phase 2 budgets are still a useful baseline: 100 ms remains the strict UX target warning, while practical gates avoid failing on every non-ideal shell during brownfield stabilization.

Planning implication: extend the existing performance spec and evidence writer instead of adding a separate runner. Add Phase 4 interaction IDs and a markdown evidence file that the user can inspect by eye after execution.

## Recommended Plan Shape

### Plan 04-01: Stabilize Drawer, Route Transition, and App-Shell Loading Feedback Paths

Purpose: make the shell show immediate response for drawer opening and route transitions from large-list screens.

Likely files:

- `src/Routing/MasterPage.tsx`
- `src/Modules/Home/Screens/GlobalSearch.screen.tsx`
- `src/Modules/Dishes/Screens/DishesList.screen.tsx`
- `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx`
- `src/Components/Modal/Modal.tsx` only if concrete modal deferral tuning is needed

Key work:

- Extract the duplicated route loading overlay into a reusable app-shell feedback controller or local provider near `MasterPage`.
- Track `pendingDestination` centrally and ignore duplicate taps to the same destination while route feedback is active.
- Keep the compact overlay copy and visual density; do not introduce a heavy full-page loader.
- Make `SidebarDrawer` open a fast shell first, with logo/title and route navigation visible before secondary drawer tools mount.
- Defer drawer tool sections until after the drawer shell has painted, while preserving shared-data sync, publish, Gist backup, cooking history, user guide, and admin controls.
- Route sidebar navigation, bottom tabs, global search result navigation, and list-to-detail navigation through the same feedback behavior where practical.
- Hide feedback after route path completion and a short paint window, with fallback cleanup for interrupted navigation.

### Plan 04-02: Verify UX Preservation Across Daily List, Modal, and Navigation Workflows

Purpose: prove Phase 4 improved perceived responsiveness while preserving the daily product workflows.

Likely files:

- `tests/e2e/performance-regression.spec.ts`
- `tests/e2e/global-search.spec.ts`
- `tests/e2e/dish-serving-and-modal.spec.ts`
- `tests/e2e/fixtures/performanceReport.ts`
- `docs/performance-audit-plan.md`
- `docs/automated-regression-test-plan.md`
- `docs/large-list-modal-sidebar-performance-note.md`

Key work:

- Add Phase 4 performance interactions for drawer shell open, drawer navigation feedback, bottom-tab navigation feedback, global-search result navigation feedback, and large-list-to-detail navigation feedback.
- Keep shell-visible and content-ready measurements separate. The first target is that the shell responds immediately; content can finish after.
- Add or update `data-testid` hooks only where needed for stable measurement; avoid user-visible testing text.
- Preserve existing global-search, cooking, shopping-list detail, dish modal, and drawer tool flows through regression tests.
- Update docs with a simple visual checklist for the user: drawer shell appears quickly, navigation feedback appears right away, duplicate taps do not stack work, and all drawer tools are still present after the drawer settles.

## Validation Architecture

### What Must Be Proven

- `LIST-04`: from large-list screens, drawer navigation, bottom tabs, global search result clicks, and list-to-detail actions show responsive route feedback and do not leave the drawer/shell in a stale blocked state.
- `UX-02`: performance changes preserve current information density and daily cooking/shopping workflows, including drawer tools, global search, cooking history, user guide, Gist backup, shared-data sync, admin controls, and detail/modal flows.
- The app keeps Phase 2/3 large-list and online/offline practical budgets while adding Phase 4 app-shell measurements.

### Required Verification Commands

- `npm run build` should pass or document only existing warnings/blockers.
- `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` should pass after adding Phase 4 app-shell checks.
- `E2E_BROWSER_CHANNEL=chrome npm run test:e2e:performance:phase3` should still pass or have exact blockers documented if Phase 4 changes app-shell routing behavior that affects online/offline comparisons.
- `E2E_BROWSER_CHANNEL=chrome npm run test:e2e` should be used when Phase 4 touches broad navigation or modal flows, or a focused subset should be documented if full-suite runtime/environment blocks it.

### Evidence To Inspect

- A new Phase 4 evidence pair under `test-results/performance/`, preferably named around `perf-10-phase4-app-shell-navigation.json` and `.md`.
- Evidence must list shell/content timings for drawer open, drawer route navigation, bottom-tab navigation, global-search result navigation, and large-list-to-detail navigation.
- Documentation should name the manual eye checks in non-technical language so the user can validate the deployed app.

### Acceptance Thresholds

- The ideal shell-visible target remains 100 ms warning evidence.
- Practical Phase 4 shell-visible gates should be tighter than old broad Phase 1 smoke gates but realistic for the brownfield app. Recommended initial targets: drawer shell <= 1,000 ms, route feedback overlay <= 1,000 ms, and route content-ready <= 5,000 ms unless execution evidence supports stricter limits.
- No route feedback overlay may remain visible after the route has changed and the browser has received the planned paint window.
- Duplicate navigation taps to the same pending destination must not enqueue repeated route work or leave stale blocked drawer state.

## Risks and Mitigations

- **Over-centralizing navigation could create routing regressions.** Mitigate by keeping the shared API small: start feedback, navigate, and clear on path/paint completion.
- **Keeping the drawer mounted can preserve stale transient state.** Mitigate by only keeping stable shell structure mounted, or resetting sensitive transient inputs such as PIN on close as current code does.
- **Deferring drawer tools can look like removed functionality.** Mitigate by making tools appear quietly after shell paint and adding tests/manual checks that all existing tools remain present.
- **Global search closes before route feedback appears.** Mitigate by starting feedback synchronously before closing search and navigating.
- **List-to-detail changes could disturb modal workflows.** Mitigate by preserving current modal close behavior and only adding route feedback/navigation plumbing.
- **Strict 100 ms hard failures could make the suite noisy.** Mitigate by keeping 100 ms as warning evidence while enforcing practical budgets for Phase 4.

## Research Notes for Planner

- Prefer changes in `MasterPage.tsx` and call-site navigation callbacks before introducing new route architecture.
- Prefer Ant Design `Drawer`/`Modal` patterns already in use.
- Reuse `measureInteraction`, existing Playwright seeding, and current performance evidence format.
- Do not remove current drawer sections or reduce row/list information density.
- Do not change `/my-recipes` routing, service-worker/PWA setup, Redux Persist state keys, GitHub sync, or Gist backup behavior.
- Plans should list every Phase 4 requirement ID: `LIST-04` and `UX-02`.

## RESEARCH COMPLETE
