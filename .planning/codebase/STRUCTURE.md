# Codebase Structure

**Analysis Date:** 2026-06-05

## Directory Layout

```
my-recipes/
├── .planning/                 # GSD planning and generated codebase maps
│   └── codebase/              # Architecture and structure documentation
├── assets/                    # Source image assets referenced by app code
│   └── icons/                 # PNG icons imported by feature screens and navigation
├── build/                     # Generated CRA production build output, ignored by git
├── docs/                      # Committed static deployment output, docs, shared data, backups
│   ├── backups/               # Versioned backups of shared data and manifest JSON
│   └── static/                # Built CSS, JS, and media assets for deployment
├── public/                    # CRA public shell and web app manifest inputs
├── src/                       # TypeScript React source code
│   ├── Common/                # Shared constants, helpers, and utility types
│   ├── Components/            # Shared UI component wrappers and app widgets
│   ├── Hooks/                 # Reusable React hooks and hook barrel export
│   ├── Modules/               # Feature modules grouped by domain
│   ├── Routing/               # Root router, route builders, and app shell
│   └── Store/                 # Redux store, reducers, selectors, and domain models
├── tests/                     # End-to-end and performance regression tests
│   └── e2e/                   # Playwright specs and fixtures
├── craco.config.js            # CRA override for aliases and Less theme variables
├── package.json               # Dependencies and npm/yarn scripts
├── tsconfig.json              # TypeScript compiler options and path aliases
└── yarn.lock                  # Yarn dependency lockfile
```

## Directory Purposes

**`src/`:**
- Purpose: Main application source code.
- Contains: React entry files, app composition, route tree, state, components, hooks, features, CSS, service worker source.
- Key files: `src/index.tsx`, `src/App.tsx`, `src/index.css`, `src/App.css`, `src/service-worker.ts`, `src/serviceWorkerRegistration.ts`.
- Subdirectories: `Common/`, `Components/`, `Hooks/`, `Modules/`, `Routing/`, `Store/`.

**`src/Common/`:**
- Purpose: Shared non-React utilities and constants.
- Contains: `src/Common/Constants/*`, `src/Common/Helpers/*`, `src/Common/Types/*`.
- Key files: `src/Common/Helpers/DishServingHelper.ts`, `src/Common/Helpers/IngredientUnitHelper.ts`, `src/Common/Helpers/InventoryHelper.ts`, `src/Common/Helpers/RouteHelper.ts`.
- Subdirectories: `Constants/`, `Helpers/`, `Types/`.

**`src/Components/`:**
- Purpose: Shared UI primitives, Ant Design wrappers, layout helpers, modal/message providers, and app-level widgets.
- Contains: Component folders with implementation and `index.ts` barrel exports.
- Key files: `src/Components/SmartForm/SmartForm.tsx`, `src/Components/Modal/Modal.tsx`, `src/Components/Modal/ModalProvider.tsx`, `src/Components/Message/MessageProvider.tsx`, `src/Components/List/List.tsx`, `src/Components/AppInitializer/AppInitializer.tsx`, `src/Components/AppInitializer/SharedSyncModal.tsx`, `src/Components/GistBackupWidget.tsx`.
- Subdirectories: UI groups such as `Button/`, `Form/`, `Layout/`, `List/`, `Modal/`, `SmartForm/`, `Typography/`, and `AppInitializer/`.

**`src/Hooks/`:**
- Purpose: Reusable app hooks and integration hooks.
- Contains: Theme, toggle, admin mode, online status, sync, backup, and scheduled calculation hooks.
- Key files: `src/Hooks/index.ts`, `src/Hooks/useAdminMode.ts`, `src/Hooks/useSharedDataSync.ts`, `src/Hooks/useSharedPublish.ts`, `src/Hooks/useGistBackup.ts`, `src/Hooks/useScheduledCalculation.ts`.
- Subdirectories: None.

**`src/Modules/`:**
- Purpose: Domain feature implementation.
- Contains: Feature folders with `Routing/`, `Screens/`, and occasional `Helpers/`.
- Key modules: `src/Modules/Ingredient`, `src/Modules/Dishes`, `src/Modules/ShoppingList`, `src/Modules/ScheduledMeal`, `src/Modules/DishSuggester`, `src/Modules/Home`.
- Subdirectories: One folder per feature domain.

