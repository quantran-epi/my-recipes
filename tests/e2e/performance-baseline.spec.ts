import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { seedApp } from './fixtures/seedApp';
import type { PerformanceDatasetName } from './fixtures/performanceSeed';
import type { PerformanceImageMode, PerformanceNetworkMode } from './fixtures/performanceNetwork';
import {
  PERFORMANCE_OUTPUT_DIR,
  collectInteractionWarnings,
  measureInteraction,
  summarizeResources,
  writePerformanceEvidence,
} from './fixtures/performanceReport';

const DATASETS: PerformanceDatasetName[] = ['daily', 'stress'];
const NETWORK_MODES: PerformanceNetworkMode[] = ['online-normal', 'browser-offline', 'mocked-slow-network'];

const budgets = {
  shellTargetMs: 100,
  drawerShellMs: 5_000,
  rowMenuShellMs: 12_000,
  modalShellMs: 8_000,
  modalContentMs: 12_000,
  detailRouteShellMs: 10_000,
  detailRouteContentMs: 15_000,
  searchResetShellMs: 30_000,
  searchResetContentMs: 30_000,
};

const measureBaselineInteraction = (options: Parameters<typeof measureInteraction>[0]) => {
  return measureInteraction({ ...options, enforceBudgets: false });
};

const parseDatasets = (): PerformanceDatasetName[] => {
  const raw = process.env.PERF_DATASET;
  if (!raw) return DATASETS;
  return raw.split(',').map(item => item.trim()).filter(Boolean) as PerformanceDatasetName[];
};

const parseNetworkModes = (): PerformanceNetworkMode[] => {
  const raw = process.env.PERF_NETWORK_MODE;
  if (!raw) return NETWORK_MODES;
  return raw.split(',').map(item => item.trim()).filter(Boolean) as PerformanceNetworkMode[];
};

const imageModeFor = (networkMode: PerformanceNetworkMode): PerformanceImageMode => {
  if (networkMode === 'online-normal') return 'fast';
  return 'blocked';
};

const perfDishId = (dataset: PerformanceDatasetName, index: number) => `perf-${dataset}-dish-${String(index).padStart(4, '0')}`;
const perfDishName = (dataset: PerformanceDatasetName, index: number) => `Perf ${dataset} dish ${String(index).padStart(4, '0')}`;

const baselineCommand = () => process.env.PERF_DIAGNOSTIC === '1'
  ? 'npm run test:e2e:performance:diagnostic'
  : 'npm run test:e2e:performance:baseline';

const startCpuProfile = async (page: Page) => {
  if (process.env.PERF_DIAGNOSTIC !== '1') return null;

  try {
    const session = await page.context().newCDPSession(page);
    await session.send('Profiler.enable');
    await session.send('Profiler.start');
    return {
      stop: async () => {
        const { profile } = await session.send('Profiler.stop');
        await session.detach();
        return profile;
      },
    };
  } catch (error) {
    return {
      stop: async () => ({ unavailable: error instanceof Error ? error.message : String(error) }),
    };
  }
};

const summarizeCpuProfile = (profile: any) => {
  if (!profile || profile.unavailable || !Array.isArray(profile.nodes) || !Array.isArray(profile.samples)) {
    return profile?.unavailable ? { unavailable: profile.unavailable } : { unavailable: 'Profile data unavailable' };
  }

  const nodesById = new Map<number, any>(profile.nodes.map((node: any) => [node.id, node]));
  const sampleCounts = new Map<number, number>();
  profile.samples.forEach((sampleId: number) => sampleCounts.set(sampleId, (sampleCounts.get(sampleId) ?? 0) + 1));

  return Array.from(sampleCounts.entries())
    .map(([nodeId, samples]) => {
      const node = nodesById.get(nodeId);
      const frame = node?.callFrame ?? {};
      return {
        functionName: frame.functionName || '(anonymous)',
        url: frame.url || '',
        lineNumber: typeof frame.lineNumber === 'number' ? frame.lineNumber + 1 : null,
        samples,
      };
    })
    .filter(item => item.functionName !== '(idle)' && item.functionName !== '(program)')
    .sort((a, b) => b.samples - a.samples)
    .slice(0, 10);
};

