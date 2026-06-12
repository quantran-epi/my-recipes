# Leftover-Aware Smart Planner

**ID:** 260612-lap
**Type:** Quick feature
**Date:** 2026-06-12
**Status:** Plan only

---

## 1. Problem statement

The `LeftoverTrackerItem` model now carries source-meal context (`scheduledMealId`, `mealSlot`, `mealDate`, `mealTitle`) but the smart planner is blind to it. Today, if a household has 4 portions of "Thịt kho" left from yesterday's dinner, the planner will still suggest a fresh main dish for tonight's dinner — wasting both food and money.

The planner should:
1. **Detect** available leftovers expiring within 2 days at suggestion time.
2. **Offer** a "ăn nốt phần dư" alternative day combo where leftovers fill suitable slots as zero-cost candidates.
3. **Skip pressure** on slots where leftovers cover full portions, instead of trying to suggest a new dish on top.

This must be **toggleable** so users who want fresh planning every time aren't forced into leftover-mode.

---

## 2. Toggle decision

**Recommendation: 7th priority chip "Tận dụng đồ thừa"** in the existing priorities row, with `RestOutlined` icon, **default ON**.

Why this over a separate "Nâng cao" switch:
- Priorities are the natural mental model — users already think "tonight prioritize budget + variety". Adding "tận dụng đồ thừa" extends that.
- Same chip control = same affordance = less learning.
- When ON it both **gates** the leftover detection (engine reads the priority) and **weights** it in scoring (mirrors how `budget`/`variety` work today).
- Default ON is correct: the data is already collected, silently ignoring leftovers when they're sitting in the fridge is the worse default.

Off-switch escape hatch: tapping the chip toggles it like every other priority.

---

## 3. Scope

**In scope (v1):**
- New priority `'leftover'` added to `SmartPlannerPriority` union.
- Engine detects available `LeftoverTrackerItem` entries with `status === 'available'`, `portions > 0`, expiring ≤ 2 days from suggestion date.
- Synthetic `PlannedDish` candidates injected into slot pools when priority is on.
- Score detail entry "Tận dụng đồ thừa" with reasoning per dish.
- Suggestions show a `Phần còn lại` green tag and `Free` cost label.
- Detail modal explains the leftover scoring math.
- Day combos: at least one alternative is "leftover-first" (uses leftovers wherever slot matches).
- Question-mark toggle on the new priority chip.

