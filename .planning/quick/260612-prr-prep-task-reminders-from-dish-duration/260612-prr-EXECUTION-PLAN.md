# Prep Task Reminders from Dish Duration Phases

**ID:** 260612-prr
**Type:** Quick feature
**Date:** 2026-06-12
**Status:** Plan only

---

## 1. Problem statement

Tonight, at 21:00, a user opens the app. Tomorrow's dinner has a slow-braised beef dish with a 4-hour unfreeze phase and a 30-minute prep phase. They want to see, immediately on the dashboard:

> **Cần chuẩn bị cho mai**
> - 14:00 — Rã đông thịt bò (4 giờ trước nấu)
> - 18:00 — Sơ chế thịt bò + rau (30 phút trước nấu)

No new data model. We already have `Dishes.duration` (`unfreeze | prepare | cooking | serve | cooldown`) and `ScheduledMeal.plannedDate`. We just need a default slot-time per breakfast/lunch/dinner, then walk dish duration backward from those times to derive prep tasks.

---

## 2. Why this feature lands well here

- **Existing data does all the work.** `DishDurationHelper.getBreakdown` already flattens a dish (including `includeDishes`) into phase-keyed minutes. We add a thin layer to convert minutes → wall-clock times.
- **High emotional payoff for low engineering cost.** Users feel "the app is looking out for me" the first time they open it at night and see "rã đông gà lúc 15:00 ngày mai" without configuring anything.
- **Zero schema churn.** Only one new field on `AppContextState` (a completion map).

---

## 3. Scope

**In scope (v1):**
- Default meal slot times (breakfast/lunch/dinner) configurable in household profile, with sensible defaults.
- Derivation of prep tasks from any scheduled meal in the next 24 hours.
- A "Cần chuẩn bị" widget on the dashboard.
- A dedicated "Việc chuẩn bị" page reachable from the drawer with two-day forward view.
- Mark-as-done per task (synced state, auto-pruned after 3 days).
- Tooltip-rich UI: every chip and time number has a `?` toggle explaining how it was calculated.

**Out of scope (deferred):**
- Push notifications. We rely on the user opening the app.
- Per-dish override ("this dish I want to start unfreeze 6h early"). v1 uses dish's own phase minutes.
- Calendar export.
- Cross-dish parallelism math ("sơ chế tất cả các món cùng lúc lúc 18:00"). v1 treats each dish independently.

---

## 4. Data model changes

### 4.1 `HouseholdPreferenceProfile` — add slot times

`src/Store/Reducers/AppContextReducer.ts`

```ts
export type MealSlotTimeKey = 'breakfast' | 'lunch' | 'dinner';

export type MealSlotClock = {
    hour: number;   // 0..23
    minute: number; // 0..59
};

export type MealSlotTimes = Record<MealSlotTimeKey, MealSlotClock>;

export const DEFAULT_MEAL_SLOT_TIMES: MealSlotTimes = {
    breakfast: { hour: 7, minute: 0 },
    lunch:     { hour: 12, minute: 0 },
    dinner:    { hour: 19, minute: 0 },
};

// Append to HouseholdPreferenceProfile (and DEFAULT_HOUSEHOLD_PREFERENCE_PROFILE):
//   mealSlotTimes?: MealSlotTimes;
```

Migration: `mealSlotTimes` is optional and falls back to `DEFAULT_MEAL_SLOT_TIMES`. No migration needed.

### 4.2 `AppContextState` — completion map

```ts
// Append:
//   prepTaskCompletions?: Record<string, string>; // taskId → ISO completedAt

export type PrepTaskCompletionMap = Record<string, string>;
```

Task ID:
```
${mealDate YYYY-MM-DD}:${scheduledMealId}:${slot}:${dishId}:${phaseKey}
```

New reducer actions:
- `markPrepTaskDone(taskId: string)` — sets completion to ISO `now()`, prunes entries older than 3 days.
- `unmarkPrepTaskDone(taskId: string)` — removes entry.

---

## 5. Derivation helper

New file: `src/Modules/ScheduledMeal/Helpers/PrepTaskHelper.ts`

