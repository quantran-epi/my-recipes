# Coding Conventions

**Analysis Date:** 2026-06-05

## Naming Patterns

**Files:**
- React screen files use `*.screen.tsx` under feature modules, for example `src/Modules/Dishes/Screens/DishesList.screen.tsx`, `src/Modules/Ingredient/Screens/IngredientList.screen.tsx`, and `src/Modules/Home/Screens/Dashboard.screen.tsx`.
- Reusable feature UI uses `*.widget.tsx`, for example `src/Modules/ShoppingList/Screens/ShoppingListDetail.widget.tsx`, `src/Modules/Dishes/Screens/CookingSession.widget.tsx`, and `src/Modules/ScheduledMeal/Screens/ScheduledMealEstimateSummary.widget.tsx`.
- Shared component wrappers are PascalCase directories with PascalCase implementation files plus barrel exports, for example `src/Components/Button/Button.tsx` and `src/Components/Button/index.ts`.
- Store models and reducers use PascalCase model files and reducer files, for example `src/Store/Models/Dishes.ts` and `src/Store/Reducers/DishesReducer.ts`.
- E2E specs live in `tests/e2e/*.spec.ts`; fixtures live in `tests/e2e/fixtures/*.ts`.

**Functions:**
- Component functions are usually exported named `const` values, often typed as `React.FunctionComponent` or `FunctionComponent`, for example `DishesListScreen` in `src/Modules/Dishes/Screens/DishesList.screen.tsx` and `ModalProvider` in `src/Components/Modal/ModalProvider.tsx`.
- Internal event handlers and derived callbacks often use a leading underscore, for example `_onSearchChange`, `_onListScroll`, and `_scrollToTop` in list screens.
- Helper modules sometimes expose an object namespace with method properties, for example `IngredientUnitHelper` in `src/Common/Helpers/IngredientUnitHelper.ts`.
- Redux action creators are exported with domain verbs, for example `addDishes`, `editDishes`, `removeDishes`, and `duplicateDish` from `src/Store/Reducers/DishesReducer.ts`.

**Variables:**
- Local variables and state values use `camelCase`; constants use `UPPER_SNAKE_CASE`, for example `DISH_STATUS_FILTERS`, `EMPTY_DISH_SUMMARY`, and `DISH_ROW_HEIGHT` in `src/Modules/Dishes/Screens/DishesList.screen.tsx`.
- CSS-in-JS style objects use descriptive `camelCase` names, for example `filterRowStyle` and `filterChipStyle` in `src/Modules/Dishes/Screens/DishesList.screen.tsx`.
- Route and model namespaces use PascalCase object names, for example `RootRoutes` in `src/Routing/RootRoutes.ts` and `DISH_TAGS` in `src/Store/Models/Dishes.ts`.

**Types:**
- Type aliases are PascalCase and common for domain payloads, for example `DishesIngredientAddParams`, `DishDuration`, and `Dishes`.
- Interfaces are also PascalCase; both prefixed and unprefixed styles exist, for example `DishesState` in `src/Store/Reducers/DishesReducer.ts` and `IButtonProps` in `src/Components/Button/Button.tsx`.
- Literal union types are preferred over enums in sampled code, for example `DishStatusFilter` in `src/Modules/Dishes/Screens/DishesList.screen.tsx`.

## Code Style

**Formatting:**
- No standalone Prettier config was found. Formatting is repository-local and mixed.
- Source uses semicolons in many newer files, but some older reducer and route files omit semicolons, for example `src/Store/Reducers/AppContextReducer.ts` and `src/Routing/RootRouter.tsx`.
- Quotes are mixed. Newer tests and some app entry files use single quotes, while many source modules use double quotes.
- Indentation is mixed between two spaces and four spaces. Match the surrounding file when editing.
- JSX styles are often inline `React.CSSProperties` objects instead of separate CSS files. Global CSS is limited to `src/App.css` and `src/index.css`.

**Linting and TypeScript:**
- ESLint is configured through `package.json` with `react-app` and `react-app/jest`.
- There is no dedicated lint script in `package.json`; `npm run build` is the practical static check through CRACO and CRA.
- `tsconfig.json` has `strict: false`, `allowJs: true`, `skipLibCheck: true`, and `isolatedModules: true`; do not assume strict-null or no-implicit-any coverage.
- CRACO enables type checking and configures Less theme variables in `craco.config.js`.

## Import Organization

**Order:**
1. External packages, for example `react`, `react-redux`, `react-router-dom`, `antd`, `lodash`, and `moment`.
2. Internal aliases, for example `@components`, `@modules`, `@routing`, `@store`, `@common`, and `@hooks`.
3. Relative feature imports, for example `./DishesAdd.widget` and `./DishesManageIngredient/DishDetail.widget`.
4. Static assets, for example `assets/icons/clock (2).png`.

