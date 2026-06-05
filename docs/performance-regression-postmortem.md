# Performance Regression Postmortem

Date: 2026-06-05

## Summary

The original performance plan improved CPU, selector, hidden-render, image, route-feedback, and scheduled-calculation costs. It was useful, but it was not broad enough to explain or prevent the remaining large-list problems.

The reported dish and ingredient list issues were mostly virtualization and interaction-quality failures: row measurement, local page size, gesture intent, and per-row modal ownership. Those are performance problems because they directly affect perceived responsiveness, but they are not solved by calculation scheduling alone.

## Reported Problems

- Dish list first-to-second row gap was larger than later row gaps.
- Ingredient rows could be clipped when wrapped badges or cards needed more vertical space.
- Scrolling over list rows could accidentally open detail or inventory modals.
- First scroll after opening a list sometimes felt unreliable.
- Large dish and ingredient lists still made sidebar or modal interactions feel slow.

## Why Problems Still Existed

1. The first plan was CPU-heavy-work focused.

   It removed hidden work and repeated calculations, but it did not require dynamic row measurement or visual spacing assertions after list virtualization. A fixed or underestimated row height can make a fast list look broken.

2. The first plan did not include local list paging.

   Virtualization limits DOM nodes, but the screen can still prepare props, summaries, row metadata, and measurements for a large filtered result. Paging the local filtered array keeps first paint and early interaction bounded.

3. The first plan did not define scroll intent as an acceptance criterion.

   Touch and pointer gestures can end with a click event. Without a row-level guard, a scroll gesture over a button can become an accidental modal open.

4. The first plan did not reduce row-owned modal state enough.

   If every visible ingredient row owns inventory modal state and modal JSX, opening unrelated UI still carries extra row work. Moving inventory modal ownership to the parent gives the list one modal path instead of many row-owned modal paths.

## Was The Plan Good Enough?

No, not for overall perceived performance.

It was good for CPU, selector, hidden work, and network budgets. It was incomplete for virtualized list layout, dynamic row height, local paging, scroll gesture safety, and modal/sidebar responsiveness while large lists are visible.

## Updated Plan

The performance plan now includes `PERF-08: Dynamic Virtualized List Paging And Interaction Guard` in `docs/performance-audit-plan.md`.

That item requires future list work to verify:

- Dynamic row height measurement for rich dish and ingredient cards.
- Consistent row spacing, including the first-to-second dish gap.
- No clipping for ingredient cards with wrapped content.
- Local incremental paging over large filtered arrays.
- Drag-scroll suppression so scroll gestures do not open modals.
- Normal intentional clicks still opening the expected modal/action.
- Parent-owned modal state when row-owned modal state would multiply list work.
- Focused Playwright coverage for spacing, clipping, paging, drag intent, and smoke timing.

## Implemented Fixes

- Added dynamic mode to `src/Components/List/VirtualListRowFrame.tsx`.
- Added `src/Hooks/usePagedVirtualItems.ts` and exported it from `src/Hooks/index.ts`.
- Updated dish and ingredient lists to use `react-window` dynamic row heights.
- Added local incremental paging for filtered dish and ingredient arrays.
- Added lightweight loaded-count status chips while more local items remain.
- Moved ingredient inventory modal state from each row to `IngredientListScreen`.
- Removed the stale row-owned inventory modal block.
- Expanded e2e fixture ingredients to 52 rows while preserving shopping-list cost totals.
- Extended `tests/e2e/performance-regression.spec.ts` for dish gaps, ingredient clipping, paging, drag-scroll suppression, and intentional modal opening.

## Verification

- Build: `npm.cmd run build` passed with the existing lint/dependency warning set.
- Performance e2e: `$env:E2E_PORT='5000'; npx.cmd playwright test tests/e2e/performance-regression.spec.ts --reporter=list` passed 4/4.
- Fixture e2e: `$env:E2E_PORT='5000'; npx.cmd playwright test tests/e2e/shopping-list.spec.ts -g "shows separate remaining-cart" --reporter=list` passed 1/1.

## Residual Risk

The checks use deterministic seeded data, not every production-sized dataset or device class. `PERF-08` should remain a required audit gate for future virtualized list, row-action, modal, and local paging changes.
