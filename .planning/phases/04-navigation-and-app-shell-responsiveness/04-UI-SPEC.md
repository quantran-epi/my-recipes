---
phase: 04
slug: navigation-and-app-shell-responsiveness
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-06
reviewed_at: 2026-06-06
---

# Phase 04 - UI Design Contract

> Visual and interaction contract for navigation and app-shell responsiveness. This contract preserves the current My Recipes operational UI while making drawer opening, route feedback, global-search navigation, and large-list detail navigation feel immediate.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | Ant Design through existing `@components/*` wrappers where wrappers exist |
| Icon library | `@ant-design/icons` plus existing PNG domain icons from `assets/icons/` |
| Font | Existing app stack: Kanit for app-shell title/feature heading where already used, otherwise Ant Design/system defaults |

**Design-system rule:** Phase 4 must reuse current app-shell primitives: `Drawer`, `Menu`, `Button`, `Modal`, `DeferredModalContent`, `Typography`, `Box`, `Stack`, `Flex`, `Divider`, `Image`, `Spin`, and the existing list/detail screen components. Do not introduce shadcn, a third-party registry, a new UI kit, a page-level redesign, or a route architecture visual reset.

---

## Interaction Contract

| Surface | Required UI Response | Content Readiness Rule |
|---------|----------------------|-------------------------|
| Sidebar menu button | Drawer shell opens promptly from large list screens. | First visible drawer content is logo/title plus route navigation links. Secondary tools may mount after the drawer shell paints. |
| Drawer navigation links | Link tap closes drawer and starts compact route feedback in the same interaction. | Route content may finish after feedback appears; feedback clears after route path change and a short paint window. |
| Deferred drawer tools | Sync, publish, Gist backup, cooking history, user guide, and admin controls appear quietly after the shell. | Tool content must not block route links from being visible or tappable. |
| Bottom tabs | Tab tap starts the same compact route feedback used by drawer navigation. | Duplicate taps to the same pending destination are ignored until navigation settles. |
| Global search result navigation | Result tap commits recent search, starts route feedback, closes the search overlay, and navigates. | Search results and current result density remain unchanged; no extra explanatory loading text is added inside search. |
| Large-list detail navigation | Detail-route buttons from dish and shopping-list large screens start route feedback before route work competes with list work. | Existing modal close behavior, row information, and detail content remain preserved. |
| Modal/sidebar shell from large lists | Shell appears with a light body first when heavy content is needed. | Heavy content mounts after the shell has painted, using existing `DeferredModalContent` or an equivalent local drawer deferral. |
| Route feedback overlay | Use the existing compact overlay pattern with loading icon and two-line copy. | Overlay must not remain visible after route completion plus the planned paint window. |

**No-dead-click rule:** Every drawer, tab, global-search, and list-to-detail navigation action must show either the drawer shell or route feedback promptly. The user should not see a silent pause before the app acknowledges the tap.

**No-tool-removal rule:** Performance fixes must not remove or hide existing drawer workflows: shared-data sync, admin publish, Gist backup, cooking history, user guide, admin login/logout, and scheduled-meal toolkit entry points.

**No-performance-explanation rule:** Do not add visible in-app copy explaining performance mechanics, scheduling, virtualization, network behavior, or why content is deferred. Evidence belongs in docs and test output.

---

## Drawer Contract

| Element | Contract |
|---------|----------|
| Trigger | Keep the primary menu button with `MenuOutlined` and current `data-testid="sidebar-drawer-button"`. |
| Title | Keep logo plus `My Recipes` text in the drawer title. |
| Immediate nav | Show route links for `Tổng quan`, `Nguyên liệu`, `Món ăn`, `Kế hoạch chi phí`, `Lịch mua sắm`, and `Thực đơn` before secondary tool sections mount. |
| Nav row layout | Preserve current icon-plus-label rows with 24px domain icons and compact horizontal spacing. |
| Deferred section order | Preserve current order after nav: `Dữ liệu dùng chung`, `Quản trị` when admin, `Sao lưu cá nhân`, `Nấu ăn`, `Tài khoản`. |
| Deferred loading | If a placeholder is needed, use a small quiet spinner or reserve a minimal stable area. Do not add explanatory text. |
| Account/PIN flow | `Đăng nhập Admin`, PIN modal title `Nhập mã PIN`, `Xác nhận`, `Huỷ`, error `Sai mã PIN`, and lock/logout behavior remain unchanged. |
| Drawer close | Closing the drawer must not leave route feedback active unless a route navigation is genuinely pending. |

**Drawer visual hierarchy:** The first focal point is the top route list, not backup/sync tools. Secondary tools are available after the shell settles and must not pull focus away from navigation during the first paint.

---

## Route Feedback Contract

