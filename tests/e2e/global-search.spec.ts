import { expect, test } from './fixtures/appTest';
import { TEST_IDS } from './fixtures/testData';

test.describe('Global search', () => {
  test('navigates to ingredient and shopping-list details from search results', async ({ page }) => {
    await page.goto('./');

    await page.getByTestId('global-search-button').click();
    await page.getByTestId('global-search-input').fill('Tuong ot regression');
    const ingredientResult = page.getByTestId(`global-search-ingredient-${TEST_IDS.ingredients.sauce}`);
    await expect(ingredientResult).toContainText('Tuong ot regression');
    await ingredientResult.click();

    await expect(page).toHaveURL(new RegExp(`/my-recipes/ingredient/detail\\?ingredient=${TEST_IDS.ingredients.sauce}$`));

    await page.getByTestId('global-search-button').click();
    await page.getByTestId('global-search-input').fill('Regression shopping list');
    const shoppingListResult = page.getByTestId(`global-search-shopping-list-${TEST_IDS.shoppingLists.regression}`);
    await expect(shoppingListResult).toContainText('Regression shopping list');
    await shoppingListResult.click();

    await expect(page).toHaveURL(new RegExp(`/my-recipes/shoppingList/detail\\?shoppingList=${TEST_IDS.shoppingLists.regression}$`));
  });
});
