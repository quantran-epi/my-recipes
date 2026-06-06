# Quick Task 260606-idq: Disable Automatic Remote Shared-Data Checks

**Date:** 2026-06-06
**Task:** Disable automatic remote shared-data checks and make shared sync run only from the manual drawer button.

## Plan

1. Remove the startup shared-data sync check from `AppInitializer` so opening the app no longer requests `shared-manifest.json` automatically.
2. Refactor `useSharedDataSync` into reusable manual check helpers that compare the remote manifest against locally synced versions without a startup effect.
3. Update the drawer sync button in `MasterPage` to check the manifest on click, show the existing selective sync modal when changes exist, and report “already up to date” when nothing changed.

## Verification

- Run `yarn build`.
- Confirm source no longer calls `useSharedDataSync()` from startup initialization.
- Confirm `shared-manifest.json` fetch only lives behind manual sync logic.
