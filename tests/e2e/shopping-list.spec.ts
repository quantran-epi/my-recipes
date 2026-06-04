import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/appTest';
import { TEST_IDS } from './fixtures/testData';

const openShoppingList = async (page: Page) => {
  await page.goto(`shoppingList/detail?shoppingList=${TEST_IDS.shoppingLists.regression}`);
  await expect(page.getByRole('heading', { name: 'Regression shopping list' })).toBeVisible();
};

test.describe('Shopping list detail', () => {
  test('keeps grouped recipe amounts while showing partial inventory and bought status', async ({ page }) => {
    await openShoppingList(page);

    const chicken = page.getByTestId(`shopping-list-ingredient-${TEST_IDS.ingredients.chicken}`);
    await expect(chicken).toContainText('Ga regression thit dui');
    await expect(chicken).toContainText('Cần 700g');
    await expect(chicken).toContainText('Có 100g');
    await expect(chicken).toContainText('Mua 400g');
    await expect(chicken).toContainText('Đã mua 200g');
    await expect(chicken.locator('input[type="checkbox"]')).not.toBeChecked();

    await chicken.click();
    await expect(chicken).toContainText('500 g (Com ga regression)');
    await expect(chicken).toContainText('200 g (Goi ga regression)');

    const water = page.getByTestId(`shopping-list-ingredient-${TEST_IDS.ingredients.water}`);
    await expect(water).toContainText('Luôn có');
    await expect(water.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('marks an ingredient done when the entered bought amount covers the missing amount', async ({ page }) => {
    await openShoppingList(page);

    const chicken = page.getByTestId(`shopping-list-ingredient-${TEST_IDS.ingredients.chicken}`);
    await chicken.click();

    const boughtInput = chicken.getByRole('spinbutton');
    await boughtInput.fill('600');

    await expect(chicken).toContainText('Đã mua 600g');
    await expect(chicken.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('shows separate remaining-cart and bought expense totals', async ({ page }) => {
    await openShoppingList(page);

    await page.getByRole('tab', { name: /Chi phí/ }).click();

    await expect(page.getByTestId('shopping-list-cost-tab')).toBeVisible();
    await expect(page.getByTestId('shopping-cost-required-buy')).toContainText(/52\.000.*66\.000/);
    await expect(page.getByTestId('shopping-cost-recipe-total')).toContainText(/66\.050.*86\.100/);
    await expect(page.getByTestId('shopping-cost-recipe-total')).toContainText('13 mục chưa có giá');
    await expect(page.getByTestId('shopping-cost-need-more')).toContainText(/36\.000.*46\.000/);
    await expect(page.getByTestId('shopping-cost-bought')).toContainText('Đã mua');
    await expect(page.getByTestId('shopping-cost-bought')).toContainText(/16\.000.*20\.000/);
  });

  test('opens the completion review before importing bought ingredients', async ({ page }) => {
    await openShoppingList(page);

    await page.getByRole('button', { name: /Hoàn tất mua sắm/ }).click();

    await expect(page.getByTestId('purchase-completion-review')).toBeVisible();
    await expect(page.getByTestId('purchase-completion-review')).toContainText('Ga regression thit dui');
    await expect(page.getByRole('button', { name: /Hoàn tất và nhập kho/ })).toBeVisible();
  });

  test('can scroll the final checklist item fully into view', async ({ page }) => {
    await openShoppingList(page);

    const appContent = page.getByTestId('app-content');
    const lastItem = page.getByTestId(`shopping-list-ingredient-${TEST_IDS.ingredients.scrollLast}`);
    await lastItem.scrollIntoViewIfNeeded();

    const [contentBox, itemBox] = await Promise.all([appContent.boundingBox(), lastItem.boundingBox()]);
    expect(contentBox).not.toBeNull();
    expect(itemBox).not.toBeNull();
    expect(itemBox!.y + itemBox!.height).toBeLessThanOrEqual(contentBox!.y + contentBox!.height + 1);
  });
});
