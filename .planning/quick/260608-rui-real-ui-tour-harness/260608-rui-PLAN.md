# Quick Task 260608-rui: Real UI Tour Harness

## Goal

Change the onboarding and tour preview implementation so guide screens render real app UI components with fake isolated data, not hand-built mock UI, while preserving real app state, real page performance, and normal usage.

## Tasks

1. Inspect real page dependencies for the daily guide screens and identify the safest embeddable components or screen-level harness boundaries.
2. Build a guide-only fake data/provider layer that does not use persisted real user data and does not write to localStorage.
3. Replace hand-built tour fake screens with real UI pieces rendered inside the guide module using fake rich data.
4. Update welcome carousel mini previews to use the same real UI preview pieces where practical.
5. Fix the welcome carousel bottom/right arrow click issue.
6. Verify mobile layout, no state leakage, no horizontal overflow, no tour popup overlap, then deploy to `docs/`, commit, and push.

## Verification

- `yarn build`
- `git diff --check`
- Mobile visual/geometry check for welcome and tour routes.
- Confirm guide routes do not read or mutate the real persisted store.
- Confirm `docs/manifest.json` is not overwritten during deployment.