**`src/Modules/Ingredient/`:**
- Purpose: Ingredient CRUD, detail, inventory, stats, unit rules, and price estimate screens.
- Contains: `Routing/IngredientRouteConfig.ts`, `Routing/IngredientRouter.tsx`, screens and widgets under `Screens/`.
- Key files: `src/Modules/Ingredient/Screens/IngredientList.screen.tsx`, `src/Modules/Ingredient/Screens/IngredientDetail.screen.tsx`, `src/Modules/Ingredient/Screens/IngredientInventory.widget.tsx`, `src/Modules/Ingredient/Screens/IngredientUnitRulesEditor.tsx`.

**`src/Modules/Dishes/`:**
- Purpose: Dish CRUD, dish detail management, ingredients, steps, cost estimates, serving planner, cooking sessions, and cooking history.
- Contains: Routing files and many screen/widget files under `Screens/`.
- Key files: `src/Modules/Dishes/Screens/DishesList.screen.tsx`, `src/Modules/Dishes/Screens/DishExpensePlanner.screen.tsx`, `src/Modules/Dishes/Screens/CookingSession.widget.tsx`, `src/Modules/Dishes/Screens/DishesManageIngredient/DishesDetail.screen.tsx`.
- Subdirectories: `Routing/`, `Screens/`, `Screens/DishesManageIngredient/`.

**`src/Modules/ShoppingList/`:**
- Purpose: Shopping list CRUD, detail, calendar, dish additions, meal detail, export, and serving selector workflows.
- Contains: Routing files and shopping-list screens/widgets.
- Key files: `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx`, `src/Modules/ShoppingList/Screens/ShoppingListDetail.screen.tsx`, `src/Modules/ShoppingList/Screens/ShoppingListDetail.widget.tsx`, `src/Modules/ShoppingList/Screens/ShoppingListCalendar.widget.tsx`.

**`src/Modules/ScheduledMeal/`:**
- Purpose: Meal planning, scheduled meal list, add/edit modals, estimates, and range shopping toolkit.
- Contains: Routing files and scheduled-meal screens/widgets.
- Key files: `src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx`, `src/Modules/ScheduledMeal/Screens/ScheduledMealToolkit.widget.tsx`, `src/Modules/ScheduledMeal/Screens/ScheduledMealEstimateSummary.widget.tsx`.

**`src/Modules/DishSuggester/`:**
- Purpose: Suggest dishes from selected or stocked ingredients.
- Contains: Suggester screen/widgets and the local scorer helper.
- Key files: `src/Modules/DishSuggester/Screens/DishSuggester.screen.tsx`, `src/Modules/DishSuggester/Helpers/DishScorer.ts`.

**`src/Modules/Home/`:**
- Purpose: Dashboard, global search, and user guide overlays.
- Contains: Top-level app support screens.
- Key files: `src/Modules/Home/Screens/Dashboard.screen.tsx`, `src/Modules/Home/Screens/GlobalSearch.screen.tsx`, `src/Modules/Home/Screens/UserGuide.screen.tsx`.

**`src/Routing/`:**
- Purpose: Root route graph, route builders, and the persistent app shell.
- Contains: `src/Routing/RootRouter.tsx`, `src/Routing/RootRoutes.ts`, `src/Routing/MasterPage.tsx`.
- Key files: `src/Routing/RootRouter.tsx` mounts feature routers; `src/Routing/MasterPage.tsx` owns navigation and global controls.

**`src/Store/`:**
- Purpose: Redux store composition, persisted reducers, selectors, and domain models.
- Contains: `Store.ts`, `Selectors.ts`, `Models/`, `Reducers/`.
- Key files: `src/Store/Store.ts`, `src/Store/Selectors.ts`, `src/Store/Reducers/ShoppingListReducer.ts`, `src/Store/Reducers/InventoryReducer.ts`, `src/Store/Models/Dishes.ts`, `src/Store/Models/Ingredient.ts`.
- Subdirectories: `Models/`, `Reducers/`.

