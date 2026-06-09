---
quick_id: 260609-lhh
status: complete
completed: 2026-06-09
---

# Quick Task 260609-lhh Summary

## Completed

- Removed the duplicate `Cập nhật mua` action from the expanded shopping list ingredient detail; the row-level `Mua`/`Giá` button remains the single bought-modal entry point.
- Fixed the analytics price-history chart y-axis clipping by removing the negative left chart margin and widening the y-axis tick area.
- Added a personal household preference profile to app context with serving count, max cook time, max extra spend, preferred tags, avoided tags, and optional nutrition goal.
- Added Cook Now scoring and grouping for the dish suggester using inventory availability, household serving scale, time, budget, tags, nutrition goal, and urgent inventory signals.
- Made the standalone `Nấu gì?` page default to Cook Now mode.
- Built and copied deployment output from `build/` into `docs/` while preserving `docs/manifest.json`.

## Verification

- `yarn build` passed. CRA reported existing lint warnings in unrelated files.

## Deployment

- Deployment build artifacts were copied to `docs/` per `docs/deployment.md`.
