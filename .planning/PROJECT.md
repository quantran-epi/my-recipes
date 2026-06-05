# My Recipes

## What This Is

My Recipes is an existing local-first recipe, cooking, inventory, meal-planning, and shopping-list application. It helps a household manage shared cookbook data and personal cooking/shopping state from a browser-based React app that works with local persisted data and optional GitHub-backed sync/backup workflows.

The project direction is richer product capability, better UI, better UX, and better performance. Performance is the most urgent current blocker because large-list interactions can make the app feel less responsive during ordinary daily workflows.

## Core Value

Users can manage cooking, ingredients, inventory, meal plans, and shopping smoothly in one local-first app without the interface getting in their way.

## Current Milestone: v1.0 Responsiveness Foundation

**Goal:** Make large-list and online/offline interactions feel responsive enough to support future rich feature, UI, and UX work.

**Target features:**
- Measure and explain large-list interaction latency on ingredients, dishes, and shopping-list screens.
- Reduce visible delay when users open modals, drawers, detail views, row menus, and row actions from large virtualized lists.
- Identify why the app feels faster without internet and separate shared sync, image loading, service worker, and network effects from pure render cost.
- Preserve current local-first behavior while improving online startup and interaction responsiveness.
- Add reproducible performance regression checks for large-list responsiveness.

## Requirements

### Validated

- Existing shared cookbook data can be managed through ingredient and dish workflows.
- Existing personal state can track inventory, shopping lists, scheduled meals, cooking sessions, and app context.
- Existing shopping-list generation derives ingredient groups from dishes, scheduled meals, servings, ingredients, and inventory.
- Existing app shell provides routing, header, drawer navigation, bottom tabs, global search, admin controls, offline banner, and modal entry points.
- Existing local-first persistence stores shared and personal Redux state in browser localStorage through Redux Persist.
- Existing GitHub raw/shared-data sync can detect remote shared data changes and selectively import ingredients or dishes.
- Existing admin publish flow can push shared data and manifest files to GitHub from the browser.
- Existing personal backup flow can push and pull personal persisted data through GitHub Gist.
- Existing PWA/service-worker path supports app-shell caching and local offline use.
- Existing large list screens for ingredients, dishes, and shopping lists use `react-window` virtualization with fixed row heights.
- Existing Playwright-style performance regression specs cover some virtualized-list spacing, lazy modal mounting, route budgets, image budgets, and modal timing, though the e2e runner is not fully wired into package scripts.

### Active

- [ ] User can interact with large ingredient, dish, and shopping-list screens without obvious UI freezes before modals, drawers, detail views, or row menus appear.
- [ ] User can use the app online without startup sync checks, shared-data fetches, image loading, or service-worker behavior making common list interactions feel slower than offline mode.
- [ ] User can keep current local-first and offline behavior while online-specific performance work is made safer and more observable.
- [ ] Maintainers can reproduce large-list interaction regressions with automated or scripted performance checks.
- [ ] Maintainers can continue improving rich features, UI, and UX on top of a measured responsiveness baseline.

### Out of Scope

- Backend or server migration for the first milestone - responsiveness should improve inside the current static SPA/local-first architecture before larger infrastructure changes are considered.
- Full framework replacement for the first milestone - CRA/CRACO migration may become useful later, but the immediate problem is interaction latency in the existing app.
- Major visual redesign before responsiveness work - UI polish remains part of the broader product direction, but first the existing interaction model needs to stop blocking users.
- Replacing Redux Persist/localStorage during the first milestone - persistence limitations are real, but a storage migration would expand the blast radius beyond the current performance goal.
- Removing GitHub sync or backup workflows - online behavior should be understood and improved, not deleted as a workaround.

## Context

- Brownfield codebase map exists in `.planning/codebase/` and should be treated as the baseline architecture reference for planning.
- The app is a browser-only React 18 SPA using Create React App, CRACO, TypeScript, Redux Toolkit, Redux Persist, React Router, Ant Design, Workbox, and `react-window`.
- The app is deployed as a static SPA under `/my-recipes`, with checked-in static output under `docs/`.
- There is no backend service, database, API route layer, or server-enforced authorization in this repository.
- Shared cookbook data and personal data are split in `src/Store/Store.ts`; both are persisted locally in browser storage.
- Online workflows call GitHub Raw, GitHub Contents API, and GitHub Gist API directly from browser hooks.
- The main large-list screens are `src/Modules/Ingredient/Screens/IngredientList.screen.tsx`, `src/Modules/Dishes/Screens/DishesList.screen.tsx`, and `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx`.
- Those main screens use virtualization, not page-level pagination. The pagination found during mapping is in `src/Modules/ShoppingList/Screens/ShoppingListCalendar.widget.tsx`.
- The user reports that opening drawers, modals, and related components from large-list screens can hang briefly before appearing.
- The user also reports that the app feels faster when there is no internet connection; source evidence shows `useSharedDataSync` skips startup checks offline, while online mode can fetch GitHub shared manifests/data and dish rows can load images.
- `DeferredModalContent` intentionally waits two animation frames before mounting modal content, which can help modal shells paint but does not remove synchronous render cost from large row/detail components.
- Current unit tests are not usable as-is because CRA Jest fails resolving `@store/Store`; production build succeeds with warnings.
- Existing e2e/performance specs are present but Playwright dependency/config/scripts are not fully declared in `package.json`.

## Constraints

- **Architecture:** Keep the first milestone within the browser-only static SPA architecture - the app currently has no backend layer to receive moved work.
- **Persistence:** Preserve the local-first shared/personal persistence split - users rely on local data being available online and offline.
- **Sync:** Preserve GitHub shared-data and Gist backup workflows while investigating their performance cost - they are existing user-facing capabilities.
- **UX:** Performance fixes must not remove rich list row information, modal workflows, or daily cooking/shopping affordances without an explicit product decision.
- **Compatibility:** Maintain the `/my-recipes` routed static deployment and service-worker/PWA behavior unless a phase explicitly changes them.
- **Verification:** Responsiveness work needs measurable regression checks because subjective speed improvements are easy to lose.
- **Security:** Do not expose or document secret values from `.env`; only reference key names when needed.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat this as the full My Recipes product, not a performance-only project | The long-term direction includes rich features, UI, UX, and performance; performance is just the urgent blocker. | Pending |
| Make v1.0 focus on large-list and online/offline responsiveness first | Slow interactions block future rich feature and UI/UX work from feeling good. | Pending |
| Keep local-first behavior during performance work | Offline usability and browser-local data are core to the existing product. | Pending |
| Use existing codebase map as brownfield baseline | `.planning/codebase/` already captures stack, architecture, structure, conventions, testing, integrations, and concerns. | Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-05 after initialization*
