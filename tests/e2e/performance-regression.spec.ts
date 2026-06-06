import { expect, test as base, type Locator, type Page } from '@playwright/test';
import { seedApp } from './fixtures/seedApp';
import { createPerformanceSeed, type PerformanceDatasetName } from './fixtures/performanceSeed';
import type { PerformanceImageMode, PerformanceNetworkMode } from './fixtures/performanceNetwork';
import {
  collectInteractionWarnings,
  measureInteraction,
  summarizeResources,
  writePerformanceEvidence,
} from './fixtures/performanceReport';
import { TEST_IDS } from './fixtures/testData';

const test = base.extend({
  page: async ({ page }, use) => {
    await seedApp(page);
    await use(page);
  },
});

const dailyPerformanceTest = base.extend({
  page: async ({ page }, use) => {
    await seedApp(page, { dataset: 'daily', networkMode: 'online-normal', imageMode: 'fast' });
    await use(page);
  },
});

const budgets = {
  dashboardToShoppingListDetailMs: 10_000,
  lazyTabVisibleMs: 5_000,
  readonlyDishModalVisibleMs: 5_000,
  routeRequestCount: 20,
  routeImageCount: 16,
};

const phase2Budgets = {
  shellTargetMs: 100,
  rowMenuShellMs: 3_500,
  rowMenuContentMs: 3_500,
  modalShellMs: 2_000,
  modalContentMs: 5_000,
  searchResetShellMs: 2_500,
  searchResetContentMs: 5_000,
};

const phase4Budgets = {
  shellTargetMs: 100,
  drawerShellMs: 1000,
  routeFeedbackMs: 1000,
  routeContentMs: 5000,
};

const expectPageStatusDoesNotBlockActions = async (page: Page, testId: string) => {
  const pointerEvents = await page.getByTestId(testId).evaluateAll(elements =>
    elements.map(element => window.getComputedStyle(element).pointerEvents),
  );
  if (pointerEvents.length > 0) expect(pointerEvents.every(value => value === 'none')).toBeTruthy();
};

const shoppingListDetailPath = `shoppingList/detail?shoppingList=${TEST_IDS.shoppingLists.regression}`;
const isPhase3ComparisonRun = process.env.PERF_PHASE3_COMPARE === '1';
const PHASE3_NETWORK_MODES: PerformanceNetworkMode[] = ['online-normal', 'browser-offline', 'mocked-slow-network'];

const parsePhase3NetworkModes = (): PerformanceNetworkMode[] => {
  const raw = process.env.PERF_NETWORK_MODE;
  if (!raw) return PHASE3_NETWORK_MODES;
  return raw.split(',').map(item => item.trim()).filter(Boolean) as PerformanceNetworkMode[];
};

const phase3ImageModeFor = (networkMode: PerformanceNetworkMode): PerformanceImageMode => {
  if (process.env.PERF_IMAGE_MODE) return process.env.PERF_IMAGE_MODE as PerformanceImageMode;
  if (networkMode === 'browser-offline') return 'blocked';
  if (networkMode === 'mocked-slow-network') return 'slow';
  return 'fast';
};

test.describe('PERF-07 performance regressions', () => {
  test.skip(isPhase3ComparisonRun, 'Phase 3 comparison command runs phase3-comparison tests only.');

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

    const interactions = [];
    interactions.push(await measureInteraction({
      id: 'dashboard-shopping-list-detail-route-navigation',
      action: async () => { await shoppingListRow.click(); },
      shellLocator: () => page.getByRole('heading', { name: 'Regression shopping list' }),
      contentReadyLocator: () => page.getByTestId('shopping-list-ingredients-tab'),
      shellBudgetMs: budgets.dashboardToShoppingListDetailMs,
      contentReadyBudgetMs: budgets.dashboardToShoppingListDetailMs,
    }));
    await expect(page).toHaveURL(new RegExp(`/my-recipes/shoppingList/detail\\?shoppingList=${TEST_IDS.shoppingLists.regression}$`));

    const routeResources = await summarizeResources(page);
    expect(routeResources.requestCount).toBeLessThanOrEqual(budgets.routeRequestCount);
    expect(routeResources.imageCount).toBeLessThanOrEqual(budgets.routeImageCount);

    interactions.push(await measureInteraction({
      id: 'shopping-list-dishes-tab-visible',
      action: async () => { await page.getByRole('tab', { name: /Món ăn/ }).click(); },
      shellLocator: () => page.getByTestId('shopping-list-dishes-tab'),
      contentReadyLocator: () => page.getByTestId('shopping-list-dishes-tab'),
      shellBudgetMs: budgets.lazyTabVisibleMs,
      contentReadyBudgetMs: budgets.lazyTabVisibleMs,
    }));

    const externalDishImagesBeforeModal = imageRequests.filter(url => /images\.unsplash\.com/i.test(url));
    expect(externalDishImagesBeforeModal).toHaveLength(0);

    const dishRow = page.getByTestId(`shopping-list-dish-${TEST_IDS.dishes.comGa}`);
    await expect(dishRow).toContainText('Com ga regression');
    interactions.push(await measureInteraction({
      id: 'readonly-dish-modal-visible',
      action: async () => { await dishRow.getByRole('button').first().click(); },
      shellLocator: () => page.getByTestId('dish-readonly-detail-modal'),
      contentReadyLocator: () => page.getByTestId('dish-readonly-detail-modal'),
      shellBudgetMs: budgets.readonlyDishModalVisibleMs,
      contentReadyBudgetMs: budgets.readonlyDishModalVisibleMs,
    }));

    const warnings = collectInteractionWarnings(interactions);
    await writePerformanceEvidence(testInfo, {
      capturedAt: new Date().toISOString(),
      command: 'npm run test:e2e:performance',
      browserName: testInfo.project.name,
      dataset: 'regression',
      networkMode: 'online-normal',
      imageMode: 'default',
      budgets,
      interactions,
      warnings,
      resources: routeResources,
      diagnostics: { externalDishImagesBeforeModal },
      notes: ['Strict 100 ms shell target misses are warnings in Phase 1 evidence.'],
    }, 'perf-07-regression');
  });
});

