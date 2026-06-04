import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/appTest';
import { TEST_IDS } from './fixtures/testData';

type RouteCase = {
  id: string;
  path: string;
  waitFor: (page: Page) => Locator;
};

type ResourceSummary = {
  requestCount: number;
  imageCount: number;
  transferSizeBytes: number;
  encodedBodySizeBytes: number;
  largestResource: { name: string; initiatorType: string; sizeBytes: number; durationMs: number } | null;
};

const outputDir = path.join(process.cwd(), 'test-results', 'performance');
const outputPath = path.join(outputDir, 'perf-00-baseline.json');

const startCpuProfile = async (page: Page) => {
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

  return [...sampleCounts.entries()]
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
  const profilePath = path.join(outputDir, `perf-00-${id}.cpuprofile`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(profilePath, `${JSON.stringify(profile)}\n`);
  return {
    id,
    path: path.relative(process.cwd(), profilePath),
    topNodes: summarizeCpuProfile(profile),
  };
};

const routeCases: RouteCase[] = [
  { id: 'dashboard', path: './', waitFor: page => page.getByTestId('dashboard') },
  { id: 'ingredient-list', path: 'ingredient/list', waitFor: page => page.getByText('Ga regression thit dui') },
  { id: 'dish-list', path: 'dishes/list', waitFor: page => page.getByText('Com ga regression') },
  { id: 'shopping-list', path: 'shoppingList/list', waitFor: page => page.getByText('Regression shopping list') },
  { id: 'shopping-list-detail', path: `shoppingList/detail?shoppingList=${TEST_IDS.shoppingLists.regression}`, waitFor: page => page.getByRole('heading', { name: 'Regression shopping list' }) },
  { id: 'scheduled-meal-list', path: 'scheduledMeal/list', waitFor: page => page.getByText('Regression meal today') },
  { id: 'expense-planner', path: 'expense-planner', waitFor: page => page.getByTestId('expense-planner-screen') },
];

const summarizeResources = async (page: Page): Promise<ResourceSummary> => {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const entries = resources.map(entry => {
      const sizeBytes = entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0;
      return {
        name: entry.name,
        initiatorType: entry.initiatorType,
        sizeBytes,
        encodedBodySize: entry.encodedBodySize || 0,
        durationMs: Math.round(entry.duration),
      };
    });
    const largestResource = entries.reduce<typeof entries[number] | null>((largest, entry) => {
      if (!largest || entry.sizeBytes > largest.sizeBytes) return entry;
      return largest;
    }, null);

    return {
      requestCount: resources.length,
      imageCount: entries.filter(entry => entry.initiatorType === 'img' || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(entry.name)).length,
      transferSizeBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
      encodedBodySizeBytes: entries.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      largestResource: largestResource
        ? {
          name: largestResource.name,
          initiatorType: largestResource.initiatorType,
          sizeBytes: largestResource.sizeBytes,
          durationMs: largestResource.durationMs,
        }
        : null,
    };
  });
};

const navigationSummary = async (page: Page) => {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!navigation) return null;
    return {
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadEventMs: Math.round(navigation.loadEventEnd),
      durationMs: Math.round(navigation.duration),
      responseEndMs: Math.round(navigation.responseEnd),
    };
  });
};

const cdpMetrics = async (page: Page) => {
  try {
    const session = await page.context().newCDPSession(page);
    await session.send('Performance.enable');
    const raw = await session.send('Performance.getMetrics');
    const metric = (name: string) => raw.metrics.find(item => item.name === name)?.value ?? null;
    await session.detach();
    return {
      taskDurationSeconds: metric('TaskDuration'),
      scriptDurationSeconds: metric('ScriptDuration'),
      layoutDurationSeconds: metric('LayoutDuration'),
      recalcStyleDurationSeconds: metric('RecalcStyleDuration'),
      jsHeapUsedBytes: metric('JSHeapUsedSize'),
      jsHeapTotalBytes: metric('JSHeapTotalSize'),
    };
  } catch (error) {
    return { unavailable: error instanceof Error ? error.message : String(error) };
  }
};

test.describe('PERF-00 baseline', () => {
  test.skip(process.env.PERF_BASELINE !== '1', 'Run explicitly with PERF_BASELINE=1 when collecting baseline evidence.');

  test('captures route, request, and modal baseline evidence', async ({ page }, testInfo) => {
    const routes = [];
    const cpuProfiles = [];

    for (const routeCase of routeCases) {
      const profile = routeCase.id === 'shopping-list-detail' ? await startCpuProfile(page) : null;
      const startedAt = Date.now();
      await page.goto(routeCase.path, { waitUntil: 'domcontentloaded' });
      await expect(routeCase.waitFor(page).first()).toBeVisible({ timeout: 15_000 });
      const visibleMs = Date.now() - startedAt;
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
      if (profile) cpuProfiles.push(writeCpuProfile(routeCase.id, await profile.stop()));

      routes.push({
        id: routeCase.id,
        path: routeCase.path,
        visibleMs,
        navigation: await navigationSummary(page),
        resources: await summarizeResources(page),
        cdp: await cdpMetrics(page),
      });
    }

    await page.goto(`shoppingList/detail?shoppingList=${TEST_IDS.shoppingLists.regression}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Regression shopping list' })).toBeVisible();
    await page.getByRole('tab').nth(2).click();
    const dishRow = page.getByTestId(`shopping-list-dish-${TEST_IDS.dishes.comGa}`);
    await expect(dishRow).toContainText('Com ga regression');
    const modalProfile = await startCpuProfile(page);
    const modalStartedAt = Date.now();
    await dishRow.getByRole('button').first().click();
    await expect(page.getByTestId('dish-readonly-detail-modal')).toBeVisible({ timeout: 15_000 });
    const modalVisibleMs = Date.now() - modalStartedAt;
    cpuProfiles.push(writeCpuProfile('shopping-list-readonly-dish-modal', await modalProfile.stop()));

    const evidence = {
      capturedAt: new Date().toISOString(),
      command: 'PERF_BASELINE=1 npx playwright test tests/e2e/performance-baseline.spec.ts',
      browserName: testInfo.project.name,
      baseURL: (testInfo.project.use as { baseURL?: string }).baseURL ?? null,
      environment: {
        node: process.version,
        platform: process.platform,
        viewport: testInfo.project.use.viewport ?? null,
      },
      routes,
      cpuProfiles,
      modal: {
        id: 'shopping-list-readonly-dish-modal',
        path: `shoppingList/detail?shoppingList=${TEST_IDS.shoppingLists.regression}`,
        visibleMs: modalVisibleMs,
        cdp: await cdpMetrics(page),
      },
      notes: [
        'Times are local Playwright measurements from click/navigation start until the target UI is visible.',
        'Resource counts come from browser PerformanceResourceTiming entries after each route is visible.',
        'This baseline is an explicit audit run and is skipped unless PERF_BASELINE=1 is set.',
      ],
    };

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
    await testInfo.attach('perf-00-baseline', { path: outputPath, contentType: 'application/json' });
  });
});