**Grouping:**
- Import grouping is loose and not always alphabetized. Preserve local grouping in existing files.
- Type-only imports are used where needed, for example `import type { PayloadAction }` in `src/Store/Reducers/DishesReducer.ts` and `import type { Page }` in `tests/e2e/fixtures/seedApp.ts`.
- Some files import `React` as a namespace for `React.FunctionComponent`, `React.CSSProperties`, and hooks; newer React JSX runtime is enabled in `tsconfig.json` but namespace imports remain common.

**Path Aliases:**
- `tsconfig.json` and `craco.config.js` define aliases for `@components`, `@modules`, `@routing`, `@store`, `@common`, and `@hooks`.
- Prefer aliases for cross-area imports. Use relative imports inside the same feature folder.

## Error Handling

**Patterns:**
- UI-facing validation often returns a message string or `null`, for example `IngredientUnitHelper.validateRules` in `src/Common/Helpers/IngredientUnitHelper.ts`.
- Network hooks throw for failed GitHub/Gist operations when the caller needs feedback, for example `src/Hooks/useGistBackup.ts` and `src/Hooks/useSharedPublish.ts`.
- Background sync paths catch and ignore expected network failures, for example `src/Hooks/useSharedDataSync.ts`.
- Route-level import/export flows catch errors and show messages in `src/Routing/MasterPage.tsx`.

**Error Types:**
- No custom `Error` subclasses were found.
- Expected user errors are usually surfaced through Ant Design/message wrappers rather than thrown.
- Test code may throw plain `Error` for impossible measurement states, for example `tests/e2e/performance-regression.spec.ts`.

## Logging

**Framework:**
- No application logger abstraction was found.
- `console.log` and `console.error` are used mainly in `src/serviceWorkerRegistration.ts`.

**Patterns:**
- Feature code generally avoids routine logging.
- User-visible failure reporting is usually done through message/modal providers, for example `src/Components/Modal/ModalProvider.tsx` and `src/Routing/MasterPage.tsx`.

## Comments

**When to Comment:**
- Comments are sparse and usually explain subsystem boundaries or non-obvious behavior, for example the shared/personal reducer split in `src/Store/Store.ts` and the sync behavior in `src/Hooks/useSharedDataSync.ts`.
- Avoid adding comments that restate JSX or reducer assignments.

**JSDoc/TSDoc:**
- JSDoc is not a required pattern. A few module-level comments exist, for example `src/Hooks/useSharedDataSync.ts` and `src/Hooks/useGistBackup.ts`.

**TODO Comments:**
- No consistent TODO ownership format was observed.

## Function Design

**Size:**
- Screens and large widgets can be very large, for example `src/Modules/ShoppingList/Screens/ShoppingListDetail.widget.tsx`. New logic is usually safer as small local helpers near the screen or in `src/Common/Helpers` when reusable.
- Heavy derived calculations are commonly wrapped in `useMemo` or `useCallback`; recent performance work uses `src/Hooks/useScheduledCalculation.ts` for deferred expensive calculations.

**Parameters:**
- Props and payloads use object types when the shape is non-trivial, for example `DishRowProps`, `PromptFuncProps`, and Redux payload aliases.
- Utility helpers use simple positional parameters for small calculations, for example `IngredientUnitHelper.toBaseAmount`.

**Return Values:**
- Helpers commonly return `null` for unsupported conversions and string messages for validation failures.
- Components return JSX directly; guard clauses return `null` when rows or modal content are absent.

## Module Design

**Exports:**
- React screens, widgets, helpers, selectors, and actions are primarily named exports.
- Reducers and some route config objects use default exports, for example `src/Store/Reducers/DishesReducer.ts` and `src/Modules/Dishes/Routing/DishesRouteConfig.ts`.
- Component directories use barrel `index.ts` files for public wrapper imports.

**State and Selectors:**
- Redux Toolkit slices live under `src/Store/Reducers`; model shapes live under `src/Store/Models`.
- `src/Store/Store.ts` splits persisted state into `shared` and `personal` reducers. Use `src/Store/Selectors.ts` instead of direct `state.shared.*` or `state.personal.*` access in new feature code.
- Redux Persist serialization is part of app behavior and test setup; changes to slice keys affect `tests/e2e/fixtures/seedApp.ts`.

**UI Composition:**
- Shared wrappers around Ant Design components live under `src/Components` and should be preferred over raw Ant Design imports when a wrapper exists.
- Virtualized list work uses `react-window` plus shared list wrappers, for example `src/Components/List/VirtualListRowFrame.tsx` and `src/Components/List/VirtualListScrollTopButton.tsx`.
- Stable `data-testid` attributes are used for structural E2E hooks in important flows, for example `src/Modules/ShoppingList/Screens/ShoppingListDetail.widget.tsx` and `src/Modules/Home/Screens/Dashboard.screen.tsx`.

---

*Convention analysis: 2026-06-05*
*Update when patterns change*
