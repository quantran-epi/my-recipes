import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/appTest';
import { TEST_IDS } from './fixtures/testData';

type TimingSample = {
  id: string;
  durationMs: number;
  budgetMs: number;
};

type ResourceSummary = {
  requestCount: number;
  imageCount: number;
  transferSizeBytes: number;
};

const outputDir = path.join(process.cwd(), 'test-results', 'performance');
const outputPath = path.join(outputDir, 'perf-07-regression.json');

const budgets = {
  dashboardToShoppingListDetailMs: 10_000,
  lazyTabVisibleMs: 5_000,
  readonlyDishModalVisibleMs: 5_000,
  routeRequestCount: 20,
  routeImageCount: 8,
};

const shoppingListDetailPath = `shoppingList/detail?shoppingList=${TEST_IDS.shoppingLists.regression}`;

const measureVisible = async (
  id: string,
  action: () => Promise<void>,
  target: () => Locator,
  budgetMs: number,
): Promise<TimingSample> => {
  const startedAt = Date.now();
  await action();
  await expect(target()).toBeVisible({ timeout: budgetMs });
  const durationMs = Date.now() - startedAt;
  expect(durationMs).toBeLessThanOrEqual(budgetMs);
  return { id, durationMs, budgetMs };
};

const summarizeResources = async (page: Page): Promise<ResourceSummary> => {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const entries = resources.map(entry => ({
      initiatorType: entry.initiatorType,
      name: entry.name,
      sizeBytes: entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0,
    }));

    return {
      requestCount: resources.length,
      imageCount: entries.filter(entry => entry.initiatorType === 'img' || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(entry.name)).length,
      transferSizeBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    };
  });
};

