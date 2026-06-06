# Image Storage And Full Backup Plan

## Summary

Build local image storage as a browser-only, local-first feature. Dish images move out of Redux/localStorage and into IndexedDB, while Redux stores lightweight image references. Add a manual full-backup workflow that exports and restores app data plus images as a ZIP file, with optional GitHub upload and restore.

This is a future implementation plan. The existing Gist backup remains unchanged as the lightweight personal-data backup.

## Key Decisions

- Scope v1 to dish images only.
- Store uploaded images compressed and resized before saving.
- Keep remote image URL support for existing and future dishes.
- Do not store image blobs or base64 data URLs in Redux/localStorage.
- Manual full backup supports export ZIP to device, upload ZIP to GitHub, restore from ZIP file, and restore from GitHub backup.
- GitHub backup keeps one latest ZIP and overwrites it each time.
- GitHub upload uses the existing browser GitHub Contents API/admin token style, not a browser `git push`.
- Recommended GitHub path: `docs/backups/my-recipes-full-backup.zip`.

## Implementation Changes

- Add a small IndexedDB image store helper for image records, object URL loading, deletion, and migration helpers.
- Add `jszip` for ZIP export/import.
- Keep `Dishes.image?: string` compatible with remote URLs, but allow local image refs such as `indexeddb:dish-images/<id>`.
- Update image upload to compress/resize the file, store it in IndexedDB, and return a local image ref instead of a base64 data URL.
- Update dish image rendering to resolve local refs from IndexedDB and clean up object URLs after use.
- Migrate existing `data:image/...` dish image values into IndexedDB on app load or when the dish image is rendered/edited.
- Delete orphans when dish images are replaced or dishes are removed.
- Add a full-backup UI near the current backup tools with actions for export, upload, restore from file, and restore from GitHub.

## ZIP Contents

- `manifest.json`: backup version, created time, app name, and counts.
- `persist-shared.json`: current `persist:shared` payload.
- `persist-personal.json`: current `persist:personal` payload.
- `images/dish-images/<id>`: compressed dish image blobs.
- `images/index.json`: image id, mime type, size, and original dish references.

## Restore Behavior

- Restore validates the ZIP manifest and required data files before changing app data.
- Restore imports images into IndexedDB first, then writes shared/personal persisted data.
- Restore should reload the app after completion so Redux Persist rehydrates from restored data.
- If image import fails, do not partially overwrite app data unless the user explicitly retries.

## Test Plan

- Upload a dish image and confirm localStorage size does not grow by the full image size.
- Confirm dish images still render in list/detail/edit flows after refresh and offline.
- Confirm existing remote image URLs still render.
- Confirm existing base64 dish images migrate and still display.
- Export a ZIP and restore it on a fresh browser profile.
- Upload the latest ZIP to GitHub and restore from GitHub.
- Confirm Gist backup still works independently.

## Acceptance Criteria

- Large image uploads no longer bloat Redux/localStorage.
- Full backup preserves dishes, personal state, and local images.
- Restore from device ZIP and GitHub ZIP both recover dish images.
- The app remains browser-only and local-first.
