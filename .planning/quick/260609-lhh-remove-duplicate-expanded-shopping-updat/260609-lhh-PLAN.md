---
quick_id: 260609-lhh
status: planned
created: 2026-06-09
---

# Quick Task 260609-lhh Plan

Task: remove duplicate expanded shopping update-bought action, fix analytics price history y-axis overflow, add cook now mode and household preference profile, deploy.

## Tasks

1. Shopping and analytics polish
   - Remove the duplicate expanded-row bought action from shopping list ingredient groups while keeping the primary row buy/price modal action.
   - Increase the price history chart y-axis space so range labels are visible and not clipped.
   - Verify with `yarn build`.

2. Cook Now mode and household preferences
   - Store a personal household preference profile in app context.
   - Add a Cook Now suggester mode that scores inventory-ready dishes using the preference profile, time limit, budget, serving count, and nutrition goal.
   - Expose preference controls on the inline suggester page without adding a backend or changing shared data.
   - Verify with `yarn build`.

3. Deploy
   - Follow `docs/deployment.md`: build, copy `build/` to `docs/` except `build/manifest.json`, stage `src/*` and `docs/*`, then push.
