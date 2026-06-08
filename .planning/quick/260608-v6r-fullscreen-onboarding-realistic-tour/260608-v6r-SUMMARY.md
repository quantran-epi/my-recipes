---
status: complete
task_id: 260608-v6r
slug: fullscreen-onboarding-realistic-tour
completed: 2026-06-08
---

# Quick Task Summary

Rebuilt the onboarding and tour experience to match the corrected product direction:

- Moved welcome and tour routes outside the normal app shell so both render full screen.
- Redesigned welcome as a full-screen slide carousel with side arrow controls, bottom dot pagination, large feature copy, and app-preview visuals.
- Replaced the generic Ant Design Tour popover with a custom spotlight overlay and fixed-position popup panel to avoid mobile overflow, overlap, and bad placement.
- Rebuilt the tour around realistic fake app screens that mirror the real mobile shell, header, bottom tabs, dashboard cards, inventory rows, dish cards, suggestor cards, shopping progress, and scheduled meal day view.
- Limited the tour to main daily workflows only: dashboard, inventory, dishes, dish suggestions, shopping lists, and scheduled meals.
- Kept real feature pages untouched; the tour uses guide-only fake data and only the lightweight first-use localStorage redirect remains in the app shell.
- Deployed the rebuilt static output to `docs/`, preserving `docs/manifest.json`.

Verification:

- `yarn build` passed with existing CRA/Browserslist/ESLint warnings.
- `git diff --check` passed.
- Playwright with local Chrome checked mobile `390x844` welcome and tour routes: no console errors, no page overflow, and tour popup did not overlap the highlighted target.
