import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/appTest';

const routeFeedback = (page: Page) => page.getByTestId('app-route-feedback');

test.describe('App-shell navigation', () => {
  test('shows drawer primary navigation before deferred tools and preserves drawer workflows', async ({ page }) => {
    await page.goto('dishes/list');
    await expect(page.getByTestId('dish-virtual-list')).toBeVisible();

    await page.getByTestId('sidebar-drawer-button').click();
    const primaryNav = page.getByTestId('sidebar-drawer-primary-nav');
    await expect(primaryNav).toBeVisible();
    await expect(primaryNav).toContainText('Tổng quan');
    await expect(primaryNav).toContainText('Nguyên liệu');
    await expect(primaryNav).toContainText('Món ăn');
    await expect(primaryNav).toContainText('Kế hoạch chi phí');
    await expect(primaryNav).toContainText('Lịch mua sắm');
    await expect(primaryNav).toContainText('Thực đơn');

    const tools = page.getByTestId('sidebar-drawer-tools');
    await expect(tools).toContainText('Đồng bộ dữ liệu mới', { timeout: 5_000 });
    await expect(tools).toContainText('Sao lưu cá nhân');
    await expect(tools).toContainText('Lịch sử nấu ăn');
    await expect(tools).toContainText('Hướng dẫn sử dụng');
    await expect(tools.getByText(/Đăng nhập Admin|Đang ở chế độ Admin/)).toBeVisible();
  });

  test('does not leave route feedback visible after same-route drawer close or completed navigation', async ({ page }) => {
    await page.goto('dishes/list');
    await expect(page.getByTestId('dish-virtual-list')).toBeVisible();

    await page.getByTestId('sidebar-drawer-button').click();
    await expect(page.getByTestId('sidebar-drawer-primary-nav')).toBeVisible();
    await page.getByTestId('sidebar-nav-dishes').click();
    await expect(routeFeedback(page)).toHaveCount(0);

    await page.getByTestId('sidebar-drawer-button').click();
    await expect(page.getByTestId('sidebar-nav-shoppingList')).toBeVisible();
    await page.getByTestId('sidebar-nav-shoppingList').click({ force: true, noWaitAfter: true });
    await expect(page.getByTestId('shopping-list-virtual-list')).toBeVisible({ timeout: 5_000 });
    await expect(routeFeedback(page)).toHaveCount(0, { timeout: 3_000 });

    await page.getByRole('button', { name: /^Món ăn$/ }).click();
    await expect(page.getByTestId('dish-virtual-list')).toBeVisible({ timeout: 5_000 });
    await expect(routeFeedback(page)).toHaveCount(0, { timeout: 3_000 });
  });
});
