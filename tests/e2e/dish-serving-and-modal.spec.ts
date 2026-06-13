import { expect, test } from './fixtures/appTest';
import { TEST_IDS } from './fixtures/testData';

test.describe('Dish detail and serving scale', () => {
  test('starts cooking with base servings and scales ingredient requirements', async ({ page }) => {
    await page.goto(`dishes/manage-ingredient?dishes=${TEST_IDS.dishes.comGa}`);

    await expect(page.getByTestId('app-content').getByText('Com ga regression').first()).toBeVisible();
    await page.getByRole('button', { name: /Bắt đầu nấu/ }).first().click();

    const servingControl = page.getByTestId('cooking-serving-control');
    const servingInput = servingControl.getByRole('spinbutton');
    await expect(servingControl).toContainText('Gốc 2 phần');
    await expect(servingInput).toHaveValue('2');

    const chickenRow = page.getByTestId(`cooking-ingredient-${TEST_IDS.ingredients.chicken}`);
    await expect(chickenRow).toContainText('Cần 500g');

    await servingInput.fill('1');
    await expect(chickenRow).toContainText('Cần 250g');

    await page.getByRole('button', { name: /Nấu dù thiếu nguyên liệu/ }).click();

    await expect(chickenRow).toContainText('Còn 100g/250g');
    await expect(chickenRow).toContainText('Thiếu 150g');
    await expect(page.getByTestId(`cooking-ingredient-used-toggle-${TEST_IDS.ingredients.chicken}`)).toBeDisabled();
  });

  test('keeps the cooking timer when starting from a scheduled meal', async ({ page }) => {
    await page.goto('scheduledMeal/list');

    await expect(page.getByText('Com ga regression').first()).toBeVisible();
    await page.getByRole('button', { name: /Nấu cả ngày/ }).click();

    const dayCookingModal = page.getByRole('dialog').filter({ hasText: /Nấu cả ngày/ });
    await expect(dayCookingModal).toContainText('Com ga regression');
    await dayCookingModal.getByRole('button', { name: 'Bắt đầu' }).click();

    await expect(page.getByText('Dự kiến sơ chế 15 phút')).toBeVisible();
  });

  test('opens read-only dish detail from shopping-list dishes tab and can navigate to the detail page', async ({ page }) => {
    await page.goto(`shoppingList/detail?shoppingList=${TEST_IDS.shoppingLists.regression}`);
    await expect(page.getByRole('heading', { name: 'Regression shopping list' })).toBeVisible();

    await page.getByRole('tab', { name: /Món ăn/ }).click();
    const dishRow = page.getByTestId(`shopping-list-dish-${TEST_IDS.dishes.comGa}`);
    await expect(dishRow).toContainText('Com ga regression');
    await dishRow.getByRole('button').click();

    await expect(page.getByTestId('dish-readonly-detail-modal')).toBeVisible();
    await expect(page.getByTestId(`dish-readonly-ingredient-${TEST_IDS.ingredients.chicken}`)).toContainText('Ga regression thit dui');

    await page.getByRole('button', { name: /Mở trang chi tiết/ }).click();
    await expect(page).toHaveURL(new RegExp(`/my-recipes/dishes/manage-ingredient\\?dishes=${TEST_IDS.dishes.comGa}$`));
  });
});
