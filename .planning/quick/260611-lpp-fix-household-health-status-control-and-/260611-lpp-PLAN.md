---
status: in_progress
quick_id: 260611-lpp
created_at: "2026-06-11T08:38:03Z"
---

# Fix Household Health Status Control And History Layout

## Task

Improve the household health quick status control and fix saved health history item layout so tags and icon tools stay cleanly aligned.

## Plan

1. Replace the quick health status `Segmented` control with custom status chips using the existing health status metadata.
2. Replace health history tag/action `Stack` wrappers with explicit flex containers so tags do not break awkwardly and icon buttons stay in one right-aligned row.
3. Preserve existing treatment-to-sickness grouping and modal behavior.
4. Run TypeScript/build checks, update quick summary/state, commit, deploy to `docs/`, and push.

## Verification

- `npx tsc --noEmit`
- `git diff --check`
- `yarn build`
