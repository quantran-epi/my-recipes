# Codebase Concerns

**Analysis Date:** 2026-06-05

## Tech Debt

**CRA/CRACO customization drift:**
- Issue: The app depends on Create React App plus CRACO overrides for aliases and Less. Alias config is split across `tsconfig.json`, `craco.config.js`, and the implicit Jest setup from `react-scripts`.
- Files: `package.json`, `tsconfig.json`, `craco.config.js`, `src/App.test.tsx`
- Why: The project extended CRA for absolute imports and Ant Design Less variables without ejecting.
- Impact: Production builds resolve aliases, but the Jest command currently fails to resolve `@store/Store`. Build output also reports the CRA `babel-preset-react-app` undeclared dependency warning, which points to an unmaintained build base.
- Fix approach: Either add explicit Jest alias mapping and the missing Babel plugin workaround, or migrate the app to Vite with one shared alias/test config.

**Loose TypeScript boundary:**
- Issue: Type checking is intentionally permissive: `strict` is false, `allowJs` and `skipLibCheck` are true, and Redux serializable checks are disabled.
- Files: `tsconfig.json`, `src/Store/Store.ts`, `src/Common/Helpers/DateHelper.ts`, `src/Common/Helpers/InventoryHelper.ts`, `src/Components/SmartForm/useSmartForm.ts`
- Why: This likely kept the MVP moving while models and persisted state were still changing.
- Impact: Persisted Redux state can carry `Date`, legacy shapes, and `any` casts without compile-time pressure. A malformed localStorage payload can reach reducers/helpers before validation catches it.
- Fix approach: Turn on strictness incrementally by folder, restore targeted serializable checks or transforms, and isolate legacy migrations behind typed adapters.

**Browser localStorage as the primary database:**
- Issue: All shared and personal data lives in Redux Persist/localStorage with no explicit persist version, migrations, quota handling, or backup-before-mutate flow.
- Files: `src/Store/Store.ts`, `src/Hooks/useGistBackup.ts`, `src/Components/GistBackupWidget.tsx`, `src/Routing/MasterPage.tsx`
- Why: A local-first app can avoid backend hosting and auth complexity.
- Impact: Schema changes can break existing users, large image/data snapshots can hit browser quota, and destructive imports or sync operations can overwrite good local state.
- Fix approach: Add versioned persist migrations, schema validation, local backup checkpoints before restore/sync, and quota/error handling around storage writes.

**Large mixed-responsibility screens:**
- Issue: Several screens combine data derivation, mutation orchestration, layout, modal state, and rendering in single files.
- Files: `src/Modules/ShoppingList/Screens/ShoppingListDetail.widget.tsx`, `src/Routing/MasterPage.tsx`, `src/Modules/DishSuggester/Screens/DishSuggester.screen.tsx`, `src/Modules/Dishes/Screens/DishesList.screen.tsx`, `src/Modules/Ingredient/Screens/IngredientList.screen.tsx`
- Why: Feature growth was added directly to active screens.
- Impact: Changes to shopping list completion, route chrome, suggestions, or virtualized lists have broad regression surface and are hard to unit test.
- Fix approach: Extract pure domain calculations, reducers/selectors, and modal flows into focused modules before making behavioral changes.

## Known Bugs

**Unit test command is currently broken:**
- Symptoms: `CI=true yarn test --watchAll=false --watchman=false` fails before running tests with `Cannot find module '@store/Store' from 'src/App.tsx'`.
- Trigger: Running the existing CRA Jest command from `package.json`.
- Files: `package.json`, `tsconfig.json`, `craco.config.js`, `src/App.test.tsx`
- Workaround: Production build succeeds via CRACO; unit tests are not usable until Jest knows the path aliases. The first test is also the stale CRA default expecting `/learn react/i`.
- Root cause: CRACO webpack aliases are not mirrored into Jest, and the default test was never updated for the app.

**Selective shared sync can mark unrelated data as unsynced:**
- Symptoms: Syncing only ingredient changes can overwrite `dishesVersion` with an empty string, and syncing only dish changes can overwrite `ingredientsVersion` with an empty string.
- Trigger: `SharedSyncModal` calls `onDone` after a selective sync.
- Files: `src/Components/AppInitializer/SharedSyncModal.tsx`, `src/Hooks/useSharedDataSync.ts`
- Workaround: Sync all categories together when prompted.
- Root cause: `SharedSyncModal` builds a full `SyncedVersions` object but fills unchanged categories with `""` instead of preserving the previous synced version.
- Fix: Merge with `getSyncedVersions()` before `saveSyncedVersions()` or pass only changed version fields.

