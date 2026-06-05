---
phase: 2
slug: large-list-interaction-hot-paths
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-05
---

# Phase 2 - UI Design Contract

> Visual and interaction contract for the large-list responsiveness phase. This contract preserves the existing My Recipes list UI while planners optimize interaction hot paths.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | Ant Design through existing `@components/*` wrappers |
| Icon library | `@ant-design/icons` plus existing PNG domain icons from `assets/icons/` |
| Font | Existing Ant Design/system font stack |

**Design-system rule:** Phase 2 must reuse current components and wrappers: `Button`, `Input`, `Dropdown`, `Modal`, `DeferredModalContent`, `VirtualListRowFrame`, `VirtualListScrollTopButton`, `Space`, `Stack`, `Box`, `Typography`, `Tag`, `Tooltip`, and `Image`. Do not introduce a new UI library, design-system reset, or page-level redesign.

---

## Interaction Contract

| Interaction | Required UI Response | Content Readiness Rule |
|-------------|----------------------|-------------------------|
| Search/filter reset | Input/filter shell remains responsive immediately; list may repopulate progressively. | Main visible rows become usable before secondary calculations finish. |
| Row menu open | Menu surface appears promptly and stays anchored to the tapped row action. | Menu item labels/icons are visible before any heavier action work begins. |
| Modal/detail open | Modal shell appears immediately with title, close affordance, and stable body area. | Body may show the existing simple spinner until primary content is usable. |
| Drawer/sidebar feedback touched by Phase 2 | Trigger gives immediate visible feedback; shell must not feel like a dead click. | Heavy drawer content can finish later if shell is already visible. |
| Row actions | Button/tap target remains stable and acknowledges action without list-wide pause. | Any heavy follow-up work must not resize the originating row. |

**Loading rule:** Use the existing `DeferredModalContent` simple spinner/loading area for deferred heavy modal content. Do not introduce skeleton previews in Phase 2.

**No-dead-click rule:** If an interaction opens a modal, drawer, detail shell, menu, or action surface, the shell must appear before heavy body work runs where practical.

---

## List And Row Layout Contract

| Surface | Contract |
|---------|----------|
| Dish list rows | Preserve image/fallback, dish title, tags, serving tag, status badge, duration chip, ingredient/step summary blocks, readiness text, `Nấu`, `Chi tiết`, and row menu affordance. |
| Ingredient list rows | Preserve ingredient title, stock/inventory status, category/preservation/shelf-life information, admin actions, inventory action, suggest/cooking affordances, and row menu/confirm behavior where present. |
| Shopping-list rows | Preserve title/date/status, checklist/generation actions, detail/edit/delete/export/add-dish affordances, and readonly/completed state cues. |
| Filter chips | Keep compact horizontal chips with count text, active blue border/background, inactive white background, and no wrapping into tall toolbar blocks. |
| Paging status | If progressive loading is shown, keep the existing small floating pill style near the bottom center: `Đã tải {loaded}/{total}`. It must be pointer-events none and must not cover row actions. |

**Row stability requirements:**
- Rows must not visibly jump, resize, overlap, or collapse while secondary details are deferred.
- Touch/desktop scroll behavior from `VirtualListRowFrame` must remain intact.
- Existing row information density must be preserved unless an explicit tradeoff is escalated outside this phase plan.
- Cached/precomputed values must remain exact; never show stale or approximate counts/statuses to make the UI feel faster.

---

## Spacing Scale

Declared values for new or revised UI should use this scale where possible:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, tiny inline offsets |
| sm | 8px | Compact button/card gaps, row inner gaps |
| md | 16px | Modal body and grouped content spacing |
| lg | 24px | Section padding where existing wrappers use it |
| xl | 32px | Large modal/content separation only if already present |
| 2xl | 48px | Not expected in Phase 2 |
| 3xl | 64px | Not expected in Phase 2 |

Exceptions: Existing list-screen micro-spacing may remain when preserving current UI: `6px` chip gaps, `7px` dish card internal gaps, `10px` row-card padding/gaps, 11px/13px compact row text, and current row image dimensions. Do not add new arbitrary spacing values unless preserving an existing row layout requires it.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | existing Ant Design default, normally 14px | 400 | existing Ant Design default |
| Label | 11-12px for compact row labels and status text | 400-500 | 14-18px |
| Heading | Ant Design modal/title defaults or existing `Typography.Title level={5}` | 600-650 | existing component default |
| Display | not used in Phase 2 | not applicable | not applicable |

