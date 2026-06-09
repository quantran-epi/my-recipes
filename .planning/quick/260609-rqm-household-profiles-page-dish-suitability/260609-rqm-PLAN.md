# Quick Task 260609-rqm: Household profiles page, dish suitability, scheduled meal cooking, smart meal planner

## Goal

Correct the current product direction after the first Cook Now / Household Profiles pass:

- Remove Cook Now from Dish Suggestor.
- Move household profile CRUD to a clean separate page.
- Add a bottom action in Dish Suggestor to evaluate selected dishes for household members.
- Simplify Cook Now and remove leftovers from cooking-session completion.
- Let scheduled meals launch cooking for one meal or a whole day.
- Add a Smart Meal Planner page for budget, nutrition, and member-favor based day/week suggestions.
- Deploy after verification.

## Tasks

1. Navigation and household profile management
   - Add Household and Smart Meal Planner routes and sidebar entries.
   - Build a dedicated household member profile page with create/edit/delete and clear member preference controls.

2. Dish Suggestor cleanup and suitability evaluation
   - Remove the Cook Now suggestion tab/mode and old inline household editor.
   - Add a bottom action that opens a member suitability modal for currently selected dishes.

3. Cooking and meal planning workflows
   - Simplify Cook Now session UI and remove leftover capture from cooking completion.
   - Add scheduled-meal actions to start/resume cooking for breakfast/lunch/dinner or all meals in a day.
   - Add meal completion leftover capture outside cooking sessions.

4. Smart Meal Planner and deploy
   - Add a Smart Meal Planner UI for day/week suggestions from criteria.
   - Build, copy deployment output to `docs/` preserving `docs/manifest.json`, commit, and push.

## Verification

- `yarn build`
- Confirm `docs/manifest.json` is unchanged during deploy copy.
