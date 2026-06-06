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

  await page.goto('/');
  await page.evaluate(async ({ shared, personal, syncCheckState, syncCheckIntervalMs }) => {
    const openAppDb = () => new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('my-recipes', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('app_storage')) db.createObjectStore('app_storage');
        if (!db.objectStoreNames.contains('local-forage-detect-blob-support')) db.createObjectStore('local-forage-detect-blob-support');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    const setIndexedDbItems = async (items: Record<string, string>) => {
      const db = await openAppDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('app_storage', 'readwrite');
        const store = tx.objectStore('app_storage');
        store.clear();
        Object.entries(items).forEach(([key, value]) => store.put(value, key));
        tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => resolve();
      });
      db.close();
    };

    localStorage.clear();
    sessionStorage.clear();

    const sharedPersist = JSON.stringify({
      ingredient: JSON.stringify(shared.ingredient),
      dishes: JSON.stringify(shared.dishes),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    });

    const personalPersist = JSON.stringify({
      appContext: JSON.stringify(personal.appContext),
      inventory: JSON.stringify(personal.inventory),
      shoppingList: JSON.stringify(personal.shoppingList),
      scheduledMeal: JSON.stringify(personal.scheduledMeal),
      cookingSession: JSON.stringify(personal.cookingSession),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    });

    let lastChecked: string | null = null;
    if (syncCheckState === 'fresh') {
      lastChecked = Date.now().toString();
    } else if (syncCheckState === 'due') {
      lastChecked = String(Date.now() - syncCheckIntervalMs - 1000);
    }

    await setIndexedDbItems({
      'persist:shared': sharedPersist,
      'persist:personal': personalPersist,
      ...(lastChecked ? { shared_last_checked: lastChecked } : {}),
      shared_synced_versions: JSON.stringify({ ingredientsVersion: 'e2e', dishesVersion: 'e2e' }),
    });

    void navigator.serviceWorker?.getRegistrations?.().then(registrations => {
      registrations.forEach(registration => void registration.unregister());
    });
    void caches?.keys?.().then(keys => {
      keys.forEach(key => void caches.delete(key));
    });
  }, { ...seed, syncCheckState, syncCheckIntervalMs: SYNC_CHECK_INTERVAL_MS });

  await page.goto('about:blank');

  return networkMode;
};

export const createPersistedSeed = () => {
  const seed = createRegressionSeed();
  return {
    shared: persistRoot(seed.shared),
    personal: persistRoot(seed.personal),
  };
};
