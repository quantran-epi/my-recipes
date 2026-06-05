<!-- GSD:project-start source:PROJECT.md -->

## Project

**My Recipes**

My Recipes is an existing local-first recipe, cooking, inventory, meal-planning, and shopping-list application. It helps a household manage shared cookbook data and personal cooking/shopping state from a browser-based React app that works with local persisted data and optional GitHub-backed sync/backup workflows.

The project direction is richer product capability, better UI, better UX, and better performance. Performance is the most urgent current blocker because large-list interactions can make the app feel less responsive during ordinary daily workflows.

**Core Value:** Users can manage cooking, ingredients, inventory, meal plans, and shopping smoothly in one local-first app without the interface getting in their way.

### Constraints

- **Architecture:** Keep the first milestone within the browser-only static SPA architecture - the app currently has no backend layer to receive moved work.
- **Persistence:** Preserve the local-first shared/personal persistence split - users rely on local data being available online and offline.
- **Sync:** Preserve GitHub shared-data and Gist backup workflows while investigating their performance cost - they are existing user-facing capabilities.
- **UX:** Performance fixes must not remove rich list row information, modal workflows, or daily cooking/shopping affordances without an explicit product decision.
- **Compatibility:** Maintain the `/my-recipes` routed static deployment and service-worker/PWA behavior unless a phase explicitly changes them.
- **Verification:** Responsiveness work needs measurable regression checks because subjective speed improvements are easy to lose.
- **Security:** Do not expose or document secret values from `.env`; only reference key names when needed.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 4.9.5 - React application, hooks, Redux store, route modules, custom components, service worker source, and tests under `src/` and `tests/` (`package.json`, `tsconfig.json`, `src/App.tsx`, `src/service-worker.ts`, `tests/e2e/dashboard.spec.ts`).
- TSX / React JSX - UI screens and component wrappers throughout `src/Components/` and `src/Modules/` (`tsconfig.json`, `src/Routing/MasterPage.tsx`).
- JavaScript - CRACO build configuration (`craco.config.js`).
- CSS / HTML - Global app styles and CRA HTML shell (`src/index.css`, `src/App.css`, `public/index.html`).
- JSON - PWA metadata, generated static manifests, and shared data snapshots (`public/manifest.json`, `docs/asset-manifest.json`, `docs/shared-data.json`, `docs/shared-manifest.json`).

## Runtime

- Browser SPA runtime - React renders into `public/index.html` via `src/index.tsx`; the app uses DOM APIs, `fetch`, `localStorage`, `navigator.onLine`, service workers, and Cache Storage (`src/Hooks/useSharedDataSync.ts`, `src/Hooks/useGistBackup.ts`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`).
- Node.js - Required for local development, build, and test commands through CRACO/react-scripts (`package.json`). No `.nvmrc`, `.node-version`, or `engines` field was detected in repo files.
- Service worker runtime - CRA/Workbox service worker is registered in production and precaches app assets (`src/index.tsx`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`).
- Yarn is the committed package manager evidence via `yarn.lock`.
- `package.json` scripts are npm-compatible: `start`, `build`, `test`, and `eject`.
- Lockfile: `yarn.lock` present; `package-lock.json` and `pnpm-lock.yaml` not detected at repo root.

## Frameworks

- React 18.2 - SPA UI framework (`package.json`, `src/index.tsx`, `src/App.tsx`).
- Create React App / react-scripts 5.0.1 - Webpack/Babel/Jest app toolchain (`package.json`, `src/react-app-env.d.ts`).
- CRACO 7.1 with `craco-less` 3.0.1 - Overrides CRA config for aliases, ModuleScopePlugin removal, and Ant Design Less variables (`package.json`, `craco.config.js`).
- React Router DOM 6.22.3 - Client-side routing (`package.json`, `src/Routing/RootRouter.tsx`, `src/Routing/RootRoutes.ts`).
- Redux Toolkit 2.2.3 with React Redux 9.1 - Global state and reducers (`package.json`, `src/Store/Store.ts`, `src/Store/Reducers/`).
- Redux Persist 6.0 - Browser localStorage persistence for shared and personal slices (`package.json`, `src/Store/Store.ts`).
- Ant Design 5.16.1 - Primary UI component system and theme provider (`package.json`, `src/App.tsx`, `src/Components/`).
- Jest + React Testing Library - CRA unit test setup (`package.json`, `src/setupTests.ts`, `src/App.test.tsx`).
- Playwright-style E2E tests - Specs and fixtures exist under `tests/e2e/`, importing `@playwright/test` (`tests/e2e/fixtures/appTest.ts`, `tests/e2e/performance-regression.spec.ts`). `@playwright/test`, a Playwright config, and `test:e2e` package scripts are not declared in `package.json`; `docs/automated-regression-test-plan.md` documents commands that are not present in the current package scripts.
- Web Vitals 2.1.4 - Optional browser performance reporting hook; currently no handler is passed (`package.json`, `src/reportWebVitals.ts`, `src/index.tsx`).
- `@craco/craco` starts and builds the CRA app (`package.json`).
- TypeScript compiler options target ES5, include DOM and ESNext libs, use `react-jsx`, allow JS, disable strict mode, and enable path aliases (`tsconfig.json`).
- Webpack aliases are mirrored in CRACO for `@components`, `@routing`, `@modules`, `@store`, `@common`, and `@hooks` (`craco.config.js`).
- Workbox 6.6 packages support generated precaching and runtime image caching (`package.json`, `src/service-worker.ts`).

