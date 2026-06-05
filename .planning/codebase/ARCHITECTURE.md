# Architecture

**Analysis Date:** 2026-06-05

## Pattern Overview

**Overall:** Client-side React/Redux single-page application with persisted browser state and GitHub-backed data sync.

**Key Characteristics:**
- Browser-only application: there is no server, database, API route, or backend service directory in this repo.
- Create React App runtime customized with CRACO; application bootstrap starts at `src/index.tsx` and `src/App.tsx`.
- React Router v6 nested routing under the `/my-recipes` basename, with `src/Routing/MasterPage.tsx` as the shared shell.
- Domain features are grouped under `src/Modules/*`, while reusable UI wrappers live under `src/Components/*`.
- Redux Toolkit is the main application state mechanism; `redux-persist` stores state in browser `localStorage`.
- Persisted state is explicitly split into `shared` data and `personal` data in `src/Store/Store.ts`.
- GitHub Raw, GitHub Contents API, and GitHub Gist API calls are made directly from browser hooks.
- A Workbox service worker in `src/service-worker.ts` supports app-shell routing, precaching, and image runtime caching.

## Layers

**Bootstrap and Provider Layer:**
- Purpose: Start React, register the PWA service worker, install global providers, and wait for persisted state rehydration.
- Contains: `src/index.tsx`, `src/App.tsx`, `src/serviceWorkerRegistration.ts`, `src/reportWebVitals.ts`.
- Depends on: React 18, ReactDOM, Ant Design `ConfigProvider`, Redux Provider, `PersistGate`, local message/modal providers.
- Used by: The entire app runtime before any route-specific code renders.

**Application Initialization Layer:**
- Purpose: Run startup checks that are not tied to a route, mainly shared data sync detection.
- Contains: `src/Components/AppInitializer/AppInitializer.tsx`, `src/Components/AppInitializer/SharedSyncModal.tsx`.
- Depends on: `src/Hooks/useSharedDataSync.ts`, `src/Hooks/useSharedPublish.ts`, Redux selectors and reducers.
- Used by: `src/App.tsx`, which wraps `src/Routing/RootRouter.tsx` with `AppInitializer`.

**Routing and Shell Layer:**
- Purpose: Map URLs to feature screens and provide persistent navigation, global overlays, offline state, and modal entry points.
- Contains: `src/Routing/RootRouter.tsx`, `src/Routing/RootRoutes.ts`, `src/Routing/MasterPage.tsx`.
- Depends on: `react-router-dom`, feature route configs under `src/Modules/*/Routing`, shared components, app hooks, selectors.
- Used by: All user-facing screens through the nested `<Outlet />` inside `MasterPage`.

**Feature Module Layer:**
- Purpose: Implement domain workflows as screens and widgets.
- Contains: `src/Modules/Ingredient`, `src/Modules/Dishes`, `src/Modules/ShoppingList`, `src/Modules/ScheduledMeal`, `src/Modules/DishSuggester`, `src/Modules/Home`.
- Depends on: Shared components, hooks, Redux selectors/reducers, models, and helper functions.
- Used by: `src/Routing/RootRouter.tsx`, `src/Routing/MasterPage.tsx`, and cross-feature workflows such as shopping list generation.

**Shared UI Component Layer:**
- Purpose: Normalize Ant Design and app-specific UI primitives across screens.
- Contains: `src/Components/Button`, `src/Components/Form`, `src/Components/SmartForm`, `src/Components/Modal`, `src/Components/Message`, `src/Components/List`, `src/Components/Layout`, and similar component folders.
- Depends on: Ant Design, local CSS, React, and occasional shared hooks.
- Used by: Feature screens, `MasterPage`, modal workflows, and e2e-accessible UI flows.

**State and Domain Model Layer:**
- Purpose: Define the persisted domain state, reducers, and typed read access.
- Contains: `src/Store/Store.ts`, `src/Store/Reducers/*`, `src/Store/Models/*`, `src/Store/Selectors.ts`.
- Depends on: Redux Toolkit, `redux-persist`, `reselect`, domain helper functions.
- Used by: Feature screens, shared sync modals, backup widgets, and calculation helpers.