**Out of scope (deferred):**
- Recipe variation hints ("hâm lại với rau xanh"). v1 just surfaces the leftover as-is.
- Cross-meal portion accounting (one big leftover spanning multiple meals). v1 treats each leftover as one slot's serving.
- Cooking-now suggestions using leftovers (the cook-now flow doesn't touch dish library, just inventory; out of scope).

---

## 4. Data flow changes

### 4.1 Engine input

`src/Modules/ScheduledMeal/Helpers/SmartPlannerEngine.ts`:

```ts
export type SmartPlannerPriority = 'budget' | 'time' | 'nutrition' | 'household' | 'inventory' | 'variety' | 'leftover';

export type BuildSmartPlannerInput = {
    // ... existing fields
    availableLeftovers?: LeftoverTrackerItem[];  // pass from screen, defaults to []
};
```

`availableLeftovers` is filtered upstream — only `status === 'available'`, `portions > 0`, `eatBy >= startDate`. The screen already has access to `selectLeftoverTrackerItems`.

### 4.2 PlannedDish flag

```ts
export type PlannedDish = SmartPlannerDishRecommendation;

// SmartPlannerDishRecommendation gets:
export type SmartPlannerDishRecommendation = {
    // ... existing
    leftoverSource?: {
        leftoverId: string;
        portions: number;
        eatByLabel: string;        // "Hôm nay" | "Mai" | "Còn 2 ngày"
        sourceMealLabel: string;   // "Tối thứ 4 — 11/06"
    };
};
```

When `leftoverSource` is set:
- `costAverage` and `shoppingCostAverage` are forced to `0`.
- `missingIngredientCount` is `0`.
- `score` includes a fixed leftover boost (see §5).

### 4.3 Engine helper

```ts
const LEFTOVER_EXPIRY_WINDOW_DAYS = 2;
const LEFTOVER_BASE_SCORE = 78;
const LEFTOVER_URGENT_BOOST = 8;   // expires today/tomorrow
const LEFTOVER_MEDIUM_BOOST = 4;   // expires in 2 days

const getLeftoverCandidatesForSlot = (
    slot: PlannerMealSlot,
    targetDate: Dayjs,
    leftovers: LeftoverTrackerItem[],
    dishesById: Map<string, Dishes>,
    targetServings: number,
): PlannedDish[] => {
    const windowEnd = targetDate.add(LEFTOVER_EXPIRY_WINDOW_DAYS, 'day');
    return leftovers
        .filter(item => item.status === 'available' && item.portions > 0)
        .filter(item => {
            if (!item.eatBy) return true;
            return dayjs(item.eatBy).isBefore(windowEnd, 'day') || dayjs(item.eatBy).isSame(windowEnd, 'day');
        })
        .filter(item => item.portions >= targetServings * 0.5)  // at least half a serving
        .map(item => {
            const dish = dishesById.get(item.dishId);
            if (!dish) return null;
            const daysLeft = item.eatBy ? dayjs(item.eatBy).startOf('day').diff(targetDate.startOf('day'), 'day') : 99;
            const urgencyBoost = daysLeft <= 0 ? LEFTOVER_URGENT_BOOST : daysLeft <= 1 ? LEFTOVER_MEDIUM_BOOST : 0;
            return buildLeftoverPlannedDish(dish, item, slot, urgencyBoost);
        })
        .filter(Boolean) as PlannedDish[];
};
```

### 4.4 Combo builder integration

`buildComboFromCandidates` change: when `'leftover'` priority is active and the slot has leftover candidates, prepend them to the candidate pool so they're considered first. Tag matching still applies (a dessert leftover stays in dessert tag bucket).

---

## 5. Score methodology

```
Phần còn lại của bữa cũ
  Base: 78 (vì đã nấu, đã ăn ngon → an toàn về khẩu vị)
  +8 nếu hết hạn trong hôm nay/mai
  +4 nếu hết hạn trong 2 ngày
  Cost: 0đ (không cần mua)
  Time: 0 phút (chỉ hâm lại)
```

Add to `SCORE_METHODOLOGY`:

```ts
'Tận dụng đồ thừa': 'Món lấy từ phần còn lại đã ghi nhận. Điểm nền 78 vì gia đình đã ăn món này gần đây nên hợp khẩu vị. Cộng thêm điểm khi món sắp hết hạn để ưu tiên dùng trước. Chi phí và nguyên liệu mua thêm đều bằng 0.',
```

---

## 6. UI changes

### 6.1 Priority chip

`src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx`:

```ts
{ value: 'leftover', label: 'Tận dụng đồ thừa', icon: <RestOutlined />, hint: 'Ưu tiên ăn phần còn lại từ bữa cũ' },
```

Visual: green-tinted active state (matches leftover page palette), default position right after `inventory`.

### 6.2 Suggestion card — leftover badge

In `PlannerDishCard` and the detail modal:

```
┌─ Suggestion card (leftover) ──────────────────┐
│ 🍱  Thịt kho                  78%             │
│      ⏱ 5 phút  💰 0đ                          │
│      Phần còn lại · Hôm qua · 4 phần          │
│      [Phần còn lại]                            │
└───────────────────────────────────────────────┘
```

The `Phần còn lại` tag uses green color (`#389e0d` text, `#f6ffed` bg, `#b7eb8f` border) — matches existing leftover screen palette.

### 6.3 Day combo "leftover-first" alternative

Generate one combo per day where leftover candidates fill every slot they can (max 1 per slot, oldest first). Label: "Ăn nốt phần dư".

```
┌─ Alternative card ────────────────────────────┐
│ 🍱  Ăn nốt phần dư                75%         │
│      Sáng: Cháo gà (mới)                      │
│      Trưa: Thịt kho (còn lại)                 │
│      Tối: Cá kho tộ (mới)                     │
│      Tiết kiệm 80,000đ · 2 món còn lại        │
└───────────────────────────────────────────────┘
```

### 6.4 Detail modal — leftover section

When `detailSelection.item.leftoverSource` is set, add a section:

```
┌─ Phần còn lại ⓘ ──────────────────────────────┐
│ Nguồn:    Tối thứ 4 — 11/06                   │
│ Còn:      4 phần                              │
│ Hết hạn:  Mai (13/06)                         │
│ Lưu lúc:  18:42 ngày 11/06                    │
│ Ghi chú:  "Để hộp ngăn mát"                   │
└───────────────────────────────────────────────┘
```

ⓘ Tooltip: *"Món này được lấy từ phần còn lại của bữa trước. Hâm lại là dùng được, không cần mua thêm nguyên liệu."*

### 6.5 Empty state

When toggle is on but no leftovers in window:

> *"Không có phần còn lại nào trong 2 ngày tới. Khi hoàn tất bữa ăn, ghi nhận phần dư để planner có thể tận dụng lần sau."*

With link to leftover management page.

---

## 7. File-by-file changes

| File | Action | Notes |
| --- | --- | --- |
| `src/Modules/ScheduledMeal/Helpers/SmartPlannerEngine.ts` | edit | Add `'leftover'` to priority union, `availableLeftovers` input field, `leftoverSource` on PlannedDish, `getLeftoverCandidatesForSlot` helper, `buildLeftoverPlannedDish` helper, score detail + methodology, integrate into `buildComboFromCandidates` and `buildSlotCandidates` |
| `src/Modules/ScheduledMeal/Helpers/SmartPlannerEngine.ts` | edit | New "leftover-first" alternative generator function |
| `src/Modules/ScheduledMeal/Screens/SmartMealPlanner.screen.tsx` | edit | Add priority option, pass `availableLeftovers` from `selectLeftoverTrackerItems`, render leftover tag in `PlannerDishCard`, add leftover detail section in modal |
| `src/Store/Selectors.ts` | edit (verify) | `selectLeftoverTrackerItems` already exists |

---

## 8. Question-mark toggles

Every leftover-related piece gets discoverability:

- Priority chip — chip's existing `?` describes "Ưu tiên ăn phần còn lại từ bữa cũ trước khi mua nguyên liệu mới."
- Suggestion card "Phần còn lại" tag — tooltip: "Lấy từ phần dư đã ghi nhận. Hâm lại là dùng được."
- Detail modal `Phần còn lại` section header has ⓘ explaining methodology.
- Score detail entry has methodology callout (existing pattern).

---

## 9. Edge cases

| Case | Handling |
| --- | --- |
| Leftover dish was deleted from catalog | Skip (filter `dishesById.get(dishId)` returns null) |
| Leftover has no `eatBy` | Treat as 99 days (no urgency boost, but still surfaced) |
| Leftover already past `eatBy` | Filter out — don't suggest expired food |
| Same leftover would fit multiple slots | Only suggest in the most-relevant slot (use mealSlot tag matching) |
| User has no leftovers at all | Toggle stays available; suggestions just don't include leftover candidates |
| Toggle off but day combo computed | Leftovers ignored entirely, no synthetic candidates injected |
| Leftover portion < target servings | Show with warning chip "Chỉ đủ X phần" — user can decide to supplement |

---

## 10. Testing scenarios

1. **Happy path**: 1 leftover available, expires tomorrow, schedule for today's dinner — leftover-first alternative appears, regular alternatives include it as a candidate.
2. **Toggle off**: Same setup, turn off "Tận dụng đồ thừa" — no leftover suggestions anywhere.
3. **Multiple leftovers**: 3 leftovers across 3 slots — leftover-first combo uses all 3, score reflects savings.
4. **Expired leftover**: One has `eatBy` yesterday — filtered out, doesn't appear.
5. **No matching slot**: Leftover is dessert, planning lunch — only appears if dessert is part of slot tag requirements.
6. **Empty inventory + toggle on**: Empty state shows hint message.
7. **Cost preview**: Leftover cards show 0đ in shopping preview, total cost reflects savings.

---

## 11. Implementation order

1. **Engine: type updates + helper** (`SmartPlannerEngine.ts`). ~60 min.
2. **Engine: integrate into combo builder + alternative generator**. ~45 min.
3. **Screen: priority chip + input wiring**. ~20 min.
4. **Screen: card visual + detail modal section**. ~45 min.
5. **Empty state + tooltips**. ~20 min.
6. **Manual smoke test on desktop + mobile viewport**. ~20 min.
7. **`tsc --noEmit` + commit**. ~10 min.

Total: ~3.5 hours.

---

## 12. Dependencies

None blocking. All data is already collected. The recently-added meal context fields on `LeftoverTrackerItem` are exactly what's needed.

---

## 13. Open questions

- **Leftover-first alternative always generated, or only when toggle on?** Recommendation: only when toggle on. Saves combo pool space when user explicitly opted out.
- **Should leftover boost interact with `variety` priority?** No — leftovers are inherently low-variety (you ate them yesterday). `variety` priority should be neutral or slightly negative for leftovers. v1 ignores this; document as v1.1.