**Included-dish recursion is unsafe with stale or cyclic references:**
- Symptoms: Missing included dish IDs can throw at runtime; cycles can recurse indefinitely in helpers without a visited set.
- Trigger: Editing/removing dishes that are referenced by other dishes, scheduled meals, or shopping lists, then generating ingredients or checking inclusion.
- Files: `src/Store/Reducers/ShoppingListReducer.ts`, `src/Common/Helpers/DishServingHelper.ts`, `src/Modules/Dishes/Screens/DishesList.screen.tsx`
- Workaround: Keep included-dish references valid manually.
- Root cause: Some recursive paths assume `allDishes.find(...)` always returns a dish and do not consistently track visited IDs.

**Personal restore accepts structurally invalid persisted state:**
- Symptoms: Restoring arbitrary JSON to `persist:personal` can reload the app into an invalid Redux Persist shape.
- Trigger: Gist restore or manual import with JSON that parses but does not match the persisted `personal` reducer schema.
- Files: `src/Hooks/useGistBackup.ts`, `src/Routing/MasterPage.tsx`
- Workaround: Restore only backups generated by the same app version.
- Root cause: Restore validates only `JSON.parse`, not the expected Redux Persist envelope and slice schemas.

## Security Considerations

**Frontend-embedded admin credentials:**
- Risk: `REACT_APP_ADMIN_PIN` and `REACT_APP_GH_TOKEN` are decoded in browser code. CRA exposes `REACT_APP_*` values to the frontend bundle, so obfuscation does not protect them.
- Files: `src/Hooks/useAdminMode.ts`, `src/Hooks/useSharedPublish.ts`, `package.json`
- Current mitigation: Admin UI is hidden until a PIN matches, and publish requires the decoded GitHub token.
- Recommendations: Move publishing to GitHub Actions, a serverless endpoint, or a GitHub App with scoped server-side credentials. Treat any token ever shipped in the frontend as compromised.

**Personal GitHub token stored in localStorage:**
- Risk: A user-provided GitHub PAT is persisted under `personal_gist_token`, so any XSS, malicious extension, or shared-device browser access can read it.
- Files: `src/Hooks/useGistBackup.ts`, `src/Components/GistBackupWidget.tsx`
- Current mitigation: The UI uses a password field, but storage remains plaintext localStorage.
- Recommendations: Prefer fine-grained, gist-only tokens; avoid permanent storage where possible; support session-only tokens and clear guidance to revoke tokens.

**Remote shared data is trusted without schema or integrity checks:**
- Risk: The app fetches `docs/shared-data.json` and `docs/shared-manifest.json` from raw GitHub, parses them, and dispatches items into local state.
- Files: `src/Hooks/useSharedDataSync.ts`, `src/Components/AppInitializer/SharedSyncModal.tsx`, `src/Routing/MasterPage.tsx`
- Current mitigation: Fetch errors are handled and e2e fixtures stub GitHub requests.
- Recommendations: Validate payloads with a schema, check expected manifest fields, preserve local backups, and consider signed manifests or commit-SHA pinning for shared releases.

**Image input can persist large or remote user-controlled assets:**
- Risk: URL images can load arbitrary remote resources, and uploaded files are read into memory and canvas-compressed without size/error guards.
- Files: `src/Components/Form/ImageInput/ImageInput.tsx`, `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx`
- Current mitigation: File picker accepts `image/*` and uploaded images are compressed to JPEG.
- Recommendations: Add file size limits, image decode error handling, dimension caps before canvas work, and clear handling for remote URL failures.

## Performance Bottlenecks

**Large initial JavaScript bundle:**
- Problem: Production build reports a 568.6 kB gzip main bundle and warns it is significantly larger than recommended.
- Measurement: `yarn build` on 2026-06-05 produced `build/static/js/main.55e4c24a.js` at 568.6 kB gzip.
- Files: `package.json`, `src/Routing/RootRouter.tsx`, `src/Routing/MasterPage.tsx`, `src/App.tsx`
- Cause: Most route screens and Ant Design-heavy modules are imported into the main route tree; only limited modal-level lazy loading is present.
- Improvement path: Add route-level `React.lazy` chunks, trim unused imports/icons, and analyze Ant Design/date-library cost.