## Key Dependencies

- `antd` ^5.16.1 - UI controls, layout primitives, messages, modals, forms, tables, calendars, and theme tokens (`src/App.tsx`, `src/Components/`, `src/Modules/`).
- `@reduxjs/toolkit` ^2.2.3 and `react-redux` ^9.1.0 - Application state mutations and selectors (`src/Store/Store.ts`, `src/Store/Reducers/`, `src/Store/Selectors.ts`).
- `redux-persist` ^6.0.0 - Persists `shared` and `personal` state slices to browser localStorage (`src/Store/Store.ts`).
- `react-router-dom` ^6.22.3 - SPA routing and navigation (`src/Routing/RootRouter.tsx`, `src/Routing/MasterPage.tsx`).
- `react-window` ^2.2.7 - Virtualized list rendering for larger lists (`src/Modules/Ingredient/Screens/IngredientList.screen.tsx`, `src/Modules/Dishes/Screens/DishesList.screen.tsx`, `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx`).
- `lodash` ^4.17.21 and `reselect` ^5.1.0 - Collection utilities and memoized selectors (`src/Store/Selectors.ts`, `src/Modules/*`).
- `moment` ^2.30.1 and `dayjs` ^1.11.10 - Date formatting, relative time, calendar logic, and date picker values (`src/Common/Helpers/DateHelper.ts`, `src/Common/Helpers/InventoryHelper.ts`, `src/Modules/*`).
- `nanoid` 4.0.1 - ID generation in reducers and add/edit flows (`src/Store/Reducers/CookingSessionReducer.ts`, `src/Store/Reducers/ShoppingListReducer.ts`, `src/Modules/Dishes/Screens/DishesManageIngredient/DishAddStep.widget.tsx`).
- Workbox packages - Service worker precaching, app-shell routing, and runtime image caching (`package.json`, `src/service-worker.ts`).
- Browser built-ins - `fetch`, `localStorage`, `navigator.serviceWorker`, `navigator.onLine`, `atob`/`btoa`, and Cache Storage are used directly (`src/Hooks/useSharedPublish.ts`, `src/Hooks/useGistBackup.ts`, `src/serviceWorkerRegistration.ts`, `tests/e2e/fixtures/seedApp.ts`).
- `react-copy-to-clipboard` ^5.1.0 - Copy/export helper for persisted personal data (`package.json`, `src/Routing/MasterPage.tsx`).
- `@ant-design/icons` is imported across many source files but is not listed as a direct dependency in `package.json` (`src/Routing/MasterPage.tsx`, `src/Components/GistBackupWidget.tsx`).
- `uuid` is imported in `src/Modules/Ingredient/Screens/IngredientInventory.widget.tsx` but is not listed as a direct dependency in `package.json`.
- `redux-thunk` is listed in `package.json` but no direct source import was detected in the scanned files; Redux Toolkit default middleware is used instead (`src/Store/Store.ts`).

## Configuration

