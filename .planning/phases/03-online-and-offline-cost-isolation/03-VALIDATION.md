---
phase: 03
slug: online-and-offline-cost-isolation
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 03-01-* | 03-01 | 1 | NET-01, NET-02 | T-03-sync-startup | Background sync must not block first usable list/app shell; no secrets exposed. | e2e/perf | Phase 3 startup/list interaction check plus daily Phase 2 gate | pending plan | pending |
| 03-02-* | 03-02 | 2 | NET-03, NET-04 | T-03-sync-image | Sync prompt and image work must be progressive, controlled, and non-destructive. | e2e/perf | Phase 3 sync prompt/image check plus daily Phase 2 gate | pending plan | pending |
| 03-03-* | 03-03 | 3 | PERF-03, TEST-03 | T-03-network-harness | GitHub and image requests must be stubbed/controlled unless explicitly diagnostic. | e2e/perf | Phase 3 online/offline comparison command | pending plan | pending |

*Status: pending until PLAN.md task IDs are created.*

---

## Wave 0 Requirements

- Existing Playwright infrastructure is present in `package.json`, `playwright.config.ts`, `tests/e2e/fixtures/performanceNetwork.ts`, `tests/e2e/fixtures/seedApp.ts`, and `tests/e2e/fixtures/performanceReport.ts`.
- Planner must add any missing Phase 3 comparison command or narrow test hook before marking `TEST-03` covered.
- Planner must keep service-worker production diagnostics optional, not part of the strict gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Subjective online vs offline feel after deploy | NET-01, NET-02 | Automated checks measure controlled modes, but real browser cache/network conditions can still vary. | Open deployed app online and offline, visit dish/ingredient/shopping-list screens, then open menus/modals and search/reset lists. Confirm no new visible hang beyond measured evidence. |
| Optional production service-worker diagnostic | PERF-03 | Normal tests intentionally unregister service workers to keep strict gates deterministic. | Run the documented optional production/service-worker check if Phase 3 adds one; inspect evidence for stale-cache or app-shell update effects. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify commands or an explicit manual-only justification.
- [ ] Sampling continuity: no three consecutive task commits without either `npm run build`, the daily performance gate, or the Phase 3 comparison command.
- [ ] Phase 3 comparison evidence covers `online-normal`, `browser-offline`, and slow/blocked GitHub/image modes.
- [ ] Service-worker production behavior remains optional diagnostic evidence.
- [ ] Feedback latency for strict gates stays under 180 seconds where possible.
- [ ] Set `nyquist_compliant: true` only after generated plans map concrete task IDs to this validation strategy.

**Approval:** pending