const writeCpuProfile = (id: string, profile: any) => {
  const profilePath = path.join(PERFORMANCE_OUTPUT_DIR, `${id}.cpuprofile`);
  fs.mkdirSync(PERFORMANCE_OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(profilePath, `${JSON.stringify(profile)}\n`);
  return {
    id,
    path: path.relative(process.cwd(), profilePath),
    topNodes: summarizeCpuProfile(profile),
  };
};

const measureRequiredInteractions = async (
  page: Page,
  dataset: PerformanceDatasetName,
) => {
  const dishId = perfDishId(dataset, 1);
  const dishName = perfDishName(dataset, 1);
  const dishRow = () => page.getByTestId(`dish-list-item-${dishId}`);
  const dishDialog = () => page.getByRole('dialog').filter({ hasText: dishName });
  const visibleMenuItem = (name: RegExp) => page.locator('[role="menuitem"]:visible').filter({ hasText: name }).first();
  const interactions = [];

  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 15_000 });
  interactions.push(await measureBaselineInteraction({
    id: 'sidebar-drawer-open',
    action: async () => { await page.getByTestId('sidebar-drawer-button').click(); },
    shellLocator: () => page.getByText('My Recipes').first(),
    contentReadyLocator: () => page.getByText('Du lieu dung chung').or(page.getByText('Dữ liệu dùng chung')),
    shellBudgetMs: budgets.drawerShellMs,
    contentReadyBudgetMs: budgets.drawerShellMs,
    strictShellTargetMs: budgets.shellTargetMs,
  }));
  await page.keyboard.press('Escape');

  await page.goto('dishes/list', { waitUntil: 'domcontentloaded' });
  await expect(dishRow()).toBeVisible({ timeout: 15_000 });

  interactions.push(await measureBaselineInteraction({
    id: 'dish-row-menu-open',
    action: async () => { await page.getByTestId(`dish-row-menu-${dishId}`).click(); },
    shellLocator: () => visibleMenuItem(/Bat dau nau|Bắt đầu nấu/),
    contentReadyLocator: () => visibleMenuItem(/Xuat du lieu|Xuất dữ liệu/),
    shellBudgetMs: budgets.rowMenuShellMs,
    contentReadyBudgetMs: budgets.rowMenuShellMs,
    strictShellTargetMs: budgets.shellTargetMs,
  }));
  await page.keyboard.press('Escape');

  interactions.push(await measureBaselineInteraction({
    id: 'dish-detail-modal-open',
    action: async () => { await dishRow().getByRole('button', { name: /Chi tiet|Chi tiết/ }).click(); },
    shellLocator: dishDialog,
    contentReadyLocator: () => dishDialog().getByText(/Danh sach nguyen lieu|Danh sách nguyên liệu/).first(),
    shellBudgetMs: budgets.modalShellMs,
    contentReadyBudgetMs: budgets.modalContentMs,
    strictShellTargetMs: budgets.shellTargetMs,
  }));

  interactions.push(await measureBaselineInteraction({
    id: 'dish-detail-route-navigation',
    action: async () => { await dishDialog().getByRole('button', { name: /Mo trang chi tiet|Mở trang chi tiết/ }).click(); },
    shellLocator: () => page.getByText(dishName).first(),
    contentReadyLocator: () => page.getByText(/Ghi chu:|Ghi chú:/).first(),
    shellBudgetMs: budgets.detailRouteShellMs,
    contentReadyBudgetMs: budgets.detailRouteContentMs,
    strictShellTargetMs: budgets.shellTargetMs,
  }));

  await page.goto('dishes/list', { waitUntil: 'domcontentloaded' });
  const searchInput = page.getByTestId('dish-search-input');
  await searchInput.fill('0001');
  await expect(dishRow()).toBeVisible({ timeout: 15_000 });
  interactions.push(await measureBaselineInteraction({
    id: 'dish-search-reset',
    action: async () => {
      await searchInput.fill('');
      await page.waitForTimeout(450);
    },
    shellLocator: () => searchInput,
    contentReadyLocator: () => page.getByTestId('dish-virtual-list'),
    shellBudgetMs: budgets.searchResetShellMs,
    contentReadyBudgetMs: budgets.searchResetContentMs,
    strictShellTargetMs: budgets.shellTargetMs,
  }));

  return interactions;
};

test.describe('PERF-00 baseline', () => {
  test.skip(process.env.PERF_BASELINE !== '1', 'Run explicitly with PERF_BASELINE=1 when collecting baseline evidence.');

  for (const dataset of parseDatasets()) {
    for (const networkMode of parseNetworkModes()) {
      const imageMode = imageModeFor(networkMode);

      test(`captures ${dataset} ${networkMode} interaction baseline`, async ({ page }, testInfo) => {
        test.setTimeout(90_000);
        await seedApp(page, { dataset, networkMode, imageMode });
        const profile = await startCpuProfile(page);
        const interactions = await measureRequiredInteractions(page, dataset);
        const resources = await summarizeResources(page);
        const diagnostics = profile
          ? { cpuProfile: writeCpuProfile(`perf-00-${dataset}-${networkMode}`, await profile.stop()) }
          : undefined;
        const warnings = collectInteractionWarnings(interactions);

        await writePerformanceEvidence(testInfo, {
          capturedAt: new Date().toISOString(),
          command: baselineCommand(),
          browserName: testInfo.project.name,
          dataset,
          networkMode,
          imageMode,
          budgets,
          interactions,
          warnings,
          resources,
          diagnostics,
          notes: [
            'Phase 1 records strict 100 ms shell-visible misses as warnings, not failures.',
            'Normal runs stub GitHub Raw unless PERF_REAL_NETWORK=1 is set.',
            'CPU profile output is written only when PERF_DIAGNOSTIC=1.',
          ],
        }, `perf-00-baseline-${dataset}-${networkMode}`);
      });
    }
  }
});
