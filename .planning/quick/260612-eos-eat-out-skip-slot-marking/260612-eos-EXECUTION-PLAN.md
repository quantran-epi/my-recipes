# Eat-Out / Skip-Slot Marking

**ID:** 260612-eos
**Type:** Quick feature
**Date:** 2026-06-12
**Status:** Plan only

---

## 1. Problem statement

Today an empty meal slot is ambiguous: did the user forget to plan, or do they intend not to cook? Households that eat out 1–2 days a week pollute their analytics with phantom "incomplete" meals, and the planner / shopping list can't distinguish "no plan yet" from "no plan needed".

We need a **third state** between "has dishes" and "empty": **"intentionally not cooking"** with a reason.

Reasons:
- **Ăn ngoài** (eatOut) — eating out at restaurant
- **Dùng đồ thừa** (leftover) — reusing leftovers from earlier
- **Nghỉ tự nấu** (skip) — intentionally not cooking, ordering in, etc.
- **Khác** (other) — free-form note

---

## 2. Data model

### 2.1 Decision: Option A (parallel skipMeals field)

Two options considered:

**Option A** (chosen): Parallel `skipMeals` map alongside existing `meals`:
```ts
export type ScheduledMeal = {
    // ... existing
    meals: { breakfast: string[], lunch: string[], dinner: string[] };
    skipMeals?: { breakfast?: SkipMarker, lunch?: SkipMarker, dinner?: SkipMarker };
};
```

**Option B** (rejected): Replace `meals` with richer shape:
```ts
meals: {
    breakfast: { dishes: string[], skip?: SkipMarker },
    lunch: ...,
}
```

**Why A:**
- Zero migration risk — `meals` shape unchanged, all existing readers/writers work.
- Optional `skipMeals` field is fully backward compatible.
- Simpler reducer code (no nested update of `meals.breakfast.dishes`).

**Tradeoff:** Two parallel fields instead of one. Mitigated by a single helper `getSlotState(meal, slot)` returning `'planned' | 'skipped' | 'empty'`.

### 2.2 SkipMarker shape

`src/Store/Models/ScheduledMeal.ts`:

```ts
export type ScheduledMealSkipReason = 'eatOut' | 'leftover' | 'skip' | 'other';

export type ScheduledMealSkipMarker = {
    reason: ScheduledMealSkipReason;
    note?: string;
    markedAt: string;  // ISO timestamp
};

export type ScheduledMealSkipSlots = {
    breakfast?: ScheduledMealSkipMarker;
    lunch?: ScheduledMealSkipMarker;
    dinner?: ScheduledMealSkipMarker;
};

export type ScheduledMeal = {
    id: string;
    name: string;
    plannedDate: Date;
    meals: {
        breakfast: string[];
        lunch: string[];
        dinner: string[];
    };
    skipMeals?: ScheduledMealSkipSlots;  // NEW
    dishServings?: ScheduledMealDishServings;
    createdDate: Date;
};
```

### 2.3 Helper

`src/Modules/ScheduledMeal/Helpers/ScheduledMealSlotStateHelper.ts`:

```ts
export type ScheduledMealSlotState = 'planned' | 'skipped' | 'empty';

export const REASON_META: Record<ScheduledMealSkipReason, {
    label: string;
    icon: React.ReactNode;
    description: string;
    color: string;
    background: string;
    border: string;
}> = {
    eatOut:   { label: 'Ăn ngoài',     icon: <ShopOutlined />,    description: 'Hôm nay nhà mình ăn ngoài.', color: '#1677ff', background: '#e6f4ff', border: '#91caff' },
    leftover: { label: 'Dùng đồ thừa', icon: <RestOutlined />,    description: 'Bữa này dùng phần còn lại từ bữa cũ.', color: '#389e0d', background: '#f6ffed', border: '#b7eb8f' },
    skip:     { label: 'Nghỉ tự nấu',  icon: <CoffeeOutlined />,  description: 'Không nấu bữa này.', color: '#fa8c16', background: '#fff7e6', border: '#ffd591' },
    other:    { label: 'Khác',         icon: <EllipsisOutlined />,description: 'Lý do khác.', color: '#8c8c8c', background: '#fafafa', border: '#d9d9d9' },
};

export const ScheduledMealSlotStateHelper = {
    getSlotState(meal: ScheduledMeal, slot: 'breakfast' | 'lunch' | 'dinner'): ScheduledMealSlotState {
        if (meal.skipMeals?.[slot]) return 'skipped';
        if ((meal.meals[slot] ?? []).length > 0) return 'planned';
        return 'empty';
    },
    
    getReasonMeta: (reason: ScheduledMealSkipReason) => REASON_META[reason],
};
```

