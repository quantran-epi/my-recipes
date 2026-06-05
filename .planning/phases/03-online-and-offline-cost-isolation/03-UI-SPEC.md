---
phase: 03
slug: online-and-offline-cost-isolation
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-05
---

# Phase 03 - UI Design Contract

> Visual and interaction contract for online/offline cost isolation. This contract preserves the current My Recipes operational UI while making online sync, sync prompts, dish images, and performance evidence behave predictably.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | Ant Design through existing `@components/*` wrappers where wrappers exist |
| Icon library | `@ant-design/icons` plus existing PNG domain icons from `assets/icons/` |
| Font | Existing app stack: Kanit where already used, otherwise Ant Design/system defaults |

**Design-system rule:** Phase 3 must reuse the current wrappers and primitives: `Modal`, `Button`, `Typography`, `Box`, `Stack`, `Image`, `Tag`, `Badge`, `Checkbox`, `Spin`, `Flex`, `Divider`, and existing list row components. Do not introduce a new UI kit, registry component, visual reset, landing-page pattern, or broad redesign.

---

## Interaction Contract

| Surface | Required UI Response | Content Readiness Rule |
|---------|----------------------|-------------------------|
| Deferred startup sync | No visible checking UI appears while the background manifest check waits for app/list readiness. | Only show a user-facing surface if updates are found or the user opens an explicit sync control. |
| Online list interactions during pending sync | Search, scroll, modal open, row menu, and navigation keep priority over sync work. | Sync may wait for another quiet moment; do not make the list feel busy because sync is pending. |
| Sync modal shell | Modal opens quickly from manifest data with title, close/cancel affordance, update counts/names, item checkboxes, and stable footer. | Full shared-data fetch and impact analysis may continue after the shell is visible. |
| Sync final action | User may inspect and select visible items while data/warnings load. | Final `Đồng bộ` action stays disabled until required shared data is loaded and the sync action is safe. |
| Impact warnings | Warning rows appear progressively under affected dish items with a bounded loading state while still checking. | Missing/pending warnings must not resize the modal dramatically or hide selectable items. |
| Dish list images | Row image area is stable and shows fallback immediately. | Remote image swaps in only after safe near-visible loading and clean decode/fetch; row dimensions do not change. |
| Dish detail/modal images | May load richer images than list rows because the user explicitly opened the detail surface. | Failure still uses stable fallback/error treatment without collapsing content. |
| Performance evidence UI/docs | Evidence summaries remain scan-friendly and factual. | Do not add in-app explanatory performance text; evidence belongs in test output/docs. |

**No-dead-click rule:** Online sync, image loading, or impact analysis must never make a user-triggered modal/menu/list interaction appear unresponsive.

**No-background-noise rule:** Do not add banners, toasts, badges, or app-shell status text for routine background manifest checks.

---

## Sync Modal Contract

| Element | Contract |
|---------|----------|
| Title | Keep existing modal concept: `Có dữ liệu dùng chung mới` with cloud/download icon. |
| First visible content | Show concise secondary text plus ingredient/dish sections from manifest data. Counts and names must appear before full shared data is fetched. |
| Item rows | Keep compact rows with checkbox, action tag, and item name. Rows must not jump when warnings appear. |
| Action tags | Preserve current meanings: `Mới` green, `Thay đổi` blue, `Đã xoá` red. |
| Loading state | Use small Ant Design `Spin` or inline secondary text for bounded loading areas. Do not cover the full app shell. |
| Warning state | Use `WarningOutlined` with warning text below affected dish rows. Use warning color only for actual impact warnings. |
| Error state | Show a concise problem plus retry/defer path inside the modal. Keep `Để sau` available. |
| Footer | Keep `Để sau` secondary and `Đồng bộ ({count})` primary. Disable primary while required shared data is unavailable or fetch has failed. |

**Progressive-warning rule:** If impact analysis is still running, show an inline pending state near the affected section, not a full-modal blocking spinner.

**Selection rule:** Checkbox selection state must remain usable and visually stable while details load.

---

## Dish Image Contract

| Surface | Contract |
|---------|----------|
| Dish list row | Preserve the fixed `88px x 122px` image column used by `DishesList.screen.tsx`. |
| List fallback | Show the existing fallback icon immediately with neutral surface color and border when no safe image is ready. |
| List remote image | Load lazily/near visibility, decode async, and do not block row buttons, menus, search/reset, or scroll. |
| Broken image | Do not collapse the image area. If a broken label is shown, keep it small and anchored inside the image area. |
| Detail/modal image | Preserve existing larger image areas such as `150px`/`180px` heights unless implementation evidence requires a narrow adjustment. |
| Layout stability | No layout shift, row-height jump, overlap, or clipped action buttons when image state changes. |

**Image-risk rule:** Guard obvious risky remote/huge image loads on list rows, but do not remove useful list imagery as a blanket workaround.

---

## Spacing Scale

Declared values for new or revised UI should use this scale where possible:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, warning icon/text gaps, small inline offsets |
| sm | 8px | Checkbox row gaps, compact modal row gaps, button group gaps |
| md | 16px | Modal section spacing and divider spacing |
| lg | 24px | Larger modal body breathing room only where existing modal layout uses it |
| xl | 32px | Rare; use only for centered loading/empty areas already following this pattern |
| 2xl | 48px | Not expected in Phase 3 |
| 3xl | 64px | Not expected in Phase 3 |