test.describe('PERF-07 performance regressions', () => {
  test('keeps dynamic dish row gaps consistent from the first item onward', async ({ page }) => {
    await page.goto('dishes/list');
    const list = page.getByTestId('dish-virtual-list');
    await expect(list).toBeVisible();

    const cards = list.locator('[data-testid^="dish-list-item-"]');
    await expect(cards.nth(2)).toBeVisible();

    await expect.poll(async () => {
      const boxes = await Promise.all([
        cards.nth(0).boundingBox(),
        cards.nth(1).boundingBox(),
        cards.nth(2).boundingBox(),
      ]);
      const [first, second, third] = boxes;
      if (!first || !second || !third) return 999;
      const firstGap = Math.round(second.y - (first.y + first.height));
      const nextGap = Math.round(third.y - (second.y + second.height));
      return Math.abs(firstGap - nextGap);
    }).toBeLessThanOrEqual(6);
  });

  test('keeps virtualized ingredient rows spaced and treats drag as scroll intent', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('ingredient/list');
    const list = page.getByTestId('ingredient-virtual-list');
    await expect(list).toBeVisible();

    const rowFrames = list.locator('[data-virtual-list-row-frame="true"]');
    await expect(rowFrames.first()).toBeVisible();
    await expect(rowFrames.nth(1)).toBeVisible();

    const firstBox = await rowFrames.nth(0).boundingBox();
    const secondBox = await rowFrames.nth(1).boundingBox();
    if (!firstBox || !secondBox) throw new Error('Virtualized rows were not measurable.');
    expect(firstBox.height).toBeGreaterThan(130);
    expect(secondBox.y - firstBox.y).toBeGreaterThan(120);

    const wrappedIngredient = page.getByTestId(`ingredient-list-item-${TEST_IDS.ingredients.chicken}`);
    await expect(wrappedIngredient).toBeVisible();
    const wrappedRowFrame = wrappedIngredient.locator('xpath=ancestor::*[@data-virtual-list-row-frame="true"][1]');
    await expect.poll(async () => wrappedRowFrame.evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBeTruthy();

    const listBox = await list.boundingBox();
    if (!listBox) throw new Error('Ingredient virtual list was not measurable.');
    const lastIngredient = page.getByTestId(`ingredient-list-item-${TEST_IDS.ingredients.pagedLast}`);
    for (let attempt = 0; attempt < 8 && (await lastIngredient.count()) === 0; attempt += 1) {
      await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + listBox.height / 2);
      await page.mouse.wheel(0, 1800);
      await page.waitForTimeout(60);
    }
    await expect(lastIngredient).toBeVisible();

    const inventoryButton = lastIngredient.locator('button').filter({ hasText: /Tồn kho khả dụng/ }).first();
    await expect(inventoryButton).toBeVisible();
    await inventoryButton.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const pointerBase: PointerEventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
      };

      button.dispatchEvent(new PointerEvent('pointerdown', pointerBase));
      button.dispatchEvent(new PointerEvent('pointermove', { ...pointerBase, clientY: y - 48 }));
      button.dispatchEvent(new PointerEvent('pointerup', { ...pointerBase, clientY: y - 48 }));
      button.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y - 48,
      }));
    });
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await inventoryButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('keeps inactive heavy tabs and closed modal bodies unmounted', async ({ page }) => {
    await page.goto(shoppingListDetailPath);
    await expect(page.getByRole('heading', { name: 'Regression shopping list' })).toBeVisible();
    await expect(page.getByTestId('shopping-list-ingredients-tab')).toBeVisible();

    await expect(page.getByTestId('shopping-list-cost-tab')).toHaveCount(0);
    await expect(page.getByTestId('shopping-list-dishes-tab')).toHaveCount(0);
    await expect(page.getByTestId('shopping-list-meals-tab')).toHaveCount(0);
    await expect(page.getByTestId('dish-readonly-detail-modal')).toHaveCount(0);

    await page.getByRole('tab', { name: /Chi phí/ }).click();
    await expect(page.getByTestId('shopping-list-cost-tab')).toBeVisible();
    await expect(page.getByTestId('shopping-cost-required-buy')).toBeVisible();
    await expect(page.getByTestId('shopping-list-ingredients-tab')).toHaveCount(0);
    await expect(page.getByTestId('shopping-list-dishes-tab')).toHaveCount(0);

    await page.getByRole('tab', { name: /Món ăn/ }).click();
    await expect(page.getByTestId('shopping-list-dishes-tab')).toBeVisible();
    await expect(page.getByTestId('shopping-list-cost-tab')).toHaveCount(0);
    await expect(page.getByTestId('dish-readonly-detail-modal')).toHaveCount(0);
  });

  test('keeps hot route, tab, and modal interactions inside smoke budgets', async ({ page }, testInfo) => {
    const imageRequests: string[] = [];
    page.on('request', request => {
      if (request.resourceType() === 'image') imageRequests.push(request.url());
    });

    await page.goto('./');
    await expect(page.getByTestId('dashboard')).toBeVisible();
    const shoppingListRow = page.getByTestId(`dashboard-shopping-list-${TEST_IDS.shoppingLists.regression}`).first();
    await expect(shoppingListRow).toBeVisible();
    imageRequests.length = 0;
    await page.evaluate(() => performance.clearResourceTimings());

    const timings: TimingSample[] = [];
    timings.push(await measureVisible(
      'dashboard-to-shopping-list-detail',
      async () => { await shoppingListRow.click(); },
      () => page.getByRole('heading', { name: 'Regression shopping list' }),
      budgets.dashboardToShoppingListDetailMs,
    ));
    await expect(page).toHaveURL(new RegExp(`/my-recipes/shoppingList/detail\\?shoppingList=${TEST_IDS.shoppingLists.regression}$`));

    const routeResources = await summarizeResources(page);
    expect(routeResources.requestCount).toBeLessThanOrEqual(budgets.routeRequestCount);
    expect(routeResources.imageCount).toBeLessThanOrEqual(budgets.routeImageCount);

    timings.push(await measureVisible(
      'shopping-list-dishes-tab-visible',
      async () => { await page.getByRole('tab', { name: /Món ăn/ }).click(); },
      () => page.getByTestId('shopping-list-dishes-tab'),
      budgets.lazyTabVisibleMs,
    ));

    const externalDishImagesBeforeModal = imageRequests.filter(url => /images\.unsplash\.com/i.test(url));
    expect(externalDishImagesBeforeModal).toHaveLength(0);

    const dishRow = page.getByTestId(`shopping-list-dish-${TEST_IDS.dishes.comGa}`);
    await expect(dishRow).toContainText('Com ga regression');
    timings.push(await measureVisible(
      'readonly-dish-modal-visible',
      async () => { await dishRow.getByRole('button').first().click(); },
      () => page.getByTestId('dish-readonly-detail-modal'),
      budgets.readonlyDishModalVisibleMs,
    ));

    const evidence = {
      capturedAt: new Date().toISOString(),
      command: 'npx playwright test tests/e2e/performance-regression.spec.ts',
      browserName: testInfo.project.name,
      budgets,
      timings,
      routeResources,
      externalDishImagesBeforeModal,
    };

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
    await testInfo.attach('perf-07-regression', { path: outputPath, contentType: 'application/json' });
  });
});
