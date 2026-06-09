# Quick Task 260609-psi: Personal Sync Indicator

## Goal

Show a visible syncing indicator while personal data sync is running so users know the app is actively backing up or restoring personal data.

## Tasks

1. Inspect the personal data sync/backup flow and existing global shell indicators.
2. Add state that reflects active personal sync work.
3. Surface a compact, mobile-friendly syncing indicator in the app shell while personal sync is active.
4. Build and record verification.

## Verification

- `yarn build`
- Review that the indicator is only tied to personal sync activity, not unrelated shared sync or route loading.
