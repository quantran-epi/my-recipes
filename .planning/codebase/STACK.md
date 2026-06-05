# Technology Stack

**Analysis Date:** 2026-06-05

## Languages

**Primary:**
- TypeScript 4.9.5 - React application, hooks, Redux store, route modules, custom components, service worker source, and tests under `src/` and `tests/` (`package.json`, `tsconfig.json`, `src/App.tsx`, `src/service-worker.ts`, `tests/e2e/dashboard.spec.ts`).
- TSX / React JSX - UI screens and component wrappers throughout `src/Components/` and `src/Modules/` (`tsconfig.json`, `src/Routing/MasterPage.tsx`).

**Secondary:**
- JavaScript - CRACO build configuration (`craco.config.js`).
- CSS / HTML - Global app styles and CRA HTML shell (`src/index.css`, `src/App.css`, `public/index.html`).
- JSON - PWA metadata, generated static manifests, and shared data snapshots (`public/manifest.json`, `docs/asset-manifest.json`, `docs/shared-data.json`, `docs/shared-manifest.json`).

## Runtime

**Environment:**
- Browser SPA runtime - React renders into `public/index.html` via `src/index.tsx`; the app uses DOM APIs, `fetch`, `localStorage`, `navigator.onLine`, service workers, and Cache Storage (`src/Hooks/useSharedDataSync.ts`, `src/Hooks/useGistBackup.ts`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`).
- Node.js - Required for local development, build, and test commands through CRACO/react-scripts (`package.json`). No `.nvmrc`, `.node-version`, or `engines` field was detected in repo files.
- Service worker runtime - CRA/Workbox service worker is registered in production and precaches app assets (`src/index.tsx`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`).

**Package Manager:**
- Yarn is the committed package manager evidence via `yarn.lock`.
- `package.json` scripts are npm-compatible: `start`, `build`, `test`, and `eject`.
- Lockfile: `yarn.lock` present; `package-lock.json` and `pnpm-lock.yaml` not detected at repo root.

## Frameworks

**Core:**
- React 18.2 - SPA UI framework (`package.json`, `src/index.tsx`, `src/App.tsx`).
- Create React App / react-scripts 5.0.1 - Webpack/Babel/Jest app toolchain (`package.json`, `src/react-app-env.d.ts`).
- CRACO 7.1 with `craco-less` 3.0.1 - Overrides CRA config for aliases, ModuleScopePlugin removal, and Ant Design Less variables (`package.json`, `craco.config.js`).
- React Router DOM 6.22.3 - Client-side routing (`package.json`, `src/Routing/RootRouter.tsx`, `src/Routing/RootRoutes.ts`).
- Redux Toolkit 2.2.3 with React Redux 9.1 - Global state and reducers (`package.json`, `src/Store/Store.ts`, `src/Store/Reducers/`).
- Redux Persist 6.0 - Browser localStorage persistence for shared and personal slices (`package.json`, `src/Store/Store.ts`).
- Ant Design 5.16.1 - Primary UI component system and theme provider (`package.json`, `src/App.tsx`, `src/Components/`).

**Testing:**
- Jest + React Testing Library - CRA unit test setup (`package.json`, `src/setupTests.ts`, `src/App.test.tsx`).
- Playwright-style E2E tests - Specs and fixtures exist under `tests/e2e/`, importing `@playwright/test` (`tests/e2e/fixtures/appTest.ts`, `tests/e2e/performance-regression.spec.ts`). `@playwright/test`, a Playwright config, and `test:e2e` package scripts are not declared in `package.json`; `docs/automated-regression-test-plan.md` documents commands that are not present in the current package scripts.
- Web Vitals 2.1.4 - Optional browser performance reporting hook; currently no handler is passed (`package.json`, `src/reportWebVitals.ts`, `src/index.tsx`).

**Build/Dev:**
- `@craco/craco` starts and builds the CRA app (`package.json`).
- TypeScript compiler options target ES5, include DOM and ESNext libs, use `react-jsx`, allow JS, disable strict mode, and enable path aliases (`tsconfig.json`).
- Webpack aliases are mirrored in CRACO for `@components`, `@routing`, `@modules`, `@store`, `@common`, and `@hooks` (`craco.config.js`).
- Workbox 6.6 packages support generated precaching and runtime image caching (`package.json`, `src/service-worker.ts`).

## Key Dependencies