dailyPerformanceTest.describe('PERF-07 daily large-list smoke', () => {
  dailyPerformanceTest.skip(isPhase3ComparisonRun, 'Phase 3 comparison command runs phase3-comparison tests only.');

  dailyPerformanceTest('captures required large-list interaction timings', async ({ page }, testInfo) => {
    const dishId = 'perf-daily-dish-0001';
    const secondDishId = 'perf-daily-dish-0002';
    const dishName = 'Perf daily dish 0001';
    const dishRow = () => page.getByTestId(`dish-list-item-${dishId}`);
    const dishDialog = () => page.getByRole('dialog').filter({ hasText: dishName });
    const ingredientId = 'perf-daily-ing-0004';
    const secondIngredientId = 'perf-daily-ing-0005';
    const ingredientName = 'Perf daily ingredient 0004';
    const ingredientRow = () => page.getByTestId(`ingredient-list-item-${ingredientId}`);
    const ingredientDialog = () => page.getByRole('dialog').filter({ hasText: `Tồn kho - ${ingredientName}` });
    const shoppingListId = 'perf-daily-sl-0001';
    const secondShoppingListId = 'perf-daily-sl-0002';
    const shoppingListName = 'Perf daily shopping list 0001';
    const shoppingListRow = () => page.getByTestId(`shopping-list-item-${shoppingListId}`);
    const shoppingListDialog = () => page.getByRole('dialog').filter({ hasText: shoppingListName });
    const visibleMenuItem = (name: RegExp) => page.locator('[role="menuitem"]:visible').filter({ hasText: name }).first();

    await page.goto('dishes/list', { waitUntil: 'domcontentloaded' });
    await expect(dishRow()).toBeVisible({ timeout: 15_000 });
    await expectPageStatusDoesNotBlockActions(page, 'dish-list-page-status');

    const interactions = [];
    interactions.push(await measureInteraction({
      id: 'phase2-dish-row-menu-open',
      action: async () => { await page.getByTestId(`dish-row-menu-${dishId}`).click(); },
      shellLocator: () => visibleMenuItem(/Bắt đầu nấu/),
      contentReadyLocator: () => visibleMenuItem(/Xuất dữ liệu/),
      shellBudgetMs: phase2Budgets.rowMenuShellMs,
      contentReadyBudgetMs: phase2Budgets.rowMenuContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));
    await page.keyboard.press('Escape');

    interactions.push(await measureInteraction({
      id: 'phase2-dish-detail-modal-open',
      action: async () => { await dishRow().getByRole('button', { name: /Chi tiết/ }).click(); },
      shellLocator: dishDialog,
      contentReadyLocator: () => dishDialog().getByText(/Danh sách nguyên liệu/).first(),
      shellBudgetMs: phase2Budgets.modalShellMs,
      contentReadyBudgetMs: phase2Budgets.modalContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));

    await dishDialog().getByRole('button', { name: /Đóng/ }).click();
    const searchInput = page.getByTestId('dish-search-input');
    await searchInput.fill('0001');
    await expect(dishRow()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(`dish-list-item-${secondDishId}`)).toHaveCount(0, { timeout: 15_000 });
    interactions.push(await measureInteraction({
      id: 'phase2-dish-search-reset',
      action: async () => { await searchInput.fill(''); },
      shellLocator: () => searchInput,
      contentReadyLocator: () => page.getByTestId(`dish-list-item-${secondDishId}`),
      shellBudgetMs: phase2Budgets.searchResetShellMs,
      contentReadyBudgetMs: phase2Budgets.searchResetContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));

    await page.goto('ingredient/list', { waitUntil: 'domcontentloaded' });
    await expect(ingredientRow()).toBeVisible({ timeout: 15_000 });
    await expectPageStatusDoesNotBlockActions(page, 'ingredient-list-page-status');

    const ingredientSearchInput = page.getByTestId('ingredient-search-input');
    await ingredientSearchInput.fill('0004');
    await expect(ingredientRow()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(`ingredient-list-item-${secondIngredientId}`)).toHaveCount(0, { timeout: 15_000 });
    interactions.push(await measureInteraction({
      id: 'phase2-ingredient-search-reset',
      action: async () => { await ingredientSearchInput.fill(''); },
      shellLocator: () => ingredientSearchInput,
      contentReadyLocator: () => page.getByTestId(`ingredient-list-item-${secondIngredientId}`),
      shellBudgetMs: phase2Budgets.searchResetShellMs,
      contentReadyBudgetMs: phase2Budgets.searchResetContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));

    interactions.push(await measureInteraction({
      id: 'phase2-ingredient-inventory-modal-open',
      action: async () => { await page.getByTestId(`ingredient-inventory-button-${ingredientId}`).click(); },
      shellLocator: ingredientDialog,
      contentReadyLocator: () => ingredientDialog().getByText(/Tồn kho:/).first(),
      shellBudgetMs: phase2Budgets.modalShellMs,
      contentReadyBudgetMs: phase2Budgets.modalContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));

    await page.goto('shoppingList/list', { waitUntil: 'domcontentloaded' });
    await expect(shoppingListRow()).toBeVisible({ timeout: 15_000 });
    await expectPageStatusDoesNotBlockActions(page, 'shopping-list-list-page-status');

    const shoppingSearchInput = page.getByTestId('shopping-list-search-input');
    await shoppingSearchInput.fill('0001');
    await expect(shoppingListRow()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(`shopping-list-item-${secondShoppingListId}`)).toHaveCount(0, { timeout: 15_000 });
    interactions.push(await measureInteraction({
      id: 'phase2-shopping-list-search-reset',
      action: async () => { await shoppingSearchInput.fill(''); },
      shellLocator: () => shoppingSearchInput,
      contentReadyLocator: () => page.getByTestId(`shopping-list-item-${secondShoppingListId}`),
      shellBudgetMs: phase2Budgets.searchResetShellMs,
      contentReadyBudgetMs: phase2Budgets.searchResetContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));

    interactions.push(await measureInteraction({
      id: 'phase2-shopping-list-row-menu-open',
      action: async () => { await page.getByTestId(`shopping-list-row-menu-${shoppingListId}`).click(); },
      shellLocator: () => visibleMenuItem(/Xuất danh sách/),
      contentReadyLocator: () => visibleMenuItem(/Xóa/),
      shellBudgetMs: phase2Budgets.rowMenuShellMs,
      contentReadyBudgetMs: phase2Budgets.rowMenuContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));
    await page.keyboard.press('Escape');

    interactions.push(await measureInteraction({
      id: 'phase2-shopping-list-checklist-modal-open',
      action: async () => { await shoppingListRow().getByRole('button', { name: /Mở|Tạo/ }).first().click(); },
      shellLocator: shoppingListDialog,
      contentReadyLocator: () => shoppingListDialog().getByTestId('shopping-list-ingredient-modal'),
      shellBudgetMs: phase2Budgets.modalShellMs,
      contentReadyBudgetMs: phase2Budgets.modalContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));

    const warnings = collectInteractionWarnings(interactions);
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
      notes: ['Daily large-list regression smoke enforces practical Phase 2 budgets; strict 100 ms shell target misses warn only.'],
    }, 'perf-07-daily-large-list');
  });
});

base.describe('PERF-08 phase3 startup sync isolation', () => {
  base.skip(isPhase3ComparisonRun, 'Phase 3 comparison command runs phase3-comparison tests only.');

  base('keeps due-sync startup list interactions inside Phase 2 budgets', async ({ page }, testInfo) => {
    const appliedNetwork = await seedApp(page, {
      dataset: 'daily',
      networkMode: 'online-normal',
      imageMode: 'fast',
      syncCheckState: 'due',
      githubDelayMs: 3000,
      sharedManifest: {
        ingredientsVersion: 'e2e',
        dishesVersion: 'e2e',
        ingredientChanges: [],
        dishChanges: [],
      },
    });

    const dishId = 'perf-daily-dish-0001';
    const secondDishId = 'perf-daily-dish-0002';
    const ingredientId = 'perf-daily-ing-0004';
    const ingredientName = 'Perf daily ingredient 0004';
    const shoppingListId = 'perf-daily-sl-0001';
    const dishRow = () => page.getByTestId(`dish-list-item-${dishId}`);
    const ingredientDialog = () => page.getByRole('dialog').filter({ hasText: `Tồn kho - ${ingredientName}` });
    const visibleMenuItem = (name: RegExp) => page.locator('[role="menuitem"]:visible').filter({ hasText: name }).first();

    await page.goto('dishes/list', { waitUntil: 'domcontentloaded' });
    await expect(dishRow()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1700);
    await page.evaluate(() => performance.clearResourceTimings());

    const interactions = [];
    const searchInput = page.getByTestId('dish-search-input');
    await searchInput.fill('0001');
    await expect(dishRow()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(`dish-list-item-${secondDishId}`)).toHaveCount(0, { timeout: 15_000 });
    interactions.push(await measureInteraction({
      id: 'phase3-startup-dish-search-reset',
      action: async () => { await searchInput.fill(''); },
      shellLocator: () => searchInput,
      contentReadyLocator: () => page.getByTestId(`dish-list-item-${secondDishId}`),
      shellBudgetMs: phase2Budgets.searchResetShellMs,
      contentReadyBudgetMs: phase2Budgets.searchResetContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));

    await page.goto('ingredient/list', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(`ingredient-list-item-${ingredientId}`)).toBeVisible({ timeout: 15_000 });
    interactions.push(await measureInteraction({
      id: 'phase3-startup-ingredient-inventory-modal-open',
      action: async () => { await page.getByTestId(`ingredient-inventory-button-${ingredientId}`).click(); },
      shellLocator: ingredientDialog,
      contentReadyLocator: () => ingredientDialog().getByText(/Tồn kho:/).first(),
      shellBudgetMs: phase2Budgets.modalShellMs,
      contentReadyBudgetMs: phase2Budgets.modalContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));

    await page.goto('shoppingList/list', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(`shopping-list-item-${shoppingListId}`)).toBeVisible({ timeout: 15_000 });
    interactions.push(await measureInteraction({
      id: 'phase3-startup-shopping-list-row-menu-open',
      action: async () => { await page.getByTestId(`shopping-list-row-menu-${shoppingListId}`).click(); },
      shellLocator: () => visibleMenuItem(/Xuất danh sách/),
      contentReadyLocator: () => visibleMenuItem(/Xóa/),
      shellBudgetMs: phase2Budgets.rowMenuShellMs,
      contentReadyBudgetMs: phase2Budgets.rowMenuContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));

    const warnings = collectInteractionWarnings(interactions);
    await writePerformanceEvidence(testInfo, {
      capturedAt: new Date().toISOString(),
      command: 'E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance',
      browserName: testInfo.project.name,
      dataset: 'daily',
      networkMode: appliedNetwork.networkMode,
      imageMode: appliedNetwork.imageMode,
      budgets: { ...budgets, ...phase2Budgets },
      interactions,
      warnings,
      resources: await summarizeResources(page),
      diagnostics: {
        githubDelayMs: appliedNetwork.githubDelayMs,
        network: appliedNetwork.diagnostics,
      },
      notes: ['Phase 3 startup sync test seeds due shared sync and keeps GitHub Raw controlled without PERF_REAL_NETWORK=1.'],
    }, 'perf-08-phase3-startup-sync');
  });

  base('keeps offline local-first lists usable without sync UI', async ({ page }) => {
    await seedApp(page, {
      dataset: 'daily',
      networkMode: 'browser-offline',
      imageMode: 'blocked',
      syncCheckState: 'due',
    });

    await page.goto('dishes/list', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('dish-list-item-perf-daily-dish-0001')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
    await expect(page.getByText('Có dữ liệu dùng chung mới')).toHaveCount(0);
  });
});

base.describe('PERF-09 phase3 sync prompt and dish image isolation', () => {
  base.skip(isPhase3ComparisonRun, 'Phase 3 comparison command runs phase3-comparison tests only.');

  base('renders sync manifest rows before delayed shared data and preserves selective versions', async ({ page }) => {
    const seed = createPerformanceSeed('daily');
    const ingredientId = 'perf-daily-ing-0004';
    const dishId = 'perf-daily-dish-0001';
    const sharedManifest = {
      ingredientsVersion: 'phase3-ingredients-v2',
      dishesVersion: 'phase3-dishes-v2',
      ingredientChanges: [
        { id: ingredientId, name: 'Perf daily ingredient 0004', action: 'modified' },
      ],
      dishChanges: [
        { id: dishId, name: 'Perf daily dish 0001', action: 'modified' },
      ],
    };

    const appliedNetwork = await seedApp(page, {
      dataset: 'daily',
      networkMode: 'online-normal',
      imageMode: 'fast',
      syncCheckState: 'due',
      sharedDataDelayMs: 2500,
      sharedManifest,
      sharedData: {
        ingredients: seed.shared.ingredient.ingredients,
        dishes: seed.shared.dishes.dishes,
      },
    });

    await page.goto('dishes/list', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(`dish-list-item-${dishId}`)).toBeVisible({ timeout: 15_000 });

    const title = page.getByText('Có dữ liệu dùng chung mới');
    await expect(title).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Chọn những mục bạn muốn cập nhật vào thiết bị này:')).toBeVisible();
    await expect(page.getByTestId(`shared-sync-ingredient-${ingredientId}`)).toContainText('Perf daily ingredient 0004');
    await expect(page.getByTestId(`shared-sync-dish-${dishId}`)).toContainText('Perf daily dish 0001');
    await expect(page.getByText('Đang tải dữ liệu...')).toBeVisible({ timeout: 2_000 });

    const syncButton = page.getByRole('button', { name: /Đồng bộ/ });
    await expect(syncButton).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Để sau' })).toBeEnabled();

    const dishCheckbox = page.getByTestId(`shared-sync-dish-checkbox-${dishId}`);
    await expect(dishCheckbox).toBeChecked();
    await dishCheckbox.click();
    await expect(dishCheckbox).not.toBeChecked();
    await expect(syncButton).toContainText('Đồng bộ (1)');

    await expect(syncButton).toBeEnabled({ timeout: 8_000 });
    await syncButton.click();
    await expect(title).toHaveCount(0, { timeout: 5_000 });

    const syncedVersions = await page.evaluate(() => JSON.parse(localStorage.getItem('shared_synced_versions') ?? '{}'));
    expect(syncedVersions.ingredientsVersion).toBe('phase3-ingredients-v2');
    expect(syncedVersions.dishesVersion).toBe('e2e');
    expect(appliedNetwork.diagnostics.sharedManifestRequestCount).toBeGreaterThanOrEqual(1);
    expect(appliedNetwork.diagnostics.sharedDataRequestCount).toBeGreaterThanOrEqual(1);
  });

  base('keeps dish list image box stable while slow image work is pending', async ({ page }, testInfo) => {
    const appliedNetwork = await seedApp(page, {
      dataset: 'daily',
      networkMode: 'online-normal',
      imageMode: 'slow',
      imageDelayMs: 2500,
    });
    const dishId = 'perf-daily-dish-0001';
    const secondDishId = 'perf-daily-dish-0002';
    const dishRow = () => page.getByTestId(`dish-list-item-${dishId}`);
    const imageBox = () => page.getByTestId(`dish-row-image-${dishId}`);
    const visibleMenuItem = (name: RegExp) => page.locator('[role="menuitem"]:visible').filter({ hasText: name }).first();

    await page.goto('dishes/list', { waitUntil: 'domcontentloaded' });
    await expect(dishRow()).toBeVisible({ timeout: 15_000 });
    await expect(imageBox()).toBeVisible();
    await expect.poll(() => appliedNetwork.diagnostics.imageRequestCount, { timeout: 5_000 }).toBeGreaterThanOrEqual(1);

    const imageBoxSize = async () => {
      const box = await imageBox().boundingBox();
      if (!box) return null;
      return { width: Math.round(box.width), height: Math.round(box.height) };
    };
    await expect.poll(imageBoxSize).toEqual({ width: 88, height: 122 });

    const interactions = [];
    interactions.push(await measureInteraction({
      id: 'phase3-image-dish-row-menu-open',
      action: async () => { await page.getByTestId(`dish-row-menu-${dishId}`).click(); },
      shellLocator: () => visibleMenuItem(/Bắt đầu nấu/),
      contentReadyLocator: () => visibleMenuItem(/Xuất dữ liệu/),
      shellBudgetMs: phase2Budgets.rowMenuShellMs,
      contentReadyBudgetMs: phase2Budgets.rowMenuContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));
    await page.keyboard.press('Escape');

    const searchInput = page.getByTestId('dish-search-input');
    await searchInput.fill('0001');
    await expect(dishRow()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(`dish-list-item-${secondDishId}`)).toHaveCount(0, { timeout: 15_000 });
    interactions.push(await measureInteraction({
      id: 'phase3-image-dish-search-reset',
      action: async () => { await searchInput.fill(''); },
      shellLocator: () => searchInput,
      contentReadyLocator: () => page.getByTestId(`dish-list-item-${secondDishId}`),
      shellBudgetMs: phase2Budgets.searchResetShellMs,
      contentReadyBudgetMs: phase2Budgets.searchResetContentMs,
      strictShellTargetMs: phase2Budgets.shellTargetMs,
    }));
    await expect.poll(imageBoxSize).toEqual({ width: 88, height: 122 });

    const warnings = collectInteractionWarnings(interactions);
    await writePerformanceEvidence(testInfo, {
      capturedAt: new Date().toISOString(),
      command: 'E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance',
      browserName: testInfo.project.name,
      dataset: 'daily',
      networkMode: appliedNetwork.networkMode,
      imageMode: appliedNetwork.imageMode,
      budgets: { ...budgets, ...phase2Budgets },
      interactions,
      warnings,
      resources: await summarizeResources(page),
      diagnostics: {
        imageDelayMs: appliedNetwork.imageDelayMs,
        network: appliedNetwork.diagnostics,
      },
      notes: ['Phase 3 image isolation keeps the dish list row image box stable while slow external image work is pending.'],
    }, 'perf-09-phase3-sync-prompt-image');
  });
});

dailyPerformanceTest.describe('PERF-10 phase4 app-shell navigation responsiveness', () => {
  dailyPerformanceTest.skip(isPhase3ComparisonRun, 'Phase 3 comparison command runs phase3-comparison tests only.');

  dailyPerformanceTest('captures drawer and app-shell navigation timings from large lists', async ({ page }, testInfo) => {
    dailyPerformanceTest.setTimeout(60_000);
    const dishId = 'perf-daily-dish-0001';
    const dishName = 'Perf daily dish 0001';
    const ingredientId = 'perf-daily-ing-0004';
    const ingredientName = 'Perf daily ingredient 0004';
    const dishRow = () => page.getByTestId(`dish-list-item-${dishId}`);
    const routeFeedback = () => page.getByTestId('app-route-feedback').first();
    const drawerPrimaryNav = () => page.getByTestId('sidebar-drawer-primary-nav');
    const drawerTools = () => page.getByTestId('sidebar-drawer-tools');
    const prepareRouteTarget = async (locator: Locator) => {
      await expect(locator).toBeVisible({ timeout: phase4Budgets.routeContentMs });
      const targetId = `phase4-target-${Math.random().toString(36).slice(2)}`;
      await locator.evaluate((element: HTMLElement, id) => element.setAttribute('data-phase4-click-target', id), targetId);
      return targetId;
    };
    const clickRouteTarget = async (targetId: string, href: string) => {
      await page.evaluate(({ id, destination }) => {
        window.dispatchEvent(new CustomEvent('app-shell-route-feedback-request', { detail: { href: destination } }));
        const element = document.querySelector(`[data-phase4-click-target="${id}"]`) as HTMLElement | null;
        element?.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        }));
        element?.click();
      }, { id: targetId, destination: href });
    };
    const interactions = [];

    await page.goto('dishes/list', { waitUntil: 'domcontentloaded' });
    await expect(dishRow()).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => performance.clearResourceTimings());

    interactions.push(await measureInteraction({
      id: 'phase4-drawer-shell-open',
      action: async () => { await page.getByTestId('sidebar-drawer-button').click(); },
      shellLocator: drawerPrimaryNav,
      contentReadyLocator: () => drawerTools().getByText('Đồng bộ dữ liệu mới'),
      shellBudgetMs: phase4Budgets.drawerShellMs,
      contentReadyBudgetMs: phase4Budgets.routeContentMs,
      strictShellTargetMs: phase4Budgets.shellTargetMs,
    }));

    await page.keyboard.press('Escape');
    await expect(drawerPrimaryNav()).toHaveCount(0, { timeout: phase4Budgets.routeContentMs });
    await page.getByTestId('sidebar-drawer-button').click();
    await expect(drawerPrimaryNav()).toBeVisible({ timeout: phase4Budgets.drawerShellMs });
    const drawerShoppingRoute = page.getByTestId('sidebar-nav-shoppingList');
    const drawerShoppingRouteTarget = await prepareRouteTarget(drawerShoppingRoute);
    interactions.push(await measureInteraction({
      id: 'phase4-drawer-route-navigation',
      action: async () => { await clickRouteTarget(drawerShoppingRouteTarget, '/shoppingList/list'); },
      shellLocator: routeFeedback,
      contentReadyLocator: () => page.getByTestId('shopping-list-virtual-list'),
      shellBudgetMs: phase4Budgets.routeFeedbackMs,
      contentReadyBudgetMs: phase4Budgets.routeContentMs,
      strictShellTargetMs: phase4Budgets.shellTargetMs,
      enforceBudgets: false,
    }));
    await expect(page).toHaveURL(/\/my-recipes\/shoppingList\/list$/);

    const bottomDishesButton = page.getByRole('button', { name: /^Món ăn$/ });
    const bottomDishesButtonTarget = await prepareRouteTarget(bottomDishesButton);
    interactions.push(await measureInteraction({
      id: 'phase4-bottom-tab-navigation',
      action: async () => { await clickRouteTarget(bottomDishesButtonTarget, '/dishes/list'); },
      shellLocator: routeFeedback,
      contentReadyLocator: () => page.getByTestId('dish-virtual-list'),
      shellBudgetMs: phase4Budgets.routeFeedbackMs,
      contentReadyBudgetMs: phase4Budgets.routeContentMs,
      strictShellTargetMs: phase4Budgets.shellTargetMs,
      enforceBudgets: false,
    }));
    await expect(page).toHaveURL(/\/my-recipes\/dishes\/list$/);

    await page.getByTestId('global-search-button').click();
    await page.getByTestId('global-search-input').fill(ingredientName);
    const ingredientResult = page.getByTestId(`global-search-ingredient-${ingredientId}`);
    const ingredientResultTarget = await prepareRouteTarget(ingredientResult);
    interactions.push(await measureInteraction({
      id: 'phase4-global-search-navigation',
      action: async () => { await clickRouteTarget(ingredientResultTarget, `/ingredient/detail?ingredient=${ingredientId}`); },
      shellLocator: routeFeedback,
      contentReadyLocator: () => page.getByRole('heading', { name: ingredientName }),
      shellBudgetMs: phase4Budgets.routeFeedbackMs,
      contentReadyBudgetMs: phase4Budgets.routeContentMs,
      strictShellTargetMs: phase4Budgets.shellTargetMs,
      enforceBudgets: false,
    }));
    await expect(page).toHaveURL(new RegExp(`/my-recipes/ingredient/detail\\?ingredient=${ingredientId}$`));

    await page.goto('dishes/list', { waitUntil: 'domcontentloaded' });
    await expect(dishRow()).toBeVisible({ timeout: 15_000 });
    await dishRow().getByRole('button', { name: /Chi tiết/ }).click();
    const dishDialog = page.getByRole('dialog').filter({ hasText: dishName });
    await expect(dishDialog).toBeVisible();
    await expect(dishDialog.getByText(/Danh sách nguyên liệu/).first()).toBeVisible({ timeout: phase4Budgets.routeContentMs });

    const dishDetailRouteButton = dishDialog.getByRole('button', { name: /Mở trang chi tiết/ });
    const dishDetailRouteButtonTarget = await prepareRouteTarget(dishDetailRouteButton);
    interactions.push(await measureInteraction({
      id: 'phase4-dish-detail-route-navigation',
      action: async () => { await clickRouteTarget(dishDetailRouteButtonTarget, `/dishes/manage-ingredient?dishes=${dishId}`); },
      shellLocator: routeFeedback,
      contentReadyLocator: () => page.getByTestId('app-content').getByText(dishName).first(),
      shellBudgetMs: phase4Budgets.routeFeedbackMs,
      contentReadyBudgetMs: phase4Budgets.routeContentMs,
      strictShellTargetMs: phase4Budgets.shellTargetMs,
      enforceBudgets: false,
    }));
    await expect(page).toHaveURL(new RegExp(`/my-recipes/dishes/manage-ingredient\\?dishes=${dishId}$`));

    const warnings = collectInteractionWarnings(interactions);
    await writePerformanceEvidence(testInfo, {
      capturedAt: new Date().toISOString(),
      command: 'E2E_BROWSER_CHANNEL=chrome PERF_DATASET=daily PERF_NETWORK_MODE=online-normal npm run test:e2e:performance',
      browserName: testInfo.project.name,
      dataset: 'daily',
      networkMode: 'online-normal',
      imageMode: 'fast',
      budgets: { ...phase4Budgets },
      interactions,
      warnings,
      resources: await summarizeResources(page),
      notes: [
        'Phase 4 enforces the drawer shell budget; route feedback and route content-ready overages are recorded as warning evidence for follow-up.',
        'The 100 ms shell target remains ideal warning evidence so visible slowdowns are easy to spot without failing practical smoke budgets.',
      ],
    }, 'perf-10-phase4-app-shell-navigation');
  });
});

base.describe('phase3-comparison online/offline cost isolation', () => {
  base.skip(!isPhase3ComparisonRun, 'Run with npm run test:e2e:performance:phase3.');

  for (const networkMode of parsePhase3NetworkModes()) {
    const imageMode = phase3ImageModeFor(networkMode);

    base(`phase3-comparison ${networkMode} keeps large-list hot paths inside Phase 2 budgets`, async ({ page }, testInfo) => {
      base.setTimeout(90_000);
      const dataset = (process.env.PERF_DATASET ?? 'daily') as PerformanceDatasetName;
      const githubDelayMs = networkMode === 'mocked-slow-network' ? 2500 : 0;
      const imageDelayMs = imageMode === 'slow' ? 2500 : 0;
      const appliedNetwork = await seedApp(page, {
        dataset,
        networkMode,
        imageMode,
        syncCheckState: 'due',
        githubDelayMs,
        imageDelayMs,
        sharedManifest: {
          ingredientsVersion: 'e2e',
          dishesVersion: 'e2e',
          ingredientChanges: [],
          dishChanges: [],
        },
      });

      const dishId = `perf-${dataset}-dish-0001`;
      const secondDishId = `perf-${dataset}-dish-0002`;
      const ingredientId = `perf-${dataset}-ing-0004`;
      const secondIngredientId = `perf-${dataset}-ing-0005`;
      const ingredientName = `Perf ${dataset} ingredient 0004`;
      const shoppingListId = `perf-${dataset}-sl-0001`;
      const secondShoppingListId = `perf-${dataset}-sl-0002`;
      const dishRow = () => page.getByTestId(`dish-list-item-${dishId}`);
      const ingredientRow = () => page.getByTestId(`ingredient-list-item-${ingredientId}`);
      const ingredientDialog = () => page.getByRole('dialog').filter({ hasText: `Tồn kho - ${ingredientName}` });
      const shoppingListRow = () => page.getByTestId(`shopping-list-item-${shoppingListId}`);
      const visibleMenuItem = (name: RegExp) => page.locator('[role="menuitem"]:visible').filter({ hasText: name }).first();
      const interactions = [];

      await page.goto('dishes/list', { waitUntil: 'domcontentloaded' });
      await expect(dishRow()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(1700);
      await page.evaluate(() => performance.clearResourceTimings());

      interactions.push(await measureInteraction({
        id: `phase3-comparison-${networkMode}-dish-row-menu-open`,
        action: async () => { await page.getByTestId(`dish-row-menu-${dishId}`).click(); },
        shellLocator: () => visibleMenuItem(/Bắt đầu nấu/),
        contentReadyLocator: () => visibleMenuItem(/Xuất dữ liệu/),
        shellBudgetMs: phase2Budgets.rowMenuShellMs,
        contentReadyBudgetMs: phase2Budgets.rowMenuContentMs,
        strictShellTargetMs: phase2Budgets.shellTargetMs,
      }));
      await page.keyboard.press('Escape');

      const dishSearchInput = page.getByTestId('dish-search-input');
      await dishSearchInput.fill('0001');
      await expect(dishRow()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId(`dish-list-item-${secondDishId}`)).toHaveCount(0, { timeout: 15_000 });
      interactions.push(await measureInteraction({
        id: `phase3-comparison-${networkMode}-dish-search-reset`,
        action: async () => { await dishSearchInput.fill(''); },
        shellLocator: () => dishSearchInput,
        contentReadyLocator: () => page.getByTestId(`dish-list-item-${secondDishId}`),
        shellBudgetMs: phase2Budgets.searchResetShellMs,
        contentReadyBudgetMs: phase2Budgets.searchResetContentMs,
        strictShellTargetMs: phase2Budgets.shellTargetMs,
      }));

      await page.goto('ingredient/list', { waitUntil: 'domcontentloaded' });
      await expect(ingredientRow()).toBeVisible({ timeout: 15_000 });
      const ingredientSearchInput = page.getByTestId('ingredient-search-input');
      await ingredientSearchInput.fill('0004');
      await expect(ingredientRow()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId(`ingredient-list-item-${secondIngredientId}`)).toHaveCount(0, { timeout: 15_000 });
      interactions.push(await measureInteraction({
        id: `phase3-comparison-${networkMode}-ingredient-search-reset`,
        action: async () => { await ingredientSearchInput.fill(''); },
        shellLocator: () => ingredientSearchInput,
        contentReadyLocator: () => page.getByTestId(`ingredient-list-item-${secondIngredientId}`),
        shellBudgetMs: phase2Budgets.searchResetShellMs,
        contentReadyBudgetMs: phase2Budgets.searchResetContentMs,
        strictShellTargetMs: phase2Budgets.shellTargetMs,
      }));

      interactions.push(await measureInteraction({
        id: `phase3-comparison-${networkMode}-ingredient-inventory-modal-open`,
        action: async () => { await page.getByTestId(`ingredient-inventory-button-${ingredientId}`).click(); },
        shellLocator: ingredientDialog,
        contentReadyLocator: () => ingredientDialog().getByText(/Tồn kho:/).first(),
        shellBudgetMs: phase2Budgets.modalShellMs,
        contentReadyBudgetMs: phase2Budgets.modalContentMs,
        strictShellTargetMs: phase2Budgets.shellTargetMs,
      }));

      await page.goto('shoppingList/list', { waitUntil: 'domcontentloaded' });
      await expect(shoppingListRow()).toBeVisible({ timeout: 15_000 });
      const shoppingSearchInput = page.getByTestId('shopping-list-search-input');
      await shoppingSearchInput.fill('0001');
      await expect(shoppingListRow()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId(`shopping-list-item-${secondShoppingListId}`)).toHaveCount(0, { timeout: 15_000 });
      interactions.push(await measureInteraction({
        id: `phase3-comparison-${networkMode}-shopping-list-search-reset`,
        action: async () => { await shoppingSearchInput.fill(''); },
        shellLocator: () => shoppingSearchInput,
        contentReadyLocator: () => page.getByTestId(`shopping-list-item-${secondShoppingListId}`),
        shellBudgetMs: phase2Budgets.searchResetShellMs,
        contentReadyBudgetMs: phase2Budgets.searchResetContentMs,
        strictShellTargetMs: phase2Budgets.shellTargetMs,
      }));

      interactions.push(await measureInteraction({
        id: `phase3-comparison-${networkMode}-shopping-list-row-menu-open`,
        action: async () => { await page.getByTestId(`shopping-list-row-menu-${shoppingListId}`).click(); },
        shellLocator: () => visibleMenuItem(/Xuất danh sách/),
        contentReadyLocator: () => visibleMenuItem(/Xóa/),
        shellBudgetMs: phase2Budgets.rowMenuShellMs,
        contentReadyBudgetMs: phase2Budgets.rowMenuContentMs,
        strictShellTargetMs: phase2Budgets.shellTargetMs,
      }));

      const warnings = collectInteractionWarnings(interactions);
      await writePerformanceEvidence(testInfo, {
        capturedAt: new Date().toISOString(),
        command: 'E2E_BROWSER_CHANNEL=chrome npm run test:e2e:performance:phase3',
        browserName: testInfo.project.name,
        dataset,
        networkMode: appliedNetwork.networkMode,
        imageMode: appliedNetwork.imageMode,
        budgets: { ...budgets, ...phase2Budgets },
        interactions,
        warnings,
        resources: await summarizeResources(page),
        diagnostics: {
          navigatorOnLine: await page.evaluate(() => navigator.onLine),
          githubDelayMs: appliedNetwork.githubDelayMs,
          imageDelayMs: appliedNetwork.imageDelayMs,
          network: appliedNetwork.diagnostics,
        },
        notes: [
          'Phase 3 comparison reuses Phase 2 practical budgets; strict 100 ms shell target misses warn only.',
          'Strict comparison runs unregister service workers through seedApp; production service-worker behavior remains optional diagnostic evidence.',
        ],
      }, `perf-08-phase3-${dataset}-${networkMode}`);
    });
  }
});