```ts
import dayjs, { Dayjs } from 'dayjs';
import { DishDurationHelper } from '@common/Helpers/DishDurationHelper';
import { Dishes, DishDurationPhaseKey } from '@store/Models/Dishes';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { MealSlotTimes, MealSlotTimeKey, DEFAULT_MEAL_SLOT_TIMES } from '@store/Reducers/AppContextReducer';

export type PrepTaskKind = 'unfreeze' | 'prepare';

export type PrepTask = {
    id: string;                    // see §4.2 task ID format
    scheduledMealId: string;
    mealName: string;
    mealDate: string;              // YYYY-MM-DD
    slot: MealSlotTimeKey;
    slotLabel: string;             // 'Bữa sáng' | …
    dishId: string;
    dishName: string;
    phaseKey: DishDurationPhaseKey;
    phaseLabel: string;            // 'Rã đông' | 'Sơ chế'
    kind: PrepTaskKind;            // only unfreeze + prepare emit tasks in v1
    startAt: Dayjs;                // when to do this
    minutes: number;               // duration of this phase
    leadMinutes: number;           // minutes between startAt and slot time
    description: string;           // pre-built UI string
    methodology: string;           // long-form explanation for the ? toggle
};

const TASK_PHASE_KEYS: DishDurationPhaseKey[] = ['unfreeze', 'prepare'];
const SLOT_LABELS: Record<MealSlotTimeKey, string> = {
    breakfast: 'Bữa sáng',
    lunch: 'Bữa trưa',
    dinner: 'Bữa tối',
};

export const PrepTaskHelper = {
    getSlotDateTime(date: Date | string, slot: MealSlotTimeKey, times: MealSlotTimes = DEFAULT_MEAL_SLOT_TIMES): Dayjs {
        const clock = times[slot] ?? DEFAULT_MEAL_SLOT_TIMES[slot];
        return dayjs(date).startOf('day').hour(clock.hour).minute(clock.minute);
    },

    /**
     * Given a dish and its slot time, walk the canonical phase order
     * (unfreeze → prepare → cooking → serve → cooldown) backward from
     * the slot time and return per-phase start times.
     *
     * Sub-dishes (includeDishes) are flattened via DishDurationHelper.getBreakdown
     * and their phase minutes are *summed into the same buckets* on the parent —
     * v1 does not present per-sub-dish prep tasks; users just see one earlier
     * unfreeze that already accounts for everything below.
     */
    getDishPhaseStartTimes(
        dish: Dishes,
        slotAt: Dayjs,
        dishesById: Map<string, Dishes>,
    ): Record<DishDurationPhaseKey, { startAt: Dayjs; minutes: number; leadMinutes: number }> {
        // ...
    },

    buildPrepTasks(
        scheduledMeals: ScheduledMeal[],
        dishesById: Map<string, Dishes>,
        windowStart: Dayjs,    // typically dayjs() (now)
        windowEnd: Dayjs,      // typically dayjs().add(36, 'hour')
        slotTimes: MealSlotTimes = DEFAULT_MEAL_SLOT_TIMES,
    ): PrepTask[] {
        // For each meal whose slot time ∈ [windowStart, windowEnd], generate
        // tasks for unfreeze + prepare phases of every dish in every slot.
        // Skip any task with startAt < windowStart - 1h (already too late).
        // Sort by startAt ascending.
    },

    groupTasksByDate(tasks: PrepTask[]): Array<{ date: string; label: string; tasks: PrepTask[] }> {
        // 'Tối nay' (today) | 'Ngày mai' (tomorrow) | 'DD/MM' otherwise
    },
};
```

### 5.1 Calculation rules (v1)

1. **Phases that emit tasks**: `unfreeze` and `prepare` only. `cooking` / `serve` / `cooldown` happen during the meal time and don't need a heads-up.
2. **Phase order**: canonical, as already defined in `DISH_DURATION_PHASES`. Phase end times are computed working backward from slot time:
   ```
   cooldown.end = slotAt
   serve.end    = cooldown.start
   cooking.end  = serve.start
   prepare.end  = cooking.start
   unfreeze.end = prepare.start
   ```
