---
status: complete
quick_id: 260607-nde
slug: nutrition-feature-deploy
created: 2026-06-07
---

# Nutrition Feature Deploy

## Goal

Deploy the ingredient nutrition feature so the production app can show nutrition UI and sync populated nutrition data.

## Scope

- Build the app.
- Copy build output to `docs/`, excluding `build/manifest.json`.
- Commit deployed docs output and push to remote.

## Verification

- Run `yarn build`.
- Confirm deployed shared ingredients include nutrition.
