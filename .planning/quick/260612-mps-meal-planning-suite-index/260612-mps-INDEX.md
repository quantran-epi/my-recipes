# Meal Planning Feature Suite — Index

**ID:** 260612-mps
**Type:** Feature suite index
**Date:** 2026-06-12
**Status:** Ready to execute

---

## 1. Purpose

This index orchestrates five meal-planning features that close the loop on data the app already collects (cooking sessions, leftovers, feedback, dish durations) and fix gaps in user mental model (skipped slots, prep timing, in-cook step timers).

When the user says "implement the suite" or "execute the index," work through the features in the order below. Each feature has its own self-contained execution plan with mockups, file lists, edge cases, and time estimates.

**Tell me to "execute the index" or "implement the suite" and I'll start at feature 1 below, work down, and commit each feature separately.**

---

## 2. Feature catalog

| Order | ID | Feature | Plan file | Estimate |
| --- | --- | --- | --- | --- |
| 1 | `eos` | Eat-out / skip-slot marking | [`260612-eos-EXECUTION-PLAN.md`](../260612-eos-eat-out-skip-slot-marking/260612-eos-EXECUTION-PLAN.md) | ~4h |
| 2 | `lap` | Leftover-aware smart planner | [`260612-lap-EXECUTION-PLAN.md`](../260612-lap-leftover-aware-smart-planner/260612-lap-EXECUTION-PLAN.md) | ~3.5h |
| 3 | `prr` | Prep task reminders from duration phases | [`260612-prr-EXECUTION-PLAN.md`](../260612-prr-prep-task-reminders-from-dish-duration/260612-prr-EXECUTION-PLAN.md) | ~5h |
| 4 | `cad` | Cooking analytics dashboard | [`260612-cad-EXECUTION-PLAN.md`](../260612-cad-cooking-analytics-dashboard/260612-cad-EXECUTION-PLAN.md) | ~5.5h |
| 5 | `pst` | Per-step cook timer integration | [`260612-pst-EXECUTION-PLAN.md`](../260612-pst-per-step-cook-timer-integration/260612-pst-EXECUTION-PLAN.md) | ~6h |

**Total: ~24 hours of focused work.** Sequencing matters — see §3.

---

## 3. Build order rationale

The order is not random. Each feature unlocks cleaner versions of the next, and skipping forward creates rework.

### 1 → `eos` first (foundational)

