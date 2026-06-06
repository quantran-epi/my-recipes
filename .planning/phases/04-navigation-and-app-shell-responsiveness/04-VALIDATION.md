---
phase: 04
slug: navigation-and-app-shell-responsiveness
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-06
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright `@playwright/test` plus CRACO production build |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` |
| **Full suite command** | `E2E_BROWSER_CHANNEL=chrome npm run test:e2e:performance` plus `E2E_BROWSER_CHANNEL=chrome npm run test:e2e:performance:phase3` after route-feedback changes |
| **Estimated runtime** | ~60-240 seconds depending on selected browser/network checks |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` for source-only app-shell changes, or the narrowest Playwright performance check that covers the changed path.
- **After every plan wave:** Run `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance`.
- **Before `$gsd-verify-work`:** Build and Phase 4 app-shell performance evidence must be green; Phase 3 comparison must be rerun when shared navigation code affects online/offline route behavior.
- **Max feedback latency:** 240 seconds for focused checks; longer full-suite or diagnostic checks must document exact runtime/environment blockers.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-task-1 | 04-01 | 1 | LIST-04, UX-02 | T-04-shell-state | Shared route-feedback state must not leave stale blocked overlays or duplicate pending destination work. | build | `npm run build` | `.planning/phases/04-navigation-and-app-shell-responsiveness/04-01-PLAN.md` | pending |
| 04-01-task-2 | 04-01 | 1 | LIST-04, UX-02 | T-04-drawer-tools | Drawer shell opens before deferred tools, while sync, publish, Gist backup, history, guide, and admin controls remain available. | e2e/perf | `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` | `.planning/phases/04-navigation-and-app-shell-responsiveness/04-01-PLAN.md` | pending |
| 04-01-task-3 | 04-01 | 1 | LIST-04 | T-04-navigation | Sidebar, bottom-tab, global-search, and large-list detail navigation all trigger feedback and clear after route paint. | e2e/perf | `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` | `.planning/phases/04-navigation-and-app-shell-responsiveness/04-01-PLAN.md` | pending |
| 04-02-task-1 | 04-02 | 2 | LIST-04, UX-02 | T-04-regression | Existing global search, cooking, shopping, drawer, and modal workflows continue to work after app-shell changes. | e2e/regression | `E2E_BROWSER_CHANNEL=chrome npm run test:e2e` | `.planning/phases/04-navigation-and-app-shell-responsiveness/04-02-PLAN.md` | pending |
| 04-02-task-2 | 04-02 | 2 | LIST-04, UX-02 | T-04-evidence | Phase 4 evidence captures shell-visible/content-ready timings and user-checkable outcomes. | e2e/perf | `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` | `.planning/phases/04-navigation-and-app-shell-responsiveness/04-02-PLAN.md` | pending |
| 04-02-task-3 | 04-02 | 2 | UX-02 | T-04-docs | Docs preserve non-technical visual checks and do not hide remaining limitations. | docs/grep | `rg -n "Phase 4|drawer|sidebar|global search|route feedback|What You Can Check|what you can check" docs/performance-audit-plan.md docs/automated-regression-test-plan.md docs/large-list-modal-sidebar-performance-note.md` | `.planning/phases/04-navigation-and-app-shell-responsiveness/04-02-PLAN.md` | pending |

*Status: pending until PLAN.md task IDs are finalized and execution starts.*

---

## Wave 0 Requirements

- Existing Playwright infrastructure is present in `package.json`, `playwright.config.ts`, `tests/e2e/fixtures/seedApp.ts`, `tests/e2e/fixtures/performanceReport.ts`, and `tests/e2e/performance-regression.spec.ts`.
- Existing route and app-shell integration points are present in `src/Routing/MasterPage.tsx`, `src/Modules/Home/Screens/GlobalSearch.screen.tsx`, `src/Modules/Dishes/Screens/DishesList.screen.tsx`, and `src/Modules/ShoppingList/Screens/ShoppingList.screen.tsx`.
- Existing Phase 2/3 budgets and evidence format are reused; Phase 4 adds app-shell navigation checks rather than replacing prior large-list gates.
- No new backend, storage migration, or service-worker route change is required for Phase 4 validation.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drawer perceived responsiveness on the deployed app | LIST-04, UX-02 | Automated checks measure controlled seeded data, but the user needs a simple eye check on real browser/device conditions. | Open a large Dishes, Ingredients, or Shopping List page, tap the menu button, and confirm the drawer shell appears quickly with route links before secondary tools finish. |
| Drawer tool preservation | UX-02 | Tests can check hooks, but the product requirement is that visible workflows are not silently removed. | After the drawer settles, confirm shared-data sync, publish if admin, Gist backup, cooking history, user guide, and admin login/logout controls are still present. |
| Route feedback feel | LIST-04 | Timing evidence is useful, but stale overlays and duplicate taps are easiest to spot by eye. | From a large list, use drawer links, bottom tabs, global search results, and list detail buttons. Confirm route feedback appears immediately, duplicate taps do not stack work, and the overlay disappears after the page changes. |
| Workflow density preservation | UX-02 | Information density and daily flow placement are partly subjective product checks. | Open key cooking/shopping modals and verify row details, modal content, and daily actions are still in the same place after Phase 4 changes. |

---

## Validation Sign-Off

- [x] All planned Phase 4 task groups have automated verification commands or manual-only justification.
- [x] Sampling continuity: no three consecutive task commits should occur without either `npm run build`, the daily performance gate, or a focused regression check.
- [x] Phase 4 evidence must include drawer shell, drawer navigation, bottom-tab navigation, global-search navigation, and large-list-to-detail route feedback.
- [x] UX preservation is explicitly sampled through regression tests plus manual visible checks.
- [x] Feedback latency target for focused gates stays under 240 seconds where possible.
- [x] `nyquist_compliant: true` set in frontmatter for planning-time validation coverage.

**Approval:** draft 2026-06-06
