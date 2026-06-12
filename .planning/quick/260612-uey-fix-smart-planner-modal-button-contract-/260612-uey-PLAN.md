# Quick Task 260612-uey: Fix Smart Planner modal button contract and detail help placement

## Goal

Make Smart Planner follow the clarified button contract: modal close/cancel/action footers use the normal Button family, ActionButton is not used for Smart Planner standalone actions, and the suggested dish detail help icon sits at the top-right of its score row.

## Tasks

1. Smart Planner modal button cleanup
   - Replace ActionButton close/cancel controls in Smart Planner modal footers with normal Button controls.
   - Convert the non-list "Đổi phương án khác" action to a normal primary Button.

2. Suggested dish detail help placement
   - Move score-methodology help icons to the top-right corner of their score row cards.
   - Preserve circular help-icon styling.

3. Contract docs and verification
   - Update ActionButton guidance to reserve it for repeated item action rows.
   - Run `npx tsc --noEmit`.
