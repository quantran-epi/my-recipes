# UI/UX Normalization — List Anatomy + Button Style

**ID:** 260612-uxn
**Type:** UI/UX consistency pass
**Date:** 2026-06-12
**Status:** Plan only

---

## 1. Problem statement

Three concrete inconsistencies degrade the experience:

### 1.1 List item anatomy varies across features

The user's pain isn't visual style — it's **layout predictability**. When scanning a meal item vs a leftover row vs a feedback history entry vs a smart planner suggestion, the eye has to relearn where:

- the **title** is
- the **description / subtitle** is
- the **tags / status pills** are
- the **tool buttons** (action menu, primary action) are

Today, each list reinvents this layout. The user wants to glance at any list item and know exactly where to look.

### 1.2 Button styles are scattered

The analytics screen's "Cần mua" section has two buttons (`Mở cao nhất`, `Mua sắm`) styled like this:

```ts
height: 28
padding: '0 9px'
borderRadius: 999
color: '#0958d9'
borderColor: 'rgba(9,88,217,0.30)'
fontWeight: 650
fontSize: 11
```

These are clean, compact, pill-shaped, semantic-color-tinted, secondary-action buttons. The user wants this style as the **default secondary action button** across the app. Exceptions:

- Page header buttons (large primary CTAs)
- Searchbox / filter buttons (specific input affordances)

### 1.3 Dashboard list items use a colored left rail