**Heavy calculations still run on the main thread:**
- Problem: `useScheduledCalculation` defers work until after paint, but calculations still execute synchronously on the UI thread.
- Measurement: No automated CPU budget was run during this scan; prior docs already track performance smoke tests.
- Files: `src/Hooks/useScheduledCalculation.ts`, `src/Modules/DishSuggester/Helpers/DishScorer.ts`, `src/Common/Helpers/CostEstimateHelper.ts`, `src/Modules/Home/Screens/Dashboard.screen.tsx`
- Cause: Dish scoring, cost estimation, dashboard metrics, and inventory snapshots iterate over persisted arrays in render-adjacent flows.
- Improvement path: Move the heaviest pure calculations to memoized selectors, chunked work, or a worker once data sizes grow.

**Full-snapshot diff and publish path scales poorly:**
- Problem: Shared publishing reads full GitHub files, parses full JSON, diffs with `JSON.stringify`, then writes full snapshots.
- Measurement: No large production dataset was profiled in this scan.
- Files: `src/Hooks/useSharedPublish.ts`, `docs/shared-data.json`, `docs/shared-manifest.json`
- Cause: GitHub contents API is used as a simple data store.
- Improvement path: Normalize shared data, hash item payloads, publish immutable releases, or move to a backend/data store if shared data grows.

**Persisted base64 images increase storage and sync cost:**
- Problem: Uploaded dish images are stored as base64 data URLs inside app state, which increases localStorage size and shared JSON payload size.
- Measurement: `GistBackupWidget` measures persisted local data size but there is no quota guard.
- Files: `src/Components/Form/ImageInput/ImageInput.tsx`, `src/Components/GistBackupWidget.tsx`, `docs/shared-data.json`
- Cause: The app avoids external object storage for images.
- Improvement path: Enforce per-image and total persisted-data budgets; store images as external assets or object-storage URLs for shared data.

## Fragile Areas

**Virtualized list layout and scroll behavior:**
- Why fragile: Fixed row heights, custom click-suppression, scroll-to-top logic, and nested modal/list interactions must line up exactly for touch and desktop scrolling.
- Files: `src/Components/List/VirtualListRowFrame.tsx`, `src/Components/List/VirtualListScrollTopButton.tsx`, `src/Modules/Ingredient/Screens/IngredientList.screen.tsx`, `src/Modules/Dishes/Screens/DishesList.screen.tsx`, `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx`
- Common failures: Row overlap, first-scroll lag, accidental row clicks while scrolling, and final row not fully visible.
- Safe modification: Keep Playwright visual/interaction checks for all virtualized lists and verify mobile-size viewports after row-height or wrapper changes.
- Test coverage: `tests/e2e/performance-regression.spec.ts` and `tests/e2e/shopping-list.spec.ts` cover some of this, but the e2e runner is not wired into `package.json`.

**Recipe, serving, unit, inventory, and cost math:**
- Why fragile: The same ingredient amounts flow through serving scaling, included dishes, unit conversion, inventory coverage, purchase import, and cost estimation.
- Files: `src/Common/Helpers/DishServingHelper.ts`, `src/Common/Helpers/IngredientUnitHelper.ts`, `src/Common/Helpers/InventoryHelper.ts`, `src/Common/Helpers/CostEstimateHelper.ts`, `src/Modules/ShoppingList/Screens/ShoppingListDetail.widget.tsx`
- Common failures: Undercounted included dishes, wrong fallback conversion for count-based units, stale bought amount status, or inventory deduction from the wrong batch.
- Safe modification: Add pure helper tests before changing unit rules or shopping-list generation.
- Test coverage: E2E covers several shopping-list and serving scenarios, but there are no focused unit tests for helper edge cases.

**Shared-data publish/sync path:**
- Why fragile: Client code handles admin unlock, GitHub API writes, manifest versioning, selective sync, destructive imports, and local version tracking.
- Files: `src/Hooks/useSharedPublish.ts`, `src/Hooks/useSharedDataSync.ts`, `src/Components/AppInitializer/SharedSyncModal.tsx`, `src/Routing/MasterPage.tsx`
- Common failures: Partial sync version drift, overwritten local shared data, stale raw GitHub cache assumptions, and conflicts between two publishers.
- Safe modification: Add schema validation and transaction-style local backups first, then test partial sync and failure/retry cases.
- Test coverage: GitHub requests are stubbed in `tests/e2e/fixtures/seedApp.ts`, but publish and conflict paths are not covered.

