# Requirements: My Recipes

**Defined:** 2026-06-05
**Core Value:** Users can manage cooking, ingredients, inventory, meal plans, and shopping smoothly in one local-first app without the interface getting in their way.

## v1 Requirements

Requirements for the first milestone: stabilize large-list and online/offline responsiveness so richer feature, UI, and UX work can build on a measured baseline.

### Performance Measurement

- [x] **PERF-01**: Maintainer can reproduce large-list scenarios for ingredients, dishes, and shopping lists with deterministic seeded data.
- [x] **PERF-02**: Maintainer can measure time-to-visible for modals, drawers, detail views, row menus, and navigation from large-list screens.
- [x] **PERF-03**: Maintainer can compare online and offline runs to identify whether sync, image loading, service worker, or network work affects perceived responsiveness.

### Large-List Responsiveness

- [x] **LIST-01**: User can open add, edit, detail, inventory, cooking, and shopping-list modals from large virtualized lists without an obvious pre-open UI freeze.
- [x] **LIST-02**: User can interact with row menus and row actions in ingredient, dish, and shopping-list screens without list-wide rerender pauses.
- [x] **LIST-03**: User can search, filter, and reset large virtualized lists while preserving row spacing, scroll behavior, and touch/desktop interaction quality.
- [ ] **LIST-04**: User can navigate from large-list screens to detail routes with responsive loading feedback and no stale blocked drawer state.

### Online And Offline Behavior

- [x] **NET-01**: User can open the app online without startup shared-data checks delaying normal list interactions.
- [x] **NET-02**: User can continue using local-first data offline with no behavior regression from performance changes.
- [x] **NET-03**: User can load dish rows with images without network or image decode work causing visible list interaction lag.
- [x] **NET-04**: User can receive shared-data sync prompts without heavy impact analysis or fetch work blocking the app shell.

### Regression Coverage

- [x] **TEST-01**: Maintainer can run repo-local performance regression checks through package scripts, without relying on globally installed Playwright tooling.
- [x] **TEST-02**: Maintainer can run a focused large-list responsiveness test that fails when modal, detail, or menu open timing exceeds the chosen smoke budget.
- [x] **TEST-03**: Maintainer can run online/offline comparison checks with GitHub requests stubbed or controlled.
- [ ] **TEST-04**: Existing build and relevant regression checks pass after responsiveness changes, or failures are documented with exact blockers.

### Future Product Foundation

- [x] **UX-01**: Maintainer has a measured responsiveness baseline that future rich feature, UI, and UX work can use as a guardrail.
- [ ] **UX-02**: User-facing performance fixes preserve current information density and daily cooking/shopping workflows unless a later UI/UX phase explicitly changes them.

## v2 Requirements

Deferred to future releases. Tracked here so the project stays oriented toward rich feature, UI, UX, and performance work beyond the first responsiveness milestone.

### Product And UX

- **UX-03**: User can benefit from broader UI polish across primary cooking, inventory, shopping, and planning workflows.
- **UX-04**: User can use richer daily workflow features after responsiveness guardrails are in place.

### Architecture And Platform

- **ARCH-01**: Maintainer can evaluate route-level code splitting and broader bundle-size reduction after interaction bottlenecks are measured.
- **ARCH-02**: Maintainer can evaluate a CRA/CRACO to Vite migration after immediate responsiveness work is complete.
- **ARCH-03**: Maintainer can evaluate backend or serverless sync/publish boundaries after browser-only sync behavior is understood.

### Data Reliability

- **DATA-01**: Maintainer can add persisted-state schema migrations and quota strategy after the current performance milestone is stable.

## Out of Scope

Explicitly excluded from v1 to prevent responsiveness work from expanding into unrelated platform or design changes.

| Feature | Reason |
|---------|--------|
| Remove GitHub sync or Gist backup to fix online performance | Existing online workflows should be understood and improved, not deleted as a workaround. |
| Replace the local-first data model | The first milestone must preserve existing local/offline behavior and avoid a storage migration blast radius. |
| Major visual redesign | The app direction includes UI/UX polish, but responsiveness needs to be stabilized before redesign work. |
| Replace all list UI patterns | Current virtualized lists should be measured and fixed before replacing the interaction model. |
| Backend/server migration | The current repository is a browser-only static SPA; server migration is a later architectural decision. |

## Traceability

Which phases cover which v1 requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERF-01 | Phase 1 | Complete |
| PERF-02 | Phase 1 | Complete |
| PERF-03 | Phase 3 | Complete |
| LIST-01 | Phase 2 | Complete |
| LIST-02 | Phase 2 | Complete |
| LIST-03 | Phase 2 | Complete |
| LIST-04 | Phase 4 | Pending |
| NET-01 | Phase 3 | Complete |
| NET-02 | Phase 3 | Complete |
| NET-03 | Phase 3 | Complete |
| NET-04 | Phase 3 | Complete |
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 2 | Complete |
| TEST-03 | Phase 3 | Complete |
| TEST-04 | Phase 5 | Pending |
| UX-01 | Phase 1 | Complete |
| UX-02 | Phase 4 | Pending |

**Coverage:**

- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-06-05*
*Last updated: 2026-06-05 after Phase 3 completion*
