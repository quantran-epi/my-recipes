---
status: in_progress
quick_id: 260611-lci
created_at: "2026-06-11T08:22:12Z"
---

# Link Health Treatments To Sickness Records

## Task

Polish household health history, link treatment records to sickness records, add a way to mark one household member as the current app user, then deploy the static app.

## Plan

1. Move the household detail save button so the food tab has its own save action and the health tab keeps its own health save action.
2. Extend household health records with an optional treatment-to-sickness reference that is normalized for persisted local state.
3. Update the health record modal so treatment entries can choose a related sickness from the same member.
4. Render sickness records with linked treatment rows beneath them, while keeping unlinked treatments visible as standalone history rows with compact icon-only tools.
5. Extend household member profile state with an optional single current-user member id and show a clear “Tôi” marker/control in the household editor.
6. Run TypeScript/build verification, update GSD summary/state, commit the source change, deploy to `docs/`, commit deployment output, and push.

## Verification

- `npx tsc --noEmit`
- `git diff --check`
- `yarn build`
- Follow `docs/deployment.md` for static deployment.
