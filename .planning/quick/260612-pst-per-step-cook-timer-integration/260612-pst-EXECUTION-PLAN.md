# Execution Plan: Per-step Cook Timer Integration

**Feature ID:** 260612-pst
**Date:** 2026-06-12
**Status:** Draft
**Scope:** Bind recipe steps to cooking phases and give each step its own optional timer (with unattended/notification mode).

---

## 1. Problem Statement

Today the cooking session has a single phase-keyed timer (`CookingTimer` in `src/Store/Models/CookingSession.ts`) and a flat `DishesStep[]` list with no time information. Steps and phase timing live in separate worlds:

- A user reading "Để ninh 15 phút" has to manually start a timer, switch screen, watch the clock, and remember which phase they are in.
- Long unattended waits (ninh, ướp, hấp) force the user to stay near the stove because there is no notification when the wait is over.
- Phase totals (`DishDuration.cooking = 30`) cannot be broken down into individual sub-steps.

We want to:

1. Bind every step to one of the existing `DishDurationPhaseKey` values (`unfreeze | prepare | cooking | serve | cooldown`) so the cooking UI can group/color-code steps by phase.
2. Allow per-step timers (e.g., "Ninh 15 phút" is one step, "Nêm gia vị" is another) without removing the phase-level totals.
3. Mark a step as "không cần đứng bếp" so the app fires a notification + alarm when the timer ends, even if the user has switched apps.
4. Stay 100% backward compatible: all new fields are optional, existing dishes keep working.

Out of scope for this iteration:
- Auto-deriving phase totals from sum of step timers (we only validate, not auto-sync).
- Multi-step parallel timers (only one active step timer at a time).
- Translating notifications to other locales (Vietnamese only for now).

---

## 2. Data Model Changes

### 2.1 Extend `DishesStep`

File: `src/Store/Models/Dishes.ts`

```ts
export type DishesStep = {
    id: string;
    content: string;
    order: number;
    isDone: boolean;
    required: boolean;
    // NEW
    phaseKey?: DishDurationPhaseKey;  // which phase this step belongs to; undefined = "general"
    timerMinutes?: number;             // if set, step has its own timer (>= 1)
    unattended?: boolean;              // if true: notification + alarm fire when timer ends
}
```

Rules:
- `phaseKey` undefined => step is rendered without a phase rail (treated as "Chung").
- `timerMinutes` undefined or 0 => step has no timer (just a checklist item).
- `unattended` only meaningful when `timerMinutes > 0`. If `timerMinutes` is undefined we ignore it.
- If `timerMinutes` is set but `phaseKey` is undefined, the timer still works; it just doesn't roll up into any phase.

### 2.2 No change to `DishDuration`

`DishDuration` already covers phase totals. We do NOT auto-compute it from steps. We surface a soft warning in the editor when `sum(step.timerMinutes for step in phase) > DishDuration[phase]`.

### 2.3 No change to `CookingTimer`

`CookingTimer` (in `src/Store/Models/CookingSession.ts`) keeps phase-level timing. We add a sibling `activeStepTimer` slice in the cooking session view-state (not persisted to dish model):

```ts
type ActiveStepTimer = {
    stepId: string;
    phaseKey?: DishDurationPhaseKey;
    startedAt: number;     // ms epoch
    durationMs: number;
    unattended: boolean;
    status: "running" | "paused" | "done" | "dismissed";
};
```

This lives in the cooking session store, not in the dish.

### 2.4 Migration

- Pure additive change. No migration script needed.
- Existing serialized dishes load fine (missing fields => `undefined`).
- Export/import (if any) uses optional chaining and fallback defaults.

---

## 3. Step Editor UI (DishesEdit / DishesAdd)

### 3.1 Where the changes go

- `src/Pages/Dishes/DishesAdd/index.tsx` (and corresponding `DishesEdit`) — wherever the step row form is rendered (look for the existing `content`, `required` inputs).
- Likely a shared `StepRow` / `StepEditor` component. If not extracted, extract one in this work.

### 3.2 ASCII mockup of the new step row

