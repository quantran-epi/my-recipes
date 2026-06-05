# Phase 3: Online and Offline Cost Isolation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 3-Online and Offline Cost Isolation
**Areas discussed:** Startup sync timing, Sync prompt workload, Dish image behavior, Online/offline test proof

---

## Startup Sync Timing

### When should the shared-data manifest check run?

| Option | Description | Selected |
|--------|-------------|----------|
| After shell is usable | App/list appears and can respond first, then sync check starts shortly after. | yes |
| Immediately | Closest to current behavior. | |
| Manual only | No automatic startup check; user clicks a sync/check action. | |

**User's choice:** After shell is usable.
**Notes:** The manifest check must not compete with first startup render or list responsiveness.

### How patient should the app be before checking?

| Option | Description | Selected |
|--------|-------------|----------|
| Short idle delay | Start after the first screen is visible and the browser has a quiet moment, roughly 1-2 seconds. | yes |
| Long quiet delay | Wait around 5-10 seconds. | |
| After first user action | Wait until the user has interacted, then check later. | |

**User's choice:** Short idle delay.
**Notes:** The delay should be short enough that sync still happens naturally, but not during first paint/list startup.

### What if the user starts interacting first?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep interaction first | Postpone sync while the UI is active. | yes |
| Run anyway in background | Start after the delay even if the user is interacting. | |
| Cancel until next app open | Skip the check for this session if the user becomes active quickly. | |

**User's choice:** Keep interaction first.
**Notes:** Typing, searching, scrolling, modal opening, and navigation should postpone the background check.

### Should checking status be visible?

| Option | Description | Selected |
|--------|-------------|----------|
| No visible status | Only show UI if updates are found or an explicit sync screen is opened. | yes |
| Small passive status | Show a subtle app-shell indicator. | |
| Visible banner/status | Make the online check obvious whenever it is running. | |

**User's choice:** No visible status.
**Notes:** Avoid adding noise for routine background checks.

---

## Sync Prompt Workload

### How should the sync prompt open?

| Option | Description | Selected |
|--------|-------------|----------|
| Fast prompt first | Show modal quickly with update counts/names, then fetch/compute details after visible. | yes |
| Full analysis first | Wait until shared data and all warnings are ready before showing modal. | |
| Minimal prompt only | Show only updates available first, then load details after the user clicks into it. | |

**User's choice:** Fast prompt first.
**Notes:** The prompt shell should not wait on full shared-data fetch or impact analysis.

### What can the user do while details load?

| Option | Description | Selected |
|--------|-------------|----------|
| Review now, sync later | Inspect/select visible items, but disable final sync until required data is ready. | yes |
| Block selection | Loading state until everything is ready. | |
| Allow immediate sync | Allow sync before impact analysis completes if shared data has loaded. | |

**User's choice:** Review now, sync later.
**Notes:** The modal should feel usable immediately without allowing unsafe final mutation.

### How should impact warnings behave?

| Option | Description | Selected |
|--------|-------------|----------|
| Progressive warnings | Show warnings as computed, with loading state for pending checks. | yes |
| Warnings only before sync | Compute quietly and show a final summary when the user clicks sync. | |
| Keep current always-visible warnings | Show warnings in the item list, but allow them to appear after modal opens. | |

**User's choice:** Progressive warnings.
**Notes:** Update items can appear before every impact warning is known.

### Should the selective-sync version bug be fixed now?

| Option | Description | Selected |
|--------|-------------|----------|
| Fix it in phase 3 | Preserve unchanged version fields to avoid repeated prompts/performance noise. | yes |
| Defer it | Leave for later unless it blocks Phase 3 tests. | |
| Only test it | Add coverage/documentation but avoid behavior change now. | |

**User's choice:** Fix it in phase 3.
**Notes:** This bug directly affects sync correctness and online/offline measurement quality.

---

## Dish Image Behavior

### How aggressive should list-row image changes be?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep images, tighten controls | Preserve row images while ensuring near-visibility loading, async decode, graceful failure, and measurement. | yes |
| Delay remote images more | Show fallback first; load remote images only after idle/quiet time. | |
| No remote list images | Remote images load only in details/modals. | |

