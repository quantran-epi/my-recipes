# Quick Task 260611-vsm: Show existing scheduled meals and fill dish duration data

## Scope

Address the two requested follow-ups and deploy the result:

1. When creating a scheduled meal from smart planner suggestions, show whether the selected date already has breakfast, lunch, or dinner scheduled.
2. Review and auto-fill missing dish duration data in the shared dish data.

## Tasks

1. Patch the scheduled meal add form/modal so the selected date displays existing scheduled dishes by meal slot.
2. Make the warning visible for the smart planner create-scheduled modal without disrupting the regular scheduled-meal add flow.
3. Use structured JSON processing to fill missing/empty dish `duration` fields with reasonable phase values based on dish tags, ingredients, and steps.
4. Run the production build and deploy by copying `build/` to `docs/` excluding `manifest.json`, then commit and push.

## Verification

- Run `yarn build`.
- Confirm generated docs output is staged while `docs/manifest.json` remains untouched.