**`assets/`:**
- Purpose: Source image assets imported from TypeScript files.
- Contains: PNG icons used in navigation, feature labels, dashboard cards, and widgets.
- Key files: `assets/icons/logo.png`, `assets/icons/meals.png`, `assets/icons/noodles.png`, `assets/icons/shoppingList.png`, `assets/icons/vegetable.png`, `assets/icons/cooking.png`, `assets/icons/budget.png`.
- Subdirectories: `icons/`.

**`public/`:**
- Purpose: CRA public files copied into builds.
- Contains: HTML shell, manifest, robots file.
- Key files: `public/index.html`, `public/manifest.json`, `public/robots.txt`.

**`docs/`:**
- Purpose: Committed static deployment output plus project docs and shared data artifacts.
- Contains: Built `index.html`, service worker, static assets, shared data JSON, manifest JSON, backups, plans, and postmortems.
- Key files: `docs/index.html`, `docs/asset-manifest.json`, `docs/shared-data.json`, `docs/shared-manifest.json`, `docs/performance-audit-plan.md`, `docs/automated-regression-test-plan.md`.
- Subdirectories: `docs/static/`, `docs/backups/`.

**`tests/e2e/`:**
- Purpose: Browser regression and performance test suites.
- Contains: Playwright specs and deterministic state seeding fixtures.
- Key files: `tests/e2e/dashboard.spec.ts`, `tests/e2e/global-search.spec.ts`, `tests/e2e/shopping-list.spec.ts`, `tests/e2e/performance-regression.spec.ts`, `tests/e2e/fixtures/appTest.ts`, `tests/e2e/fixtures/seedApp.ts`, `tests/e2e/fixtures/testData.ts`.
- Subdirectories: `fixtures/`.

## Key File Locations

**Entry Points:**
- `src/index.tsx`: React root creation, service worker registration, web-vitals setup.
- `src/App.tsx`: Global providers, Redux persist gate, app initializer, root router.
- `src/Routing/RootRouter.tsx`: Route graph under `/my-recipes`.
- `src/Routing/MasterPage.tsx`: Persistent app shell and global navigation.
- `src/service-worker.ts`: Workbox service worker source.

**Configuration:**
- `package.json`: Scripts and dependencies.
- `tsconfig.json`: TypeScript options and `@components`, `@modules`, `@routing`, `@store`, `@common`, `@hooks` paths.
- `craco.config.js`: CRACO webpack aliases, ModuleScopePlugin removal, Less theme variables.
- `.gitignore`: Ignored generated build/cache/environment files.

**Core Logic:**
- `src/Store/Store.ts`: Root store, shared/personal persisted reducers, middleware configuration.
- `src/Store/Selectors.ts`: Typed selectors and memoized lookup maps.
- `src/Store/Reducers/*`: Domain mutations and reducer-level transformations.
- `src/Store/Models/*`: Domain data shapes and constants.
- `src/Common/Helpers/*`: Cross-feature calculation and formatting helpers.
- `src/Modules/DishSuggester/Helpers/DishScorer.ts`: Dish suggestion scoring logic.

**Routing:**
- `src/Routing/RootRoutes.ts`: Root route object and feature route composition.
- `src/Common/Helpers/RouteHelper.ts`: Route construction helpers.
- `src/Modules/*/Routing/*RouteConfig.ts`: Feature route builders.
- `src/Modules/*/Routing/*Router.tsx`: Feature outlet containers.

**Feature Screens:**
- `src/Modules/Ingredient/Screens/*`: Ingredient screens and widgets.
- `src/Modules/Dishes/Screens/*`: Dish, cooking, and expense screens/widgets.
- `src/Modules/ShoppingList/Screens/*`: Shopping list screens/widgets.
- `src/Modules/ScheduledMeal/Screens/*`: Scheduled meal screens/widgets.
- `src/Modules/Home/Screens/*`: Dashboard, global search, user guide.
- `src/Modules/DishSuggester/Screens/*`: Dish suggestion modal workflow.

**Sync and Backup:**
- `src/Hooks/useSharedDataSync.ts`: Remote shared manifest polling and pending sync state.
- `src/Components/AppInitializer/SharedSyncModal.tsx`: Selective shared data import UI.
- `src/Hooks/useSharedPublish.ts`: Admin shared data publishing to GitHub repository files.
- `src/Hooks/useGistBackup.ts`: Personal data backup/restore through GitHub Gist.
- `src/Components/GistBackupWidget.tsx`: UI for personal Gist backup settings and actions.
- `docs/shared-data.json`: Published shared data snapshot.
- `docs/shared-manifest.json`: Published shared data change manifest.