**Critical:**
- `antd` ^5.16.1 - UI controls, layout primitives, messages, modals, forms, tables, calendars, and theme tokens (`src/App.tsx`, `src/Components/`, `src/Modules/`).
- `@reduxjs/toolkit` ^2.2.3 and `react-redux` ^9.1.0 - Application state mutations and selectors (`src/Store/Store.ts`, `src/Store/Reducers/`, `src/Store/Selectors.ts`).
- `redux-persist` ^6.0.0 - Persists `shared` and `personal` state slices to browser localStorage (`src/Store/Store.ts`).
- `react-router-dom` ^6.22.3 - SPA routing and navigation (`src/Routing/RootRouter.tsx`, `src/Routing/MasterPage.tsx`).
- `react-window` ^2.2.7 - Virtualized list rendering for larger lists (`src/Modules/Ingredient/Screens/IngredientList.screen.tsx`, `src/Modules/Dishes/Screens/DishesList.screen.tsx`, `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx`).
- `lodash` ^4.17.21 and `reselect` ^5.1.0 - Collection utilities and memoized selectors (`src/Store/Selectors.ts`, `src/Modules/*`).
- `moment` ^2.30.1 and `dayjs` ^1.11.10 - Date formatting, relative time, calendar logic, and date picker values (`src/Common/Helpers/DateHelper.ts`, `src/Common/Helpers/InventoryHelper.ts`, `src/Modules/*`).
- `nanoid` 4.0.1 - ID generation in reducers and add/edit flows (`src/Store/Reducers/CookingSessionReducer.ts`, `src/Store/Reducers/ShoppingListReducer.ts`, `src/Modules/Dishes/Screens/DishesManageIngredient/DishAddStep.widget.tsx`).

**Infrastructure:**
- Workbox packages - Service worker precaching, app-shell routing, and runtime image caching (`package.json`, `src/service-worker.ts`).
- Browser built-ins - `fetch`, `localStorage`, `navigator.serviceWorker`, `navigator.onLine`, `atob`/`btoa`, and Cache Storage are used directly (`src/Hooks/useSharedPublish.ts`, `src/Hooks/useGistBackup.ts`, `src/serviceWorkerRegistration.ts`, `tests/e2e/fixtures/seedApp.ts`).
- `react-copy-to-clipboard` ^5.1.0 - Copy/export helper for persisted personal data (`package.json`, `src/Routing/MasterPage.tsx`).

**Dependency Caveats:**
- `@ant-design/icons` is imported across many source files but is not listed as a direct dependency in `package.json` (`src/Routing/MasterPage.tsx`, `src/Components/GistBackupWidget.tsx`).
- `uuid` is imported in `src/Modules/Ingredient/Screens/IngredientInventory.widget.tsx` but is not listed as a direct dependency in `package.json`.
- `redux-thunk` is listed in `package.json` but no direct source import was detected in the scanned files; Redux Toolkit default middleware is used instead (`src/Store/Store.ts`).

## Configuration

**Environment:**
- CRA-style environment variables are read from `process.env` in source (`src/Hooks/useSharedPublish.ts`, `src/Hooks/useAdminMode.ts`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`, `src/Store/Store.ts`).
- Source-detected env keys: `REACT_APP_GH_TOKEN`, `REACT_APP_ADMIN_PIN`, `PUBLIC_URL`, `NODE_ENV`, and test key `PERF_BASELINE`.
- `.env` key listing detected: `PORT`, `PUBLIC_URL`, `REACT_APP_GITHUB_TOKEN`. Values were not read. The source expects `REACT_APP_GH_TOKEN`, so the listed `REACT_APP_GITHUB_TOKEN` key may not satisfy the publish hook as written.

**Build:**
- `package.json` - Dependencies, scripts, CRA ESLint config, and browserslist.
- `craco.config.js` - CRA override, aliases, Less loader options, and Ant Design theme variables.
- `tsconfig.json` - Compiler settings and TypeScript path aliases.
- `public/index.html` and `public/manifest.json` - CRA shell, Google Fonts link, and PWA metadata.
- `docs/` - Checked-in static production build output and shared data artifacts (`docs/index.html`, `docs/service-worker.js`, `docs/asset-manifest.json`, `docs/shared-data.json`, `docs/shared-manifest.json`).

## Platform Requirements

**Development:**
- Any OS with Node.js and Yarn/npm capable of running CRA/react-scripts.
- Browser required for application runtime; app state is device-local unless GitHub sync/backup is configured.
- No Docker, database server, backend service, or local emulator config was detected.
- E2E tests require Playwright tooling if they are to be run, but Playwright is not declared in `package.json`.

**Production:**
- Static SPA deployment; `docs/` contains built assets and service worker output.
- PWA-capable browser environment for service worker registration, offline precache, runtime PNG cache, and localStorage persistence (`src/index.tsx`, `src/service-worker.ts`, `public/manifest.json`).
- External GitHub network access is required for shared-data sync, admin publishing, and Gist backup/restore (`src/Hooks/useSharedDataSync.ts`, `src/Hooks/useSharedPublish.ts`, `src/Hooks/useGistBackup.ts`).
- Google Fonts network access is used for the Kanit font unless cached by the browser/service worker (`public/index.html`).

---

*Stack analysis: 2026-06-05*
*Update after major dependency, build, hosting, or external service changes*