- CRA-style environment variables are read from `process.env` in source (`src/Hooks/useSharedPublish.ts`, `src/Hooks/useAdminMode.ts`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`, `src/Store/Store.ts`).
- Source-detected env keys: `REACT_APP_GH_TOKEN`, `REACT_APP_ADMIN_PIN`, `PUBLIC_URL`, `NODE_ENV`, and test key `PERF_BASELINE`.
- `.env` key listing detected: `PORT`, `PUBLIC_URL`, `REACT_APP_GITHUB_TOKEN`. Values were not read. The source expects `REACT_APP_GH_TOKEN`, so the listed `REACT_APP_GITHUB_TOKEN` key may not satisfy the publish hook as written.
- `package.json` - Dependencies, scripts, CRA ESLint config, and browserslist.
- `craco.config.js` - CRA override, aliases, Less loader options, and Ant Design theme variables.
- `tsconfig.json` - Compiler settings and TypeScript path aliases.
- `public/index.html` and `public/manifest.json` - CRA shell, Google Fonts link, and PWA metadata.
- `docs/` - Checked-in static production build output and shared data artifacts (`docs/index.html`, `docs/service-worker.js`, `docs/asset-manifest.json`, `docs/shared-data.json`, `docs/shared-manifest.json`).

## Platform Requirements

- Any OS with Node.js and Yarn/npm capable of running CRA/react-scripts.
- Browser required for application runtime; app state is device-local unless GitHub sync/backup is configured.
- No Docker, database server, backend service, or local emulator config was detected.
- E2E tests require Playwright tooling if they are to be run, but Playwright is not declared in `package.json`.
- Static SPA deployment; `docs/` contains built assets and service worker output.
- PWA-capable browser environment for service worker registration, offline precache, runtime PNG cache, and localStorage persistence (`src/index.tsx`, `src/service-worker.ts`, `public/manifest.json`).
- External GitHub network access is required for shared-data sync, admin publishing, and Gist backup/restore (`src/Hooks/useSharedDataSync.ts`, `src/Hooks/useSharedPublish.ts`, `src/Hooks/useGistBackup.ts`).
- Google Fonts network access is used for the Kanit font unless cached by the browser/service worker (`public/index.html`).

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- React screen files use `*.screen.tsx` under feature modules, for example `src/Modules/Dishes/Screens/DishesList.screen.tsx`, `src/Modules/Ingredient/Screens/IngredientList.screen.tsx`, and `src/Modules/Home/Screens/Dashboard.screen.tsx`.
- Reusable feature UI uses `*.widget.tsx`, for example `src/Modules/ShoppingList/Screens/ShoppingListDetail.widget.tsx`, `src/Modules/Dishes/Screens/CookingSession.widget.tsx`, and `src/Modules/ScheduledMeal/Screens/ScheduledMealEstimateSummary.widget.tsx`.
- Shared component wrappers are PascalCase directories with PascalCase implementation files plus barrel exports, for example `src/Components/Button/Button.tsx` and `src/Components/Button/index.ts`.
- Store models and reducers use PascalCase model files and reducer files, for example `src/Store/Models/Dishes.ts` and `src/Store/Reducers/DishesReducer.ts`.
- E2E specs live in `tests/e2e/*.spec.ts`; fixtures live in `tests/e2e/fixtures/*.ts`.
- Component functions are usually exported named `const` values, often typed as `React.FunctionComponent` or `FunctionComponent`, for example `DishesListScreen` in `src/Modules/Dishes/Screens/DishesList.screen.tsx` and `ModalProvider` in `src/Components/Modal/ModalProvider.tsx`.
- Internal event handlers and derived callbacks often use a leading underscore, for example `_onSearchChange`, `_onListScroll`, and `_scrollToTop` in list screens.
- Helper modules sometimes expose an object namespace with method properties, for example `IngredientUnitHelper` in `src/Common/Helpers/IngredientUnitHelper.ts`.
- Redux action creators are exported with domain verbs, for example `addDishes`, `editDishes`, `removeDishes`, and `duplicateDish` from `src/Store/Reducers/DishesReducer.ts`.
- Local variables and state values use `camelCase`; constants use `UPPER_SNAKE_CASE`, for example `DISH_STATUS_FILTERS`, `EMPTY_DISH_SUMMARY`, and `DISH_ROW_HEIGHT` in `src/Modules/Dishes/Screens/DishesList.screen.tsx`.
- CSS-in-JS style objects use descriptive `camelCase` names, for example `filterRowStyle` and `filterChipStyle` in `src/Modules/Dishes/Screens/DishesList.screen.tsx`.
- Route and model namespaces use PascalCase object names, for example `RootRoutes` in `src/Routing/RootRoutes.ts` and `DISH_TAGS` in `src/Store/Models/Dishes.ts`.
- Type aliases are PascalCase and common for domain payloads, for example `DishesIngredientAddParams`, `DishDuration`, and `Dishes`.
- Interfaces are also PascalCase; both prefixed and unprefixed styles exist, for example `DishesState` in `src/Store/Reducers/DishesReducer.ts` and `IButtonProps` in `src/Components/Button/Button.tsx`.
- Literal union types are preferred over enums in sampled code, for example `DishStatusFilter` in `src/Modules/Dishes/Screens/DishesList.screen.tsx`.

## Code Style

- No standalone Prettier config was found. Formatting is repository-local and mixed.
- Source uses semicolons in many newer files, but some older reducer and route files omit semicolons, for example `src/Store/Reducers/AppContextReducer.ts` and `src/Routing/RootRouter.tsx`.
- Quotes are mixed. Newer tests and some app entry files use single quotes, while many source modules use double quotes.
- Indentation is mixed between two spaces and four spaces. Match the surrounding file when editing.
- JSX styles are often inline `React.CSSProperties` objects instead of separate CSS files. Global CSS is limited to `src/App.css` and `src/index.css`.
- ESLint is configured through `package.json` with `react-app` and `react-app/jest`.
- There is no dedicated lint script in `package.json`; `npm run build` is the practical static check through CRACO and CRA.
- `tsconfig.json` has `strict: false`, `allowJs: true`, `skipLibCheck: true`, and `isolatedModules: true`; do not assume strict-null or no-implicit-any coverage.
- CRACO enables type checking and configures Less theme variables in `craco.config.js`.

## Import Organization

- Import grouping is loose and not always alphabetized. Preserve local grouping in existing files.
- Type-only imports are used where needed, for example `import type { PayloadAction }` in `src/Store/Reducers/DishesReducer.ts` and `import type { Page }` in `tests/e2e/fixtures/seedApp.ts`.
- Some files import `React` as a namespace for `React.FunctionComponent`, `React.CSSProperties`, and hooks; newer React JSX runtime is enabled in `tsconfig.json` but namespace imports remain common.
- `tsconfig.json` and `craco.config.js` define aliases for `@components`, `@modules`, `@routing`, `@store`, `@common`, and `@hooks`.
- Prefer aliases for cross-area imports. Use relative imports inside the same feature folder.

## Error Handling

- UI-facing validation often returns a message string or `null`, for example `IngredientUnitHelper.validateRules` in `src/Common/Helpers/IngredientUnitHelper.ts`.
- Network hooks throw for failed GitHub/Gist operations when the caller needs feedback, for example `src/Hooks/useGistBackup.ts` and `src/Hooks/useSharedPublish.ts`.
- Background sync paths catch and ignore expected network failures, for example `src/Hooks/useSharedDataSync.ts`.
- Route-level import/export flows catch errors and show messages in `src/Routing/MasterPage.tsx`.
- No custom `Error` subclasses were found.
- Expected user errors are usually surfaced through Ant Design/message wrappers rather than thrown.
- Test code may throw plain `Error` for impossible measurement states, for example `tests/e2e/performance-regression.spec.ts`.

## Logging

- No application logger abstraction was found.
- `console.log` and `console.error` are used mainly in `src/serviceWorkerRegistration.ts`.
- Feature code generally avoids routine logging.
- User-visible failure reporting is usually done through message/modal providers, for example `src/Components/Modal/ModalProvider.tsx` and `src/Routing/MasterPage.tsx`.

## Comments

- Comments are sparse and usually explain subsystem boundaries or non-obvious behavior, for example the shared/personal reducer split in `src/Store/Store.ts` and the sync behavior in `src/Hooks/useSharedDataSync.ts`.
- Avoid adding comments that restate JSX or reducer assignments.
- JSDoc is not a required pattern. A few module-level comments exist, for example `src/Hooks/useSharedDataSync.ts` and `src/Hooks/useGistBackup.ts`.
- No consistent TODO ownership format was observed.

## Function Design

- Screens and large widgets can be very large, for example `src/Modules/ShoppingList/Screens/ShoppingListDetail.widget.tsx`. New logic is usually safer as small local helpers near the screen or in `src/Common/Helpers` when reusable.
- Heavy derived calculations are commonly wrapped in `useMemo` or `useCallback`; recent performance work uses `src/Hooks/useScheduledCalculation.ts` for deferred expensive calculations.
- Props and payloads use object types when the shape is non-trivial, for example `DishRowProps`, `PromptFuncProps`, and Redux payload aliases.
- Utility helpers use simple positional parameters for small calculations, for example `IngredientUnitHelper.toBaseAmount`.
- Helpers commonly return `null` for unsupported conversions and string messages for validation failures.
- Components return JSX directly; guard clauses return `null` when rows or modal content are absent.

## Module Design

- React screens, widgets, helpers, selectors, and actions are primarily named exports.
- Reducers and some route config objects use default exports, for example `src/Store/Reducers/DishesReducer.ts` and `src/Modules/Dishes/Routing/DishesRouteConfig.ts`.
- Component directories use barrel `index.ts` files for public wrapper imports.
- Redux Toolkit slices live under `src/Store/Reducers`; model shapes live under `src/Store/Models`.
- `src/Store/Store.ts` splits persisted state into `shared` and `personal` reducers. Use `src/Store/Selectors.ts` instead of direct `state.shared.*` or `state.personal.*` access in new feature code.
- Redux Persist serialization is part of app behavior and test setup; changes to slice keys affect `tests/e2e/fixtures/seedApp.ts`.
- Shared wrappers around Ant Design components live under `src/Components` and should be preferred over raw Ant Design imports when a wrapper exists.
- Virtualized list work uses `react-window` plus shared list wrappers, for example `src/Components/List/VirtualListRowFrame.tsx` and `src/Components/List/VirtualListScrollTopButton.tsx`.
- Stable `data-testid` attributes are used for structural E2E hooks in important flows, for example `src/Modules/ShoppingList/Screens/ShoppingListDetail.widget.tsx` and `src/Modules/Home/Screens/Dashboard.screen.tsx`.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## Pattern Overview

- Browser-only application: there is no server, database, API route, or backend service directory in this repo.
- Create React App runtime customized with CRACO; application bootstrap starts at `src/index.tsx` and `src/App.tsx`.
- React Router v6 nested routing under the `/my-recipes` basename, with `src/Routing/MasterPage.tsx` as the shared shell.
- Domain features are grouped under `src/Modules/*`, while reusable UI wrappers live under `src/Components/*`.
- Redux Toolkit is the main application state mechanism; `redux-persist` stores state in browser `localStorage`.
- Persisted state is explicitly split into `shared` data and `personal` data in `src/Store/Store.ts`.
- GitHub Raw, GitHub Contents API, and GitHub Gist API calls are made directly from browser hooks.
- A Workbox service worker in `src/service-worker.ts` supports app-shell routing, precaching, and image runtime caching.

## Layers

- Purpose: Start React, register the PWA service worker, install global providers, and wait for persisted state rehydration.
- Contains: `src/index.tsx`, `src/App.tsx`, `src/serviceWorkerRegistration.ts`, `src/reportWebVitals.ts`.
- Depends on: React 18, ReactDOM, Ant Design `ConfigProvider`, Redux Provider, `PersistGate`, local message/modal providers.
- Used by: The entire app runtime before any route-specific code renders.
- Purpose: Run startup checks that are not tied to a route, mainly shared data sync detection.
- Contains: `src/Components/AppInitializer/AppInitializer.tsx`, `src/Components/AppInitializer/SharedSyncModal.tsx`.
- Depends on: `src/Hooks/useSharedDataSync.ts`, `src/Hooks/useSharedPublish.ts`, Redux selectors and reducers.
- Used by: `src/App.tsx`, which wraps `src/Routing/RootRouter.tsx` with `AppInitializer`.
- Purpose: Map URLs to feature screens and provide persistent navigation, global overlays, offline state, and modal entry points.
- Contains: `src/Routing/RootRouter.tsx`, `src/Routing/RootRoutes.ts`, `src/Routing/MasterPage.tsx`.
- Depends on: `react-router-dom`, feature route configs under `src/Modules/*/Routing`, shared components, app hooks, selectors.
- Used by: All user-facing screens through the nested `<Outlet />` inside `MasterPage`.
- Purpose: Implement domain workflows as screens and widgets.
- Contains: `src/Modules/Ingredient`, `src/Modules/Dishes`, `src/Modules/ShoppingList`, `src/Modules/ScheduledMeal`, `src/Modules/DishSuggester`, `src/Modules/Home`.
- Depends on: Shared components, hooks, Redux selectors/reducers, models, and helper functions.
- Used by: `src/Routing/RootRouter.tsx`, `src/Routing/MasterPage.tsx`, and cross-feature workflows such as shopping list generation.
- Purpose: Normalize Ant Design and app-specific UI primitives across screens.
- Contains: `src/Components/Button`, `src/Components/Form`, `src/Components/SmartForm`, `src/Components/Modal`, `src/Components/Message`, `src/Components/List`, `src/Components/Layout`, and similar component folders.
- Depends on: Ant Design, local CSS, React, and occasional shared hooks.
- Used by: Feature screens, `MasterPage`, modal workflows, and e2e-accessible UI flows.
- Purpose: Define the persisted domain state, reducers, and typed read access.
- Contains: `src/Store/Store.ts`, `src/Store/Reducers/*`, `src/Store/Models/*`, `src/Store/Selectors.ts`.
- Depends on: Redux Toolkit, `redux-persist`, `reselect`, domain helper functions.
- Used by: Feature screens, shared sync modals, backup widgets, and calculation helpers.
- Purpose: Centralize calculations that are reused across reducers and screens.
- Contains: `src/Common/Helpers/DishServingHelper.ts`, `src/Common/Helpers/IngredientUnitHelper.ts`, `src/Common/Helpers/InventoryHelper.ts`, `src/Common/Helpers/CostEstimateHelper.ts`, `src/Common/Helpers/IngredientPriceHelper.ts`, `src/Common/Helpers/DateHelper.ts`, `src/Modules/DishSuggester/Helpers/DishScorer.ts`.
- Depends on: Store model types and small utility libraries such as `dayjs` and `lodash`.
- Used by: Shopping list generation, dish serving scaling, inventory deduction, cost estimation, dashboard suggestions, and the dish suggester.
- Purpose: Move data between local persisted state and remote GitHub-hosted artifacts.
- Contains: `src/Hooks/useSharedDataSync.ts`, `src/Hooks/useSharedPublish.ts`, `src/Hooks/useGistBackup.ts`, `src/Hooks/useOnlineStatus.ts`, `src/Components/GistBackupWidget.tsx`, `src/service-worker.ts`.
- Depends on: Browser `fetch`, `localStorage`, `navigator.onLine`, service worker APIs, GitHub Raw URLs, GitHub Contents API, GitHub Gist API.
- Used by: `AppInitializer`, `MasterPage`, `GistBackupWidget`, and user/admin backup or sync flows.
- Purpose: Seed deterministic browser state and verify high-value flows in Playwright-style e2e tests.
- Contains: `tests/e2e/*.spec.ts`, `tests/e2e/fixtures/appTest.ts`, `tests/e2e/fixtures/seedApp.ts`, `tests/e2e/fixtures/testData.ts`.
- Depends on: `@playwright/test`, seeded Redux persist keys, route interception for GitHub Raw requests.
- Used by: Regression, performance, dashboard, global search, dish serving, and shopping list test suites.

## Data Flow

## Key Abstractions

- Purpose: Persist and separate shared cookbook data from per-device personal data.
- Examples: `shared.ingredient`, `shared.dishes`, `personal.inventory`, `personal.shoppingList`, `personal.scheduledMeal`, `personal.cookingSession`, `personal.appContext`.
- Pattern: Redux Toolkit root reducer with nested `persistReducer` calls in `src/Store/Store.ts`.
- Purpose: Own mutations and some domain transformations for one state area.
- Examples: `src/Store/Reducers/DishesReducer.ts`, `src/Store/Reducers/ShoppingListReducer.ts`, `src/Store/Reducers/InventoryReducer.ts`.
- Pattern: `createSlice` reducers exported with named action creators.
- Purpose: Hide the `shared` and `personal` nesting from screens and provide memoized lookup maps.
- Examples: `selectDishes`, `selectIngredients`, `selectDishesById`, `selectShoppingListsById` in `src/Store/Selectors.ts`.
- Pattern: Plain selector functions plus `reselect` `createSelector` for derived maps.
- Purpose: Provide typed-ish route construction and query-string helpers for each feature.
- Examples: `src/Routing/RootRoutes.ts`, `src/Modules/Dishes/Routing/DishesRouteConfig.ts`, `src/Modules/ShoppingList/Routing/ShoppingListRouteConfig.ts`.
- Pattern: Factory functions wrapping `RouteHelpers.CreateRoutes` and `RouteHelpers.CreateRoute`.
- Purpose: Split top-level routed views from reusable or modal subviews.
- Examples: `DishesList.screen.tsx`, `DishesDetail.screen.tsx`, `DishesAdd.widget.tsx`, `DishCostEstimate.widget.tsx`.
- Pattern: File suffix convention under `src/Modules/*/Screens`.
- Purpose: Wrap Ant Design forms with local item-definition conventions.
- Examples: `src/Components/SmartForm/SmartForm.tsx`, `src/Components/SmartForm/SmartFormItem/SmartFormItem.tsx`.
- Pattern: Compound component around Ant Design `Form`.
- Purpose: Keep calculation logic reusable and testable outside individual components.
- Examples: `DishServingHelper`, `IngredientUnitHelper`, `InventoryHelper`, `CostEstimateHelper`, `DishScorer`.
- Pattern: Exported object of pure or mostly pure helper functions.

## Entry Points

- Location: `src/index.tsx`
- Triggers: Browser loads the bundled app from `public/index.html`, `docs/index.html`, or CRA dev server.
- Responsibilities: Mount React, register service worker, call web-vitals setup.
- Location: `src/App.tsx`
- Triggers: Rendered by `src/index.tsx`.
- Responsibilities: Configure theme, providers, Redux persistence gate, startup initializer, and router.
- Location: `src/Routing/RootRouter.tsx`
- Triggers: Browser URL under `/my-recipes`.
- Responsibilities: Define the nested route graph and attach feature routers/screens.
- Location: `src/Routing/MasterPage.tsx`
- Triggers: All authorized root routes.
- Responsibilities: Header, drawer navigation, bottom tabs, global search, data sync controls, admin unlock, cooking session controls, offline banner.
- Location: `src/service-worker.ts`
- Triggers: Production service worker registration.
- Responsibilities: App-shell fallback, build asset precaching, same-origin image runtime caching.
- Location: `tests/e2e/fixtures/appTest.ts`
- Triggers: Playwright specs importing the extended test fixture.
- Responsibilities: Seed persisted shared/personal data and block GitHub Raw fetches for deterministic tests.

## Error Handling

- Sync startup errors in `useSharedDataSync` are caught and ignored so app startup continues.
- Shared sync modal fetch failures are shown in `SharedSyncModal` and disable the sync action.
- Publish and Gist backup failures are caught in `useSharedPublish.ts` and `useGistBackup.ts`, then displayed with `message.error`.
- Service worker registration errors are logged in `src/serviceWorkerRegistration.ts`.
- Reducers often guard against completed or missing entities, for example shopping list edits do not mutate completed lists in `ShoppingListReducer.ts`.
- No global React error boundary was found in `src/App.tsx` or `src/Routing/*`.

## Cross-Cutting Concerns

- Runtime logging is minimal: `src/serviceWorkerRegistration.ts` logs service worker lifecycle messages and errors.
- User-visible status and errors use `src/Components/Message/MessageProvider.tsx`, Ant Design `message`, and modal states.
- UI validation is mostly form-level through Ant Design and local `SmartForm` definitions.
- Domain shape is represented with TypeScript model types in `src/Store/Models/*`.
- No schema validation library such as Zod or Yup was found in `package.json`.
- Admin mode is a local browser gate implemented in `src/Hooks/useAdminMode.ts`.
- Admin and GitHub tokens come from encoded environment values or user-entered localStorage values.
- There is no server-enforced authorization in this codebase.
- `redux-persist` writes `persist:shared` and `persist:personal` to browser `localStorage`.
- Additional localStorage keys track admin mode, sync versions, sync check throttling, Gist settings, and last backup/publish timestamps.
- Memoized selectors in `src/Store/Selectors.ts` provide stable lookup maps.
- `src/Components/List/VirtualListRowFrame.tsx` and `react-window` support virtualized list rendering.
- `src/Hooks/useScheduledCalculation.ts` moves heavy calculations out of urgent render paths.
- Performance plans and evidence live in `docs/performance-audit-plan.md` and `tests/e2e/performance-regression.spec.ts`.
- `package.json` scripts call CRACO for `start` and `build`.
- `craco.config.js` defines aliases used throughout imports: `@components`, `@routing`, `@modules`, `@store`, `@common`, `@hooks`.
- `docs/` contains committed static deployment output plus shared data JSON used by sync.

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
