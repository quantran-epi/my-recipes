---
phase: 03
slug: online-and-offline-cost-isolation
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-05
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright `@playwright/test` plus CRACO production build |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` |
| **Full suite command** | `E2E_BROWSER_CHANNEL=chrome npm run test:e2e:performance` plus any Phase 3 online/offline comparison command added by the plan |
| **Estimated runtime** | ~60-180 seconds depending on selected network modes |

---

## Sampling Rate

- **After every task commit:** Run the narrowest relevant Playwright performance check, or `npm run build` for source-only changes that cannot be isolated by a browser check.
- **After every plan wave:** Run `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` and the Phase 3 comparison command once it exists.
- **Before `$gsd-verify-work`:** Build and all Phase 3 comparison checks must be green, or exact blockers must be documented.
- **Max feedback latency:** 180 seconds for focused checks; longer diagnostic/service-worker checks must be optional and documented separately.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-task-1 | 03-01 | 1 | NET-01, NET-02 | T-03-sync-startup | Background sync must not start before app/list usability and quiet-window scheduling. | build | `npm run build` | `.planning/phases/03-online-and-offline-cost-isolation/03-01-PLAN.md` | planned |
| 03-01-task-2 | 03-01 | 1 | PERF-03, TEST-03 | T-03-network-harness | Due/fresh/offline sync states and GitHub manifest fixtures are deterministic and secret-free. | e2e/list | `npm run test:e2e:performance -- --list` | `.planning/phases/03-online-and-offline-cost-isolation/03-01-PLAN.md` | planned |
| 03-01-task-3 | 03-01 | 1 | NET-01, NET-02, PERF-03 | T-03-sync-startup | Pending startup sync must not break Phase 2 list hot-path budgets. | e2e/perf | `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` | `.planning/phases/03-online-and-offline-cost-isolation/03-01-PLAN.md` | planned |
| 03-02-task-1 | 03-02 | 2 | NET-04 | T-03-sync-image | Sync modal shell must render from manifest data while full shared data and warnings load progressively. | build | `npm run build` | `.planning/phases/03-online-and-offline-cost-isolation/03-02-PLAN.md` | planned |
| 03-02-task-2 | 03-02 | 2 | NET-03, NET-04 | T-03-sync-image | Selective-sync versions are preserved and dish list images stay fallback-first and dimension-stable. | build | `npm run build` | `.planning/phases/03-online-and-offline-cost-isolation/03-02-PLAN.md` | planned |
| 03-02-task-3 | 03-02 | 2 | NET-03, NET-04, PERF-03, TEST-03 | T-03-sync-image | Progressive sync prompt and image isolation are proven under controlled network/image modes. | e2e/perf | `E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance` | `.planning/phases/03-online-and-offline-cost-isolation/03-02-PLAN.md` | planned |
| 03-03-task-1 | 03-03 | 3 | PERF-03, TEST-03 | T-03-network-harness | Maintainers have a repo-local Phase 3 comparison command. | e2e/list | `npm run test:e2e:performance:phase3 -- --list` | `.planning/phases/03-online-and-offline-cost-isolation/03-03-PLAN.md` | planned |
| 03-03-task-2 | 03-03 | 3 | PERF-03, NET-01, NET-02, NET-03, NET-04, TEST-03 | T-03-network-harness | Online/offline/GitHub/image comparison evidence is written with diagnostics and Phase 2 budgets. | e2e/perf | `E2E_BROWSER_CHANNEL=chrome npm run test:e2e:performance:phase3` | `.planning/phases/03-online-and-offline-cost-isolation/03-03-PLAN.md` | planned |
| 03-03-task-3 | 03-03 | 3 | PERF-03, TEST-03 | T-03-network-harness | Docs explain strict Phase 3 checks and optional service-worker diagnostics. | docs/grep | `rg -n "Phase 3|test:e2e:performance:phase3|online-normal|browser-offline|mocked-slow-network|100 ms|service-worker" docs/performance-audit-plan.md docs/automated-regression-test-plan.md` | `.planning/phases/03-online-and-offline-cost-isolation/03-03-PLAN.md` | planned |

*Status: planned after PLAN.md task IDs were created.*

---

## Wave 0 Requirements

- Existing Playwright infrastructure is present in `package.json`, `playwright.config.ts`, `tests/e2e/fixtures/performanceNetwork.ts`, `tests/e2e/fixtures/seedApp.ts`, and `tests/e2e/fixtures/performanceReport.ts`.
- Plan 03-01 creates the deterministic startup sync fixture path before prompt/image checks depend on it.
- Plan 03-03 creates the Phase 3 comparison command before marking `TEST-03` covered.
- Service-worker production diagnostics remain optional, not part of the strict gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Subjective online vs offline feel after deploy | NET-01, NET-02 | Automated checks measure controlled modes, but real browser cache/network conditions can still vary. | Open deployed app online and offline, visit dish/ingredient/shopping-list screens, then open menus/modals and search/reset lists. Confirm no new visible hang beyond measured evidence. |
| Optional production service-worker diagnostic | PERF-03 | Normal tests intentionally unregister service workers to keep strict gates deterministic. | Run the documented optional production/service-worker check if Phase 3 adds one; inspect evidence for stale-cache or app-shell update effects. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands or an explicit manual-only justification.
- [x] Sampling continuity: no three consecutive task commits without either `npm run build`, the daily performance gate, or the Phase 3 comparison command.
- [x] Phase 3 comparison evidence covers `online-normal`, `browser-offline`, and slow/blocked GitHub/image modes.
- [x] Service-worker production behavior remains optional diagnostic evidence.
- [x] Feedback latency for strict gates stays under 180 seconds where possible.
- [x] Set `nyquist_compliant: true` only after generated plans map concrete task IDs to this validation strategy.

**Approval:** planned 2026-06-05