| Element | Contract |
|---------|----------|
| Overlay position | Keep fixed app-shell overlay between header and bottom tabs: top around `60px`, bottom around `80px`. |
| Overlay surface | Preserve the soft white/light-blue translucent surface and blur from the current app-shell overlay. |
| Feedback card | Keep a compact centered card with loading icon, title, and one short hint line. |
| Title copy | `Đang mở trang` |
| Hint copy | `Chuẩn bị dữ liệu hiển thị` |
| Icon | `LoadingOutlined` in the current blue-tinted icon well. |
| Pointer behavior | While feedback is active, it may absorb duplicate clicks for the same pending destination. It must not permanently block the app shell. |
| Completion | Clear only after the route path matches the pending destination and the browser receives a short paint window, with fallback cleanup for interrupted navigation. |

**Feedback scope:** Use the same route feedback behavior for sidebar links, bottom tabs, global-search result clicks, and large-list detail route transitions where practical.

---

## Global Search Contract

| Element | Contract |
|---------|----------|
| Overlay | Preserve the existing full-screen fixed search overlay with white header and gray result body. |
| Input placeholder | `Tìm món ăn, nguyên liệu, lịch mua sắm...` |
| Empty state | Preserve `Gõ để tìm món ăn, nguyên liệu hoặc lịch mua sắm`. |
| Short query state | Preserve `Nhập ít nhất 2 ký tự để tìm kiếm`. |
| No result state | Preserve `Không tìm thấy kết quả cho "{query}"`. |
| Result groups | Preserve `Món ăn`, `Nguyên liệu`, and `Lịch mua sắm` sections with count text and current show-more behavior. |
| Result navigation | Result tap starts app-shell route feedback before navigation; result row layout and matched chips stay unchanged. |

**Search density rule:** Do not expand global search result rows, add loading cards, or reduce result count density for Phase 4.

---

## Spacing Scale

Declared values for new or revised UI should use this scale where possible:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, route-feedback icon/text fine spacing, compact deferred-tool gaps |
| sm | 8px | Drawer button gaps, stacked drawer tool gaps, global-search result control gaps |
| md | 16px | Drawer body side padding, search header horizontal padding, modal body spacing |
| lg | 24px | Drawer lower body padding and larger section breathing room where already present |
| xl | 32px | Centered loading or empty-state areas only when matching existing search/modal patterns |
| 2xl | 48px | Existing empty-state vertical padding only; not expected for new app-shell controls |
| 3xl | 64px | Not expected in Phase 4 |

Exceptions: preserve existing app-shell micro-spacing when matching current code, including 10px header/drawer title gaps, 12px overlay card gaps, 13px/15px text line heights, fixed header height `60px`, bottom tab height `80px`, and bottom-tab button width `90px`. Do not add new arbitrary spacing values unless preserving an existing layout requires it.

---

## Typography

For new or revised Phase 4 UI, use only these four sizes and two weights unless preserving an unchanged existing component style:

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Micro | 11px | 400 | 15px |
| Label | 13px | 400 | 18px |
| Navigation/body | 16px | 400 | Ant Design default or 22px |
| Shell title | 22px | 600 | Ant Design default or 28px |

**Typography rules:**
- Keep Kanit for the `My Recipes` drawer title and existing app feature heading only.
- Do not introduce hero/display typography, marketing copy, or oversized headings in drawer, global search, route feedback, modal, or list surfaces.
- Route feedback text must stay compact: title 13px/600, hint 11px/400.
- Long route/search/list text must truncate or wrap within its existing container without pushing icons, counts, or buttons out of view.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#fff`, `rgba(255,255,255,0.96)` | Drawer surface, search header, route-feedback card, modal surfaces |
| Secondary (30%) | `#fafafa`, `#f5f5f5`, `#f0f0f0`, `#d9d9d9` | Search body, drawer dividers/borders, subdued rows, neutral separators |
| Brand primary | `rgb(245, 130, 32)` | Existing Ant Design primary token and current primary app controls |
| Navigation info accent | `#1677ff`, `#e6f4ff`, `#0958d9` | Route feedback icon well, active navigation/focus states, informational links already using blue |
| Cooking/warning | `#fa8c16`, `#d46b08`, `#fffbe6`, `#ffd591` | Existing cooking pill/session states and warning surfaces only |
| Success/admin | `#52c41a`, `#389e0d` | Admin unlocked/publish success and completed/success states only |
| Destructive | Ant Design danger red / `#ff4d4f` | Delete/lock/destructive actions only |

Accent reserved for: route feedback icon well, active navigation states, primary controls already styled by Ant Design, and existing blue informational links or show-more rows. Do not recolor all drawer tools, search rows, or list actions as accent.