**Why first:** Adds the "skipped slot" concept to `ScheduledMeal`. Three downstream features need this distinction:
- `lap` — leftover-first alternatives should respect skipped slots (don't suggest a leftover for a slot user marked "ăn ngoài")
- `cad` — analytics needs to filter skipped slots out of "incomplete meals" stats; otherwise dashboards show garbage
- `prr` — prep tasks should not generate for skipped slots

**Risk if skipped:** Every later feature ships with a "TODO: handle skipped slots" comment that becomes a chore later. Building `eos` first means later code can call `getSlotState(meal, slot) === 'skipped'` and just work.

### 2 → `lap` second (engine extension)

**Why now:** Leftover-aware planner is engine-only changes plus one priority chip. It's the smallest scope that delivers high-value behavior, and the data (leftovers with meal context) is already collected.

**Depends on `eos`:** Skipped slots should not get leftover suggestions (they're already opted out of cooking).

**Risk if skipped:** Users keep wasting food while the data sits unused.

### 3 → `prr` third (independent UX win)

**Why now:** Prep task reminders are pure derivation from `Dishes.duration` and `ScheduledMeal.plannedDate`. No new data collection, no engine touch. High emotional payoff (user opens app at night, sees what to thaw tomorrow morning).

**Depends on `eos`:** Skipped slots shouldn't generate prep tasks.

**Risk if skipped:** Users keep forgetting to thaw meat 4h before dinner.

### 4 → `cad` fourth (read-only surface)

**Why now:** Cooking analytics is read-only — it surfaces existing data. Putting it after `eos` and `lap` means the data it visualizes is cleaner (skipped slots filtered, leftover-first plans tracked).

**Depends on `eos`:** Otherwise "incomplete meal" counts are misleading.
**Benefits from `lap`:** Tracks how often leftover-first alternatives are picked.

**Risk if skipped:** Users have no insight into their own cooking patterns.

### 5 → `pst` last (biggest scope, mostly orthogonal)

**Why last:** Per-step timers touch the cooking session widget — the largest existing module. It's mostly orthogonal to the other features (steps + phases vs slots + meals are different mental models). Saving it for last means the rest of the suite is shipped before this one's complexity blocks anything.

**Depends on:** Nothing strictly. Could swap with `cad` if step timers are higher priority for the user.

**Risk if skipped:** Users keep using a single global cook timer when a per-step countdown would be much clearer.

---

## 4. Cross-feature integration points

When working through the suite, these are the places where features touch each other:

| Touch point | Features involved | Action |
| --- | --- | --- |
| `getSlotState(meal, slot)` helper | `eos` defines, `lap` + `prr` + `cad` consume | Build helper in `eos`, reference in others |
| `availableLeftovers` filtering | `lap` uses; respect `eos` skipped slots | When generating leftover combo, skip slots where `getSlotState === 'skipped'` |
| `selectLeftoverTrackerItems` selector | `lap` consumes, `cad` consumes | Already exists; both features pass through `useMemo` filters |
| Score detail entry "Tận dụng đồ thừa" | `lap` adds | Pattern matches existing `SCORE_METHODOLOGY` registry |
| Question-mark toggle pattern (`openHelpKey`) | `lap`, `prr`, `cad`, `pst` all use | Copy from `SmartMealPlanner.screen.tsx` — single state, `_toggleHelp` callback |
| Phase chip palette (`DISH_DURATION_PHASES`) | `prr` and `pst` both surface | Reuse colors verbatim from `DishDurationHelper` |
| Drawer entries | `prr` and `cad` add new entries | Mirror existing `chat.png` / `food-preparation.png` pattern |

---

## 5. Verification per feature

Each feature commits independently. Before each commit:

1. `npx tsc --noEmit` — must pass (matches project memory: tsc, not yarn build)
2. Manual smoke test on:
   - Desktop viewport
   - 360px-wide mobile viewport
3. Spot-check no existing flow is broken (open dashboard, planner, dish edit, cook session)
4. Commit message format: `feat(scheduled-meal): <one-line summary>` with body listing the highlights

Per project memory: do not push from this session — user will push manually.

---

## 6. Skill prerequisites checklist

Before starting any feature, the implementer should be able to:

- Read TypeScript and React/Redux idioms in this codebase (functional components, `useSelector`, `useMemo`, hand-rolled CSS-in-JS via `style={{...}}`)
- Use the project's existing component primitives (`<Box>`, `<Stack>`, `<Modal>`, `<Tag>`, `<Typography.Text>`)
- Follow the existing planner detail-modal pattern for question-mark toggles (`openHelpKey` state)
- Keep changes confined to listed files — don't refactor unrelated code

---

## 7. How to invoke this index

When the user says any of:

- "implement the index" / "execute the index"
- "build the meal planning suite"
- "do all five features"
- "implement `260612-mps`"

Then:

1. Read this file to confirm the order.
2. Read each feature's `EXECUTION-PLAN.md` in order before starting it.
3. Work feature 1 → 5, committing each separately.
4. Update §8 below as features land (mark them ✓).

When the user says "implement `260612-eos`" (or any single ID), just run that feature's plan, no suite context needed.

---

## 8. Status tracking

Update this section as features land:

- [x] 1 — `eos` Eat-out / skip-slot marking
- [x] 2 — `lap` Leftover-aware smart planner
- [ ] 3 — `prr` Prep task reminders
- [ ] 4 — `cad` Cooking analytics dashboard
- [ ] 5 — `pst` Per-step cook timer integration

When all five are checked, the suite is complete.

---

## 9. Open scope decisions (already made)

These were resolved during planning, recorded here so they're not re-litigated:

| Decision | Choice | Plan |
| --- | --- | --- |
| Leftover toggle location | Priority chip "Tận dụng đồ thừa" (default ON) | `lap` §2 |
| Skipped slot data shape | Parallel `skipMeals` field on `ScheduledMeal` | `eos` §2.1 |
| Tag requirement options source | Real dish tags (already shipped in commit `1269c7d6`) | n/a |
| Per-step timer phase binding | Optional `phaseKey` on step, defaults to undefined | `pst` plan |
| Analytics chart library | None — HTML/CSS bars only for v1 | `cad` §6 |
| Prep task slot times | Per household, default 07/12/19, configurable | `prr` §4.1 |

---

## 10. Future suite (not in this index)

Possible v2 features (deferred):
- iCal export of scheduled meals
- Aisle-grouped shopping list
- Web push notifications for prep tasks
- Recipe URL paste import
- Cross-meal portion accounting for leftovers
- Per-scheduled-meal slot time overrides

These are not in any plan file. If the user wants any of them, write a new plan in a sibling directory.

---

## 11. Plan file inventory (for reference)

```
.planning/quick/
├── 260612-mps-meal-planning-suite-index/
│   └── 260612-mps-INDEX.md          ← this file
├── 260612-eos-eat-out-skip-slot-marking/
│   └── 260612-eos-EXECUTION-PLAN.md
├── 260612-lap-leftover-aware-smart-planner/
│   └── 260612-lap-EXECUTION-PLAN.md
├── 260612-prr-prep-task-reminders-from-dish-duration/
│   └── 260612-prr-EXECUTION-PLAN.md
├── 260612-cad-cooking-analytics-dashboard/
│   └── 260612-cad-EXECUTION-PLAN.md
└── 260612-pst-per-step-cook-timer-integration/
    └── 260612-pst-EXECUTION-PLAN.md
```
