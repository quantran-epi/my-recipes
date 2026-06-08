# Quick Task 260609-dsp: Dish Suggestor Page, Local Modals, and Tour Targets

## Goal

Add a separate Dish Suggestor page and drawer shortcut, keep nutrition/expense/shopping actions local in modals where requested, refine shopping-list detail action layout, improve tour target focus from list-level to item-level, then deploy.

## Tasks

1. Add a route and drawer shortcut for a standalone Dish Suggestor page, plus a button in the existing Dish Suggestor modal to open that page.
2. Change shopping-list detail nutrition calculator action to open a local modal and place nutrition/edit buttons below the header as equal-width text buttons.
3. On the standalone Dish Suggestor page, make create-shopping-list, nutrition calculator, and expense planner actions open modals on that page instead of navigating away.
4. Update tour target focus so list-introduction steps focus the list and the next step can focus a representative list item.
5. Build, smoke check mobile guide/shopping/suggestor flows, deploy to `docs/` preserving `docs/manifest.json`, commit, and push.

## Verification

- `yarn build`
- Mobile smoke check for guide/tour, shopping-list detail local calculator modal, and standalone dish suggestor page.
- Confirm `docs/manifest.json` is unchanged.
