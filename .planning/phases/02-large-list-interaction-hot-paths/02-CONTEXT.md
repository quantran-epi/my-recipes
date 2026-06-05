# Phase 2: Large-List Interaction Hot Paths - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers responsive interaction hot paths for the existing ingredient, dish, and shopping-list virtualized list screens. It should reduce visible freezes when users search/reset, open row menus, open modal/detail shells, and use high-frequency row actions from large lists.

This phase keeps the current virtualized list model and preserves daily cooking/shopping workflows. It does not replace the list UI, perform a major visual redesign, migrate storage/frameworks, or fix online/image/sync/service-worker causes except where they block the list/rendering fix. Online and network cost isolation remains Phase 3; broader navigation/app-shell route responsiveness remains Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Fix Priority
- **D-01:** Fix the measured worst case first: dish-list search/reset. Phase 1 stress evidence recorded `dish-search-reset` at about 13.4s shell-visible and 18.1s content-ready, so this is the primary Phase 2 proof point.
- **D-02:** After the dish-list fix works, apply the proven fix pattern to all three primary list screens: dishes, ingredients, and shopping lists.
- **D-03:** The first proof of success is search/reset responsiveness. Modal/detail open and row-menu open remain Phase 2 hot paths, but the worst measured search/reset delay is the leading before/after comparison.
- **D-04:** If investigation shows the dish-list delay involves both list rendering and online/image/network behavior, fix list/rendering causes in Phase 2 and defer online/image/sync causes to Phase 3 unless they directly block the list fix.

### Interaction Feel
- **D-05:** Visible interactions should acknowledge immediately. Modal/detail/drawer/menu shells should appear promptly, then heavier body content can finish after the shell is visible.
- **D-06:** Use a simple spinner/loading area for deferred heavy content. This matches the existing `DeferredModalContent` pattern and avoids adding a heavier placeholder system.
- **D-07:** Hide the placeholder when the main content is usable, not necessarily when every secondary detail has fully settled.
- **D-08:** Immediate visible feedback applies to all visible Phase 2 interactions: search/reset, modal/detail open, row-menu open, drawer/sidebar feedback where touched, and row actions.

### Row Content Preservation
- **D-09:** Preserve current rich row details by default. Phase 2 should optimize rendering, memoization, selectors, scheduling, and exact precomputation before removing useful information.
- **D-10:** Expensive secondary row details may be deferred until after first paint only if rows remain visually stable: no jumping, resizing, broken-looking placeholders, or changed touch/desktop layout behavior.
- **D-11:** Cached or precomputed row values are allowed only when they remain exact. Do not make rows look faster by showing stale, approximate, or misleading counts/statuses.
- **D-12:** If preserving row detail conflicts with hitting the speed target, escalate the tradeoff before removing details. Planners/executors must not silently simplify useful row content.

### Performance Gates
- **D-13:** After Phase 2 fixes key interactions, automated performance checks for those fixed interactions should become strict regression gates.
- **D-14:** Use a practical strict failure budget for fixed interactions, while keeping the 100 ms shell-visible target as a warning/ideal. Do not make every fixed interaction fail at 100 ms unless later evidence shows it is stable and realistic.
- **D-15:** Continue measuring shell-visible and content-ready timings separately. This protects the immediate-shell decision while still exposing slow body/content work.
- **D-16:** The first strict Phase 2 gates should cover search/reset, modal/detail open, and row-menu open. Avoid pulling every Phase 1 measurement into strict Phase 2 gates if it belongs to Phase 3 online/network work or Phase 4 navigation/app-shell work.

### the agent's Discretion
- The planner may choose the exact rendering/scheduling techniques, such as selector refactors, exact memoized summaries, stable row props, deferred values, `startTransition`, row component boundaries, or targeted test hooks, as long as displayed values remain exact and row layout remains stable.
- The planner may choose practical strict budgets using Phase 1 evidence and post-fix measurements, but must keep separate shell-visible/content-ready reporting and preserve the 100 ms shell warning target.
- The planner may decide whether Phase 2 needs one shared list optimization utility or screen-local fixes. Prefer existing codebase patterns and avoid broad abstractions unless they remove real duplication across the three list screens.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Context
- `.planning/PROJECT.md` - Product scope, v1.0 responsiveness goal, out-of-scope boundaries, and confirmation that the primary large-list screens use virtualization rather than page-level pagination.
- `.planning/REQUIREMENTS.md` - Phase 2 requirement mapping: `LIST-01`, `LIST-02`, `LIST-03`, and `TEST-02`.
- `.planning/ROADMAP.md` - Phase 2 goal, success criteria, canonical refs, and planned work items.
- `.planning/phases/01-measurement-and-performance-harness/01-CONTEXT.md` - Phase 1 decisions for dataset scale, timing targets, online/offline modes, shell-visible vs content-ready measurement, and warning policy.
- `.planning/phases/01-measurement-and-performance-harness/01-VERIFICATION.md` - Phase 1 verification evidence and the measured stress `dish-search-reset` delay.

### Codebase Maps
- `.planning/codebase/CONCERNS.md` - Known virtualized-list fragility, client-side list/search scaling limits, heavy main-thread calculations, and testing gaps.
- `.planning/codebase/STRUCTURE.md` - Source layout and the primary list, modal, routing, store, and test file locations.
- `.planning/codebase/TESTING.md` - E2E/performance test patterns. Note: Phase 1 context and verification supersede older Playwright wiring notes in this map.

