# Quick Task 260610-bmi: Fix Household, Modal, Button, And Deploy Polish

## Goal

Address the requested UI corrections and deploy the updated static build.

## Scope

- Keep household list switches on the same row as household member names, aligned right.
- Make household edit changes save through an explicit save action and ensure editable fields persist.
- Make household items in the dish suggestor household modal full width.
- Remove the nutrition calculator shortcut for creating a scheduled meal, leaving create shopping only.
- Apply the compact rounded analytics button style across app buttons, except page-header icon actions stay circular and page-search buttons stay square.
- Make the continue action in the start-cooking modal visually distinct from the start action.
- Fix dish-detail nested cooking/shopping modals so they appear above the detail modal.
- Build and deploy following `docs/deployment.md`.

## Verification

- Run focused source checks while editing.
- Run `yarn build`.
- Copy `build/` into `docs/` excluding `build/manifest.json`.
- Commit and push the deployed result.
