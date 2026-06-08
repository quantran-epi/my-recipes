---
status: complete
completed_at: "2026-06-08T16:04:33Z"
---

# Quick Task 260608-sug Summary: Simple User Guide and Shopping Detail Actions

## Completed

- Reworked the User Guide page from an interactive checklist into a simple, static, mobile-friendly overview.
- Kept only two intentional guide actions on the page: replay welcome onboarding and start the interactive tour.
- Updated guide copy to note that welcome onboarding and tour use real app UI pieces with illustrative data isolated from real user data.
- Changed shopping-list detail nutrition calculator and edit actions into square icon-only buttons aligned horizontally on the right side of the detail header.
- Deployed the rebuilt static app to `docs/` while preserving `docs/manifest.json`.

## Verification

- `yarn build` completed successfully; remaining warnings are existing warnings outside this change.
- Mobile Playwright smoke passed for `/my-recipes/guide` and a seeded `/my-recipes/shoppingList/detail?shoppingList=sl-smoke` route.
- Smoke check verified the guide page has no horizontal overflow and the shopping detail nutrition/edit actions are square, adjacent, and ordered horizontally.
- Confirmed `docs/manifest.json` was not overwritten by deployment copy.
