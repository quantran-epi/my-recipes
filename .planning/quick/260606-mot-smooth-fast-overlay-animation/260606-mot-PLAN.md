# Quick Task 260606-mot: Smooth Fast Overlay Animation

**Date:** 2026-06-06
**Task:** Slightly smooth the custom fast modal and drawer shell entrance animation without adding heavier motion or replacing more modals.

## Plan

1. Update only `FastModalShell` and `FastDrawerShell` motion styles.
2. Keep animation limited to `opacity` and `transform`.
3. Use short `120-180ms` timing with soft easing.
4. Preserve immediate shell rendering and deferred heavy content loading.
5. Run lightweight verification only; skip complicated E2E testing per request.