### 2.4 Reducer actions

`src/Store/Reducers/ScheduledMealReducer.ts`:

```ts
markSkipMeal(state, action: PayloadAction<{
    mealId: string;
    slot: 'breakfast' | 'lunch' | 'dinner';
    marker: ScheduledMealSkipMarker;
}>) {
    const meal = state.entities[action.payload.mealId];
    if (!meal) return;
    if (!meal.skipMeals) meal.skipMeals = {};
    meal.skipMeals[action.payload.slot] = action.payload.marker;
    // Clear any planned dishes — skip is mutually exclusive with planning
    meal.meals[action.payload.slot] = [];
},

unmarkSkipMeal(state, action: PayloadAction<{
    mealId: string;
    slot: 'breakfast' | 'lunch' | 'dinner';
}>) {
    const meal = state.entities[action.payload.mealId];
    if (!meal?.skipMeals) return;
    delete meal.skipMeals[action.payload.slot];
}
```

---

## 3. UI changes

### 3.1 Skipped slot card visual

`src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx` — `MealRow`:

```
┌─ Slot row (skipped, eatOut) ─────────────────────────────┐
│ ╭──────────────────────────────────────────╮             │
│ │  🍴  Bữa tối · Ăn ngoài                  │             │
│ │      Đặt bàn nhà hàng phở Bát Đàn        │             │
│ │      Đánh dấu lúc 18:42                  │             │
│ │                              [Bỏ đánh dấu]│             │
│ ╰──────────────────────────────────────────╯             │
│  (dashed border, soft blue background)                    │
└──────────────────────────────────────────────────────────┘
```

Style: dashed border (`1px dashed`) with reason-specific accent color, soft tinted background, icon, reason label, optional note, "marked at" timestamp, "Bỏ đánh dấu" link.

### 3.2 Mark dialog

```
┌── Đánh dấu bữa ─────────────────────────────────────────┐
│  Đánh dấu bữa tối ngày 12/06 không tự nấu               │
│                                                          │
│  Lý do                                                   │
│  ◉ 🍴 Ăn ngoài                                           │
│  ○ 🍱 Dùng đồ thừa                                       │
│  ○ ☕ Nghỉ tự nấu                                        │
│  ○ ⋯  Khác                                               │
│                                                          │
│  Ghi chú (tuỳ chọn)                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Ăn nhà ngoại lúc 19h                               │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ⓘ  Bữa đã đánh dấu sẽ không xuất hiện trong gợi ý      │
│      planner, danh sách mua sắm, hay tính tiền.         │
│                                                          │
│                          [Huỷ]    [Đánh dấu]            │
└─────────────────────────────────────────────────────────┘
```

Reason picker uses Radio.Group with custom card-style options. Note is optional Input.TextArea autosize 2-4 rows.

### 3.3 Dropdown menu addition

In `ScheduledMealItem` dropdown menu, add a submenu after "Hoàn tất bữa tối":

```
├ ⋮ More options
│   ├ 🔥 Nấu thực đơn
│   ├ 🔥 Nấu bữa sáng
│   ├ ...
│   ├ ✅ Hoàn tất bữa tối
│   ├ ─────────
│   ├ 🍴 Đánh dấu không nấu     ▶  ┌─────────────────┐
│   │                              │ 🍴 Ăn ngoài     │
│   │                              │ 🍱 Dùng đồ thừa │
│   │                              │ ☕ Nghỉ tự nấu  │
│   │                              │ ⋯  Khác         │
│   │                              └─────────────────┘
│   ├ 📋 Chi tiết
│   ├ ─────────
│   ├ 📋 Sao chép
│   ├ ✏️  Sửa
│   ├ ─────────
│   └ 🗑  Xoá
```

