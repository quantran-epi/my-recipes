# Cooking Analytics Dashboard

**ID:** 260612-cad
**Type:** Quick feature
**Date:** 2026-06-12
**Status:** Plan only

---

## 1. Problem statement

The app already collects rich cooking data:

- `CookingSession` — every cook session with `startedAt`, `finishedAt`, `status`
- `DishCookTimeStat` — per-dish EMA of actual minutes vs planned, plus phase averages
- `DishFeedbackStat` — per-dish per-member liked/neutral/disliked tally
- `CookingMealFeedbackHistoryRecord` — per-meal per-member reactions with timestamp
- `LeftoverTrackerItem` — with status `available | finished | discarded`
- `ScheduledMeal` — what was planned per day

But **none of this is surfaced**. Users have no way to see "what do we cook most?", "what haven't we cooked in a month?", "is this dish actually faster than the recipe says?", or "does mom prefer rice dishes?".

This feature makes the existing `DashboardAnalytics.screen.tsx` actually useful by surfacing the collected signals.

This is a **read-only dashboard**, no new data collection.

---

## 2. Scope

**In scope (v1):**
- Extend `DashboardAnalytics.screen.tsx` with a "Phân tích nấu nướng" section.
- Six analytics cards (see §4):
  1. Top 10 most-cooked dishes (last 90 days)
  2. Dishes not cooked recently (30+ days, completed only)
  3. Cook time accuracy (planned vs actual)
  4. Feedback trends per member
  5. Cooking activity (calendar heatmap)
  6. Leftover efficiency (% finished/discarded/active)
- Filters at top: time range (7/30/90/all days), member filter
- Lightweight inline charts using HTML+CSS (no chart library)
- Empty states with hints
- Question-mark toggles for every metric

**Out of scope (deferred):**
- CSV export (v1.1 polish)
- Predictive insights ("you usually cook X on Mondays")
- Cost-trend charts (different file, different feature)
- Real-time updates — the page recalculates on mount and on filter change only

---

## 3. Data flow

### 3.1 New helper module

`src/Modules/ScheduledMeal/Helpers/CookingAnalyticsHelper.ts`:

```ts
import dayjs, { Dayjs } from 'dayjs';
import { CookingSession, DishCookTimeStat, DishFeedbackStat, CookingMealFeedbackHistoryRecord, CookingSessionMemberFeedback } from '@store/Models/CookingSession';
import { Dishes } from '@store/Models/Dishes';
import { LeftoverTrackerItem } from '@store/Reducers/AppContextReducer';

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | 'all';

export type AnalyticsFilters = {
    range: AnalyticsTimeRange;
    memberId?: string;
};

export type TopCookedDish = {
    dishId: string;
    dishName: string;
    cookCount: number;
    lastCookedAt: string;
    daysSinceLast: number;
};

export type StaleDish = {
    dishId: string;
    dishName: string;
    lastCookedAt?: string;
    daysSinceLast: number;
    completed: boolean;
};

export type CookTimeAccuracyRow = {
    dishId: string;
    dishName: string;
    plannedMinutes: number;
    actualAvgMinutes: number;
    samples: number;
    variancePct: number;  // (actual - planned) / planned * 100
};

export type MemberFeedbackBreakdown = {
    memberId: string;
    memberName: string;
    liked: number;
    neutral: number;
    disliked: number;
    topDishes: Array<{ dishId: string; dishName: string; reaction: CookingSessionMemberFeedback }>;
};

export type CookingActivityCell = {
    date: string;        // YYYY-MM-DD
    sessionCount: number;
    finishedCount: number;
};

export type LeftoverEfficiencyWeek = {
    weekStart: string;
    finished: number;
    discarded: number;
    available: number;
    total: number;
    finishedPct: number;
};

export const CookingAnalyticsHelper = {
    getRangeStart: (range: AnalyticsTimeRange, now: Dayjs = dayjs()): Dayjs | null => {
        if (range === '7d') return now.subtract(7, 'day').startOf('day');
        if (range === '30d') return now.subtract(30, 'day').startOf('day');
        if (range === '90d') return now.subtract(90, 'day').startOf('day');
        return null;  // 'all'
    },
    
    getTopCookedDishes: (
        sessions: CookingSession[],
        dishesById: Map<string, Dishes>,
        filters: AnalyticsFilters,
        limit = 10,
    ): TopCookedDish[] => { /* ... */ },
    
    getStaleDishes: (
        dishes: Dishes[],
        sessions: CookingSession[],
        thresholdDays = 30,
    ): StaleDish[] => { /* ... */ },
    
    getCookTimeAccuracy: (
        cookTimeStats: Record<string, DishCookTimeStat>,
        dishesById: Map<string, Dishes>,
        minSamples = 2,
    ): CookTimeAccuracyRow[] => { /* ... */ },
    
    getMemberFeedbackBreakdown: (
        feedbackHistory: CookingMealFeedbackHistoryRecord[],
        members: HouseholdMemberProfile[],
        filters: AnalyticsFilters,
    ): MemberFeedbackBreakdown[] => { /* ... */ },
    
    getCookingActivity: (
        sessions: CookingSession[],
        filters: AnalyticsFilters,
    ): CookingActivityCell[] => { /* ... */ },
    
    getLeftoverEfficiency: (
        leftovers: LeftoverTrackerItem[],
        filters: AnalyticsFilters,
    ): LeftoverEfficiencyWeek[] => { /* ... */ },
};
```

