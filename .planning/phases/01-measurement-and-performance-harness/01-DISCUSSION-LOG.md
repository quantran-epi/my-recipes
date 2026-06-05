# Phase 1: Measurement and Performance Harness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 1-Measurement and Performance Harness
**Areas discussed:** Dataset scale, Timing budgets, Online/offline setup, Evidence format

---

## Dataset Scale

| Option | Description | Selected |
|--------|-------------|----------|
| Realistic current size | Seed only a typical current household dataset. | |
| Stress future size | Seed only a larger future-growth dataset. | |
| Both | Use daily and stress baselines so normal work and headroom are both visible. | yes |

**User's choice:** Both a realistic daily baseline and a stress baseline.
**Notes:** Daily baseline should be about 200 ingredients, 150 dishes, and 100 shopping lists. Stress baseline should be about 1,000 ingredients, 750 dishes, and 500 shopping lists.

| Option | Description | Selected |
|--------|-------------|----------|
| Realistic relationships | Include inventory, shopping-list ingredients, scheduled meals, dish ingredients, and included dishes. | yes |
| Flat list only | Keep fixture generation simple with mostly unrelated rows. | |
| Worst-case relationships | Maximize nesting and cross-links to amplify stress behavior. | |

**User's choice:** Realistic relationships.
**Notes:** The harness should exercise the same relationships users rely on during cooking, planning, inventory, and shopping workflows.

| Option | Description | Selected |
|--------|-------------|----------|
| Mixed image set | Use some local/base64-like images, some remote URLs, and many fallback/simple rows. | yes |
| No images in Phase 1 | Exclude image behavior from baseline data. | |
| Image-heavy stress case | Make most dish rows image-heavy. | |

**User's choice:** Mixed image set.
**Notes:** This keeps image/network cost visible without turning every measurement into an image stress test.

---

## Timing Budgets

| Option | Description | Selected |
|--------|-------------|----------|
| Baseline-first | Capture timings and proposed budgets; do not fail strict UX thresholds yet. | yes |
| Smoke thresholds now | Fail only broad, generous thresholds immediately. | |
| Strict UX targets now | Fail when interactions miss the desired UX target in Phase 1. | |

**User's choice:** Baseline-first.
**Notes:** Phase 1 should identify and document the current state, then later phases can make strict budgets enforceable after fixes.

| Option | Description | Selected |
|--------|-------------|----------|
| Interaction shell under 100ms | The visible response shell should appear quickly even if heavy content finishes later. | yes |
| Interactive content under 300ms | Use a single content-ready target. | |
| No hard UX target yet | Avoid naming a UX target in the baseline. | |

**User's choice:** Interaction shell under 100ms.
**Notes:** Shell-visible and content-ready should be separate measurements.

| Option | Description | Selected |
|--------|-------------|----------|
| All listed interactions | Measure modal shell, drawer/sidebar, row menu, detail route navigation, and search/filter reset. | yes |
| Modal/drawer first | Measure only the highest-complaint interactions first. | |
| Modal/detail only | Measure modal and route detail transitions first. | |

**User's choice:** All listed interactions.
**Notes:** This covers both the user's reported slow open behavior and likely adjacent large-list interactions.

---

## Online/Offline Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Three modes | Compare online normal, browser offline, and mocked slow/blocked GitHub plus images. | yes |
| Two modes | Compare only online and offline. | |
| Controlled mocks only | Avoid real network entirely. | |

**User's choice:** Three modes.
**Notes:** The third mocked mode is needed because real internet conditions are not deterministic enough for regression tests.

| Option | Description | Selected |
|--------|-------------|----------|
| Stub by default, opt-in real network | Default tests stub GitHub; diagnostic baseline can use real network. | yes |
| Always stub GitHub | Never hit live GitHub from performance tests. | |
| Always allow GitHub | Let tests use live network behavior. | |

**User's choice:** Stub by default, opt-in real network.
**Notes:** Existing e2e setup already stubs GitHub Raw requests by default.

| Option | Description | Selected |
|--------|-------------|----------|
| Stub remote images with controllable delay | Deterministically compare fast and slow image modes. | yes |
| Block all remote images | Remove remote image behavior from measurements. | |
| Allow real remote images | Use live remote image hosts. | |

**User's choice:** Stub remote images with controllable delay.
**Notes:** This avoids flaky external image timing while preserving image-related behavior as a measured variable.

| Option | Description | Selected |
|--------|-------------|----------|
| Measure separately | Disable service workers for normal regression tests and add optional production/service-worker measurement. | yes |
| Disable service workers only | Keep service workers out of Phase 1 entirely. | |
| Include service worker in all measurements | Make every run include PWA/service-worker behavior. | |

**User's choice:** Measure separately.
**Notes:** This preserves deterministic regression runs while still giving a path to measure the production/PWA behavior that users experience.

---

## Evidence Format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON plus markdown | Write machine-readable run data and a short human summary. | yes |
| JSON only | Keep evidence machine-readable only. | |
| Markdown only | Keep evidence human-readable only. | |

**User's choice:** JSON plus short markdown summary.
**Notes:** Raw run outputs should go under `test-results/performance/`; docs should contain stable commands and summaries, not every raw run.

| Option | Description | Selected |
|--------|-------------|----------|
| Light by default, diagnostic trace command | Normal runs avoid heavy artifacts; optional command captures traces/profiles. | yes |
| Always collect traces/profiles | Capture deep artifacts on every run. | |
| Never collect traces/profiles | Keep Phase 1 to timing JSON only. | |

**User's choice:** Light by default, diagnostic trace command.
**Notes:** Phase 1 should fail setup/runtime errors and generous smoke thresholds only. Strict UX target misses should warn in evidence, not fail, until later fix phases.

---

## Agent Discretion

- Exact package script names, JSON schema field names, and markdown summary layout can be chosen during planning, provided they are deterministic, documented, and repo-local.
- Existing Playwright fixture patterns and Redux Persist seeding should be reused unless planning finds a concrete blocker.

## Deferred Ideas

- Performance fixes for large-list interaction hot paths are deferred to Phase 2.
- Online/offline cost fixes for sync, image, network, and service-worker behavior are deferred to Phase 3.
- Navigation and app-shell responsiveness fixes are deferred to Phase 4.
- Strict regression gates are deferred until baseline data and fixes make thresholds defensible.