Exceptions: preserve existing row and modal micro-spacing when matching current code, including `6px`, `10px`, `12px`, and the fixed dish image dimensions `88px x 122px`. Do not add new arbitrary spacing values unless preserving layout stability requires it.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | existing Ant Design/app default, normally 14-18px depending wrapper context | 400 | existing component default |
| Label | 11-13px for compact row, warning, loading, and metadata text | 400-500 | 16-18px |
| Heading | Ant Design modal title defaults or existing feature heading styles | 600-650 | existing component default |
| Display | not used in Phase 3 | not applicable | not applicable |

**Typography rules:**
- Do not add hero-size, marketing, or instructional text to app surfaces.
- Keep sync modal copy short enough to scan inside a compact modal.
- Long item names must wrap or truncate inside modal rows without pushing checkboxes, tags, or buttons out of view.
- Evidence/docs text can be factual and technical; in-app copy should stay user-task focused.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#fff` | Modal surfaces, row cards, image-ready surfaces |
| Secondary (30%) | `#fafafa`, `#f5f5f5`, `#f0f0f0`, `#d9d9d9` | Fallback image surfaces, borders, subdued loading/metadata areas |
| Brand primary | `rgb(245, 130, 32)` | Existing Ant Design primary token; keep for primary app controls where current theme applies |
| Informational accent | `#1677ff`, `#e6f4ff`, `#0958d9` | Existing blue info tags, sync icon/count badges, selected or informational states already using blue |
| Warning | `#d46b08`, `#fa8c16`, `#fff7e6`, `#ffd591` | Impact warnings and attention states only |
| Success | Ant Design green / `#389e0d` | Added/new/success status only |
| Destructive | `#ff4d4f`, `#ffccc7`, `#cf1322` | Removed items, broken-image label, and destructive actions only |

Accent reserved for: sync update badges/icons, existing informational tags, selected states, and primary controls already styled by Ant Design. Do not recolor all online/offline states as blue or orange.

**Palette rule:** Phase 3 is a performance/behavior phase, not a visual redesign. Keep the quiet operational palette and avoid gradients, decorative backgrounds, or attention-heavy status surfaces.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Sync modal title | `Có dữ liệu dùng chung mới` |
| Sync modal helper | `Chọn những mục bạn muốn cập nhật vào thiết bị này:` |
| Ingredient section | `Nguyên liệu` |
| Dish section | `Món ăn` |
| Action tag: added | `Mới` |
| Action tag: modified | `Thay đổi` |
| Action tag: removed | `Đã xoá` |
| Secondary CTA | `Để sau` |
| Primary CTA | `Đồng bộ {count}` or `Đồng bộ ({count})`, preserving current local convention |
| Shared data loading | `Đang tải dữ liệu...` |
| Impact warning loading | `Đang kiểm tra ảnh hưởng...` |
| Fetch error | `Không thể tải dữ liệu: {error}` |
| Broken image label | `Ảnh lỗi` |
| Background check status | none; no visible copy |

**Copy rules:**
- Preserve Vietnamese UI copy already used by the app.
- Do not add visible explanatory text about performance internals, sync scheduling, service workers, or test modes.
- Loading and warning copy must describe the user-visible state, not the implementation mechanism.

---

## Responsive And Touch Contract

| Viewport/Mode | Required Behavior |
|---------------|-------------------|
| Mobile/touch | Sync modal rows remain selectable without tiny targets; list scrolling and row actions remain unaffected by background sync/image loading. |
| Desktop | Modal footer buttons, checkboxes, tags, and warning rows remain aligned and reachable. |
| Narrow widths | Item names wrap/truncate within rows; tags and checkboxes stay visible; footer buttons do not overlap. |
| Large datasets | Dish row image fallback/loading must not change virtualized row height or cover row action buttons. |
| Offline | No missing-network banner is added by Phase 3 beyond existing app behavior; offline local-first screens remain usable. |

**Verification target:** Playwright checks should continue validating Phase 2 hot paths and add Phase 3 online/offline evidence without requiring live GitHub or live image hosts.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party registry | none | not allowed in Phase 3 |

No registry blocks, third-party UI kits, new icon systems, generated visual assets, or broad component-library changes are allowed for Phase 3.

---

## Phase 3 UI Must-Haves

- Background shared-manifest checks must not show routine checking UI.
- The sync modal shell must render from manifest data before full shared-data fetch and impact analysis complete.
- Users may review and select update items while details load; final sync stays disabled until safe.
- Impact warnings must appear progressively without destabilizing modal layout.
- Dish list images must keep row dimensions stable and show fallback first.
- Detail/modal images may remain richer than list images.
- Online/offline/image/network evidence must remain in test output/docs, not as in-app instructional copy.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS - preserves Vietnamese task copy, forbids visible routine background-check copy, and defines concise loading/error/warning text.
- [x] Dimension 2 Visuals: PASS - preserves existing Ant Design modal/list/image patterns and avoids redesign scope.
- [x] Dimension 3 Color: PASS - uses existing app/Ant Design colors and constrains info, warning, success, and destructive usage.
- [x] Dimension 4 Typography: PASS - preserves compact operational typography and rejects hero/display text in tool surfaces.
- [x] Dimension 5 Spacing: PASS - defines a 4px-based scale while documenting existing row/modal micro-spacing exceptions.
- [x] Dimension 6 Registry Safety: PASS - no shadcn, third-party registry blocks, or new UI kits are used.

**Approval:** approved 2026-06-05
