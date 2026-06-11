# Cooking Timer + Duration Learning — Execution Plan

**Date:** 2026-06-11
**Status:** Ready to execute
**Scope:** Two chained features for the cooking flow.

> Self-contained. A model/developer with no prior context should execute this end to end. All codebase facts below were verified against the repo on 2026-06-11 — re-verify line numbers before editing, files drift.

---

## 1. Why these two together

They are one feedback loop, built in two phases:

- **Feature A — Live Cooking Timer.** Every dish already stores a 5-phase duration (`unfreeze / prepare / cooking / serve / cooldown`). Today those minutes are used only for planning estimates; at cook time they are thrown away. Feature A turns them into a live, phase-by-phase countdown that guides the cook **and records how long each phase actually took.**
- **Feature B — Duration Learning.** Feature A's recorded actual times feed a per-dish stat. The app then shows "you usually take ~38 min, not the 25 you estimated" and offers one-tap "update this dish's duration to match reality." Estimates converge to truth over time, which makes both the timer and the Smart Planner more accurate.

A produces the data; B consumes it. Build A first.

---

## 2. Verified codebase facts (use these; don't rediscover)

**Models**
- `src/Store/Models/Dishes.ts` — `DishDuration = Record<DishDurationPhaseKey, number | null>`, phase keys `"unfreeze" | "prepare" | "cooking" | "serve" | "cooldown"` (lines 42-44).
- `src/Store/Models/CookingSession.ts` — `CookingSession` already has `startedAt`, `finishedAt?`, `status`, `steps`, `currentStepIndex`, `completedStepIndexes?`, `ingredients?`, `householdMemberIds?`, `notes?`, `memberFeedback?`. **No timer fields yet.**

**Reducer** `src/Store/Reducers/CookingSessionReducer.ts`
- Slice name `cookingSession`. State `{ sessions: CookingSession[] }`.
- `start` sets `startedAt: new Date().toISOString()`; `finish`/`cancel` set `finishedAt`. Action creators are aliased on export (`startCooking`, `finishCooking`, etc.).
- `clearFinished` (`clearCookingHistory`) **deletes all non-cooking sessions** — so finished sessions are NOT a durable history. Learning stats must be stored separately (see Feature B), not derived from session list.

**Duration helper** `src/Common/Helpers/DishDurationHelper.ts` — already provides everything the UI needs:
- `DISH_DURATION_PHASES`: ordered array, each phase has `key, label, shortLabel, description, color, background, border, defaultMinutes`.
- `getActiveItems(duration)` → `[{ phase, minutes }]` for phases with `minutes > 0`, **in canonical order**. This is the timer's timeline source.
- `getTotalMinutes`, `getTotalMinutesForDish` (aggregates included dishes), `formatMinutes(min)` → `"38 phút"` / `"1 giờ 5 phút"`, `getTempo(min)` → `{ label, color, ... }`, `normalize`.
- Phase icons live in `src/Modules/Dishes/Screens/DishesManageIngredient/DishDuration.widget.tsx` (`durationIcon(key, color)`, lines 25-35) — extract/reuse, don't redefine.

**Cooking UI** `src/Modules/Dishes/Screens/CookingSession.widget.tsx`
- Local state `phase: "prep" | "cooking"` (line 88) — this is the **screen mode** (prep checklist vs cooking steps), NOT a duration phase. ⚠️ Do not confuse the two. New timer code uses `activePhaseKey` / `timerPhase` naming to stay distinct.
- Active session resolved via `sessions.find(s => s.dishId === dish.id && s.status === "cooking")` (line 99).
- Cooking mode (lines 204-248) renders: serving control, a yellow step-navigator box (prev/next, `Progress`, current step text, "mark step done" switch), lacking-ingredient warning, ingredient checklist, and the green "Hoàn thành món" button that sets `showFinish`.
- Prep mode (lines 250-335) shows `durationText` (line 269: `Gốc {baseServings} phần · {durationText}`) — **this is where Feature B's "you usually take" line is added.**
- `FinishCookingWidget` (`./FinishCooking.widget.tsx`) renders when `showFinish` or `totalSteps === 0`. **This is where Feature B's post-cook comparison + "update duration" CTA live.** It already shows `startedAt` via `moment().fromNow()` (line 84) and has the finish/cancel buttons (lines 130-137).

**Store** `src/Store/Store.ts` — `cookingSession` is in the **personal** root, persisted to IndexedDB, backed up by Gist as `personal-cookingSession.json` (`useGistBackup.ts`). Adding fields to this slice automatically flows through backup. No new Gist part needed.

