# Phase 3: Online and Offline Cost Isolation - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 13
**Analogs found:** 13 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/Hooks/useSharedDataSync.ts` | hook | request-response, localStorage | `src/Hooks/useSharedDataSync.ts` | exact |
| `src/Components/AppInitializer/AppInitializer.tsx` | provider/component | event-driven | `src/Components/AppInitializer/AppInitializer.tsx` | exact |
| `src/Components/AppInitializer/SharedSyncModal.tsx` | component | request-response, Redux mutation | `src/Components/AppInitializer/SharedSyncModal.tsx` | exact |
| `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx` | component | image request/decode | `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx` | exact |
| `src/Modules/Dishes/Screens/DishesList.screen.tsx` | screen | virtualized list | `src/Modules/Dishes/Screens/DishesList.screen.tsx` | exact |
| `src/Modules/Dishes/Screens/DishesManageIngredient/DishReadonlyDetail.widget.tsx` | component | detail/modal image | `src/Modules/Dishes/Screens/DishesManageIngredient/DishReadonlyDetail.widget.tsx` | exact |
| `src/Modules/Dishes/Screens/DishesManageIngredient/DishDetail.widget.tsx` | component | detail image | `src/Modules/Dishes/Screens/DishesManageIngredient/DishDetail.widget.tsx` | exact |
| `tests/e2e/fixtures/seedApp.ts` | test fixture | browser storage seed | `tests/e2e/fixtures/seedApp.ts` | exact |
| `tests/e2e/fixtures/performanceNetwork.ts` | test fixture | network routing | `tests/e2e/fixtures/performanceNetwork.ts` | exact |
| `tests/e2e/fixtures/performanceReport.ts` | test fixture | evidence file I/O | `tests/e2e/fixtures/performanceReport.ts` | exact |
| `tests/e2e/performance-regression.spec.ts` | e2e spec | interaction timing | `tests/e2e/performance-regression.spec.ts` | exact |
| `tests/e2e/runPerformanceCommand.cjs` | CLI helper | child process | `tests/e2e/runPerformanceCommand.cjs` | exact |
| `docs/performance-audit-plan.md`, `docs/automated-regression-test-plan.md` | docs | command/evidence guidance | existing Phase 2 sections in same files | exact |

## Pattern Assignments

### `src/Hooks/useSharedDataSync.ts` (hook, request-response/localStorage)

**Analog:** `src/Hooks/useSharedDataSync.ts`

**Imports pattern** (lines 6-7):
```typescript
import { useEffect, useState } from "react";
import { SharedItemChange, SharedManifest } from "./useSharedPublish";
```

**Storage/version pattern** (lines 33-43):
```typescript
export const getSyncedVersions = (): SyncedVersions => {
    try {
        const raw = localStorage.getItem(SYNCED_VERSIONS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }
    return { ingredientsVersion: "", dishesVersion: "" };
};

export const saveSyncedVersions = (v: SyncedVersions) => {
    localStorage.setItem(SYNCED_VERSIONS_KEY, JSON.stringify(v));
};
```

**Current fetch pattern to preserve but schedule later** (lines 55-97):
```typescript
useEffect(() => {
    if (!navigator.onLine) return;
    if (!isCheckDue()) return;

    let cancelled = false;
    setIsSyncChecking(true);

    (async () => {
        try {
            const res = await fetch(MANIFEST_URL + "?t=" + Date.now());
            // parse manifest and compare versions
        } catch {
            // silently ignore network errors
        } finally {
            if (!cancelled) setIsSyncChecking(false);
        }
    })();

    return () => { cancelled = true; };
}, []);
```

**Planning note:** keep this hook as sync owner. Add quiet/idle scheduling around the fetch, not a new global provider.

### `src/Components/AppInitializer/SharedSyncModal.tsx` (component, request-response/Redux mutation)

**Analog:** `src/Components/AppInitializer/SharedSyncModal.tsx`

**UI imports pattern** (lines 5-17):
```typescript
import React, { useEffect, useMemo, useState } from "react";
import { Badge, Checkbox, Divider, Flex, Spin, Tag, Typography } from "antd";
import { CloudDownloadOutlined, InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Modal } from "@components/Modal";
import { Button } from "@components/Button";
```

**Manifest selection pattern** (lines 60-69):
```typescript
useEffect(() => {
    if (!open) return;
    setSelectedIngredients(new Set(
        manifest.ingredientChanges.filter(c => defaultChecked(c.action)).map(c => c.id)
    ));
    setSelectedDishes(new Set(
        manifest.dishChanges.filter(c => defaultChecked(c.action)).map(c => c.id)
    ));
}, [open, manifest]);
```

**Current full-data fetch pattern to make progressive** (lines 71-89):
```typescript
useEffect(() => {
    if (!open) return;
    setFetchError(null);
    setSharedData(null);
    setIsFetching(true);
    fetch(SHARED_DATA_URL + "?t=" + Date.now())
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
        })
        .then(text => JSON.parse(text) as SharedData)
        .then(data => setSharedData(data))
        .catch(e => setFetchError(e?.message ?? "Lỗi không xác định"))
        .finally(() => setIsFetching(false));
}, [open]);
```

**Version bug location** (lines 161-164):
```typescript
onDone({
    ingredientsVersion: hasIngredientChanges ? manifest.ingredientsVersion : "",
    dishesVersion: hasDishChanges ? manifest.dishesVersion : "",
});
```

**Planning note:** render manifest rows before this fetch completes, disable final sync until `sharedData` is present, and preserve unchanged synced versions.

### `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx` (component, image request/decode)

**Analog:** `src/Modules/Dishes/Screens/DishesManageIngredient/DishImage.widget.tsx`

**Props and fallback pattern** (lines 8-17, 58-80):
```typescript
type DishImageWidgetProps = {
    src?: string;
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    fallbackIconSize?: number;
    showBrokenLabel?: boolean;
    loading?: "eager" | "lazy";
    style?: React.CSSProperties;
}
```

```typescript
{hasImage
    ? <img
        src={src}
        alt=""
        loading={loading}
        decoding="async"
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
    : <Image src={NoodlesIcon} preview={false} width={fallbackIconSize} />}
