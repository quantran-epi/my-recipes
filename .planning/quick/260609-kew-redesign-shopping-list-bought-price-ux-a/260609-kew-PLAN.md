---
quick_id: 260609-kew
status: in_progress
date: 2026-06-09
---

# Quick Task 260609-kew: Price History UX and Analytics

## Goal

Improve shopping-list bought-price UX, preserve fast mobile use, store price history, and expose useful analytics from that history.

## Tasks

1. Redesign shopping-list ingredient rows.
   - Keep the collapsed row focused on brief status.
   - Keep expansion for recipe/dish amount details.
   - Move actual bought amount and price editing into a dedicated modal.
   - Collapse the input/editor after save and show brief saved-price information.

2. Extend price memory to price history.
   - Keep last price for quick reuse.
   - Append saved purchase prices to per-ingredient history in personal app context.
   - Show recent history in the bought-price modal.

3. Add analytics and deploy.
   - Add a price-history analytics section using existing analytics chart patterns.
   - Build with `yarn build`.
   - Copy `build/` to `docs/` per deployment instructions, commit, and push.
