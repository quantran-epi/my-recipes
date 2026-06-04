import { expect, test } from './fixtures/appTest';
import { TEST_IDS } from './fixtures/testData';

test.describe('Dashboard', () => {
  test('shows seeded overview cards and opens a shopping-list detail', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByTestId('dashboard')).toBeVisible();
    await expect(page.getByText('Regression meal today')).toBeVisible();
    await expect(page.getByTestId(`dashboard-urgent-${TEST_IDS.ingredients.expired}`)).toContainText('Sua chua expired regression');

    const shoppingListRow = page.getByTestId(`dashboard-shopping-list-${TEST_IDS.shoppingLists.regression}`).first();
    await expect(shoppingListRow).toContainText('Regression shopping list');
    await shoppingListRow.click();

    await expect(page).toHaveURL(new RegExp(`/my-recipes/shoppingList/detail\\?shoppingList=${TEST_IDS.shoppingLists.regression}$`));
    await expect(page.getByRole('heading', { name: 'Regression shopping list' })).toBeVisible();
  });
});
