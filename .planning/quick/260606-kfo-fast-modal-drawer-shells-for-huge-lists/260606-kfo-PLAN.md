# Quick Task 260606-kfo: Fast Modal And Drawer Shells

**Date:** 2026-06-06
**Task:** Try fast custom shells for huge-list modal and drawer open delay, then deploy for device testing.

## Plan

1. Add selective fast overlay primitives for hot paths only: a fast drawer shell and a fast modal shell.
2. Replace the sidebar drawer shell while preserving primary nav first and deferred secondary tools.
3. Replace only measured large-list content modals: Dishes detail, Ingredient inventory, and Shopping List checklist.
4. Keep dropdown menus and ordinary low-frequency modals unchanged.
5. Verify build, focused app-shell navigation, and performance regression coverage, then deploy with `docs/deployment.md`.

## Verification

- `yarn build`
- `E2E_BROWSER_CHANNEL=chrome yarn test:e2e tests/e2e/app-shell-navigation.spec.ts`
- `E2E_BROWSER_CHANNEL=chrome yarn test:e2e tests/e2e/performance-regression.spec.ts`
- Visual smoke check on mobile viewport for drawer and one fast modal.