3. **Sub-dishes** (`includeDishes`): `DishDurationHelper.getBreakdown` already flattens. We sum each phase across all flattened items into a single composite duration *per parent dish*. Result: one task per (dish, phase), not per (sub-dish, phase). This keeps v1 readable.
4. **Threshold**: ignore phases with `minutes < 5` (noise).
5. **Stale guard**: if `task.startAt < now - 1h` it's already passed → exclude. Don't ever surface "you should have started 6 hours ago" — useless and discouraging.
6. **Description format** (Vietnamese, pre-built so the UI just renders strings):
   - `"Rã đông Thịt bò xào (Bữa tối · 4 giờ trước nấu)"`
   - `"Sơ chế Canh chua cá (Bữa trưa · 25 phút trước nấu)"`
7. **Methodology format** (for `?` toggle):
   - `"Bữa tối dự kiến nấu xong lúc 19:00 (12/06). Món này cần 30 phút sơ chế và 20 phút nấu, nên thời gian bắt đầu sơ chế là 18:10. Đã trừ thời gian các món phụ ghép vào (nếu có)."`

---

## 6. UI surfaces

Two surfaces, sharing the same widget component:

1. **Dashboard section** (`Dashboard.screen.tsx`) — compact, shows up to 4 nearest tasks.
2. **Dedicated page** at `/scheduledMeal/prep-tasks` — full two-day view, grouped by date.

Both reuse `<PrepTasksWidget compact={…} />`.

### 6.1 Drawer entry

Add to `MasterPage.tsx` `planning` group, after `leftovers`:

```ts
{ key: 'prepTasks', href: RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.PrepTasks(), icon: ClockIcon, label: 'Việc chuẩn bị' },
```

Icon: reuse `clock (1).png` or `clock (2).png` (already in `assets/icons/`). If we want a unique one, request `chef-prep.png` from design — but starting with clock is fine.

### 6.2 Dashboard section

Title: `Cần chuẩn bị`
Subtitle: `Việc cần làm trước cho bữa hôm nay và ngày mai`

```
┌─────────────────────────────────────────────────────────────────┐
│ ⏰ Cần chuẩn bị                                          [Mở →] │
│ Việc cần làm trước cho bữa hôm nay và ngày mai                  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟦 Rã đông   18:30 ⓘ                                        │ │
│ │ Thịt bò xào · Bữa tối · 12/06                          ☐    │ │
│ │ 4 giờ trước nấu                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟩 Sơ chế   18:10 ⓘ                                         │ │
│ │ Canh chua cá · Bữa tối · 12/06                         ☐    │ │
│ │ 25 phút trước nấu                                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Xem tất cả 6 việc chuẩn bị →]                                  │
└─────────────────────────────────────────────────────────────────┘
```

When the list is empty:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⏰ Cần chuẩn bị                                                 │
│ Việc cần làm trước cho bữa hôm nay và ngày mai                  │
├─────────────────────────────────────────────────────────────────┤
│              ✓ Tủ lạnh đã sẵn sàng                              │
│   Không có món nào cần rã đông hay sơ chế từ giờ đến mai        │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Dedicated page (`PrepTasksScreen`)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⏰ Việc chuẩn bị                                               │
│  Lịch rã đông và sơ chế cho hai ngày sắp tới                    │
│                                                                 │
│  ┌─ Tóm tắt ─────────────────────────┬──────────┬───────────┐  │
│  │ Tổng việc        │ Sắp đến hạn    │ Đã làm   │ Cài đặt ⚙ │  │
│  │     6            │ 2 (trong 1h)   │   3      │ Giờ bữa ⓘ │  │
│  └──────────────────┴────────────────┴──────────┴───────────┘  │
│                                                                 │
│  📅 Tối nay (12/06)                                             │
│  ──────────────────                                             │
│  ┌─ 18:10 ──────────────────────────────────────────────┐       │
│  │ 🟩 Sơ chế · 25 phút                          ⓘ  ☐    │       │
│  │ Canh chua cá                                          │       │
│  │ Bữa tối — Thực đơn "Tối thứ 4"                        │       │
│  │ Cần làm trước 25 phút để kịp nấu lúc 18:35            │       │
│  └──────────────────────────────────────────────────────┘       │
│  ┌─ 18:30 ──────────────────────────────────────────────┐       │
│  │ 🟦 Rã đông · 4 giờ                            ⓘ  ☑   │       │
│  │ Thịt bò xào                                          │       │
│  │ Bữa tối — Thực đơn "Tối thứ 4"                        │       │
│  │ Hoàn tất lúc 17:42 (cách đây 48 phút)                 │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                 │
│  📅 Ngày mai (13/06)                                            │
│  ──────────────────                                             │
│  ┌─ 06:30 ──────────────────────────────────────────────┐       │
│  │ 🟦 Rã đông · 30 phút                          ⓘ  ☐   │       │
│  │ Bánh mì hấp                                          │       │
│  │ Bữa sáng — Thực đơn "Sáng thứ 5"                      │       │
│  │ Cần làm trước 30 phút để kịp nấu lúc 07:00            │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Settings (slot times)

