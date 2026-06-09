---
status: complete
completed_at: 2026-06-09T15:20:25Z
---

# Quick Task 260609-uxu Summary

Removed small Ant Design button sizing from the app and deployed the rebuilt static output.

## Completed

- Removed `size="small"` usage from shared app `Button` call sites.
- Routed the remaining form image upload button through the shared guarded `Button` wrapper.
- Tightened the shared `Button` wrapper type so `size="small"` is no longer accepted.
- Tightened modal OK/Cancel button props and defensively strips `size="small"` if a caller bypasses types.
- Kept `ServingSizeInput` compact where requested while mapping its internal buttons to supported app button sizes.
- Rebuilt and copied production output to `docs/` while preserving `docs/manifest.json`.

## Verification

- `rg -n "<Button[^>]*size=['\"]small['\"]|size=['\"]small['\"][^>]*<Button" src --glob '*.tsx' --glob '*.ts'` returned no matches.
- `yarn build` passed with existing CRA/ESLint/Browserslist warnings.
- `rsync -a --exclude 'manifest.json' build/ docs/`
- `shasum -a 256 docs/manifest.json` stayed `c22345c3d7a1ddf32e8e5049a68ca97fdcce4839e89aa4de4f45a55ba52bb932`.
