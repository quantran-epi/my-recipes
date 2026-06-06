# Quick Task 260606-jfn: Restore Bottom Tab Style

**Date:** 2026-06-06
**Task:** Revert bottom tab navigator toward the previous style and add only small focus polish.

## Plan

1. Restore `BottomTabNavigator` to the earlier compact dock structure with icon+label side buttons and raised center suggestor.
2. Add only light focus improvements: clearer active side-tab surface and a slightly stronger center-button state when suggestor is open.
3. Verify build and app-shell navigation still pass.

## Verification

- Run `yarn build`.
- Run focused app-shell navigation E2E.
