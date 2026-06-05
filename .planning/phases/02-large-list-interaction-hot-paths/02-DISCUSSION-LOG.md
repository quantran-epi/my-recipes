# Phase 2: Large-List Interaction Hot Paths - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 2-Large-List Interaction Hot Paths
**Areas discussed:** First fixes to prioritize, Interaction feel while heavy work finishes, Row content simplification, Performance gate strictness after the fix

---

## First fixes to prioritize

### Fixing priority

| Option | Description | Selected |
|--------|-------------|----------|
| Worst case first | Focus Phase 2 on the clearest measured pain first, especially the 13.4s/18.1s dish search reset, then apply the proven fix pattern to other lists. | yes |
| All lists evenly | Improve ingredients, dishes, and shopping lists in parallel, but the biggest visible hang may only be partly fixed if time is tight. | |
| Daily workflow first | Prioritize the interactions a normal user touches most, even if the worst measured number is elsewhere. | |

**User's choice:** Worst case first.
**Notes:** The Phase 1 stress baseline captured the dish-list search/reset as the clearest measured pain.

### Applying the pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Apply the pattern to all three lists | Fix the dish-list bottleneck first, then apply the same proven improvements to ingredients and shopping lists before Phase 2 ends. | yes |
| Only fix screens that fail badly | Faster, but may leave smaller delays in other lists. | |
| Keep Phase 2 mostly dish-list focused | Best if dishes are the main daily pain, but weaker coverage for the milestone. | |

**User's choice:** Apply the pattern to all three lists.
**Notes:** Dishes are first because they are the measured worst case, not because the other list screens are out of scope.

### First proof of success

| Option | Description | Selected |
|--------|-------------|----------|
| Search/reset becomes responsive | The measured worst case is search reset, so this gives the clearest before/after proof. | yes |
| Modal/menu opening becomes responsive | Focus on the actions users notice most when clicking buttons. | |
| All measured dish-list interactions improve | Broader proof, but may take longer before moving to other lists. | |

**User's choice:** Search/reset becomes responsive.
**Notes:** This should be the first clear before/after comparison from Phase 1 to Phase 2.

### Mixed rendering and online causes

| Option | Description | Selected |
|--------|-------------|----------|
| Fix list/rendering now, defer online causes | Phase 2 handles list interaction hot paths; Phase 3 handles online/image/sync costs. | yes |
| Fix anything needed for this delay | Broader, but Phase 2 may grow into Phase 3 work. | |
| Only document online causes | Keeps Phase 2 tight, but may leave the user-visible delay partly unresolved. | |

**User's choice:** Fix list/rendering now, defer online causes.
**Notes:** Online/image/sync work stays Phase 3 unless it blocks the list/rendering fix.

---

## Interaction feel while heavy work finishes

### First visible response

| Option | Description | Selected |
|--------|-------------|----------|
| Show shell immediately, load body after | The modal/drawer appears right away, with a spinner or lightweight placeholder while heavy content finishes. | yes |
| Wait until full content is ready | Avoids partial UI, but can feel like the click did nothing during heavy work. | |
| Depends on interaction type | Immediate shell for modals/drawers, but wait for small row menus if they can open fast. | |

**User's choice:** Show shell immediately, load body after.
**Notes:** The user should see that their click/tap worked.

### Placeholder style

| Option | Description | Selected |
|--------|-------------|----------|
| Simple spinner/loading area | Minimal UI, fastest to implement, matches the existing `DeferredModalContent` pattern. | yes |
| Skeleton preview | More polished, but more implementation work and can become another render cost. | |
| Text-only loading message | Clear, but less visually smooth than a spinner or skeleton. | |

**User's choice:** Simple spinner/loading area.
**Notes:** Keep loading UI simple for this performance phase.

### Placeholder exit condition

| Option | Description | Selected |
|--------|-------------|----------|
| When the main content is usable | It does not need every detail fully settled, only enough for the user to start reading or acting. | yes |
| Only when everything is fully ready | Cleaner final state, but keeps users waiting longer. | |
| After a fixed short delay | Predictable, but may hide too early or too late depending on content. | |

**User's choice:** When the main content is usable.
**Notes:** The main body can become usable before every secondary detail settles.

### Interaction coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Apply to all visible interactions | Modals, drawers, row menus, and detail views should all give immediate feedback. | yes |
| Only modals and detail views | Keeps scope tighter, but drawers/menus may still feel unresponsive. | |
| Only interactions that currently miss budget | More targeted, but less consistent. | |