**Palette rule:** Phase 4 is not a visual redesign. Keep the quiet operational palette and avoid new decorative gradients, cards-inside-cards, marketing sections, or attention-heavy app-shell banners. The existing route-feedback overlay gradient may remain because it is already the established app-shell pattern.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Drawer title | `My Recipes` |
| Drawer route labels | `Tổng quan`, `Nguyên liệu`, `Món ăn`, `Kế hoạch chi phí`, `Lịch mua sắm`, `Thực đơn` |
| Drawer section labels | `Dữ liệu dùng chung`, `Quản trị`, `Sao lưu cá nhân`, `Nấu ăn`, `Tài khoản` |
| Shared sync action | `Đồng bộ dữ liệu mới` |
| Publish action | `Xuất bản dữ liệu dùng chung` |
| Cooking history action | `Lịch sử nấu ăn` |
| User guide action | `Hướng dẫn sử dụng` |
| Admin login action | `Đăng nhập Admin` |
| Admin lock action | `Khoá` |
| PIN modal primary CTA | `Xác nhận` |
| Route feedback title | `Đang mở trang` |
| Route feedback hint | `Chuẩn bị dữ liệu hiển thị` |
| Global search placeholder | `Tìm món ăn, nguyên liệu, lịch mua sắm...` |
| Global search empty state | `Gõ để tìm món ăn, nguyên liệu hoặc lịch mua sắm` |
| Global search error/no-result state | `Không tìm thấy kết quả cho "{query}"` |
| Destructive confirmation | No new destructive confirmation copy in Phase 4; preserve existing delete/lock confirmations where present. |

**Copy rules:**
- Preserve Vietnamese UI copy already used by the app.
- Do not add in-app text that explains performance, scheduling, route transitions, test modes, or why content is deferred.
- Loading copy must stay short and user-task focused. Prefer the existing route feedback title/hint or a quiet spinner.

---

## Responsive And Touch Contract

| Viewport/Mode | Required Behavior |
|---------------|-------------------|
| Mobile/touch | Drawer trigger, drawer route links, bottom tabs, and global-search result rows remain easy to tap. Duplicate taps to the same pending route do not stack work. |
| Desktop | Drawer, search overlay, route feedback overlay, and bottom tabs preserve current alignment and do not overlap row actions or modal controls. |
| Narrow widths | Drawer route labels and section helper text wrap/truncate within the drawer; bottom tab labels and feature heading do not overlap. |
| Large datasets | Opening drawer, global search, route feedback, or detail routes from virtualized lists must not change row height, row spacing, or loaded-list progress UI. |
| Offline | Offline banner/local-first behavior remains unchanged; route feedback should not imply network loading. |

**Verification target:** Playwright evidence should measure shell-visible and content-ready timing for drawer open, drawer navigation, bottom-tab navigation, global-search navigation, and large-list-to-detail navigation.

---

## Evidence And User Check Contract

| Evidence Surface | Contract |
|------------------|----------|
| Performance markdown | Include short shell/content timing rows for Phase 4 interactions. |
| Performance JSON | Include interaction IDs for drawer shell, drawer navigation, bottom-tab navigation, global-search navigation, and list-to-detail navigation. |
| User-facing docs | Explain what the user can check by eye in simple language. |
| In-app UI | Do not add performance evidence or diagnostic text to production app surfaces. |

**Eye-check list required in docs:** drawer shell appears quickly, route feedback appears right away, duplicate taps do not stack navigation, drawer tools are still present after the drawer settles, and existing cooking/shopping/global-search workflows still work.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party registry | none | not allowed in Phase 4 |

No registry blocks, third-party UI kits, new icon systems, generated design assets, or broad component-library changes are allowed for Phase 4.

---

## Phase 4 UI Must-Haves

- Drawer shell must prioritize logo/title and navigation links before secondary tools mount.
- Drawer tool workflows must remain available: shared-data sync, publish, Gist backup, cooking history, user guide, admin login/logout, and scheduled-meal toolkit entry points.
- Route feedback must use the compact existing `Đang mở trang` / `Chuẩn bị dữ liệu hiển thị` overlay.
- Sidebar, bottom-tab, global-search, and large-list detail navigation should share one feedback behavior where practical.
- Duplicate taps to the same pending route must not enqueue repeated navigation or leave stale overlays.
- Modal and drawer heavy bodies should mount after the shell has painted where practical.
- No visible explanatory performance text should be added to the app.
- Existing list row density, global search result density, cooking flows, shopping flows, sync flows, and backup flows must remain preserved.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS - preserves concrete Vietnamese task copy, declares route feedback copy, and avoids generic new CTA labels or performance explanations.
- [x] Dimension 2 Visuals: PASS - declares drawer navigation as first focal point, keeps compact overlay hierarchy, and preserves current operational app-shell patterns.
- [x] Dimension 3 Color: PASS - uses existing app/Ant Design colors and reserves blue/orange/green/red accents for specific semantic states.
- [x] Dimension 4 Typography: PASS - constrains new Phase 4 type to four sizes and two weights while preserving unchanged existing component styles.
- [x] Dimension 5 Spacing: PASS - defines the standard 4px-based scale and documents justified existing app-shell exceptions.
- [x] Dimension 6 Registry Safety: PASS - no shadcn, third-party registry blocks, new UI kits, or generated design assets are used.

**Approval:** approved 2026-06-06

## UI-SPEC VERIFIED