**Domain Helper Layer:**
- Purpose: Centralize calculations that are reused across reducers and screens.
- Contains: `src/Common/Helpers/DishServingHelper.ts`, `src/Common/Helpers/IngredientUnitHelper.ts`, `src/Common/Helpers/InventoryHelper.ts`, `src/Common/Helpers/CostEstimateHelper.ts`, `src/Common/Helpers/IngredientPriceHelper.ts`, `src/Common/Helpers/DateHelper.ts`, `src/Modules/DishSuggester/Helpers/DishScorer.ts`.
- Depends on: Store model types and small utility libraries such as `dayjs` and `lodash`.
- Used by: Shopping list generation, dish serving scaling, inventory deduction, cost estimation, dashboard suggestions, and the dish suggester.

**Sync, Backup, and Offline Layer:**
- Purpose: Move data between local persisted state and remote GitHub-hosted artifacts.
- Contains: `src/Hooks/useSharedDataSync.ts`, `src/Hooks/useSharedPublish.ts`, `src/Hooks/useGistBackup.ts`, `src/Hooks/useOnlineStatus.ts`, `src/Components/GistBackupWidget.tsx`, `src/service-worker.ts`.
- Depends on: Browser `fetch`, `localStorage`, `navigator.onLine`, service worker APIs, GitHub Raw URLs, GitHub Contents API, GitHub Gist API.
- Used by: `AppInitializer`, `MasterPage`, `GistBackupWidget`, and user/admin backup or sync flows.

**Test Support Layer:**
- Purpose: Seed deterministic browser state and verify high-value flows in Playwright-style e2e tests.
- Contains: `tests/e2e/*.spec.ts`, `tests/e2e/fixtures/appTest.ts`, `tests/e2e/fixtures/seedApp.ts`, `tests/e2e/fixtures/testData.ts`.
- Depends on: `@playwright/test`, seeded Redux persist keys, route interception for GitHub Raw requests.
- Used by: Regression, performance, dashboard, global search, dish serving, and shopping list test suites.

## Data Flow

**App Startup and Route Rendering:**

1. Browser loads `public/index.html` in development or `docs/index.html` from the committed static deployment output.
2. `src/index.tsx` creates the React root, renders `<App />`, registers the service worker, and initializes web-vitals reporting.
3. `src/App.tsx` installs Ant Design theme tokens, `MessageProvider`, `ModalProvider`, Redux `Provider`, and `PersistGate`.
4. `redux-persist` rehydrates `persist:shared` and `persist:personal` from browser `localStorage` via `src/Store/Store.ts`.
5. `AppInitializer` calls `useSharedDataSync`; if the remote manifest changed, `SharedSyncModal` allows selective shared data import.
6. `RootRouter` matches the URL under `/my-recipes`, renders `MasterPage`, then renders the selected feature screen through nested outlets.

**Feature Edit Flow:**

1. A user opens a routed screen such as `src/Modules/Dishes/Screens/DishesList.screen.tsx` or `src/Modules/Ingredient/Screens/IngredientDetail.screen.tsx`.
2. The screen reads data through selectors from `src/Store/Selectors.ts` and presents forms or widgets from `src/Components/*`.
3. On submit or interaction, the screen dispatches reducer actions such as `addDishes`, `editIngredient`, `generateIngredient`, or `setInventory`.
4. Redux Toolkit reducers update in-memory state; `redux-persist` later writes the relevant root back to `localStorage`.
5. Selectors and React rerenders update the current screen, dashboard summaries, search overlays, and dependent feature views.

**Shopping List Generation Flow:**

1. Shopping list screens select dishes, scheduled meals, servings, ingredients, and inventory from the store.
2. `generateIngredient` in `src/Store/Reducers/ShoppingListReducer.ts` receives all required source data in its action payload.
3. The reducer uses `DishServingHelper.collectIngredientAmounts`, `IngredientUnitHelper`, `InventoryHelper`, `dayjs`, `lodash/groupBy`, and `nanoid` to build grouped shopping list ingredients.
4. Generated ingredient groups are written into `personal.shoppingList.shoppingLists` and displayed by `src/Modules/ShoppingList/Screens/ShoppingListDetail.widget.tsx`.
5. Completing a shopping list can produce `ShoppingListCompletionImport` records that feed personal inventory batches.

