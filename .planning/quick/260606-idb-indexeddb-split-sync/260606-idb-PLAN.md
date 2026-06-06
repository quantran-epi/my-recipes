---
quick_id: 260606-idb
status: planned
created: 2026-06-06
---

# Quick Task 260606-idb: IndexedDB Storage And Split Sync

## Goal

Move durable app persistence from localStorage to IndexedDB and split remote sync so shared and personal data transfer per data type instead of as one large blob.

## Tasks

1. Add an IndexedDB-backed storage helper and use it for Redux Persist plus durable metadata/config values.
2. Split shared GitHub sync into manifest, ingredients, and dishes files, with per-part hash/version checks and selective fetch/publish.
3. Split personal Gist backup into manifest plus personal slice files, with changed-part upload/restore behavior.
4. Update legacy personal export/import helpers to use IndexedDB-backed persisted data.
5. Update tests/docs/deployed static output and push.

## Verification

- `yarn build` passes.
- Fresh app persists Redux data in IndexedDB, not `persist:*` localStorage keys.
- Shared sync checks only the split manifest first and fetches changed part files.
- Personal Gist backup writes split files and keeps shared data separate.