All functions are pure, no side effects, easy to test mentally.

### 3.2 Selectors used

Existing selectors all available:
- `selectCookingSessions`
- `selectDishes`
- `selectDishesById`
- `selectDishCookTimeStats` (verify it exists; if not, expose)
- `selectDishFeedbackHistory`
- `selectHouseholdMembers`
- `selectLeftoverTrackerItems`

---

## 4. UI sections

Each card uses the existing `DashboardSection` shell pattern (header with title + ⓘ + optional action link + body).

### 4.1 Top 10 most-cooked dishes

```
┌─ 🔥 Món hay nấu nhất                  ⓘ          ──┐
│  90 ngày qua                                       │
│                                                    │
│  1. Phở bò              ████████████  18 lần       │
│  2. Cơm tấm sườn        █████████      14 lần      │
│  3. Bún chả             ███████        11 lần      │
│  4. Cá kho tộ           █████          8 lần       │
│  5. Canh chua cá        ████           7 lần       │
│  6. Thịt kho            ███            5 lần       │
│  7. Mì xào hải sản      ██             4 lần       │
│  8. Salad cá ngừ        ██             3 lần       │
│  9. Gà rang gừng        █              2 lần       │
│ 10. Bánh xèo            █              2 lần       │
│                                                    │
│  [Mở danh sách món →]                              │
└────────────────────────────────────────────────────┘
```

ⓘ Tooltip: "Số lần đã hoàn tất một phiên nấu cho từng món, tính trong khoảng thời gian đã chọn."

Bar visual: simple `<div style={{width: pct%}}>` with linear gradient. Thumbnail dish image at left of name (24×24).

### 4.2 Dishes not cooked recently (stale)

```
┌─ 🌱 Lâu rồi chưa nấu                  ⓘ          ──┐
│  Món đã hoàn tất nhưng 30+ ngày chưa nấu lại       │
│                                                    │
│  Bún chả cá Hải Phòng         62 ngày     🍳 Nấu   │
│  Sườn xào chua ngọt           48 ngày     🍳 Nấu   │
│  Súp lơ xào tỏi               45 ngày     🍳 Nấu   │
│  Cá hấp xì dầu                39 ngày     🍳 Nấu   │
│  Tôm rim mặn ngọt             34 ngày     🍳 Nấu   │
│                                                    │
│  + 8 món khác ▼                                    │
└────────────────────────────────────────────────────┘
```

ⓘ Tooltip: "Món đã đánh dấu là hoàn chỉnh nhưng chưa được nấu lại trong 30 ngày. Lựa chọn tốt khi muốn đổi gió."

"🍳 Nấu" button → opens cook-now flow with dish preselected.

Empty state: "🎉 Đang nấu đa dạng! Tất cả món đã nấu trong 30 ngày qua."

### 4.3 Cook time accuracy