Per-slot keys: `skip-breakfast-eatOut`, `skip-breakfast-leftover`, etc. Skip menu items are disabled if the slot already has dishes (force unplanning first) — same UX as existing "complete" actions.

If a slot is already marked, change to `skip-breakfast-unmark`: "Bỏ đánh dấu bữa sáng".

### 3.4 Visual badge in slot row

Mini-badge on the meal item summary:

```
┌─ Meal card header ─────────────────────────────┐
│  📅 Tuần thứ 4 — Thứ 4 12/06                   │
│  ┌─────┬─────┬─────┐                           │
│  │ 🟢2 │ 🟦  │ 🟢3 │  Sáng·Trưa·Tối             │
│  └─────┴─────┴─────┘                           │
│       (lunch shows blue "ăn ngoài" badge)      │
└────────────────────────────────────────────────┘
```

Each slot pill shows either count badge (planned), skip icon (skipped), or dash (empty).

---

## 4. Engine integrations

Skipped slots are excluded from:

### 4.1 Smart planner

`src/Modules/ScheduledMeal/Helpers/SmartPlannerEngine.ts` — `buildPlannedDays` already filters by date; no change needed for the suggestion side.

But: when **applying** a planner alternative onto an existing scheduled meal, we must respect skipped slots. In `_appendToScheduledMeal` (in `SmartMealPlanner.screen.tsx`), check `getSlotState(meal, slot) === 'skipped'` before writing dishes.

### 4.2 Shopping list aggregation

`src/Modules/ShoppingList/Helpers/ShoppingListAggregator.ts` (or similar) — when building shopping list from scheduled meal IDs, skip any slot where `meal.skipMeals?.[slot]` is set. Update `aggregateMealDishIds` (or wherever the dish IDs are extracted).

### 4.3 Cooking session "Nấu cả ngày"

In `ScheduledMealList.screen.tsx`, when computing `allDayDishIds`, skip slots that are marked:

```ts
const allDayDishIds = useMemo(() => {
    return mealsToday.flatMap(meal => 
        SLOTS.flatMap(slot => 
            getSlotState(meal, slot) === 'skipped' ? [] : meal.meals[slot]
        )
    );
}, [mealsToday]);
```

### 4.4 Analytics / cost calculation

