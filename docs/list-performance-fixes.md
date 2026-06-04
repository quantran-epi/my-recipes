# List Performance Fixes

## Heavy closed modals on ingredient list

- Issue: The ingredient list mounted use-first, stats, and dish suggester widgets even when closed.
- Fix: Mount those widgets only when opened, and lazy-load the dish suggester.
- Improve: Opening the ingredient list does not spend time calculating unused suggestion/stat data.

## Repeated inventory work per ingredient row

- Issue: Each visible ingredient row recalculated inventory amount, expiry, and stock status.
- Fix: Precompute stock snapshots once in the ingredient list screen and pass them to rows.
- Improve: Less repeated work when rows mount, scroll, or rerender.

## Repeated dish graph traversal per dish row

- Issue: Each visible dish row recursively collected included ingredients and steps.
- Fix: Build cached dish summaries once per dish data change and reuse them in rows.
- Improve: Dish list navigation and scrolling avoid repeated recursive scans.

## Closed dish row modals doing work

- Issue: Dish row modal content and export formatting could be prepared while closed.
- Fix: Mount row modals/export only when opened, and guard export text generation.
- Improve: Rows are lighter during initial list render.

## Sidebar waits before navigation

- Issue: Sidebar navigation waited for drawer close animation before route transition.
- Fix: Close the drawer immediately, then start navigation after a short delay instead of waiting for full close.
- Improve: Sidebar navigation feels more responsive and overlaps drawer closing with page transition.
