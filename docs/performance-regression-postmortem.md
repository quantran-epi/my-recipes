# Performance Regression Postmortem

Date: 2026-06-05

## Summary

The performance plan did improve the app in the areas it was designed to cover: heavy render work, selector lookup cost, lazy modal/tab bodies, route feedback, image budget, scheduled calculations, and performance smoke tests.

However, the plan was not good enough for the regressions reported after completion. It did not explicitly audit fixed-height virtualized list layout, scroll gesture intent, or first-scroll behavior. Those are perceived-performance and interaction-quality problems, not only CPU/network problems.

## Reported Problems

- List UI looked broken because list items were condensed and not separated correctly.
- Scrolling through a list could accidentally open a detail or inventory modal.
- On first opening a list, scrolling sometimes did not work until repeated attempts.
- Large dish and ingredient lists still made modal/sidebar opening feel a bit slow.

## Why The Problems Survived The Original Plan

1. The plan optimized heavy work, but did not require visual layout acceptance checks.

   The list screens were converted to fixed-height virtualization. Fixed-height virtualization is fast, but it is fragile: if `rowHeight` is too small or row content is rendered directly into the absolute row container without a stable inner frame, cards can appear compressed or overlap. The previous plan had no automated or manual requirement to verify row separation after virtualization.

2. The plan did not distinguish scroll/drag intent from click intent.

   Row actions still used normal click handlers. During wheel/touch/pointer scrolling, a browser can still dispatch a click at the end of a gesture. Without drag-click suppression around the row, scroll intent could become an accidental modal open.

3. The plan did not audit first-scroll interference.

   Dish, ingredient, and shopping-list screens reset the virtual list to the top whenever filters/search changed. That effect also ran on initial mount, which could fight the first user scroll right after the page opened.

4. The plan reduced hidden heavy work, but did not fully reduce visible-card rerender churn.

   Opening a modal or sidebar changes React state while a large list is visible. Even when hidden modal bodies are lazy, visible rich row cards can still rerender. Memoizing the heavy card components and stabilizing virtual-list props reduces that extra work.

## Was The Performance Plan Not Good Enough?

Yes, for this class of bug it was not good enough.

It was a useful CPU/network/lazy-render plan, but it was incomplete as a user-perceived performance plan. It treated performance mostly as main-thread cost, hidden work, request count, and modal shell latency. It should also have treated layout stability, scroll intent, and touch/wheel behavior as acceptance criteria for any list virtualization work.

## Fixes Implemented

- Added `src/Components/List/VirtualListRowFrame.tsx` and exported it from `src/Components/List/index.ts`.
- Wrapped dish, ingredient, and shopping-list virtual rows in the shared row frame.
- Increased fixed row heights for dish, ingredient, and shopping-list list rows.
- Added pointer/touch drag detection to suppress accidental click events after scroll gestures.
- Added `touchAction: "pan-y"` and `overscrollBehavior: "contain"` to list rows and stable virtual-list styles.
- Skipped initial mount scroll reset on dish, ingredient, and shopping-list list screens.
- Memoized heavy dish, ingredient, and shopping-list row item components.
- Added focused Playwright regression coverage for row spacing, first scroll, drag-scroll suppression, and intentional modal opening.

## Plan Update

`docs/performance-audit-plan.md` now includes `PERF-08: Virtualized List Interaction And Layout Guard`.

That item makes these checks explicit for future work:

- Fixed-height virtualized rich rows must have adequate row height and a stable row frame.
- List rows must be visually separated and not clipped or overlapped.
- First scroll after opening a list must work immediately.
- Dragging or scrolling over a row action must not open a modal.
- A normal intentional click must still open the expected action.
- Large visible row cards should avoid unnecessary rerenders when overlay/sidebar state changes.

## Verification

- Build: `npm.cmd run build` passed with the existing lint/dependency warning set.
- E2E: `$env:E2E_PORT='5000'; npx.cmd playwright test tests/e2e/performance-regression.spec.ts` passed 3 tests.
- Visual evidence inspected:
  - `test-results/performance/ingredient-list-visual.png`
  - `test-results/performance/dish-list-visual.png`
  - `test-results/performance/shopping-list-visual.png`

## Residual Risk

The automated test currently exercises seeded regression data, not every possible production-size dataset. The updated plan keeps `PERF-08` as a standing audit gate so future virtualized list changes must include layout and gesture validation, not only timing checks.
