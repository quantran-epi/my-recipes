# Quick Task 260610-smd: Smart Planner Suggestion Detail Modal

## Goal

Make Smart Planner suggested dish items open a detail modal explaining why the dish was suggested, including how it matched and what each displayed data point means, then deploy the updated static app.

## Scope

- Inspect the existing Smart Planner suggestion card/tag data flow.
- Add a suggested-item detail modal triggered from each suggestion item.
- Include detailed descriptions for score, cost, nutrition match, household suitability, and ingredient readiness data shown in the suggestion.
- Preserve existing tag popovers and list behavior where they remain useful.
- Run `yarn build`.
- Copy `build/` into `docs/` excluding `build/manifest.json`.
- Confirm `docs/manifest.json` is unchanged.
- Commit and push to `origin/main`.

## Verification

- `yarn build` succeeds.
- Source scan confirms suggestion items trigger the detail modal and each metric has explanatory copy.
- `git diff -- docs/manifest.json` shows no changes.
- `git push` succeeds.
