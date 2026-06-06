# Phase 4: Navigation and App-Shell Responsiveness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 4-Navigation and App-Shell Responsiveness
**Areas discussed:** Sidebar Opening, Route Feedback, Overlay Feel, UX Proof Flows

---

## Sidebar Opening

### Opening Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Fast shell | Keep the drawer shell cheap and defer sync, backup, admin, and guide/history sections until after it is visible. | ✓ |
| Full drawer | Keep every drawer section ready immediately, preserving current behavior but likely keeping some opening delay. | |
| You decide | Let the planner choose the exact split while prioritizing visible responsiveness and no workflow loss. | |

**User's choice:** Fast shell.
**Notes:** Sidebar opening should prioritize visible responsiveness from large-list screens.

### Immediate Drawer Content

| Option | Description | Selected |
|--------|-------------|----------|
| Navigation first | Show logo/title and route links immediately. Load sync, backup, admin, guide/history sections after the drawer is already visible. | ✓ |
| Navigation + account | Show route links plus admin/account status immediately. Defer only sync, backup, guide/history tools. | |
| All tools visible | Show all current sections immediately, but make the internal heavy parts lazy. | |

**User's choice:** Navigation first.
**Notes:** Immediate drawer shell should include logo/title and route links.

### Heavy Section Reveal

| Option | Description | Selected |
|--------|-------------|----------|
| Quiet progressive load | Show the drawer immediately, then fade/insert heavier sections without blocking the user. | ✓ |
| Small loading row | Show loading feedback inside the drawer before sync/backup/admin sections appear. | |
| Only load when tapped | Keep sections collapsed or hidden until the user taps a tools/data area. | |

**User's choice:** Quiet progressive load.
**Notes:** Avoid noisy explanatory UI while preserving drawer access.

### Tool Preservation

| Option | Description | Selected |
|--------|-------------|----------|
| All current tools | Keep sync shared data, publish, Gist backup, admin login/logout, cooking history, and user guide. | ✓ |
| Daily tools only | Preserve navigation and common daily tools first; admin/sync/backup can be less prominent if speed improves. | |
| You decide | Preserve anything user-facing or risky and let the planner choose exact placement. | |

**User's choice:** All current tools.
**Notes:** Phase 4 should not delete or hide current drawer workflows.

---

## Route Feedback

### Feedback Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| All navigation paths | Drawer, bottom tabs, global search result clicks, and large-list detail navigation all show quick route feedback. | ✓ |
| Drawer and tabs only | Focus on app-shell navigation; leave global search and row/detail navigation mostly as-is. | |
| Problem paths only | Add feedback only where tests or manual checks show visible delay. | |

**User's choice:** All navigation paths.
**Notes:** Feedback should be consistent across drawer, tabs, global search, and large-list-to-detail transitions.

### Feedback Appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Small app-shell overlay | Use the existing compact `Đang mở trang / Chuẩn bị dữ liệu hiển thị` style. | ✓ |
| Inline button loading | Show loading directly on the tapped nav/search/list item. | |
| Full-page loading | Clearly block repeated taps while changing pages. | |

**User's choice:** Small app-shell overlay.
**Notes:** Preserve the existing compact route-feedback feel.

### Repeated Taps

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore duplicate taps | Once route feedback is active, ignore repeated taps to the same destination until navigation settles. | ✓ |
| Allow replacement | Let the user tap a different route and replace the pending destination immediately. | |
| Disable all navigation briefly | Block all nav taps until loading clears. | |

**User's choice:** Ignore duplicate taps.
**Notes:** The selected policy targets duplicate same-destination taps without broadly disabling navigation.

### Feedback Dismissal

| Option | Description | Selected |
|--------|-------------|----------|
| After route paints | Hide after the URL/route changes and the browser gets a short paint window. | ✓ |
| After fixed timeout | Always hide after a fixed short delay. | |
| After content marker | Hide only when the target page exposes a ready marker. | |

**User's choice:** After route paints.
**Notes:** This matches the current route-loading direction and avoids stale blocked shell state.

---

## Overlay Feel

### First Visible Overlay State

