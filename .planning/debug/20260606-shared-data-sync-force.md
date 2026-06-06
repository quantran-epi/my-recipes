# Shared Data Sync Force Debug

**Date:** 2026-06-06
**Status:** resolved

## Symptom

Manual shared-data sync showed and applied dish updates but did not show or apply ingredient updates.

## Root Cause

The manual sync flow trusted `shared-manifest.json` change arrays as the only source of selectable rows. The current deployed manifest has `ingredientChanges: []` while `shared-data.json` still contains ingredient data. Because the modal only rendered `manifest.ingredientChanges`, ingredients could be omitted even when the snapshot had data that should be synced.

The same logic also prevented force sync: if manifest versions matched or change arrays were empty, `checkSharedDataUpdates` returned `null` and the user could not open the sync modal.

## Fix

- Manual sync now calls `checkNow({ force: true })`, so the modal can open even when the manifest reports no changes.
- The sync modal fetches `shared-data.json` and derives ingredient/dish update rows by comparing the actual snapshot against local shared Redux data.
- If no differences are detected in force mode, the modal still offers remote items as `Đồng bộ` rows so the user can overwrite local data from the shared snapshot.
- Personal Gist backup/sync code was not changed.

## Verification

- `yarn build` passed with existing lint warnings.
- Deployed build output was copied to `docs/` while preserving `docs/manifest.json`.