**User's choice:** Keep images, tighten controls.
**Notes:** Preserve current visual richness unless evidence forces a narrower tradeoff.

### How should broken or slow images behave?

| Option | Description | Selected |
|--------|-------------|----------|
| Stable fallback first | Keep row size stable, show fallback immediately, swap in image only when ready. | yes |
| Show image loading state | Placeholder/loading shimmer until ready. | |
| Hide image area on failure | Remove/collapse the image surface if loading fails. | |

**User's choice:** Stable fallback first.
**Notes:** No layout shift or row collapse.

### Should image guardrails be added?

| Option | Description | Selected |
|--------|-------------|----------|
| Measure and guard obvious risks | Track image behavior and avoid clearly risky huge/remote list-row loads. | yes |
| Measure only | Add evidence but do not change loading/acceptance rules. | |
| Strict limits now | Add hard image size/source limits for all dish images. | |

**User's choice:** Measure and guard obvious risks.
**Notes:** This is not a full image-storage redesign.

### Should list/detail image behavior differ?

| Option | Description | Selected |
|--------|-------------|----------|
| List stricter, detail richer | List rows prioritize responsiveness; details/modals may load richer images. | yes |
| Same everywhere | One image behavior for all image surfaces. | |
| Strict everywhere | Apply list behavior to all surfaces. | |

**User's choice:** List stricter, detail richer.
**Notes:** Detail/modal images are more acceptable because the user explicitly opened that surface.

---

## Online/offline Test Proof

### What must automated checks prove?

| Option | Description | Selected |
|--------|-------------|----------|
| Sync + image + offline comparison | Compare online-normal, browser-offline, and slow/blocked GitHub/image modes. | yes |
| Sync only | Focus proof on GitHub manifest/shared-data behavior. | |
| Everything including service worker | Include production/service-worker behavior in the main gate. | |

**User's choice:** Sync + image + offline comparison.
**Notes:** Use deterministic modes rather than live internet as the primary proof.

### Should service worker be a strict gate?

| Option | Description | Selected |
|--------|-------------|----------|
| Optional diagnostic only | Normal regression tests stay service-worker-free; document optional production/service-worker checks. | yes |
| Strict phase gate | Production service-worker behavior must pass for Phase 3 completion. | |
| Defer entirely | Leave service-worker behavior for Phase 4 or Phase 5. | |

**User's choice:** Optional diagnostic only.
**Notes:** This carries forward the Phase 1 separation between normal regression checks and production/service-worker diagnostics.

### Which interactions should be compared?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 2 hot paths | Search reset, row menu open, modal/detail shell open on large-list screens. | yes |
| Startup only | App open/dashboard/list first paint and shared sync prompt behavior. | |
| Broad smoke | Startup, list interactions, navigation, modal, image/resource checks. | |

**User's choice:** Phase 2 hot paths.
**Notes:** Reuse dish, ingredient, and shopping-list large-list interactions.

### How strict should the gate be?

| Option | Description | Selected |
|--------|-------------|----------|
| No worse than Phase 2 budgets | Practical Phase 2 budgets are strict; 100 ms remains an ideal/warning. | yes |
| Same under 100 ms ideal | Make the 100 ms shell target strict across Phase 3 checks. | |
| Evidence only | Record data but do not fail unless the app breaks. | |

**User's choice:** No worse than Phase 2 budgets.
**Notes:** Phase 3 must not regress the Phase 2 responsiveness fixes.

---

## the agent's Discretion

- Exact deferred-sync scheduling mechanism and app-ready/idle detection approach.
- Exact sync modal component split, loading state design, and progressive warning implementation.
- Exact image-risk thresholds and resource metrics, within the row-preservation decisions above.
- Exact test IDs, evidence fields, script names, and optional service-worker diagnostic command.

## Deferred Ideas

- Production service-worker behavior as a strict gate.
- Full image-storage redesign or broad hard limits for all dish image data.
- Backend/server migration for shared sync/publish workflows.
- Broad drawer/navigation/app-shell route responsiveness, except for narrow shell-blocking issues caused by online work.