Surface in the "Cài đặt ⚙" link (top-right of summary card) → opens a modal:

```
┌── Giờ bữa ăn ───────────────────────────────────────┐
│ ⓘ Planner dùng các giờ này để tính khi nào cần      │
│   bắt đầu rã đông và sơ chế.                         │
│                                                     │
│  🌅 Bữa sáng    [ 07 : 00 ]          ⓘ              │
│  ☀️  Bữa trưa   [ 12 : 00 ]          ⓘ              │
│  🌙 Bữa tối    [ 19 : 00 ]          ⓘ              │
│                                                     │
│   [Đặt lại mặc định]    [Hủy]    [Lưu]              │
└─────────────────────────────────────────────────────┘
```

ⓘ tooltips:
- Bữa sáng — *"Giờ bữa sáng dự kiến của nhà mình. Planner sẽ trừ ngược thời gian rã đông và sơ chế từ giờ này."*
- Bữa trưa — *"Giờ bữa trưa dự kiến. Đổi nếu nhà mình thường ăn sớm hơn hoặc muộn hơn."*
- Bữa tối — *"Giờ bữa tối dự kiến. Phần lớn việc chuẩn bị (đặc biệt là rã đông) bám theo giờ này."*

---

## 7. Question-mark toggles (the "informative" part)

Every numeric or category piece gets a discoverable `?` button.

### 7.1 Per-task `ⓘ`

Tap toggle on the task row's `ⓘ` (right of the time) reveals a callout:

```
┌── Cách tính ────────────────────────────────────────┐
│  • Bữa tối dự kiến lúc 19:00 ngày 12/06.            │
│  • Món Thịt bò xào cần:                             │
│      Rã đông    240 phút  (việc này)                │
│      Sơ chế      30 phút                            │
│      Nấu chính   25 phút                            │
│  • Trừ ngược: 19:00 − 25 − 30 − 240 = 14:25         │
│  • Vì cần kịp toàn bộ chuỗi, bắt đầu rã đông        │
│    lúc 14:25.                                        │
└─────────────────────────────────────────────────────┘
```

Always render in plain Vietnamese, always show the math. Builds trust.

### 7.2 Phase chip tooltip

Hover/tap the colored phase chip ("🟦 Rã đông") shows the phase description from `DISH_DURATION_PHASES`:

> *"Thời gian chờ nguyên liệu mềm trước khi sơ chế."*

(This already exists in the data — just use it.)

### 7.3 Empty state explanation

When the dashboard widget is empty, beneath the success line:

> ⓘ *"Việc chuẩn bị xuất hiện khi món trong thực đơn có ghi thời gian rã đông hoặc sơ chế. Bổ sung thời lượng cho món trong trang Món ăn để dùng tính năng này."*

### 7.4 Summary card chips on the page

- **Tổng việc** ⓘ — *"Số lượng việc chuẩn bị đang mở trong 36 giờ tới."*
- **Sắp đến hạn** ⓘ — *"Việc cần bắt đầu trong 1 giờ tới."*
- **Đã làm** ⓘ — *"Việc đã đánh dấu hoàn tất, vẫn hiển thị 24 giờ rồi tự ẩn."*

---

## 8. Component breakdown