**Persistence config** — `configureStore` uses `serializableCheck: false`, so ISO-string timestamps in state are fine.

---

## 3. CORE PRINCIPLE — never tick Redux

The countdown re-renders every second, but **Redux must not be written every second** (it would thrash redux-persist → IndexedDB and tank performance). The rule:

- **Redux stores only anchor data**: which phase is active, the wall-clock timestamp the current running segment began (`phaseStartedAt`), accumulated frozen seconds per phase, paused flag. These change **only on user actions** (start / pause / resume / advance / finish).
- **The component computes live remaining time** from those anchors using a local `setInterval(1000)` that drives a `useState` tick (or `useReducer`), never dispatching on tick.
- Live elapsed for the running phase = `accumulatedSeconds + (paused ? 0 : (now - phaseStartedAt))`.

This also makes the timer **survive app close/navigation for free**: on reopen, `phaseStartedAt` is in the past and elapsed recomputes correctly. (Time while the app was closed counts as cook time — acceptable and realistic. Note it in code comments.)

---

## 4. Feature A — Live Cooking Timer

### 4.1 Model additions — `CookingSession.ts`

```ts
import { DishDurationPhaseKey } from "./Dishes";

export type CookingPhaseTimer = {
    phaseKey: DishDurationPhaseKey;
    plannedMinutes: number;     // from dish duration at start
    accumulatedSeconds: number; // frozen actual time; running segment added live in UI
};

export type CookingTimer = {
    phases: CookingPhaseTimer[];          // ordered active phases (from getActiveItems)
    activePhaseKey: DishDurationPhaseKey | null; // null = timer finished / not started
    phaseStartedAt: string | null;        // ISO; null when paused or finished
    isPaused: boolean;
    completedPhaseKeys: DishDurationPhaseKey[];
    soundEnabled: boolean;                // user mute toggle, default true
};

// add to CookingSession:
//   timer?: CookingTimer;
```

### 4.2 Reducer additions — `CookingSessionReducer.ts`

Add reducers (and export aliases). All operate on the matching session by `sessionId`; finalizing a running segment means `accumulatedSeconds += round((Date.now() - Date.parse(phaseStartedAt)) / 1000)`.

- `startTimer({ sessionId, phases })` — `phases` is `{ phaseKey, plannedMinutes }[]` (caller derives from `DishDurationHelper.getActiveItems(dish.duration)`). Initialize `timer` with all `accumulatedSeconds: 0`, `activePhaseKey = phases[0].phaseKey`, `phaseStartedAt = now`, `isPaused = false`, `completedPhaseKeys = []`, `soundEnabled = true`. No-op if no phases.
- `pauseTimer({ sessionId })` — finalize running segment into the active phase's `accumulatedSeconds`, set `isPaused = true`, `phaseStartedAt = null`.
- `resumeTimer({ sessionId })` — `isPaused = false`, `phaseStartedAt = now`.
- `advancePhase({ sessionId })` — finalize current segment, push `activePhaseKey` into `completedPhaseKeys`, set next active phase (`phaseStartedAt = isPaused ? null : now`). If none left, `activePhaseKey = null` (timer done) — keep `accumulatedSeconds` intact for Feature B.
- `toggleTimerSound({ sessionId })` — flip `soundEnabled`.
- `adjustPhaseMinutes({ sessionId, phaseKey, plannedMinutes })` *(optional, nice-to-have)* — let user nudge a phase's planned time mid-cook.

⚠️ `finishCooking`/`cancelCooking` must finalize any running segment first (so Feature B reads correct actuals). Update those reducers to fold `now - phaseStartedAt` into the active phase before flipping status, or call pause logic internally.

### 4.3 Selector

`src/Store/Selectors.ts` — add `selectActiveCookingTimer` if convenient, but the widget already has the session; reading `session.timer` directly is fine. No new selector strictly required.

### 4.4 The timer hook (component-local, no Redux ticking)

Create `src/Modules/Dishes/Screens/useCookingTimer.ts` (or inline in the widget):

