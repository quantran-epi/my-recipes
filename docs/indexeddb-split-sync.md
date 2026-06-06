# IndexedDB And Split Sync

The app now stores durable Redux Persist data in IndexedDB through `localforage`, not browser `localStorage`. Core persisted roots remain named `persist:shared` and `persist:personal`, but those keys live in the `my-recipes` IndexedDB database under the `app_storage` object store.

## Shared Data

Admin shared data publishes to split GitHub repo files:

- `docs/sync/shared/manifest.json`
- `docs/sync/shared/ingredients.json`
- `docs/sync/shared/dishes.json`

The app checks only the manifest first. It fetches `ingredients.json` and/or `dishes.json` only when that part is selected or forced for sync.

## Personal Data

Personal backup still uses the user's configured Gist, but the single backup blob is replaced by split files:

- `my-recipes-personal-manifest.json`
- `personal-appContext.json`
- `personal-inventory.json`
- `personal-shoppingList.json`
- `personal-scheduledMeal.json`
- `personal-cookingSession.json`

Backup uploads only changed personal part files plus the manifest. Restore reads the manifest and downloads only remote parts whose hash differs from the local part.

## Storage Notes

IndexedDB avoids the small localStorage quota, but it is still browser-managed storage. App startup requests persistent storage where the browser supports it and warns when estimated usage is high. GitHub/Gist sync remains the durability layer for device loss or browser storage eviction.
