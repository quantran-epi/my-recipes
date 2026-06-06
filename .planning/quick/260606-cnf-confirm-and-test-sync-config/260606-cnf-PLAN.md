---
quick_id: 260606-cnf
status: planned
created: 2026-06-06
---

# Quick Task 260606-cnf: Confirm Sync/Publish And Test Tokens

## Goal

Add explicit confirmations before shared publish, shared sync apply, personal backup, and personal restore. Add validation buttons for the admin repo publish token and personal Gist backup configuration.

## Tasks

1. Add non-mutating validation helpers for GitHub repo publish token and Gist backup config.
2. Add confirmation prompts around data-changing sync/publish/backup actions.
3. Build, deploy to `docs/`, commit, and push.

## Verification

- `yarn build` passes.
- Token/config tests do not write to GitHub or Gist.
- No token values are committed.
