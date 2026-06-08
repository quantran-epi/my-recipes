---
status: complete
task_id: 260608-s7j
slug: fix-mobile-scheduled-meal-date-button-wr
completed: 2026-06-08
---

# Quick Task Summary

Completed the requested mobile UI fixes and deploy prep:

- Changed the scheduled meal date chooser into a compact icon-only calendar button so the icon and label cannot wrap onto two lines on mobile.
- Replaced the nutrition dish suggestor details expander with the same small right-side plus/minus affordance used by the fridge dish suggestor.
- Removed hover tooltip wrappers from dish suggestor action buttons so the mobile UI relies on direct icon buttons and accessible labels.
- Rebuilt the production app and copied deployment output into `docs/` while preserving `docs/manifest.json`.

Verification:

- `yarn build` passed with existing CRA/Browserslist/ESLint warnings.
- `rg -n "Tooltip|DownOutlined|RightOutlined" src/Modules/DishSuggester/Screens/DishSuggester.screen.tsx` returned no matches.
