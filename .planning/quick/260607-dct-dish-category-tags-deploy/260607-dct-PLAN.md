---
status: complete
quick_id: 260607-dct
slug: dish-category-tags-deploy
created: 2026-06-07
---

# Dish Category Tags Deploy

## Goal

Populate missing dish category tags in shared dish data, refresh the shared sync manifest, deploy the current app build, and push to remote so the app can sync the updated shared data.

## Scope

- Add dish `tags` to the shared dish dataset.
- Update split shared sync files and legacy shared data files.
- Build the app and copy production output into `docs/` without replacing `docs/manifest.json`.
- Commit and push the changes.

## Verification

- Verify all shared dishes have at least one tag.
- Run `yarn build`.