**Service worker update semantics:**
- Why fragile: The app registers a production service worker and precaches the app shell, but update handling only logs to the console.
- Files: `src/index.tsx`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`, `docs/service-worker.js`
- Common failures: Users run stale code against newer shared data, or local testing is polluted by old caches.
- Safe modification: Add visible update prompts, a cache reset path, and keep e2e tests unregistering service workers.
- Test coverage: E2E fixtures unregister service workers, so production update behavior is mostly untested.

## Scaling Limits

**Browser storage quota:**
- Current capacity: Browser localStorage is typically small and origin-scoped; the app has no enforced project-specific budget.
- Files: `src/Store/Store.ts`, `src/Components/GistBackupWidget.tsx`, `src/Components/Form/ImageInput/ImageInput.tsx`
- Limit: Large base64 images, long cooking/shopping history, and shared snapshots can exceed quota or make startup parse time visible.
- Symptoms at limit: Persist writes fail, restore silently leaves old state, startup blocks on large JSON parse, or backups become too large for comfortable Gist use.
- Scaling path: Add quota monitoring, split large blobs out of Redux Persist, prune/archive history, and keep images outside localStorage.

**GitHub contents/raw files as a shared data backend:**
- Current capacity: Works for small shared ingredient/dish snapshots and occasional publishes.
- Files: `src/Hooks/useSharedPublish.ts`, `src/Hooks/useSharedDataSync.ts`, `docs/shared-data.json`, `docs/shared-manifest.json`
- Limit: GitHub API rate limits, file-size limits, branch write conflicts, raw cache timing, and no transactional multi-file publish.
- Symptoms at limit: Failed publishes, inconsistent `shared-data.json` vs `shared-manifest.json`, or slow sync downloads.
- Scaling path: Publish immutable versioned files, add commit-SHA reads, or move shared data to a real backend.

**Client-side list and search derivations:**
- Current capacity: Works for the current small local dataset and is partially virtualized.
- Files: `src/Modules/Home/Screens/GlobalSearch.screen.tsx`, `src/Modules/Ingredient/Screens/IngredientList.screen.tsx`, `src/Modules/Dishes/Screens/DishesList.screen.tsx`, `src/Modules/DishSuggester/Screens/DishSuggester.screen.tsx`
- Limit: Thousands of dishes, ingredients, shopping-list rows, or nested included dishes will increase render-adjacent CPU work.
- Symptoms at limit: Search lag, delayed modal opening, slow dashboard, and frame drops after filter changes.
- Scaling path: Add indexed selectors, precomputed maps, web-worker scoring, and dataset-size performance tests.

## Dependencies at Risk

**Create React App / react-scripts:**
- Risk: `react-scripts` is pinned at `5.0.1`; the build emits a warning that `babel-preset-react-app` imports an undeclared Babel plugin and that CRA is not maintained.
- Files: `package.json`, `yarn.lock`
- Impact: Fresh installs can break depending on transitive dependency layout, and future React/TypeScript upgrades will be harder.
- Migration plan: Add the missing Babel plugin workaround short term; plan Vite or another maintained React build setup.

**Playwright test tooling is referenced but not declared:**
- Risk: E2E tests import `@playwright/test`, but `package.json` has no Playwright dependency, script, or `playwright.config.*` file.
- Files: `tests/e2e/fixtures/appTest.ts`, `tests/e2e/*.spec.ts`, `package.json`
- Impact: E2E coverage depends on external/global tooling and is not reproducible from the repo alone.
- Migration plan: Add `@playwright/test` as a dev dependency, commit a config, and add `test:e2e` plus CI commands.

**Date libraries and bundle cost:**
- Risk: Both `moment` and `dayjs` are installed and used.
- Files: `package.json`, `src/Store/Reducers/ShoppingListReducer.ts`, `src/Common/Helpers/InventoryHelper.ts`, `src/Modules/Dishes/Screens/DishesList.screen.tsx`
- Impact: Bundle size and date behavior can drift across modules.
- Migration plan: Standardize on one date library and remove the other after tests cover date formatting/calculation cases.

## Missing Critical Features

**Schema validation and migrations:**
- Problem: Imports, Gist restores, shared sync, and Redux Persist rehydration accept data by shape assumption.
- Files: `src/Store/Store.ts`, `src/Hooks/useGistBackup.ts`, `src/Hooks/useSharedDataSync.ts`, `src/Components/AppInitializer/SharedSyncModal.tsx`, `src/Routing/MasterPage.tsx`
- Current workaround: Manual discipline and e2e seed shape.
- Blocks: Safe app upgrades, reliable backups, and trustworthy shared data.
- Implementation complexity: Medium; add schema validators and persist migrations per slice.

**Reproducible automated verification:**
- Problem: Unit tests fail, e2e tests lack repo-local dependency/config/script, and build warnings do not fail CI.
- Files: `package.json`, `src/App.test.tsx`, `tests/e2e/*.spec.ts`
- Current workaround: Manual command knowledge in `docs/automated-regression-test-plan.md`.
- Blocks: Confident refactors of reducers, virtualized lists, sync, and calculations.
- Implementation complexity: Low to medium; add scripts/config first, then expand test coverage.

**Secure publishing boundary:**
- Problem: Admin publish happens from client code with a frontend-available token.
- Files: `src/Hooks/useSharedPublish.ts`, `src/Hooks/useAdminMode.ts`
- Current workaround: Obfuscated env values and PIN unlock.
- Blocks: Treating published shared data as secure or auditable.
- Implementation complexity: Medium; GitHub Actions dispatch or a small serverless function would remove secrets from the bundle.

**Recovery UX for cache/storage failures:**
- Problem: There is no first-class reset/export/import recovery flow for corrupted localStorage, quota failures, or stale service worker caches.
- Files: `src/serviceWorkerRegistration.ts`, `src/Store/Store.ts`, `src/Routing/MasterPage.tsx`, `src/Hooks/useGistBackup.ts`
- Current workaround: Developer/manual browser storage clearing.
- Blocks: Supportability for non-technical users after bad restores or stale deployments.
- Implementation complexity: Low to medium; add a recovery screen and cache/storage reset actions.

## Test Coverage Gaps

**Domain helper unit tests:**
- What's not tested: Serving scaling, included-dish recursion, unit conversion fallback, inventory FEFO deduction, cost estimation, and shopping-list generation edge cases.
- Files: `src/Common/Helpers/DishServingHelper.ts`, `src/Common/Helpers/IngredientUnitHelper.ts`, `src/Common/Helpers/InventoryHelper.ts`, `src/Common/Helpers/CostEstimateHelper.ts`, `src/Store/Reducers/ShoppingListReducer.ts`
- Risk: Numeric regressions can pass UI smoke tests but produce wrong shopping lists or inventory deductions.
- Priority: High
- Difficulty to test: Low to medium; most logic is pure or reducer-only.

**Sync, publish, restore, and corrupt data tests:**
- What's not tested: Partial shared sync version merging, malformed GitHub payloads, publish conflict handling, Gist restore schema failures, and backup-before-restore behavior.
- Files: `src/Hooks/useSharedPublish.ts`, `src/Hooks/useSharedDataSync.ts`, `src/Hooks/useGistBackup.ts`, `src/Components/AppInitializer/SharedSyncModal.tsx`
- Risk: Data loss or repeated sync prompts can ship unnoticed.
- Priority: High
- Difficulty to test: Medium; needs mocked fetch/localStorage and reducer assertions.

**Admin/security boundary tests:**
- What's not tested: Admin unlock behavior, hidden mutation controls, publish token absence, and user-facing behavior when admin env values are missing.
- Files: `src/Hooks/useAdminMode.ts`, `src/Routing/MasterPage.tsx`, `src/Hooks/useSharedPublish.ts`
- Risk: UI-only admin assumptions can regress silently.
- Priority: Medium
- Difficulty to test: Low for UI behavior, but true security requires architectural change.

**Service worker and cache update tests:**
- What's not tested: Production update prompt behavior, stale-cache recovery, and interaction between cached app shell and newer shared data.
- Files: `src/index.tsx`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`
- Risk: Users can stay on old app code after deploys.
- Priority: Medium
- Difficulty to test: Medium; requires production-build/browser scenarios.

**Performance budgets in CI:**
- What's not tested: Main bundle ceiling, route CPU budgets, startup parse time, localStorage size budgets, and large-dataset list/search behavior.
- Files: `tests/e2e/performance-regression.spec.ts`, `tests/e2e/performance-baseline.spec.ts`, `package.json`
- Risk: Known performance-sensitive areas regress without a required gate.
- Priority: Medium
- Difficulty to test: Medium; existing Playwright specs provide a starting point once the runner is wired into repo scripts.

---

*Concerns audit: 2026-06-05*
*Environment file values were not read during this scan.*
*Update as issues are fixed or new ones discovered.*
