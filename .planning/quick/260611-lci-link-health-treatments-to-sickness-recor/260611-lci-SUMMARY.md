---
status: complete
completed_at: "2026-06-11T08:30:15Z"
---

# Quick Task 260611-lci Summary

## Completed

- Linked treatment health records to sickness records with an optional `relatedSicknessId` persisted in household health history.
- Updated the health modal so treatment entries can choose a related sickness, and sickness rows can create a pre-linked treatment quickly.
- Grouped linked treatments under their sickness records while keeping unlinked treatments visible in their own section.
- Polished health history rows to full-width horizontal layouts with icon-only tool buttons aligned right.
- Moved the household food save action into the food section and kept health saving inside the health section.
- Added a personal `currentHouseholdMemberId` marker so one household profile can be marked as `Tôi`.
- Deployed the production build to `docs/` with `docs/manifest.json` preserved.

## Verification

- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- `yarn build` passed with existing CRA/Browserslist/dependency and lint warnings.
