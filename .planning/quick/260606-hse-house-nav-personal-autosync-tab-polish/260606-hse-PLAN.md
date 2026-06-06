---
quick_id: 260606-hse
status: planned
created: 2026-06-06
---

# Quick Task 260606-hse: House Icon, Personal Auto Sync, Bottom Tab, Stats Polish

## Goal

Apply the requested navigation, background sync, bottom-tab, and ingredient analytics refinements without adding startup UI blocking work.

## Tasks

1. Use `assets/icons/house.png` for dashboard navigation in the drawer, header feature icon, and quick floating navigation.
2. Add idle background personal Gist pull-on-entry that checks the remote manifest first, fetches only changed personal parts, records the applied manifest hash, and reloads only when data was actually pulled.
3. Make the bottom tab dock transparent/floating while increasing contrast and focus on the three high-priority actions.
4. Format ingredient analytics amounts to one decimal place.

## Verification

- Run `yarn build`.
- Deploy with `docs/deployment.md` if build passes.
- Confirm diff is scoped to requested source/assets/docs/GSD artifacts.
