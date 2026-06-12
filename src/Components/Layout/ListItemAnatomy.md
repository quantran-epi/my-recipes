# List Item Anatomy

A layout grammar for list items across the app. Every list row that follows it places title, subtitle, tags, score, and actions in the same visual position so users can glance at any list item and know exactly where to look.

This is a **layout contract**, not a CSS reset. Each list keeps its own background, border, padding, and palette. We're normalizing **where things are**, not **how things look**.

---

## The grammar

```
┌──────────────────────────────────────────────────────────────┐
│  [LEAD]   [TITLE]                              [TRAIL]       │
│           [SUBTITLE]                                          │
│           [TAG ROW]                                           │
│  ─────────────────────────────────────────────────────────── │
│           [ACTION ROW]                                        │
└──────────────────────────────────────────────────────────────┘
```

| Slot | Required | Position | Content |
| --- | --- | --- | --- |
| **LEAD** | optional | top-left, fixed 32–40px | icon, image thumbnail, checkbox, rank# |
| **TITLE** | required | top-center, single bold line | dish name, meal name, member name |
| **SUBTITLE** | optional | below title, secondary color | meal slot · date · count · context |
| **TAG ROW** | optional | below subtitle, wraps | status pills, badges, score chips |
| **TRAIL** | optional | top-right, auto width | score %, status pill, primary metric |
| **ACTION ROW** | optional | below body, separated by hairline | secondary action buttons |

---

## What this guarantees for users

- **What** (TITLE) is always at top-left-of-content.
- **How much / how good** (TRAIL) is always at top-right.
- **Why / when / where** (SUBTITLE) is always directly under the title.
- **State markers** (TAG ROW) are always below context, never mixed into the title row.
- **What can I do** (ACTION ROW) is always at the bottom, separated by a hairline divider.

---

## Code template

```tsx
<Box style={{ /* shell: bg, border, padding, radius — list-specific */ }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 9, alignItems: 'flex-start' }}>
        {/* LEAD */}
        <span style={{ width: 36, height: 36, /* lead-specific */ }}>{icon}</span>

        {/* TITLE + SUBTITLE + TAG ROW */}
        <div style={{ minWidth: 0 }}>
            <Typography.Text strong style={{ display: 'block', /* title style */ }}>
                {title}
            </Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block', /* subtitle style */ }}>
                {subtitle}
            </Typography.Text>
            <Stack wrap='wrap' gap={5} style={{ marginTop: 6 }}>
                {tags}
            </Stack>
        </div>

        {/* TRAIL */}
        <Tag style={{ marginRight: 0, flexShrink: 0 }}>{score}</Tag>
    </div>

    {/* ACTION ROW (optional, separated by hairline) */}
    {hasActions && <>
        <div style={{ height: 1, background: 'rgba(15,23,42,0.06)', margin: '10px 0' }} />
        <Stack wrap='wrap' gap={6}>
            <ActionButton tone='success' icon={<RollbackOutlined />}>Ăn 1 phần</ActionButton>
            <ActionButton tone='primary'>Đã hết</ActionButton>
            <ActionButton tone='danger' icon={<DeleteOutlined />}>Bỏ</ActionButton>
        </Stack>
    </>}
</Box>
```

---

## Rules of thumb

**TITLE** is single-line with `text-overflow: ellipsis`. If the full text matters, wrap in `<Tooltip>`.

**SUBTITLE** is at most two lines. Combine context with `·` separators: `Bữa tối · 12/06 · Thực đơn "Tối thứ 4"`.

**TAG ROW** wraps freely. Status pills come first (most important), then info chips. Keep it under ~6 tags; collapse extras into a `+N` chip.

**TRAIL** is one element — a score percentage, status pill, or primary metric. Not a stack of mini-elements.

**ACTION ROW** is for secondary actions inside a repeated item. Page-level, section-level, and modal actions go elsewhere and use the normal Button family.

---

## ActionButton tones

```tsx
<ActionButton tone='default'>Bỏ lọc</ActionButton>
<ActionButton tone='primary'>Mở chi tiết</ActionButton>
<ActionButton tone='success' icon={<CheckCircleOutlined />}>Đã xong</ActionButton>
<ActionButton tone='warning' icon={<WarningOutlined />}>Cảnh báo</ActionButton>
<ActionButton tone='danger' icon={<DeleteOutlined />}>Xoá</ActionButton>
```

| Tone | Color | Use for |
| --- | --- | --- |
| `default` | slate gray | Bỏ lọc, neutral toggle |
| `primary` | blue | Mở chi tiết, navigate-to-source actions |
| `success` | green | Đã xong, completion confirmations |
| `warning` | amber | Cần xử lý, attention markers |
| `danger` | red | Xoá, Bỏ, destructive (with confirm dialog upstream) |

**USE `ActionButton` for:**

- Inline list-row actions (Ăn 1 phần / Đã hết / Bỏ)
- Repeated item action rows (Mở chi tiết, Sửa, Sao chép)

**DO NOT use ActionButton for:**

- Page header primary CTAs — use ant-d primary button
- Search/filter input affordances — belong to their host input
- Modal footer buttons — use the normal Button family
- Modal close/cancel/save actions — use the normal Button family
- Form submit buttons — use ant-d `type='primary'`
- Section-level and page-level CTAs — use the normal Button family
- Floating action buttons or fixed bottom bars — different visual rhythm
- Icon-only overflow buttons (`MoreOutlined` dropdown trigger) — keep as square normal buttons

---

## Examples in the codebase

| List | LEAD | TITLE | SUBTITLE | TAG ROW | TRAIL | ACTION ROW |
| --- | --- | --- | --- | --- | --- | --- |
| Scheduled meal item | checkbox | meal name | date · slot count | status pill | meal-day badge | menu trigger only |
| Leftover row (page) | dish image | dish name | portions · ăn trước X · meal source | status pill | days-left chip | Ăn 1 / Đã hết / Bỏ |
| Feedback history | (none) | dish name | slot · meal · date | (none) | reaction chip | (none) |
| Analytics dish row | rank# | dish name | last cooked date | (none) | cook count | Mở dish |

When adding a new list, drop it into this table mentally. If a slot doesn't fit your data, leave it empty — don't squeeze a non-fitting element into a slot.

---

## Rails: when to use them

The 5px colored left rail is **informative on dedicated list pages where the rail's color carries meaning**:

- ✅ Leftover Management page — rail color = expiry urgency
- ✅ Scheduled meal list cards — rail color = planned status
- ✅ Cooking session active step — rail = "you are here"
- ✅ Prep tasks page — rail = phase color (semantic)

The same rail is **noise on the dashboard overview** where the user wants to scan quickly:

- ❌ Dashboard ActionRow / CookingRow / LeftoverRow — strip the rail; move accent to icon background or a small dot in the title

**Principle:** rails carry meaning when the user is actively looking at that one list. They distract when the user is scanning many lists at once on a summary page.

---

## See also

- Plan: `.planning/quick/260612-uxn-ui-ux-list-and-button-normalization/260612-uxn-EXECUTION-PLAN.md`
- ActionButton: `src/Components/Button/ActionButton.tsx`
