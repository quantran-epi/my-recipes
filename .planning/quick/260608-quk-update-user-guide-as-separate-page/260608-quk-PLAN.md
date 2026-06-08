# Quick Plan: Update User Guide As Separate Page

## Objective

Update the user guide content and move it from a drawer modal into a separate routed guide page with guide categories split into separate in-page pages.

## Scope

- Refactor `UserGuide.screen.tsx` into a standalone page.
- Add a `/guide` route and route helper.
- Change the drawer user-guide button to navigate to the page instead of opening a modal.
- Update guide content for current workflows including nutrition calculator, nutrition goals, analytics, templates, data health, scheduled meals, shopping lists, ingredients, dishes, suggestions, search, and backup.
- Run `yarn build`.
