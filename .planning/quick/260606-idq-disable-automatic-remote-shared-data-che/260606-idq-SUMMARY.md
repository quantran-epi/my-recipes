---
status: complete
quick_id: 260606-idq
date: 2026-06-06
---

# Quick Task 260606-idq Summary

## Outcome

Remote shared-data checks no longer run automatically when the app opens. The user now has to open the sidebar and click `Đồng bộ dữ liệu mới` to check the remote shared manifest.

## Changes

- Removed startup sync rendering from `AppInitializer`.
- Refactored `useSharedDataSync` into a manual check hook with `checkNow()` and no automatic effect.
- Updated the sidebar sync button to check `shared-manifest.json` on demand and open the existing selective sync modal only when remote changes exist.
- Updated performance E2E coverage to assert no startup manifest request, then verify the manual sync modal flow.

## Verification

- `yarn build` passed with existing unrelated lint warnings.
- `E2E_BROWSER_CHANNEL=chrome yarn test:e2e tests/e2e/app-shell-navigation.spec.ts` passed, 2 tests.
- `E2E_BROWSER_CHANNEL=chrome yarn test:e2e tests/e2e/performance-regression.spec.ts --grep "PERF-08|PERF-09"` passed, 4 tests.
