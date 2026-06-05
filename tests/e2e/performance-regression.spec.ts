import { expect, test as base, type Page } from '@playwright/test';
import { seedApp } from './fixtures/seedApp';
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

const expectPageStatusDoesNotBlockActions = async (page: Page, testId: string) => {
  const pointerEvents = await page.getByTestId(testId).evaluateAll(elements =>
    elements.map(element => window.getComputedStyle(element).pointerEvents),
  );
  if (pointerEvents.length > 0) expect(pointerEvents.every(value => value === 'none')).toBeTruthy();
};

const shoppingListDetailPath = `shoppingList/detail?shoppingList=${TEST_IDS.shoppingLists.regression}`;

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
