# Quick Task 260609-ddm: Dish Duration Modal Input and Preset Layout

## Goal

Fix the dish duration editor so clearing a minute input does not toggle its phase switch, and make the quick duration preset buttons align horizontally with wrapping instead of stacking vertically.

## Tasks

1. Inspect `DishDuration.widget.tsx` and the dish-list duration modal entry path.
2. Prevent minute input interactions from bubbling into the phase toggle row/button.
3. Change the preset button layout to a horizontal wrapping layout that remains mobile-friendly.
4. Run a production build check and update GSD summary/state.

## Verification

- `yarn build`
- Review the changed widget structure for stable mobile layout and no unrelated edits.