```
┌─ ⏱  Độ chính xác thời gian            ⓘ          ──┐
│  Thời gian nấu thực tế so với kế hoạch              │
│                                                    │
│  Món              Kế hoạch    Thực tế    Lệch       │
│  ──────────────────────────────────────────         │
│  Phở bò              45p        58p     ▲ +29% 🔴   │
│  Cá kho tộ           60p        72p     ▲ +20% 🟠   │
│  Cơm tấm             30p        33p     ▲ +10% 🟢   │
│  Bún chả             40p        38p     ▼  -5% 🟢   │
│  Canh chua cá        25p        22p     ▼ -12% 🟢   │
│                                                    │
│  ⓘ Lệch hơn 20% có thể cần cập nhật kế hoạch       │
└────────────────────────────────────────────────────┘
```

ⓘ Tooltip: "EMA (trung bình động hàm mũ) thời gian nấu thực tế từ các phiên đã hoàn tất, so sánh với thời gian kế hoạch trong công thức."

Color rules: |variance| ≤ 15% → green, ≤ 25% → orange, > 25% → red.
Filter: only dishes with `samples >= 2` (one cook isn't a trend).

### 4.4 Feedback trends per member

```
┌─ 💬 Khẩu vị nhà mình                  ⓘ            ──┐
│  Dựa trên phản hồi sau bữa ăn                          │
│                                                        │
│  Mẹ                                                    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░  18 thích · 4 ổn · 2 không     │
│  Thích nhất: Cá kho · Canh chua · Phở                  │
│                                                        │
│  Bố                                                    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  14 thích · 6 ổn · 4 không     │
│  Thích nhất: Bún chả · Sườn xào · Cơm tấm              │
│                                                        │
│  Bé Bo                                                 │
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░  8 thích · 2 ổn · 12 không       │
│  Thích nhất: Súp gà · Cháo · Mì spaghetti              │
└────────────────────────────────────────────────────────┘
```

ⓘ Tooltip: "Tỷ lệ phản hồi 'Thích / Bình thường / Không hợp' của từng thành viên trong khoảng thời gian. Top 3 món được thích nhất."

Bar: stacked horizontal divs in green/blue/red, width proportional to share. Counts in italics on right.

Filter: respects `memberId` filter — but the breakdown card itself shows all members regardless (it's a comparison view).

### 4.5 Cooking activity (calendar heatmap)

```
┌─ 📅 Hoạt động nấu nướng              ⓘ          ──┐
│  90 ngày qua                                       │
│                                                    │
│   T2 T3 T4 T5 T6 T7 CN                             │
│   ░  ▓  ▓  ▓  ▒  ░  ░    Tuần 14/03                │
│   ▒  ▓  ▒  ▓  ▒  ░  ░    Tuần 21/03                │
│   ▓  ▓  ▓  ▓  ▒  ░  ▒    Tuần 28/03                │
│   ▒  ▓  ▒  ▓  ▓  ░  ░    Tuần 04/04                │
│   ░  ░  ░  ▒  ▒  ░  ░    Tuần 11/04   (vacation)   │
│   ▓  ▓  ▓  ▓  ▒  ░  ░    Tuần 18/04                │
│  ...                                               │
│                                                    │
│  ░ 0    ▒ 1    ▓ 2+    Tổng 47 buổi nấu           │
└────────────────────────────────────────────────────┘
```

ⓘ Tooltip: "Mỗi ô là một ngày, độ đậm thể hiện số phiên nấu trong ngày đó."

Implementation: 13-week × 7-day grid. Each cell is a 14×14 div with green-shade bg by `sessionCount` (0=light gray, 1=light green, 2+=dark green). Hover/tap shows `dayjs(date).format('DD/MM/YYYY')` + count.

Mobile: rows of 7, scroll vertically; or compact 90-cell linear strip.

### 4.6 Leftover efficiency

```
┌─ 🍱 Hiệu quả phần còn lại            ⓘ          ──┐
│  Tỷ lệ phần còn lại được ăn hết vs bỏ đi           │
│                                                    │
│        Đã ăn hết     Còn lại    Bỏ đi              │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  68%   |  20%  |  12%     │
│                                                    │
│  Tuần qua:                                         │
│  Tuần 06/06 → 06/12   ████████░░  85% ăn hết       │
│  Tuần 30/05 → 06/05   ██████░░░░  60% ăn hết       │
│  Tuần 23/05 → 05/29   ████████░░  82% ăn hết       │
│  Tuần 16/05 → 05/22   █████░░░░░  50% ăn hết       │
│                                                    │
│  ⓘ Mục tiêu: > 80% ăn hết. Phần bỏ đi nên < 10%.  │
└────────────────────────────────────────────────────┘
```

ⓘ Tooltip: "Tỷ lệ phần còn lại đã ghi nhận được ăn hết, vẫn còn, hoặc bỏ đi. Tính theo `storedAt`."

Computation: group by ISO week, count `status` per week.

---

## 5. Page structure

Extend `DashboardAnalytics.screen.tsx`:

```tsx
<Box> {/* existing dashboard analytics shell */}
    <ExistingSections /> {/* whatever's already there */}
    
    <Box style={{ marginTop: 16 }}>
        <Box style={{ /* hero */ }}>
            <Typography.Text strong>Phân tích nấu nướng</Typography.Text>
            <Typography.Text type='secondary'>Dữ liệu nấu nướng và khẩu vị từ phiên nấu thực tế.</Typography.Text>
        </Box>
        
        <Box style={{ /* filter bar */ }}>
            <Segmented
                options={[
                    { label: '7 ngày', value: '7d' },
                    { label: '30 ngày', value: '30d' },
                    { label: '90 ngày', value: '90d' },
                    { label: 'Tất cả', value: 'all' },
                ]}
                value={range}
                onChange={value => setRange(value)}
            />
            <Select
                placeholder='Thành viên (tất cả)'
                allowClear
                options={memberOptions}
                value={memberId}
                onChange={setMemberId}
                style={{ width: 180 }}
            />
        </Box>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            <TopCookedDishesCard filters={filters} />
            <StaleDishesCard />
            <CookTimeAccuracyCard />
            <MemberFeedbackCard filters={filters} />
            <CookingActivityCard filters={filters} />
            <LeftoverEfficiencyCard filters={filters} />
        </div>
    </Box>
</Box>
```

If `DashboardAnalytics.screen.tsx` is already large, split each card into `src/Modules/Home/Screens/Analytics/CookingAnalyticsCards.tsx` (one file with all six exported components).

---

## 6. Visual approach

- **Card pattern**: existing `DashboardSection` shell — header with title + subtitle + optional ⓘ button. Body is custom per card.
- **Bar charts**: `<div style={{display: 'flex'}}>` with inner `<div style={{width: '${pct}%', background: linear-gradient(...)}}>`. No chart library.
- **Heatmap**: CSS grid `repeat(7, 14px)`, `gap: 3px`. Cells are pure `<div>` with bg color.
- **Color palette**: reuse existing tokens.
  - Green (good): `#389e0d` / `#f6ffed`
  - Blue (neutral): `#1677ff` / `#e6f4ff`
  - Orange (warning): `#fa8c16` / `#fff7e6`
  - Red (bad): `#cf1322` / `#fff1f0`
- **Stats counters**: large bold number (24px / weight 800), small secondary label below.

---

## 7. Performance

All computations in `useMemo`, keyed by `[sessions, dishes, filters]`. With ~1000 sessions and ~200 dishes, full recompute is < 50ms.

If needed in future:
- Move heavy aggregations to a worker.
- Cache `getCookingActivity` result by `(rangeStart, rangeEnd)` since it's expensive.

For v1, just `useMemo` everything.

---

## 8. Question-mark toggles

Every card title has an ⓘ button. Toggle pattern: reuse `openHelpKey` from `SmartMealPlanner.screen.tsx`.

| Card | Help text |
| --- | --- |
| Top cooked | "Số phiên nấu đã hoàn tất, đếm theo món, sắp xếp giảm dần. Lọc theo khoảng thời gian ở trên." |
| Stale dishes | "Món đã được đánh dấu hoàn chỉnh nhưng chưa nấu lại trong 30 ngày. Bộ lọc thời gian không áp dụng vì đây là cảnh báo dài hạn." |
| Cook time | "Thời gian nấu thực tế trung bình (EMA) so với thời gian kế hoạch trong công thức. Cần ít nhất 2 lần nấu để hiện ra. Lệch > 20% nên cập nhật kế hoạch." |
| Member feedback | "Phản hồi 'Thích / Bình thường / Không hợp' từng thành viên ghi nhận sau bữa ăn. Top 3 món thường được thành viên thích." |
| Activity | "Số phiên nấu mỗi ngày. Ô đậm = nấu nhiều, ô nhạt = nấu ít hoặc không nấu." |
| Leftover efficiency | "Tỷ lệ phần còn lại được ăn hết, bỏ đi hoặc còn trong tủ. Tính theo `storedAt`. Mục tiêu > 80% ăn hết." |

---

## 9. File-by-file changes

| File | Action | Purpose |
| --- | --- | --- |
| `src/Modules/ScheduledMeal/Helpers/CookingAnalyticsHelper.ts` | new | Pure aggregation functions |
| `src/Modules/Home/Screens/Analytics/CookingAnalyticsCards.tsx` | new | Six card components, exported |
| `src/Modules/Home/Screens/DashboardAnalytics.screen.tsx` | edit | Add cooking analytics section, filter bar |
| `src/Store/Selectors.ts` | edit (verify) | Expose `selectDishCookTimeStats` if not present |

---

## 10. Empty states

| Card | Empty hint |
| --- | --- |
| Top cooked | "Chưa có phiên nấu nào. Bắt đầu nấu món đầu tiên để xem thống kê." |
| Stale dishes | "🎉 Đang nấu đa dạng! Tất cả món đã nấu trong 30 ngày qua." |
| Cook time | "Chưa có đủ dữ liệu. Nấu mỗi món ít nhất 2 lần để hiện ra so sánh." |
| Member feedback | "Chưa có phản hồi nào. Hoàn tất bữa ăn và đánh giá phản ứng để xem khẩu vị nhà." |
| Activity | "Chưa có phiên nấu nào trong khoảng thời gian này." |
| Leftover efficiency | "Chưa có phần còn lại nào được ghi nhận. Đánh dấu phần dư khi hoàn tất bữa ăn." |

Each empty state has a discoverable next action (open dishes, open meal list, etc.).

---

## 11. Testing scenarios

1. **Fresh install**: All cards show empty states with hints.
2. **One cook session**: Top cooked shows 1 entry, others mostly empty (cook time needs 2 samples).
3. **Filter to 7 days**: Top cooked shrinks to recent only, stale dishes unchanged (long-term).
4. **Filter to specific member**: Member feedback card unchanged (shows all members), activity card unchanged. Top cooked may filter (if logic ties cook to memberIds).
5. **High-variance dish**: Phở with planned 45m, actual avg 60m → red badge.
6. **Discarded leftovers spike one week**: Leftover efficiency week bar drops.
7. **Vacation week**: Activity card shows blank row of 7 days.
8. **Mobile viewport (360px)**: Cards stack to 1 column, all readable.
9. **Member with no reactions**: Their bar is empty, footer reads "Chưa có phản hồi".

---

## 12. Implementation order

1. **`CookingAnalyticsHelper.ts`**. 90 min — pure functions, write each metric one at a time.
2. **Filter state + filter bar**. 15 min.
3. **Top cooked + stale dishes** (simplest cards). 45 min.
4. **Cook time accuracy + feedback breakdown**. 45 min.
5. **Activity heatmap**. 45 min — most layout work.
6. **Leftover efficiency**. 30 min.
7. **Question-mark toggles**. 20 min.
8. **Empty states + mobile polish**. 30 min.
9. **`tsc --noEmit` + manual smoke + commit**. 25 min.

Total: ~5.5 hours.

---

## 13. Open questions

- **Date range covering both filter bar and stale-dish threshold?** Stale-dish threshold (30 days) is independent of filter range — it's a long-term stat. Documented in tooltip, no UI conflict.
- **Should "top cooked" filter respect member?** Tricky: a session has `householdMemberIds[]` but it's the cook list, not the eater list. Recommendation: ignore member filter on top-cooked, document in tooltip.
- **Real-time updates as user marks reactions?** Not in v1 — page recomputes on filter change or remount. Force-refresh button could be added.

---

## 14. Future extensions (deferred)

- CSV export of any card.
- Insight cards with predictions ("you usually cook on Wednesday").
- Cost trend timeline (different feature).
- Per-day-of-week analysis (do we cook differently on weekends?).
- Comparison to previous period ("this month vs last month").