```
useCookingTimer(session, dispatch):
  - local tick state; useEffect sets interval 1000ms only while timer running & not paused & activePhaseKey != null; clears on unmount/pause/done.
  - derive, each render:
      activePhase = phases.find(activePhaseKey)
      runningSeconds = isPaused ? 0 : max(0, floor((Date.now() - Date.parse(phaseStartedAt))/1000))
      activeElapsedSec = activePhase.accumulatedSeconds + runningSeconds
      plannedSec = activePhase.plannedMinutes * 60
      remainingSec = plannedSec - activeElapsedSec       // negative => overtime
      isOvertime = remainingSec < 0
      totalPlannedSec / totalElapsedSec across all phases for the overall bar
  - expose: activePhase, remainingSec, isOvertime, percent, controls (start/pause/resume/advance/toggleSound), and an `onPhaseExpire` edge (fires once when crossing remaining 0).
```

**Alerts when a phase hits 0** (do NOT auto-advance — cooking isn't precise; let the user confirm):
- Visual: phase card switches to overtime style (red border/text, `+MM:SS`).
- Sound: short Web Audio beep (`AudioContext` oscillator, ~200ms, 880Hz, then 660Hz), gated by `soundEnabled`. Create the context lazily on first user gesture (start button) to satisfy autoplay policies.
- Haptics: `navigator.vibrate?.([200,100,200])` if available.
- Fire exactly once per phase crossing (track with a ref keyed by `activePhaseKey`), not every tick.

### 4.5 UI / UX (the important part — hands-on, intuitive, informative)

The timer is **additive** to the existing cooking screen. Render it inside cooking mode (the `if ((phase === "cooking" || activeSession) && session)` block, above the step-navigator box). Coexistence rules:

| Dish has duration? | Dish has steps? | Show |
|---|---|---|
| yes | yes | Timer card + phase strip, then existing step navigator |
| yes | no  | Timer card + phase strip, then finish button |
| no  | yes | Existing step navigator only (no timer) |
| no  | no  | Finish button only (unchanged) |

If no duration, optionally show a one-line "Bật hẹn giờ" hint that opens the dish duration editor — keep as a small text link, not a blocker.

**Layout — phase strip + active phase card (mobile-first, single column):**

```
┌─────────────────────────────────────────────┐
│  ✓ Sơ chế 10'   ●  Nấu 20'   ·  Hoàn thiện 5' │   ← phase strip: done=check+muted,
└─────────────────────────────────────────────┘      active=filled phase color, upcoming=outline
┌─────────────────────────────────────────────┐
│  🔥  Nấu chính                       [🔊]    │   ← icon+color from DISH_DURATION_PHASES
│                                               │     (sound toggle top-right)
│                08:32                          │   ← big mono MM:SS, phase color
│         ▓▓▓▓▓▓▓▓▓░░░░░  còn lại               │   ← Progress, strokeColor = phase.color
│         Dự kiến 20 phút                       │
│                                               │
│   [ ⏸ Tạm dừng ]      [ Xong giai đoạn → ]    │   ← pause/resume + advance
└─────────────────────────────────────────────┘
```

- **Phase strip**: horizontal, scrollable on small widths. Each pill = `shortLabel` + planned minutes. States: completed (check icon, grey), active (phase `background`/`border`/`color`), upcoming (plain outline). Tapping a completed/active pill is non-destructive (no jump); upcoming pills are display-only. Keep it read-only to avoid mis-taps mid-cook.
- **Active phase card**: phase icon (reuse `durationIcon`) + `label`, large `MM:SS` remaining in the phase color, a `Progress` bar (percent of planned elapsed, capped 100), and "Dự kiến N phút" subtext. Colors come straight from the phase definition so each phase feels distinct.
- **Overtime state**: when `remainingSec < 0`, show `+MM:SS` in red, bar full in a warning color, subtext "Quá giờ dự kiến — nấu theo cảm nhận của bạn" (reassuring, not alarming). The advance button stays primary.
- **Controls**:
  - Pause ⇄ Resume (single toggle button, icon + label).
  - "Xong giai đoạn →" advances to next phase. On the **last** phase it becomes "Xong, hoàn thành món →" and triggers the existing `setShowFinish(true)` path.
  - Sound toggle (🔊/🔇) top-right of the card.
- **Start**: in prep mode, the existing "Bắt đầu nấu" button stays. After `startCooking`, if the dish has active duration phases, also dispatch `startTimer`. So one tap starts both cooking and the timer. (If you prefer an explicit opt-in, add a small "Hẹn giờ theo giai đoạn" switch in prep mode defaulting ON — optional.)
- **Desktop**: same components; the phase strip can sit inline and the active card can widen. No separate layout needed — the screen is already a narrow column.

**Microcopy (Vietnamese, match existing tone):** "Tạm dừng" / "Tiếp tục" / "Xong giai đoạn" / "Quá giờ" / "Dự kiến" / "còn lại". Keep it warm and non-clinical.

### 4.6 Edge cases (Feature A)

- Dish with zero active phases → no timer, never call `startTimer`.
- App reopened mid-phase → elapsed recomputes from `phaseStartedAt` (counts closed time; document it).
- User finishes before timer done → `finishCooking` finalizes the running segment; remaining phases keep `accumulatedSeconds: 0` and are simply absent from learning (only phases with recorded time count).
- Negative/NaN guards on all `Date.parse` math; clamp elapsed ≥ 0.
- `targetServings` change does **not** affect timer (duration is per-dish, not per-serving) — leave as-is.

---

## 5. Feature B — Duration Learning

### 5.1 Where actuals come from

When a session finishes (or is finished), its `timer.phases[].accumulatedSeconds` hold the real per-phase time. Total actual minutes = `round(sum(accumulatedSeconds)/60)`. If a dish had no timer, fall back to wall-clock `finishedAt - startedAt` as a **coarse** total (flag it as low-confidence — it includes idle time).

### 5.2 Durable stat store (NOT the session list)

`clearCookingHistory` wipes finished sessions, so stats must persist independently. Add to `CookingSessionState`:

```ts
export type DishCookTimeStat = {
    dishId: string;
    samples: number;                  // how many cooks recorded
    avgTotalMinutes: number;          // EMA, see formula
    lastTotalMinutes: number;
    phaseAverages?: Partial<Record<DishDurationPhaseKey, number>>; // EMA per phase, minutes
    updatedAt: string;
};

// CookingSessionState:
//   cookTimeStats?: Record<string, DishCookTimeStat>; // keyed by dishId
```

### 5.3 Reducer — `recordCookTime`

`recordCookTime({ dishId, totalMinutes, phaseMinutes? })`:
- EMA with `alpha = 0.4` (recent cooks weigh more — "learns over time"):
  - first sample (`!existing`): `avg = totalMinutes`, `samples = 1`.
  - else: `avg = round(alpha*totalMinutes + (1-alpha)*prevAvg)`, `samples += 1`.
- Update `lastTotalMinutes`, `updatedAt`, and per-phase EMA in `phaseAverages` the same way (only for phases that have recorded minutes).
- Dispatch this from the finish path (`FinishCookingWidget._onFinish`) **only when real timer data exists** (or when using wall-clock fallback, still record but the UI labels it as approximate). Do **not** record on cancel.

### 5.4 Where the learning surfaces (3 places)

**(1) Post-cook comparison — `FinishCookingWidget` (primary loop).**
Above the finish buttons, when timer data exists, show a comparison card:

```
┌─────────────────────────────────────────────┐
│  ⏱  Thời gian nấu thực tế                     │
│  Bạn nấu hết 38 phút  (dự kiến 25 phút, +13)  │   ← actual vs planned, delta colored
│  Sơ chế 12' · Nấu 21' · Hoàn thiện 5'         │   ← per-phase actual (rounded)
│                                               │
│  [ Cập nhật thời lượng món theo lần này ]     │   ← one-tap closes the loop
└─────────────────────────────────────────────┘
```

- "Cập nhật thời lượng" dispatches `updateDishDuration({ dishId, duration })` where `duration` is built from the per-phase actual minutes (`DishDurationHelper.normalize`). One tap makes the planned duration match reality. Show a success message.
- Only show the per-phase line and the update CTA when phase-timer data exists. With wall-clock fallback, show just the total with an "(ước tính thô)" note and no per-phase update.
- `recordCookTime` fires on `_onFinish` regardless (so stats accumulate even if the user doesn't tap update).

**(2) Prep screen estimate — `CookingSessionWidget` prep mode (line 269 area).**
Replace the bare `durationText` with a learning-aware line:

- No stats: `Gốc {baseServings} phần · Dự kiến {durationText}` (unchanged).
- `samples >= 1`: append `· Bạn thường nấu ~{avg} phút ({samples} lần)`. For exactly 1 sample say `· Lần gần nhất {last} phút`.
- If `avg` diverges from planned by >25%, color the hint (amber) to gently signal the estimate is off — a nudge toward updating.

**(3) (Optional) Dish duration editor hint.**
In `DishDuration.widget.tsx`, if a stat exists for the dish, show a small read-only line "Lần nấu gần đây: {last} phút (TB ~{avg})" with a button to apply averages. Secondary; skip if time-constrained.

### 5.5 Confidence / honesty rules

- Never present a single noisy sample as "trung bình" — use "lần gần nhất" for `samples === 1`, "trung bình ~X (n lần)" for `samples >= 2`.
- Wall-clock-only totals are always labeled approximate.
- Round all displayed minutes; never show seconds in summaries (seconds only in the live countdown).

---

## 6. Implementation order

1. **Model + reducer (Feature A):** add `CookingTimer` types, timer reducers, finalize-on-finish/cancel. Export action aliases. (`CookingSession.ts`, `CookingSessionReducer.ts`)
2. **Timer hook:** `useCookingTimer` with the no-tick computation + expire alert. (`useCookingTimer.ts`)
3. **Timer UI:** phase strip + active phase card + controls; wire start into `_onStartCooking`. Coexist with steps per the table. (`CookingSession.widget.tsx`)
4. **Verify A** end-to-end (start, pause/resume, advance, overtime, reopen-resume) before touching B.
5. **Model + reducer (Feature B):** `DishCookTimeStat`, `cookTimeStats`, `recordCookTime` EMA. (`CookingSession.ts`, `CookingSessionReducer.ts`)
6. **Post-cook comparison + update CTA** in `FinishCookingWidget`; dispatch `recordCookTime` + optional `updateDishDuration`.
7. **Prep-screen estimate line** in `CookingSessionWidget`.
8. **(Optional)** duration-editor hint.
9. **Verify B**, then full regression of the cooking flow.

---

## 7. Acceptance criteria

**Feature A**
- Starting a dish that has duration phases shows a live countdown for the first active phase; phase icon/color match `DISH_DURATION_PHASES`.
- Pause freezes the countdown; resume continues from the same remaining time.
- "Xong giai đoạn" advances through active phases in canonical order; last phase leads into the finish screen.
- When a phase reaches 0 it shows overtime `+MM:SS` (red) with one alert (sound if enabled + vibrate), and does **not** auto-advance.
- Navigating away and back, or closing/reopening the app, resumes the countdown with correct elapsed time.
- Redux is not written on every tick (verify: no per-second actions in devtools).
- Dishes without duration behave exactly as before (no timer).

**Feature B**
- Finishing a timed cook records a `DishCookTimeStat` (EMA) surviving `clearCookingHistory`.
- Finish screen shows actual-vs-planned total (and per-phase when available) with a working "update duration" action that writes the dish's duration.
- Prep screen shows "you usually take ~X (n times)" once stats exist, with honest wording for a single sample.
- Cancelling a cook does not record a stat.
- Build passes (`npx tsc --noEmit` first — `yarn build` is unreliable in this environment; document any blocker rather than claiming success).

---

## 8. Notes for the executor (read before coding)

- **Naming:** the existing `phase: "prep" | "cooking"` is the screen mode. Use `activePhaseKey` / `timerPhase` / `CookingTimer` for the new duration-phase concept. Don't rename existing code.
- **Reuse, don't reinvent:** phase metadata (`label`, `color`, `background`, `border`, `shortLabel`) and `getActiveItems` come from `DishDurationHelper`. The phase icon mapping is in `DishDuration.widget.tsx` — export `durationIcon` and import it, or lift it into the helper.
- **No Redux ticking** (Section 3) is the single most important constraint. A reviewer should reject any implementation that dispatches on an interval.
- **Finalize-on-finish:** if `finishCooking`/`cancelCooking` don't fold the running segment into `accumulatedSeconds`, Feature B reads short times. Wire this in step 1.
- **Audio autoplay:** create `AudioContext` on a user gesture (the start tap), not on mount, or the beep is blocked.
- **Persistence:** `cookingSession` is personal + Gist-backed; new fields ride along automatically. Confirm old persisted sessions without `timer`/`cookTimeStats` deserialize fine (optional fields, default undefined → guard reads).
- **Included dishes:** the live timer uses the **top-level dish's own** duration phases (simple, predictable). Aggregating included-dish durations into the timeline is explicitly **out of scope v1** — note it as a future enhancement so the executor doesn't gold-plate.

---

## 9. Out of scope / future

- Aggregating included-dish (`includeDishes`) durations into the live timeline.
- A simple single total timer for dishes that have no duration phases (could record wall-clock more cleanly than finish−start).
- Background/Service-Worker notifications when the app is closed and a phase ends (depends on PWA notification support).
- Feeding learned `avgTotalMinutes` back into `SmartPlannerEngine` scoring instead of the hand-entered duration (natural next step once stats are trusted).
- Per-household-member or per-serving time scaling.
