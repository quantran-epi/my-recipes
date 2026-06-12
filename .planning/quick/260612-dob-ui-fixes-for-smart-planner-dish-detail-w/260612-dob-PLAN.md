# Quick Task 260612-dob: UI fixes for Smart Planner and scheduled meal feedback

## Goal

Fix Smart Planner card width regressions, align the household health profile header, replace finished scheduled-meal recooking actions with feedback view/edit, add feedback history by member and date, then deploy the static app.

## Tasks

1. Smart Planner and Household Health polish
   - Ensure Smart Planner result summary and suggestion detail cards stretch to the available modal/panel width.
   - Align the household health profile label to the left next to the heart icon.
   - Verify with `yarn build`.

2. Scheduled meal feedback history
   - Add durable meal feedback history alongside existing per-dish feedback tallies.
   - Upsert feedback history when finishing/editing meal feedback so aggregate tallies do not double count edits.
   - Show finished scheduled-meal slots/dishes as feedback view/edit actions instead of recooking actions.
   - Add per-member/per-date feedback history filters to the completion modal.

3. Deploy
   - Run `yarn build`.
   - Copy `build/` to `docs/` without overwriting `docs/manifest.json` from `build/manifest.json`.
   - Stage documented source/docs paths and push.
