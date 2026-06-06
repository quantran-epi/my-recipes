import localforage from "localforage";

const PERSIST_META = JSON.stringify({ version: -1, rehydrated: true });

export const appStorage = localforage.createInstance({
    name: "my-recipes",
    storeName: "app_storage",
    description: "My Recipes durable IndexedDB storage",
    driver: localforage.INDEXEDDB,
});

export const reduxPersistIndexedDbStorage = {
    getItem: (key: string): Promise<string | null> => appStorage.getItem<string>(key).then(value => value ?? null),
    setItem: (key: string, value: string): Promise<string> => appStorage.setItem(key, value).then(() => value),
    removeItem: (key: string): Promise<void> => appStorage.removeItem(key),
};

export const getStorageString = async (key: string): Promise<string | null> => {
    const value = await appStorage.getItem<string>(key);
    return typeof value === "string" ? value : null;
};

export const setStorageString = async (key: string, value: string): Promise<void> => {
    await appStorage.setItem(key, value);
};

export const removeStorageItem = async (key: string): Promise<void> => {
    await appStorage.removeItem(key);
};

export const getStorageJson = async <T,>(key: string, fallback: T): Promise<T> => {
    try {
        const raw = await getStorageString(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

export const setStorageJson = async <T,>(key: string, value: T): Promise<void> => {
    await setStorageString(key, JSON.stringify(value));
};

export const createPersistRoot = (slices: Record<string, unknown>): string => {
    return JSON.stringify({
        ...Object.fromEntries(Object.entries(slices).map(([key, value]) => [key, JSON.stringify(value)])),
        _persist: PERSIST_META,
    });
};

export const parsePersistRoot = (raw: string | null): Record<string, string> => {
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

export const parsePersistSlice = <T,>(root: Record<string, string>, key: string, fallback: T): T => {
    try {
        const raw = root[key];
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

export type StorageHealth = {
    persisted: boolean | null;
    usage: number | null;
    quota: number | null;
};

export const checkStorageHealth = async (): Promise<StorageHealth> => {
    const storageManager = navigator.storage;
    let persisted: boolean | null = null;
    let usage: number | null = null;
    let quota: number | null = null;

    try {
        if (storageManager?.persist) persisted = await storageManager.persist();
    } catch {
        persisted = null;
    }

    try {
        if (storageManager?.estimate) {
            const estimate = await storageManager.estimate();
            usage = typeof estimate.usage === "number" ? estimate.usage : null;
            quota = typeof estimate.quota === "number" ? estimate.quota : null;
        }
    } catch {
        usage = null;
        quota = null;
    }

    return { persisted, usage, quota };
};