**Testing:**
- `src/App.test.tsx`: CRA starter unit test file.
- `src/setupTests.ts`: Jest testing-library setup.
- `tests/e2e/*.spec.ts`: Browser regression and performance specs.
- `tests/e2e/fixtures/appTest.ts`: Shared Playwright fixture wrapper.
- `tests/e2e/fixtures/seedApp.ts`: Redux persist localStorage seeding and network stubbing.
- `tests/e2e/fixtures/testData.ts`: Deterministic test data generator.

**Documentation:**
- `HUONG_DAN.md`: User-facing Vietnamese guide.
- `IMPROVEMENTS.md`: Improvement notes.
- `docs/enhancement-suggestions.md`: Enhancement suggestions.
- `docs/performance-audit-plan.md`: Performance work plan and verification history.
- `docs/performance-regression-postmortem.md`: Performance regression postmortem.
- `.planning/codebase/ARCHITECTURE.md`: Generated architecture map.
- `.planning/codebase/STRUCTURE.md`: Generated structure map.

## Naming Conventions

**Files:**
- PascalCase component files: `Button.tsx`, `Modal.tsx`, `Typography.tsx`, `Dashboard.screen.tsx`.
- `*.screen.tsx`: Top-level routed screens, for example `DishesList.screen.tsx` and `ShoppingListDetail.screen.tsx`.
- `*.widget.tsx`: Reusable feature subviews, modal bodies, or screen fragments, for example `DishesAdd.widget.tsx` and `ShoppingListExport.widget.tsx`.
- `*Router.tsx`: React Router outlet containers, for example `DishesRouter.tsx`.
- `*RouteConfig.ts`: Feature route builder objects, for example `IngredientRouteConfig.ts`.
- `*Reducer.ts`: Redux Toolkit slice reducers, for example `ShoppingListReducer.ts`.
- Model files use domain nouns in `src/Store/Models`, for example `Dishes.ts`, `Ingredient.ts`, `ShoppingList.ts`.
- Helper files use `*Helper.ts`, for example `InventoryHelper.ts`, or a domain service-like name such as `DishScorer.ts`.
- Barrel exports use `index.ts` inside component and hook folders.

**Directories:**
- Top-level source domains use PascalCase: `src/Components`, `src/Modules`, `src/Routing`, `src/Store`, `src/Common`, `src/Hooks`.
- Feature modules use PascalCase singular or domain names: `Ingredient`, `Dishes`, `ShoppingList`, `ScheduledMeal`, `DishSuggester`, `Home`.
- Feature internals use `Routing/`, `Screens/`, and sometimes `Helpers/`.
- Shared components generally use one folder per component with an implementation file and an `index.ts` export.

**Import Patterns:**
- Prefer configured aliases over long relative paths: `@components`, `@modules`, `@routing`, `@store`, `@common`, `@hooks`.
- Use `@hooks` as a barrel import from `src/Hooks/index.ts`.
- Feature-to-store imports commonly use `@store/Reducers/*`, `@store/Models/*`, and `@store/Selectors`.

## Where to Add New Code

**New Feature Module:**
- Primary code: `src/Modules/<FeatureName>/Screens/`.
- Route config: `src/Modules/<FeatureName>/Routing/<FeatureName>RouteConfig.ts`.
- Feature router: `src/Modules/<FeatureName>/Routing/<FeatureName>Router.tsx`.
- Root registration: `src/Routing/RootRoutes.ts` and `src/Routing/RootRouter.tsx`.
- Shell navigation if needed: `src/Routing/MasterPage.tsx`.
- Tests: `tests/e2e/<feature-name>.spec.ts` and fixtures in `tests/e2e/fixtures/` if seeded state changes.

**New Screen in Existing Feature:**
- Routed screen: `src/Modules/<FeatureName>/Screens/<Name>.screen.tsx`.
- Supporting widgets: `src/Modules/<FeatureName>/Screens/<Name>.widget.tsx` or a nested folder if the workflow is large.
- Route path: feature `Routing/*RouteConfig.ts` plus `src/Routing/RootRouter.tsx` route entry.