Same principle: when summing daily/weekly cost, skipped slots contribute zero (and aren't counted in "incomplete" statistics).

---

## 5. Question-mark toggles

| Surface | Tooltip |
| --- | --- |
| Reason chip in mark dialog | "Lý do giúp planner và phân tích phân biệt 'không nấu vì cố ý' với 'chưa lập kế hoạch'." |
| "Đánh dấu lúc..." timestamp | "Thời điểm đánh dấu — không ảnh hưởng đến tính toán, chỉ để tham khảo." |
| Skipped slot card ⓘ | "Bữa này được đánh dấu không tự nấu. Planner và shopping list sẽ bỏ qua." |
| "Bỏ đánh dấu" button | "Quay lại trạng thái 'chưa lập' — bạn có thể thêm món hoặc đánh dấu lại sau." |

---

## 6. File-by-file changes

| File | Action | Purpose |
| --- | --- | --- |
| `src/Store/Models/ScheduledMeal.ts` | edit | Add `ScheduledMealSkipReason`, `ScheduledMealSkipMarker`, `ScheduledMealSkipSlots`, extend `ScheduledMeal` with optional `skipMeals` |
| `src/Modules/ScheduledMeal/Helpers/ScheduledMealSlotStateHelper.ts` | new | `getSlotState`, `REASON_META`, helper utilities |
| `src/Store/Reducers/ScheduledMealReducer.ts` | edit | Add `markSkipMeal`, `unmarkSkipMeal` actions |
| `src/Modules/ScheduledMeal/Screens/ScheduledMealMarkSkipModal.tsx` | new | Reason picker + note + confirmation dialog |
| `src/Modules/ScheduledMeal/Screens/ScheduledMealList.screen.tsx` | edit | Render skipped slot card, dropdown submenu, badge in summary |
| `src/Modules/ScheduledMeal/Helpers/SmartPlannerEngine.ts` | edit | Skip "skipped" slots when applying planner suggestions |
| `src/Modules/ShoppingList/Helpers/ShoppingListAggregator.ts` | edit (verify) | Filter out skipped slots in aggregation |
| `src/Modules/ScheduledMeal/Screens/ScheduledMealCooking.widget.tsx` | edit (verify) | "Nấu cả ngày" excludes skipped slots |

---

## 7. Edge cases

| Case | Handling |
| --- | --- |
| Mark slot that already has dishes | Confirm dialog: "Bạn có muốn xoá X món đã chọn?" — confirm → clear `meals[slot]`, set marker. Cancel → no change. |
| Unmark slot with marker | Just remove the marker. `meals[slot]` is already empty. |
| Marked + then user adds a dish via edit modal | The edit modal should warn: "Bữa này đang được đánh dấu — thêm món sẽ bỏ đánh dấu." On save: clear marker, save dishes. |
| Existing data with no `skipMeals` field | Treated as `'planned' | 'empty'` only — fully backward compatible. |
| Reason `other` with no note | Allowed — just shows "Khác" without explanation. |
| Marker timestamp before scheduled date | Allowed (might mark in advance). No special handling. |

---

## 8. Migration

`skipMeals` is optional. Existing scheduled meals load fine. No migration script needed.

---

## 9. Testing scenarios

1. **Mark from menu**: Open meal item dropdown → "Đánh dấu không nấu" → "Ăn ngoài" → no note → confirm. Slot becomes "ăn ngoài" card.
2. **Mark with note**: Same flow, add note "Đặt bàn nhà ngoại". Note appears on card.
3. **Unmark**: Click "Bỏ đánh dấu" on skipped slot. Slot returns to empty state, can plan again.
4. **Mark slot with dishes**: Slot has 2 dishes. Mark "Ăn ngoài". Confirm dialog appears warning about clearing dishes. Confirm → dishes cleared, marker set.
5. **Planner respects skip**: Mark dinner today as "Ăn ngoài". Run planner for today. Dinner slot not suggested.
6. **Shopping list respects skip**: Mark Wed/Thu lunch as "Dùng đồ thừa". Build week shopping list. Wed/Thu lunch dishes excluded.
7. **Cook all day respects skip**: Today has all 3 slots planned. Mark lunch as "Ăn ngoài". "Nấu cả ngày" shows breakfast + dinner only.
8. **Analytics**: Mark 2 days of week as "Ăn ngoài". Weekly cost shows only cooked-meal cost. "Tỉ lệ tự nấu" stat reflects 5/7 days.

---

## 10. Implementation order

1. **Data model + helper** (`ScheduledMeal.ts`, `ScheduledMealSlotStateHelper.ts`). 30 min.
2. **Reducer actions**. 15 min.
3. **`ScheduledMealMarkSkipModal.tsx`** (new dialog). 45 min.
4. **List screen integration** (skipped card, dropdown menu, badge). 60 min.
5. **Engine integrations** (planner skip, shopping list, cook-all-day). 45 min.
6. **Question-mark tooltips + edge case dialogs**. 20 min.
7. **`tsc --noEmit` + manual smoke test**. 30 min.
8. **Commit**.

Total: ~4 hours.

---

## 11. Open questions

- **Should "marked" status appear in week overview / dashboard?** Recommendation: yes, as a small icon in the day cell. v1.1 polish.
- **Bulk-mark several slots at once?** ("Mark all of Thu/Fri/Sat as eat out" for vacation week.) Out of scope; would add UI complexity. v2.
- **Per-slot scheduled-meal templates with default skipping?** ("Sundays I always eat out.") Out of scope.