**Typography rules:**
- Do not introduce hero-scale or marketing-size text inside list screens, modals, rows, or toolbars.
- Preserve compact row labels and summaries so rows remain scannable.
- Long titles must continue using ellipsis/wrapping rules already present; text must not overflow action buttons or status pills.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#fff` | Row cards, modal surfaces, input/button surfaces |
| Secondary (30%) | `#fafafa`, `#f0f0f0`, `#e8e8e8`, `#d9d9d9` | Summary cells, borders, low-emphasis controls |
| Accent (10%) | `#1677ff`, `#e6f4ff`, `#0958d9` | Active filter chips, primary buttons, selected/control focus states |
| Success | `#389e0d`, `rgba(82,196,26,0.92)` | Ready/completed status only |
| Warning | `#d46b08`, `#fa8c16`, `rgba(250,140,22,0.94)` | Needs-update/cooking/attention states only |
| Destructive | `#ff4d4f`, Ant Design danger styles | Delete/destructive actions only |

Accent reserved for: active filters, primary buttons, existing selected states, and existing blue informational tags. Do not recolor all interactive elements as accent.

**Palette rule:** Phase 2 is not a visual redesign. Preserve the current quiet operational palette and avoid new gradient/orb/decorative backgrounds.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Search placeholder | `Tìm kiếm` |
| Progressive load status | `Đã tải {loaded}/{total}` |
| Add dish modal title | `Thêm món ăn` |
| Add ingredient modal title | `Thêm nguyên liệu` |
| Add shopping list modal title | `Thêm lịch mua sắm` |
| Dish primary row action | `Nấu` |
| Detail row action | `Chi tiết` |
| Detail modal close button | `Đóng` |
| Detail modal route action | `Mở trang chi tiết` |
| Destructive confirmation | Preserve existing delete confirmations such as `Xác nhận xóa` and `Bạn có chắc muốn xóa ... không? Hành động này không thể hoàn tác.` |

**Copy rules:**
- Preserve Vietnamese UI copy already used by the app.
- Do not add visible instructional copy explaining performance behavior, keyboard shortcuts, or how the optimization works.
- Loading copy is optional; prefer the existing simple spinner unless a current component already supplies text.

---

## Responsive And Touch Contract

| Viewport/Mode | Required Behavior |
|---------------|-------------------|
| Mobile/touch | Virtual rows remain scrollable with `touchAction: pan-y`; drag must not trigger row clicks. |
| Desktop | Row menu, modal buttons, filter chips, and scroll-top control remain reachable without overlap. |
| Narrow widths | Row text truncates/wraps within existing containers; buttons and icons must not overlap preceding text. |
| Large datasets | Progressive loading indicators must not shift list layout or obscure row actions. |

**Verification target:** Existing and new Playwright checks should keep validating row spacing, drag-as-scroll behavior, row menu open, modal/detail open, and search/filter reset on large data.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party registry | none | not allowed in Phase 2 |

No registry blocks, third-party UI kits, new icon systems, or generated design assets are allowed for Phase 2.

---

## Phase 2 UI Must-Haves

- Search/reset, modal/detail open, and row-menu open must provide prompt visible feedback on the three primary list screens.
- Closed modal bodies and inactive heavy content must remain unmounted until requested.
- The spinner/loading body must be simple and bounded by a stable modal body height where needed.
- Dish-list search/reset is the first visible before/after proof point.
- The improvement pattern must then protect ingredient and shopping-list screens too.
- Row detail preservation is mandatory unless an explicit tradeoff is escalated.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS - preserves current Vietnamese copy and forbids extra explanatory performance text.
- [x] Dimension 2 Visuals: PASS - keeps existing operational list/card/modal patterns and avoids redesign scope.
- [x] Dimension 3 Color: PASS - uses existing Ant Design/app colors and limits accent/destructive usage.
- [x] Dimension 4 Typography: PASS - preserves compact row typography and rejects hero/display type in tool surfaces.
- [x] Dimension 5 Spacing: PASS - defines a spacing scale while documenting existing row micro-spacing exceptions.
- [x] Dimension 6 Registry Safety: PASS - no shadcn or third-party registry blocks are used.

**Approval:** approved 2026-06-05