**New Shared Component:**
- Implementation: `src/Components/<ComponentName>/<ComponentName>.tsx`.
- Barrel export: `src/Components/<ComponentName>/index.ts`.
- Shared types if needed: `src/Components/<ComponentName>/<ComponentName>.types.ts`.
- Prefer existing Ant Design wrapper patterns in nearby folders before adding a new abstraction.

**New Form Workflow:**
- Shared form primitives: `src/Components/Form/<ControlName>/` only if reusable across features.
- Feature-specific forms: keep inside `src/Modules/<FeatureName>/Screens/*.widget.tsx`.
- Form wrapper conventions: use `src/Components/SmartForm` when matching existing item-definition patterns.

**New Domain State:**
- Model types: `src/Store/Models/<Domain>.ts`.
- Reducer: `src/Store/Reducers/<Domain>Reducer.ts`.
- Root store registration: `src/Store/Store.ts`, under `shared` only for admin-published data or under `personal` for per-device data.
- Read access: add selectors to `src/Store/Selectors.ts` instead of reading `state.shared.*` or `state.personal.*` in components.
- Tests: update `tests/e2e/fixtures/testData.ts` and `tests/e2e/fixtures/seedApp.ts` when persisted shape changes.

**New Domain Helper:**
- Cross-feature helper: `src/Common/Helpers/<Name>Helper.ts`.
- Feature-specific helper: `src/Modules/<FeatureName>/Helpers/<Name>.ts`.
- Types should come from `src/Store/Models/*` when they describe persisted domain entities.

**New Sync or Backup Behavior:**
- Hooks: `src/Hooks/use<Behavior>.ts` and export from `src/Hooks/index.ts`.
- App startup behavior: `src/Components/AppInitializer/`.
- Shell-triggered behavior: `src/Routing/MasterPage.tsx` or a widget under `src/Components/` if reusable.
- Remote shared data artifacts: `docs/shared-data.json`, `docs/shared-manifest.json`, and `docs/backups/`.

**New Static Assets:**
- Source icons/images imported by TS: `assets/icons/` or a new folder under `assets/`.
- Public root files copied by CRA: `public/`.
- Generated deployment assets: do not edit `docs/static/` by hand; rebuild and copy output through the established deployment process.

**New Tests:**
- Browser flow tests: `tests/e2e/<flow>.spec.ts`.
- Shared test fixture changes: `tests/e2e/fixtures/appTest.ts`.
- Persisted app seed changes: `tests/e2e/fixtures/seedApp.ts` and `tests/e2e/fixtures/testData.ts`.
- Unit tests: colocate as `*.test.tsx` under `src/` following `src/App.test.tsx` if adding React Testing Library coverage.

## Special Directories

**`docs/`:**
- Purpose: Committed deployment output and project documentation.
- Source: Built app output plus hand-written project docs and shared JSON data.
- Committed: Yes.
- Notes: `docs/shared-data.json` and `docs/shared-manifest.json` are runtime data sources for browser sync, not just documentation files.

**`docs/static/`:**
- Purpose: Built CSS, JavaScript, source maps, and media files for deployment.
- Source: Generated by the React build pipeline.
- Committed: Yes in this repo.
- Notes: Treat as generated output; prefer changing `src/` and rebuilding instead of editing directly.

**`docs/backups/`:**
- Purpose: Timestamped backups of shared data and shared manifest files.
- Source: Manual or workflow-created snapshots before shared data changes.
- Committed: Yes.

**`build/`:**
- Purpose: Local generated CRA production build output.
- Source: `npm run build` or `yarn build`.
- Committed: No, ignored by `/build` in `.gitignore`.

**`node_modules/`:**
- Purpose: Installed npm/yarn dependencies.
- Source: Package manager install.
- Committed: Should be treated as local generated dependency content; do not edit by hand.

**`.codegraph/`:**
- Purpose: Local code graph index and daemon files.
- Source: Codegraph tooling.
- Committed: Tooling-local metadata; do not treat as application source.

**`.planning/codebase/`:**
- Purpose: Generated GSD codebase map documents.
- Source: GSD codebase mapping workflow.
- Committed: Project planning artifact if the team tracks `.planning/`.

---

*Structure analysis: 2026-06-05*
*Update when directory structure changes*
