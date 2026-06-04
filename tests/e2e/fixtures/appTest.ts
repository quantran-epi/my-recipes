import { test as base, expect } from '@playwright/test';
import { seedApp } from './seedApp';

export const test = base.extend({
  page: async ({ page }, use) => {
    await seedApp(page);
    await use(page);
  },
});

export { expect };
