# Large List Modal And Sidebar Performance Note

Date: 2026-06-06

## Short Answer

The large list pages are faster than the original baseline, especially for search reset, row rendering, online/offline behavior, image/network isolation, and app-shell navigation feedback. Opening heavy modal content can still have a small delay because that work still runs on the browser's main UI thread, but the sidebar drawer should now show its navigation shell first instead of waiting for every drawer tool to rebuild.

In simple words: the app now avoids loading too many rows and avoids letting network/image work block the list, but the browser still has to pause briefly to build the modal or drawer, prepare its animation, and sometimes finish list calculations before it can show the overlay.

## Why It Still Hangs A Little

1. The list pages use virtualization and paged loading, but they still do some whole-list calculations.

   The Dishes, Ingredients, and Shopping List screens all use `usePagedVirtualItems`. That means they only pass a smaller loaded slice into the virtual list, starting with 40 items and loading more as the user scrolls.

   That helps a lot because the app does not render every row at once. But it does not remove every cost. The screens still calculate filtered arrays, sorted arrays, counts, stock snapshots, tags, and status totals across the full data set when search/filter/data changes.

2. Modal and drawer opening still happens on the same browser thread as the list.

   When you tap a row action, modal button, or sidebar button, React and Ant Design still need to mount an overlay shell, mask, focus handling, scroll lock, and animation. If the large list just scrolled, filtered, loaded another page, or recalculated row data, the overlay click can wait behind that work for a short time.

3. Some modal content is intentionally deferred.

   The app uses `DeferredModalContent`, which waits about two animation frames before mounting heavy modal bodies. This is good because the modal shell can show before the heavy content loads. Visually, though, you may still notice a short spinner or content delay after the modal appears.

4. The sidebar drawer still has secondary tool work, but it no longer has to block the first navigation shell.

   The sidebar still contains navigation icons/images, sync controls, backup controls, admin controls, cooking history entry points, and guide entry points. Phase 4 splits that work so the logo/title and route links appear first, then the heavier tool sections appear after the drawer shell has painted.

5. The current automated numbers prove this is improved but not instant.

   Phase 3 passed the practical performance gate, but the ideal target is still 100 ms for a shell to appear. Some overlays are still above that ideal:

   | Check | Latest online shell timing |
   |---|---:|
   | Dish row menu open | 880 ms |
   | Shopping-list row menu open | 625 ms |
   | Ingredient inventory modal open | 1541 ms |
   | Dish search reset shell | 27 ms |
   | Ingredient search reset shell | 40 ms |
   | Shopping-list search reset shell | 29 ms |

   This means search/filter reset is now visibly fast, but overlay opening still has remaining work to improve.

## What Was Already Improved

1. Large lists use virtualized rendering plus paged load-more.

   Confirmed pages:

   - `src/Modules/Dishes/Screens/DishesList.screen.tsx`
   - `src/Modules/Ingredient/Screens/IngredientList.screen.tsx`
   - `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx`

   Each page uses `usePagedVirtualItems`, passes only `visibleItems` into the virtual list, and calls `loadMore...()` from `onRowsRendered` when the scroll position reaches the loaded edge.

2. Online mode should no longer feel much worse than offline mode.

   Phase 3 moved startup shared-data sync checks away from the first interaction path. The app now waits before checking GitHub shared data, waits for a quiet interaction window, and uses idle scheduling when available.

3. Dish list images are less likely to block the list.

   Dish list images now use a list surface with stable dimensions and fallback-first behavior. Detail modals still keep the richer image behavior.

4. Shared sync prompt work is progressive.

   The sync modal can show the basic prompt first, then fetch full shared data and compute heavier impact warnings after the shell is already visible.

5. The comparison gate passed online, offline, and slow network modes.

   Latest Phase 3 evidence files:

   - `test-results/performance/perf-08-phase3-daily-online-normal.md`
   - `test-results/performance/perf-08-phase3-daily-browser-offline.md`
   - `test-results/performance/perf-08-phase3-daily-mocked-slow-network.md`

6. Phase 4 adds app-shell navigation feedback and drawer shell-first rendering.

   New checks measure drawer shell open, drawer route navigation, bottom-tab navigation, global-search navigation, and dish detail-route navigation from a large list. Evidence is written to:

   - `test-results/performance/perf-10-phase4-app-shell-navigation.md`

   The practical Phase 4 budgets are drawer shell `1000 ms`, route feedback `1000 ms`, and route content-ready `5000 ms`. Drawer shell now passes as an enforced check. Latest route content-ready timings are under `5000 ms`, while route feedback still has warning misses above `1000 ms` for the next tightening pass. The ideal `100 ms` target remains warning evidence.

## What You Can Check By Eye

Use a large Dishes, Ingredients, or Shopping List page.

1. Scroll a long list.

   Expected: the app should not draw every item at once. You should see rows continue to appear as you scroll. When more rows are available, the small loaded-count pill can show progress like loaded count over total count.

2. Search, then clear the search.

   Expected: the first visible response should be quick. The list content may still settle after that, but the app should not freeze like the original large-list problem.

3. Compare online and offline behavior.

   Expected: opening the app with internet should not feel much slower than opening it with no internet. Offline should still show local data. Online sync work should not steal the first interaction as much as before.

4. Look at dish list images.

   Expected: rows should keep stable image size. You should see fallback image behavior quickly instead of rows waiting for slow images or jumping layout.

5. Open a row menu or modal.

   Expected: it should be better than before, but it may still have a small pause. If a modal opens with a spinner first, that is the current deferred-content behavior. The remaining goal is to make the shell itself closer to instant.

6. Open the sidebar drawer from a large list.

   Expected after Phase 4: the drawer shell should appear quickly. You should see the logo/title and route links first: `Tổng quan`, `Nguyên liệu`, `Món ăn`, `Kế hoạch chi phí`, `Lịch mua sắm`, and `Thực đơn`. The drawer tools can appear just after that.

7. Tap a drawer route, bottom tab, global-search result, or large-list detail button.

   Expected after Phase 4: route feedback should appear right away with `Đang mở trang`. If you tap the same pending destination repeatedly, it should not stack extra navigation work or leave the app stuck.

8. Check that drawer tools are still there.

   Expected after Phase 4: after the drawer settles, you should still see shared-data sync, Gist backup, cooking history, user guide, and admin account controls. The performance fix should not remove these daily tools.

9. Try normal cooking, shopping, and search workflows.

   Expected after Phase 4: existing cooking, shopping-list, and global-search flows should still work. The app should feel more responsive without becoming a simpler app.

10. If a shared sync prompt appears.

   Expected: the prompt shell and update list should appear before all detailed sync-impact work is finished. The final sync button should wait until required data is ready.

## What This Means For The Next Fix

The remaining modal/sidebar hang is not mainly a pagination problem anymore. Pagination and virtualization already help. Phase 4 improves the app-shell part by making route feedback and the sidebar navigation shell show first. The next performance work should keep tightening heavier overlay content and whole-list recalculation:

- Keep measuring drawer shell and route feedback separately from content-ready timing.
- Pre-render or memoize stable drawer/menu content if drawer tool content still feels late on slower devices.
- Reduce whole-list recalculation when only opening overlays.
- Keep modal shells extremely light and move detail body work after the first paint.
- Continue measuring shell-visible timing separately from content-ready timing.

This matches the current milestone direction: rich features, UI, UX, and performance together, with performance currently focused on large-list app-shell responsiveness.
