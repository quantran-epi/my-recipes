import type { Page } from '@playwright/test';
import { createRegressionSeed } from './testData';

type PersistSlices = Record<string, unknown>;

const persistRoot = (slices: PersistSlices): string => {
  return JSON.stringify({
    ...Object.fromEntries(Object.entries(slices).map(([key, value]) => [key, JSON.stringify(value)])),
    _persist: JSON.stringify({ version: -1, rehydrated: true }),
  });
};

export const seedApp = async (page: Page) => {
  const seed = createRegressionSeed();

  await page.route('https://raw.githubusercontent.com/**', async route => {
    await route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
  });

  await page.addInitScript(({ shared, personal }) => {
    localStorage.clear();
    sessionStorage.clear();

    localStorage.setItem('persist:shared', JSON.stringify({
      ingredient: JSON.stringify(shared.ingredient),
      dishes: JSON.stringify(shared.dishes),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    }));

    localStorage.setItem('persist:personal', JSON.stringify({
      appContext: JSON.stringify(personal.appContext),
      inventory: JSON.stringify(personal.inventory),
      shoppingList: JSON.stringify(personal.shoppingList),
      scheduledMeal: JSON.stringify(personal.scheduledMeal),
      cookingSession: JSON.stringify(personal.cookingSession),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    }));

    localStorage.setItem('shared_last_checked', Date.now().toString());
    localStorage.setItem('shared_synced_versions', JSON.stringify({ ingredientsVersion: 'e2e', dishesVersion: 'e2e' }));

    void navigator.serviceWorker?.getRegistrations?.().then(registrations => {
      registrations.forEach(registration => void registration.unregister());
    });
    void caches?.keys?.().then(keys => {
      keys.forEach(key => void caches.delete(key));
    });
  }, seed);
};

export const createPersistedSeed = () => {
  const seed = createRegressionSeed();
  return {
    shared: persistRoot(seed.shared),
    personal: persistRoot(seed.personal),
  };
};