In `Dashboard.screen.tsx`, items inside dashboard sections (cooking, leftovers, today's meals) carry a 5px colored rail on the left. The user finds this **distracting** — the dashboard is meant to be a calm overview, and the rail visually shouts at every row. Plain boxes would let the user's eye flow.

---

## 2. Scope

**In scope (v1):**

1. **List anatomy contract** — defined and documented, applied to the four most-used lists:
   - Scheduled meal item card
   - Leftover row
   - Feedback history record
   - Cooking analytics dish row

2. **Standard secondary button** — extracted as `<ActionButton>` and applied app-wide where appropriate.

3. **Dashboard plain-box list items** — strip rails from dashboard section list items only (not list pages — the leftover management page keeps its rails).

**Out of scope (deferred):**

- Smart planner suggestion card (it's an image-first dish card — different intent, keep as-is)
- Settings / detail modals (form-shaped, not list-shaped)
- Page hero / banner sections (different visual rhythm)
- Color / typography / icon system audit (separate effort)
- Shopping list rows (deferred to a v1.1 follow-up)

---

## 3. List anatomy contract

The contract is a **layout grammar**, not a CSS reset. Every list item that follows it must answer four questions in the same place:

```
┌──────────────────────────────────────────────────────────────┐
│  [LEAD]   [TITLE]                              [TRAIL]       │
│           [SUBTITLE]                                          │
│           [TAG ROW]                                           │
│  ─────────────────────────────────────────────────────────── │
│           [ACTION ROW]                                        │
└──────────────────────────────────────────────────────────────┘
```

### 3.1 Slots and rules

| Slot | Required? | Position | Content type |
| --- | --- | --- | --- |
| **LEAD** | optional | top-left, fixed width 32–40px | icon, image thumbnail, or checkbox |
| **TITLE** | required | top-center, single bold line | dish name, meal name, member name |
| **SUBTITLE** | optional | below title, secondary color | meal slot · date · count · context |
| **TAG ROW** | optional | below subtitle, wraps | status pills, badges, score chips |
| **TRAIL** | optional | top-right, fixed width auto | score percentage, status pill, primary metric |
| **ACTION ROW** | optional | below body, separated by divider | secondary action buttons (uses standard `<ActionButton>`) |

### 3.2 What this guarantees

- The user always sees the **what** (TITLE) at top-left-of-content.
- The user always sees the **how-much / how-good** (TRAIL) at top-right.
- The user always sees the **why / when / where** (SUBTITLE) directly under the title.
- The user always sees the **state markers** (TAG ROW) below context, never mixed into the title row.
- The user always sees the **what-can-I-do** (ACTION ROW) at the bottom, separated by a hairline.

### 3.3 What the contract does NOT enforce

- Background color / border color (each list keeps its own palette)
- Padding / radius / shadow (matched to surrounding context)
- Whether to show a rail (dashboard sections strip rails, list pages keep them — see §5)

This is intentional: we're normalizing **where things are**, not **how things look**.

---

## 4. Standard `<ActionButton>` component

### 4.1 Specification

`src/Components/Button/ActionButton.tsx` (new):

```tsx
export type ActionButtonTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

const TONE_PALETTE: Record<ActionButtonTone, { color: string; border: string }> = {
    default: { color: '#475569', border: 'rgba(15,23,42,0.18)' },
    primary: { color: '#0958d9', border: 'rgba(9,88,217,0.30)' },
    success: { color: '#389e0d', border: 'rgba(56,158,13,0.30)' },
    warning: { color: '#d46b08', border: 'rgba(212,107,8,0.30)' },
    danger:  { color: '#cf1322', border: 'rgba(207,19,34,0.30)' },
};

interface ActionButtonProps {
    tone?: ActionButtonTone;       // default 'default'
    icon?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    children: ReactNode;
    // pass-through optional sizing
    height?: number;               // default 28
    fontSize?: number;             // default 11
}

export const ActionButton: FC<ActionButtonProps> = ({ tone = 'default', icon, onClick, disabled, children, height = 28, fontSize = 11 }) => {
    const palette = TONE_PALETTE[tone];
    return <Button
        onClick={onClick}
        disabled={disabled}
        icon={icon}
        style={{
            height,
            padding: '0 9px',
            borderRadius: 999,
            color: palette.color,
            borderColor: palette.border,
            fontWeight: 650,
            fontSize,
            lineHeight: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
        }}
    >{children}</Button>;
};
```

### 4.2 Where to use `<ActionButton>`

**USE for:**
- Inline list-row actions (`Ăn 1 phần`, `Đã hết`, `Bỏ`)
- Section-level secondary actions (`Mở cao nhất`, `Mở mua sắm`, `Xem tất cả`)
- Card footer actions (`Mở chi tiết`, `Sửa`, `Sao chép`)
- Modal footer secondary actions (`Hủy`, alongside primary `Lưu`)
- Empty state CTAs (`Thêm món đầu tiên`)

**DO NOT use for:**
- Page header primary CTAs (e.g., `+ Thêm thực đơn` at top of meal list page) — keep current ant-d primary button
- Search/filter input affordances (e.g., search clear, filter toggle inside an Input prefix/suffix) — these belong to their host input
- Form submit buttons (use ant-d `type='primary'` directly)
- Floating action buttons or fixed bottom bars — different visual rhythm
- Icon-only mini buttons (`MoreOutlined` dropdown trigger, `?` toggle) — these stay as `Button type='text'` or custom small circular icon buttons

### 4.3 Existing call sites to migrate

I'll inventory during implementation. Initial estimate: ~40-60 button usages match the pattern. Sweep order:

1. `DashboardAnalytics.screen.tsx` (already correct, reference)
2. `Dashboard.screen.tsx` (existing ActionRow buttons)
3. `LeftoverManagementScreen` (Ăn 1 phần / Đã hết / Bỏ)
4. `MemberDishFeedbackHistoryWidget` (Xoá lọc)
5. `ScheduledMealList` cards (Sửa, action menu trigger stays)
6. `SmartMealPlannerScreen` (Mở chi tiết, planner action chips)
7. `MealCompletionLeftoverModal` (Đóng, Hoàn tất)
8. `LeftoverDishesModal` (any inline actions)
9. `CookingSessionWidget` (Tiếp, Tạm dừng — careful, these are mid-flow primary actions; evaluate case-by-case)

---

## 5. Dashboard plain-box list items

### 5.1 Current state

`Dashboard.screen.tsx` ActionRow + LeftoverRow + similar sub-components apply this rail-flavored treatment:

```tsx
<Box style={{ borderRadius: 8, ..., overflow: 'hidden' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '5px minmax(0, 1fr)' }}>
        <div style={{ background: accent }} />
        <div style={{ padding: '...' }}>...</div>
    </div>
</Box>
```

### 5.2 Target state (dashboard only)

```tsx
<Box style={{
    borderRadius: 8,
    border: '1px solid rgba(15,23,42,0.08)',
    background: '#fff',
    padding: '11px 12px',
    boxShadow: '0 6px 16px rgba(15,23,42,0.05)',
}}>
    {/* content directly, no rail grid */}
</Box>
```

The accent color moves into:
- A small dot or chip (`<span style={{width:6, height:6, borderRadius:999, background: accent}}>`) inside the title row, OR
- The icon foreground/background (LEAD slot)
- A status pill in the TAG ROW

This way the urgency/category info is preserved without painting a stripe across the row.

### 5.3 Scope of plain-box change

Only the following dashboard sub-components:

- `ActionRow` (Dashboard.screen.tsx)
- `CookingRow` (Dashboard.screen.tsx)
- `LeftoverRow` (Dashboard.screen.tsx) — only the dashboard-embedded version
- `MealRow` summary previews if rail-styled (verify)

**Keep rails on:**
- Leftover Management page rows (full-page list, rail is informative there)
- Scheduled meal list cards (the colored rail is the planned-status indicator — meaningful)
- Cooking session active step (rail = "you are here")
- Prep tasks page (rail = phase color, semantic)

The principle: rails are fine on **dedicated list pages where the rail's color carries meaning**. They're noise on the **dashboard overview** where the user wants to scan quickly.

---

## 6. File-by-file changes

### 6.1 New files

| File | Purpose |
| --- | --- |
| `src/Components/Button/ActionButton.tsx` | New `<ActionButton>` component per §4 |
| `src/Components/Button/ActionButton.styles.ts` | If we want palette in a shared file (optional) |
| `src/Components/Layout/ListItemAnatomy.md` | Markdown contract reference for future contributors |

### 6.2 Documentation

`src/Components/Layout/ListItemAnatomy.md` documents the §3 contract with examples. Not enforced by code — a guide for future contributors. One page, ~100 lines, with ASCII templates.

### 6.3 Edits

| File | Changes |
| --- | --- |
| `Dashboard.screen.tsx` | Strip rails from `ActionRow`, `CookingRow`, `LeftoverRow`. Move accent to icon background + small dot in title. Migrate inline buttons to `<ActionButton>`. |
| `DashboardAnalytics.screen.tsx` | Migrate `Mở cao nhất`, `Mở mua sắm`, `Mở danh sách dinh dưỡng`, etc. to `<ActionButton tone='primary'>`. Delete the inline `style={{...}}` blob. |
| `LeftoverManagement.screen.tsx` | Migrate `Ăn 1 phần`, `Đã hết`, `Bỏ` to `<ActionButton>` with appropriate tones. Confirm anatomy compliance. |
| `MemberDishFeedbackHistory.widget.tsx` | Migrate `Xoá lọc` to `<ActionButton tone='default'>`. |
| `MealCompletionLeftoverModal` (in `ScheduledMealCooking.widget.tsx`) | Audit: migrate `Đóng` button. Keep `Hoàn tất` as primary ant-d. |
| `ScheduledMealList.screen.tsx` | Audit list-row actions, migrate appropriate ones. |
| `SmartMealPlanner.screen.tsx` | Migrate inline `chip-style` buttons. Stepper buttons stay as-is (they're +/- micro-buttons, not action buttons). |

### 6.4 Anatomy-compliance audit table

For each list, confirm slot mapping:

| List | LEAD | TITLE | SUBTITLE | TAG ROW | TRAIL | ACTION ROW |
| --- | --- | --- | --- | --- | --- | --- |
| Scheduled meal item | checkbox | meal name | date · slot count | status pill | meal-day badge | menu trigger only (compact) |
| Leftover row (page) | dish image | dish name | portions · ăn trước X · meal source | status pill | days-left chip | Ăn 1 / Đã hết / Bỏ |
| Feedback history | (none) | dish name | slot · meal · date | (none) | reaction chip | (none) |
| Analytics dish row | rank# | dish name | last cooked date | (none) | cook count | Mở dish |

Any list that breaks this contract gets restructured (minimal changes — usually rearranging existing JSX).

---

## 7. Question-mark toggles

This is structural change, not feature change — most existing tooltips stay where they are. Two new help affordances:

- ⓘ on the dashboard `<DashboardSection>` header explains "Plain box rows: nội dung phẳng, không có vạch màu, để bạn quét nhanh hơn." (Optional, can omit.)
- ⓘ in the `ActionButton` storybook-style doc (the `ListItemAnatomy.md` file)

No new in-app `?` toggles needed.

---

## 8. Edge cases

| Case | Handling |
| --- | --- |
| List item with very long title | TITLE single-line `text-overflow: ellipsis`; show full in `Tooltip` on hover. Already standard. |
| List item with no SUBTITLE | Skip the slot; tag row jumps up. No empty space. |
| List item with 4+ tags | TAG ROW wraps to second line. Already standard. |
| ACTION ROW with 4+ buttons | Wraps; consider moving extras into a `…` overflow menu. Decision per list. |
| Dashboard row without natural accent | Use neutral icon (no background tint). Plain-box still clean. |
| `<ActionButton>` with very long label | min-width auto, padding stays at `'0 9px'`, label can wrap (not preferred). Recommend short labels (≤14 chars). |
| Dark mode (future) | Palette tokens exist for both — `<ActionButton>` re-themed in one place. |

---

## 9. Migration safety

**Risk level: low.**

- `<ActionButton>` wraps the existing ant-d `<Button>`, so all event handlers, focus rings, and disabled states work unchanged.
- Stripping rails is pure visual; no logic touched.
- Anatomy reorganization is JSX rearrangement — no data flow changes.

**Verification:**

1. `npx tsc --noEmit` after each file's changes.
2. Manual smoke: open dashboard, leftover page, meal list, planner page — visually compare.
3. Spot-check button hover/focus states (ant-d preserves them).
4. Mobile viewport (360px) sanity check.

**Rollback:** Each file's changes are atomic and isolated. Revert per-file if needed.

---

## 10. Implementation order

1. **`<ActionButton>` component + tone palette**. 30 min. Build first so all migrations consume the same primitive.
2. **`ListItemAnatomy.md` doc**. 20 min. Reference for the rest of the work.
3. **DashboardAnalytics migration** (already-correct buttons converted to `<ActionButton>`). 30 min. This is the reference implementation.
4. **Dashboard plain-box conversion** (rails stripped, buttons migrated). 60 min. Highest user-perceived impact.
5. **LeftoverManagement migration** (anatomy compliance + buttons). 30 min.
6. **FeedbackHistory + Cooking modals migration**. 30 min.
7. **ScheduledMealList audit + migration**. 45 min.
8. **SmartMealPlanner audit + selective migration**. 45 min.
9. **`tsc --noEmit` + manual smoke + commit**. 30 min.

Total: ~5 hours. Can be split across two sessions if needed (sessions split between steps 4 and 5).

---

## 11. Sequencing relative to feature suite (260612-mps)

**Recommendation: do this BEFORE `260612-mps`.**

Why:
- The meal planning suite adds three new lists (analytics dish row, prep tasks row, leftover-aware suggestion variants).
- Building those on top of `<ActionButton>` and the anatomy contract = consistency for free.
- Otherwise we'll ship the suite, then need to retro-fit five more list variants in a follow-up pass.

Estimated total saved: ~3 hours of duplicated migration work.

If user prefers feature delivery first, that's valid — just understand the consistency pass becomes ~8 hours instead of 5.

---

## 12. Status tracking

- [ ] `<ActionButton>` component built
- [ ] `ListItemAnatomy.md` doc written
- [ ] DashboardAnalytics migrated (reference)
- [ ] Dashboard rails stripped + buttons migrated
- [ ] LeftoverManagement anatomy + buttons
- [ ] FeedbackHistory + Cooking modals
- [ ] ScheduledMealList audit + migration
- [ ] SmartMealPlanner audit + selective migration
- [ ] `tsc --noEmit` clean
- [ ] Manual smoke complete
- [ ] Committed

---

## 13. Open questions (already decided, recorded for posterity)

| Question | Choice |
| --- | --- |
| Strip rails on Leftover Management page too? | No — full-page list, rail's color is informative. |
| Apply `<ActionButton>` to cooking session step buttons? | No — those are mid-flow primary actions, keep ant-d primary. |
| Anatomy contract enforced via TypeScript types? | No — markdown doc only. Code enforcement adds friction without proportional benefit. |
| Do we need a `<ListItemCard>` wrapper component? | No — JSX flexibility wins. Each list keeps its own shell, anatomy is the contract. |
| Dark mode considered? | Tokens defined, full dark mode is separate effort. |

---

## 14. Out of scope for this plan (future work)

- `<ListItemCard>` wrapper component if anatomy violations recur
- Color/typography token system audit
- Page header button standardization (separate from list buttons)
- Search/filter input pattern audit
- Form input pattern audit
- Modal anatomy contract
- Empty state pattern catalog
