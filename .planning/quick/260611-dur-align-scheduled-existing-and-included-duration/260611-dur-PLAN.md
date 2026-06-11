# Quick Task 260611-dur: Align existing-meal section and include nested dish durations

## Scope

Address the follow-up UI and duration behavior requests:

1. Make the existing scheduled-meal section in the regular add form full width and left/right aligned with the form instead of centered.
2. Enhance dish duration calculations so included dishes contribute to total duration.
3. Show included dish duration as separate rows/sections so users can inspect each dish independently.

## Tasks

1. Patch `ScheduledMealAddWidget` existing-meal panel layout to stretch full width and align text consistently.
2. Add reusable duration breakdown helpers in `DishDurationHelper` for own duration, included dish duration, and total duration with cycle protection.
3. Update dish list duration popover, readonly detail, cooking session, dish suggester, and smart planner duration calculations to use total duration including included dishes where applicable.
4. Run `yarn build`; deploy if the build succeeds.

## Verification

- `yarn build` passes.
- Confirm the helper can sum a dish plus nested included dishes without infinite recursion.