```

**Intersection pattern** (lines 39-56):
```typescript
const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    setCanLoad(true);
    observer.disconnect();
}, { root: null, rootMargin: "180px 0px", threshold: 0.01 });
```

**Planning note:** keep the stable container and fallback. Add stricter list-row mode around when remote images load and when the remote image replaces fallback.

### `tests/e2e/fixtures/performanceNetwork.ts` (test fixture, network routing)

**Analog:** `tests/e2e/fixtures/performanceNetwork.ts`

**Mode types** (lines 3-12):
```typescript
export type PerformanceNetworkMode = 'online-normal' | 'browser-offline' | 'mocked-slow-network';
export type PerformanceImageMode = 'fast' | 'slow' | 'blocked';
```

**GitHub and image routing pattern** (lines 75-104):
```typescript
await page.route('**/*', async route => {
  const request = route.request();
  const url = request.url();
  const isExternal = isExternalHttpUrl(url);

  if (networkMode === 'browser-offline' && isExternal) {
    await route.abort('internetdisconnected');
    return;
  }

  if (isGitHubRawUrl(url) && !realNetwork) {
    if (githubDelayMs > 0) await delay(githubDelayMs);
    await route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
    return;
  }

  if (imageMode && isExternal && isImageRequest(request)) {
    // block, delay, or fulfill image requests
  }
});
```

**Planning note:** extend this fixture with deterministic shared-manifest/shared-data responses and request counters instead of using live GitHub.

### `tests/e2e/performance-regression.spec.ts` (e2e spec, interaction timing)

**Analog:** `tests/e2e/performance-regression.spec.ts`

**Phase 2 budgets to preserve** (lines 33-41):
```typescript
const phase2Budgets = {
  shellTargetMs: 100,
  rowMenuShellMs: 3_500,
  rowMenuContentMs: 3_500,
  modalShellMs: 2_000,
  modalContentMs: 5_000,
  searchResetShellMs: 2_500,
  searchResetContentMs: 5_000,
};
```

**Interaction measurement pattern** (daily smoke lines 260-355):
```typescript
interactions.push(await measureInteraction({
  id: 'phase2-dish-row-menu-open',
  action: async () => { await page.getByTestId(`dish-row-menu-${dishId}`).click(); },
  shellLocator: () => visibleMenuItem(/Bắt đầu nấu/),
  contentReadyLocator: () => visibleMenuItem(/Xuất dữ liệu/),
  shellBudgetMs: phase2Budgets.rowMenuShellMs,
  contentReadyBudgetMs: phase2Budgets.rowMenuContentMs,
  strictShellTargetMs: phase2Budgets.shellTargetMs,
}));
```

**Evidence pattern** (lines 359-371):
```typescript
await writePerformanceEvidence(testInfo, {
  capturedAt: new Date().toISOString(),
  command: 'npm run test:e2e:performance',
  browserName: testInfo.project.name,
  dataset: 'daily',
  networkMode: 'online-normal',
  imageMode: 'fast',
  budgets: { ...budgets, ...phase2Budgets },
  interactions,
  warnings,
  resources: await summarizeResources(page),
}, 'perf-07-daily-large-list');
```

**Planning note:** Phase 3 comparison should reuse these interaction ids or a `phase3-*` variant and keep the same practical budgets.

### `tests/e2e/fixtures/seedApp.ts` (test fixture, browser storage seed)

**Analog:** `tests/e2e/fixtures/seedApp.ts`

**Current sync seed pattern** (lines 18-46):
```typescript
await page.addInitScript(({ shared, personal }) => {
  localStorage.clear();
  sessionStorage.clear();
  // persist Redux slices
  localStorage.setItem('shared_last_checked', Date.now().toString());
  localStorage.setItem('shared_synced_versions', JSON.stringify({ ingredientsVersion: 'e2e', dishesVersion: 'e2e' }));
}, seed);
```

**Planning note:** add explicit sync freshness options so tests can force due, fresh, and offline paths without mutating production code.

## Shared Patterns

- **Local-first test isolation:** `seedApp` clears browser storage, seeds Redux Persist, unregisters service workers, and clears caches. Phase 3 tests should keep this default for strict gates.
- **Network determinism:** `performanceNetwork.ts` stubs GitHub Raw unless `PERF_REAL_NETWORK=1`. Phase 3 should add manifest/data fixtures inside that controlled path.
- **Timing evidence:** `performanceReport.ts` records `shellVisibleMs`, `contentReadyMs`, warnings, budgets, resources, `networkMode`, and `imageMode`. Phase 3 evidence should extend diagnostics without removing these fields.
- **UI wrappers:** sync modal changes should keep Ant Design plus `@components/Modal`, `@components/Button`, and compact `Flex`/`Typography` usage from the existing modal.
- **No service-worker strict gate:** strict Playwright checks should continue using the existing seed cleanup pattern; production service-worker behavior can be documented as optional diagnostic evidence.
