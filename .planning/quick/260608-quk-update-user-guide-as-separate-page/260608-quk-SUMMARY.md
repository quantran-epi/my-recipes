# Quick Summary: Update User Guide As Separate Page

## Changes

- Rebuilt the user guide as a standalone routed page at `/guide` instead of a drawer modal.
- Split the guide into separate selectable pages using `?page=` query state.
- Updated guide content for current workflows: start flow, ingredients, dishes, suggestions, shopping, scheduled meals, nutrition calculator/goals, analytics, templates, data/backup, search, and data quality.
- Changed the drawer user-guide button to navigate to the new guide page.

## Verification

- `yarn build` passed on 2026-06-08.
- Build completed with existing unrelated CRA/Browserslist and ESLint warnings from older files.

## Deployment

- Deployment requested after completion; included in the next app deployment.