**Shared Data Publish and Sync Flow:**

1. Admin mode is unlocked through `src/Hooks/useAdminMode.ts` using an encoded `REACT_APP_ADMIN_PIN` value and the `app_admin_unlocked` localStorage flag.
2. `useSharedPublish` reads shared ingredients and dishes through selectors, fetches existing `docs/shared-data.json` and `docs/shared-manifest.json` through the GitHub Contents API, computes diffs, and pushes updated files.
3. Non-admin users and admins both run `useSharedDataSync` at app startup; it fetches `docs/shared-manifest.json` from GitHub Raw at most once per day.
4. `SharedSyncModal` fetches `docs/shared-data.json`, shows changed ingredients/dishes, warns about personal references, and dispatches add/edit/remove reducer actions for selected items.
5. Synced manifest versions are stored under the `shared_synced_versions` localStorage key.

**Personal Backup Flow:**

1. `src/Components/GistBackupWidget.tsx` uses `src/Hooks/useGistBackup.ts` to collect a user-provided Gist ID and token.
2. `pushPersonalData` reads only the `persist:personal` localStorage key and PATCHes it to a Gist file named `my-recipes-personal.json`.
3. `pullPersonalData` reads that Gist file, validates JSON, writes `persist:personal`, and reloads the page.
4. Shared data is intentionally excluded from this backup flow.

**PWA and Offline Flow:**

1. `src/index.tsx` calls `serviceWorkerRegistration.register()`.
2. In production, `src/serviceWorkerRegistration.ts` registers `service-worker.js` under `process.env.PUBLIC_URL`.
3. `src/service-worker.ts` precaches build assets, handles navigation with the app shell, and runtime-caches same-origin `.png` files.
4. `src/Hooks/useOnlineStatus.ts` drives the offline banner in `src/Routing/MasterPage.tsx`; local persisted state remains usable offline.

## Key Abstractions

**Root Store:**
- Purpose: Persist and separate shared cookbook data from per-device personal data.
- Examples: `shared.ingredient`, `shared.dishes`, `personal.inventory`, `personal.shoppingList`, `personal.scheduledMeal`, `personal.cookingSession`, `personal.appContext`.
- Pattern: Redux Toolkit root reducer with nested `persistReducer` calls in `src/Store/Store.ts`.

**Slice Reducer:**
- Purpose: Own mutations and some domain transformations for one state area.
- Examples: `src/Store/Reducers/DishesReducer.ts`, `src/Store/Reducers/ShoppingListReducer.ts`, `src/Store/Reducers/InventoryReducer.ts`.
- Pattern: `createSlice` reducers exported with named action creators.

**Typed Selector:**
- Purpose: Hide the `shared` and `personal` nesting from screens and provide memoized lookup maps.
- Examples: `selectDishes`, `selectIngredients`, `selectDishesById`, `selectShoppingListsById` in `src/Store/Selectors.ts`.
- Pattern: Plain selector functions plus `reselect` `createSelector` for derived maps.

**Route Config Object:**
- Purpose: Provide typed-ish route construction and query-string helpers for each feature.
- Examples: `src/Routing/RootRoutes.ts`, `src/Modules/Dishes/Routing/DishesRouteConfig.ts`, `src/Modules/ShoppingList/Routing/ShoppingListRouteConfig.ts`.
- Pattern: Factory functions wrapping `RouteHelpers.CreateRoutes` and `RouteHelpers.CreateRoute`.

**Screen and Widget:**
- Purpose: Split top-level routed views from reusable or modal subviews.
- Examples: `DishesList.screen.tsx`, `DishesDetail.screen.tsx`, `DishesAdd.widget.tsx`, `DishCostEstimate.widget.tsx`.
- Pattern: File suffix convention under `src/Modules/*/Screens`.

**SmartForm:**
- Purpose: Wrap Ant Design forms with local item-definition conventions.
- Examples: `src/Components/SmartForm/SmartForm.tsx`, `src/Components/SmartForm/SmartFormItem/SmartFormItem.tsx`.
- Pattern: Compound component around Ant Design `Form`.