### Existing Performance And Test Harness
- `tests/e2e/performance-regression.spec.ts` - Existing regression smoke checks, daily large-list timing sample, row spacing/drag behavior tests, and current evidence-writing pattern.
- `tests/e2e/performance-baseline.spec.ts` - Baseline measurements for drawer, dish row menu, dish detail modal, detail route navigation, and dish search reset across daily/stress datasets and network modes.
- `tests/e2e/fixtures/performanceReport.ts` - `measureInteraction`, shell-visible/content-ready timing, warnings, budgets, and performance evidence output helpers.
- `tests/e2e/fixtures/performanceSeed.ts` - Daily/stress dataset definitions and seeded large-list data shape.
- `tests/e2e/fixtures/seedApp.ts` - Redux Persist-compatible localStorage seeding, network mode setup, service-worker/cache cleanup, and image/GitHub stubbing.

### Source Integration Points
- `src/Modules/Dishes/Screens/DishesList.screen.tsx` - Primary Phase 2 starting point; includes dish filtering/search reset, row summaries, row menu, detail modal, cooking modal, image row content, and row prop boundaries.
- `src/Modules/Ingredient/Screens/IngredientList.screen.tsx` - Ingredient large-list screen; includes search/filter reset, stock snapshot derivation, inventory/details modals, and virtual row props.
- `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx` - Shopping-list large-list screen; includes search/filter reset, row actions, add/calendar modals, and row prop boundaries.
- `src/Components/Modal/Modal.tsx` - Shared Ant Design modal export and `DeferredModalContent` implementation for immediate shell plus deferred body content.
- `src/Components/List/VirtualListRowFrame.tsx` - Shared virtual row frame, fixed row layout assumptions, scroll/touch click suppression, and row wrapper behavior.
- `src/Components/List/VirtualListScrollTopButton.tsx` - Shared virtual-list scroll helper used by the primary list screens.
- `src/Store/Selectors.ts` - Existing selector and lookup-map patterns that may support exact precomputation/memoization.
- `src/Store/Store.ts` - Redux Persist shared/personal state boundary; tests and optimizations must preserve current persisted data shape.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DeferredModalContent` already defers modal body mounting by two animation frames. Phase 2 can reuse or refine this pattern, but must still ensure modal/detail shells become visible promptly.
- `measureInteraction` and `collectInteractionWarnings` already support separate shell-visible/content-ready timings and strict/ warning behavior. Phase 2 should convert fixed hot paths from warning-first baselines to practical strict regression gates.
- `performanceSeed.ts` provides daily and stress datasets for ingredients, dishes, and shopping lists. Use these rather than inventing separate large-list fixtures.
- `VirtualListRowFrame` centralizes row frame layout and touch/scroll click suppression. Any row layout changes must preserve spacing, touch behavior, and fixed-row-height assumptions.

### Established Patterns
- The three primary list screens use `react-window` fixed-height lists with row components and `rowProps`. Phase 2 should optimize inside this existing model rather than replacing it.
- The list screens already use `useMemo`, `useCallback`, debounced search input, sorted filtered arrays, and memoized row components. Planning should inspect whether dependencies, row props, or per-row derivations still force unnecessary rerenders.
- Current dish rows compute rich summaries, render image/status/tag/count/action surfaces, and open multiple modals. Preserve the visible information while moving expensive exact work out of the interaction path where possible.
- Existing E2E style favors seeded app state, real user flows, stable `data-testid` hooks, visible text/role assertions, and JSON evidence under `test-results/performance/`.

### Integration Points
- `DishesList.screen.tsx` is the first implementation target because Phase 1 evidence identified dish-list search/reset as the worst measured delay.
- After the dish-list fix, apply the pattern to `IngredientList.screen.tsx` and `ShoppingList.screen.tsx` so Phase 2 does not become dish-only.
- Modal/detail content should keep current workflows while making the shell appear immediately and making heavy bodies usable as soon as their primary content is ready.
- New or tightened tests should use the Phase 1 harness and should not require live GitHub/network access for Phase 2 verification.

</code_context>

<specifics>
## Specific Ideas

- The user wants Phase 2 to use Phase 1 measurement evidence to prove improvement rather than relying on subjective feel.
- The user selected a worst-case-first strategy: fix the dish-list search/reset delay, then apply the proven pattern to ingredient and shopping-list screens.
- The user prefers immediate visible feedback over waiting for full content readiness.
- The user wants current rich row information preserved unless evidence forces an explicit tradeoff discussion.

</specifics>

<deferred>
## Deferred Ideas

- Online/image/sync/service-worker causes remain Phase 3 unless they directly block the Phase 2 list/rendering fix.
- Broader drawer/navigation/app-shell route transition work remains Phase 4 unless a narrow shell-feedback fix is required by a Phase 2 list interaction.
- Major row content removal, broad visual redesign, list replacement, framework migration, backend migration, and storage migration remain out of scope for Phase 2.

</deferred>

---

*Phase: 2-Large-List Interaction Hot Paths*
*Context gathered: 2026-06-05*