| Option | Description | Selected |
|--------|-------------|----------|
| Instant shell + light body | Show the overlay shell immediately with a small spinner or lightweight starter body, then fill heavy content. | ✓ |
| Skeleton placeholders | Show structured placeholder rows/cards. | |
| Only show when ready | Wait until real content is ready before showing the overlay. | |

**User's choice:** Instant shell + light body.
**Notes:** Avoid the current pause-before-showing feeling.

### Modal Deferral Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Tune existing deferral | Keep `DeferredModalContent`, but make shell timing more consistent and avoid mounting heavy bodies before shell paint. | ✓ |
| Add richer skeletons | Replace simple spinners with better placeholders for important modals. | |
| Leave modals mostly unchanged | Focus mostly on drawer/routes. | |

**User's choice:** Tune existing deferral.
**Notes:** No new skeleton system is required for Phase 4.

### Loading Text Level

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal text | Keep it quiet: spinner or short status only. Avoid explanatory in-app text. | ✓ |
| Clear status text | Show short messages like `Đang chuẩn bị...` in more places. | |
| No text | Visual spinner/skeleton only. | |

**User's choice:** Minimal text.
**Notes:** Keep UI focused; do not explain performance mechanics in-app.

### Layout Change Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve layout | Keep current information density and placement. Improve responsiveness without redesigning screens. | ✓ |
| Minor polish allowed | Small layout changes are okay if they clearly improve perceived speed and readability. | |
| You decide | Let the planner make small visual adjustments if needed, but avoid broad redesign. | |

**User's choice:** Preserve layout.
**Notes:** Phase 4 is responsiveness work, not visual redesign.

---

## UX Proof Flows

### Verification Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Daily path set | Verify drawer open/close, drawer navigation, bottom-tab navigation, global search navigation, large-list-to-detail navigation, and key modal open behavior. | ✓ |
| Navigation only | Verify drawer, tabs, global search, and detail routes; skip modal checks unless touched. | |
| Everything practical | Include daily path set plus cooking session, shopping-list creation, admin sync, Gist backup UI, and guide/history entry points. | |

**User's choice:** Daily path set.
**Notes:** Coverage should focus on daily high-value paths without expanding Phase 4 into every workflow.

### Evidence Balance

| Option | Description | Selected |
|--------|-------------|----------|
| Automated + eye checks | Add/extend automated timing checks and document simple manual checks the user can perform. | ✓ |
| Automated only | Focus on test gates and timing files. | |
| Eye checks only | Faster to document, but weaker regression protection. | |

**User's choice:** Automated + eye checks.
**Notes:** Final evidence should be useful both for regression protection and user review.

### Workflow Risk Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Stop and preserve UX | Do not simplify/remove the workflow silently. Preserve it, or document the tradeoff and ask before changing. | ✓ |
| Accept minor changes | Small workflow changes are okay if the speed win is clear. | |
| You decide | Let the planner decide, but require evidence that the workflow still works. | |

**User's choice:** Stop and preserve UX.
**Notes:** No silent workflow simplification is allowed.

### Visible Success Signal

| Option | Description | Selected |
|--------|-------------|----------|
| Drawer/routes feel instant | From large lists, sidebar open and navigation feedback should appear right away; content can finish after. | ✓ |
| No spinner visible | Prefer content to appear without obvious loading indicators. | |
| Timing numbers improve | Focus mainly on measured shell timings. | |

**User's choice:** Drawer/routes feel instant.
**Notes:** The result should be easy to judge by eye.

### Final Report Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Simple visual checklist | Explain what the user can check by eye, plus a short summary of timing evidence. | ✓ |
| Detailed technical report | Include implementation details, test command outputs, and timing tables. | |
| Both | Give the simple checklist first, then technical evidence below. | |

**User's choice:** Simple visual checklist.
**Notes:** Final report should be understandable to a non-technical user.

---

## the agent's Discretion

- Exact component boundaries, scheduling mechanism, route-feedback helper shape, test IDs, and evidence file naming can be chosen during planning/implementation.

## Deferred Ideas

None — discussion stayed within phase scope.