```
+-------------------------------------------------------------------------------+
| Bước 3                                                              [X xoá]   |
| +-------------------------------------------------------------------------+   |
| | Mô tả: [ Ninh thịt 15 phút trên lửa nhỏ                              ] |   |
| +-------------------------------------------------------------------------+   |
|                                                                                |
| Giai đoạn (?) [ Nấu chính  v ]    Bắt buộc (?) [x]                            |
|   chips: [ Rã đông ][ Sơ chế ][ Nấu chính (•) ][ Bày ][ Hạ nhiệt ]            |
|                                                                                |
| Hẹn giờ (?)  [ 15 ] phút     Không cần đứng bếp (?) [x]                       |
|                                                                                |
| (?) Khi nào dùng?                                                              |
|     Bước cần chờ thời gian cụ thể, ví dụ ninh 15 phút.                        |
|     Bật "không cần đứng bếp" nếu bạn có thể rời bếp - app sẽ rung             |
|     và báo khi xong.                                                           |
+-------------------------------------------------------------------------------+
```

Notes on rendering:

- "Giai đoạn" is a dropdown rendered as colored chips. Color palette must match the phase colors used in the cooking session widget today (look at how `DishDurationPhaseKey` is colored in current cooking-session components and reuse the same map). Active chip has a small dot.
- "Hẹn giờ" is a numeric input (minutes, integer >= 1). Empty = no timer.
- "Không cần đứng bếp" is disabled (greyed) when "Hẹn giờ" is empty.
- Each `(?)` is a question-mark toggle that expands a one-line hint inline (existing pattern in the codebase — reuse the same component used elsewhere for field hints).
- Validation:
  - `timerMinutes` >= 1 and <= 600 (10 hours sanity cap).
  - If sum of step timers in a phase > the phase's `DishDuration` total: show a yellow soft warning under the phase chip ("Tổng bước (35') > giai đoạn (30')"). Not a blocker.

### 3.3 Question-mark hint copy

| Field | Hint |
|---|---|
| Giai đoạn | "Bước này thuộc giai đoạn nào? Dùng để nhóm và tô màu trong khi nấu." |
| Hẹn giờ | "Khi nào dùng? Bước cần chờ thời gian cụ thể, ví dụ ninh 15 phút." |
| Không cần đứng bếp | "Bật để app báo khi xong, ngay cả khi bạn chuyển sang app khác." |

---

## 4. Cooking Session Widget Integration

### 4.1 Behavior

- Steps are listed in `order`. Each step shows its phase color rail and (if any) a timer indicator.
- When the user marks the previous step done and advances to a step where `timerMinutes > 0`:
  - Auto-create an `ActiveStepTimer` and start it.
  - Show the countdown prominently (large mm:ss).
  - If `unattended === true`:
    - On first such step in the session, request `Notification.permission` (only once; if denied, fall back silently to in-app alarm + vibration).
    - Show a hint banner: "Bạn có thể rời bếp - app sẽ báo khi xong".
    - On timer end: fire `Notification` ("Bước xong: <step.content>"), play alarm, vibrate.
  - If `unattended === false`:
    - Just countdown + alarm on end (no system notification).
- User can pause / resume / skip the step timer.
- When the step timer ends:
  - Mark the step `isDone = true` automatically only if `unattended === true`. Otherwise leave for the user to confirm.
  - Show a "Tiếp" button to advance.
- Phase timer behavior:
  - Phase total continues as before. Step timer is a **child** view; pausing step timer does NOT pause phase timer (the phase keeps cooking metaphorically).
  - If `step.timerMinutes < phase.totalMinutes`, only the step is timed — phase timer keeps its own running display in a secondary line.
  - If `step.timerMinutes >= phase.totalMinutes`, we cap the step timer display at the phase total (visually merge them) but still fire the step's own end event.

### 4.2 ASCII mockup: cooking session step view with active step timer

```
+------------------------------------------------------------------------+
| Đang nấu: Bò kho                              [pause] [next phase]    |
+------------------------------------------------------------------------+
| Giai đoạn: Nấu chính                                  Tổng: 30:00     |
| [###############---------]  18:42 / 30:00                              |
+------------------------------------------------------------------------+
|                                                                        |
|   BƯỚC 3 / 7   -   Ninh 15 phút trên lửa nhỏ                          |
|                                                                        |
|              +-------------------------------+                         |
|              |                               |                         |
|              |          14 : 23              |  <- countdown           |
|              |                               |                         |
|              +-------------------------------+                         |
|                                                                        |
|   [bell icon] Bạn có thể rời bếp - app sẽ báo khi xong                 |
|                                                                        |
|   [ Tạm dừng ]  [ Bỏ qua ]  [ +1 phút ]                                |
|                                                                        |
+------------------------------------------------------------------------+
| Các bước                                                              |
|  | Sơ chế     |  1. Rửa thịt                                  [done]  |
|  | Sơ chế     |  2. Ướp thịt 20'                  (T)        [done]  |
|  | Nấu chính  |> 3. Ninh 15'                      (T) (zzz)  [now ]  |
|  | Nấu chính  |  4. Nêm gia vị                                [    ]  |
|  | Nấu chính  |  5. Thả khoai tây và cà rốt                   [    ]  |
|  | Bày        |  6. Múc ra tô                                 [    ]  |
|  | Hạ nhiệt   |  7. Để nguội 5'                   (T)         [    ]  |
+------------------------------------------------------------------------+
```

Legend:
- `(T)` = step has a timer.
- `(zzz)` = step is unattended.
- The left rail before each step name is the phase color chip (one cell wide).
- The active step (`>` marker) is highlighted.

### 4.3 ASCII mockup: notification flow

```
[Step timer 15:00 starts]
        |
        | unattended === true  ->  request Notification.permission (first time only)
        |       granted  -> proceed silently
        |       denied   -> proceed silently (fall back to in-app alarm only)
        |
        v
   user navigates away (browser tab in background)
        |
        v
[Timer hits 00:00]
        |
        +--> alarm.play()                    (existing alarm asset)
        +--> if unattended:
        |       Notification("Bước xong: Ninh 15'", { body: "Bò kho", icon: ... })
        |       navigator.vibrate?.([400, 200, 400])
        +--> mark step.isDone = true (only if unattended)
        +--> existing cross-page notification fallback (commit 951d3bed)
        |       posts a message via BroadcastChannel/localStorage so any open
        |       tab receives it, not just the one that started the timer
        v
[user taps notification]
        |
        v
   focus app -> jump to current cooking session -> show "Tiếp" CTA
```

### 4.4 Files likely touched

(Confirm exact paths during implementation; search for current cooking-session widget location.)

- `src/Pages/CookingSession/...` — step list rendering, active step view, timer overlay.
- `src/Store/Models/CookingSession.ts` — add `ActiveStepTimer` to view-state slice.
- `src/Store/Reducers/CookingSession*.ts` — actions: `startStepTimer`, `pauseStepTimer`, `tickStepTimer`, `endStepTimer`, `dismissStepTimer`, `extendStepTimer`.
- `src/Helpers/Notification.ts` (or equivalent — find existing wrapper from commit `951d3bed`).
- `src/Helpers/Alarm.ts` (or equivalent — reuse existing alarm play function).

---

## 5. Step List UI in Cooking Session

Already shown in the mockup above. Detailed rules:

- Left phase rail: one column, width ~6px, colored per `phaseKey`. Steps without `phaseKey` get a neutral grey rail.
- Phase name label: shown only on the first step of a run of identical phases (group header style) — to keep the list compact. Alternative: show on every row but in muted style. Pick group-header style for density.
- Timer indicator: small clock icon + "15'" badge. Unattended adds a moon/zzz icon.
- Active step gets a `>` marker plus background tint of the phase color at low opacity.
- Done steps grey out content but keep the rail color.

---

## 6. Sound, Notification, Vibration

- **Audio**: reuse the existing alarm sound used by phase timer end. Play once on step timer end. If the user is currently on the cooking session page, also flash the countdown card.
- **Notification**: use `window.Notification`. Wrap in a helper that no-ops on unsupported environments. Permission request only on the first unattended step in a session.
- **Vibration**: `navigator.vibrate?.([400, 200, 400])` only when `document.visibilityState === "hidden"` or on touch devices (avoid annoying desktop users with focused tabs).
- **Cross-page fallback**: reuse the BroadcastChannel/localStorage notifier introduced in commit `951d3bed`. The step-timer end event must publish through the same channel so a different tab can show the notification if the original tab is suspended.

---

## 7. Question-mark Toggles

Reuse the existing inline-hint pattern (find current usages with grep on the help-tooltip component name). New hint locations:

- Step editor: "Giai đoạn", "Hẹn giờ", "Không cần đứng bếp".
- Cooking session step list: a single `(?)` next to "Các bước" header explaining the phase color rail and timer/unattended icons.
- First-run only banner inside cooking session: "Mới: bạn có thể đặt giờ cho từng bước. Vào sửa món để bật."

---

## 8. Backward Compatibility / Migration

- All new fields are optional. Old data: `phaseKey`, `timerMinutes`, `unattended` all `undefined`.
- Renderers must default safely:
  - No `phaseKey` => neutral rail, no group header.
  - No `timerMinutes` => no timer indicator, advancing the step does not start a timer.
- No DB / storage version bump needed.
- Export/import (if any): if exported JSON is older, fields just stay undefined on import.

---

## 9. Testing Scenarios

Functional:

1. Old dish (no phase, no timer fields) renders unchanged in editor and cooking session.
2. Add step with phase only, no timer => list shows phase rail, no timer indicator. Advancing does not start a timer.
3. Add step with phase + timer (15') attended => advancing starts countdown, alarm at end, no notification, isDone NOT auto-set.
4. Add step with phase + timer + unattended => advancing requests permission once, countdown runs, switching tab + waiting => notification fires, alarm plays, vibration on supported device, isDone auto-set.
5. Pause / resume step timer keeps remaining time correctly.
6. `+1 phút` button extends a running step timer.
7. `Bỏ qua` ends step timer early without firing alarm.
8. Step timer of 5' inside a phase totalling 30': step ends at 5', phase keeps going to 30'.
9. Step timer of 40' inside a phase totalling 30': UI shows soft warning in editor; in cooking session, step timer caps display at 30' but still fires its own end at 40'.
10. Two steps in same phase both with timers: second timer only starts when user advances to it.

Edge / safety:

11. Notification permission denied: graceful in-app alarm + vibration only, no error.
12. Browser without `Notification`: code path no-ops.
13. Browser without `navigator.vibrate`: no-ops.
14. App closed entirely: timer state persists in store; on reopen we resume countdown if `startedAt + durationMs` not yet passed; if passed, fire end event once.
15. Multiple cooking-session tabs open: BroadcastChannel ensures only one notification fires.

UI/UX:

16. Phase chip colors match cooking session colors (visual diff).
17. Help hints appear/dismiss via `(?)` toggle, do not push other rows around (use absolute / collapsible).
18. Editor validation: `timerMinutes = 0` clears unattended.
19. Long step content with timer indicator does not wrap badly.

Backward compat:

20. Loading a dish saved before this feature shows no phase rail and behaves exactly like today.

---

## 10. Implementation Order

Build in vertical slices so each step ships testable progress.

1. **Model + types**
   - Edit `src/Store/Models/Dishes.ts`: add `phaseKey?`, `timerMinutes?`, `unattended?`.
   - Verify with `tsc` (per project memory: yarn build is broken; use tsc to verify).

2. **Editor: phase chip + timer fields**
   - Add UI in `DishesAdd` step row; share with `DishesEdit`.
   - Wire to existing form state.
   - Add question-mark hints.
   - Add soft validation (sum check) — passive warning only.

3. **Cooking session: phase rail in step list**
   - Render colored left rail keyed by `phaseKey` using the existing phase color map.
   - Add timer + unattended badges on rows.

4. **Cooking session: active step view + step timer state**
   - Add `ActiveStepTimer` slice and reducers.
   - Auto-start when advancing to a step with `timerMinutes`.
   - Pause / resume / +1 / skip controls.
   - Audio cue on end (reuse alarm).

5. **Unattended path: notification + vibration + cross-page fallback**
   - Permission request on first unattended step.
   - Hook into existing cross-page notifier (commit `951d3bed`).
   - Vibration fallback.
   - Auto-set `isDone` when unattended timer completes.

6. **Persistence/resume**
   - Persist `ActiveStepTimer` so a refresh / reopen restores or fires the end event correctly.

7. **Polish**
   - First-run banner in cooking session.
   - Soft warning when sum of step timers > phase total.
   - Final visual pass against mockups.

8. **Test pass**
   - Walk every scenario in section 9.
   - Verify with `tsc` (project memory: avoid `yarn build`).

---

## 11. Open Questions

- Do we want `+5 phút` as a second extend button, or keep only `+1`?
- Should ending an unattended step automatically advance to the next step, or just mark done and wait?
- Should phase color rail also appear in the dish editor step rows (not just cooking session)? Lean yes for consistency, but small footprint cost.

These can be decided during implementation; defaults: only `+1`, mark done but do not auto-advance, show rail in editor too.
