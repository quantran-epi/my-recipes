# Quick Task 260609-uxu: Remove small button usage

## Goal

Prevent ugly Ant Design small buttons from being used in the app.

- Remove `size="small"` / `size='small'` from app button usage.
- Tighten the shared `Button` wrapper type so `size='small'` is no longer accepted there.
- Build and deploy after verification.

## Verification

- `yarn build`
- Copy `build/` to `docs/` excluding `build/manifest.json`.
- Confirm `docs/manifest.json` remains unchanged.
