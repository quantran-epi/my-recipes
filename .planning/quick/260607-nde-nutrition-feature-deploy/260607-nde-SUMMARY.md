---
status: complete
quick_id: 260607-nde
slug: nutrition-feature-deploy
completed: 2026-06-07
---

# Summary

Deployed the ingredient nutrition feature so the production app bundle includes the nutrition UI and the shared sync data includes nutrition values.

## Deployment

- Ran `yarn build`.
- Copied `build/` into `docs/` excluding `build/manifest.json`.

## Verification

- Passed: `yarn build`.
- Confirmed deployed shared ingredients with nutrition: 165/165.
- Confirmed shared manifest ingredient changes: 165.
