# Quick Task 260612-une: Fix Smart Planner week planning Monday to Sunday

## Goal

Fix Smart Planner week mode so weekly plans always cover Monday through Sunday for the selected week, instead of starting from the selected day.

## Tasks

1. Normalize week start
   - Add a locale-independent helper that returns the Monday start of a date's week.
   - Normalize week-mode engine input to that Monday.

2. Align Smart Planner UI
   - Make week mode snap the DatePicker value to Monday.
   - Update the date help copy to explain that week planning runs Monday through Sunday.

3. Verify
   - Run `npx tsc --noEmit`.
   - Check Monday/Sunday edge cases with a small Day.js script.
