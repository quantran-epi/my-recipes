---
quick_id: 260606-tkn
status: complete
completed: 2026-06-06
---

# Quick Task 260606-tkn Summary

## Completed

- Added an admin-only GitHub token input for publishing shared data.
- Stored the admin-entered publish token in browser localStorage under `shared_publish_github_token`.
- Updated shared publishing to prefer the browser-local token and fall back to the existing encoded build-time token.
- Added token save/clear/status controls in the admin drawer.
- Deployed the updated production build to `docs/` while preserving `docs/manifest.json`.

## Verification

- `yarn build` passed with existing lint warnings.
- Scanned for token-like literals; only the localStorage key name was present.
