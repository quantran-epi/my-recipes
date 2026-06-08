---
status: complete
task_id: 260608-h2t
slug: isolated-interactive-tour-guide
completed: 2026-06-08
---

# Quick Task Summary

Built the corrected onboarding and guide experience:

- Added a one-time welcome slideshow for first app use, controlled by `my-recipes-welcome-complete-v1` in `localStorage`.
- The welcome flow uses previous/next arrow controls, dot pagination, and core-feature slides before opening the tour.
- Added a separate lazy-loaded `/guide/tour` screen with Ant Design Tour popups and guide-only mock UI targets.
- Limited the interactive tour to critical daily workflows: dashboard, inventory, dishes, dish suggestions, shopping lists, and scheduled meals.
- Kept broader guide documentation available on `/guide`, with the daily tour accessible again from the user guide page.
- Added only a minimal shell flag check for first-use redirect; real feature pages do not receive tour target markup or tour logic.
- Deployed the rebuilt static output to `docs/`, preserving `docs/manifest.json`.

Verification:

- `git diff --check` passed.
- `yarn build` passed with existing CRA/Browserslist/ESLint warnings.
