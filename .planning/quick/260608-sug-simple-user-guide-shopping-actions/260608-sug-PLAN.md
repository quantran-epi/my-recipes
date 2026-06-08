# Quick Task 260608-sug: Simple User Guide and Shopping Detail Actions

## Goal

Simplify the User Guide page into an elegant, focused information page with the interactive experience limited to the tour, keep onboarding welcome entry clear, update shopping-list detail header actions to compact square icon-only buttons, then deploy.

## Tasks

1. Replace the checklist/progress-heavy User Guide page with a simpler overview focused on daily flows, data setup, planning, nutrition, and backup.
2. Keep clear entry points to replay the welcome onboarding and start the interactive tour; mention the onboarding uses real app UI previews.
3. Update shopping list detail nutrition calculator and edit actions to square icon-only buttons aligned horizontally on the right.
4. Verify build and mobile layout smoke checks, copy build output into `docs/` without overwriting `docs/manifest.json`, commit, and push.

## Verification

- `yarn build`
- Mobile smoke check for `/my-recipes/guide` and a shopping list detail route.
- Confirm `docs/manifest.json` remains unchanged.