### 8.1 New / changed files

| File | Action | Purpose |
| --- | --- | --- |
| `src/Store/Reducers/AppContextReducer.ts` | edit | Add `MealSlotTimes`, `DEFAULT_MEAL_SLOT_TIMES`, `mealSlotTimes` field on profile, `prepTaskCompletions` field, `markPrepTaskDone`/`unmarkPrepTaskDone` actions, 3-day pruning. |
| `src/Store/Selectors.ts` | edit | Add `selectMealSlotTimes`, `selectPrepTaskCompletions`. |
| `src/Modules/ScheduledMeal/Helpers/PrepTaskHelper.ts` | new | Pure derivation, see §5. |
| `src/Modules/ScheduledMeal/Screens/PrepTasks.widget.tsx` | new | Reusable card list. Props: `compact?: boolean`, `windowHours?: number`, `onSeeAll?: () => void`. |
| `src/Modules/ScheduledMeal/Screens/PrepTasks.screen.tsx` | new | Full page wrapper around the widget + summary stats + settings modal trigger. |
| `src/Modules/ScheduledMeal/Screens/MealSlotTimesModal.tsx` | new | Three time pickers + question-mark tooltips. |
| `src/Modules/ScheduledMeal/Routing/ScheduledMealRouteConfig.ts` | edit | Add `PrepTasks: () => RouteHelpers.CreateRoute(scheduledMealRoot, ['prep-tasks'])`. |
| `src/Routing/RootRouter.tsx` | edit | Wire the route. |
| `src/Routing/MasterPage.tsx` | edit | Drawer entry "Việc chuẩn bị" + breadcrumb icon mapping. |
| `src/Modules/Home/Screens/Dashboard.screen.tsx` | edit | Insert `<PrepTasksWidget compact />` section between today's-meal section and leftover section. |

### 8.2 Reusable patterns to follow

- **Dashboard section card**: copy the exact `DashboardSection` wrapper pattern used elsewhere in `Dashboard.screen.tsx` (header with title + subtitle, optional action link). Don't reinvent the shell.
- **Drawer icon import + breadcrumb mapping**: mirror the pattern used by the recently added `ChatIcon` and `FoodPreparationIcon`.
- **Widget header with `HistoryOutlined`-style icon span** (the rounded square): mirror `LeftoverManagementScreen` hero. Same border/gradient/box shadow.
- **`?` toggle**: there's already an `openHelpKey` pattern in `SmartMealPlanner.screen.tsx` — copy it. Single `string | undefined` state, `_toggleHelp` callback.
- **Methodology callout box**: same teal-tinted box (`rgba(19,168,168,0.08)` background, `rgba(19,168,168,0.18)` border) used for score methodology in the planner detail modal.

---

## 9. Visual + interaction details (the "clean, beautiful" part)

### 9.1 Phase chip palette

Reuse `DISH_DURATION_PHASES` colors verbatim:

| Phase    | Color   | Background | Border    |
| -------- | ------- | ---------- | --------- |
| unfreeze | #1677ff | #e6f4ff    | #91caff   |
| prepare  | #13a8a8 | #e6fffb    | #87e8de   |

(Other phases not surfaced as tasks in v1.)

Chip shape: pill, 11px font, weight 700, height 22px. `<phaseLabel> · <minutes>p` for compact widget; `<phaseLabel> · <formatted minutes>` for the full page.

### 9.2 Time chip

Big, bold, monospace-feeling:

```
[ 18:30 ]
```

13.5px font, weight 800, color matches phase accent, `letter-spacing: 0.3px`. This is the thing the user is actually looking for, so make it pop.

### 9.3 Lead-time secondary text

Just below dish name, small, secondary color:

> "30 phút trước nấu" / "4 giờ trước nấu"

Use `DishDurationHelper.formatMinutes`.

### 9.4 Done state

Checkbox on the right (24×24, custom rounded). When checked:
- Row background lightens to `#fafafa`
- Title gets `text-decoration: line-through`
- Phase chip fades to opacity 0.55
- A footer line appears: `"Hoàn tất lúc 17:42"` (relative + absolute)

Tapping again unmarks.

