import { expect, test } from './fixtures/appTest';
import { TEST_IDS } from './fixtures/testData';

test.describe('Dish suggestor', () => {
  test('opens selected dishes in the expense planner from the icon-only action', async ({ page }) => {
    await page.goto('dishes/list');
    await expect(page.getByTestId('dish-virtual-list')).toBeVisible();

    await page.getByTestId('bottom-tab-suggester').click();
    await expect(page.getByText('Nấu gì hôm nay?')).toBeVisible();

    await page.getByRole('button', { name: /Tủ lạnh/ }).click();
    const suggestionItem = page.getByTestId(`dish-suggestion-item-${TEST_IDS.dishes.comGa}`);
    await expect(suggestionItem).toBeVisible({ timeout: 10_000 });
    await suggestionItem.click();
    await expect(page.getByTestId('dish-suggester-selected-count')).toHaveText('(1)');

    const expenseButton = page.getByTestId('dish-suggester-expense-planner-button');
    await expect(expenseButton).toBeEnabled();
    await expenseButton.click();

    await expect(page).toHaveURL(/\/my-recipes\/expense-planner\?dishes=/);
    await expect(page).toHaveURL(new RegExp(TEST_IDS.dishes.comGa));
    await expect(page.getByTestId('expense-planner-screen')).toBeVisible();
    await expect(page.getByText('Com ga regression')).toBeVisible();
  });
});
