# Quick Task 260612-uti: Fix Smart Planner meal slot dish card width and fact rows

## Goal

Fix Smart Planner day/week meal-slot dish cards so each suggested dish fills the slot width and the duration / need-to-buy facts render as separate stable rows instead of wrapping inside one line.

## Tasks

1. Normalize card width
   - Give meal-slot dish cards a dedicated full-width class.
   - Replace the Ant Space vertical wrapper around multiple meal-slot dishes with a plain full-width flex column.

2. Stabilize facts inside cards
   - Render duration, need-to-buy amount, and leftover facts as separate rows.
   - Keep fact rows single-line with ellipsis so long values do not increase card height.

3. Verify and commit
   - Run `npx tsc --noEmit`.
   - Commit only the focused source and GSD tracking files.
