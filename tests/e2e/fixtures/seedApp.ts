import type { Page } from '@playwright/test';
import { applyPerformanceNetworkMode, type PerformanceNetworkOptions } from './performanceNetwork';
import { createPerformanceSeed, type PerformanceDatasetName } from './performanceSeed';
import { createRegressionSeed } from './testData';

type PersistSlices = Record<string, unknown>;
export type SyncCheckState = 'fresh' | 'due' | 'missing';

const SYNC_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type SeedAppOptions = PerformanceNetworkOptions & {
  dataset?: PerformanceDatasetName;
  syncCheckState?: SyncCheckState;
};

const persistRoot = (slices: PersistSlices): string => {
  return JSON.stringify({
    ...Object.fromEntries(Object.entries(slices).map(([key, value]) => [key, JSON.stringify(value)])),
    _persist: JSON.stringify({ version: -1, rehydrated: true }),
  });
};

export const seedApp = async (page: Page, options: SeedAppOptions = {}) => {
  const seed = options.dataset ? createPerformanceSeed(options.dataset) : createRegressionSeed();
  const syncCheckState = options.syncCheckState ?? 'fresh';

  const networkMode = await applyPerformanceNetworkMode(page, options);

  await page.addInitScript(({ shared, personal, syncCheckState, syncCheckIntervalMs }) => {
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

    if (syncCheckState === 'fresh') {
      localStorage.setItem('shared_last_checked', Date.now().toString());
    } else if (syncCheckState === 'due') {
      localStorage.setItem('shared_last_checked', String(Date.now() - syncCheckIntervalMs - 1000));
    } else {
      localStorage.removeItem('shared_last_checked');
    }
    localStorage.setItem('shared_synced_versions', JSON.stringify({ ingredientsVersion: 'e2e', dishesVersion: 'e2e' }));

    void navigator.serviceWorker?.getRegistrations?.().then(registrations => {
      registrations.forEach(registration => void registration.unregister());
    });
    void caches?.keys?.().then(keys => {
      keys.forEach(key => void caches.delete(key));
    });
  }, { ...seed, syncCheckState, syncCheckIntervalMs: SYNC_CHECK_INTERVAL_MS });

  return networkMode;
};

export const createPersistedSeed = () => {
  const seed = createRegressionSeed();
  return {
    shared: persistRoot(seed.shared),
    personal: persistRoot(seed.personal),
  };
};