**Domain Helper:**
- Purpose: Keep calculation logic reusable and testable outside individual components.
- Examples: `DishServingHelper`, `IngredientUnitHelper`, `InventoryHelper`, `CostEstimateHelper`, `DishScorer`.
- Pattern: Exported object of pure or mostly pure helper functions.

## Entry Points

**React Runtime:**
- Location: `src/index.tsx`
- Triggers: Browser loads the bundled app from `public/index.html`, `docs/index.html`, or CRA dev server.
- Responsibilities: Mount React, register service worker, call web-vitals setup.

**Application Composition:**
- Location: `src/App.tsx`
- Triggers: Rendered by `src/index.tsx`.
- Responsibilities: Configure theme, providers, Redux persistence gate, startup initializer, and router.

**Route Tree:**
- Location: `src/Routing/RootRouter.tsx`
- Triggers: Browser URL under `/my-recipes`.
- Responsibilities: Define the nested route graph and attach feature routers/screens.

**Shared Shell:**
- Location: `src/Routing/MasterPage.tsx`
- Triggers: All authorized root routes.
- Responsibilities: Header, drawer navigation, bottom tabs, global search, data sync controls, admin unlock, cooking session controls, offline banner.

**Service Worker:**
- Location: `src/service-worker.ts`
- Triggers: Production service worker registration.
- Responsibilities: App-shell fallback, build asset precaching, same-origin image runtime caching.

**E2E Fixture Entry:**
- Location: `tests/e2e/fixtures/appTest.ts`
- Triggers: Playwright specs importing the extended test fixture.
- Responsibilities: Seed persisted shared/personal data and block GitHub Raw fetches for deterministic tests.

## Error Handling

**Strategy:** Localized UI handling with defensive guards. Network failures are either surfaced through Ant Design messages/modals or ignored when optional; there is no central error boundary or backend error middleware.

**Patterns:**
- Sync startup errors in `useSharedDataSync` are caught and ignored so app startup continues.
- Shared sync modal fetch failures are shown in `SharedSyncModal` and disable the sync action.
- Publish and Gist backup failures are caught in `useSharedPublish.ts` and `useGistBackup.ts`, then displayed with `message.error`.
- Service worker registration errors are logged in `src/serviceWorkerRegistration.ts`.
- Reducers often guard against completed or missing entities, for example shopping list edits do not mutate completed lists in `ShoppingListReducer.ts`.
- No global React error boundary was found in `src/App.tsx` or `src/Routing/*`.

## Cross-Cutting Concerns

**Logging:**
- Runtime logging is minimal: `src/serviceWorkerRegistration.ts` logs service worker lifecycle messages and errors.
- User-visible status and errors use `src/Components/Message/MessageProvider.tsx`, Ant Design `message`, and modal states.

**Validation:**
- UI validation is mostly form-level through Ant Design and local `SmartForm` definitions.
- Domain shape is represented with TypeScript model types in `src/Store/Models/*`.
- No schema validation library such as Zod or Yup was found in `package.json`.

**Authentication and Authorization:**
- Admin mode is a local browser gate implemented in `src/Hooks/useAdminMode.ts`.
- Admin and GitHub tokens come from encoded environment values or user-entered localStorage values.
- There is no server-enforced authorization in this codebase.

**Persistence:**
- `redux-persist` writes `persist:shared` and `persist:personal` to browser `localStorage`.
- Additional localStorage keys track admin mode, sync versions, sync check throttling, Gist settings, and last backup/publish timestamps.

**Performance:**
- Memoized selectors in `src/Store/Selectors.ts` provide stable lookup maps.
- `src/Components/List/VirtualListRowFrame.tsx` and `react-window` support virtualized list rendering.
- `src/Hooks/useScheduledCalculation.ts` moves heavy calculations out of urgent render paths.
- Performance plans and evidence live in `docs/performance-audit-plan.md` and `tests/e2e/performance-regression.spec.ts`.

**Build and Deployment:**
- `package.json` scripts call CRACO for `start` and `build`.
- `craco.config.js` defines aliases used throughout imports: `@components`, `@routing`, `@modules`, `@store`, `@common`, `@hooks`.
- `docs/` contains committed static deployment output plus shared data JSON used by sync.

---

*Architecture analysis: 2026-06-05*
*Update when major patterns change*