### 9.5 "Sắp đến hạn" highlighting

If `task.startAt − now < 60 min` and not done:
- Add a left rail (4px wide) in `#fa8c16` to the row
- Add a small `🔔 Sắp đến giờ` chip next to the time
- Time text turns `#fa541c`

### 9.6 Mobile breakpoints

- Compact widget rows: single column, `padding: 10px`, time + chip on top row, dish name + meal label on second row, lead-time + checkbox on third row.
- Page: same row layout but with a 4–5px left rail and the "summary card" stats stacking 2 + 2 on narrow screens.

### 9.7 Animation niceties

- Mark-done: row fades from `#fff` to `#fafafa` over 200ms, line-through animates left → right (CSS `clip-path` trick).
- New task appearing (after editing dish duration): subtle slide-down from top.

These are nice-to-haves; ship without them if time-boxed.

---

## 10. Empty / edge states

| State | Treatment |
| --- | --- |
| No scheduled meals in window | "Tủ lạnh đã sẵn sàng" + ⓘ explaining how tasks appear |
| Scheduled meals exist but none have unfreeze/prepare > 5 min | "Không có món nào cần chuẩn bị trước" + tooltip pointing to the dish duration field |
| Some tasks already past (within 1h of slot time) | Show, but with `🔥 Cần làm ngay` chip and red rail |
| Some tasks too late (>1h past) | Hide silently |
| Scheduled meal exists but dish missing from catalog | Skip task generation, log nothing |
| Slot time configured to all zeros (rare misconfig) | Fall back to defaults, show one-time toast: *"Giờ bữa ăn không hợp lệ, đã dùng giờ mặc định"* |

---

## 11. Test plan

Manual happy path:
1. Create a dish "Thịt bò xào" with `unfreeze: 240, prepare: 30, cooking: 25, serve: 5`.
2. Schedule it for tomorrow's dinner.
3. Open dashboard → should see two tasks: "Rã đông 14:00" and "Sơ chế 18:30".
4. Tap `?` on each — math should reconcile.
5. Mark "Rã đông" done → row fades, footer shows completion time.
6. Reload page → state survives.
7. Wait until next morning → tasks for today disappear from "Ngày mai", new tomorrow's tasks appear.

Edge cases to test:
- Dish with `includeDishes` containing its own unfreeze (composite is summed correctly).
- Multiple dishes per slot — should each get their own row.
- Same dish in two different days — task IDs are distinct (date prefix), independent done states.
- Slot time configured to 04:00 — earlier-day tasks render correctly.

No automated tests required for v1 (matches existing project convention — no test framework wired up).

---

## 12. Verification

- `npx tsc --noEmit` must pass.
- Manual test of happy path on a desktop viewport and a 360px-wide mobile viewport.
- Spot-check that the dashboard widget integrates without breaking adjacent sections.

---

## 13. Implementation order

1. **Reducer + selectors** (`AppContextReducer.ts`, `Selectors.ts`). 30 min.
2. **`PrepTaskHelper.ts`**. 60 min. Pure functions, easy to reason about — start here so the UI can be built against real data.
3. **`MealSlotTimesModal.tsx`**. 30 min.
4. **`PrepTasks.widget.tsx`** (the reusable card). 90 min — most of the visual work lives here.
5. **`PrepTasks.screen.tsx`** (page wrapper). 30 min.
6. **Route + drawer wiring**. 15 min.
7. **Dashboard integration**. 20 min.
8. **Polish pass**: empty states, "sắp đến hạn" rail, tooltips, mobile layout. 45 min.
9. **Verify with tsc + manual smoke test**. 15 min.
10. **Commit**.

Total estimate: ~5 hours of focused work.

---

## 14. Open questions for the user

None blocking. The plan picks reasonable defaults for everything. Two things to optionally revisit later:

- **Slot time per scheduled meal** vs per household. v1 is per household. If users want "tonight's dinner is at 20:30 because we have guests," that's a v1.1 add — extend `ScheduledMeal` with optional `slotTimes?: Partial<MealSlotTimes>`.
- **Reminder notifications** (web push / native push) — out of scope for v1, but the data model already supports it. v2 work.
