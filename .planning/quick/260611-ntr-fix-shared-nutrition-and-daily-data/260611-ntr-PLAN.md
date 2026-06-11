---
status: in_progress
quick_id: 260611-ntr
created_at: "2026-06-11T13:44:38Z"
---

# Fix Shared Nutrition And Daily Data

## Task

Update shared data only: correct obviously wrong ingredient nutrition mappings, add missing common household ingredients and daily dishes, and keep shared sync manifests accurate.

## Plan

1. Audit shared ingredients for incorrect nutrition source matches and implausible macro values.
2. Correct high-confidence bad records in `docs/sync/shared/ingredients.json` and legacy `docs/shared-data.json`.
3. Add a focused set of common daily ingredients and dishes without touching code.
4. Regenerate `docs/sync/shared/manifest.json` with accurate hashes, counts, versions, and item change lists.
5. Update legacy `docs/shared-manifest.json` consistently for older shared-data consumers.
6. Validate JSON, references, duplicate IDs, nutrition sanity, and manifest hashes before committing and pushing.

## Verification

- JSON parse checks for all touched data files
- No missing dish ingredient references
- No duplicate ingredient or dish IDs
- Manifest hash/count check against split sync files
- `git diff --check`