**User's choice:** Apply to all visible interactions.
**Notes:** Phase 2 should avoid click-feels-dead behavior wherever it touches list interactions.

---

## Row content simplification

### Simplification allowance

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve current row details | Optimize rendering and memoization first; do not remove useful row information in this phase. | yes |
| Allow small simplifications | Remove or defer minor row details if they clearly improve speed. | |
| Aggressively simplify rows | Prioritize speed over current row richness, even if rows show less information. | |

**User's choice:** Preserve current row details.
**Notes:** Phase 2 is a responsiveness fix, not a row-content reduction phase.

### Deferring secondary row detail

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, if visually stable | Allowed only if the row does not jump, resize, or look broken. | yes |
| No, everything visible at once | Strict preservation, but may limit performance gains. | |
| Only for non-primary details | Defer counts/tags/status, but never defer title, image/fallback, or main actions. | |

**User's choice:** Yes, if visually stable.
**Notes:** Deferral is allowed only when layout remains stable and professional.

### Caching and precomputation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, preserve display | Users see the same info, but the app avoids recalculating it on every interaction. | |
| Only if always exact | More cautious; avoids stale-looking values but may reduce optimization options. | yes |
| No caching for now | Keeps behavior direct, but likely leaves performance on the table. | |

**User's choice:** Only if always exact.
**Notes:** Cached or precomputed values must remain correct and not stale-looking.

### Tradeoff escalation

| Option | Description | Selected |
|--------|-------------|----------|
| Escalate the tradeoff before removing details | Keep details by default; only simplify after evidence and explicit approval. | yes |
| Allow minor removal automatically | Faster implementation, but could weaken UX without review. | |
| Never remove row details | Strong UX preservation, but may make some performance targets harder. | |

**User's choice:** Escalate the tradeoff before removing details.
**Notes:** Useful row detail must not be removed silently.

---

## Performance gate strictness after the fix

### Gate strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Strict for key fixed interactions | The interactions Phase 2 fixes should fail tests if they regress beyond the agreed budget. | yes |
| Warnings only for now | Safer while performance numbers vary, but weaker protection against regressions. | |
| Strict only for worst case search/reset | Protects the biggest fix, but leaves modals/menus/drawers less guarded. | |

**User's choice:** Strict for key fixed interactions.
**Notes:** Fixed Phase 2 hot paths should become protected regression gates.

### Budget style

| Option | Description | Selected |
|--------|-------------|----------|
| Practical strict budget plus 100 ms warning | Fail if interaction is clearly too slow, but keep the 100 ms ideal as a warning/target. | yes |
| Strict 100 ms for everything fixed | Very strong UX goal, but may be flaky or unrealistic for heavy content. | |
| Separate shell and content budgets | Strict shell budget and separate content-ready budget; more precise but more complicated. | |

**User's choice:** Practical strict budget plus 100 ms warning.
**Notes:** Keep 100 ms as the ideal shell target, not the default strict failure threshold.

### Timing dimensions

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, keep both timings | Protects the respond-immediately, load-body-after decision. | yes |
| Only measure shell-visible | Simpler and focused on perceived responsiveness, but may miss slow content. | |
| Only measure content-ready | Measures full completion, but can miss the click-feels-dead problem. | |

**User's choice:** Yes, keep both timings.
**Notes:** Shell-visible and content-ready remain separate metrics.

### First strict interactions

| Option | Description | Selected |
|--------|-------------|----------|
| Search/reset, modal/detail open, row menu open | Covers the main Phase 2 hot paths without expanding into all navigation/network work. | yes |
| Everything Phase 1 measured | Broadest protection, but may pull Phase 3/4 issues into Phase 2. | |
| Only search/reset first | Very focused, but weaker coverage for modal/menu fixes. | |

**User's choice:** Search/reset, modal/detail open, row menu open.
**Notes:** Drawer/sidebar and route/navigation work should not accidentally expand Phase 2 beyond its hot-path list scope.

## the agent's Discretion

- Choose exact optimization techniques and whether they are shared utilities or screen-local changes.
- Choose practical strict budgets based on Phase 1 evidence and post-fix measurements, while preserving 100 ms shell warnings and separate shell/content timings.

## Deferred Ideas

- Online/image/sync/service-worker performance causes remain Phase 3 unless they directly block the Phase 2 list/rendering fix.
- Broader navigation and app-shell responsiveness remains Phase 4.
- Major visual redesign, list replacement, framework migration, backend migration, and storage migration remain out of scope.
