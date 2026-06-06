---
quick_id: 260606-tkn
status: planned
created: 2026-06-06
---

# Quick Task 260606-tkn: Admin GitHub Token For Shared Publish

## Goal

Let an admin enter a GitHub token from the app UI so shared data can be published to the repository without relying only on a build-time environment token.

## Tasks

1. Add a browser-local publish token setting to `useSharedPublish`; prefer it over the encoded build-time token when publishing.
2. Add admin-only token input, save, clear, and status UI in the sidebar admin section.
3. Build and deploy to `docs/`, then commit and push.

## Verification

- `yarn build` passes.
- Token values are never written to repo files.
- Deployed bundle references the new build output.
