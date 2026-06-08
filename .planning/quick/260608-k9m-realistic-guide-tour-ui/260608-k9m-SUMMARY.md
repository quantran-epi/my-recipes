---
status: complete
task_id: 260608-k9m
slug: realistic-guide-tour-ui
completed: 2026-06-08
---

# Quick Task Summary

Updated the guide module so onboarding and tour previews look much closer to the real app while staying isolated from production feature screens:

- Reworked the welcome carousel slide previews to use the app-like mobile shell, feature icons, bottom tab preview, realistic section cards, and workflow-specific controls for dashboard, inventory, scheduled meals, and shopping.
- Kept welcome copy brief and user-facing so each slide explains what the feature is for without long instructional text.
- Expanded the tour fake pages with richer realistic data: inventory search/filter rows and batches, dish list rows with tags and actions, fridge-style suggestion summaries, shopping progress and item rows, and scheduled meal date/planning controls.
- Added a `Xem giới thiệu` trigger on the User Guide page so users can replay the welcome onboarding at any time.
- Fixed welcome carousel controls to stay visible in the mobile viewport even when the preview content is taller than the screen.
- Deployed the rebuilt static output to `docs/`, preserving `docs/manifest.json`.

Verification:

- `yarn build` passed with existing CRA/Browserslist/ESLint warnings.
- `git diff --check` passed.
- Local Chrome mobile checks at `390x844` covered `/guide/welcome` and tour entries for start, inventory, dishes, suggestions, shopping, and meals: no console errors, no horizontal overflow, welcome controls visible, and tour popup did not overlap the highlighted target.
